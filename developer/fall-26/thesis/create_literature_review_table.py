#!/usr/bin/env python3
"""Create the thesis literature-review evidence table from the local source set.

The table inventories every individually identifiable CUDA/Metal reference cited
in the thesis DOCX/PPTX materials.  The supplied Sample Literature PDF concerns
IoT offloading and contains numbered citations without a bibliography, so it is
recorded in the source inventory but not misrepresented as a CUDA/Metal source.
"""

from __future__ import annotations

from pathlib import Path

from openpyxl import Workbook
from openpyxl.formatting.rule import ColorScaleRule
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.table import Table, TableStyleInfo


OUTPUT = Path(__file__).with_name("Literature_Review_Evidence_Table.xlsx")

REFERENCES = [
    (
        "R01", "Workload foundations", "Vaswani et al. (2017)",
        "Attention Is All You Need. NeurIPS.",
        "Defines the Transformer and scaled dot-product self-attention.",
        "Establishes the attention workload; sequence length exposes quadratic attention and memory costs.",
        "Use as the model/workload foundation; report prefill and decode separately.",
        "Peer-reviewed conference paper", "DOCX; PPTX", "Complete in local materials",
    ),
    (
        "R02", "Workload foundations", "Devlin et al. (2019)",
        "BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding. NAACL.",
        "Demonstrates a widely reused Transformer workload at scale.",
        "Connects the architecture to a representative practical inference workload.",
        "Use to justify model selection and realistic Transformer inference evaluation.",
        "Peer-reviewed conference paper", "PPTX", "Title/venue completed from standard citation; absent from DOCX reference list",
    ),
    (
        "R03", "Workload foundations", "Sze et al. (2017)",
        "Efficient Processing of Deep Neural Networks: A Tutorial and Survey. Proceedings of the IEEE, 105(12), 2295–2329.",
        "Surveys DNN hardware, data reuse, energy, throughput, and evaluation trade-offs.",
        "Shows why operation count alone does not predict latency or energy; data movement and reuse matter.",
        "Use as the systems rationale for measuring memory, latency, and throughput together.",
        "Peer-reviewed survey", "DOCX; PPTX", "Complete in local materials",
    ),
    (
        "R04", "Platforms and profiling", "Shen et al. (2018)",
        "CUDAAdvisor: LLVM-Based Runtime Profiling for Modern GPUs. CGO, 214–227.",
        "Provides profiling to expose runtime and memory behavior across CUDA versions and GPU architectures.",
        "Links optimization decisions to kernel time, memory behavior, and architecture-aware diagnosis.",
        "Use profiler evidence to attribute a speedup rather than report timing alone.",
        "Peer-reviewed conference paper", "DOCX; PPTX", "Complete in local materials",
    ),
    (
        "R05", "Platforms and profiling", "Mittal & Vaishay (2019)",
        "A Survey of Techniques for Optimizing Deep Learning on GPUs. Journal of Systems Architecture, 99, 101635.",
        "Classifies architecture- and system-level methods for GPU training and inference optimization.",
        "Frames memory, precision, computation, and parallelism as interacting optimization dimensions.",
        "Use as a CUDA optimization taxonomy and interpretation aid for kernel measurements.",
        "Peer-reviewed survey", "DOCX; PPTX", "Complete in local materials",
    ),
    (
        "R06", "Attention and memory efficiency", "Dao et al. (2022)",
        "FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness. NeurIPS.",
        "Uses tiling and fusion to reduce HBM↔SRAM traffic while preserving exact attention.",
        "Memory traffic can dominate FLOPs; IO-aware exact attention can materially improve wall-clock time.",
        "Primary portable optimization principle: reduce high-bandwidth-memory reads/writes.",
        "Peer-reviewed conference paper", "DOCX; PPTX", "Complete in local materials",
    ),
    (
        "R07", "Attention and memory efficiency", "Dao (2024)",
        "FlashAttention-2: Faster Attention with Better Parallelism and Work Partitioning. ICLR.",
        "Improves work partitioning and parallelism beyond the first FlashAttention kernel.",
        "Algorithmic IO awareness remains useful, but its performance depends increasingly on execution mapping.",
        "Compare the portable principle with backend-specific work scheduling.",
        "Peer-reviewed conference paper", "DOCX; PPTX", "Complete in local materials",
    ),
    (
        "R08", "Attention and memory efficiency", "Shah et al. (2024)",
        "FlashAttention-3: Fast and Accurate Attention with Asynchrony and Low-precision. NeurIPS.",
        "Uses Hopper-specific asynchronous pipelines, warp specialization, and low-precision paths.",
        "Later attention gains rely on NVIDIA-specific facilities and therefore may not transfer directly to Metal.",
        "Use as the key example of portability limits caused by hardware specialization.",
        "Peer-reviewed conference paper", "DOCX; PPTX", "Complete in local materials",
    ),
    (
        "R09", "Attention and memory efficiency", "Yuan et al. (2025)",
        "Native Sparse Attention: Hardware-Aligned and Natively Trainable Sparse Attention. ACL.",
        "Combines hierarchical token compression, selection, and local windows with hardware-aligned sparse execution.",
        "Reduces token interactions for long-context workloads while preserving trainability.",
        "Candidate long-context optimization; measure quality and phase-specific latency, not only FLOPs.",
        "Peer-reviewed conference paper", "DOCX; PPTX", "Complete in local materials",
    ),
    (
        "R10", "Attention and memory efficiency", "Alizadeh et al. (2024)",
        "LLM in a Flash: Efficient Large Language Model Inference with Limited Memory. ACL.",
        "Selectively loads parameters from flash storage into memory on demand.",
        "Parameter residency and storage traffic can be the limiting resource when models exceed DRAM.",
        "Separate memory-residency methods from attention-kernel methods in the comparison.",
        "Peer-reviewed conference paper", "DOCX; PPTX", "Complete in local materials",
    ),
    (
        "R11", "Serving", "Kwon et al. (2023)",
        "Efficient Memory Management for Large Language Model Serving with PagedAttention. SOSP.",
        "Pages the key-value cache to reduce fragmentation and improve sharing/batching in LLM serving.",
        "A faster attention kernel may not yield proportional end-to-end improvement when KV-cache management dominates.",
        "Measure isolated kernels and end-to-end serving separately; include cache/batching conditions.",
        "Peer-reviewed conference paper", "DOCX; PPTX", "Complete in local materials",
    ),
    (
        "R12", "Platforms and profiling", "Benazir & Lin (2025)",
        "Profiling Large Language Model Inference on Apple Silicon: A Quantization Perspective. arXiv:2508.08531.",
        "Profiles Apple Silicon and NVIDIA testbeds across model sizes and quantization settings.",
        "Unified memory can enable large models, while lower precision is not automatically faster; bottlenecks are interdependent.",
        "Anchor Metal analysis in system-level profiling and report precision/path explicitly.",
        "Preprint", "DOCX; PPTX", "Local DOCX says ACM PACM MACS; verify final publication venue before thesis submission",
    ),
    (
        "R13", "Platforms and profiling", "Kirk & Hwu (2022)",
        "Programming Massively Parallel Processors: A Hands-on Approach (4th ed.). Morgan Kaufmann.",
        "Explains coalescing, tiling, synchronization, occupancy, and CUDA execution concepts.",
        "Provides practical vocabulary for interpreting CUDA kernel behavior and architecture-specific optimization.",
        "Use as a background source; do not treat it as direct empirical evidence for Metal portability.",
        "Textbook", "PPTX", "Title/edition completed from standard citation; absent from DOCX reference list",
    ),
    (
        "R14", "Platforms and profiling", "Apple ML Research (2025)",
        "MLX / Apple Silicon platform evidence (exact report and URL not specified in local materials).",
        "The thesis materials describe unified memory, Metal Performance Primitives, and distinct prompt/generation regimes.",
        "Useful platform context, but it is vendor evidence rather than independent validation.",
        "Treat as contextual evidence; identify the exact Apple report and keep it separate from peer-reviewed findings.",
        "Vendor technical report / web source", "DOCX; PPTX", "Incomplete—exact title, authors, date, and URL required",
    ),
    (
        "R15", "Serving and deployment", "Wu et al. (2019)",
        "Edge-inference deployment study (title and venue not specified in local materials).",
        "Cited for operator support and hardware fragmentation in edge deployment.",
        "Unsupported operators and heterogeneous deployment paths can mask a local kernel improvement.",
        "Document runtime/backend coverage and distinguish Metal GPU, Core ML, and ANE paths.",
        "Unverified citation", "DOCX; PPTX", "Incomplete—authors beyond Wu, title, venue, and persistent identifier required",
    ),
    (
        "R16", "Serving and evaluation", "MLCommons / MLPerf Inference",
        "MLPerf Inference benchmark suite (version and exact citation not specified in local materials).",
        "Defines scenario-, quality-, software-version-, and run-rule-based performance evaluation.",
        "Reproducibility controls are necessary for credible latency and throughput claims.",
        "Declare model, precision, shapes, versions, scenario, warm-up, repetitions, and quality constraints.",
        "Benchmark specification", "DOCX; PPTX", "Incomplete—cite the exact MLPerf Inference version used",
    ),
    (
        "R17", "Serving and evaluation", "Schryen (2024)",
        "Speedup and Efficiency of Computational Parallelization: A Unifying Approach and Asymptotic Analysis. Journal of Parallel and Distributed Computing, 185, 104801.",
        "Unifies speedup/efficiency models and analyzes overhead and asymptotic scalability.",
        "Serial work and overhead bound acceleration, so a kernel speedup need not equal application speedup.",
        "Report relative within-platform speedups and explain residual overhead.",
        "Peer-reviewed journal article", "DOCX; PPTX", "Complete in local materials",
    ),
]

