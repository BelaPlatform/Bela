;------------------------------------------------------
; Analog In + Simple AM synth - Csound on Bela
; 	* Bernt I. Wærstad, Victor Lazzarini, Alex Hofmann
;
; This example produces a sine tone with amplitude 
; modulation. 
;
; - connect 3x10K pots to 3.3V and GND on its 1st and 3rd pins
; - connect the 2nd middle pin of the pots to analogIn 0, 1 and 2.
;
; The 3 pots will control the carrier frequency (pot1), 
; the modulation frequency (pot2) and the modulation amount (pot3)
; 
; Optionally, connect a LED + a 10K Ohm resistor between GND
; and Analog OUT Pin 0 on your Bela Board to get the LED
; to pulsate at the same rate as the modulation frequency 
;------------------------------------------------------

<CsoundSynthesizer>
<CsOptions>
-m0d
</CsOptions>
<CsInstruments>
ksmps = 8
nchnls = 2
0dbfs = 1

;------------------------------------------------------
;  	Simple AM synth with analoge in and out
;	See comment below for wiring
;------------------------------------------------------

	instr 1

		; Analog in 0 controls carrier frequency
		aCarFreq chnget "analogIn0"
		aCarFreq = (aCarFreq * 1000) + 50
		kCarFreq = k(aCarFreq)

		; Analog in 1 controls modulator frequency
		aModFreq chnget "analogIn1"
		aModFreq *= 100
		kModFreq = k(aModFreq)

		; Analog in 2 controls modulator amount
		aAM_vol init 1
		aAM_vol chnget "analogIn2"
		

		; Modulator
		aMod oscil aAM_vol*0.5, kModFreq
		aMod += 0.5

		; Carrier with envelope
		kEnv adsr 0.1, 0, 0.8, 0.3
		aCar poscil 0.8*kEnv, kCarFreq
		aOut = aCar * aMod

		; Set LED to blink in time
		; with modulation frequency
		
		chnset aMod, "analogOut0"

		outs aOut, aOut
		
	endin

</CsInstruments>
<CsScore>
i1 0 86400
</CsScore>
</CsoundSynthesizer>
