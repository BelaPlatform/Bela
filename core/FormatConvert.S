@
@ FormatConvert.S
@
@ NEON-based vector functions for converting data between int
@ and float with clipping and optional level scaling. 
@ Written in assembly for performance reasons.
@
@ Bela: http://bela.io
@
@ (c) 2016 Andrew McPherson
@ Centre for Digital Music
@ Queen Mary University of London
@

	.syntax unified
	.arch armv7-a
	.fpu neon

@	void int16_to_float_audio(int numSamples, int16_t *inBuffer, float *outBuffer);
@
@	Convert 16-bit signed ints to floats between -1.0 and 1.0. Used for audio input.
@
@	numSamples should be a multiple of 4 (i.e. with stereo audio, frames should be even)
@	inBuffer should be aligned on an 8-byte boundary.
@ 	outBuffer should be aligned on a 16-byte boundary.

@ Registers:
@    r0: numSamples            How many frames to convert
@    r1: inBuffer              Buffer for input samples from ADC
@    r2: outBuffer             Buffer to store output samples for render function

dIFAu_Input		.dn		D0.S16
qIFAu_Expanded	.qn		Q1.S32
qIFAu_Output	.qn		Q2.F32
dIFAu_Output_0	.dn		D4.F32
dIFAu_Output_1	.dn		D5.F32

	.align	2
	.global	int16_to_float_audio
	.thumb
	.thumb_func
	.type	int16_to_float_audio, %function
int16_to_float_audio:
	lsr r0, r0, #2
	lsl r0, r0, #2				@ Clip off the last two bits of numSamples (only multiples of 4 allowed)
	cmp r0, #0					@ Check for trivial case: zero samples
	it eq
	bxeq lr						@ Return if that's the case

	@ ---- loop: iterate over the number of samples ----
int16_to_float_audio_loop:
	vld1 {dIFAu_Input}, [r1]!						@ Load four 16-bit signed ints from inBuffer++
	vmovl qIFAu_Expanded, dIFAu_Input				@ Convert four 16-bit signed ints to 32-bit signed ints
	vcvt qIFAu_Output, qIFAu_Expanded, #15			@ Convert four Q17.15 fixed points to floats (equiv. to / 32768)
	vst1 {dIFAu_Output_0, dIFAu_Output_1}, [r2]!	@ Store floats back into memory

	subs r0, r0, #4							@ numSamples -= 4
	it gt
	bgt int16_to_float_audio_loop			@ Loop if numSamples > 0

	bx lr
	


@	void int16_to_float_analog(int numSamples, uint16_t *inBuffer, float *outBuffer);
@
@	Convert 16-bit unsigned ints to floats between 0.0 and 1.0. Used for analog input.
@
@	numSamples should be a multiple of 4 (i.e. integer numFrames at 4 channels)
@	inBuffer should be aligned on an 8-byte boundary.
@ 	outBuffer should be aligned on a 16-byte boundary.

@ Registers:
@    r0: numSamples            How many frames to convert
@    r1: inBuffer              Buffer for input samples from ADC
@    r2: outBuffer             Buffer to store output samples for render function

dIFAn_Input_0	.dn		D0.U16
dIFAn_Input_1	.dn		D1.U16
qIFAn_Expanded_0 .qn	Q1.U32
qIFAn_Expanded_1 .qn	Q2.U32
qIFAn_Output_0	.qn		Q3.F32
qIFAn_Output_1	.qn		Q4.F32
dIFAn_Output_0	.dn		D6.F32
dIFAn_Output_1	.dn		D7.F32
dIFAn_Output_2	.dn		D8.F32
dIFAn_Output_3	.dn		D9.F32

	.align	2
	.global	int16_to_float_analog
	.thumb
	.thumb_func
	.type	int16_to_float_analog, %function
int16_to_float_analog:
	lsr r0, r0, #3
	lsl r0, r0, #3				@ Clip off the last three bits of numSamples (only multiples of 8 allowed)
	cmp r0, #0					@ Check for trivial case: zero samples
	it eq
	bxeq lr						@ Return if that's the case

	@ ---- loop: iterate over the number of samples ----
