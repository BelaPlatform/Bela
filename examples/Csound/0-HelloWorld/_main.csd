;------------------------------------------------------
;  Hello World - Csound on Bela
; 	* Bernt I. Wærstad, Victor Lazzarini, Alex Hofmann
;
;
; This first example focusses on the different comment-types
; and shows a simple Csound example, which generates a "440Hz beep"
; sent to Bela's left audio output and prints "Hello World" to the
; console.
;
; To start it, press the RUN Button in the BELA-IDE.
; If you want to learn more about Csound visit:
; https://csound.com/get-started.html
;------------------------------------------------------


<CsoundSynthesizer>
<CsOptions>
</CsOptions>
<CsInstruments>

; This is a comment in Csound!
; Comments describe how things are done, and help to explain the code.
; Anything after a semicolon will be ignored by Csound.

/*
If you need more space than one line,
it's
no
problem, with those comment signs used here.
*/

instr 123 					        ; instr starts an instrument block and refers it to a number. In this case, it is 123.
							        			; You can put comments everywhere, they will not be compiled.
	prints "Hello World!%n" 	    ; 'prints' will print a string to the Csound console.
	aSin	oscils 0dbfs/4, 440, 0 	; the opcode 'oscils' here generates a 440 Hz sinetone signal at -12dB FS
	out aSin				        ; here the signal is assigned to the left audio output
endin

</CsInstruments>

; Instruments defined above are called in the score.
<CsScore>
i 123 0 100 						; the instrument is called by its number (123) to be played
e			 									; e - ends the score
</CsScore>
</CsoundSynthesizer>
