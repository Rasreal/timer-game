#credit: Juan Carlos Niebles and Ranjay Krishna

import numpy as np

def conv_naive(image, kernel):
    """A naive implementation of convolution filter.

    This is a naive implementation of convolution using 4 nested for-loops.
    This function computes convolution of an image with a kernel and outputs
    the result that has the same shape as the input image.

    Args:
        image: numpy array of shape (Hi, Wi)
        kernel: numpy array of shape (Hk, Wk)

    Returns:
        out: numpy array of shape (Hi, Wi)
    """
    Hi, Wi = image.shape
    Hk, Wk = kernel.shape
    out = np.zeros((Hi, Wi))

    #####################################
    #       START YOUR CODE HERE        #
    #####################################
    pad_h = Hk // 2
    pad_w = Wk // 2
    padded_img = zero_pad(image, pad_h, pad_w)
    flipped_kernel = np.flip(kernel)
    for row in range(Hi):
        for col in range(Wi):
            for k_row in range(Hk):
                for k_col in range(Wk):
                    out[row, col] += padded_img[row + k_row, col + k_col] * flipped_kernel[k_row, k_col]
    ######################################
    #        END OF YOUR CODE            #
    ######################################

    return out

def zero_pad(image, pad_height, pad_width):
    """ Zero-pad an image.

    Example: a 1x1 image [[1]] with pad_height = 1, pad_width = 2 becomes:

        [[0, 0, 0, 0, 0],
         [0, 0, 1, 0, 0],
         [0, 0, 0, 0, 0]]         of shape (3, 5)

    Args:
        image: numpy array of shape (H, W)
        pad_width: width of the zero padding (left and right padding)
        pad_height: height of the zero padding (bottom and top padding)

    Returns:
        out: numpy array of shape (H+2*pad_height, W+2*pad_width)
    """

    H, W = image.shape
    out = np.zeros((H + 2 * pad_height, W + 2 * pad_width))

    #####################################
    #       START YOUR CODE HERE        #
    #####################################
    out[pad_height:pad_height + H, pad_width:pad_width + W] = image
    ######################################
    #        END OF YOUR CODE            #
    ######################################
    return out


def conv_fast(image, kernel):
    """ An efficient implementation of convolution filter.

    This function uses element-wise multiplication and np.sum()
    to efficiently compute weighted sum of neighborhood at each
    pixel.

    Hints:
        - Use the zero_pad function you implemented above
        - There should be two nested for-loops
        - You may find np.flip() and np.sum() useful

    Args:
        image: numpy array of shape (Hi, Wi)
        kernel: numpy array of shape (Hk, Wk)

    Returns:
        out: numpy array of shape (Hi, Wi)
    """
    Hi, Wi = image.shape
    Hk, Wk = kernel.shape
    out = np.zeros((Hi, Wi))

    #####################################
    #       START YOUR CODE HERE        #
    #####################################
    pad_h = Hk // 2
    pad_w = Wk // 2
    padded_img = zero_pad(image, pad_h, pad_w)
    flipped_kernel = np.flip(kernel)
    for row in range(Hi):
        for col in range(Wi):
            window = padded_img[row:row + Hk, col:col + Wk]
            out[row, col] = np.sum(window * flipped_kernel)
    ######################################
    #        END OF YOUR CODE            #
    ######################################

    return out
