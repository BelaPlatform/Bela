@
@ audio_routines.S
@
@ NEON-based functions for time-critical audio processing
@
@ Andrew McPherson 2014
@ Queen Mary University of London
@

	.syntax unified
	.arch armv7-a
	.fpu neon

@ 	void oscillator_bank_neon(int numAudioFrames, float *audioOut,
@							  int activePartialNum, int lookupTableSize,
@							  float *phases, float *frequencies, float *amplitudes,
@							  float *freqDerivatives, float *ampDerivatives,
@							  float *lookupTable);

@ Registers:
@    r0: numAudioFrames        How many frames to render
@    r1: audioOut              Buffer for audio output samples [stereo]
@    r2: activePartialNum      How many active partials to render
@    r3: lookupTableSize       Size of lookup table
@    ---- other arguments start on the stack and are moved: -----
@    r4: phases                Phase of each oscillator (pointer)
@    r5: frequencies           Normalised frequency of each oscillator (pointer)
@    r6: amplitudes            Normalised amplitude of each oscillator (pointer)
@    r7: freqDerivatives       Derivative of frequency for each oscillator (pointer)
@    r8: ampDerivatives        Derivative of amplitude for each oscillator (pointer)
@    r9: lookupTable           Lookup table containing one oscillation
@
@ Alignment requirements:
@    audioOut: 8-byte boundary
@    phases: 16-byte boundary
@    frequencies: 16-byte boundary
@    amplitudes: 16-byte boundary
@    freqDerivatives: 16-byte bounary
@    ampDerivatives: 16-byte boundary
@    lookupTable: 4-byte boundary (TODO: check this)

	.align	2
	.global	oscillator_bank_neon
	.thumb
	.thumb_func
	.type	oscillator_bank_neon, %function
oscillator_bank_neon:


dSample		.dn		D6.F32
qPhases		.qn		Q8.F32
dPhases_0	.dn		D16.F32
dPhases_1	.dn		D17.F32
qFreqs		.qn		Q9.F32
dFreqs_0	.dn		D18.F32
dFreqs_1	.dn		D19.F32
qAmps		.qn		Q10.F32
dAmps_0		.dn		D20.F32
dAmps_1		.dn		D21.F32
qFreqDs		.qn		Q11.F32
dFreqDs_0	.dn		D22.F32
dFreqDs_1	.dn		D23.F32
qAmpDs		.qn		Q12.F32
dAmpDs_0	.dn		D24.F32
dAmpDs_1	.dn		D25.F32

qBaseInts	.qn		Q13.U32		@ Base indexes: unsigned ints x4
dBaseInts_0	.dn		D26.U32
dBaseInts_1	.dn		D27.U32
qFractions  .qn     Q14.F32		@ Fraction indexes: floats x4
qTableBase	.qn		Q15.U32		@ Base of lookup table

	cmp r0, #0					@ Check for trivial case 1: zero frames
	it eq
	bxeq lr						@ Return if that's the case (otherwise might have odd behaviour)
	cmp r2, #4					@ Check for trivial case 2: zero oscillators
	it lt
	bxlt lr						@ Return if that's the case

	push {r4-r11}				@ Now arguments start 32 bytes above SP
    add r11, sp, #32			@ Pointer to 32 bytes into the stack
    ldm r11, {r4-r9}			@ Load 6 arguments into registers

	vdup qTableBase, r9			@ Move lookup table base index into 4 ints

	@ Outer loop: iterate over the number of oscillators, choosing 4 at a
	@ time to work with.
oscbank_oscillator_loop:
	vld1 {dPhases_0, dPhases_1}, [r4]		@ no increment; will store at end of sample loop
	vld1 {dFreqs_0, dFreqs_1}, [r5]
	vld1 {dAmps_0, dAmps_1}, [r6]
	vld1 {dFreqDs_0, dFreqDs_1}, [r7]!		@ increment; won't update at end of sample loop
	vld1 {dAmpDs_0, dAmpDs_1}, [r8]!

	push {r0-r1,r4-r8}
	@ --- inner loop: iterate over the number of samples ---