int16_to_float_analog_loop:
	vld1 {dIFAn_Input_0, dIFAn_Input_1}, [r1]!			@ Load eight 16-bit signed ints from inBuffer++
	vmovl qIFAn_Expanded_0, dIFAn_Input_0				@ Convert eight 16-bit signed ints to 32-bit signed ints
	vmovl qIFAn_Expanded_1, dIFAn_Input_1				@ Convert eight 16-bit signed ints to 32-bit signed ints
	vcvt qIFAn_Output_0, qIFAn_Expanded_0, #16			@ Convert eight Q16.16 fixed points to floats (equiv. to / 65536)
	vcvt qIFAn_Output_1, qIFAn_Expanded_1, #16			@ Convert eight Q16.16 fixed points to floats (equiv. to / 65536)
	vst1 {dIFAn_Output_0, dIFAn_Output_1, dIFAn_Output_2, dIFAn_Output_3}, [r2]!	@ Store floats back into memory

	subs r0, r0, #8							@ numSamples -= 8
	it gt
	bgt int16_to_float_analog_loop			@ Loop if numSamples > 0

	bx lr
	
dIFAn_Input		.dn		D0.U16
qIFAn_Expanded	.qn		Q1.U32
qIFAn_Output	.qn		Q2.F32
dIFAn_Output_d0	.dn		D4.F32
dIFAn_Output_d1	.dn		D5.F32


// Andrew's original implementation
	.align	2
	.global	int16_to_float_analog_andrew
	.thumb
	.thumb_func
	.type	int16_to_float_analog_andrew, %function
int16_to_float_analog_andrew:
	lsr r0, r0, #2
	lsl r0, r0, #2				@ Clip off the last two bits of numSamples (only multiples of 4 allowed)
	cmp r0, #0					@ Check for trivial case: zero samples
	it eq
	bxeq lr						@ Return if that's the case

	@ ---- loop: iterate over the number of samples ----
int16_to_float_analog_loop_andrew:
	vld1 {dIFAn_Input}, [r1]!						@ Load four 16-bit signed ints from inBuffer++
	vmovl qIFAn_Expanded, dIFAn_Input				@ Convert four 16-bit signed ints to 32-bit signed ints
	vcvt qIFAn_Output, qIFAn_Expanded, #16			@ Convert four Q16.16 fixed points to floats (equiv. to / 65536)
	vst1 {dIFAn_Output_d0, dIFAn_Output_d1}, [r2]!	@ Store floats back into memory

	subs r0, r0, #4							@ numSamples -= 4
	it gt
	bgt int16_to_float_analog_loop_andrew			@ Loop if numSamples > 0

	bx lr

@	void float_to_int16_audio(int numSamples, float *inBuffer, int16_t *outBuffer);
@
@	Convert floats between -1.0 and 1.0 to 16-bit signed ints, with saturation.
@	Used for audio output.
@
@	numSamples should be a multiple of 4 (i.e. with stereo audio, frames should be even)
@	inBuffer should be aligned on a 16-byte boundary.
@ 	outBuffer should be aligned on an 8-byte boundary.

@ Registers:
@    r0: numSamples            How many frames to convert
@    r1: inBuffer              Buffer for input samples from render function
@    r2: outBuffer             Buffer to store output samples for DAC

qFIAu_Input		.qn		Q0.F32
dFIAu_Input_0	.dn		D0.F32
dFIAu_Input_1,	.dn		D1.F32
qFIAu_Converted	.qn		Q1.S32
dFIAu_Narrowed	.dn		D4.S16	

	.align	2
	.global	float_to_int16_audio
	.thumb
	.thumb_func
	.type	float_to_int16_audio, %function
	
float_to_int16_audio:
	lsr r0, r0, #2
	lsl r0, r0, #2				@ Clip off the last two bits of numSamples (only multiples of 4 allowed)
	cmp r0, #0					@ Check for trivial case: zero samples
	it eq
	bxeq lr						@ Return if that's the case

	@ ---- loop: iterate over the number of samples ----
float_to_int16_audio_loop:
	vld1 {dFIAu_Input_0, dFIAu_Input_1}, [r1]!		@ Load four floats from inBuffer++
	vcvt qFIAu_Converted, qFIAu_Input, #15			@ Convert four floats into four Q17.15 fixed points (equiv. to * 32768)
													@ This will truncate the result to a 32-bit representable value
	vqmovn dFIAu_Narrowed, qFIAu_Converted			@ Convert four 32-bit signed ints to 16-bit signed ints, with saturation
	vst1 {dFIAu_Narrowed}, [r2]!					@ Store ints back into memory

	subs r0, r0, #4							@ numSamples -= 4
	it gt
	bgt float_to_int16_audio_loop			@ Loop if numSamples > 0

	bx lr
	

