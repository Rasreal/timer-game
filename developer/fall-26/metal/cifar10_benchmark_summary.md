# CIFAR-10 CUDA / Apple MPS / CPU benchmark summary

Generated: `2026-09-21T02:44:44+05:00`  
Source: measurements generated from the notebook's benchmark functions  
Notebook: [`cifar10_cuda_mps_benchmark.ipynb`](cifar10_cuda_mps_benchmark.ipynb)

## Executive summary

The same `SmallCIFARNet` architecture was measured with float32 synthetic CIFAR-shaped inputs on Apple MPS and CPU. MPS was available and passed a real matrix multiplication and CNN training/inference operation. CUDA was not available on this Mac, so no CUDA number is fabricated; run the notebook in Colab with a GPU to populate the CUDA column.

MPS delivered **8.69x higher synthetic training-step throughput** than CPU at batch size 128. Inference throughput advantage ranged from **1.12x to 13.08x** across the requested batch sizes.

## Environment and model

| Item | Value |
|---|---|
| Selected backend | `mps` (Apple Metal / MPS) |
| Platform | `macOS-26.2-arm64-arm-64bit` |
| Python | `3.12.14` |
| PyTorch / torchvision | `2.14.0` / `0.29.0` |
| Precision | `float32` |
| MPS built / available | `True` / `True` |
| Random seed | `42` |
| Model | `SmallCIFARNet` |
| Trainable parameters | `558,538` |

## Inference comparison

Model-only inference on synthetic `[B, 3, 32, 32]` tensors. Warm-up runs were excluded; accelerator work was synchronized before and after each timed forward pass.

| Backend | Batch | Mean latency (ms) | p50 (ms) | p95 (ms) | Throughput (images/s) |
|---|---:|---:|---:|---:|---:|
| MPS | 1 | 1.027 | 1.010 | 1.144 | 973.3 |
| MPS | 8 | 1.469 | 1.409 | 1.728 | 5445.0 |
| MPS | 32 | 3.789 | 3.768 | 3.911 | 8445.2 |
| MPS | 128 | 14.468 | 14.164 | 16.268 | 8847.2 |
| CPU | 1 | 1.146 | 1.144 | 1.345 | 872.7 |
| CPU | 8 | 4.472 | 4.245 | 5.308 | 1788.8 |
| CPU | 32 | 49.557 | 47.838 | 57.147 | 645.7 |
| CPU | 128 | 105.363 | 97.817 | 142.156 | 1214.8 |
| CUDA | 1 / 8 / 32 / 128 | unavailable locally | — | — | Run in Google Colab |

### MPS advantage over CPU

| Batch | MPS mean (ms) | CPU mean (ms) | MPS latency advantage | MPS throughput (images/s) | CPU throughput (images/s) | MPS throughput advantage |
|---:|---:|---:|---:|---:|---:|---:|
| 1 | 1.027 | 1.146 | 1.12x | 973.3 | 872.7 | 1.12x |
| 8 | 1.469 | 4.472 | 3.04x | 5445.0 | 1788.8 | 3.04x |
| 32 | 3.789 | 49.557 | 13.08x | 8445.2 | 645.7 | 13.08x |
| 128 | 14.468 | 105.363 | 7.28x | 8847.2 | 1214.8 | 7.28x |

## Synthetic training-step comparison

This includes forward, cross-entropy loss, backward, and `optimizer.step()` but excludes dataset loading and augmentation. Batch size was 128.

| Backend | Mean step (ms) | p50 (ms) | p95 (ms) | Training throughput (images/s) |
|---|---:|---:|---:|---:|
| MPS | 40.929 | 40.645 | 41.823 | 3127.3 |
| CPU | 355.562 | 351.558 | 377.105 | 360.0 |
| CUDA | unavailable locally | — | — | Run in Google Colab |

## CIFAR-10 training status

| Backend | Training | Test accuracy | Status |
|---|---|---:|---|
| MPS | 5-epoch notebook run | pending | The CIFAR-10 archive was still downloading on this Mac during report generation. |
| CPU | not run | pending | CPU baseline here uses the same model weights for inference and a synthetic training-step benchmark. |
| CUDA | not run locally | pending | Run the notebook in Colab with a CUDA runtime. |

The report intentionally does not turn synthetic/random-input results into a CIFAR-10 accuracy claim. Once the dataset download completes, run all notebook cells; the notebook will save `benchmark_mps.json` (or `benchmark_cuda.json` in Colab) with epoch loss, accuracy, timing, and throughput.

## Reproduction notes

- Use the `Python 3.12 (metal-benchmark)` kernel.
- The notebook selects CUDA first, then MPS, then CPU.
- Primary comparison is float32; CUDA AMP and TF32 are excluded from the main comparison.
- macOS uses `NUM_WORKERS = 0` for Jupyter/DataLoader reliability.
- The Excel workbook [`cifar10_benchmark_statistics.xlsx`](cifar10_benchmark_statistics.xlsx) contains the same raw measurements in sortable sheets.
