#!/usr/bin/env python3
"""Add detailed MPS profiling and CUDA comparison sheets to the workbook."""

from __future__ import annotations

import json
from pathlib import Path

from openpyxl import load_workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter


WORKBOOK_PATH = Path("cifar10_benchmark_statistics.xlsx")
PROFILE_PATH = Path("profile_mps.json")
DETAIL_SHEET = "Detailed profile (MPS)"
COMPARISON_SHEET = "Profile comparison"

TITLE_FILL = PatternFill("solid", fgColor="1F4E78")
HEADER_FILL = PatternFill("solid", fgColor="5B9BD5")
SECTION_FILL = PatternFill("solid", fgColor="D9EAD3")
WHITE_BOLD = Font(color="FFFFFF", bold=True)
BOLD = Font(bold=True)
WRAP = Alignment(wrap_text=True, vertical="top")


def reset_sheet(workbook, name: str):
    if name in workbook.sheetnames:
        del workbook[name]
    return workbook.create_sheet(name)


def title(sheet, text: str, width: int) -> None:
    sheet.merge_cells(start_row=1, start_column=1, end_row=1, end_column=width)
    cell = sheet.cell(1, 1, text)
    cell.fill = TITLE_FILL
    cell.font = WHITE_BOLD
    cell.alignment = WRAP


def section(sheet, row: int, text: str, width: int) -> None:
    sheet.merge_cells(start_row=row, start_column=1, end_row=row, end_column=width)
    cell = sheet.cell(row, 1, text)
    cell.fill = SECTION_FILL
    cell.font = BOLD
    cell.alignment = WRAP


def header(sheet, row: int, values: list[str]) -> None:
    for column, value in enumerate(values, 1):
        cell = sheet.cell(row, column, value)
        cell.fill = HEADER_FILL
        cell.font = WHITE_BOLD
        cell.alignment = WRAP


def set_widths(sheet, widths: list[int]) -> None:
    for index, width in enumerate(widths, 1):
        sheet.column_dimensions[get_column_letter(index)].width = width


def add_detailed_profile(workbook, profile: dict) -> None:
    sheet = reset_sheet(workbook, DETAIL_SHEET)
    title(sheet, "Detailed runtime profile — Apple Metal / MPS", 13)
    sheet.merge_cells("A2:M2")
    sheet["A2"] = (
        "All accelerator timings are synchronized before and after each iteration. "
        "Numbers are milliseconds except throughput."
    )
    sheet["A2"].alignment = WRAP
    sheet["A3"] = "Device"
    sheet["B3"] = profile["system"]["device_name"]
    sheet["D3"] = "PyTorch"
    sheet["E3"] = profile["system"]["pytorch_version"]
    sheet["G3"] = "Precision"
    sheet["H3"] = profile["configuration"]["precision"]

    header(
        sheet,
        5,
        [
            "Batch",
            "Input transfer mean ms",
            "Input transfer p50 ms",
            "Input transfer p95 ms",
            "Model mean ms",
            "Model p50 ms",
            "Model p95 ms",
            "Model img/s",
            "End-to-end mean ms",
            "End-to-end p50 ms",
            "End-to-end p95 ms",
            "End-to-end img/s",
            "Device timing method",
        ],
    )
    for row, item in enumerate(profile["inference"], 6):
        transfer = item["input_transfer"]["wall_time"]
        model = item["model_inference"]
        end_to_end = item["end_to_end_inference"]
        values = [
            item["batch_size"],
            transfer["mean_ms"], transfer["p50_ms"], transfer["p95_ms"],
            model["wall_time"]["mean_ms"], model["wall_time"]["p50_ms"], model["wall_time"]["p95_ms"],
            item["model_throughput_images_per_second"],
            end_to_end["wall_time"]["mean_ms"], end_to_end["wall_time"]["p50_ms"], end_to_end["wall_time"]["p95_ms"],
            item["end_to_end_throughput_images_per_second"],
            model["device_execution_time"]["method"],
        ]
        for column, value in enumerate(values, 1):
            sheet.cell(row, column, value)
    for row in sheet.iter_rows(min_row=6, max_row=5 + len(profile["inference"]), min_col=2, max_col=12):
        for cell in row:
            cell.number_format = "0.000"

    training_row = 7 + len(profile["inference"])
    section(sheet, training_row, "Training step (forward + loss + backward + optimizer)", 13)
    header(sheet, training_row + 1, ["Batch", "Mean ms", "p50 ms", "p95 ms", "Images/s", "Device timing method"])
    training = profile["training_step"]
    device_time = training["device_execution_time"]
    training_values = [
        training["batch_size"],
        training["wall_time"]["mean_ms"],
        training["wall_time"]["p50_ms"],
        training["wall_time"]["p95_ms"],
        training["throughput_images_per_second"],
        device_time["method"],
    ]
    for column, value in enumerate(training_values, 1):
        sheet.cell(training_row + 2, column, value)
    for column in range(2, 6):
        sheet.cell(training_row + 2, column).number_format = "0.000"

    operator_row = training_row + 4
    section(sheet, operator_row, "Top MPS dispatch operators (CPU-side profiler cost; not Metal kernel duration)", 13)
    header(sheet, operator_row + 1, ["Operator", "Calls", "Self CPU ms", "CPU total ms"])
    for row, item in enumerate(profile["top_profiled_operators"], operator_row + 2):
        sheet.cell(row, 1, item["operator"])
        sheet.cell(row, 2, item["calls"])
        sheet.cell(row, 3, item["self_cpu_time_ms"])
        sheet.cell(row, 4, item["cpu_time_ms"])
        sheet.cell(row, 3).number_format = "0.000"
        sheet.cell(row, 4).number_format = "0.000"

    set_widths(sheet, [28, 17, 17, 17, 15, 15, 15, 15, 19, 19, 19, 19, 55])
    sheet.freeze_panes = "A6"


