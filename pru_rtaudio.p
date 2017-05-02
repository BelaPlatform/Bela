.origin 0
.entrypoint START

//#define CTAG_FACE_8CH

#define DBOX_CAPE   // Define this to use new cape hardware
    
#define CLOCK_BASE  0x44E00000
#define CLOCK_SPI0  0x4C
#define CLOCK_SPI1  0x50
#define CLOCK_L4LS  0x60

#define SCRATCHPAD_ID_BANK0 10
#define SCRATCHPAD_ID_BANK1 11
#define SCRATCHPAD_ID_BANK2 12

#define SPI0_BASE   0x48030100
#define SPI1_BASE   0x481A0100
#define SPI_BASE    SPI0_BASE
    
#define SPI_SYSCONFIG 0x10
#define SPI_SYSSTATUS 0x14
#define SPI_IRQSTATUS 0x18
#define SPI_IRQENABLE 0x1C
#define SPI_MODULCTRL 0x28
#define SPI_CH0CONF   0x2C
#define SPI_CH0STAT   0x30
#define SPI_CH0CTRL   0x34
#define SPI_CH0TX     0x38
#define SPI_CH0RX     0x3C
#define SPI_CH1CONF   0x40
#define SPI_CH1STAT   0x44
#define SPI_CH1CTRL   0x48
#define SPI_CH1TX     0x4C
#define SPI_CH1RX     0x50

#define GPIO0 0x44E07000
#define GPIO1 0x4804C000
#define GPIO_CLEARDATAOUT 0x190
#define GPIO_SETDATAOUT 0x194

#define PRU0_ARM_INTERRUPT 19   // Interrupt signalling we're done
#define PRU1_ARM_INTERRUPT 20   // Interrupt signalling a block is ready

#define C_ADC_DAC_MEM C24     // PRU0 mem
#ifdef DBOX_CAPE
#define DAC_GPIO      GPIO0
#define DAC_CS_PIN    (1<<5) // GPIO0:5 = P9 pin 17
#else
#define DAC_GPIO      GPIO1
#define DAC_CS_PIN    (1<<16) // GPIO1:16 = P9 pin 15
#endif
#define DAC_TRM       0       // SPI transmit and receive
#define DAC_WL        32      // Word length
#define DAC_CLK_MODE  1       // SPI mode
#define DAC_CLK_DIV   1       // Clock divider (48MHz / 2^n)
#define DAC_DPE       1       // d0 = receive, d1 = transmit

#define AD5668_COMMAND_OFFSET 24
#define AD5668_ADDRESS_OFFSET 20
#define AD5668_DATA_OFFSET    4
#define AD5668_REF_OFFSET     0

#ifdef DBOX_CAPE
#define ADC_GPIO      GPIO1
#define ADC_CS_PIN    (1<<16) // GPIO1:16 = P9 pin 15
#else
#define ADC_GPIO      GPIO1
#define ADC_CS_PIN    (1<<17) // GPIO1:17 = P9 pin 23
#endif
#define ADC_TRM       0       // SPI transmit and receive
#define ADC_WL        16      // Word length
#define ADC_CLK_MODE  0       // SPI mode
#define ADC_CLK_DIV   1       // Clock divider (48MHz / 2^n)
#define ADC_DPE       1       // d0 = receive, d1 = transmit

#define AD7699_CFG_MASK       0xF120 // Mask for config update, unipolar, full BW
#define AD7699_CHANNEL_OFFSET 9      // 7 bits offset of a 14-bit left-justified word
#define AD7699_SEQ_OFFSET     3      // sequencer (0 = disable, 3 = scan all)

#define SHARED_COMM_MEM_BASE  0x00010000  // Location where comm flags are written
#define COMM_SHOULD_STOP      0       // Set to be nonzero when loop should stop
#define COMM_CURRENT_BUFFER   4           // Which buffer we are on
#define COMM_BUFFER_FRAMES    8           // How many frames per buffer
#define COMM_SHOULD_SYNC      12          // Whether to synchronise to an external clock
#define COMM_SYNC_ADDRESS     16          // Which memory address to find the GPIO on
#define COMM_SYNC_PIN_MASK    20          // Which pin to read for the sync
#define COMM_LED_ADDRESS      24          // Which memory address to find the status LED on
#define COMM_LED_PIN_MASK     28          // Which pin to write to change LED
#define COMM_FRAME_COUNT      32      // How many frames have elapse since beginning
#define COMM_USE_SPI          36          // Whether or not to use SPI ADC and DAC
#define COMM_NUM_CHANNELS     40      // Low 2 bits indicate 8 [0x3], 4 [0x1] or 2 [0x0] channels
#define COMM_USE_DIGITAL      44      // Whether or not to use DIGITAL
#define COMM_PRU_NUMBER       48          // Which PRU this code is running on
#define COMM_MUX_CONFIG       52          // Whether to use the mux capelet, and how many channels
#define COMM_MUX_END_CHANNEL  56          // Which mux channel the last buffer ended on
    
// General constants for local PRU peripherals (used for interrupt configuration)
#define PRU_ICSS_INTC_LOCAL     0x00020000
#define PRU_ICSS_CFG_LOCAL      0x00026000

// General constant for PRU system events
#define PRU_SYS_EV_MCSPI_INTR       44 // SINTERRUPTN
#define PRU_SYS_EV_MCASP_RX_INTR    54 // mcasp_r_intr_pend
#define PRU_SYS_EV_MCASP_TX_INTR    55 // mcasp_x_intr_pend

// PRU INTC system events (address relative to INTC_REG_SECR1)
#define PRU_SECR1_SYS_EV_MCSPI_INTR       12 // system event 44 (SINTERRUPTN)
#define PRU_SECR1_SYS_EV_MCASP_RX_INTR    22 // system event 54 (mcasp_r_intr_pend)
#define PRU_SECR1_SYS_EV_MCASP_TX_INTR    23 // system event 55 (mcasp_x_intr_pend)

// PRU interrupt controller registers
#define INTC_REG_GER    0x10    // Global host interrupt enable register
#define INTC_REG_SISR   0x20    // System event status indexed set register (allows setting the status of an event) - write only
#define INTC_REG_SICR   0x24    // System event status indexed clear register (allows clearing the status of an event) - write only
#define INTC_REG_EISR   0x28    // System event enable indexed set register (allows enabling an event) - write only
#define INTC_REG_EICR   0x2C    // System event enable indexed clear register (allows disabling an event) - write only
#define INTC_REG_HIEISR 0x34    // Host interrupt enable indexed set register (allows enabling a host interrupt output)
#define INTC_REG_HIDISR 0x38    // Host interrupt enable indexed clear register (allows disabling a host interrupt output)
#define INTC_REG_SRSR0  0x200   // System event status raw/set register0 (show the pending enabled status of the system events 0 to 31)
#define INTC_REG_SRSR1  0x204   // System event status raw/set register0 (show the pending enabled status of the system events 32 to 63)
#define INTC_REG_SECR0  0x280   // System event status enabled/clear register0 (show the pending enabled status of the system events 0 to 31)
#define INTC_REG_SECR1  0x284   // System event status enabled/clear register1 (show the pending enabled status of the system events 32 to 63)
#define INTC_REG_ESR0   0x300   // System event enable set register0 (enables system events 0 to 31 to trigger outputs)
#define INTC_REG_ESR1   0x304   // System event enable set register1 (enables system events 32 to 64 to trigger outputs)
#define INTC_REG_ECR0   0x380   // System event enable clear register0 (disables system events 0 to 31 to map to channels)
#define INTC_REG_ECR1   0x384   // System event enable clear register1 (disables system events 32 to 63 to map to channels)
#define INTC_REG_CMR0   0x400   // Channel map register for system events 0 to 3
#define INTC_REG_CMR1   0x404   // Channel map register for system events 4 to 7
#define INTC_REG_CMR2   0x408   // Channel map register for system events 8 to 11
#define INTC_REG_CMR3   0x40C   // Channel map register for system events 12 to 15
#define INTC_REG_CMR4   0x410   // Channel map register for system events 16 to 19
#define INTC_REG_CMR5   0x414   // Channel map register for system events 20 to 23
#define INTC_REG_CMR6   0x418   // Channel map register for system events 24 to 27
#define INTC_REG_CMR7   0x41C   // Channel map register for system events 28 to 31
#define INTC_REG_CMR8   0x420   // Channel map register for system events 32 to 35
#define INTC_REG_CMR9   0x424   // Channel map register for system events 36 to 39
#define INTC_REG_CMR10  0x428   // Channel map register for system events 40 to 43
#define INTC_REG_CMR11  0x42C   // Channel map register for system events 44 to 47
#define INTC_REG_CMR12  0x430   // Channel map register for system events 48 to 51
#define INTC_REG_CMR13  0x434   // Channel map register for system events 52 to 55
#define INTC_REG_CMR14  0x438   // Channel map register for system events 56 to 59
#define INTC_REG_CMR15  0x43C   // Channel map register for system events 60 to 63
#define INTC_REG_HMR0   0x800   // Host interrupt map register for channels 0 - 3
#define INTC_REG_HMR1   0x804   // Host interrupt map register for channels 4 - 7
#define INTC_REG_HMR2   0x808   // Host interrupt map register for channels 8 - 9
#define INTC_REG_SIPR0  0xD00   // System event polarity register0 (define the polarity of the system events 0 to 31)
#define INTC_REG_SIPR1  0xD04   // System event polarity register0 (define the polarity of the system events 32 to 63)
#define INTC_REG_SITR0  0xD80   // System event type register0 (define the type of the system events 0 to 31)
#define INTC_REG_SITR1  0xD84   // System event type register0 (define the type of the system events 32 to 63)
#define INTC_REG_HIER   0x1500  // Host interrupt enable registers (enable / disable individual host interrupts)

