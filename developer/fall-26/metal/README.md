# CIFAR-10 CUDA, MPS, and CPU benchmark

Run `./setup_venv.sh` from this directory, select the **Python 3.12
(metal-benchmark)** kernel, then run every cell in
`cifar10_cuda_mps_benchmark.ipynb`.

The notebook trains one FP32 CNN on CIFAR-10, reports per-epoch train/test
metrics, benchmarks synchronized model-only inference for batches 1/8/32/128,
and saves a checkpoint plus a backend-specific JSON result file. It chooses
CUDA first, then Apple Metal/MPS, then CPU.

`NUM_WORKERS` is deliberately zero on macOS to keep notebook DataLoader use
stable. The primary comparison excludes CUDA AMP and disables CUDA TF32 where
the installed PyTorch exposes that option.

## macOS 26 / Homebrew Python note

On this Mac, Homebrew Python 3.12.14's `ensurepip` initially failed because
its `pyexpat` extension was linked against an older macOS Expat ABI. The setup
script detects that condition and applies a copied, re-signed extension only
inside `.venv`; it then creates the requested Jupyter kernel. No project Python
packages are installed globally.
