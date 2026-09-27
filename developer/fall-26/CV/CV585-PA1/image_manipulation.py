#credit: Juan Carlos Niebles and Ranjay Krishna

import numpy as np
from skimage import color
from skimage import io

def load(image_path):
    """ Loads an image from a file path

    Args:
        image_path: file path to the image

    Returns:
        out: numpy array of shape(image_height, image_width, 3)
    """
    out = io.imread(image_path)

    #####################################
    #       START YOUR CODE HERE        #
    #####################################
    ######################################
    #        END OF YOUR CODE            #
    ######################################

    return out


def change_value(image):
    """ Change the value of every pixel by following x_n = 0.5*x_p^2
        where x_n is the new value and x_p is the original value

    Args:
        image: numpy array of shape(image_height, image_width, 3)

    Returns:
        out: numpy array of shape(image_height, image_width, 3)
    """

    out = 0.5 * (image / 255.0) ** 2

    #####################################
    #       START YOUR CODE HERE        #
    #####################################
    ######################################
    #        END OF YOUR CODE            #
    ######################################

    return out


def convert_to_grey_scale(image):
    """ Change image to gray scale

    Args:
        image: numpy array of shape(image_height, image_width, 3)

    Returns:
        out: numpy array of shape(image_height, image_width)
    """
    out = color.rgb2gray(image)

    #####################################
    #       START YOUR CODE HERE        #
    #####################################
    ######################################
    #        END OF YOUR CODE            #
    ######################################

    return out

def rgb_decomposition(image, channel):
    """ Return image with the rgb channel specified
    Args:
        image: numpy array of shape(image_height, image_width, 3)
        channel: string specifying the channel
    Returns:
        out: numpy array of shape(image_height, image_width, 3)
    """
    out = image.copy()
    #####################################
    #       START YOUR CODE HERE        #
    #####################################
    if channel == 'R':
        out[:, :, 0] = 0
    elif channel == 'G':
        out[:, :, 1] = 0
    elif channel == 'B':
        out[:, :, 2] = 0
    ######################################
    #        END OF YOUR CODE            #
    ######################################

    return out

def mix_images(image1, image2, channel1, channel2):
    """ Return image which is the left of image1 and right of image 2 excluding
    the specified channels for each image
    Args:
        image1: numpy array of shape(image_height, image_width, 3)
        image2: numpy array of shape(image_height, image_width, 3)
        channel1: string specifying channel used for image1
        channel2: string specifying channel used for image2
    Returns:
        out: numpy array of shape(image_height, image_width, 3)
    """

    out = np.zeros(image1.shape, dtype=image1.dtype)
    #####################################
    #       START YOUR CODE HERE        #
    #####################################
    left_img = rgb_decomposition(image1, channel1)
    right_img = rgb_decomposition(image2, channel2)
    middle = image1.shape[1] // 2
    out[:, :middle, :] = left_img[:, :middle, :]
    out[:, middle:, :] = right_img[:, middle:, :]
    ######################################
    #        END OF YOUR CODE            #
    ######################################

    return out
