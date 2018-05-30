
/********************************************************

	Lowpass.udo
	Author: Bernt Isak Wærstad

	Arguments: Cutoff frequency, Resonance, Distortion
    Defaults:  0.8, 0.3, 0

	Cutoff frequency: 30Hz - 12000Hz
	Resonance: 0 - 0.9
	Distortion: 0 - 0.9
	Mode:
		0: lpf18 
		1: moogladder
		2: k35
		3: zdf

	Description:
	A resonant lowpass filter (some with distortion)

********************************************************/

	; Default argument values
	#define Cutoff_frequency #0.8# 
	#define Resonance #0.3#
	#define Distortion #0#

	; Toggle printing on/off
	#define PRINT #0#

	; Max and minimum values
	#define MAX_FREQ #20000#
	#define MIN_FREQ #30#	
	#define MAX_RESO #1.25#
	#define MAX_DIST #1#


;*********************************************************************
; Lowpass - 1 in / 1 out
;*********************************************************************

opcode Lowpass, a, akkkk
	ain, kfco, kres, kdist, kmode xin


	; ******************************
	; LPF18
	; ******************************

	if kmode == 0 then 
	  	; ******************************
	  	; Controller value scalings
	  	; ******************************

		kfco expcurve kfco, 30
		kfco scale kfco, $MAX_FREQ, $MIN_FREQ
		kdist scale kdist, $MAX_DIST, 0
		kres scale kres, $MAX_RESO, 0

		if $PRINT == 1 then 
			Srev sprintfk "LPF Cutoff: %f", kfco
				puts Srev, kfco

			Sres sprintfk "LPF Reso: %f", kres
				puts Sres, kres

			Sdist sprintfk "LPF Dist: %f", kdist
				puts Sdist, kdist
		endif

		kfco port kfco, 0.1
		kres port kres, 0.01
		kdist port kdist, 0.01

		aout lpf18 ain, kfco, kres, kdist
	
	; ******************************
	; Moogladder
	; ******************************

	elseif kmode == 1 then

		; ******************************
	  	; Controller value scalings
	  	; ******************************

		kfco expcurve kfco, 30
		kfco scale kfco, $MAX_FREQ, $MIN_FREQ
		if $PRINT == 1 then 
			Srev sprintfk "LPF Cutoff: %f", kfco
				puts Srev, kfco
		endif
		kfco port kfco, 0.1

		kres scale kres, $MAX_RESO, 0
		if $PRINT == 1 then 
			Srev sprintfk "LPF Reso: %f", kres
				puts Srev, kres
		endif
		kres port kres, 0.01

		kdist scale kdist, $MAX_DIST, 0
		if $PRINT == 1 then 
			Srev sprintfk "LPF Dist: %f", kdist
				puts Srev, kdist
		endif
		kdist port kdist, 0.01

		aout moogladder ain, kfco, kres
		; Add some distortion ??

	; ******************************
	; k35
	; ******************************

	elseif kmode == 2 then

		; ******************************
	  	; Controller value scalings
	  	; ******************************


		kfco expcurve kfco, 30
		kfco scale kfco, $MAX_FREQ, $MIN_FREQ
		if $PRINT == 1 then 
			Srev sprintfk "LPF Cutoff: %f", kfco
				puts Srev, kfco
		endif
		kfco port kfco, 0.1

		kres scale kres, $MAX_RESO, 0
		if $PRINT == 1 then 
			Srev sprintfk "LPF Reso: %f", kres
				puts Srev, kres
		endif
		kres port kres, 0.01
/*
		kdist scale kdist, $MAX_DIST, 0
		if $PRINT == 1 then 
			Srev sprintfk "LPF Dist: %f", kdist
				puts Srev, kdist
		endif
		kdist port kdist, 0.01
*/

		; k35 apparently not in Csound yet - using tone instead for now 

		; They're called k35_something based on the type you want

		aout tone ain, kfco
		;aout k35 ain, kfco, kres
		; Add some distortion ??


	; ******************************
	; ZDF
	; ******************************

	elseif kmode == 3 then

		; ******************************
	  	; Controller value scalings
	  	; ******************************

		kfco expcurve kfco, 30
		kfco scale kfco, $MAX_FREQ, $MIN_FREQ
		if $PRINT == 1 then 
			Srev sprintfk "LPF Cutoff: %f", kfco
				puts Srev, kfco
		endif
		kfco port kfco, 0.1

		kres scale kres, $MAX_RESO, 0
		if $PRINT == 1 then 
			Srev sprintfk "LPF Reso: %f", kres
				puts Srev, kres
		endif
		kres port kres, 0.01
/*
		kdist scale kdist, $MAX_DIST, 0
		if $PRINT == 1 then 
			Srev sprintfk "LPF Dist: %f", kdist
				puts Srev, kdist
		endif
		kdist port kdist, 0.01
*/

		aout zdf_2pole ain, kfco, kres
		; Add some distortion ??

	endif

	xout aout
endop


;*********************************************************************
; Lowpass - 1 in / 2 out
;*********************************************************************

opcode Lowpass, aa, akkkk
	ain, kfco, kres, kdist, kmode xin

	aoutL Lowpass ain, kfco, kres, kdist, kmode
	aoutR Lowpass ain, kfco, kres, kdist, kmode

	xout aoutL, aoutR
endop


;*********************************************************************
; Lowpass - 2 in / 2 out
;*********************************************************************

opcode Lowpass, aa, aakkkk
	ainL, ainR, kfco, kres, kdist, kmode xin

	aoutL Lowpass ainL, kfco, kres, kdist, kmode
	aoutR Lowpass ainR, kfco, kres, kdist, kmode

	xout aoutL, aoutR
endop


