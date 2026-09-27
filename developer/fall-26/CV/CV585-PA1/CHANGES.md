# Assignment 1 changes and testing

## Run the assignment

Open the `CV585-PA1` folder in VS Code, open `Assignment1.ipynb`, and choose **Python 3.13 (CV585 PA1)** from **Select Kernel**. Then choose **Run All**.

The `.vscode/settings.json` file selects this environment automatically when this folder is opened as the VS Code workspace.

To recreate the environment from a terminal in this folder, run:

```bash
uv venv --clear --seed --python /opt/homebrew/Cellar/python@3.13/3.13.3_1/Frameworks/Python.framework/Versions/3.13/bin/python3.13 .venv
source .venv/bin/activate
uv pip install numpy matplotlib scikit-image ipykernel
python -m ipykernel install --user --name cv585-pa1 --display-name "Python 3.13 (CV585 PA1)"
```

Run the notebook from this folder because it uses relative paths for the images.

The notebook should finish without an `AssertionError`. The important expected results are:

- `dot_product(b, c)` prints `2`.
- `matrix_mult(M, a, b, c)` prints `[[2], [14], [26], [38]]` with shape `(4, 1)`.
- The first convolution assertion passes.
- `k1 * k2` equals the 5 by 5 Gaussian kernel.
- The final separable-convolution assertion passes.

The image cells should display Astana, Khan Shatyr, the modified images, and the convolution outputs. `conv_fast` should be faster than `conv_naive` while producing the same output.

## Code changes

| File | Change | Why |
| --- | --- | --- |
| `Assignment1.ipynb` | Defined `M`, `a`, `b`, and `c` with the required two-dimensional shapes. | The later linear-algebra cells use these values. |
| `Assignment1.ipynb` | Defined the Gaussian filters `k1` and `k2`. | Their outer product is the supplied 5 by 5 Gaussian kernel. |
| `linear_algebra.py` | Implemented `dot_product` with a transposed vector and `np.dot`. | This returns the scalar \(b^T c\). |
| `linear_algebra.py` | Implemented `matrix_mult`. | It calculates \((b^T c)(Ma^T)\) in the required shape. |
| `linear_algebra.py` | Implemented SVD and selection of the first `n` singular values. | NumPy already provides the required decomposition. |
| `image_manipulation.py` | Implemented image loading with `io.imread`. | It reads the supplied image path into a NumPy array. |
| `image_manipulation.py` | Implemented pixel-value conversion and greyscale conversion. | The first normalizes before applying \(0.5x^2\); the second uses scikit-image greyscale conversion. |
| `image_manipulation.py` | Implemented RGB channel removal and left/right image mixing. | These produce the requested channel-decomposed and mixed images. |
| `convolution.py` | Implemented `conv_naive` with four loops and a flipped kernel. | This follows the definition of convolution directly. |
| `convolution.py` | Implemented zero padding and `conv_fast` with two loops and array operations. | Padding keeps the input size; array multiplication and `np.sum` reduce the inner-loop work. |
| `.vscode/settings.json` | Selected the local Python environment and local Jupyter server. | VS Code can use the assignment environment automatically. |
| `.gitignore` | Excluded the local environment and Python cache files. | Generated local files should not be committed. |

No dependencies were added. The code only uses NumPy and scikit-image utilities already permitted by the assignment.
