;------------------------------------------------------
; MIDI In - Csound on Bela
; 	* Bernt I. Wærstad, Victor Lazzarini, Alex Hofmann
;
; NB! This example requires a MIDI-device to be connected 
; to your Bela!! Preferably a MIDI-keyboard.
;
; Playing MIDI-Notes on MIDI-Channel 1 triggers the 
; synth setup as instrument 1.
;------------------------------------------------------

<CsoundSynthesizer>
<CsOptions>
-Mhw:1,0,0 -+rtmidi=NULL --daemon
</CsOptions>
<CsInstruments>

; Initialize global variables.
sr = 44100
ksmps = 8
nchnls = 2
0dbfs = 1

seed 0 ; init random function
maxalloc 1, 4 ; restrict to maximum 4 voices

;------------------------------------------------------
; Instrument will be played by MIDI notes on Channel 1
;------------------------------------------------------
instr 1
	iFreq cpsmidi
	iAmp ampmidi 0.3

	; Three detuned sawtooth oscillators
	aOut1 = vco2(iAmp, iFreq)
	aOut2 = vco2(iAmp, iFreq*1.004)
	aOut3 = vco2(iAmp, iFreq*0.995)

	; Envelope
	aOut = aOut1 + aOut2*0.5 + aOut3*0.5
	aEnv linsegr 0, 0.01, 0.1, 0.2, 0

	; Filter LFO and envelope
	kLFO = lfo(50, 1.2, 0)
	aFiltEnv linsegr 100, 1.2, 1000, 0.2, 0

	; Korg35 resonant low-pass filter
	aOut = K35_lpf(aOut, aFiltEnv+kLFO, 9.4, 0, 1) 

	; Voice panning
	iPan random 0.2, 0.8;
	aOutL, aOutR pan2 aOut, iPan

	; Output
	outs aOutL*aEnv, aOutR*aEnv
endin


</CsInstruments>
<CsScore>
</CsScore>
</CsoundSynthesizer>