// PRU INTC bits
#define PRU_INTR_BIT_CH0    30
#define PRU_INTR_BIT_CH1    31

// PRU CFG registers
#define CFG_REG_REV_ID      0x0
#define CFG_REG_SYSCFG      0x4
#define CFG_REG_REG_GPCFG0  0x8
#define CFG_REG_GPCFG1      0xC
#define CFG_REG_CGR         0x10
#define CFG_REG_ISRP        0x14
#define CFG_REG_ISP         0x18 
#define CFG_REG_IESP        0x1C
#define CFG_REG_IECP        0x20
#define CFG_REG_PMAO        0x28
#define CFG_REG_MII_RT      0x2C
#define CFG_REG_IEPCLK      0x30
#define CFG_REG_SPP         0x34
#define CFG_REG_PIN_MX      0x40

// General constants for McASP peripherals (used for audio codec)
#define MCASP0_BASE 0x48038000
#define MCASP1_BASE 0x4803C000

#define MCASP0_DATAPORT 0x46000000
#define MCASP1_DATAPORT 0x46400000

#define MCASP_PWRIDLESYSCONFIG      0x04
#define MCASP_PFUNC         0x10
#define MCASP_PDIR          0x14
#define MCASP_PDOUT         0x18
#define MCASP_PDSET         0x1C
#define MCASP_PDIN          0x1C
#define MCASP_PDCLR         0x20
#define MCASP_GBLCTL            0x44
#define MCASP_AMUTE         0x48
#define MCASP_DLBCTL            0x4C
#define MCASP_DITCTL            0x50
#define MCASP_RGBLCTL           0x60
#define MCASP_RMASK         0x64
#define MCASP_RFMT          0x68
#define MCASP_AFSRCTL           0x6C
#define MCASP_ACLKRCTL          0x70
#define MCASP_AHCLKRCTL         0x74
#define MCASP_RTDM          0x78
#define MCASP_RINTCTL           0x7C
#define MCASP_RSTAT         0x80
#define MCASP_RSLOT         0x84
#define MCASP_RCLKCHK           0x88
#define MCASP_REVTCTL           0x8C
#define MCASP_XGBLCTL           0xA0
#define MCASP_XMASK         0xA4
#define MCASP_XFMT          0xA8
#define MCASP_AFSXCTL           0xAC
#define MCASP_ACLKXCTL          0xB0
#define MCASP_AHCLKXCTL         0xB4
#define MCASP_XTDM          0xB8
#define MCASP_XINTCTL           0xBC
#define MCASP_XSTAT         0xC0
#define MCASP_XSLOT         0xC4
#define MCASP_XCLKCHK           0xC8
#define MCASP_XEVTCTL           0xCC
#define MCASP_SRCTL0            0x180
#define MCASP_SRCTL1            0x184
#define MCASP_SRCTL2            0x188
#define MCASP_SRCTL3            0x18C
#define MCASP_SRCTL4            0x190
#define MCASP_SRCTL5            0x194
#define MCASP_XBUF0         0x200
#define MCASP_XBUF1         0x204
#define MCASP_XBUF2         0x208
#define MCASP_XBUF3         0x20C
#define MCASP_XBUF4         0x210
#define MCASP_XBUF5         0x214
#define MCASP_RBUF0         0x280
#define MCASP_RBUF1         0x284
#define MCASP_RBUF2         0x288
#define MCASP_RBUF3         0x28C
#define MCASP_RBUF4         0x290
#define MCASP_RBUF5         0x294
#define MCASP_WFIFOCTL          0x1000
#define MCASP_WFIFOSTS          0x1004
#define MCASP_RFIFOCTL          0x1008
#define MCASP_RFIFOSTS          0x100C

#define MCASP_XSTAT_XUNDRN_BIT          0        // Bit to test if there was an underrun
#define MCASP_XSTAT_XDATA_BIT           5        // Bit to test for transmit ready
#define MCASP_RSTAT_RDATA_BIT           5        // Bit to test for receive ready 
    
// Constants used for this particular audio setup
#define MCASP_BASE  MCASP0_BASE
#define MCASP_DATAPORT  MCASP0_DATAPORT
#ifdef DBOX_CAPE
#define MCASP_SRCTL_X   MCASP_SRCTL2    // Ser. 2 is transmitter
#define MCASP_SRCTL_R   MCASP_SRCTL0    // Ser. 0 is receiver
#define MCASP_XBUF  MCASP_XBUF2
#define MCASP_RBUF  MCASP_RBUF0
#else
#define MCASP_SRCTL_X   MCASP_SRCTL3    // Ser. 3 is transmitter
#define MCASP_SRCTL_R   MCASP_SRCTL2    // Ser. 2 is receiver
#define MCASP_XBUF  MCASP_XBUF3
#define MCASP_RBUF  MCASP_RBUF2
#endif
    
#define MCASP_PIN_AFSX      (1 << 28)
#define MCASP_PIN_AHCLKX    (1 << 27)
#define MCASP_PIN_ACLKX     (1 << 26)
#define MCASP_PIN_AMUTE     (1 << 25)   // Also, 0 to 3 are XFR0 to XFR3

#ifdef DBOX_CAPE
#define MCASP_OUTPUT_PINS       MCASP_PIN_AHCLKX | (1 << 2) // AHCLKX and AXR2 outputs
#else
#define MCASP_OUTPUT_PINS       (1 << 3)    // Which pins are outputs
#endif

#define MCASP_DATA_MASK     0xFFFF      // 16 bit data
#ifdef CTAG_FACE_8CH
#define MCASP_DATA_FORMAT 0x180F4       // MSB first, 1 bit delay, 32 bits, DAT bus, ROR 16bits
#define MCASP_ACLKRCTL_VALUE 0x80       // 0x180080 in ALSA driver
#define MCASP_ACLKXCTL_VALUE 0x80       // 0x180080 in ALSA driver
#define MCASP_AFSRCTL_VALUE 0x410       // 8 Slot I2S mode (0x010 un ALSA driver)
#define MCASP_AFSXCTL_VALUE 0x410       // 8 Slot I2S mode (0x410 in ALSA driver) 
#define MCASP_RTDM_VALUE 0xFF           // (0x00 in ALSA driver)
#define MCASP_XTDM_VALUE 0xFF           // Enable TDM slots 0 to 7 (0xFF in ALSA driver)
#else
#define MCASP_DATA_FORMAT   0x8074      // MSB first, 0 bit delay, 16 bits, DAT bus, ROR 16bits
#define MCASP_ACLKRCTL_VALUE 0x00
#define MCASP_ACLKXCTL_VALUE 0x00
#define MCASP_AFSRCTL_VALUE 0x100       // 2 Slot I2S mode
#define MCASP_AFSXCTL_VALUE 0x100       // 2 Slot I2S mode
#define MCASP_RTDM_VALUE 0x3            // Enable TDM slots 0 and 1
#define MCASP_XTDM_VALUE 0x3            // Enable TDM slots 0 and 1
#endif
#define C_MCASP_MEM             C28         // Shared PRU mem

// Flags for the flags register
#define FLAG_BIT_BUFFER1    0
#define FLAG_BIT_USE_SPI    1
#define FLAG_BIT_USE_DIGITAL    2
#define FLAG_BIT_MCASP_TX_FIRST_FRAME    3 // Weather we are in first frame of second (0 = first frame)
#define FLAG_BIT_MCASP_RX_FIRST_FRAME    4
#define FLAG_BIT_MCASP_TX_PROCESSED		5
#define FLAG_BIT_MCASP_RX_PROCESSED		6

#define FLAG_BIT_MUX_CONFIG0     8      // Mux capelet configuration:
#define FLAG_BIT_MUX_CONFIG1     9      // 00 = off, 01 = 2 ch., 10 = 4 ch., 11 = 8 ch.
#define FLAG_MASK_MUX_CONFIG     0x0300
        
// Registers used throughout

// r1, r2, r3 are used for temporary storage
#define MEM_DIGITAL_BASE 0x11000 //Base address for DIGITAL : Shared RAM + 0x400
#define MEM_DIGITAL_BUFFER1_OFFSET 0x400 //Start pointer to DIGITAL_BUFFER1, which is 256 words after.
// 256 is the maximum number of frames allowed

#define reg_digital_current r6  // Pointer to current storage location of DIGITAL
#define reg_num_channels    r9      // Number of SPI ADC/DAC channels to use
#define reg_frame_current   r10     // Current frame count in SPI ADC/DAC transfer
#define reg_frame_total     r11     // Total frame count for SPI ADC/DAC
#define reg_dac_data        r12     // Current dword for SPI DAC
#define reg_adc_data        r13     // Current dword for SPI ADC
#define reg_mcasp_dac_data  r14     // Current dword for McASP DAC
#define reg_mcasp_adc_data  r15     // Current dword for McASP ADC
#define reg_dac_buf0        r16     // Start pointer to SPI DAC buffer 0
#define reg_dac_buf1        r17     // Start pointer to SPI DAC buffer 1
#define reg_dac_current     r18     // Pointer to current storage location of SPI DAC
#define reg_adc_current     r19     // Pointer to current storage location of SPI ADC
#define reg_mcasp_buf0      r20     // Start pointer to McASP DAC buffer 0
#define reg_mcasp_buf1      r21     // Start pointer to McASP DAC buffer 1
#define reg_mcasp_dac_current   r22     // Pointer to current storage location of McASP DAC
#define reg_mcasp_adc_current   r23     // Pointer to current storage location of McASP ADC
#define reg_flags       r24     // Buffer ID (0 and 1) and other flags
#define reg_comm_addr       r25     // Memory address for communicating with ARM
#define reg_spi_addr        r26     // Base address for SPI
// r27, r28 used in macros
#define reg_mcasp_addr      r29     // Base address for McASP
#define reg_pru1_mux_pins   r30     // Register mapped directly to P8 pins (PRU1 only)

