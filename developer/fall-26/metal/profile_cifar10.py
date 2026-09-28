#!/usr/bin/env python3
"""Profile the CIFAR-10 CNN on CUDA, Apple Metal/MPS, or CPU.

The script deliberately measures three different boundaries:

* input transfer: CPU input -> selected device;
* model inference: forward pass with an already device-resident input; and
* end-to-end inference: transfer, forward pass, and result transfer to CPU.

CUDA reports device elapsed time from CUDA events.  PyTorch does not expose an
equivalent MPS event-timer API, so MPS device execution is measured with a
wall clock bracketed by ``torch.mps.synchronize()``.  That is a completed
Metal-work duration, but it is not a sum of individual Metal kernels.  Use
``--mps-signposts`` together with Xcode Instruments' Metal System Trace for
per-kernel timing on Apple Silicon.
"""

from __future__ import annotations

import argparse
import json
import platform
import statistics
import time
from contextlib import nullcontext
from pathlib import Path
from typing import Any, Callable

import numpy as np
import torch
import torch.nn as nn


class SmallCIFARNet(nn.Module):
    """The same FP32 CNN used by the benchmark notebooks."""

    def __init__(self, num_classes: int = 10) -> None:
        super().__init__()
        self.features = nn.Sequential(
            nn.Conv2d(3, 64, 3, padding=1, bias=False),
            nn.BatchNorm2d(64), nn.ReLU(inplace=True),
            nn.Conv2d(64, 64, 3, padding=1, bias=False),
            nn.BatchNorm2d(64), nn.ReLU(inplace=True), nn.MaxPool2d(2),
            nn.Conv2d(64, 128, 3, padding=1, bias=False),
            nn.BatchNorm2d(128), nn.ReLU(inplace=True),
            nn.Conv2d(128, 128, 3, padding=1, bias=False),
            nn.BatchNorm2d(128), nn.ReLU(inplace=True), nn.MaxPool2d(2),
            nn.Conv2d(128, 256, 3, padding=1, bias=False),
            nn.BatchNorm2d(256), nn.ReLU(inplace=True), nn.AdaptiveAvgPool2d(1),
        )
        self.classifier = nn.Linear(256, num_classes)

    def forward(self, inputs: torch.Tensor) -> torch.Tensor:
        return self.classifier(torch.flatten(self.features(inputs), 1))


def select_device(requested: str) -> torch.device:
    available = {
        "cuda": torch.cuda.is_available(),
        "mps": torch.backends.mps.is_available(),
        "cpu": True,
    }
    if requested == "auto":
        for name in ("cuda", "mps", "cpu"):
            if available[name]:
                return torch.device(name)
    elif available[requested]:
        return torch.device(requested)
    raise RuntimeError(f"Requested device '{requested}' is not available: {available}")


def synchronize(device: torch.device) -> None:
    """Make submitted accelerator work part of the measured interval."""
    if device.type == "cuda":
        torch.cuda.synchronize(device)
    elif device.type == "mps":
        torch.mps.synchronize()


def percentile(values: list[float], value: int) -> float:
    return float(np.percentile(values, value))


def summarize(values: list[float]) -> dict[str, float]:
    return {
        "mean_ms": statistics.fmean(values),
        "p50_ms": percentile(values, 50),
        "p95_ms": percentile(values, 95),
        "min_ms": min(values),
        "max_ms": max(values),
    }


def measure(
    operation: Callable[[], Any],
    device: torch.device,
    warmup: int,
    iterations: int,
) -> dict[str, Any]:
    """Return completed wall time and, on CUDA, a stream GPU-event duration."""
    for _ in range(warmup):
        operation()
    synchronize(device)

    wall_ms: list[float] = []
    cuda_event_ms: list[float] = []
    for _ in range(iterations):
        synchronize(device)
        start_wall = time.perf_counter()
        if device.type == "cuda":
            start_event = torch.cuda.Event(enable_timing=True)
            end_event = torch.cuda.Event(enable_timing=True)
            start_event.record()
            operation()
            end_event.record()
            end_event.synchronize()
            cuda_event_ms.append(start_event.elapsed_time(end_event))
        else:
            operation()
            synchronize(device)
        wall_ms.append((time.perf_counter() - start_wall) * 1_000)

    result: dict[str, Any] = {"wall_time": summarize(wall_ms)}
    if device.type == "cuda":
        result["device_execution_time"] = {
            **summarize(cuda_event_ms),
            "method": "CUDA events on the current stream",
        }
    elif device.type == "mps":
        result["device_execution_time"] = {
            **summarize(wall_ms),
            "method": "host monotonic clock bracketed by torch.mps.synchronize()",
            "limitation": "completed Metal work, not an individual-kernel or GPU-event measurement",
        }
    else:
        result["device_execution_time"] = {
            **summarize(wall_ms),
            "method": "host monotonic clock (CPU execution)",
        }
    return result


