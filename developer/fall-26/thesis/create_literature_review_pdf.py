#!/usr/bin/env python3
"""Create a readable PDF literature-review evidence table for the thesis."""

from __future__ import annotations

from pathlib import Path
from textwrap import wrap

import matplotlib.pyplot as plt
from matplotlib.backends.backend_pdf import PdfPages


OUTPUT = Path(__file__).with_name("Literature_Review_Evidence_Table.pdf")

# Every individually identifiable CUDA/Metal source cited in the local DOCX/PPTX
# materials. The source field documents both coverage and citation completeness.
REFERENCES = [
    ("R01", "Workload foundations", "Vaswani et al. (2017). Attention Is All You Need. NeurIPS.",
     "Defines the Transformer and scaled dot-product self-attention.",
     "Provides the attention workload foundation; report prefill and decode separately.",
     "Peer-reviewed. Found in DOCX and PPTX."),
    ("R02", "Workload foundations", "Devlin et al. (2019). BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding. NAACL.",
     "Shows the Transformer as a reusable large-scale language-model workload.",
     "Justifies realistic Transformer inference evaluation and model selection.",
     "Peer-reviewed. PPTX only; citation completed from standard metadata."),
    ("R03", "Workload foundations", "Sze et al. (2017). Efficient Processing of Deep Neural Networks: A Tutorial and Survey. Proceedings of the IEEE, 105(12), 2295–2329.",
     "Surveys data reuse, energy, throughput, hardware, and evaluation trade-offs.",
     "Supports measuring memory, latency, and throughput together rather than FLOPs alone.",
     "Peer-reviewed. DOCX and PPTX."),
    ("R04", "Platforms and profiling", "Shen et al. (2018). CUDAAdvisor: LLVM-Based Runtime Profiling for Modern GPUs. CGO, 214–227.",
     "Profiles runtime and memory behavior across CUDA versions and GPU architectures.",
     "Use profiler evidence to attribute a speedup; do not rely on elapsed time alone.",
     "Peer-reviewed. DOCX and PPTX."),
    ("R05", "Platforms and profiling", "Mittal & Vaishay (2019). A Survey of Techniques for Optimizing Deep Learning on GPUs. Journal of Systems Architecture, 99, 101635.",
     "Classifies architecture- and system-level GPU optimization methods.",
     "Provides a CUDA taxonomy for interpreting memory, precision, computation, and parallelism.",
     "Peer-reviewed. DOCX and PPTX."),
    ("R06", "Attention and memory efficiency", "Dao et al. (2022). FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness. NeurIPS.",
     "Uses tiling and fusion to reduce HBM↔SRAM traffic while preserving exact attention.",
     "Primary portable principle: reduce high-bandwidth-memory reads and writes.",
     "Peer-reviewed. DOCX and PPTX."),
    ("R07", "Attention and memory efficiency", "Dao (2024). FlashAttention-2: Faster Attention with Better Parallelism and Work Partitioning. ICLR.",
     "Improves parallel work partitioning beyond the first FlashAttention kernel.",
     "Compare the IO-aware principle with backend-specific execution mapping.",
     "Peer-reviewed. DOCX and PPTX."),
    ("R08", "Attention and memory efficiency", "Shah et al. (2024). FlashAttention-3: Fast and Accurate Attention with Asynchrony and Low-precision. NeurIPS.",
     "Uses Hopper-specific asynchronous pipelines, warp specialization, and low precision.",
     "Key portability-limit example: later gains rely on NVIDIA-specific facilities.",
     "Peer-reviewed. DOCX and PPTX."),
    ("R09", "Attention and memory efficiency", "Yuan et al. (2025). Native Sparse Attention: Hardware-Aligned and Natively Trainable Sparse Attention. ACL.",
     "Combines hierarchical token compression, selection, and local windows with hardware-aligned sparsity.",
     "For long context, measure quality and phase-specific latency, not only FLOPs.",
     "Peer-reviewed. DOCX and PPTX."),
    ("R10", "Attention and memory efficiency", "Alizadeh et al. (2024). LLM in a Flash: Efficient Large Language Model Inference with Limited Memory. ACL.",
     "Selectively loads model parameters from flash storage into memory on demand.",
     "Keep parameter-residency methods distinct from attention-kernel methods.",
     "Peer-reviewed. DOCX and PPTX."),
    ("R11", "Serving", "Kwon et al. (2023). Efficient Memory Management for Large Language Model Serving with PagedAttention. SOSP.",
     "Pages the KV cache to reduce fragmentation and improve sharing and batching.",
     "Measure isolated kernels and end-to-end serving separately; report cache and batching conditions.",
     "Peer-reviewed. DOCX and PPTX."),
    ("R12", "Platforms and profiling", "Benazir & Lin (2025). Profiling Large Language Model Inference on Apple Silicon: A Quantization Perspective. arXiv:2508.08531.",
     "Profiles Apple Silicon and NVIDIA across model sizes and quantization settings.",
     "Use system-level Metal profiling and state the precision and execution path explicitly.",
     "Preprint. DOCX and PPTX; local DOCX venue claim requires verification."),
    ("R13", "Platforms and profiling", "Kirk & Hwu (2022). Programming Massively Parallel Processors: A Hands-on Approach (4th ed.). Morgan Kaufmann.",
     "Explains coalescing, tiling, synchronization, occupancy, and CUDA execution.",
     "Use as background for CUDA diagnosis; not direct evidence of Metal portability.",
     "Textbook. PPTX only; citation completed from standard metadata."),
    ("R14", "Platforms and profiling", "Apple ML Research (2025). MLX / Apple Silicon platform evidence (exact report unspecified in local files).",
     "Materials describe unified memory, Metal Performance Primitives, and distinct prompt/generation regimes.",
     "Use only as contextual platform evidence; keep it distinct from independent studies.",
     "Incomplete. DOCX and PPTX; add exact report, author, date, URL, and access date."),
    ("R15", "Serving and deployment", "Wu et al. (2019). Edge-inference deployment study (title and venue unspecified in local files).",
     "Cited for operator support and hardware fragmentation in edge deployment.",
     "Document runtime/backend coverage; distinguish Metal GPU, Core ML, and ANE paths.",
     "Incomplete. DOCX and PPTX; locate original title, venue, and identifier."),
    ("R16", "Serving and evaluation", "MLCommons / MLPerf Inference benchmark suite (exact version unspecified in local files).",
     "Defines scenario-, quality-, version-, and run-rule-based performance evaluation.",
     "Declare model, precision, shapes, versions, warm-up, repetitions, scenario, and quality constraints.",
     "Incomplete. DOCX and PPTX; cite the precise MLPerf Inference version and ruleset."),
    ("R17", "Serving and evaluation", "Schryen (2024). Speedup and Efficiency of Computational Parallelization: A Unifying Approach and Asymptotic Analysis. JPDC, 185, 104801.",
     "Unifies speedup and efficiency models and analyzes overhead and scalability.",
     "Report within-platform relative speedups and explain residual serial and system overhead.",
     "Peer-reviewed. DOCX and PPTX."),
]

