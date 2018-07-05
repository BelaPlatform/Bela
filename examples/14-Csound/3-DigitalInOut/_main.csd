;------------------------------------------------------
; Digital In/Out - Audio through - Csound on Bela
; 	* Bernt I. Wærstad, Victor Lazzarini, Alex Hofmann
;
; This example uses a switch to turn a LED and audio on and off.
;
; - connect a switch to +3.3V on one side and other side to digital pin 0
; - connect a LED + a 10K Ohm resistor between GND and digital pin 1
;------------------------------------------------------

<CsoundSynthesizer>
<CsOptions>
-m0d
</CsOptions>
<CsInstruments>
ksmps = 8
nchnls = 2
0dbfs = 1


	instr 1
		aSine = poscil(0.5, 250)
		iSwitchPin = 0
		iLED_Pin = 1

		kSwitch digiInBela iSwitchPin
		digiOutBela kSwitch, iLED_Pin

		aOut = aSine * kSwitch

		outs aOut, aOut
	endin

</CsInstruments>
<CsScore>
i1 0 86400
</CsScore>
</CsoundSynthesizer>