INVENTORY = [
    (
        "Tursyn_CSCI693_Literature_Review_Introduction_AI_Free_APA7.docx",
        "Primary prose draft; selected references include 14 individually identifiable works/sources, with some grouped in one line.",
        "Included in R01, R03–R12, R14–R17.",
    ),
    (
        "Tursyn_CSCI693_Literature_Review_Introduction.docx",
        "Near-duplicate prose draft with the same selected-reference set.",
        "Included; no additional identifiable references beyond the primary prose draft.",
    ),
    (
        "Tursyn_CSCI693_Literature_Review_Introduction2.docx",
        "Earlier draft; cites Devlin, MLPerf, Wu, and Apple MLX context but does not provide full bibliography entries.",
        "Adds/strengthens R02, R14–R16; incompleteness flagged in the review table.",
    ),
    (
        "Tursyn_CSCI693_Thesis_Literature_Review_Introduction_Final.pptx",
        "Presentation source; additionally cites Devlin and Kirk & Hwu and organizes the review by mechanism.",
        "Adds R02 and R13; confirms thematic grouping for all rows.",
    ),
    (
        "Sample Literature.pdf",
        "Unrelated IoT/MEC offloading excerpt. It has numbered citations [3], [7], [9], etc., but no bibliography appears in the supplied file.",
        "Not synthesized into this CUDA/Metal table. Obtain its reference pages before creating an IoT-offloading literature table.",
    ),
]

