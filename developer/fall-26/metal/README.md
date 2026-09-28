# CIFAR-10 CUDA, MPS, and CPU benchmark

Run `./setup_venv.sh` from this directory, select the **Python 3.12
(metal-benchmark)** kernel, then run every cell in
`cifar10_cuda_mps_benchmark.ipynb`.

The notebook trains one FP32 CNN on CIFAR-10, reports per-epoch train/test
metrics, benchmarks synchronized model-only inference for batches 1/8/32/128,
and saves a checkpoint plus a backend-specific JSON result file. It chooses
CUDA first, then Apple Metal/MPS, then CPU.

## Detailed runtime and kernel profiling

After a notebook run has created `cifar10_cnn.pt`, use the profiling harness
to separate input transfer, model-only inference, full request time, and a
forward/backward/optimizer training step:

```bash
.venv/bin/python profile_cifar10.py --device mps --output profile_mps.json
```

Run the same command on the CUDA machine/Colab (with a CUDA PyTorch build) to
produce an apples-to-apples `profile_cuda.json`:

```bash
python profile_cifar10.py --device cuda --output profile_cuda.json
```

Each timing is synchronized before and after the measured work, so asynchronous
dispatch is included. `model_inference` uses an input already resident on the
selected device. `end_to_end_inference` includes CPU-to-device input transfer,
the forward pass, and returning logits to CPU. This makes it suitable for both
maximum model throughput and request-latency comparisons.

CUDA additionally records `device_execution_time` with CUDA events. PyTorch
does not provide matching MPS event timers, so Metal's device time is reported
as a synchronized wall-clock interval; it represents completed queued Metal
work but is not an individual-kernel sum. For a per-kernel Metal trace, enable
MPS signposts and record the process with Xcode Instruments' **Metal System
Trace**:

```bash
.venv/bin/python profile_cifar10.py --device mps --mps-signposts
```

The JSON report also includes the top CPU/CUDA PyTorch operators. On MPS those
operator rows are CPU-side dispatch costs; inspect the Instruments trace for
Metal kernel names and durations.

`NUM_WORKERS` is deliberately zero on macOS to keep notebook DataLoader use
stable. The primary comparison excludes CUDA AMP and disables CUDA TF32 where
the installed PyTorch exposes that option.

## macOS 26 / Homebrew Python note

On this Mac, Homebrew Python 3.12.14's `ensurepip` initially failed because
its `pyexpat` extension was linked against an older macOS Expat ABI. The setup
script detects that condition and applies a copied, re-signed extension only
inside `.venv`; it then creates the requested Jupyter kernel. No project Python
packages are installed globally.