//0  P8_07 36 0x890/090 66 gpio2[2]
//1  P8_08 37 0x894/094 67 gpio2[3]
//2  P8_09 39 0x89c/09c 69 gpio2[5]
//3  P8_10 38 0x898/098 68 gpio2[4]
//4  P8_11 13 0x834/034 45 gpio1[13]
//5  P8_12 12 0x830/030 44 gpio1[12]
//6  P9_12 30 0x878/078 60 gpio1[28]
//7  P9_14 18 0x848/048 50 gpio1[18]
//8  P8_15 15 0x83c/03c 47 gpio1[15]
//9  P8_16 14 0x838/038 46 gpio1[14]
//10 P9_16 19 0x84c/04c 51 gpio1[19]
//11 P8_18 35 0x88c/08c 65 gpio2[1]
//12 P8_27 56 0x8e0/0e0 86 gpio2[22]
//13 P8_28 58 0x8e8/0e8 88 gpio2[24]
//14 P8_29 57 0x8e4/0e4 87 gpio2[23]
//15 P8_30 59 0x8ec/0ec 89 gpio2[25]

//generic GPIOs constants
//#define GPIO1 0x4804c000
#define GPIO2 0x481ac000
//#define GPIO_CLEARDATAOUT 0x190 //SETDATAOUT is CLEARDATAOUT+4
#define GPIO_OE 0x134 
#define GPIO_DATAIN 0x138

.macro READ_GPIO_BITS
.mparam gpio_data, gpio_num_bit, digital_bit, digital
    QBBC DONE, digital, digital_bit //if the pin is set as an output, nothing to do here
    QBBC CLEAR, gpio_data, gpio_num_bit 
    SET digital, digital_bit+16
    QBA DONE
    CLEAR:
        CLR digital, digital_bit+16
        QBA DONE
    DONE:
.endm

.macro SET_GPIO_BITS
.mparam gpio_oe, gpio_setdataout, gpio_cleardataout, gpio_num_bit, digital_bit, digital //sets the bits in GPIO_OE, GPIO_SETDATAOUT and GPIO_CLEARDATAOUT
//Remember that the GPIO_OE Output data enable register behaves as follows for each bit:
//0 = The corresponding GPIO pin is configured as an output.
//1 = The corresponding GPIO pin is configured as an input.
    QBBS SETINPUT, digital, digital_bit 
    CLR gpio_oe, gpio_num_bit //if it is an output, configure pin as output
    QBBC CLEARDATAOUT, digital, digital_bit+16 // check the output value. If it is 0, branch
    SET gpio_setdataout, gpio_num_bit //if it is 1, set output to high
    QBA DONE
CLEARDATAOUT:
    SET gpio_cleardataout, gpio_num_bit // set output to low
    QBA DONE
SETINPUT: //if it is an input, set the relevant bit
    SET gpio_oe, gpio_num_bit
    QBA DONE
DONE:
.endm

QBA START // when first starting, go to START, skipping this section.

DIGITAL:
//IMPORTANT: do NOT use r28 in this macro, as it contains the return address for JAL
//r27 is now the input word passed in render(), one word per frame
//[31:16]: data(1=high, 0=low), [15:0]: direction (0=output, 1=input) )


//Preparing the gpio_oe, gpio_cleardataout and gpio_setdataout for each module
//r2 will hold GPIO1_OE
//load current status of GPIO_OE in r2
    MOV r2, GPIO1 | GPIO_OE 
    //it takes 190ns to go through the next instruction
    LBBO r2, r2, 0, 4
//GPIO1-start
//process oe and datain and prepare dataout for GPIO1
//r7 will contain GPIO1_CLEARDATAOUT
//r8 will contain GPIO1_SETDATAOUT
    MOV r8, 0 
    MOV r7, 0
//map GPIO_ANALOG to gpio1 pins,
//r2 is gpio1_oe, r8 is gpio1_setdataout, r7 is gpio1_cleardataout, r27 is the input word
//the following operations will read from r27 and update r2,r7,r8
    SET_GPIO_BITS r2, r8, r7, 13, 4, r27
    SET_GPIO_BITS r2, r8, r7, 12, 5, r27
    SET_GPIO_BITS r2, r8, r7, 28, 6, r27
    SET_GPIO_BITS r2, r8, r7, 18, 7, r27
    SET_GPIO_BITS r2, r8, r7, 15, 8, r27
    SET_GPIO_BITS r2, r8, r7, 14, 9, r27
    SET_GPIO_BITS r2, r8, r7, 19, 10, r27
//set the output enable register for gpio1.
    MOV r3, GPIO1 | GPIO_OE  //use r3 as a temp register
    SBBO r2, r3, 0, 4 //takes two cycles (10ns)
//GPIO1-end
// r2 is now unused

//GPIO2-start
//r3 will hold GPIO1_OE
//load current status of GPIO_OE in r3
    MOV r3, GPIO2 | GPIO_OE  
//it takes 200ns to go through the next instructions
    LBBO r3, r3, 0, 4
//process oe and datain and prepare dataout for GPIO2
//r4 will contain GPIO2_CLEARDATAOUT
//r5 will contain GPIO2_SETDATAOUT
    MOV r5, 0
    MOV r4, 0 
//map GPIO_ANALOG to gpio2 pins
//r3 is gpio2_oe, r5 is gpio2_setdataout, r4 is gpio2_cleardataout, r27 is the input word
//the following operations will read from r27 and update r3,r4,r5
    SET_GPIO_BITS r3, r5, r4, 2, 0, r27
    SET_GPIO_BITS r3, r5, r4, 3, 1, r27
    SET_GPIO_BITS r3, r5, r4, 5, 2, r27
    SET_GPIO_BITS r3, r5, r4, 4, 3, r27
    SET_GPIO_BITS r3, r5, r4, 1, 11, r27
    SET_GPIO_BITS r3, r5, r4, 22, 12, r27
    SET_GPIO_BITS r3, r5, r4, 24, 13, r27
    SET_GPIO_BITS r3, r5, r4, 23, 14, r27
    SET_GPIO_BITS r3, r5, r4, 25, 15, r27
//set the output enable register for gpio2.
    MOV r2, GPIO2 | GPIO_OE  //use r2 as a temp registerp
    SBBO r3, r2, 0, 4 //takes two cycles (10ns)
//GPIO2-end
//r3 is now unused

//load current inputs in r2, r3
//r2 will contain GPIO1_DATAIN
//r3 will contain GPIO2_DATAIN
//load the memory locations
    MOV r2, GPIO1 | GPIO_DATAIN  
    MOV r3, GPIO2 | GPIO_DATAIN  
    //takes 375 nns to go through the next two instructions
//read the datain
    LBBO r2, r2, 0, 4
    LBBO r3, r3, 0, 4
//now read from r2 and r3 only the channels that are set as input in the lower word of r27 
// and set their value in the high word of r27
//GPIO1
    READ_GPIO_BITS r2, 13, 4, r27
    READ_GPIO_BITS r2, 12, 5, r27
    READ_GPIO_BITS r2, 28, 6, r27
    READ_GPIO_BITS r2, 18, 7, r27
    READ_GPIO_BITS r2, 15, 8, r27
    READ_GPIO_BITS r2, 14, 9, r27
    READ_GPIO_BITS r2, 19, 10, r27
//GPIO2
    READ_GPIO_BITS r3, 2, 0, r27
    READ_GPIO_BITS r3, 3, 1, r27
    READ_GPIO_BITS r3, 5, 2, r27
    READ_GPIO_BITS r3, 4, 3, r27
    READ_GPIO_BITS r3, 1, 11, r27
    READ_GPIO_BITS r3, 22, 12, r27
    READ_GPIO_BITS r3, 24, 13, r27
    READ_GPIO_BITS r3, 23, 14, r27
    READ_GPIO_BITS r3, 25, 15, r27
//r2, r3 are now unused

//now all the setdataout and cleardataout are ready to be written to the GPIO register.
//CLEARDATAOUT and SETDATAOUT are consecutive positions in memory, so we just write 8 bytes to CLEARDATAOUT.
//We can do this because we chose cleardata and setdata registers for a given GPIO to be consecutive
//load the memory addresses to be written to
    MOV r2, GPIO1 | GPIO_CLEARDATAOUT //use r2 as a temp register
    MOV r3, GPIO2 | GPIO_CLEARDATAOUT //use r3 as a temp register
//write 8 bytes for each GPIO
//takes 30ns in total to go through the following two instructions
    SBBO r7, r2, 0, 8 //store r7 and r8 in GPIO1_CLEARDATAOUT and GPIO1_SETDATAOUT 
                      //takes 145ns to be effective when going low, 185ns when going high
    SBBO r4, r3, 0, 8 //store r4 and r5 in GPIO2_CLEARDATAOUT and GPIO2_SETDATAOUT 
                     //takes 95ns to be effective when going low, 130ns when going high
