/**
 * PRU test test programm
 * Notes:
 *  - r0, r1, r2 are used in macros!
 */

/* Local addresses */
#define PRU_ICSS_INTC_LOCAL 0x00020000
#define PRU_ICSS_CFG_LOCAL 0x00026000

/* Global base addresses */
#define MCASP0_BASE 0x48038000
#define MCSPI0_BASE 0x48030100

/* Misc */
#define PRU0_CONTROL_REGISTER_OFFSET 0x22000

/* PRU INTC registers */
#define INTC_REG_GER    0x10    // global host interrupt enable register
#define INTC_REG_SISR   0x20    // system event status indexed set register (allows setting the status of an event) - write only
#define INTC_REG_SICR   0x24    // system event status indexed clear register (allows clearing the status of an event) - write only
#define INTC_REG_EISR   0x28    // system event enable indexed set register (allows enabling an event) - write only
#define INTC_REG_EICR   0x2C    // system event enable indexed clear register (allows disabling an event) - write only
#define INTC_REG_HIEISR 0x34    // host interrupt enable indexed set register (allows enabling a host interrupt output)
#define INTC_REG_HIDISR 0x38    // host interrupt enable indexed clear register (allows disabling a host interrupt output)
#define INTC_REG_SRSR0  0x200   // system event status raw/set register0 (show the pending enabled status of the system events 0 to 31)
#define INTC_REG_SRSR1  0x204   // system event status raw/set register0 (show the pending enabled status of the system events 32 to 63)
#define INTC_REG_SECR0  0x280   // system event status enabled/clear register0 (show the pending enabled status of the system events 0 to 31)
#define INTC_REG_SECR1  0x284   // system event status enabled/clear register1 (show the pending enabled status of the system events 32 to 63)
#define INTC_REG_ESR0   0x300   // system event enable set register0 (enables system events 0 to 31 to trigger outputs)
#define INTC_REG_ESR1   0x304   // system event enable set register1 (enables system events 32 to 64 to trigger outputs)
#define INTC_REG_ECR0   0x380   // system event enable clear register0 (disables system events 0 to 31 to map to channels)
#define INTC_REG_ECR1   0x384   // system event enable clear register1 (disables system events 32 to 63 to map to channels)
#define INTC_REG_CMR0   0x400   // channel map register for system events 0 to 3
#define INTC_REG_CMR1   0x404   // channel map register for system events 4 to 7
#define INTC_REG_CMR2   0x408   // channel map register for system events 8 to 11
#define INTC_REG_CMR3   0x40C   // channel map register for system events 12 to 15
#define INTC_REG_CMR4   0x410   // channel map register for system events 16 to 19
#define INTC_REG_CMR5   0x414   // channel map register for system events 20 to 23
#define INTC_REG_CMR6   0x418   // channel map register for system events 24 to 27
#define INTC_REG_CMR7   0x41C   // channel map register for system events 28 to 31
#define INTC_REG_CMR8   0x420   // channel map register for system events 32 to 35
#define INTC_REG_CMR9   0x424   // channel map register for system events 36 to 39
#define INTC_REG_CMR10  0x428   // channel map register for system events 40 to 43
#define INTC_REG_CMR11  0x42C   // channel map register for system events 44 to 47
#define INTC_REG_CMR12  0x430   // channel map register for system events 48 to 51
#define INTC_REG_CMR13  0x434   // channel map register for system events 52 to 55
#define INTC_REG_CMR14  0x438   // channel map register for system events 56 to 59
#define INTC_REG_CMR15  0x43C   // channel map register for system events 60 to 63
#define INTC_REG_HMR0   0x800   // host interrupt map register for channels 0 - 3
#define INTC_REG_HMR1   0x804   // host interrupt map register for channels 4 - 7
#define INTC_REG_HMR2   0x808   // host interrupt map register for channels 8 - 9
#define INTC_REG_SIPR0  0xD00   // system event polarity register0 (define the polarity of the system events 0 to 31)
#define INTC_REG_SIPR1  0xD04   // system event polarity register0 (define the polarity of the system events 32 to 63)
#define INTC_REG_SITR0  0xD80   // system event type register0 (define the type of the system events 0 to 31)
#define INTC_REG_SITR1  0xD84   // system event type register0 (define the type of the system events 32 to 63)
#define INTC_REG_HIER   0x1500  // host interrupt enable registers (enable / disable individual host interrupts)

