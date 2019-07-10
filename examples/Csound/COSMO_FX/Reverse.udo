/********************************************************

	Reverse.csd
	Author: Iain McCurdy
	COSMO UDO adaptation: Bernt Isak Wærstad

	Arguments: Reverse_time, Speed, Dry/wet mix
    Defaults:  0.1, 0, 0.5

	Reverse time: 0.1s - 3s
	Speed: 1x - 5x
	Dry/wet mix: 0% - 100%
	
	Description:
	A reverse effect

********************************************************/

	; Default argument values
	#define Reverse_time #0.1# 
	#define Speed #0#

	; Toggle printing on/off
	#define PRINT #0#

	; Max and minimum values
	#define MAX_TIME #3#
	#define MIN_TIME #0.1#	
	#define MAX_SPEED #5#
	#define MIN_SPEED #1#


;*********************************************************************
; Reverse - 1 in / 1 out
;*********************************************************************

opcode	Reverse, a, akkk			
	ain, ktime, kspeed, kDryWet	xin			;READ IN INPUT ARGUMENTS

	; ******************************
	; Controller value scalings
	; ******************************

	ktime scale ktime, $MAX_TIME, $MIN_TIME
	kspeed scale kspeed, $MAX_SPEED, $MIN_SPEED

	if $PRINT == 1 then
		Stime sprintfk "Reverse time: %dms", ktime
			puts Stime, ktime

		Speed sprintfk "Reverse speed: %dx", kspeed
			puts Speed, kspeed		
	endif

	ktime init $Reverse_time
	kspeed init $Speed

	ktrig1	changed	ktime			;IF ktime CONTROL IS MOVED GENERATE A MOMENTARY '1' IMPULSE
	ktrig2	changed kspeed 
	if ktrig1==1 || ktrig2==1 then				;IF A TRIGGER HAS BEEN GENERATED IN THE LINE ABOVE...
		reinit	UPDATE			;...BEGIN A REINITILISATION PASS FROM LABEL 'UPDATE'
	endif					;END OF CONDITIONAL BRANCH

	UPDATE:					;LABEL CALLED 'UPDATE'
	itime	=	i(ktime)		;CREATE AN I-TIME VERSION OF ktime
	ispeed  =	i(kspeed)
	aptr	phasor	(2/itime) * ispeed		;CREATE A MOVING PHASOR THAT WITH BE USED TO TAP THE DELAY BUFFER
	aptr	=	aptr*itime		;SCALE PHASOR ACCORDING TO THE LENGTH OF THE DELAY TIME CHOSEN BY THE USER
	ienv	ftgentmp	0,0,1024,7,0,(1024*0.01),1,(1024*0.98),1,(0.01*1024),0	;ANTI-CLICK ENVELOPE SHAPE
 	aenv	poscil	1, (2/itime)*ispeed, ienv	;CREATE A CYCLING AMPLITUDE ENVELOPE THAT WILL SYNC TO THE TAP DELAY TIME PHASOR
 	abuffer	delayr	5			;CREATE A DELAY BUFFER
	atap	deltap3	aptr			;READ AUDIO FROM A TAP WITHIN THE DELAY BUFFER
		delayw	ain			;WRITE AUDIO INTO DELAY BUFFER
	rireturn				;RETURN FROM REINITIALISATION PASS
	aRev = atap*aenv			;SEND AUDIO BACK TO CALLER INSTRUMENT. APPLY AMPLITUDE ENVELOPE TO PREVENT CLICKS.
	
	aOut ntrpol ain, aRev, kDryWet
	
	xout aOut

endop

;*********************************************************************
; Reverse - 1 in / 2 out
;*********************************************************************

opcode	Reverse, aa, akkk				
	ain, ktime, kspeed, kDryWet	xin			;READ IN INPUT ARGUMENTS	

	aOutL Reverse ain, ktime, kspeed, kDryWet
	aOutR Reverse ain, ktime, kspeed, kDryWet

	xout aOutL, aOutR
endop

;*********************************************************************
; Reverse - 2 in / 2 out
;*********************************************************************

opcode	Reverse, aa, aakkk				
	ainL, ainR, ktime, kspeed, kDryWet	xin			

	aOutL Reverse ainL, ktime, kspeed, kDryWet
	aOutR Reverse ainR, ktime, kspeed, kDryWet

	xout aOutL, aOutR
endop
