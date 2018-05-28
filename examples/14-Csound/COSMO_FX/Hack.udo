/********************************************************

	Hack.csd
	Author: Alex Hofmann
	COSMO UDO adaptation: Bernt Isak Wærstad

	Arguments: Frequency, Dry/wet mix
    Defaults:  0.3, 0.5

	Frequency: 0.5Hz - 45Hz
	Dry/wet mix: 0% - 100%

	Description:
	A square wave amplitude modulator

********************************************************/

	; Default argument values
	#define Hack_frequency #0.3# 
	#define DryWet_Mix #0.5#

	; Toggle printing on/off
	#define PRINT #0#

	; Max and minimum values
	#define MAX_FREQ #45#
	#define MIN_FREQ #0.5#	

;*********************************************************************
; Hack - 1 in / 1 out
;*********************************************************************

opcode Hack, a, akk

	ain, kFreq, kDryWet  xin

	kFreq expcurve kFreq, 30
	kFreq scale kFreq, $MAX_FREQ, $MIN_FREQ

	kDryWet scale kDryWet, 1, 0

	if ($PRINT == 1) then
		Srev sprintfk "Hack freq: %fHz", kFreq
			puts Srev, kFreq

		Srev sprintfk "Hack Mix: %f", kDryWet
			puts Srev, kDryWet+1
	endif

	kFreq port kFreq, 0.1

	aMod lfo 1, kFreq, 3
	aMod butlp aMod, 300

	aHack = ain * (aMod)

	aOut ntrpol ain, aHack, kDryWet

	xout aOut

endop

;*********************************************************************
; Hack - 1 in / 2 out
;*********************************************************************

opcode Hack, aa, akk

	ain, kFreq, kDryWet  xin

	aOutL Hack ain, kFreq, kDryWet
	aOutR Hack ain, kFreq, kDryWet

	xout aOutL, aOutR

endop

;*********************************************************************
; Hack - 2 in / 2 out
;*********************************************************************

opcode Hack, aa, aakk

	ainL, ainR, kFreq, kDryWet  xin

	aOutL Hack ainL, kFreq, kDryWet
	aOutR Hack ainR, kFreq, kDryWet

	xout aOutL, aOutR

endop
