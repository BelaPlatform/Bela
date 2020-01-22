#include "common_defs.h"
.origin 0
.entrypoint START

// -----------
// Definitions
// -----------

#define SHARED_COMM_MEM_BASE_SYS 0x00010000 // Location where comm flags are written
#define COMM_SHOULD_STOP 0 // Set to be nonzero when loop should stop
#define COMM_PRU_NUMBER 48 // Which PRU this code is running on
// other locations in SHARED_COMM_MEM_BASE are used by the Bela core code, do not write to them!
#define SHARED_COMM_MEM_BASE_USER 0x00010800 // Comm memory available for this program

// ------------	
// Register map
// ------------

// --- r1 to r11 are used for temporary storage ---

// r12 to r24 available

#define reg_comm_sys_addr r25 // Memory address for communicating with ARM, Bela core
#define reg_comm_user_addr r26 // Memory address for communicating with ARM, user code
#define reg_count r12
#define reg_max_count r13

// --- r27, r28 used in macros ---
// -------------
// Useful macros
// -------------

.macro SET_BIT_IF_GT
.mparam dest, num_bit, count, max
	QBGT DONT, max, count
	SET dest, num_bit
DONT:
	MOV dest, dest // NOP
.endm

START:
	// Load useful registers for addressing SPI
	MOV reg_comm_sys_addr, SHARED_COMM_MEM_BASE_SYS
	MOV reg_comm_user_addr, SHARED_COMM_MEM_BASE_USER
	
	// Find out which PRU we are running on
	// This affects the following offsets
	// The value in this register indicates which
	// PRU is core Bela code runs on, so we must
	// be on the other one.
	MOV  r0, 0x22000      // PRU0 control register offset
	LBBO r2, reg_comm_sys_addr, COMM_PRU_NUMBER, 4
	QBEQ PRU_NUMBER_CHECK_DONE, r2, 1
	MOV  r0, 0x24000      // PRU1 control register offset
PRU_NUMBER_CHECK_DONE:
	
	// Set up c24 and c25 offsets with CTBIR register
	// Thus C24 points to start of PRU0 RAM
	OR  r3, r0, 0x20      // CTBIR0
	MOV r2, 0
	SBBO r2, r3, 0, 4
	
	// Set up c28 pointer offset for shared PRU RAM
	OR r3, r0, 0x28       // CTPPR0
	MOV r2, 0x00000120    // To get address 0x00012000
	SBBO r2, r3, 0, 4
	
	// Set ARM such that PRU can write to registers
	LBCO r0, C4, 4, 4
	CLR r0, r0, 4
	SBCO r0, C4, 4, 4

SETUP:
	MOV reg_count, 0
	MOV reg_max_count, PWM_MAX_WIDTH + 1
USER_LOOP:
	// ------------------------
	// Your loop code goes here
	// ------------------------
	LBBO r1, reg_comm_user_addr, PRU_COMM_USER_WIDTH, 16
	// values are stored as 16 bit uints
	MOV r10, 0
	SET_BIT_IF_GT r10, 0, reg_count, r1.w0
	SET_BIT_IF_GT r10, 1, reg_count, r1.w2
	SET_BIT_IF_GT r10, 2, reg_count, r2.w0
	SET_BIT_IF_GT r10, 3, reg_count, r2.w2
	SET_BIT_IF_GT r10, 4, reg_count, r3.w0
	SET_BIT_IF_GT r10, 5, reg_count, r3.w2
	SET_BIT_IF_GT r10, 6, reg_count, r4.w0
	SET_BIT_IF_GT r10, 7, reg_count, r4.w2

	// write to the output GPIO
	MOV r30, r10
	// increment counter
	ADD reg_count, reg_count, 1

	QBEQ RESET_COUNTER, reg_count, reg_max_count
	JMP DONE_RESET_COUNTER
RESET_COUNTER:
	MOV reg_count, 0
DONE_RESET_COUNTER:

	// -------------------------------------
	// Check if we should finish: 
	// flag is zero as long as it should run
	// -------------------------------------
	//LBBO r2, reg_comm_sys_addr, COMM_SHOULD_STOP, 4 // not working atm
	//QBEQ USER_LOOP, r2, 0

	QBA USER_LOOP
USER_CLEANUP:
	 // ---------------------------
	 // Your cleanup code goes here
	 // ---------------------------
CLEANUP_DONE:
     HALT