//reversing the order of the two lines above will swap the performances between the GPIO modules
//i.e.: the first line will always take 145ns/185ns and the second one will always take 95ns/130ns, 
//regardless of whether the order is gpio1-gpio2 or gpio2-gpio1
JMP r28.w0 // go back to ADC_WRITE_AND_PROCESS_GPIO

.macro HANG //useful for debugging
DALOOP:
    set r30.t14
    clr r30.t14
QBA DALOOP
.endm   

// Bring CS line low to write to DAC
.macro DAC_CS_ASSERT
     MOV r27, DAC_CS_PIN
     MOV r28, DAC_GPIO + GPIO_CLEARDATAOUT
     SBBO r27, r28, 0, 4
.endm

// Bring CS line high at end of DAC transaction
.macro DAC_CS_UNASSERT
     MOV r27, DAC_CS_PIN
     MOV r28, DAC_GPIO + GPIO_SETDATAOUT
     SBBO r27, r28, 0, 4
.endm

// Write to DAC TX register
.macro DAC_TX
.mparam data
      SBBO data, reg_spi_addr, SPI_CH0TX, 4
.endm

// Wait for SPI to finish (uses RXS indicator)
.macro DAC_WAIT_FOR_FINISH
 LOOP:
     LBBO r27, reg_spi_addr, SPI_CH0STAT, 4
     QBBC LOOP, r27, 0
.endm

// Read the RX word to clear
.macro DAC_DISCARD_RX
     LBBO r27, reg_spi_addr, SPI_CH0RX, 4
.endm

// Complete DAC write with chip select
.macro DAC_WRITE
.mparam reg
     DAC_CS_ASSERT
     DAC_TX reg
     DAC_WAIT_FOR_FINISH
     DAC_CS_UNASSERT
     DAC_DISCARD_RX
.endm

// Transform channel order on DAC
// (in) 01234567 --> (out) 64201357
// This is to make the pin order on the Bela cape
// make sense
.macro DAC_CHANNEL_REORDER
.mparam out, in
     QBBS DAC_CHANNEL_REORDER_HIGH, in, 2
// Input channels 0,1,2,3 --> 6,4,2,0
// out = (3 - in) << 1
     XOR out, in, 0x03
     LSL out, out, 1
     QBA DAC_CHANNEL_REORDER_DONE
DAC_CHANNEL_REORDER_HIGH:   
// Input channels 4,5,6,7 --> 1,3,5,7
// out = ((in & 0x03) << 1) + 1
     AND out, in, 0x03
     LSL out, out, 1
     ADD out, out, 1
DAC_CHANNEL_REORDER_DONE:   
.endm
    
// Bring CS line low to write to ADC
.macro ADC_CS_ASSERT
     MOV r27, ADC_CS_PIN
     MOV r28, ADC_GPIO + GPIO_CLEARDATAOUT
     SBBO r27, r28, 0, 4
.endm

// Bring CS line high at end of ADC transaction
.macro ADC_CS_UNASSERT
     MOV r27, ADC_CS_PIN
     MOV r28, ADC_GPIO + GPIO_SETDATAOUT
     SBBO r27, r28, 0, 4
.endm

// Write to ADC TX register
.macro ADC_TX
.mparam data
     SBBO data, reg_spi_addr, SPI_CH1TX, 4
.endm

// Wait for SPI to finish (uses RXS indicator)
.macro ADC_WAIT_FOR_FINISH
 LOOP:
     LBBO r27, reg_spi_addr, SPI_CH1STAT, 4
     QBBC LOOP, r27, 0
.endm

// Read the RX word to clear; store output
.macro ADC_RX
.mparam data
     LBBO data, reg_spi_addr, SPI_CH1RX, 4
.endm

// Complete ADC write+read with chip select
.macro ADC_WRITE
.mparam in, out
     ADC_CS_ASSERT
     ADC_TX in
     ADC_WAIT_FOR_FINISH
     ADC_RX out
     ADC_CS_UNASSERT
.endm

// Complete ADC write+read with chip select and also performs IO for digital
.macro ADC_WRITE_GPIO
.mparam in, out, do_gpio
     ADC_CS_ASSERT
     ADC_TX in
     QBBC GPIO_DONE, reg_flags, FLAG_BIT_USE_DIGITAL //skip if DIGITAL is disabled
     QBLT CASE_4_OR_8_CHANNELS, reg_num_channels, 2
CASE_2_CHANNELS:
     AND r27, reg_frame_current, 0x1
     QBNE GPIO_DONE, r27, 0
     JMP DO_GPIO
CASE_4_OR_8_CHANNELS:
     AND r27, do_gpio, 0x3 // only do a DIGITAL every 2 SPI I/O
     QBNE GPIO_DONE, r27, 0 
DO_GPIO:
//from here to GPIO_DONE takes 1.8us, while usually ADC_WAIT_FOR_FINISH only waits for 1.14us.
//TODO: it would be better to split the DIGITAL stuff in two parts:
//- one taking place during DAC_WRITE which sets the GPIO_OE
//- and the other during ADC_WRITE which actually reads DATAIN and writes CLEAR/SET DATAOUT
                            //r27 is actually r27, so do not use r27 from here to ...
     LBBO r27, reg_digital_current, 0, 4 
     JAL r28.w0, DIGITAL // note that this is not called as a macro, but with JAL. r28 will contain the return address
     SBBO r27, reg_digital_current, 0,   4 
                            //..here you can start using r27 again
     ADD reg_digital_current, reg_digital_current, 4 //increment pointer
GPIO_DONE:
     ADC_WAIT_FOR_FINISH
     ADC_RX out
     ADC_CS_UNASSERT
.endm

// Write PRU interrupt controller register beyond 0xFF boundary.
// Temporarily use r0 to store address of PRU interrupt controller.
.macro PRU_ICSS_INTC_REG_WRITE_EXT
.mparam reg, value
  MOV r0, PRU_ICSS_INTC_LOCAL
  MOV r27, value
  MOV r28, reg
  ADD r28, r0, r28
  SBBO r27, r28, 0, 4
.endm

// Read PRU interrupt controller register beyond 0xFF boundary.
// Temporarily use r0 to store address of PRU interrupt controller.
.macro PRU_ICSS_INTC_REG_READ_EXT
.mparam reg, value
  MOV r0, PRU_ICSS_INTC_LOCAL
  MOV r28, reg
  ADD r28, r0, r28
  LBBO value, r28, 0, 4
.endm

// Write PRU config register beyond 0xFF boundary.
// Temporarily use r0 to store address of PRU config module.
.macro PRU_ICSS_CFG_REG_WRITE_EXT
.mparam reg, value
  MOV r0, PRU_ICSS_CFG_LOCAL
  MOV r27, value
  MOV r28, reg
  ADD r28, r0, r28
  SBBO r27, r28, 0, 4
.endm

// Read PRU config register beyond 0xFF boundary.
// Temporarily use r0 to store address of PRU config module.
.macro PRU_ICSS_CFG_REG_READ_EXT
.mparam reg, value
  MOV r0, PRU_ICSS_CFG_LOCAL
  MOV r28, reg
  ADD r28, r0, r28
  LBBO value, r28, 0, 4
.endm

// Write a McASP register
.macro MCASP_REG_WRITE
.mparam reg, value
     MOV r27, value
     SBBO r27, reg_mcasp_addr, reg, 4
.endm

// Write a McASP register beyond the 0xFF boundary
.macro MCASP_REG_WRITE_EXT
.mparam reg, value
     MOV r27, value
     MOV r28, reg
     ADD r28, reg_mcasp_addr, r28
     SBBO r27, r28, 0, 4
.endm

// Write to data port beyond 0xFF boundary
.macro MCASP_WRITE_TO_DATAPORT
.mparam value
    MOV r27, value
    MOV r28, MCASP_DATAPORT
    SBBO r27, r28, 0, 4
.endm

// Read a McASP register
.macro MCASP_REG_READ
.mparam reg, value
     LBBO value, reg_mcasp_addr, reg, 4
.endm
    
// Read a McASP register beyond the 0xFF boundary
.macro MCASP_REG_READ_EXT
.mparam reg, value
     MOV r28, reg
     ADD r28, reg_mcasp_addr, r28
     LBBO value, r28, 0, 4
.endm

// Read from data port beyond 0xFF boundary
.macro MCASP_READ_FROM_DATAPORT
.mparam value
    MOV r28, MCASP_DATAPORT
    LBBO value, r28, 0, 4
.endm
    
// Set a bit and wait for it to come up
.macro MCASP_REG_SET_BIT_AND_POLL
.mparam reg, mask
     MOV r27, mask
     LBBO r28, reg_mcasp_addr, reg, 4
     OR r28, r28, r27
     SBBO r28, reg_mcasp_addr, reg, 4
POLL:
     LBBO r28, reg_mcasp_addr, reg, 4
     AND r28, r28, r27
     QBEQ POLL, r28, 0
.endm

.macro MCASP_TEST_WFIFO
     //TODO: Fill McASP tx fifo here and check for correct word count in WFIFOSTS
     MCASP_WRITE_TO_DATAPORT 0x00000000
     MCASP_WRITE_TO_DATAPORT 0x00000000
     MCASP_WRITE_TO_DATAPORT 0x00000000
     MCASP_WRITE_TO_DATAPORT 0x00000000
     
     MCASP_REG_READ_EXT MCASP_WFIFOSTS, r4
     MCASP_REG_READ_EXT MCASP_RFIFOSTS, r5
     MCASP_REG_READ_EXT MCASP_XSTAT, r6
     MCASP_REG_READ_EXT MCASP_RSTAT, r7

     HALT