def shorten(text: str, width: int) -> str:
    return "\n".join(wrap(text, width=width, break_long_words=False, break_on_hyphens=False))


def add_reference_page(pdf: PdfPages, items: list[tuple], page: int, total: int) -> None:
    fig, axis = plt.subplots(figsize=(11.69, 8.27))
    axis.axis("off")
    axis.text(0.02, 0.975, f"Literature review evidence table — sources {items[0][0]}–{items[-1][0]} ({page}/{total})", fontsize=14, fontweight="bold", color="#1F4E78", va="top")
    headings = ["Reference", "Main contribution / evidence", "Role in thesis", "Source and citation status"]
    rows = []
    for identifier, theme, reference, focus, role, source in items:
        rows.append([
            f"{identifier}  |  {theme}\n{shorten(reference, 34)}",
            shorten(focus, 38),
            shorten(role, 38),
            shorten(source, 32),
        ])
    table = axis.table(
        cellText=rows,
        colLabels=headings,
        cellLoc="left",
        colLoc="center",
        colWidths=[0.29, 0.25, 0.25, 0.21],
        bbox=[0.02, 0.08, 0.96, 0.74],
    )
    table.auto_set_font_size(False)
    table.set_fontsize(7.3)
    for (row, column), cell in table.get_celld().items():
        cell.set_edgecolor("#B7B7B7")
        cell.PAD = 0.02
        if row == 0:
            cell.set_height(0.07)
            cell.set_facecolor("#5B9BD5")
            cell.get_text().set_color("white")
            cell.get_text().set_fontweight("bold")
            cell.get_text().set_ha("center")
        else:
            cell.set_height(0.315)
            cell.get_text().set_va("top")
            if "Incomplete" in rows[row - 1][3] or "requires verification" in rows[row - 1][3]:
                cell.set_facecolor("#FFF2CC")
    axis.text(0.02, 0.025, "Yellow rows need citation completion or verification before thesis submission.", fontsize=8, color="#666666")
    pdf.savefig(fig)
    plt.close(fig)


def main() -> None:
    # Two entries per landscape page keep the content readable when printed.
    chunks = [REFERENCES[index:index + 2] for index in range(0, len(REFERENCES), 2)]
    with PdfPages(OUTPUT) as pdf:
        for page, entries in enumerate(chunks, 1):
            add_reference_page(pdf, entries, page, len(chunks))
    print(f"Created {OUTPUT}")


if __name__ == "__main__":
    main()
