# %% import scipy.signal as sig
import matplotlib.pyplot as plt
import numpy as np
import scipy.signal as sig
import os

fs = 1                                 # samplerate
ripple = {"high": 80, "low": 60}       # stopband attenuation and passband ripple
cutoff_ny = {"high": 0.9, "low": 0.7}  # cutoff relative to nyquist

fname = f"aa_fir.h"
try:
    os.remove(fname)
except FileNotFoundError:
    pass
file = open(fname, "a")

file.write("#include <vector>\n\n")

for down in [2, 4, 8, 16]:
    for quality in ripple:
        nyquist_resampled = fs/down/2            # new nyquist
        cutoff = 0.5/down * cutoff_ny[quality]   # filter cutoff
        width = (nyquist_resampled - cutoff)*2   # filter transition bandwidth

        # design kaiser such that stopband starts at nyquist
        numtaps, beta = sig.kaiserord(ripple[quality], width/(0.5*fs))
        taps = sig.firwin(numtaps, cutoff, window=('kaiser', beta), fs=fs)
        tapsmin = sig.minimum_phase(taps)

        w, h = sig.freqz(taps, worN=8000)
        w, hmin = sig.freqz(taps, worN=8000)

        f = w * 0.5*fs/np.pi  # Convert w to Hz.

        plt.figure(1)
        plt.plot(f, 20*np.log10(np.abs(h)))
        plt.plot(f, 20*np.log10(np.abs(hmin)))

        plt.vlines(cutoff, -129, 0)
        plt.vlines(cutoff+width/2, -129, 0)
        plt.vlines(cutoff-width/2, -129, 0)
        plt.vlines(nyquist_resampled, -129, 0)

        plt.figure(2)
        plt.plot(taps)
        plt.plot(tapsmin)

        plt.figure(3)
        plt.plot(f, 20*np.log10(np.abs(h)))
        plt.plot(f, 20*np.log10(np.abs(hmin)))
        plt.ylim(-10, 2)

        file.write(f"// cutoff:  {cutoff} * sr\n")
        file.write(f"// numTaps: {len(tapsmin)}\n")
        file.write(f"// ripple:  {ripple[quality]}\n")
        file.write(f"// phase: minimum\n")
        file.write(f"std::vector<float> fir_{down}_{quality}_minphase = "+"{\n")
        for tap in tapsmin[:-1]:
            file.write(f"\t{tap:.16e},\n")
        file.write(f"\t{tapsmin[-1]:.16e}" + '\n};\n\n')

        file.write(f"// cutoff:  {cutoff} * sr\n")
        file.write(f"// numTaps: {numtaps}\n")
        file.write(f"// ripple:  {ripple[quality]}\n")
        file.write(f"// phase:   linear\n")
        file.write(f"std::vector<float> fir_{down}_{quality}_linear = "+"{\n")
        for tap in taps[:-1]:
            file.write(f"\t{tap:.16e},\n")
        file.write(f"\t{taps[-1]:.16e}" + '\n};\n\n')

file.close()
plt.show()