.endm

// Multiplexer Capelet: Increment channel on muxes 0-3
.macro MUX_INCREMENT_0_TO_3
     MOV r28, FLAG_MASK_MUX_CONFIG
     AND r28, reg_flags, r28             // Check flags
     QBEQ DONE, r28, 0                   // Skip if disabled
     LSR r28, r28, FLAG_BIT_MUX_CONFIG0
     AND r27, reg_pru1_mux_pins, 0x07    // Current mux channel in r30 bits 2-0
     ADD r27, r27, 1            // Increment channel
     AND r27, r27, 0x07         // Mask to 8 channels
     QBEQ UPDATE, r28, 0x03
     AND r27, r27, 0x03         // Mask to 4 channels
     QBEQ UPDATE, r28, 0x02
     AND r27, r27, 0x01         // Mask to 2 channels
UPDATE:
     MOV r28, 0xFFFFFFF8
     AND r28, reg_pru1_mux_pins, r28  // Mask out low 3 bits of r30
     OR  r28, r28, r27                // Combine with new value
     MOV reg_pru1_mux_pins, r28       // Move back to r30 to propagate to pins
DONE:
.endm

// Multiplexer Capelet: Increment channel on muxes 4-7
.macro MUX_INCREMENT_4_TO_7
     MOV r28, FLAG_MASK_MUX_CONFIG
     AND r28, reg_flags, r28             // Check flags
     QBEQ DONE, r28, 0                   // Skip if disabled
     LSR r28, r28, FLAG_BIT_MUX_CONFIG0
     AND r27, reg_pru1_mux_pins, 0x38    // Current mux channel in r30 bits 5-3
     ADD r27, r27, 8            // Increment channel (+1 LSB starting at bit 3)
     AND r27, r27, 0x38         // Mask to 8 channels
     QBEQ UPDATE, r28, 0x03
     AND r27, r27, 0x18         // Mask to 4 channels
     QBEQ UPDATE, r28, 0x02
     AND r27, r27, 0x08         // Mask to 2 channels
UPDATE:
     MOV r28, 0xFFFFFFC7
     AND r28, reg_pru1_mux_pins, r28  // Mask out bits 5-3 of r30
     OR  r28, r28, r27                // Combine with new value
     MOV reg_pru1_mux_pins, r28       // Move back to r30 to propagate to pins
DONE:
.endm

    
START:
     // Configure PRU to receive external events
     PRU_ICSS_CFG_REG_WRITE_EXT CFG_REG_MII_RT, 0x0

     // Set polarity of system events
     PRU_ICSS_INTC_REG_WRITE_EXT INTC_REG_SIPR0, 0xFFFFFFFF
     PRU_ICSS_INTC_REG_WRITE_EXT INTC_REG_SIPR1, 0xFFFFFFFF

     // Set type of system events
     PRU_ICSS_INTC_REG_WRITE_EXT INTC_REG_SITR0, 0x00000000
     PRU_ICSS_INTC_REG_WRITE_EXT INTC_REG_SITR1, 0x00000000

     // Map McASP0 (Tx / Rx) and McSPI0 interrupts to channel 0
     PRU_ICSS_INTC_REG_WRITE_EXT INTC_REG_CMR11, 0x00000000
     PRU_ICSS_INTC_REG_WRITE_EXT INTC_REG_CMR13, 0x00000000

     // Map interrupt channel N to host interrupt N
     PRU_ICSS_INTC_REG_WRITE_EXT INTC_REG_HMR0, 0x3020100
     PRU_ICSS_INTC_REG_WRITE_EXT INTC_REG_HMR1, 0x7060504
     PRU_ICSS_INTC_REG_WRITE_EXT INTC_REG_HMR2, 0x908

     // Clear all system events (maybe safer to only clear system event 54 and 55)
     PRU_ICSS_INTC_REG_WRITE_EXT INTC_REG_SECR0, 0xFFFFFFFF
     PRU_ICSS_INTC_REG_WRITE_EXT INTC_REG_SECR1, 0xFFFFFFFF

     // Enable system events 44 (SINTERRUPTN), 54 (mcasp_r_intr_pend) and 55 (mcasp_x_intr_pend)
     //PRU_ICSS_INTC_REG_WRITE_EXT INTC_REG_EISR, (0x00000000 | PRU_SYS_EV_MCSPI_INTR)
     PRU_ICSS_INTC_REG_WRITE_EXT INTC_REG_EISR, (0x00000000 | PRU_SYS_EV_MCASP_RX_INTR)
     PRU_ICSS_INTC_REG_WRITE_EXT INTC_REG_EISR, (0x00000000 | PRU_SYS_EV_MCASP_TX_INTR)

     // Clear McASP status bits
     //MCASP_REG_WRITE_EXT MCASP_XSTAT, 0xFF
     //MCASP_REG_WRITE_EXT MCASP_RSTAT, 0xFF

     // Enable all host interrupts (0/1: PRU, 2-9: ARM)
     PRU_ICSS_INTC_REG_WRITE_EXT INTC_REG_HIER, 0x3FF

     // Globally enable all interrupts
     PRU_ICSS_INTC_REG_WRITE_EXT INTC_REG_GER, 0x1

PRU_INTC_INIT_DONE:

     // Load useful registers for addressing SPI
     MOV reg_comm_addr, SHARED_COMM_MEM_BASE
     MOV reg_spi_addr, SPI_BASE
     MOV reg_mcasp_addr, MCASP_BASE

     // Find out which PRU we are running on
     // This affects the following offsets
     MOV  r0, 0x24000      // PRU1 control register offset
     LBBO r2, reg_comm_addr, COMM_PRU_NUMBER, 4
     QBEQ PRU_NUMBER_CHECK_DONE, r2, 1
     MOV  r0, 0x22000      // PRU0 control register offset
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

     // Clear flags
     MOV reg_flags, 0
     // Default number of channels in case SPI disabled
     LDI reg_num_channels, 8

     // Find out whether we should use DIGITAL
     LBBO r2, reg_comm_addr, COMM_USE_DIGITAL, 4
     QBEQ DIGITAL_INIT_DONE, r2, 0 // if we use digital
     SET reg_flags, reg_flags, FLAG_BIT_USE_DIGITAL 
/* This block of code is not really needed, as the memory is initialized by ARM before the PRU is started.
Will leave it here for future reference
DIGITAL_INIT: //set the digital buffer to 0x0000ffff (all inputs), to prevent unwanted high outputs
              //the loop is unrolled by a factor of four just to take advantage of the speed of SBBO on larger byte bursts, but there is no real need for it
     MOV r2, 0x0000ffff //value to store. 0x0000ffff means all inputs
     MOV r3, MEM_DIGITAL_BASE //start of the digital buffer
     MOV r4, MEM_DIGITAL_BASE+2*MEM_DIGITAL_BUFFER1_OFFSET //end of the digital buffer
DIGITAL_INIT_BUFFER_LOOP:
     SBBO r2, r3, 0, 4 
     ADD r3, r3, 4 //increment pointer
     QBGT DIGITAL_INIT_BUFFER_LOOP, r3, r4 //loop until we reach the end of the buffer
*/
DIGITAL_INIT_DONE:
     // Check if we should use an external multiplexer capelet
     // The valid values are 0 (off), 1 (2 ch), 2 (4 ch), 3 (8 ch)
     // This can only happen on PRU1 because of how the pins are mapped
     LBBO r2, reg_comm_addr, COMM_PRU_NUMBER, 4
     QBNE MUX_INIT_DONE, r2, 1
     LBBO r2, reg_comm_addr, COMM_MUX_CONFIG, 4
     AND r2, r2, 0x03
     QBEQ MUX_INIT_DONE, r2, 0
     // If we get here, we are using the mux. Prepare flags and initial state.
     LSL r2, r2, FLAG_BIT_MUX_CONFIG0
     OR  reg_flags, reg_flags, r2
     // Clear lower 6 bits of r30 which controls the mux pins
     MOV r2, 0xFFFFFFC0
     AND reg_pru1_mux_pins, reg_pru1_mux_pins, r2
MUX_INIT_DONE:
    
     // Find out whether we should use SPI ADC and DAC
     LBBO r2, reg_comm_addr, COMM_USE_SPI, 4
     QBEQ SPI_FLAG_CHECK_DONE, r2, 0
     SET reg_flags, reg_flags, FLAG_BIT_USE_SPI
SPI_FLAG_CHECK_DONE:
     // If we don't use SPI, then skip all this init
     QBBC SPI_INIT_DONE, reg_flags, FLAG_BIT_USE_SPI

     // Load the number of channels: valid values are 8, 4 or 2
     LBBO reg_num_channels, reg_comm_addr, COMM_NUM_CHANNELS, 4
     QBGT SPI_NUM_CHANNELS_LT8, reg_num_channels, 8 // 8 > num_channels ?
     LDI reg_num_channels, 8        // If N >= 8, N = 8
     QBA SPI_NUM_CHANNELS_DONE
SPI_NUM_CHANNELS_LT8:   
     QBGT SPI_NUM_CHANNELS_LT4, reg_num_channels, 4 // 4 > num_channels ?
     LDI reg_num_channels, 4        // If N >= 4, N = 4
     QBA SPI_NUM_CHANNELS_DONE
SPI_NUM_CHANNELS_LT4:
     LDI reg_num_channels, 2        // else N = 2
