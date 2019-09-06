;------------------------------------------------------
; Analog Out + Audio out - Csound on Bela
; 	* Bernt I. Wærstad, Victor Lazzarini, Alex Hofmann
;
; (Example does not work on Bela-Mini!)
; Connect a LED + a 10K Ohm resistor between GND
; and Analog OUT Pin 0 on your Bela Board.
;
; Starting this example, the LFO signal is used for
; an amplitude modulation of a sine generator (poscil)
; but also send to the AnalogOut of the Bela board, so
; the LED blinks in sync with the sound.
;------------------------------------------------------

<CsoundSynthesizer>
<CsOptions>
-m0d --daemon
</CsOptions>
<CsInstruments>
; Initialize the global variables.
sr = 44100
ksmps = 8
nchnls = 2
0dbfs = 1


instr 1

	; LFO
	kFreqLfo expseg 2, 5, 50, 2, 0.5
	aAmpMod lfo 0.8, kFreqLfo, 3

	; Sending LFO to Analog Out Pin 0
	chnset aAmpMod, "analogOut0"

	; Sound output
	aOut = poscil(0.5*aAmpMod, 400)
	outs aOut, aOut

endin


</CsInstruments>
<CsScore>
{ 100 TIMES
  i1 [7*$TIMES.] 7
}
</CsScore>
</CsoundSynthesizer>
