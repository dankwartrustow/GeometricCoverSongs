import numpy as np
import matplotlib.pyplot as plt
import sys
sys.path.append('../SequenceAlignment')
import _SequenceAlignment
import SequenceAlignment
import cv2

#Get a self-similarity matrix
def getSSM(x, DPixels, doPlot = False):
    D = np.sum(x**2, 1)[:, None]
    D = D + D.T - 2*x.dot(x.T)
    D[D < 0] = 0
    D = 0.5*(D + D.T)
    D = np.sqrt(D)
    if doPlot:
        plt.subplot(121)
        plt.imshow(D, interpolation = 'none')
        plt.subplot(122)
        plt.imshow(cv2.resize(D, (DPixels, DPixels)), interpolation = 'none')
        plt.show()
    if not (D.shape[0] == DPixels):
        return cv2.resize(D, (DPixels, DPixels))
    return D

#############################################################################
## Code for dealing with cross-similarity matrices
#############################################################################

def getCSM(X, Y):
    C = np.sum(X**2, 1)[:, None] + np.sum(Y**2, 1)[None, :] - 2*X.dot(Y.T)
    C[C < 0] = 0
    return np.sqrt(C)

#Turn a cross-similarity matrix into a binary cross-simlarity matrix
#If Kappa = 0, take all neighbors
#If Kappa < 1 it is the fraction of mutual neighbors to consider
#Otherwise Kappa is the number of mutual neighbors to consider
def CSMToBinary(D, Kappa):
    N = D.shape[0]
    M = D.shape[1]
    if Kappa == 0:
        return np.ones((N, M))
    elif Kappa < 1:
        NNeighbs = int(np.round(Kappa*M))
    else:
        NNeighbs = Kappa
    cols = np.argsort(D, 1)
    temp, rows = np.meshgrid(np.arange(M), np.arange(N))
    cols = cols[:, 0:NNeighbs].flatten()
    rows = rows[:, 0:NNeighbs].flatten()
    ret = np.zeros((N, M))
    ret[rows, cols] = 1
    return ret

#Take the binary AND between the nearest neighbors in one direction
#and the other
def CSMToBinaryMutual(D, Kappa):
    B1 = CSMToBinary(D, Kappa)
    B2 = CSMToBinary(D.T, Kappa)
    return B1*B2.T

#Helper fucntion for "runCovers80Experiment" that can be used for multiprocess
#computing of all of the smith waterman scores for a pair of self-similarity images
def getCSMSmithWatermanScores(args):
    [SSMs1, SSMs2, Kappa] = args
    DBinary = CSMToBinaryMutual(getCSM(SSMs1, SSMs2), Kappa)
    return _SequenceAlignment.swalignimpconstrained(DBinary)