def profile_operator_table(model: nn.Module, inputs: torch.Tensor, device: torch.device) -> list[dict[str, Any]]:
    """Capture a compact CPU/CUDA operator table for the report."""
    activities = [torch.profiler.ProfilerActivity.CPU]
    if device.type == "cuda":
        activities.append(torch.profiler.ProfilerActivity.CUDA)
    with torch.profiler.profile(activities=activities, record_shapes=True) as profiler:
        for _ in range(10):
            with torch.profiler.record_function("profiled_model_inference"):
                model(inputs)
        synchronize(device)

    sort_key = "self_cuda_time_total" if device.type == "cuda" else "self_cpu_time_total"
    rows: list[dict[str, Any]] = []
    for event in sorted(profiler.key_averages(), key=lambda item: getattr(item, sort_key), reverse=True)[:12]:
        rows.append(
            {
                "operator": event.key,
                "calls": event.count,
                "self_cpu_time_ms": event.self_cpu_time_total / 1_000,
                "cpu_time_ms": event.cpu_time_total / 1_000,
                "self_cuda_time_ms": event.self_cuda_time_total / 1_000 if device.type == "cuda" else None,
                "cuda_time_ms": event.cuda_time_total / 1_000 if device.type == "cuda" else None,
            }
        )
    return rows


def configure_cuda_fp32() -> None:
    """Match the notebooks' FP32/TF32-disabled comparison where supported."""
    if not torch.cuda.is_available():
        return
    try:
        torch.backends.cuda.matmul.fp32_precision = "ieee"
        torch.backends.cudnn.conv.fp32_precision = "ieee"
    except AttributeError:
        torch.backends.cuda.matmul.allow_tf32 = False
        torch.backends.cudnn.allow_tf32 = False