BLUE = "1F4E78"
HEADER_BLUE = "5B9BD5"
PALE_BLUE = "D9EAF7"
PALE_YELLOW = "FFF2CC"
WHITE = "FFFFFF"
THIN = Side(style="thin", color="B7B7B7")


def style_header(row) -> None:
    for cell in row:
        cell.fill = PatternFill("solid", fgColor=HEADER_BLUE)
        cell.font = Font(color=WHITE, bold=True)
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        cell.border = Border(bottom=THIN)


def write_review_table(book: Workbook) -> None:
    sheet = book.active
    sheet.title = "Review table"
    sheet.merge_cells("A1:J1")
    sheet["A1"] = "Literature Review Evidence Table — Hardware-Aware Transformer Inference on CUDA and Apple Metal"
    sheet["A1"].fill = PatternFill("solid", fgColor=BLUE)
    sheet["A1"].font = Font(color=WHITE, bold=True, size=14)
    sheet["A1"].alignment = Alignment(wrap_text=True, vertical="center")
    sheet.row_dimensions[1].height = 32
    sheet.merge_cells("A2:J2")
    sheet["A2"] = (
        "Scope: every individually identifiable CUDA/Metal source cited in the thesis DOCX/PPTX materials. "
        "Rows marked Incomplete require bibliographic verification before final submission."
    )
    sheet["A2"].fill = PatternFill("solid", fgColor=PALE_YELLOW)
    sheet["A2"].alignment = Alignment(wrap_text=True, vertical="center")
    sheet.row_dimensions[2].height = 34

    headers = [
        "ID", "Theme", "In-text reference", "Citation / source", "Focus or method",
        "Key evidence for this thesis", "Role in the proposed study", "Evidence type",
        "Found in local file(s)", "Citation integrity",
    ]
    for column, value in enumerate(headers, 1):
        sheet.cell(4, column, value)
    style_header(sheet[4])
    for row_number, item in enumerate(REFERENCES, 5):
        for column, value in enumerate(item, 1):
            cell = sheet.cell(row_number, column, value)
            cell.alignment = Alignment(wrap_text=True, vertical="top")
            cell.border = Border(bottom=THIN)
        sheet.row_dimensions[row_number].height = 88
        if "Incomplete" in item[-1] or "Unverified" in item[-1] or "verify" in item[-1].lower():
            for cell in sheet[row_number]:
                cell.fill = PatternFill("solid", fgColor=PALE_YELLOW)

    table = Table(displayName="LiteratureReview", ref=f"A4:J{4 + len(REFERENCES)}")
    table.tableStyleInfo = TableStyleInfo(name="TableStyleMedium2", showRowStripes=True, showColumnStripes=False)
    sheet.add_table(table)
    sheet.auto_filter.ref = f"A4:J{4 + len(REFERENCES)}"
    sheet.freeze_panes = "D5"
    widths = [9, 28, 27, 52, 44, 58, 52, 25, 26, 48]
    for column, width in enumerate(widths, 1):
        sheet.column_dimensions[get_column_letter(column)].width = width