/* PRU INTC bits */
#define INTC_INTERRUPT_BIT_CH0    30
#define INTC_INTERRUPT_BIT_CH1    31
#define SECR_BIT_SYSTEM_EVENT_44  12 // SINTERRUPTN (McSPI0)
#define SECR_BIT_SYSTEM_EVENT_54  22 // mcasp_r_intr_pend (McASP0 Rx)
#define SECR_BIT_SYSTEM_EVENT_55  23 // mcasp_x_intr_pend (McASP0 Tx)

/* PRU CFG registers */
#define CFG_REV_ID          0x0
#define CFG_SYSCFG          0x4
#define CFG_REG_GPCFG0      0x8
#define CFG_GPCFG1          0xC
#define CFG_CGR             0x10
#define CFG_ISRP            0x14
#define CFG_ISP             0x18 
#define CFG_IESP            0x1C
#define CFG_IECP            0x20
#define CFG_PMAO            0x28
#define CFG_MII_RT          0x2C
#define CFG_IEPCLK          0x30
#define CFG_SPP             0x34
#define CFG_PIN_MX          0x40

/* PRU constants */
#define CONST_PRUCFG  C4

/* McASP registers */
#define MCASP_RINTCTL   0x7C
#define MCASP_XINTCTL   0xBC
#define MCASP_RSTAT     0x80
#define MCASP_XSTAT     0xC0

/* McSPI registers */
#define MCSPI_IRQSTATUS 0x18
#define MCSPI_IRQENABLE 0x1C

/** 
 * Helpers
 */

/* Clear all registers */
.macro CLEAR_REGS
  MOV r0, 0x0
  MOV r1, 0x0
  MOV r2, 0x0
  MOV r3, 0x0
  MOV r4, 0x0
  MOV r5, 0x0
  MOV r6, 0x0
  MOV r7, 0x0
  MOV r8, 0x0
  MOV r9, 0x0
  MOV r10, 0x0
  MOV r11, 0x0
  MOV r12, 0x0
  MOV r13, 0x0
  MOV r14, 0x0
  MOV r15, 0x0
  MOV r16, 0x0
  MOV r17, 0x0
  MOV r18, 0x0
  MOV r19, 0x0
  MOV r20, 0x0
  MOV r21, 0x0
  MOV r22, 0x0
  MOV r23, 0x0
  MOV r24, 0x0
  MOV r25, 0x0
  MOV r26, 0x0
  MOV r27, 0x0
  MOV r28, 0x0
  MOV r29, 0x0
  //MOV r30, 0x0
  //MOV r31, 0x0
.endm

/* Endless loop for debugging */
.macro ENDLESS_LOOP
BEGIN:
  JMP BEGIN
.endm

/* Read register of PRU INTC beyond the 0xFF boundary */
.macro PRU_ICSS_INTC_REG_READ_EXT
.mparam reg, value
  MOV r0, PRU_ICSS_INTC_LOCAL
  MOV r1, reg
  ADD r1, r0, r1
  LBBO value, r1, 0, 4
.endm

/* Write register of PRU INTC beyond the 0xFF boundary */
.macro PRU_ICSS_INTC_REG_WRITE_EXT
.mparam reg, value
  MOV r0, PRU_ICSS_INTC_LOCAL
  MOV r1, reg
  ADD r1, r0, r1
  MOV r2, value
  SBBO r2, r1, 0, 4
.endm

/* Read register of PRU CFG beyond the 0xFF boundary */
.macro PRU_ICSS_CFG_REG_READ_EXT
.mparam reg, value
  MOV r0, PRU_ICSS_CFG_LOCAL
  MOV r1, reg
  ADD r1, r0, r1
  LBBO value, r1, 0, 4
.endm