@	void float_to_int16_analog(int numSamples, float *inBuffer, uint16_t *outBuffer);
@
@	Convert floats between 0.0 and 1.0 to 16-bit unsigned ints, with saturation.
@	Used for analog output.
@
@	numSamples should be a multiple of 4 (i.e. with stereo audio, frames should be even)
@	inBuffer should be aligned on a 16-byte boundary.
@ 	outBuffer should be aligned on an 8-byte boundary.

@ Registers:
@    r0: numSamples            How many frames to convert
@    r1: inBuffer              Buffer for input samples from render function
@    r2: outBuffer             Buffer to store output samples for DAC

qFIAn_Input_Q1	.qn		Q0.F32
qFIAn_Input_Q2	.qn		Q1.F32
dFIAn_Input_0,	.dn		D0.F32
dFIAn_Input_1,	.dn		D1.F32
dFIAn_Input_2,	.dn		D2.F32
dFIAn_Input_3,	.dn		D3.F32
qFIAn_Converted_1 .qn	Q3.U32
qFIAn_Converted_2 .qn	Q4.U32
dFIAn_Narrowed_1 .dn	D10.U16
dFIAn_Narrowed_2 .dn	D11.U16

	.align	2
	.global	float_to_int16_analog
	.thumb
	.thumb_func
	.type	float_to_int16_analog, %function
	
float_to_int16_analog:
	lsr r0, r0, #3
	lsl r0, r0, #3				@ Clip off the last three bits of numSamples (only multiples of 8 allowed)
	cmp r0, #0					@ Check for trivial case: zero samples
	it eq
	bxeq lr						@ Return if that's the case
	@ ---- loop: iterate over the number of samples ----
float_to_int16_analog_loop:
	vld1 {dFIAn_Input_0, dFIAn_Input_1, dFIAn_Input_2, dFIAn_Input_3}, [r1]!		@ Load eight floats from inBuffer++
	vcvt qFIAn_Converted_1, qFIAn_Input_Q1, #16			@ Convert four floats into four Q16.16 fixed points (equiv. to * 65536)
	vcvt qFIAn_Converted_2, qFIAn_Input_Q2, #16			@ Convert four floats into four Q16.16 fixed points (equiv. to * 65536)
														@ This will truncate the result to a 32-bit representable value
	vqmovn dFIAn_Narrowed_1, qFIAn_Converted_1			@ Convert four 32-bit unsigned ints to 16-bit unsigned ints, with saturation
	vqmovn dFIAn_Narrowed_2, qFIAn_Converted_2			@ Convert four 32-bit unsigned ints to 16-bit unsigned ints, with saturation

	subs r0, r0, #8						@ numSamples -= 8
	vst1 {dFIAn_Narrowed_1, dFIAn_Narrowed_2}, [r2]!					@ Store ints back into memory

	it gt
	bgt float_to_int16_analog_loop			@ Loop if numSamples > 0

	bx lr




qFIAn_Input		.qn		Q0.F32
dFIAn_Input_0	.dn		D0.F32
dFIAn_Input_1,	.dn		D1.F32
qFIAn_Converted	.qn		Q1.U32
dFIAn_Narrowed	.dn		D4.U16	

	.align	2
	.global	float_to_int16_analog_andrew
	.thumb
	.thumb_func
	.type	float_to_int16_analog_andrew, %function
	
float_to_int16_analog_andrew:
	lsr r0, r0, #2
	lsl r0, r0, #2				@ Clip off the last two bits of numSamples (only multiples of 4 allowed)
	cmp r0, #0					@ Check for trivial case: zero samples
	it eq
	bxeq lr						@ Return if that's the case

	@ ---- loop: iterate over the number of samples ----