def write_inventory(book: Workbook) -> None:
    sheet = book.create_sheet("Source inventory")
    sheet.merge_cells("A1:C1")
    sheet["A1"] = "Thesis-directory source inventory and coverage decision"
    sheet["A1"].fill = PatternFill("solid", fgColor=BLUE)
    sheet["A1"].font = Font(color=WHITE, bold=True, size=14)
    sheet["A1"].alignment = Alignment(wrap_text=True)
    headers = ["Local file", "What it contains", "How it is handled in this workbook"]
    for column, value in enumerate(headers, 1):
        sheet.cell(3, column, value)
    style_header(sheet[3])
    for row, item in enumerate(INVENTORY, 4):
        for column, value in enumerate(item, 1):
            cell = sheet.cell(row, column, value)
            cell.alignment = Alignment(wrap_text=True, vertical="top")
            cell.border = Border(bottom=THIN)
        sheet.row_dimensions[row].height = 64
    sheet["A10"] = "Coverage total"
    sheet["B10"] = "17 individually identifiable CUDA/Metal works or sources (R01–R17)."
    sheet["A10"].font = Font(bold=True)
    sheet["B10"].font = Font(bold=True)
    for column, width in enumerate([64, 85, 85], 1):
        sheet.column_dimensions[get_column_letter(column)].width = width
    sheet.freeze_panes = "A4"


def write_completion_list(book: Workbook) -> None:
    sheet = book.create_sheet("Citation checks")
    sheet.merge_cells("A1:D1")
    sheet["A1"] = "Citation checks required before thesis submission"
    sheet["A1"].fill = PatternFill("solid", fgColor=BLUE)
    sheet["A1"].font = Font(color=WHITE, bold=True, size=14)
    sheet["A1"].alignment = Alignment(wrap_text=True)
    headers = ["Reference ID", "Issue", "Required action", "Status"]
    for column, value in enumerate(headers, 1):
        sheet.cell(3, column, value)
    style_header(sheet[3])
    rows = [
        ("R12", "Local documents identify a PACM MACS venue, while the identified 2025 work is an arXiv preprint.", "Confirm whether a peer-reviewed version exists; then use its final venue, DOI, and publication details.", "Needs verification"),
        ("R14", "Apple MLX/M5 platform evidence is mentioned without title, author, publication date, or URL.", "Replace with the exact Apple ML Research report/technical page and archive the access date.", "Needs completion"),
        ("R15", "Wu et al. (2019) has no title, venue, or identifier in the available thesis files.", "Locate the original source and add a complete APA 7 reference before relying on its claim.", "Needs completion"),
        ("R16", "MLPerf Inference is named without a version, benchmark paper, or ruleset.", "Cite the exact MLPerf Inference version and scenario/rules used to guide the experiment.", "Needs completion"),
        ("Sample PDF", "The IoT/MEC sample has in-text numeric citations but no reference pages in the supplied excerpt.", "Obtain the bibliography before including any of its papers in a separate IoT-offloading review.", "Source incomplete"),
    ]
    for row, item in enumerate(rows, 4):
        for column, value in enumerate(item, 1):
            cell = sheet.cell(row, column, value)
            cell.alignment = Alignment(wrap_text=True, vertical="top")
            cell.border = Border(bottom=THIN)
            if column == 4:
                cell.fill = PatternFill("solid", fgColor=PALE_YELLOW)
        sheet.row_dimensions[row].height = 58
    sheet.conditional_formatting.add("D4:D8", ColorScaleRule(start_type="min", start_color="FFF2CC", end_type="max", end_color="FFF2CC"))
    for column, width in enumerate([18, 50, 82, 22], 1):
        sheet.column_dimensions[get_column_letter(column)].width = width
    sheet.freeze_panes = "A4"


def main() -> None:
    workbook = Workbook()
    write_review_table(workbook)
    write_inventory(workbook)
    write_completion_list(workbook)
    workbook.save(OUTPUT)
    print(f"Created {OUTPUT}")


if __name__ == "__main__":
    main()
