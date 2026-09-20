# CIFAR-10 CUDA / Apple MPS / CPU benchmark summary

Generated: `2026-09-21T03:28:07+05:00`

Source notebooks: [`cifar10_cuda_google_collab.ipynb`](cifar10_cuda_google_collab.ipynb) and [`cifar10_cuda_mps_benchmark.ipynb`](cifar10_cuda_mps_benchmark.ipynb)

## Final status

Both the Google Colab CUDA run and the local Mac MPS run completed the five-epoch CIFAR-10 training benchmark using the same `SmallCIFARNet` architecture and float32 workload.

- CUDA: NVIDIA Tesla T4, final test accuracy **76.82%**
- MPS: Apple Metal, final test accuracy **75.60%**
- MPS passed a real tensor operation and CNN training/inference operation
- CPU baselines use the same architecture and trained MPS weights for inference, plus a synthetic training-step benchmark

## Training comparison

| Backend | Device | Final test accuracy | Epoch 5 train images/s | Trainable parameters |
|---|---|---:|---:|---:|
| CUDA | NVIDIA Tesla T4 / Google Colab | 76.82% | 2,710.2 | 558,538 |
| MPS | Apple Metal / Mac | 75.60% | 3093.5 | 558,538 |
| CPU | Mac CPU | Not retrained | — | 558,538 |

### Per-epoch accuracy and throughput

| Backend | Epoch | Train loss | Train accuracy | Train images/s | Test loss | Test accuracy |
|---|---:|---:|---:|---:|---:|---:|
| CUDA | 1 | 1.3089 | 52.52% | 2191.9 | — | 56.06% |
| CUDA | 2 | 0.9282 | 67.01% | 2788.6 | — | 63.82% |
| CUDA | 3 | 0.7783 | 72.88% | 2756.2 | — | 71.12% |
| CUDA | 4 | 0.6778 | 76.62% | 2627.6 | — | 71.79% |
| CUDA | 5 | 0.6088 | 78.91% | 2710.2 | — | 76.82% |
| MPS | 1 | 1.3167 | 52.40% | 2716.9 | 1.3776 | 53.00% |
| MPS | 2 | 0.9384 | 66.91% | 3060.1 | 1.6143 | 51.68% |
| MPS | 3 | 0.7848 | 72.35% | 3091.7 | 1.0298 | 64.18% |
| MPS | 4 | 0.6821 | 76.19% | 3090.3 | 0.7233 | 74.81% |
| MPS | 5 | 0.6103 | 78.86% | 3093.5 | 0.7133 | 75.60% |

## Inference comparison

Model-only inference on synthetic `[B, 3, 32, 32]` float32 tensors. Warm-up runs were excluded and CUDA/MPS operations were explicitly synchronized.

| Backend | Device | Batch | Mean ms | p50 ms | p95 ms | Images/s |
|---|---|---:|---:|---:|---:|---:|
| CUDA | Tesla T4 / Google Colab | 1 | 0.646 | 0.638 | 0.714 | 1546.9 |
| CUDA | Tesla T4 / Google Colab | 8 | 0.905 | 1.025 | 1.061 | 8837.3 |
| CUDA | Tesla T4 / Google Colab | 32 | 1.790 | 1.779 | 1.877 | 17877.3 |
| CUDA | Tesla T4 / Google Colab | 128 | 6.670 | 6.640 | 6.716 | 19189.5 |
| MPS | Apple Metal / Mac | 1 | 0.982 | 0.964 | 1.149 | 1018.2 |
| MPS | Apple Metal / Mac | 8 | 1.628 | 1.543 | 2.023 | 4915.2 |
| MPS | Apple Metal / Mac | 32 | 3.972 | 3.894 | 4.392 | 8057.3 |
| MPS | Apple Metal / Mac | 128 | 14.071 | 14.015 | 14.598 | 9096.7 |
| CPU | Mac CPU | 1 | 1.228 | 1.225 | 1.324 | 814.4 |
| CPU | Mac CPU | 8 | 4.136 | 4.058 | 4.814 | 1934.2 |
| CPU | Mac CPU | 32 | 49.217 | 46.885 | 59.680 | 650.2 |
| CPU | Mac CPU | 128 | 98.524 | 95.510 | 119.379 | 1299.2 |
| CPU | Colab CPU | 1 | 4.021 | 3.827 | 5.599 | 248.7 |
| CPU | Colab CPU | 8 | 22.733 | 22.222 | 27.027 | 351.9 |
| CPU | Colab CPU | 32 | 95.748 | 86.347 | 132.700 | 334.2 |
| CPU | Colab CPU | 128 | 481.498 | 462.027 | 659.143 | 265.8 |

### Throughput comparison

| Batch | CUDA/T4 | MPS/Mac | Mac CPU | CUDA vs MPS | MPS vs Mac CPU | CUDA vs Colab CPU |
|---:|---:|---:|---:|---:|---:|---:|
| 1 | 1546.9 | 1018.2 | 814.4 | 1.52x | 1.25x | 6.22x |
| 8 | 8837.3 | 4915.2 | 1934.2 | 1.80x | 2.54x | 25.11x |
| 32 | 17877.3 | 8057.3 | 650.2 | 2.22x | 12.39x | 53.49x |
| 128 | 19189.5 | 9096.7 | 1299.2 | 2.11x | 7.00x | 72.20x |

## Synthetic training-step comparison

Batch size 128; includes forward, loss, backward, and optimizer step, excluding DataLoader and augmentation.

| Backend | Mean ms | p50 ms | p95 ms | Images/s |
|---|---:|---:|---:|---:|
| CUDA/T4 | 22.116 | 22.121 | 22.365 | 5787.8 |
| MPS/Mac | 43.350 | 42.449 | 48.635 | 2952.7 |
| CPU/Mac | 356.644 | 352.240 | 391.493 | 358.9 |

## Caveats

CUDA and MPS ran on different machines and PyTorch versions (CUDA T4: PyTorch 2.11.0+cu128; MPS Mac: PyTorch 2.14.0), so this is a practical hardware comparison, not a controlled identical-system experiment. The main workload is float32; CUDA AMP is not used. The Excel workbook contains all raw measurements in sortable sheets.
