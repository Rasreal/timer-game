import numpy as np


def dot_product(vector1, vector2):
    """ Implement dot product of the two vectors.
    Args:
        vector1: numpy array of shape (n, 1)
        vector2: numpy array of shape (n, 1)

    Returns:
        out: scalar value
    """
    out = np.dot(vector1.T, vector2)[0, 0]
    #####################################
    #       START YOUR CODE HERE        #
    #####################################
    ######################################
    #        END OF YOUR CODE            #
    ######################################

    return out

def matrix_mult(M, vector1, vector2,vector3):
    """ Implement (vector2.T * vector3) * (M * vector1.T)
    Args:
        M: numpy matrix of shape (m, n)
        vector1: numpy array of shape (1, n)
        vector2: numpy array of shape (n, 1)
        vector3: numpy array of shape (n, 1)

    Returns:
        out: numpy matrix of shape (m, 1)
    """
    out = dot_product(vector2, vector3) * np.dot(M, vector1.T)
    #####################################
    #       START YOUR CODE HERE        #
    #####################################
    ######################################
    #        END OF YOUR CODE            #
    ######################################

    return out

def svd(matrix):
    """ Implement Singular Value Decomposition
    Args:
        matrix: numpy matrix of shape (m, n)

    Returns:
        u: numpy array of shape (m, m)
        s: numpy array of shape (k)
        v: numpy array of shape (n, n)
    """
    u, s, v = np.linalg.svd(matrix)
    #####################################
    #       START YOUR CODE HERE        #
    #####################################
    ######################################
    #        END OF YOUR CODE            #
    ######################################

    return u, s, v

def get_singular_values(matrix, n):
    """ Return top n singular values of matrix
    Args:
        matrix: numpy matrix of shape (m, w)
        n: number of singular values to output

    Returns:
        singular_values: array of shape (n)
    """
    u, s, v = svd(matrix)
    #####################################
    #       START YOUR CODE HERE        #
    #####################################
    singular_values = s[:n]
    ######################################
    #        END OF YOUR CODE            #
    ######################################
    return singular_values