/* Write register of PRU CFG beyond the 0xFF boundary */
.macro PRU_ICSS_CFG_REG_WRITE_EXT
.mparam reg, value
  MOV r0, PRU_ICSS_CFG_LOCAL
  MOV r1, reg
  ADD r1, r0, r1
  MOV r2, value
  SBBO r2, r1, 0, 4
.endm

/* Read register of McASP beyond the 0xFF boundary */
.macro MCASP_REG_READ_EXT
.mparam reg, value
  MOV r0, MCASP0_BASE
  MOV r1, reg
  ADD r1, r0, r1
  LBBO value, r1, 0, 4
.endm

/* Write register of McASP beyond the 0xFF boundary */
.macro MCASP_REG_WRITE_EXT
.mparam reg, value
  MOV r0, MCASP0_BASE
  MOV r1, reg
  ADD r1, r0, r1
  MOV r2, value
  SBBO r2, r1, 0, 4
.endm

/* Read register of McSPI beyond the 0xFF boundary */
.macro MCSPI_REG_READ_EXT
.mparam reg, value
  MOV r0, MCSPI0_BASE
  MOV r1, reg
  ADD r1, r0, r1
  LBBO value, r1, 0, 4
.endm

/* Write register of McSPI beyond the 0xFF boundary */
.macro MCSPI_REG_WRITE_EXT
.mparam reg, value
  MOV r0, MCSPI0_BASE
  MOV r1, reg
  ADD r1, r0, r1
  MOV r2, value
  SBBO r2, r1, 0, 4
.endm


/**
 * Main
 */
