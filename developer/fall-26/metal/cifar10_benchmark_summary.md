# CIFAR-10 CUDA / Apple MPS / CPU benchmark summary

Generated: `2026-09-21T02:48:39+05:00`

Source notebooks: [`cifar10_cuda_google_collab.ipynb`](cifar10_cuda_google_collab.ipynb) and [`cifar10_cuda_mps_benchmark.ipynb`](cifar10_cuda_mps_benchmark.ipynb)

## Executive summary

The Google Colab notebook completed a real 5-epoch CIFAR-10 training run on an NVIDIA Tesla T4 using CUDA. Final test accuracy was **76.82%**. The local Mac run verified Apple MPS with real tensor and CNN operations, and measured the same `SmallCIFARNet` architecture on MPS and CPU.

The CUDA and MPS inference measurements use synthetic float32 CIFAR-shaped inputs with warm-up and explicit accelerator synchronization. The runs use different machines and PyTorch builds (Colab T4: PyTorch 2.11.0+cu128; Mac MPS: PyTorch 2.14.0), so the figures are hardware observations rather than a controlled identical-software experiment.

At batch size 128, measured inference throughput was **19,189 images/s CUDA**, **8,847 images/s MPS**, and **1,215 images/s Mac CPU**. The synthetic training-step throughput was **5,788 images/s CUDA**, **3,127 images/s MPS**, and **360 images/s Mac CPU**.

## Environment and model

| Backend | Device | Python | PyTorch | Precision | Parameters | CIFAR-10 status |
|---|---|---|---|---|---:|---|
| CUDA | NVIDIA Tesla T4 / Google Colab | 3.13.15 | 2.11.0+cu128 | float32 | 558,538 | 5 epochs completed |
| MPS | Apple Metal / MPS / Mac | 3.12.14 | 2.14.0 | float32 | 558,538 | Dataset download incomplete locally |
| CPU | Mac CPU | 3.12.14 | 2.14.0 | float32 | 558,538 | Inference and synthetic step only |

## CIFAR-10 training results from Colab CUDA

| Epoch | Train loss | Train accuracy | Train images/s | Test accuracy |
|---:|---:|---:|---:|---:|
| 1 | 1.3089 | 52.52% | 2191.9 | 56.06% |
| 2 | 0.9282 | 67.01% | 2788.6 | 63.82% |
| 3 | 0.7783 | 72.88% | 2756.2 | 71.12% |
| 4 | 0.6778 | 76.62% | 2627.6 | 71.79% |
| 5 | 0.6088 | 78.91% | 2710.2 | 76.82% |

Final CUDA test accuracy: **76.82%**. MPS test accuracy is not reported because the local CIFAR-10 archive had not finished downloading when this report was generated.

## Inference comparison

Model-only inference on synthetic `[B, 3, 32, 32]` float32 tensors. Dataset loading, augmentation, and allocation are excluded. Accelerator work was synchronized before and after every timed forward pass.

| Backend | Device | Batch | Mean latency (ms) | p50 (ms) | p95 (ms) | Throughput (images/s) |
|---|---|---:|---:|---:|---:|---:|
| CUDA | Google Colab Tesla T4 | 1 | 0.646 | 0.638 | 0.714 | 1546.9 |
| CUDA | Google Colab Tesla T4 | 8 | 0.905 | 1.025 | 1.061 | 8837.3 |
| CUDA | Google Colab Tesla T4 | 32 | 1.790 | 1.779 | 1.877 | 17877.3 |
| CUDA | Google Colab Tesla T4 | 128 | 6.670 | 6.640 | 6.716 | 19189.5 |
| MPS | Mac Apple Metal / MPS | 1 | 1.027 | 1.010 | 1.144 | 973.3 |
| MPS | Mac Apple Metal / MPS | 8 | 1.469 | 1.409 | 1.728 | 5445.0 |
| MPS | Mac Apple Metal / MPS | 32 | 3.789 | 3.768 | 3.911 | 8445.2 |
| MPS | Mac Apple Metal / MPS | 128 | 14.468 | 14.164 | 16.268 | 8847.2 |
| CPU | Mac CPU | 1 | 1.146 | 1.144 | 1.345 | 872.7 |
| CPU | Mac CPU | 8 | 4.472 | 4.245 | 5.308 | 1788.8 |
| CPU | Mac CPU | 32 | 49.557 | 47.838 | 57.147 | 645.7 |
| CPU | Mac CPU | 128 | 105.363 | 97.817 | 142.156 | 1214.8 |
| CPU | Colab CPU | 1 | 4.021 | 3.827 | 5.599 | 248.7 |
| CPU | Colab CPU | 8 | 22.733 | 22.222 | 27.027 | 351.9 |
| CPU | Colab CPU | 32 | 95.748 | 86.347 | 132.700 | 334.2 |
| CPU | Colab CPU | 128 | 481.498 | 462.027 | 659.143 | 265.8 |

### Throughput comparison

| Batch | CUDA / T4 | MPS / Mac | Mac CPU | CUDA vs MPS | MPS vs Mac CPU | CUDA vs Colab CPU |
|---:|---:|---:|---:|---:|---:|---:|
| 1 | 1546.9 | 973.3 | 872.7 | 1.59x | 1.12x | 6.22x |
| 8 | 8837.3 | 5445.0 | 1788.8 | 1.62x | 3.04x | 25.11x |
| 32 | 17877.3 | 8445.2 | 645.7 | 2.12x | 13.08x | 53.49x |
| 128 | 19189.5 | 8847.2 | 1214.8 | 2.17x | 7.28x | 72.20x |

## Synthetic training-step comparison

Batch size 128; includes forward, loss, backward, and `optimizer.step()`, excluding DataLoader and augmentation.

| Backend | Mean step (ms) | p50 (ms) | p95 (ms) | Training throughput (images/s) |
|---|---:|---:|---:|---:|
| CUDA / T4 | 22.116 | 22.121 | 22.365 | 5787.8 |
| MPS / Mac | 40.929 | 40.645 | 41.823 | 3127.3 |
| CPU / Mac | 355.562 | 351.558 | 377.105 | 360.0 |

## Notes and limitations

- The Colab CUDA notebook completed the CIFAR-10 training and test evaluation; its final test accuracy is a valid measured result.
- The local MPS/CPU inference and training-step measurements are valid model benchmarks, but the local CIFAR-10 training/test-accuracy run is still pending dataset completion.
- CPU baselines are machine-specific: Mac CPU and Colab CPU are reported separately.
- CUDA and MPS use different PyTorch versions and host systems. Keep the same package versions and checkpoint for a stricter controlled comparison.
- The primary comparison is float32. CUDA AMP is not used.

The Excel workbook [`cifar10_benchmark_statistics.xlsx`](cifar10_benchmark_statistics.xlsx) contains the raw values in sortable sheets.