SPI_NUM_CHANNELS_DONE:  
    
     // Init SPI clock
     MOV r2, 0x02
     MOV r3, CLOCK_BASE + CLOCK_SPI0
     SBBO r2, r3, 0, 4

     // Reset SPI and wait for finish
     MOV r2, 0x02
     SBBO r2, reg_spi_addr, SPI_SYSCONFIG, 4

SPI_WAIT_RESET:
     LBBO r2, reg_spi_addr, SPI_SYSSTATUS, 4
     QBBC SPI_WAIT_RESET, r2, 0
    
     // Turn off SPI channels
     MOV r2, 0
     SBBO r2, reg_spi_addr, SPI_CH0CTRL, 4
     SBBO r2, reg_spi_addr, SPI_CH1CTRL, 4
  
     // Set to master; chip select lines enabled (CS0 used for DAC)
     MOV r2, 0x00
     SBBO r2, reg_spi_addr, SPI_MODULCTRL, 4
  
     // Configure CH0 for DAC
     MOV r2, (3 << 27) | (DAC_DPE << 16) | (DAC_TRM << 12) | ((DAC_WL - 1) << 7) | (DAC_CLK_DIV << 2) | DAC_CLK_MODE | (1 << 6)
     SBBO r2, reg_spi_addr, SPI_CH0CONF, 4

     // Configure CH1 for ADC
     MOV r2, (3 << 27) | (ADC_DPE << 16) | (ADC_TRM << 12) | ((ADC_WL - 1) << 7) | (ADC_CLK_DIV << 2) | ADC_CLK_MODE
     SBBO r2, reg_spi_addr, SPI_CH1CONF, 4

     // Enable interrupts TX0_EMPTY__ENABLE for DACs and RX1_FULL__ENABLE for ADCs
     MOV r2, 0x41
     SBBO r2, reg_spi_addr, SPI_IRQENABLE, 4
   
     // Turn on SPI channels
     MOV r2, 0x01
     SBBO r2, reg_spi_addr, SPI_CH0CTRL, 4
     SBBO r2, reg_spi_addr, SPI_CH1CTRL, 4   

     // DAC power-on reset sequence
     MOV r2, (0x07 << AD5668_COMMAND_OFFSET)
     DAC_WRITE r2

     // Initialise ADC
     MOV r2, AD7699_CFG_MASK | (0 << AD7699_CHANNEL_OFFSET) | (0 << AD7699_SEQ_OFFSET)
     ADC_WRITE r2, r2

     // Enable DAC internal reference
     MOV r2, (0x08 << AD5668_COMMAND_OFFSET) | (0x01 << AD5668_REF_OFFSET)
     DAC_WRITE r2
    
     // Read ADC ch0 and ch1: result is always 2 samples behind so start here
     MOV r2, AD7699_CFG_MASK | (0x00 << AD7699_CHANNEL_OFFSET)
     ADC_WRITE r2, r2

     MOV r2, AD7699_CFG_MASK | (0x01 << AD7699_CHANNEL_OFFSET)
     ADC_WRITE r2, r2
SPI_INIT_DONE:
    
    // Prepare McASP0 for audio
    MCASP_REG_WRITE MCASP_GBLCTL, 0         // Disable McASP
    MCASP_REG_WRITE_EXT MCASP_WFIFOCTL, 0x1 // Configure FIFOs
    MCASP_REG_WRITE_EXT MCASP_RFIFOCTL, 0x1
    MCASP_REG_WRITE_EXT MCASP_WFIFOCTL, 0x10001 // Enable FIFOs
    MCASP_REG_WRITE_EXT MCASP_RFIFOCTL, 0x10001
    MCASP_REG_WRITE_EXT MCASP_SRCTL0, 0     // All serialisers off
    MCASP_REG_WRITE_EXT MCASP_SRCTL1, 0
    MCASP_REG_WRITE_EXT MCASP_SRCTL2, 0
    MCASP_REG_WRITE_EXT MCASP_SRCTL3, 0
    MCASP_REG_WRITE_EXT MCASP_SRCTL4, 0
    MCASP_REG_WRITE_EXT MCASP_SRCTL5, 0

    MCASP_REG_WRITE MCASP_PWRIDLESYSCONFIG, 0x02    // Power on
    MCASP_REG_WRITE MCASP_PFUNC, 0x00       // All pins are McASP
    MCASP_REG_WRITE MCASP_PDIR, MCASP_OUTPUT_PINS   // Set pin direction
    MCASP_REG_WRITE MCASP_DLBCTL, 0x00
    MCASP_REG_WRITE MCASP_DITCTL, 0x00
    MCASP_REG_WRITE MCASP_RMASK, MCASP_DATA_MASK    // 16 bit data receive
    MCASP_REG_WRITE MCASP_RFMT, MCASP_DATA_FORMAT   // Set data format
    MCASP_REG_WRITE MCASP_AFSRCTL, MCASP_AFSRCTL_VALUE  // Set receive frameclock
    MCASP_REG_WRITE MCASP_ACLKRCTL, MCASP_ACLKRCTL_VALUE // Set receive bitclock        
    MCASP_REG_WRITE MCASP_AHCLKRCTL, 0x8001     // Internal clock, not inv, /2; irrelevant?
    MCASP_REG_WRITE MCASP_RTDM, MCASP_RTDM_VALUE
    MCASP_REG_WRITE MCASP_RINTCTL, 0x80     // Enable receive start of frame interrupt
    MCASP_REG_WRITE MCASP_XMASK, MCASP_DATA_MASK    // 16 bit data transmit
    MCASP_REG_WRITE MCASP_XFMT, MCASP_DATA_FORMAT   // Set data format
    MCASP_REG_WRITE MCASP_AFSXCTL, MCASP_AFSXCTL_VALUE // Set transmit frameclock
    MCASP_REG_WRITE MCASP_ACLKXCTL, MCASP_ACLKXCTL_VALUE // Set transmit bitclock
    MCASP_REG_WRITE MCASP_AHCLKXCTL, 0x8001     // External clock from AHCLKX
    MCASP_REG_WRITE MCASP_XTDM, MCASP_XTDM_VALUE        
    MCASP_REG_WRITE MCASP_XINTCTL, 0x80     // Enable transmit start of frame interrupt
    MCASP_REG_WRITE_EXT MCASP_SRCTL_R, 0x02     // Set up receive serialiser
    MCASP_REG_WRITE_EXT MCASP_SRCTL_X, 0x01     // Set up transmit serialiser

    MCASP_REG_WRITE MCASP_XSTAT, 0xFF       // Clear transmit errors
    MCASP_REG_WRITE MCASP_RSTAT, 0xFF       // Clear receive errors

    MCASP_REG_SET_BIT_AND_POLL MCASP_RGBLCTL, (1 << 1)  // Set RHCLKRST
    MCASP_REG_SET_BIT_AND_POLL MCASP_XGBLCTL, (1 << 9)  // Set XHCLKRST

// The above write sequence will have temporarily changed the AHCLKX frequency
// The PLL needs time to settle or the sample rate will be unstable and possibly
// cause an underrun. Give it ~1ms before going on.
// 10ns per loop iteration = 10^-8s --> 10^5 iterations needed

     MOV r2, 1 << 28
     MOV r3, GPIO1 + GPIO_SETDATAOUT
     SBBO r2, r3, 0, 4

MOV r2, 100000
MCASP_INIT_WAIT:    
     SUB r2, r2, 1
     QBNE MCASP_INIT_WAIT, r2, 0

     MOV r2, 1 << 28
     MOV r3, GPIO1 + GPIO_CLEARDATAOUT
     SBBO r2, r3, 0, 4

MCASP_REG_SET_BIT_AND_POLL MCASP_RGBLCTL, (1 << 0)  // Set RCLKRST
MCASP_REG_SET_BIT_AND_POLL MCASP_XGBLCTL, (1 << 8)  // Set XCLKRST
MCASP_REG_SET_BIT_AND_POLL MCASP_RGBLCTL, (1 << 2)  // Set RSRCLR
MCASP_REG_SET_BIT_AND_POLL MCASP_XGBLCTL, (1 << 10) // Set XSRCLR
MCASP_REG_SET_BIT_AND_POLL MCASP_RGBLCTL, (1 << 3)  // Set RSMRST
MCASP_REG_SET_BIT_AND_POLL MCASP_XGBLCTL, (1 << 11) // Set XSMRST

// Write a full frame to transmit FIFOs to prevent underflow and keep slots synced
// (This leads to one sample offset. Could be improved)
#ifdef CTAG_FACE_8CH
MCASP_WRITE_TO_DATAPORT 0x00
MCASP_WRITE_TO_DATAPORT 0x00
MCASP_WRITE_TO_DATAPORT 0x00
MCASP_WRITE_TO_DATAPORT 0x00
MCASP_WRITE_TO_DATAPORT 0x00
MCASP_WRITE_TO_DATAPORT 0x00
MCASP_WRITE_TO_DATAPORT 0x00
MCASP_WRITE_TO_DATAPORT 0x00
#else
MCASP_WRITE_TO_DATAPORT 0x00
MCASP_WRITE_TO_DATAPORT 0x00
#endif

MCASP_REG_SET_BIT_AND_POLL MCASP_RGBLCTL, (1 << 4)  // Set RFRST
MCASP_REG_SET_BIT_AND_POLL MCASP_XGBLCTL, (1 << 12) // Set XFRST

