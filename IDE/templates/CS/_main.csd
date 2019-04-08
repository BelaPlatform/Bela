<CsoundSynthesizer>
<CsOptions>
-m0d
</CsOptions>
<CsInstruments>
ksmps = 8
nchnls = 2
0dbfs = 1

;------------------------------------------------------
;	Audio in/out and analoge in to control gain
;------------------------------------------------------

	instr 1
		aL, aR ins
		
		aGain chnget "analogIn0"
		kGain = k(aGain)
		
		outs aL * kGain,aR * kGain
	endin

;------------------------------------------------------
;	Digital in/out - use a switch to turn an LED 
;	on and off. See comments at bottom for wiring
;------------------------------------------------------
	
	instr 2
		iSwitchPin = 0
		iLED_Pin = 1
		
		kSwitch digiInBela iSwitchPin
		digiOutBela kSwitch, iLED_Pin
	endin

</CsInstruments>
<CsScore>
i1 0 86400
i2 0 86400
</CsScore>
</CsoundSynthesizer>