def existing_rows(sheet, backend: str) -> dict[int, tuple]:
    return {row[2]: row for row in sheet.iter_rows(min_row=2, values_only=True) if row[0] == backend}


def add_comparison(workbook, profile: dict) -> None:
    sheet = reset_sheet(workbook, COMPARISON_SHEET)
    title(sheet, "CUDA vs Apple Metal / MPS — profiling comparison", 9)
    sheet.merge_cells("A2:I2")
    sheet["A2"] = (
        "CUDA values are the existing Tesla T4 / Google Colab baseline. MPS values are the latest local "
        "profile. Different machines and PyTorch versions make this a practical hardware comparison, not a controlled experiment."
    )
    sheet["A2"].alignment = WRAP

    cuda_inference = existing_rows(workbook["Inference"], "CUDA")
    mps_inference = {item["batch_size"]: item for item in profile["inference"]}
    section(sheet, 4, "Model-only inference (inputs already on the accelerator)", 9)
    header(
        sheet,
        5,
        [
            "Batch",
            "CUDA mean ms",
            "MPS mean ms",
            "CUDA faster (mean ×)",
            "CUDA p50 ms",
            "MPS p50 ms",
            "CUDA faster (p50 ×)",
            "MPS end-to-end mean ms",
            "MPS end-to-end img/s",
        ],
    )
    for row, batch_size in enumerate(sorted(set(cuda_inference) & set(mps_inference)), 6):
        cuda = cuda_inference[batch_size]
        mps = mps_inference[batch_size]
        model = mps["model_inference"]["wall_time"]
        end_to_end = mps["end_to_end_inference"]["wall_time"]
        values = [
            batch_size,
            cuda[3],
            model["mean_ms"],
            model["mean_ms"] / cuda[3],
            cuda[4],
            model["p50_ms"],
            model["p50_ms"] / cuda[4],
            end_to_end["mean_ms"],
            mps["end_to_end_throughput_images_per_second"],
        ]
        for column, value in enumerate(values, 1):
            sheet.cell(row, column, value)
    for row in sheet.iter_rows(min_row=6, max_row=5 + len(mps_inference), min_col=2, max_col=9):
        for cell in row:
            cell.number_format = "0.000"

    training_row = 7 + len(mps_inference)
    section(sheet, training_row, "Training step (batch 128)", 9)
    header(sheet, training_row + 1, ["Backend", "Mean ms", "p50 ms", "p95 ms", "Images/s", "CUDA faster (mean ×)"])
    cuda_training = next(row for row in workbook["Training step"].iter_rows(min_row=2, values_only=True) if row[0] == "CUDA")
    mps_training = profile["training_step"]
    values = [
        ("CUDA / Tesla T4", cuda_training[3], cuda_training[4], cuda_training[5], cuda_training[6], None),
        (
            "MPS / Apple Metal",
            mps_training["wall_time"]["mean_ms"],
            mps_training["wall_time"]["p50_ms"],
            mps_training["wall_time"]["p95_ms"],
            mps_training["throughput_images_per_second"],
            mps_training["wall_time"]["mean_ms"] / cuda_training[3],
        ),
    ]
    for row, data in enumerate(values, training_row + 2):
        for column, value in enumerate(data, 1):
            sheet.cell(row, column, value)
        for column in range(2, 7):
            sheet.cell(row, column).number_format = "0.000"

    note_row = training_row + 5
    section(sheet, note_row, "Kernel timing interpretation", 9)
    sheet.merge_cells(start_row=note_row + 1, start_column=1, end_row=note_row + 1, end_column=9)
    sheet.cell(note_row + 1, 1, (
        "CUDA can report current-stream GPU elapsed time through CUDA events. PyTorch has no matching MPS event timer; "
        "the MPS values use host monotonic time bracketed by torch.mps.synchronize(), which includes completed queued Metal work. "
        "For individual Metal kernels, record profile_cifar10.py --mps-signposts with Xcode Instruments → Metal System Trace."
    )).alignment = WRAP

    set_widths(sheet, [24, 16, 16, 20, 16, 16, 19, 23, 21])
    sheet.freeze_panes = "A6"


def main() -> None:
    if not WORKBOOK_PATH.exists():
        raise FileNotFoundError(WORKBOOK_PATH)
    if not PROFILE_PATH.exists():
        raise FileNotFoundError(f"Run profile_cifar10.py first: {PROFILE_PATH}")
    profile = json.loads(PROFILE_PATH.read_text(encoding="utf-8"))
    if profile["system"]["device"] != "mps":
        raise ValueError(f"Expected an MPS profile, got {profile['system']['device']!r}")
    workbook = load_workbook(WORKBOOK_PATH)
    add_detailed_profile(workbook, profile)
    add_comparison(workbook, profile)
    workbook.save(WORKBOOK_PATH)
    print(f"Updated {WORKBOOK_PATH.resolve()} with {DETAIL_SHEET!r} and {COMPARISON_SHEET!r}.")


if __name__ == "__main__":
    main()