// Initialisation
    LBBO reg_frame_total, reg_comm_addr, COMM_BUFFER_FRAMES, 4  // Total frame count (SPI; 0.5x-2x for McASP)
    MOV reg_dac_buf0, 0                      // DAC buffer 0 start pointer
    LSL reg_dac_buf1, reg_frame_total, 1     // DAC buffer 1 start pointer = N[ch]*2[bytes]*bufsize
    LMBD r2, reg_num_channels, 1         // Returns 1, 2 or 3 depending on the number of channels
    LSL reg_dac_buf1, reg_dac_buf1, r2   // Multiply by 2, 4 or 8 to get the N[ch] scaling above
    MOV reg_mcasp_buf0, 0            // McASP DAC buffer 0 start pointer
    LSL reg_mcasp_buf1, reg_frame_total, r2  // McASP DAC buffer 1 start pointer = 2[ch]*2[bytes]*(N/4)[samples/spi]*bufsize
    CLR reg_flags, reg_flags, FLAG_BIT_BUFFER1  // Bit 0 holds which buffer we are on
    CLR reg_flags, reg_flags, FLAG_BIT_MCASP_TX_FIRST_FRAME // 0 = first half of frame period
    CLR reg_flags, reg_flags, FLAG_BIT_MCASP_RX_FIRST_FRAME
    CLR reg_flags, reg_flags, FLAG_BIT_MCASP_TX_PROCESSED // Jump not NEXT_FRAME label if both ADCs and DACs have been processed
    CLR reg_flags, reg_flags, FLAG_BIT_MCASP_RX_PROCESSED
    MOV r2, 0
    SBBO r2, reg_comm_addr, COMM_FRAME_COUNT, 4  // Start with frame count of 0
/* This block of code is not really needed, as the memory is initialized by ARM before the PRU is started.
Will leave it here for future reference
//Initialise all SPI and audio buffers (DAC0, DAC1, ADC0, ADC1) to zero.
//This is useful for analog outs so they do not have spikes during the first buffer.
//This is not very useful for audio, as you still hear the initial "tumpf" when the converter starts 
//and each sample in the DAC buffer is reset to 0 after it is written to the DAC.

    QBBC SPI_INIT_BUFFER_DONE, reg_flags, FLAG_BIT_USE_SPI
//Initialize SPI buffers
//compute the memory offset of the end of the audio buffer and store it in r4
    SUB r4, reg_dac_buf1, reg_dac_buf0 // length of the buffer, assumes reg_dac_buf1>ref_dac_buf0
    LSL r4, r4, 2 //length of four buffers (DAC0, DAC1, ADC0, ADC1)
    ADD r4, reg_dac_buf0, r4 //total offset
    MOV r2, 0// value to store
    MOV r3, 0 // offset counter
SPI_INIT_BUFFER_LOOP:
    SBCO r2, C_ADC_DAC_MEM, r3, 4
    ADD r3, r3, 4
    QBGT SPI_INIT_BUFFER_LOOP, r3, r4
SPI_INIT_BUFFER_DONE:

//Initialize audio buffers
//compute the memory offset of the end of the audio buffer and store it in r4
    SUB r4, reg_mcasp_buf1, reg_mcasp_buf0 // length of the buffer, assumes reg_mcasp_buf1>ref_mcasp_buf0
    LSL r4, r4, 2 //length of four buffers (DAC0, DAC1, ADC0, ADC1)
    ADD r4, reg_mcasp_buf0, r4 //total offset
    MOV r2, 0 // value to store
    MOV r3, 0 // offset counter
    MCASP_INIT_BUFFER_LOOP:
    SBCO r2, C_MCASP_MEM, r3, 4
    ADD r3, r3, 4
    QBGT MCASP_INIT_BUFFER_LOOP, r3, r4
*/

/*
// Here we are out of sync by one TDM slot since the 0 word transmitted above will have occupied
// the first output slot. Send one more word before jumping into the loop.
#ifdef CTAG_FACE_8CH
// the 8 channel version is out of sync by 7 TDM slots.
// Using reg_dac_current as a temp register
MOV reg_dac_current, 7
#endif
MCASP_DAC_WAIT_BEFORE_LOOP: 
     LBBO r2, reg_mcasp_addr, MCASP_XSTAT, 4
     QBBC MCASP_DAC_WAIT_BEFORE_LOOP, r2, MCASP_XSTAT_XDATA_BIT

     MCASP_WRITE_TO_DATAPORT 0x00

// Likewise, read and discard the first sample we get back from the ADC. This keeps the DAC and ADC
// in sync in terms of which TDM slot we are reading (empirically found that we should throw this away
// rather than keep it and invert the phase)

MCASP_ADC_WAIT_BEFORE_LOOP:
     LBBO r2, reg_mcasp_addr, MCASP_RSTAT, 4
     QBBC MCASP_ADC_WAIT_BEFORE_LOOP, r2, MCASP_RSTAT_RDATA_BIT

     MCASP_READ_FROM_DATAPORT r2

#ifdef CTAG_FACE_8CH
     SUB reg_dac_current, reg_dac_current, 1
     QBNE MCASP_DAC_WAIT_BEFORE_LOOP, reg_dac_current, 0
#endif
*/
WRITE_ONE_BUFFER:

     // Write a single buffer of DAC samples and read a buffer of ADC samples
     // Load starting positions
     MOV reg_dac_current, reg_dac_buf0         // DAC: reg_dac_current is current pointer
     LMBD r2, reg_num_channels, 1       // 1, 2 or 3 for 2, 4 or 8 channels
     LSL reg_adc_current, reg_frame_total, r2
     LSL reg_adc_current, reg_adc_current, 2   // N * 2 * 2 * bufsize
     ADD reg_adc_current, reg_adc_current, reg_dac_current // ADC: starts N * 2 * 2 * bufsize beyond DAC
    MOV reg_mcasp_dac_current, reg_mcasp_buf0 // McASP: set current DAC pointer
#ifdef CTAG_FACE_8CH
// TODO: compute reg_mcasp_adc_current appropriately, considering you have now 8 channels
#endif
     LSL reg_mcasp_adc_current, reg_frame_total, r2 // McASP ADC: starts (N/2)*2*2*bufsize beyond DAC
     LSL reg_mcasp_adc_current, reg_mcasp_adc_current, 1
     ADC reg_mcasp_adc_current, reg_mcasp_adc_current, reg_mcasp_dac_current
     MOV reg_frame_current, 0
     QBBS DIGITAL_BASE_CHECK_SET, reg_flags, FLAG_BIT_BUFFER1  //check which buffer we are using for DIGITAL
                  // if we are here, we are using buffer0 
     MOV reg_digital_current, MEM_DIGITAL_BASE
     QBA DIGITAL_BASE_CHECK_DONE
DIGITAL_BASE_CHECK_SET: //if we are here, we are using buffer1 
     MOV reg_digital_current, MEM_DIGITAL_BASE+MEM_DIGITAL_BUFFER1_OFFSET //so adjust offset appropriately
DIGITAL_BASE_CHECK_DONE:

// Here new block of audio is processed
WRITE_LOOP:
     MOV r1, 0

/* ########## EVENT LOOP BEGIN ########## */
EVENT_LOOP:
	 // Check if one tx and rx frame of McASP have been processed.
	 // If yes, increment frame counter.
	 // TODO: Not sure if really needed. Maybe remove to improve performance.
	 // Instead jump to NEXT_FRAME, if ADCs have been processed
	 MOV r27, (1 << FLAG_BIT_MCASP_TX_PROCESSED)
	 OR r27, r27, (1 << FLAG_BIT_MCASP_RX_PROCESSED)
	 AND r27, r27, reg_flags
	 QBEQ NEXT_FRAME, r27, 0x60

     QBBC EVENT_LOOP, r31, PRU_INTR_BIT_CH0
/* ########## EVENT LOOP END ########## */
     

/* ########## INTERRUPT HANDLER BEGIN ########## */
HANDLE_INTERRUPT:
     PRU_ICSS_INTC_REG_READ_EXT INTC_REG_SECR1, r27
     QBBS MCASP_TX_INTR_RECEIVED, r27, PRU_SECR1_SYS_EV_MCASP_TX_INTR
     QBBS MCASP_RX_INTR_RECEIVED, r27, PRU_SECR1_SYS_EV_MCASP_RX_INTR
     //QBBS SYSTEM_EVENT_44_RECEIVED, r10, PRU_SECR1_SYS_EV_MCSPI_INTR

     JMP EVENT_LOOP
/* ########## INTERRUPT HANDLER END ########## */


/* ########## McASP TX ISR BEGIN ########## */
MCASP_TX_INTR_RECEIVED: // mcasp_x_intr_pend
     // Clear system event and status bit
     PRU_ICSS_INTC_REG_WRITE_EXT INTC_REG_SICR, (0x00000000 | PRU_SYS_EV_MCASP_TX_INTR)
     MCASP_REG_WRITE_EXT MCASP_XSTAT, 0x40 // clear XSTAFRM status bit

     // Check if we are in first frame period. If yes, transmit full frame to FIFO.
     // Otherwise jump back to event loop
     QBBS MCASP_TX_ISR_END, reg_flags, FLAG_BIT_MCASP_TX_FIRST_FRAME

     // Temporarily save register states in scratchpad to have enough space for full audio frame.
     // r16 and r17 are used as temp registers
     XOUT SCRATCHPAD_ID_BANK0, r0, 72 // swap r0-r17 with scratch pad bank 0

     // Load audio frame from memory and increment pointer to next frame