float_to_int16_analog_loop_andrew:
	vld1 {dFIAn_Input_0, dFIAn_Input_1}, [r1]!		@ Load four floats from inBuffer++
	vcvt qFIAn_Converted, qFIAn_Input, #16			@ Convert four floats into four Q16.16 fixed points (equiv. to * 65536)
													@ This will truncate the result to a 32-bit representable value
	vqmovn dFIAn_Narrowed, qFIAn_Converted			@ Convert four 32-bit unsigned ints to 16-bit unsigned ints, with saturation
	vst1 {dFIAn_Narrowed}, [r2]!					@ Store ints back into memory

	subs r0, r0, #4							@ numSamples -= 4
	it gt
	bgt float_to_int16_analog_loop_andrew			@ Loop if numSamples > 0

	bx lr
	
@	void initialize_digital_neon(int numSamples, uint32_t* oldBuffer, uint32_t* newBuffer);
@
@ Use past digital values to initialize the array properly.
@ For each frame:
@ - pins previously set as outputs will keep the output value they had in the last frame of the previous buffer,
@ - pins previously set as inputs will carry the newly read input value
@
@	numSamples should be a multiple of 2
@ 	buffer should be aligned on a 8-byte boundary.

@ Registers:
@    r0: numSamples            How many frames to convert
@    r1: oldBuffer              The old buffer
@    r2: newBuffer                The new buffer

//dIFAu_Input		.dn		D0.S16
//qIFAu_Expanded	.qn		Q1.S32
//qIFAu_Output	.qn		Q2.F32
//dIFAu_Output_0	.dn		D4.F32
//dIFAu_Output_1	.dn		D5.F32
dLastOld	.dn  D20.U32
dOld .dn   D0.U32
dNew .dn   D2.U32
dInputs .dn D4.U32
dOutputs .dn D6.U32
ffff .dn D22.U32
temp .dn D24.U32
dNewOut .dn D26.U32

	.align	2
	.global initialize_digital_neon
	.thumb
	.thumb_func
	.type initialize_digital_neon, %function
initialize_digital_neon:
	lsr r0, r0, #1
	lsl r0, r0, #1				@ Clip off the last bit of numSamples (only multiples of 2 allowed)
	cmp r0, #0					@ Check for trivial case: zero samples
	it eq
	bxeq lr						@ Return if that's the case
	//add r3, r1, r0, LSL #2 
	vld1 {dLastOld[]}, [r3]       @ buffer the last value of the oldBuffer
	vmov ffff, 0xffff
	@ ---- loop: iterate over the number of samples ----
initialize_digital_loop:
	vld1 {dOld}, [r1]!						@ load two 32-bit values from oldBuffer++
	vld1 {dNew}, [r2]						@ load two 32-bit values from newBuffer
//		uint16_t inputs = oldBuffer[n] & 0xffff; // half-word, has 1 for inputs and 0 for outputs
	vshl dInputs, dOld, #16          @mask out the upper 16 bit
	vshr dInputs, dInputs, #16             @mask out the upper 16 bit
//		uint16_t outputs = ~inputs; // half-word has 1 for outputs and 0 for inputs;
	veor dOutputs, dInputs, ffff					@invert inputs to obtain outputs
//		newBuffer[n] = (oldBuffer[numSamples - 1] & (outputs << 16)) | // keep output values set in the last frame of the previous buffer
//							   (context->digital[n] & (inputs << 16))   | // inputs from current context->digital[n];
//									   (oldBuffer[n] & (inputs));     // keep pin configuration from previous context->digital[n]

	veor dNewOut, dNewOut, dNewOut @ initialize output to zero

//	(oldBuffer[numSamples - 1] & (outputs << 16)) | // keep output values set in the last frame of the previous buffer
	vshl temp, dOutputs, #16
	vand temp, temp, dLastOld
	vorr dNewOut, dNewOut, temp

//	(newBuffer[n] & (inputs << 16))   | // inputs from current context->digital[n];
	vshl temp, dInputs, #16
	vand temp, temp, dNew
	vorr dNewOut, dNewOut, temp

//	(oldBuffer[n] & (inputs));     // keep pin configuration from previous context->digital[n]
	vand temp, dOld, dInputs
	vorr dNewOut, dNewOut, temp

	//vmov dNewOut, dLastOld
	vst1 {dNewOut}, [r2]!	@ Store floats back into memory

	subs r0, r0, #2									@ numSamples -= 2
	it gt
	bgt initialize_digital_loop						@ Loop if numSamples > 0

	bx lr


	