def load_model(checkpoint: Path, device: torch.device) -> tuple[nn.Module, bool]:
    model = SmallCIFARNet().to(device=device, dtype=torch.float32).eval()
    if not checkpoint.exists():
        return model, False
    # The notebook checkpoint records torch.__version__, whose TorchVersion
    # wrapper is safe metadata but is not in PyTorch's default safe-global set.
    # Keep weights_only enabled: this never executes a checkpoint's code.
    with torch.serialization.safe_globals([torch.torch_version.TorchVersion]):
        saved = torch.load(checkpoint, map_location="cpu", weights_only=True)
    model.load_state_dict(saved["model_state_dict"])
    return model, True


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--device", choices=("auto", "cuda", "mps", "cpu"), default="auto")
    parser.add_argument("--checkpoint", type=Path, default=Path("cifar10_cnn.pt"))
    parser.add_argument("--batch-sizes", default="1,8,32,128")
    parser.add_argument("--warmup", type=int, default=30)
    parser.add_argument("--iterations", type=int, default=200)
    parser.add_argument("--training-iterations", type=int, default=50)
    parser.add_argument("--output", type=Path, default=Path("profile_results.json"))
    parser.add_argument(
        "--mps-signposts",
        action="store_true",
        help="emit MPS OS signposts; record this process in Instruments / Metal System Trace",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if args.warmup < 0 or args.iterations < 1 or args.training_iterations < 1:
        raise ValueError("warmup must be non-negative and iteration counts must be positive")
    batch_sizes = tuple(int(item) for item in args.batch_sizes.split(",") if item.strip())
    if not batch_sizes or any(size < 1 for size in batch_sizes):
        raise ValueError("--batch-sizes must be a comma-separated list of positive integers")

    torch.manual_seed(42)
    configure_cuda_fp32()
    device = select_device(args.device)
    model, checkpoint_loaded = load_model(args.checkpoint, device)
    print(f"Device: {device}; checkpoint loaded: {checkpoint_loaded}")

    inference: list[dict[str, Any]] = []
    for batch_size in batch_sizes:
        host_inputs = torch.randn(batch_size, 3, 32, 32, dtype=torch.float32)
        resident_inputs = host_inputs.to(device)
        synchronize(device)
        signposts = (
            torch.mps.profiler.profile(mode="interval,event", wait_until_completed=False)
            if args.mps_signposts and device.type == "mps"
            else nullcontext()
        )
        with torch.inference_mode(), signposts:
            transfer = measure(lambda: host_inputs.to(device), device, args.warmup, args.iterations)
            model_only = measure(lambda: model(resident_inputs), device, args.warmup, args.iterations)
            end_to_end = measure(
                lambda: model(host_inputs.to(device)).to("cpu"),
                device,
                args.warmup,
                args.iterations,
            )
        row = {
            "batch_size": batch_size,
            "input_transfer": transfer,
            "model_inference": model_only,
            "end_to_end_inference": end_to_end,
            "model_throughput_images_per_second": batch_size / (model_only["wall_time"]["mean_ms"] / 1_000),
            "end_to_end_throughput_images_per_second": batch_size / (end_to_end["wall_time"]["mean_ms"] / 1_000),
        }
        inference.append(row)
        print(
            f"batch={batch_size:3d} | transfer={transfer['wall_time']['mean_ms']:7.3f} ms | "
            f"model={model_only['wall_time']['mean_ms']:7.3f} ms | "
            f"end-to-end={end_to_end['wall_time']['mean_ms']:7.3f} ms | "
            f"model throughput={row['model_throughput_images_per_second']:9.1f} img/s"
        )

    train_inputs = torch.randn(128, 3, 32, 32, dtype=torch.float32, device=device)
    train_targets = torch.randint(0, 10, (128,), device=device)
    train_model = SmallCIFARNet().to(device).train()
    optimizer = torch.optim.AdamW(train_model.parameters(), lr=1e-3, weight_decay=1e-4)
    criterion = nn.CrossEntropyLoss()

    def training_step() -> None:
        optimizer.zero_grad(set_to_none=True)
        loss = criterion(train_model(train_inputs), train_targets)
        loss.backward()
        optimizer.step()

    training = measure(training_step, device, args.warmup, args.training_iterations)
    training["batch_size"] = 128
    training["throughput_images_per_second"] = 128 / (training["wall_time"]["mean_ms"] / 1_000)
    print(
        f"training step (batch=128)={training['wall_time']['mean_ms']:.3f} ms | "
        f"{training['throughput_images_per_second']:.1f} img/s"
    )

    profile_inputs = torch.randn(32, 3, 32, 32, dtype=torch.float32, device=device)
    with torch.inference_mode():
        top_operators = profile_operator_table(model, profile_inputs, device)

    device_name = torch.cuda.get_device_name(device) if device.type == "cuda" else (
        "Apple Metal / MPS" if device.type == "mps" else platform.processor() or platform.machine()
    )
    report = {
        "measurement_notes": {
            "synchronization": "Every measured accelerator iteration is synchronized before and after work.",
            "cuda": "device_execution_time uses CUDA events and represents current-stream GPU elapsed time.",
            "mps": "PyTorch has no MPS event timer. device_execution_time is synchronized wall time; use --mps-signposts and Instruments for per-kernel timing.",
        },
        "system": {
            "device": str(device),
            "device_name": device_name,
            "platform": platform.platform(),
            "python_version": platform.python_version(),
            "pytorch_version": torch.__version__,
            "cuda_version": torch.version.cuda,
        },
        "configuration": {
            "precision": "float32",
            "checkpoint": str(args.checkpoint),
            "checkpoint_loaded": checkpoint_loaded,
            "warmup": args.warmup,
            "iterations": args.iterations,
            "mps_signposts_enabled": args.mps_signposts and device.type == "mps",
        },
        "inference": inference,
        "training_step": training,
        "top_profiled_operators": top_operators,
    }
    args.output.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(f"Saved: {args.output.resolve()}")


if __name__ == "__main__":
    main()