#ifdef CTAG_FACE_8CH
     LBCO r0, C_MCASP_MEM, reg_mcasp_dac_current, 16
     ADD reg_mcasp_dac_current, reg_mcasp_dac_current, 16
#else
     LBCO r0, C_MCASP_MEM, reg_mcasp_dac_current, 4
     ADD reg_mcasp_dac_current, reg_mcasp_dac_current, 4
#endif

     //TODO: Change data structure in RAM to 32 bit samples 
     //     => no masking and shifting required
     //     => support for 24 bit audio
     MOV r16, 0xFFFF
     AND r16, r16, r0
     MCASP_WRITE_TO_DATAPORT r16
     LSR r16, r0, 16
     MCASP_WRITE_TO_DATAPORT r16

#ifdef CTAG_FACE_8CH
     MOV r16, 0xFFFF
     AND r16, r16, r1
     MCASP_WRITE_TO_DATAPORT r16
     LSR r16, r1, 16
     MCASP_WRITE_TO_DATAPORT r16

     MOV r16, 0xFFFF
     AND r16, r16, r2
     MCASP_WRITE_TO_DATAPORT r16
     LSR r16, r2, 16
     MCASP_WRITE_TO_DATAPORT r16

     MOV r16, 0xFFFF
     AND r16, r16, r3
     MCASP_WRITE_TO_DATAPORT r16
     LSR r16, r3, 16
     MCASP_WRITE_TO_DATAPORT r16
#endif

     XIN SCRATCHPAD_ID_BANK0, r0, 72 // load back register states from scratchpad
     SET reg_flags, reg_flags, FLAG_BIT_MCASP_TX_PROCESSED

MCASP_TX_ISR_END:
     XOR reg_flags, reg_flags, (1 << FLAG_BIT_MCASP_TX_FIRST_FRAME) // toggle frame flag
     JMP EVENT_LOOP
     //JMP NEXT_FRAME
/* ########## McASP TX ISR END ########## */


/* ########## McASP RX ISR BEGIN ########## */
MCASP_RX_INTR_RECEIVED: // mcasp_r_intr_pend
     // Clear system event and status bit
     PRU_ICSS_INTC_REG_WRITE_EXT INTC_REG_SICR, (0x00000000 | PRU_SYS_EV_MCASP_RX_INTR)
     MCASP_REG_WRITE_EXT MCASP_RSTAT, 0x40 // clear XSTAFRM status bit

     // Check if we are in first frame period. If yes, load full frame from FIFO.
     // Otherwise toggle frame period bit and jump back to event loop
     QBBS MCASP_RX_ISR_END, reg_flags, FLAG_BIT_MCASP_RX_FIRST_FRAME
     set r30.t1

     // Temporarily save register states in scratchpad to have enough space for full audio frame
     // r16 and r17 are used as temp registers
     XOUT SCRATCHPAD_ID_BANK0, r0, 72 // swap r0-r17 with scratch pad bank 0     

     //TODO: Change data structure in RAM to 32 bit samples 
     //     => no masking and shifting required
     //     => support for 24 bit audio
     MCASP_READ_FROM_DATAPORT r16
     MOV r17, 0xFFFF
     AND r0, r16, r17
     MCASP_READ_FROM_DATAPORT r16
     LSL r16, r16, 16
     OR r0, r0, r16

#ifdef CTAG_FACE_8CH
     MCASP_READ_FROM_DATAPORT r16
     MOV r17, 0xFFFF
     AND r1, r16, r17
     MCASP_READ_FROM_DATAPORT r16
     LSL r16, r16, 16
     OR r1, r1, r16

     MCASP_READ_FROM_DATAPORT r16
     MOV r17, 0xFFFF
     AND r2, r16, r17
     MCASP_READ_FROM_DATAPORT r16
     LSL r16, r16, 16
     OR r2, r2, r16

     MCASP_READ_FROM_DATAPORT r16
     MOV r17, 0xFFFF
     AND r3, r16, r17
     MCASP_READ_FROM_DATAPORT r16
     LSL r16, r16, 16
     OR r3, r3, r16

     SBCO r0, C_MCASP_MEM, reg_mcasp_adc_current, 16 // store result
     ADD reg_mcasp_adc_current, reg_mcasp_adc_current, 16 // increment memory pointer
#else
     SBCO r0, C_MCASP_MEM, reg_mcasp_adc_current, 4 // store result
     ADD reg_mcasp_adc_current, reg_mcasp_adc_current, 4 // increment memory pointer
#endif

     XIN SCRATCHPAD_ID_BANK0, r0, 72 // load back register states from scratchpad
     SET reg_flags, reg_flags, FLAG_BIT_MCASP_RX_PROCESSED

MCASP_RX_ISR_END:     
     XOR reg_flags, reg_flags, (1 << FLAG_BIT_MCASP_RX_FIRST_FRAME) // toggle frame flag
     JMP EVENT_LOOP
     //JMP NEXT_FRAME
/* ########## McASP RX ISR END ########## */


NEXT_FRAME:
	 set r30.t0
	 CLR reg_flags, reg_flags, FLAG_BIT_MCASP_TX_PROCESSED
     CLR reg_flags, reg_flags, FLAG_BIT_MCASP_RX_PROCESSED
     LSL r14, reg_frame_total, 1
     ADD reg_frame_current, reg_frame_current, 1
     clr r30.t0
     QBNE EVENT_LOOP, reg_frame_current, r14

ALL_FRAMES_PROCESSED:
     // Now done, swap the buffers and do the next one
     // Use r2 as a temp register
     MOV r2, reg_dac_buf0
     MOV reg_dac_buf0, reg_dac_buf1
     MOV reg_dac_buf1, r2
     MOV r2, reg_mcasp_buf0
     MOV reg_mcasp_buf0, reg_mcasp_buf1
     MOV reg_mcasp_buf1, r2
     XOR reg_flags, reg_flags, (1 << FLAG_BIT_BUFFER1) //flip the buffer flag

     // If multiplexer capelet is enabled, save which channel we got to
     // Muxes 0-3 change at a different time than muxes 4-7 but the first
     // of these is sufficient to capture where we are
     MOV r2, FLAG_MASK_MUX_CONFIG
     AND r2, reg_flags, r2             
     QBEQ MUX_CHANNEL_SAVE_DONE, r2, 0
     AND r2, reg_pru1_mux_pins, 0x07
     SBBO r2, reg_comm_addr, COMM_MUX_END_CHANNEL, 4
MUX_CHANNEL_SAVE_DONE:  
    
     // Notify ARM of buffer swap
     AND r2, reg_flags, (1 << FLAG_BIT_BUFFER1)    // Mask out every but low bit
     SBBO r2, reg_comm_addr, COMM_CURRENT_BUFFER, 4
     MOV R31.b0, PRU1_ARM_INTERRUPT + 16           // Interrupt to host loop
    
     // Increment the frame count in the comm buffer (for status monitoring)
     LBBO r2, reg_comm_addr, COMM_FRAME_COUNT, 4
     ADD r2, r2, reg_frame_total
     SBBO r2, reg_comm_addr, COMM_FRAME_COUNT, 4

     // If LED blink enabled, toggle every 4096 frames
     LBBO r3, reg_comm_addr, COMM_LED_ADDRESS, 4
     QBEQ LED_BLINK_DONE, r3, 0 
     MOV r1, 0x1000
     AND r2, r2, r1          // Test (frame count & 4096)
     QBEQ LED_BLINK_OFF, r2, 0
     LBBO r2, reg_comm_addr, COMM_LED_PIN_MASK, 4   
     MOV r1, GPIO_SETDATAOUT
     ADD r3, r3, r1          // Address for GPIO set register
     SBBO r2, r3, 0, 4       // Set GPIO pin
     QBA LED_BLINK_DONE
LED_BLINK_OFF:
     LBBO r2, reg_comm_addr, COMM_LED_PIN_MASK, 4
     MOV r1, GPIO_CLEARDATAOUT
     ADD r3, r3, r1          // Address for GPIO clear register
     SBBO r2, r3, 0, 4       // Clear GPIO pin  
LED_BLINK_DONE: 
     // Check if we should finish: flag is zero as long as it should run
     LBBO r2, reg_comm_addr, COMM_SHOULD_STOP, 4
     QBEQ WRITE_ONE_BUFFER, r2, 0

CLEANUP:
     MCASP_REG_WRITE MCASP_GBLCTL, 0x00 // Turn off McASP

     // Turn off SPI if enabled
     QBBC SPI_CLEANUP_DONE, reg_flags, FLAG_BIT_USE_SPI
    
     MOV r3, SPI_BASE + SPI_CH0CONF
     LBBO r2, r3, 0, 4
     CLR r2, r2, 13
     CLR r2, r2, 27
     SBBO r2, r3, 0, 4

     MOV r3, SPI_BASE + SPI_CH0CTRL
     LBBO r2, r3, 0, 4
     CLR r2, r2, 1
     SBBO r2, r3, 0, 4      
SPI_CLEANUP_DONE:
     // Turn the LED off, if enabled
     LBBO r3, reg_comm_addr, COMM_LED_ADDRESS, 4
     QBEQ CLEANUP_DONE, r3, 0        
     LBBO r2, reg_comm_addr, COMM_LED_PIN_MASK, 4
     MOV r1, GPIO_CLEARDATAOUT
     ADD r3, r3, r1          // Address for GPIO clear register
     SBBO r2, r3, 0, 4       // Clear GPIO pin  

CLEANUP_DONE:
     // Signal the ARM that we have finished 
     MOV R31.b0, PRU0_ARM_INTERRUPT + 16
     HALT