.origin 0
.entrypoint START
START:

  /* Required to access McASP registers */
  /*
  MOV r0, PRU0_CONTROL_REGISTER_OFFSET
  // Set up c24 and c25 offsets with CTBIR register
  // Thus C24 points to start of PRU RAM
  OR r3, r0, 0x20      // CTBIR0
  MOV r2, 0
  SBBO r2, r3, 0, 4
  */

  // Enable OCP master port (required to access external peripherals)
  LBCO      r0, CONST_PRUCFG, 4, 4
  CLR       r0, r0, 4         // Clear SYSCFG[STANDBY_INIT] to enable OCP master port
  SBCO      r0, CONST_PRUCFG, 4, 4

  /* 
    Configure McASP interrupts
  */
  //MCASP_REG_WRITE_EXT MCASP_XINTCTL, 0x20
  //MCASP_REG_WRITE_EXT MCASP_RINTCTL, 0x20
  //MCASP_REG_READ_EXT MCASP_XINTCTL, r23
  //MCASP_REG_READ_EXT MCASP_RINTCTL, r24

  /*
    Configure McSPI interrupts (channel 0 for DACs, channel 1 for ADCs)
    (TX0_EMPTY__ENABLE and RX1_FULL__ENABLE)
  */
  //MCSPI_REG_WRITE_EXT MCSPI_IRQENABLE, 0x41
  //MCSPI_REG_READ_EXT MCSPI_IRQENABLE, r25

  /*
    Reset all interrupts
  */
  MCASP_REG_WRITE_EXT MCASP_RSTAT, 0xFF
  MCASP_REG_WRITE_EXT MCASP_XSTAT, 0xFF
  MCSPI_REG_WRITE_EXT MCSPI_IRQSTATUS, 0xFFFFF

  /* 
    Clear all system events
  */
  PRU_ICSS_INTC_REG_WRITE_EXT INTC_REG_SECR0, 0xFFFFFFFF
  PRU_ICSS_INTC_REG_WRITE_EXT INTC_REG_SECR1, 0xFFFFFFFF

  /*
    Clear all registers
  */
  CLEAR_REGS

  /*
    Configure PRU to receive external events
  */
  PRU_ICSS_CFG_REG_WRITE_EXT CFG_MII_RT, 0x0

  /* 
    Globally enable all interrupts
  */
  PRU_ICSS_INTC_REG_WRITE_EXT INTC_REG_GER, 0x1

  /* 
    Enable host interrupts 0 to 3
  */
  PRU_ICSS_INTC_REG_WRITE_EXT INTC_REG_HIEISR, 0x0
  PRU_ICSS_INTC_REG_WRITE_EXT INTC_REG_HIEISR, 0x1
  PRU_ICSS_INTC_REG_WRITE_EXT INTC_REG_HIEISR, 0x2
  PRU_ICSS_INTC_REG_WRITE_EXT INTC_REG_HIEISR, 0x3

  /* 
    Map channel N to host interrupt N
  */
  PRU_ICSS_INTC_REG_WRITE_EXT INTC_REG_HMR0, 0x3020100
  PRU_ICSS_INTC_REG_WRITE_EXT INTC_REG_HMR1, 0x7060504
  PRU_ICSS_INTC_REG_WRITE_EXT INTC_REG_HMR2, 0x908

  /* 
    Map system event 16 (pr1_pru_mst_intr[0]_intr_req) to channel 2 
    and system event 17 (pr1_pru_mst_intr[1]_intr_req) to channel 3
  */
  //PRU_ICSS_INTC_REG_WRITE_EXT INTC_REG_CMR4, 0x302 // when mapping event 17 to channel 2, EVTOUT_0 is arriving

  /*
    Map system event 44 (SINTERRUPTN) to channel 0
  */
  PRU_ICSS_INTC_REG_WRITE_EXT INTC_REG_CMR11, 0x00000000

  /* 
    Map system event 54 (mcasp_r_intr_pend) to channel 0
    and system event 55 (mcasp_x_intr_pend) to channel 0
  */
  //PRU_ICSS_INTC_REG_WRITE_EXT INTC_REG_CMR13, 0x1000000 // event 55 mapped to channel 1 here
  PRU_ICSS_INTC_REG_WRITE_EXT INTC_REG_CMR13, 0x00000000

  /*
    Set polarity registers
  */
  PRU_ICSS_INTC_REG_WRITE_EXT INTC_REG_SIPR0, 0xFFFFFFFF
  PRU_ICSS_INTC_REG_WRITE_EXT INTC_REG_SIPR1, 0xFFFFFFFF

  /*
    Set type registers (not sure if correct)
  */
  PRU_ICSS_INTC_REG_WRITE_EXT INTC_REG_SITR0, 0x00000000
  PRU_ICSS_INTC_REG_WRITE_EXT INTC_REG_SITR1, 0x00000000

  /*
    Clear system event 44, 54 and 55
  */
  PRU_ICSS_INTC_REG_WRITE_EXT INTC_REG_SICR, (0x00000000 | 44) // SINTERRUPTN
  PRU_ICSS_INTC_REG_WRITE_EXT INTC_REG_SICR, (0x00000000 | 54) // mcasp_r_intr_pend
  PRU_ICSS_INTC_REG_WRITE_EXT INTC_REG_SICR, (0x00000000 | 55) // mcasp_x_intr_pend

  /* 
    Disable all system events
  */
  //PRU_ICSS_INTC_REG_WRITE_EXT INTC_REG_ECR0, 0xFFFFFFFF // system event 20 is triggered from Bela
  //PRU_ICSS_INTC_REG_WRITE_EXT INTC_REG_ECR1, 0xFFFFFFFF

  /* 
    Enable system event 16 and 17
  */
  //PRU_ICSS_INTC_REG_WRITE_EXT INTC_REG_EISR, (0x00000000 | 16)
  //PRU_ICSS_INTC_REG_WRITE_EXT INTC_REG_EISR, (0x00000000 | 17)

  /*
    Enable system event 44, 54 and 55
  */
  PRU_ICSS_INTC_REG_WRITE_EXT INTC_REG_EISR, (0x00000000 | 44) // SINTERRUPTN
  PRU_ICSS_INTC_REG_WRITE_EXT INTC_REG_EISR, (0x00000000 | 54) // mcasp_r_intr_pend
  PRU_ICSS_INTC_REG_WRITE_EXT INTC_REG_EISR, (0x00000000 | 55) // mcasp_x_intr_pend

  /* 
    Enable system event 16 and 17
  */
  //PRU_ICSS_INTC_REG_WRITE_EXT INTC_REG_ESR0, 0x30000

  /*
    Enable system events 54 and 55
  */
  //PRU_ICSS_INTC_REG_WRITE_EXT INTC_REG_ESR1, 0xC00000

  /* 
    Enable all host interrupts (0/1 PRU, 2-9 ARM)
  */
  //PRU_ICSS_INTC_REG_WRITE_EXT INTC_REG_HIER, 0x3FF

  /*
    Manually send system event 54
  */
  //PRU_ICSS_INTC_REG_WRITE_EXT INTC_REG_SRSR1, 0x400000


  /*
    Initalize variables for counter
  */
  MOV r3, 0x1 // for incrementation
  MOV r4, 255 // condition to stop counter and shutdown PRU
  MOV r20, 0x0 // counter for system event 54
  MOV r21, 0x0 // counter for system event 55

  CHECK_INTERRUPT_BIT:
    QBBS INTERRUPT_RECEIVED, r31, INTC_INTERRUPT_BIT_CH0
    JMP CHECK_INTERRUPT_BIT

  INTERRUPT_RECEIVED:
    PRU_ICSS_INTC_REG_READ_EXT INTC_REG_SECR1, r10
    QBBS SYSTEM_EVENT_44_RECEIVED, r10, SECR_BIT_SYSTEM_EVENT_44
    QBBS SYSTEM_EVENT_54_RECEIVED, r10, SECR_BIT_SYSTEM_EVENT_54
    QBBS SYSTEM_EVENT_55_RECEIVED, r10, SECR_BIT_SYSTEM_EVENT_55
    JMP CHECK_INTERRUPT_BIT

  SYSTEM_EVENT_44_RECEIVED:
    ADD r19, r3, r19
    PRU_ICSS_INTC_REG_WRITE_EXT INTC_REG_SICR, (0x00000000 | 44) // clear system event 44
    MCSPI_REG_WRITE_EXT MCSPI_IRQSTATUS, 0x41
    JMP CHECK_INTERRUPT_BIT

  SYSTEM_EVENT_54_RECEIVED: // mcasp_r_intr_pend
    ADD r20, r3, r20
    PRU_ICSS_INTC_REG_WRITE_EXT INTC_REG_SICR, (0x00000000 | 54) // clear system event 54
    //PRU_ICSS_INTC_REG_WRITE_EXT INTC_REG_SECR1, 0x400000 // can be also used to clear several system events
    //QBEQ SHUTDOWN, r20, r4
    //MCASP_REG_WRITE_EXT MCASP_RSTAT, 0x20 // clear RDATA flag. this causes issue with Bela rt audio code!!!
    MCASP_REG_WRITE_EXT MCASP_RSTAT, 0x40 // clear receive start of frame flag
    JMP CHECK_INTERRUPT_BIT

  SYSTEM_EVENT_55_RECEIVED: // mcasp_x_intr_pend
    ADD r21, r3, r21
    PRU_ICSS_INTC_REG_WRITE_EXT INTC_REG_SICR, (0x00000000 | 55) // clear system event 55
    //PRU_ICSS_INTC_REG_WRITE_EXT INTC_REG_SECR1, 0x800000 // can be also used to clear several system events
    //QBEQ SHUTDOWN, r21, r4
    //MCASP_REG_WRITE_EXT MCASP_XSTAT, 0x20 // clear XDATA flag. this causes issue with Bela rt audio code!!!
    MCASP_REG_WRITE_EXT MCASP_XSTAT, 0x40 // clear transmit start of frame flag
    JMP CHECK_INTERRUPT_BIT

  SHUTDOWN:
    /*
      Disable interrupts of McASP
    */
    //MCASP_REG_WRITE_EXT MCASP_XINTCTL, 0x00
    //MCASP_REG_WRITE_EXT MCASP_RINTCTL, 0x00

    //MOV r31.b0, 16 + 19 // Trigger pr1_pru_mst_intr[3]_intr_req (system event 19) (always offset of 16 (enable bit (bit 5))
    //MOV r31, 0x20 // Trigger pr1_pru_mst_intr[0]_intr_req (system event 16)
    HALT
