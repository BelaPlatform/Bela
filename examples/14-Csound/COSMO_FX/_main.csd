;------------------------------------------------------
; Effect processing using COSMO DSP - Csound on Bela
; 	* Bernt I. Wærstad, Victor Lazzarini, Alex Hofmann
;
; This example shows how you quickly can set up effects
; processing using readymade modular DSP effects from the
; COSMO DSP library: http://github.com/cosmoproject/cosmo-dsp
;
; - connect 3x10K pots to 3.3V and GND on its 1st and 3rd pins
; - connect the 2nd middle pin of the pots to analogIn 0, 1 and 2.
; - connect a switch to 3.3V on one side and digital pin 0 on the other
;
; The 3 pots will control the hack (square AM) frequency (pot1),
; mix of reverse effect (pot2) and the cutoff of a resonant
; lowpass filter (pot3)
;
; The switch will turn on and off the hack effect
;
; NOTE! All control arguments in the COSMO DSP-library
; have normalized inputs (0-1) and are scaled internally.
;
; Find more infos under: http://cosmoproject.github.io/dsp/
;------------------------------------------------------

<CsoundSynthesizer>
<CsOptions>
-m0d
</CsOptions>
<CsInstruments>
ksmps = 8
nchnls = 2
0dbfs = 1

; Include the readmade effects from COSMO DSP-library

#include "Hack.udo"
#include "Reverse.udo"
#include "Lowpass.udo"

	instr 1
		aL, aR ins

		/*********************************
		Hack effect
		Arguments: Frequency, Dry/wet mix

    	Scaled values:
		Frequency: 0.5Hz - 45Hz
		Dry/wet mix: 0% - 100%
		*********************************/

		; Use digital pin 0 to toggle Hack effect
		kHackOnOff digiInBela 0

		; Use analog input 0 to control Hack frequency
		aHackFreq chnget "analogIn0"
		kHackFreq = k(aHackFreq)

		aL, aR Hack aL, aR, kHackFreq, kHackOnOff

		/*********************************
		Reverse effect
		Arguments: Reverse_time, Speed, Dry/wet mix

		Scaled values:
		Reverse time: 0.1s - 3s
		Speed: 1x - 5x
		Dry/wet mix: 0% - 100%
		*********************************/

		; Use analog input 1 to control Reverse mix
		aReverseMix chnget "analogIn1"
		kReverseMix = k(aReverseMix)

		aL, aR Reverse aL, aR, 0.5, 0, kReverseMix

		/*********************************
		Resonant lowpass filter
		Arguments: Cutoff frequency, Resonance, Distortion

		Scaled values:
		Cutoff frequency: 30Hz - 20000Hz
		Resonance: 0 - 1.25
		Distortion: 0 - 1
		Mode:
			0: lpf18
			1: moogladder
			2: k35
			3: zdf
		*********************************/

		; Use analog input 2 to control Lowpass filter cutoff
		aLP_cutoff chnget "analogIn2"
		kLP_cutoff = k(aLP_cutoff)

		aL, aR Lowpass aL, aR, kLP_cutoff, 0.75, 0.5, 3

		outs aL, aR
	endin

</CsInstruments>
<CsScore>
i1 0 86400
</CsScore>
</CsoundSynthesizer>