oscbank_sample_loop:
	vcvt qBaseInts, qPhases		     		@ Take floor(phases)
	vmov q2.f32, #1.0						@ Load 1.0 into every slot of q2
	vshl q0.U32, qBaseInts, #2				@ Shift the indexes left 2 (*4 for float addressing)
	vcvt qFractions, qBaseInts				@ int back to float
	vadd q0.U32, q0.U32, qTableBase			@ Find memory addresses

	vmov r4, r5, d0							@ Move two indexes to ARM registers
	vmov r6, r7, d1							@ Move two more indexes to ARM registers
	vsub qFractions, qPhases, qFractions	@ fraction = phase - floor(phase)

	vldr.64	d0, [r4]						@ Load two consecutive floats at each location
	vldr.64 d1, [r5]						@ These hold the previous and following samples in the table
	vldr.64	d2, [r6]						@ TODO: check whether these work at 4-byte alignment
	vldr.64 d3, [r7]

	@ Format at this point:
	@ Osc0(before) Osc0(after) Osc1(before) Osc1(after) Osc2(before) Osc2(after) Osc3(before) Osc3(after)
	@ We want:
	@ Osc0(before) Osc1(before) Osc2(before) Osc3(before) Osc0(after) Osc1(after) Osc2(after) Osc3(after)

	vuzp.32 q0, q1							@ Now q0 contains before, q1 contains after
	vsub q2.f32, q2.f32, qFractions			@ q2 = 1.0 - fraction
	vmul q1.f32, q1.f32, qFractions			@ q1 = fraction * after
	vmul q0.f32, q0.f32, q2.f32				@ q0 = (1.0 - fraction) * before

	vadd qPhases, qPhases, qFreqs			@ Update phases
	vadd qFreqs, qFreqs, qFreqDs			@ Update frequencies

	vadd q0.f32, q0.f32, q1.f32				@ Add two interpolated components to get the final sample
	vdup q2.u32, r3							@ Put lookup table size into each element of q2
	vcvt qBaseInts, qPhases					@ Take floor of new phases
	vmul q0.f32, q0.f32, qAmps				@ Multiply samples by current amplitude

	vld1 dSample, [r1]						@ Load the current stereo samples
	vpadd d2.f32, d0.f32, d1.f32			@ Pairwise accumulate q0 (output sample) into d2

	vand q2, q2, qBaseInts					@ Logical AND of new phase int leaves 1 bit set only if phase >= table size
	vpadd d3.f32, d2.f32, d2.f32			@ Pairwise accumulate d2 into d0 --> d0[0] and d0[1] both hold total of 4 oscillators
	vadd qAmps, qAmps, qAmpDs				@ Update amplitudes
	vcvt q0.f32, q2.u32						@ Convert int back to float after AND operation

	vadd  dSample, dSample, d3.f32			@ Add oscillator outputs to each channel

	subs r0, r0, #1							@ numFrames--
	vsub qPhases, qPhases, q0.f32			@ Keep phases in table range
	vst1 dSample, [r1]!						@ Store back in buffer and increment by 8

	it gt
	bgt oscbank_sample_loop					@ Loop if numFrames > 0

	@ --- end inner loop ---
	pop {r0-r1,r4-r8}						@ Restore registers: restores audioOut and numFrames, among others

	vst1 {dPhases_0, dPhases_1}, [r4]!		@ Store phases back to array
	vst1 {dFreqs_0, dFreqs_1}, [r5]!		@ Store frequencies back to array
	vst1 {dAmps_0, dAmps_1}, [r6]!			@ Store amplitudes back to array
											@ No need to update r7, r8

	subs r2, r2, #4							@ numPartials -= 4
	it  gt
	bgt oscbank_oscillator_loop	@ Loop if numPartials > 0

    pop {r4-r11}
	bx lr


@   void wavetable_interpolate_neon(int numSamplesIn, int numSamplesOut,
@                              float *tableIn, float *tableOut);

@ Registers:
@    r0: numSamplesIn          Size of the input table
@    r1: numSamplesOut         Size of the output table
@    r2: tableIn               Pointer to input table
@    r3: tableOut              Pointer to output table

@ Alignment requirements:
@    tableIn: 8-byte boundary
@    tableOut: 8-byte boundary

	.align	2
	.global	wavetable_interpolate_neon
	.thumb
	.thumb_func
	.type	wavetable_interpolate_neon, %function
wavetable_interpolate_neon:
    @ TODO

    bx lr
