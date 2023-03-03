.origin 0
.entrypoint START

#include "../include/PruArmCommon.h"

// The jump from  QBEQ WRITE_ONE_BUFFER, r1, 0 is too long when all the devices
// are enabled. The code in there can probably be simplified and/or
// refeactored, maybe using JAL somewhere.
// In the meantime, we have the following switches to enable real-time selection of
// each device. If a device is not `define`d here, then it will not work.
// At least one needs to be selected. Maximum 2 can be selected without having
// the "jump too long" error mentioned above

//#define ENABLE_CTAG_FACE // enables run-time selection of the CTAG Face codec.
//#define ENABLE_CTAG_BEAST // enables run-time selection of the CTAG Beast codecs
#define ENABLE_BELA_TLV32 // enables run-time selection of the Bela TLV32 codec
#define ENABLE_BELA_GENERIC_TDM // enables run-time selection of custom TDM options
#define ENABLE_MUXER // enables run-time selection of the Multiplexer capelet
// there are some issues with this code and this codec.
// See https://github.com/BelaPlatform/Bela/issues/480

#define CTAG_IGNORE_UNUSED_INPUT_TDM_SLOTS
	
#define CLOCK_BASE   0x44E00000
#define CLOCK_MCASP0 0x34
#define CLOCK_SPI0   0x4C
#define CLOCK_SPI1   0x50
#define CLOCK_L4LS   0x60

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
#define SPI_XFERLEVEL 0x7C

// SPI interrupts
#define SPI_INTR_BIT_TX0_EMPTY 0
#define SPI_INTR_BIT_TX0_UNDERFLOW 1
#define SPI_INTR_BIT_RX0_FULL 2
#define SPI_INTR_BIT_RX0_OVERFLOW 3
#define SPI_INTR_BIT_TX1_EMPTY 4
#define SPI_INTR_BIT_TX1_UNDERFLOW 5
#define SPI_INTR_BIT_RX1_FULL 6
#define SPI_INTR_BIT_TX2_EMPTY 8
#define SPI_INTR_BIT_TX2_UNDERFLOW 9
#define SPI_INTR_BIT_RX2_FULL 10
#define SPI_INTR_BIT_TX3_EMPTY 12
#define SPI_INTR_BIT_TX3_UNDERFLOW 13
#define SPI_INTR_BIT_RX3_FULL 14
#define SPI_INTR_BIT_EOW 17 // end of word

#define GPIO0 0x44E07000
#define GPIO1 0x4804C000
#define GPIO_CLEARDATAOUT 0x190
#define GPIO_SETDATAOUT 0x194

// See am335x TRM 4.4.1.2.2 Event Interface Mapping (R31): PRU System Events:
// "The output channels [of R31] 0-15 are connected to the PRU-ICSS INTC system events 16-31, respectively. This allows the PRU to assert one of the system events 16-31 by writing to its own R31 register."
// PRU_SYSTEM_EVENT_RTDM is 20
// We will be writing to output channel 4, which is system event 20 of the PRU-ICSS INTC
#define PRU_SYSTEM_EVENT_RTDM_WRITE_VALUE (1 << 5) | (PRU_SYSTEM_EVENT_RTDM - 16)

#define C_ADC_DAC_MEM C24     // PRU0 mem
#define DAC_GPIO      GPIO0
#define DAC_CS_PIN    (1<<5) // GPIO0:5 = P9 pin 17
#define DAC_TRM       0       // SPI transmit and receive
#define DAC_WL        32      // Word length
#define DAC_CLK_MODE  1       // SPI mode
#define DAC_CLK_DIV   1       // Clock divider (48MHz / 2^n)
#define DAC_DPE       1       // d0 = receive, d1 = transmit

#define AD5668_COMMAND_OFFSET 24
#define AD5668_ADDRESS_OFFSET 20
#define AD5668_DATA_OFFSET    4
#define AD5668_REF_OFFSET     0

#define ADC_GPIO      GPIO1
#define ADC_CS_PIN    (1<<16) // GPIO1:16 = P9 pin 15
// for BELA_MINI, this is the same as DAC_CS_PIN, but the latter is disabled in DAC_WRITE
#define ADC_GPIO_BELA_MINI      GPIO0
#define ADC_CS_PIN_BELA_MINI    (1<<5) // GPIO0:5 = P1 pin 6
#define ADC_TRM       0       // SPI transmit and receive
#define ADC_WL_ADS816X   24   // Word length for ADS816x ADC
#define ADC_WL_AD7699    16   // Word length for AD7699 ADC
#define ADC_CLK_MODE  0       // SPI mode
#define ADC_CLK_DIV   1       // Clock divider (48MHz / 2^n)
#define ADC_DPE       1       // d0 = receive, d1 = transmit

#define AD7699_CFG_MASK       0xF120 // Mask for config update, unipolar, full BW
#define AD7699_CHANNEL_OFFSET 9      // 7 bits offset of a 14-bit left-justified word
#define AD7699_SEQ_OFFSET     3      // sequencer (0 = disable, 3 = scan all)

#define ADS816X_INIT_DEVICE_CFG       0x081C00  // Write DEVICE_CFG to 0x00
#define ADS816X_WRITE_CHANNEL_REG     0x081D00  // Write (0x01 << 19) CHANNEL_REG (0x1D << 8)
#define ADS816X_DATA_OFFSET           8         // Right shift required to get ADC data
#define ADS816X_COMMAND_WRITE         0x080000  // Write register command (0x01 << 19)
#define ADS816X_COMMAND_READ          0x100000  // Read register command (0x02 << 19)
#define ADS816X_REG_ACCESS            0x000000  // REG_ACCESS has address 0 (<< 8)

#define SHARED_COMM_MEM_BASE  		0x00010000  // Location where comm flags are written

// General constants for local PRU peripherals (used for interrupt configuration)
#define PRU_ICSS_INTC_LOCAL     0x00020000
#define PRU_ICSS_CFG_LOCAL      0x00026000

// General constant for PRU system events
// #define PRU_SYS_EV_MCSPI_INTR       44 // SINTERRUPTN

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
#define MCASP_XSTAT_XSYNCERR_BIT        1        // Bit to test if there was an unexpected transmit frame sync
#define MCASP_XSTAT_XCKFAIL_BIT         2        // Bit to test if there was a transmit clock failure
#define MCASP_XSTAT_XDMAERR_BIT         7        // Bit to test if there was a transmit DMA error
#define MCASP_XSTAT_ERROR_BIT           8        // Bit to test if there was a transmit error
#define MCASP_XSTAT_XDATA_BIT           5        // Bit to test for transmit ready
#define MCASP_RSTAT_RDATA_BIT           5        // Bit to test for receive ready 
    
// Constants used for this particular audio setup
#define MCASP_BASE  MCASP0_BASE
#define MCASP_DATAPORT  MCASP0_DATAPORT
#define MCASP_SRCTL_X   MCASP_SRCTL2    // Ser. 2 is transmitter
#define MCASP_SRCTL_R   MCASP_SRCTL0    // Ser. 0 is receiver
#define MCASP_XBUF  MCASP_XBUF2
#define MCASP_RBUF  MCASP_RBUF0

#define MCASP_DATA_MASK     0xFFFF      // 16 bit data
#define MCASP_AHCLKRCTL_VALUE 0x8001     // Internal clock, not inv, /2; irrelevant?
#define MCASP_AHCLKXCTL_VALUE 0x8001     // External clock from AHCLKX
#define MCASP_RINTCTL_VALUE 0x80     // Enable receive start of frame interrupt
#define MCASP_XINTCTL_VALUE 0x80     // Enable transmit start of frame interrupt

#define CTAG_MCASP_DATA_FORMAT_VALUE 0x180F4       // MSB first, 1 bit delay, 32 bits, DAT bus, ROR 16bits
#define CTAG_MCASP_ACLKRCTL_VALUE 0x80       // External clk, polarity (rising edge)

#define CTAG_FACE_MCASP_DATA_FORMAT_TX_VALUE CTAG_MCASP_DATA_FORMAT_VALUE
#define CTAG_FACE_MCASP_DATA_FORMAT_RX_VALUE CTAG_MCASP_DATA_FORMAT_VALUE
#define CTAG_FACE_MCASP_ACLKRCTL_VALUE CTAG_MCASP_ACLKRCTL_VALUE
#define CTAG_FACE_MCASP_ACLKXCTL_VALUE CTAG_MCASP_ACLKRCTL_VALUE
#define CTAG_FACE_MCASP_AHCLKRCTL_VALUE MCASP_AHCLKRCTL_VALUE
#define CTAG_FACE_MCASP_AHCLKXCTL_VALUE MCASP_AHCLKXCTL_VALUE
#define CTAG_FACE_MCASP_AFSRCTL_VALUE 0x410       // 8 Slot TDM, external fsclk, polarity (rising edge), single word
#define CTAG_FACE_MCASP_AFSXCTL_VALUE 0x410       // 8 Slot TDM, external fsclk, polarity (rising edge), single word
#define CTAG_FACE_MCASP_RTDM_VALUE 0xFF           // Enable TDM slots 0 to 7
#define CTAG_FACE_MCASP_XTDM_VALUE 0xFF           // Enable TDM slots 0 to 7
#define CTAG_FACE_MCASP_RINTCTL_VALUE MCASP_RINTCTL_VALUE
#define CTAG_FACE_MCASP_XINTCTL_VALUE MCASP_XINTCTL_VALUE

#define CTAG_BEAST_MCASP_DATA_FORMAT_TX_VALUE CTAG_MCASP_DATA_FORMAT_VALUE
#define CTAG_BEAST_MCASP_DATA_FORMAT_RX_VALUE CTAG_MCASP_DATA_FORMAT_VALUE
#define CTAG_BEAST_MCASP_ACLKRCTL_VALUE CTAG_MCASP_ACLKRCTL_VALUE
#define CTAG_BEAST_MCASP_ACLKXCTL_VALUE CTAG_MCASP_ACLKRCTL_VALUE
#define CTAG_BEAST_MCASP_AHCLKRCTL_VALUE MCASP_AHCLKRCTL_VALUE
#define CTAG_BEAST_MCASP_AHCLKXCTL_VALUE MCASP_AHCLKXCTL_VALUE
#define CTAG_BEAST_MCASP_AFSRCTL_VALUE 0x810       // 16 Slot TDM, external fsclk, polarity (rising edge), single word
#define CTAG_BEAST_MCASP_AFSXCTL_VALUE 0x810       // 16 Slot TDM, external fsclk, polarity (rising edge), single word
#define CTAG_BEAST_MCASP_RTDM_VALUE 0xFFFF         // Enable TDM slots 0 to 15
#define CTAG_BEAST_MCASP_XTDM_VALUE 0xFFFF         // Enable TDM slots 0 to 15
#define CTAG_BEAST_MCASP_RINTCTL_VALUE MCASP_RINTCTL_VALUE
#define CTAG_BEAST_MCASP_XINTCTL_VALUE MCASP_XINTCTL_VALUE

#define C_MCASP_MEM             C28         // Shared PRU mem

// Flags for the flags register
#define FLAG_BIT_BUFFER1    0
#define FLAG_BIT_USE_SPI    1
#define FLAG_BIT_USE_DIGITAL    2
#define FLAG_BIT_MCASP_TX_FIRST_FRAME    3 // Wether we are in first frame of second (0 = first frame)
#define FLAG_BIT_MCASP_RX_FIRST_FRAME    4
#define FLAG_BIT_MCASP_TX_PROCESSED		5
#define FLAG_BIT_MCASP_RX_PROCESSED		6
#define FLAG_BIT_MCSPI_FIRST_FOUR_CH	7

#define FLAG_BIT_MUX_CONFIG0     8      // Mux capelet configuration:
#define FLAG_BIT_MUX_CONFIG1     9      // 00 = off, 01 = 2 ch., 10 = 4 ch., 11 = 8 ch.
#define FLAG_MASK_MUX_CONFIG     0x0300
#define FLAG_BIT_BELA_MINI      10
#define FLAG_BIT_CTAG           11
#define FLAG_BIT_CTAG_FACE      12
#define FLAG_BIT_CTAG_BEAST     13
#define FLAG_BIT_BELA_MULTI_TLV	14
#define FLAG_BIT_ADS816X        15

// reg_flags should hold the number of audio in/out channels, up to 32
#define FLAG_BIT_AUDIO_IN_CHANNELS0 16
#define FLAG_BIT_AUDIO_IN_CHANNELS1 17
#define FLAG_BIT_AUDIO_IN_CHANNELS2 18
#define FLAG_BIT_AUDIO_IN_CHANNELS3 19
#define FLAG_BIT_AUDIO_IN_CHANNELS4 20
#define FLAG_BIT_AUDIO_IN_CHANNELS5 21

#define FLAG_BIT_AUDIO_OUT_CHANNELS0 22
#define FLAG_BIT_AUDIO_OUT_CHANNELS1 23
#define FLAG_BIT_AUDIO_OUT_CHANNELS2 24
#define FLAG_BIT_AUDIO_OUT_CHANNELS3 25
#define FLAG_BIT_AUDIO_OUT_CHANNELS4 26
#define FLAG_BIT_AUDIO_OUT_CHANNELS5 27
        
// Registers used throughout

// r1, r2, r3 are used for temporary storage
#define MEM_DIGITAL_BASE 0x11000 //Base address for DIGITAL : Shared RAM + 0x400
#define MEM_DIGITAL_BUFFER1_OFFSET 0x400 //Start pointer to DIGITAL_BUFFER1, which is 256 words after.
// 256 is the maximum number of frames allowed

#define reg_digital_current r6  	// Pointer to current storage location of DIGITAL
#define reg_num_channels    r9      // Number of SPI ADC/DAC channels to use
#define reg_frame_current   r10     // Current frame count in SPI ADC/DAC transfer
#define reg_frame_mcasp_total r11   // Total frame count for McASP
#define reg_dac_data        r12     // Current dword for SPI DAC
#define reg_adc_data        r13     // Current dword for SPI ADC
#define reg_frame_spi_total r15     // Current dword for SPI ADC/DAC
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

#define REG_MCASP_BUF0_INIT 0

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

.macro SEND_ERROR_TO_ARM
.mparam error
MOV r27, error
SBBO r27, reg_comm_addr, COMM_ERROR_OCCURRED, 4
MOV r31.b0, PRU_SYSTEM_EVENT_RTDM_WRITE_VALUE
.endm

.macro IF_NOT_BELA_TLV32_OR_BELA_MULTI_TLV_JMP_TO
.mparam DEST
    QBBS DEST, reg_flags, FLAG_BIT_CTAG
.endm

.macro IF_NOT_BELA_MULTI_TLV_JMP_TO
.mparam DEST
    QBBC DEST, reg_flags, FLAG_BIT_BELA_MULTI_TLV
.endm

.macro IF_NOT_BELA_TLV32_JMP_TO
.mparam DEST
     QBBS DEST, reg_flags, FLAG_BIT_BELA_MULTI_TLV
     QBBS DEST, reg_flags, FLAG_BIT_CTAG
DONE:
.endm

.macro IF_HAS_ANALOG_DAC_JMP_TO
.mparam DEST
     QBBS DONE, reg_flags, FLAG_BIT_BELA_MINI
     QBA DEST
DONE:
.endm
#define IF_HAS_BELA_SPI_ADC_CS_JMP_TO IF_HAS_ANALOG_DAC_JMP_TO

.macro IF_NOT_CTAG_JMP_TO
.mparam DEST
    QBBC DEST, reg_flags, FLAG_BIT_CTAG
.endm

.macro IF_NOT_CTAG_FACE_JMP_TO
.mparam DEST
    QBBC DEST, reg_flags, FLAG_BIT_CTAG_FACE
.endm

.macro IF_NOT_CTAG_BEAST_JMP_TO
.mparam DEST
    QBBC DEST, reg_flags, FLAG_BIT_CTAG_BEAST
.endm

.macro MCASP_SET_RX
.mparam mcasp_data_format_rx, mcasp_afsrctl_value, mcasp_aclkrctl_value, mcasp_ahclkrctl_value, mcasp_rtdm_value, mcasp_rintctl_value, mcasp_data_mask
    MCASP_REG_WRITE MCASP_RFMT, mcasp_data_format_rx   // Set data format
    MCASP_REG_WRITE MCASP_AFSRCTL, mcasp_afsrctl_value  // Set receive frameclock
    MCASP_REG_WRITE MCASP_ACLKRCTL, mcasp_aclkrctl_value // Set receive bitclock
    MCASP_REG_WRITE MCASP_AHCLKRCTL, mcasp_ahclkrctl_value
    MCASP_REG_WRITE MCASP_RTDM, mcasp_rtdm_value
    MCASP_REG_WRITE MCASP_RINTCTL, mcasp_rintctl_value     // Enable receive start of frame interrupt
    MCASP_REG_WRITE MCASP_RMASK, mcasp_data_mask    // xx bit data transmit
.endm

.macro MCASP_SET_TX
.mparam mcasp_data_format, mcasp_afsxctl_value, mcasp_aclkxctl_value, mcasp_ahclkxctl_value, mcasp_xtdm_value, mcasp_xintctl_value, mcasp_data_mask
    MCASP_REG_WRITE MCASP_XFMT, mcasp_data_format   // Set data format
    MCASP_REG_WRITE MCASP_AFSXCTL, mcasp_afsxctl_value // Set transmit frameclock
    MCASP_REG_WRITE MCASP_ACLKXCTL, mcasp_aclkxctl_value // Set transmit bitclock
    MCASP_REG_WRITE MCASP_AHCLKXCTL, mcasp_ahclkxctl_value
    MCASP_REG_WRITE MCASP_XTDM, mcasp_xtdm_value
    MCASP_REG_WRITE MCASP_XINTCTL, mcasp_xintctl_value
    MCASP_REG_WRITE MCASP_XMASK, mcasp_data_mask    // xx bit data transmit
.endm

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

.macro READ_ACTIVE_CHANNELS_INTO_FLAGS
	LBBO r27, reg_comm_addr, COMM_ACTIVE_CHANNELS, 4
	// the high word contains the number of outputs
	LSR r28, r27, 16
	LSL r28, r28, FLAG_BIT_AUDIO_OUT_CHANNELS0
	OR reg_flags, reg_flags, r28
	// the low word contains the number of inputs
	MOV r28, 0xFFFF
	AND r28, r27, r28
	LSL r28, r28, FLAG_BIT_AUDIO_IN_CHANNELS0
	OR reg_flags, reg_flags, r28
.endm

// Read the number of audio channels from the flags register
.macro GET_NUM_AUDIO_IN_CHANNELS
.mparam DEST
	LSR DEST, reg_flags, FLAG_BIT_AUDIO_IN_CHANNELS0
	AND DEST, DEST, (64-1)
.endm

.macro GET_NUM_MCASP_OUT_CHANNELS
.mparam DEST
	LBBO DEST, reg_comm_addr, COMM_MCASP_OUT_CHANNELS, 4
.endm

.macro GET_NUM_AUDIO_OUT_CHANNELS
.mparam DEST
	LSR DEST, reg_flags, FLAG_BIT_AUDIO_OUT_CHANNELS0
	AND DEST, DEST, (64-1)
.endm

.macro CONFIGURE_FIFO
.mparam fifo_address, reg_value
    // The descriptions for WFIFOCTL and RWFIFOCTL seem to indicate that you
    // need to set the lower bits first and only then set the enable bit.
    // So we mask out the enable bit, write the value, wait a bit for the value
    // to be recorded by the McASP, unmask the bit, write again
    MOV r27, reg_value
    // this has to be r27 (and not r28), or it will be overwritten
    // by MCASP_REG_WRITE_EXT
    CLR r27, r27, 16
    MCASP_REG_WRITE_EXT fifo_address, r27
    MOV r28, 1000
WAIT:
    SUB r28, r28, 1
    QBNE WAIT, r28, 0
    MCASP_REG_WRITE_EXT fifo_address, reg_value
.endm

.macro COMPUTE_TDM_MASK
.mparam reg_io
	QBEQ DONE, reg_io, 0
	MOV r27, 0x1 // mask = (1 << numchannels) - 1
	LSL r27, r27, reg_io
	SUB reg_io, r27, 1
DONE:
.endm

// reg_io should contain number of channels when the macro is called, and will
// contain the output value by the end
.macro COMPUTE_SIZE_OF_BUFFER
.mparam reg_io, reg_total_frames
	// if there are 0 channels, return immediately (reg_io will already contain 0!)
	QBEQ DONE, reg_io, 0
	LSL r27, reg_total_frames, 1 // r27 = 2[bytes]*n[frames]
	MOV r28, reg_io
	// from now on reg_io contains the output value
	MOV reg_io, 0
SIZE_LOOP: // compute r27 * N[ch]
	ADD reg_io, reg_io, r27
	SUB r28, r28, 1
	QBNE SIZE_LOOP, r28, 0
	// now reg_out = N[ch]*2[bytes]*n[frames]
DONE:
.endm

.macro COMPUTE_SIZE_OF_MCASP_DAC_BUFFER
.mparam reg_out
	// The memory needed for one McASP DAC buffer is N[ch]*2[bytes]*n[frames]
	GET_NUM_AUDIO_OUT_CHANNELS reg_out
	COMPUTE_SIZE_OF_BUFFER reg_out, reg_frame_mcasp_total
.endm

// this can only be used after reg_mcasp_buf0 and reg_mcasp_buf1 have been initialized
.macro COMPUTE_SIZE_OF_MCASP_DAC_BUFFER_FAST
.mparam reg_out
        QBGT GREATER, reg_mcasp_buf1, reg_mcasp_buf0
	SUB reg_out, reg_mcasp_buf1, reg_mcasp_buf0
        QBA DONE
GREATER:
	SUB reg_out, reg_mcasp_buf0, reg_mcasp_buf1
DONE:
.endm

.macro COMPUTE_SIZE_OF_MCASP_ADC_BUFFER
.mparam reg_out
	// The memory needed for one McASP DAC buffer is N[ch]*2[bytes]*n[frames]
	GET_NUM_AUDIO_IN_CHANNELS reg_out
	COMPUTE_SIZE_OF_BUFFER reg_out, reg_frame_mcasp_total
.endm

QBA START_INTERMEDIATE // when first starting, go to START, skipping this section.

DIGITAL:
//IMPORTANT: do NOT use r28 in this macro, as it contains the return address for JAL
//r27 is now the input word passed in render(), one word per frame
//[31:16]: data(1=high, 0=low), [15:0]: direction (0=output, 1=input) )

// Prepare a write to the ADC depending on which part we use
// Register holds channel number at input, then turns into
// the value to write to the ADC to read that channel
.macro ADC_PREPARE_DATA
.mparam data
QBBC ADC_IS_AD7699, reg_flags, FLAG_BIT_ADS816X
     MOV r27, ADS816X_WRITE_CHANNEL_REG
     OR data, data, r27
     QBA DONE
ADC_IS_AD7699:
     MOV r27, AD7699_CFG_MASK
     LSL data, data, AD7699_CHANNEL_OFFSET
     OR data, data, r27
DONE:
.endm

// Process the results of the ADC transaction to retrieve
// the sampled value
.macro ADC_PROCESS_DATA
.mparam data
QBBC DONE, reg_flags, FLAG_BIT_ADS816X
     // Right shift ADC output to get result
     LSR data, data, ADS816X_DATA_OFFSET
DONE:
.endm

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
//map GPIO to gpio1 pins,
//r2 is gpio1_oe, r8 is gpio1_setdataout, r7 is gpio1_cleardataout, r27 is the input word
//the following operations will read from r27 and update r2,r7,r8
QBBS BELA_SET_GPIO_BITS_0_MINI, reg_flags, FLAG_BIT_BELA_MINI
QBA BELA_SET_GPIO_BITS_0_NOT_MINI
BELA_SET_GPIO_BITS_0_MINI:
    SET_GPIO_BITS r2, r8, r7, 18, 0, r27
    SET_GPIO_BITS r2, r8, r7, 27, 1, r27
    SET_GPIO_BITS r2, r8, r7, 26, 2, r27
    SET_GPIO_BITS r2, r8, r7, 25, 3, r27
    SET_GPIO_BITS r2, r8, r7, 28, 4, r27
    SET_GPIO_BITS r2, r8, r7, 20, 5, r27
    SET_GPIO_BITS r2, r8, r7, 15, 6, r27
    SET_GPIO_BITS r2, r8, r7, 14, 8, r27
    SET_GPIO_BITS r2, r8, r7, 12, 9, r27
    SET_GPIO_BITS r2, r8, r7, 9, 10, r27
    SET_GPIO_BITS r2, r8, r7, 8, 11, r27
    SET_GPIO_BITS r2, r8, r7, 10, 14, r27
    SET_GPIO_BITS r2, r8, r7, 11, 15, r27
QBA SET_GPIO_BITS_0_DONE
BELA_SET_GPIO_BITS_0_NOT_MINI:
    SET_GPIO_BITS r2, r8, r7, 13, 4, r27
    SET_GPIO_BITS r2, r8, r7, 12, 5, r27
    SET_GPIO_BITS r2, r8, r7, 28, 6, r27
    SET_GPIO_BITS r2, r8, r7, 18, 7, r27
    SET_GPIO_BITS r2, r8, r7, 15, 8, r27
    SET_GPIO_BITS r2, r8, r7, 14, 9, r27
    SET_GPIO_BITS r2, r8, r7, 19, 10, r27
SET_GPIO_BITS_0_DONE:
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
//map GPIO to gpio2 pins
//r3 is gpio2_oe, r5 is gpio2_setdataout, r4 is gpio2_cleardataout, r27 is the input word
//the following operations will read from r27 and update r3,r4,r5
QBBS BELA_SET_GPIO_BITS_1_MINI, reg_flags, FLAG_BIT_BELA_MINI
QBA BELA_SET_GPIO_BITS_1_NOT_MINI
BELA_SET_GPIO_BITS_1_MINI:
    SET_GPIO_BITS r3, r5, r4, 0, 7, r27
    SET_GPIO_BITS r3, r5, r4, 22, 12, r27
    SET_GPIO_BITS r3, r5, r4, 24, 13, r27
    QBA SET_GPIO_BITS_1_DONE
BELA_SET_GPIO_BITS_1_NOT_MINI:
    SET_GPIO_BITS r3, r5, r4, 2, 0, r27
    SET_GPIO_BITS r3, r5, r4, 3, 1, r27
    SET_GPIO_BITS r3, r5, r4, 5, 2, r27
    SET_GPIO_BITS r3, r5, r4, 4, 3, r27
    SET_GPIO_BITS r3, r5, r4, 1, 11, r27
    SET_GPIO_BITS r3, r5, r4, 22, 12, r27
    SET_GPIO_BITS r3, r5, r4, 24, 13, r27
    SET_GPIO_BITS r3, r5, r4, 23, 14, r27
    SET_GPIO_BITS r3, r5, r4, 25, 15, r27
SET_GPIO_BITS_1_DONE:
//set the output enable register for gpio2.
    MOV r2, GPIO2 | GPIO_OE  //use r2 as a temp registerp
    SBBO r3, r2, 0, 4 //takes two cycles (10ns)
//GPIO2-end
//r3 is now unused

QBA START_INTERMEDIATE_DONE
START_INTERMEDIATE: // intermediate step to jump to START
    QBA START
START_INTERMEDIATE_DONE:

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
QBBS BELA_READ_GPIO_BITS_MINI, reg_flags, FLAG_BIT_BELA_MINI
QBA BELA_READ_GPIO_BITS_NOT_MINI
BELA_READ_GPIO_BITS_MINI:
//GPIO1
    READ_GPIO_BITS r2, 18, 0, r27
    READ_GPIO_BITS r2, 27, 1, r27
    READ_GPIO_BITS r2, 26, 2, r27
    READ_GPIO_BITS r2, 25, 3, r27
    READ_GPIO_BITS r2, 28, 4, r27
    READ_GPIO_BITS r2, 20, 5, r27
    READ_GPIO_BITS r2, 15, 6, r27
    READ_GPIO_BITS r2, 14, 8, r27
    READ_GPIO_BITS r2, 12, 9, r27
    READ_GPIO_BITS r2, 9, 10, r27
    READ_GPIO_BITS r2, 8, 11, r27
    READ_GPIO_BITS r2, 10, 14, r27
    READ_GPIO_BITS r2, 11, 15, r27
//GPIO2
    READ_GPIO_BITS r3, 0, 7, r27
    READ_GPIO_BITS r3, 22, 12, r27
    READ_GPIO_BITS r3, 24, 13, r27
    QBA READ_GPIO_BITS_DONE
BELA_READ_GPIO_BITS_NOT_MINI:
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
READ_GPIO_BITS_DONE:
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
     QBBS SKIP_DAC_WRITE_1, reg_flags, FLAG_BIT_BELA_MINI
     DAC_CS_ASSERT
SKIP_DAC_WRITE_1:	 
     DAC_TX reg
     DAC_WAIT_FOR_FINISH
     QBBS SKIP_DAC_WRITE_2, reg_flags, FLAG_BIT_BELA_MINI
     DAC_CS_UNASSERT
SKIP_DAC_WRITE_2:
     DAC_DISCARD_RX
.endm

.macro DAC_WRITE_ALL_ZEROS
.mparam tempreg
//command 0x3: write and update DAC channel n
//address 0xf: write to all channels
//data: 0
     MOV tempreg, ((0x3 << AD5668_COMMAND_OFFSET) | (0xf << AD5668_ADDRESS_OFFSET) )
     DAC_WRITE tempreg
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
     IF_HAS_BELA_SPI_ADC_CS_JMP_TO BELA_CS
     MOV r27, ADC_CS_PIN_BELA_MINI
     MOV r28, ADC_GPIO_BELA_MINI + GPIO_CLEARDATAOUT
     QBA DONE
BELA_CS:
     MOV r27, ADC_CS_PIN
     MOV r28, ADC_GPIO + GPIO_CLEARDATAOUT
DONE:
     SBBO r27, r28, 0, 4
.endm

// Bring CS line high at end of ADC transaction
.macro ADC_CS_UNASSERT
     IF_HAS_BELA_SPI_ADC_CS_JMP_TO BELA_CS
     MOV r27, ADC_CS_PIN_BELA_MINI
     MOV r28, ADC_GPIO_BELA_MINI + GPIO_SETDATAOUT
     QBA DONE
BELA_CS:
     MOV r27, ADC_CS_PIN
     MOV r28, ADC_GPIO + GPIO_SETDATAOUT
DONE:
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

.macro DO_DIGITAL
// execution from here to the end of the macro takes 1.8us, while usually
// ADC_WAIT_FOR_FINISH only waits for 1.14us.
//TODO: it would be better to split the DIGITAL stuff in two parts:
//- one taking place during DAC_WRITE which sets the GPIO_OE
//- and the other during ADC_WRITE which actually reads DATAIN and writes CLEAR/SET DATAOUT
     // do not use r27 from here to ...
     LBBO r27, reg_digital_current, 0, 4
     JAL r28.w0, DIGITAL // note that this is not called as a macro, but with JAL. r28 will contain the return address
     // in the low word, set the bits corresponding to output values to 0
     // this way, if the ARM program crashes, the PRU will write 0s to the outputs
     LSL r28, r27, 16
     // high word now contains bitmask with 0s where outputs are
     AND r27.w2, r28.w2, r27.w2 // mask them out
     SBBO r27, reg_digital_current, 0, 4
     //..here you can start using r27 again
     ADD reg_digital_current, reg_digital_current, 4 //increment pointer
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
     DO_DIGITAL
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
.mparam start_reg, num_bytes
    MOV r28, MCASP_DATAPORT
    SBBO start_reg, r28, 0, num_bytes
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
.mparam start_reg, num_bytes
    MOV r28, MCASP_DATAPORT
    LBBO start_reg, r28, 0, num_bytes
.endm
    
.macro FIFO_READ_2_WORDS_AND_PACK
.mparam reg_dest, reg_tmp1, reg_tmp2
	MCASP_READ_FROM_DATAPORT reg_tmp1, 8
	AND reg_dest, reg_tmp1, r17
	LSL reg_tmp2,reg_tmp2, 16
	OR reg_dest, reg_dest, reg_tmp2
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
     // Initialize scratchpad 2 for test data
     MOV r0, 0
     MOV r1, 0
     MOV r2, 0
     MOV r3, 0
     MOV r4, 0
     XOUT SCRATCHPAD_ID_BANK2, r0, 20

     // Configure PRU to receive external events: disable all MII_RT events
     PRU_ICSS_CFG_REG_WRITE_EXT CFG_REG_MII_RT, 0x0

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

     // Clear McSPI irq status bits
     MOV r2, 0x7F
     SBBO r2, reg_spi_addr, SPI_IRQSTATUS, 4

     // Clear flags
     MOV reg_flags, 0
     // Default number of channels in case SPI disabled
     LDI reg_num_channels, 8

     LBBO r2, reg_comm_addr, COMM_BOARD_FLAGS, 4
     // Find out whether we are on BELA_MINI
     QBBC BELA_MINI_CHECK_DONE, r2, BOARD_FLAGS_BELA_MINI
     SET reg_flags, reg_flags, FLAG_BIT_BELA_MINI
BELA_MINI_CHECK_DONE:
	 // Find out whether we are on a multi-TLV Bela setup
     QBBC BELA_MULTI_TLV_CHECK_DONE, r2, BOARD_FLAGS_BELA_GENERIC_TDM
     SET reg_flags, reg_flags, FLAG_BIT_BELA_MULTI_TLV
BELA_MULTI_TLV_CHECK_DONE: 
     // Find out whether we are on CTAG_FACE
     QBBC CTAG_FACE_CHECK_DONE, r2, BOARD_FLAGS_CTAG_FACE
     SET reg_flags, reg_flags, FLAG_BIT_CTAG_FACE
     SET reg_flags, reg_flags, FLAG_BIT_CTAG
CTAG_FACE_CHECK_DONE:
     // Find out whether we are on CTAG_BEAST
     QBBC CTAG_BEAST_CHECK_DONE, r2, BOARD_FLAGS_CTAG_BEAST
     SET reg_flags, reg_flags, FLAG_BIT_CTAG_BEAST
     SET reg_flags, reg_flags, FLAG_BIT_CTAG
CTAG_BEAST_CHECK_DONE:

     // Find out whether we should use DIGITAL
     LBBO r2, reg_comm_addr, COMM_USE_DIGITAL, 4
     QBEQ DIGITAL_INIT_DONE, r2, 0 // if we use digital
     SET reg_flags, reg_flags, FLAG_BIT_USE_DIGITAL 

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
     LBBO reg_num_channels, reg_comm_addr, COMM_SPI_NUM_CHANNELS, 4
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
  
     // Set to master; chip select lines enabled (CS0 used for DAC); 
     // Multiple word access via OCP bus (TODO: evaluate performance)
     MOV r2, 0x80
     SBBO r2, reg_spi_addr, SPI_MODULCTRL, 4
  
     // Configure CH0 for DAC
     MOV r2, (3 << 27) | (DAC_DPE << 16) | (DAC_TRM << 12) | ((DAC_WL - 1) << 7) | (DAC_CLK_DIV << 2) | DAC_CLK_MODE | (1 << 6)
     SBBO r2, reg_spi_addr, SPI_CH0CONF, 4

     // Configure CH1 for ADC, starting with ADS816X
     MOV r2, (3 << 27) | (ADC_DPE << 16) | (ADC_TRM << 12) | ((ADC_WL_ADS816X - 1) << 7) | (ADC_CLK_DIV << 2) | ADC_CLK_MODE
     SBBO r2, reg_spi_addr, SPI_CH1CONF, 4

     // Enable interrupts TX0_EMPTY__ENABLE for DACs and RX1_FULL__ENABLE for ADCs
     MOV r2, 0x41
     SBBO r2, reg_spi_addr, SPI_IRQENABLE, 4

     // Set buffer level threshold for interrupts (14 words (7ch) for tx and rx)
     // TODO: Configure dynamically for variable number of channels
     MOV r2, 0xE0E
     SBBO r2, reg_spi_addr, SPI_XFERLEVEL, 4
   
     // Turn on SPI channels
     MOV r2, 0x01
     SBBO r2, reg_spi_addr, SPI_CH0CTRL, 4
     SBBO r2, reg_spi_addr, SPI_CH1CTRL, 4   

     // DAC power-on reset sequence
     MOV r2, (0x07 << AD5668_COMMAND_OFFSET)
     DAC_WRITE r2

     // Detect ADS816x ADC by writing and reading back a magic number in a register
     // This will have no effect as REG_ACCESS needs to be 0xAA to enable writing control
     // registers (which we don't need to do anyway), and on AD7699 it will also not update
     // any of the registers.
     SET reg_flags, reg_flags, FLAG_BIT_ADS816X

     MOV r2, ADS816X_COMMAND_WRITE | ADS816X_REG_ACCESS | 0x05
     ADC_WRITE r2, r2

     MOV r2, ADS816X_COMMAND_READ | ADS816X_REG_ACCESS | 0x00
     ADC_WRITE r2, r2

     // Read back REG_ACCESS and initialise ADC
     MOV r2, ADS816X_INIT_DEVICE_CFG
     ADC_WRITE r2, r2

     // REG_ACCESS is in top 8 bits of a 24-bit word
     LSR r2, r2, 16
     QBEQ ADC_INIT_DONE, r2, 0x05

     // Expected value not found: assume AD7699 and reinit SPI

     // Turn off ADC SPI channels
     MOV r2, 0x00
     SBBO r2, reg_spi_addr, SPI_CH1CTRL, 4

     // Configure CH1 for AD7699 instead
     MOV r2, (3 << 27) | (ADC_DPE << 16) | (ADC_TRM << 12) | ((ADC_WL_AD7699 - 1) << 7) | (ADC_CLK_DIV << 2) | ADC_CLK_MODE
     SBBO r2, reg_spi_addr, SPI_CH1CONF, 4

     // Turn on ADC SPI channels
     MOV r2, 0x01
     SBBO r2, reg_spi_addr, SPI_CH1CTRL, 4

     CLR reg_flags, reg_flags, FLAG_BIT_ADS816X

ADC_INIT_DONE:

     // Enable DAC internal reference
     MOV r2, (0x08 << AD5668_COMMAND_OFFSET) | (0x01 << AD5668_REF_OFFSET)
     DAC_WRITE r2
    
     // Read ADC ch0 and ch1: result is always 2 samples behind so start here
     MOV r2, 0x00
     ADC_PREPARE_DATA r2
     ADC_WRITE r2, r2

     MOV r2, 0x01
     ADC_PREPARE_DATA r2
     ADC_WRITE r2, r2

SPI_INIT_DONE:	
// this limit is because of how data is loaded in blocks from RAM and unrolled into registers. Changes to WRITE_ONE_BUFFER could extend it
#define MCASP_MAX_CHANNELS 16

    // Check how many channels we have
    READ_ACTIVE_CHANNELS_INTO_FLAGS
    GET_NUM_AUDIO_IN_CHANNELS r2
    GET_NUM_MCASP_OUT_CHANNELS r3
    // And that they are a valid number:
    // at least one input OR output channel
    ADD r4, r2, r3
    QBEQ INIT_ERROR, r4, 0
    // smaller than the max (yes, operator order is confusing)
    QBLT INIT_ERROR, r2, MCASP_MAX_CHANNELS
    QBLT INIT_ERROR, r3, MCASP_MAX_CHANNELS
    // consistent
    GET_NUM_AUDIO_OUT_CHANNELS r2
    QBLT INIT_ERROR, r2, r3
    QBA CHANNEL_COUNT_OK
INIT_ERROR:
    SEND_ERROR_TO_ARM ARM_ERROR_INVALID_INIT
    HALT
CHANNEL_COUNT_OK:

// Initialisation of PRU memory pointers and counters
    LBBO reg_frame_mcasp_total, reg_comm_addr, COMM_BUFFER_MCASP_FRAMES, 4  // Total frame count for McASP
    LBBO reg_frame_spi_total, reg_comm_addr, COMM_BUFFER_SPI_FRAMES, 4 // Total frame count for SPI
    MOV reg_dac_buf0, 0                      // DAC buffer 0 start pointer
    LSL reg_dac_buf1, reg_frame_spi_total, 1     // DAC buffer 1 start pointer = N[ch]*2[bytes]*bufsize
    ADD reg_dac_buf1, reg_dac_buf1, reg_dac_buf0
    LMBD r2, reg_num_channels, 1         // Returns 1, 2 or 3 depending on the number of channels
    LSL reg_dac_buf1, reg_dac_buf1, r2   // Multiply by 2, 4 or 8 to get the N[ch] scaling above
    MOV reg_mcasp_buf0, REG_MCASP_BUF0_INIT // McASP DAC buffer 0 start pointer
    COMPUTE_SIZE_OF_MCASP_DAC_BUFFER r2
    ADD reg_mcasp_buf1, r2, reg_mcasp_buf0
    CLR reg_flags, reg_flags, FLAG_BIT_BUFFER1  // Bit 0 holds which buffer we are on
    SET reg_flags, reg_flags, FLAG_BIT_MCASP_TX_FIRST_FRAME // 0 = first half of frame period
    SET reg_flags, reg_flags, FLAG_BIT_MCASP_RX_FIRST_FRAME
    CLR reg_flags, reg_flags, FLAG_BIT_MCASP_TX_PROCESSED // Jump not NEXT_FRAME label if both ADCs and DACs have been processed
    CLR reg_flags, reg_flags, FLAG_BIT_MCASP_RX_PROCESSED
    SET reg_flags, reg_flags, FLAG_BIT_MCSPI_FIRST_FOUR_CH
    MOV r2, 0
    SBBO r2, reg_comm_addr, COMM_FRAME_COUNT, 4  // Start with frame count of 0
	
    // enable MCASP interface clock in PRCM
    MOV r2, 0x30002
    MOV r3, CLOCK_BASE + CLOCK_MCASP0
    SBBO r2, r3, 0, 4

    // Prepare McASP0 for audio
MCASP_INIT:
MCASP_ERROR_RECOVERY: // we also come back here if there are any issues while running

// Comments on McASP initialisation below are from the AM335x TRM, TI SPRUH73H
// 22.3.12.2 Transmit/Receive Section Initialization
// You must follow the following steps to properly configure the McASP. If
// external clocks are used, they should be present prior to the following
// initialization steps
// 1. Reset McASP to default values by setting GBLCTL = 0.
    MCASP_REG_WRITE MCASP_GBLCTL, 0         // Disable McASP
    // Configure FIFOs
    LBBO r2, reg_comm_addr, COMM_MCASP_CONF_WFIFOCTL, 4
    CONFIGURE_FIFO MCASP_WFIFOCTL, r2
    LBBO r2, reg_comm_addr, COMM_MCASP_CONF_RFIFOCTL, 4
    CONFIGURE_FIFO MCASP_RFIFOCTL, r2
    MCASP_REG_WRITE_EXT MCASP_SRCTL0, 0     // All serialisers off
    MCASP_REG_WRITE_EXT MCASP_SRCTL1, 0
    MCASP_REG_WRITE_EXT MCASP_SRCTL2, 0
    MCASP_REG_WRITE_EXT MCASP_SRCTL3, 0
    MCASP_REG_WRITE_EXT MCASP_SRCTL4, 0
    MCASP_REG_WRITE_EXT MCASP_SRCTL5, 0

// 2. Configure all McASP registers except GBLCTL in the following order:
// (a) Power Idle SYSCONFIG: PWRIDLESYSCONFIG.
    MCASP_REG_WRITE MCASP_PWRIDLESYSCONFIG, 0x02    // Power on

// (b) Receive registers: RMASK, RFMT, AFSRCTL, ACLKRCTL, AHCLKRCTL, RTDM,
// RINTCTL, RCLKCHK. If external clocks AHCLKR and/or ACLKR are used, they must
// be running already for proper synchronization of the GBLCTL register.
#ifdef ENABLE_CTAG_FACE
    IF_NOT_CTAG_FACE_JMP_TO MCASP_SET_RX_NOT_CTAG_FACE
    MCASP_SET_RX CTAG_FACE_MCASP_DATA_FORMAT_RX_VALUE, CTAG_FACE_MCASP_AFSRCTL_VALUE, CTAG_FACE_MCASP_ACLKRCTL_VALUE, CTAG_FACE_MCASP_AHCLKRCTL_VALUE, CTAG_FACE_MCASP_RTDM_VALUE, CTAG_FACE_MCASP_RINTCTL_VALUE, MCASP_DATA_MASK
    QBA MCASP_SET_RX_DONE
MCASP_SET_RX_NOT_CTAG_FACE:
#endif /* ENABLE_CTAG_FACE */
#ifdef ENABLE_CTAG_BEAST
    IF_NOT_CTAG_BEAST_JMP_TO MCASP_SET_RX_NOT_CTAG_BEAST
    MCASP_SET_RX CTAG_BEAST_MCASP_DATA_FORMAT_RX_VALUE, CTAG_BEAST_MCASP_AFSRCTL_VALUE, CTAG_BEAST_MCASP_ACLKRCTL_VALUE, CTAG_BEAST_MCASP_AHCLKRCTL_VALUE, CTAG_BEAST_MCASP_RTDM_VALUE, CTAG_BEAST_MCASP_RINTCTL_VALUE, MCASP_DATA_MASK
    QBA MCASP_SET_RX_DONE
MCASP_SET_RX_NOT_CTAG_BEAST:
#endif /* ENABLE_CTAG_BEAST */
    IF_NOT_BELA_TLV32_OR_BELA_MULTI_TLV_JMP_TO MCASP_SET_RX_NOT_BELA_TLV32_OR_BELA_MULTI_TLV
    LBBO r1, reg_comm_addr, COMM_MCASP_CONF_RFMT, 4
    LBBO r2, reg_comm_addr, COMM_MCASP_CONF_AFSRCTL, 4
    LBBO r3, reg_comm_addr, COMM_MCASP_CONF_ACLKRCTL, 4
    LBBO r4, reg_comm_addr, COMM_MCASP_CONF_AHCLKRCTL, 4
    LBBO r5, reg_comm_addr, COMM_MCASP_CONF_RTDM, 4
    LBBO r6, reg_comm_addr, COMM_MCASP_CONF_RMASK, 4
//TODO: set RCLKCHK
    MCASP_SET_RX r1, r2, r3, r4, r5, MCASP_RINTCTL_VALUE, r6
    QBA MCASP_SET_RX_DONE
MCASP_SET_RX_NOT_BELA_TLV32_OR_BELA_MULTI_TLV:

MCASP_SET_RX_DONE:

// (c) Transmit registers: XMASK, XFMT, AFSXCTL, ACLKXCTL, AHCLKXCTL, XTDM,
// XINTCTL, XCLKCHK. If external clocks AHCLKX and/or ACLKX are used, they must be
// running already for proper synchronization of the GBLCTL register.
// set MCASP TX
#ifdef ENABLE_CTAG_FACE
    IF_NOT_CTAG_FACE_JMP_TO MCASP_SET_TX_NOT_CTAG_FACE
    MCASP_SET_TX CTAG_FACE_MCASP_DATA_FORMAT_TX_VALUE, CTAG_FACE_MCASP_AFSXCTL_VALUE, CTAG_FACE_MCASP_ACLKXCTL_VALUE, CTAG_FACE_MCASP_AHCLKXCTL_VALUE, CTAG_FACE_MCASP_XTDM_VALUE, CTAG_FACE_MCASP_XINTCTL_VALUE, MCASP_DATA_MASK
    QBA MCASP_SET_TX_DONE
MCASP_SET_TX_NOT_CTAG_FACE:
#endif /* ENABLE_CTAG_FACE */
#ifdef ENABLE_CTAG_BEAST
    IF_NOT_CTAG_BEAST_JMP_TO MCASP_SET_TX_NOT_CTAG_BEAST
    MCASP_SET_TX CTAG_BEAST_MCASP_DATA_FORMAT_TX_VALUE, CTAG_BEAST_MCASP_AFSXCTL_VALUE, CTAG_BEAST_MCASP_ACLKXCTL_VALUE, CTAG_BEAST_MCASP_AHCLKXCTL_VALUE, CTAG_BEAST_MCASP_XTDM_VALUE, CTAG_BEAST_MCASP_XINTCTL_VALUE, MCASP_DATA_MASK
    QBA MCASP_SET_TX_DONE
MCASP_SET_TX_NOT_CTAG_BEAST:
#endif /* ENABLE_CTAG_BEAST */
    IF_NOT_BELA_TLV32_OR_BELA_MULTI_TLV_JMP_TO MCASP_SET_TX_NOT_BELA_TLV32_OR_BELA_MULTI_TLV

    LBBO r1, reg_comm_addr, COMM_MCASP_CONF_XFMT, 4
    LBBO r2, reg_comm_addr, COMM_MCASP_CONF_AFSXCTL, 4
    LBBO r3, reg_comm_addr, COMM_MCASP_CONF_ACLKXCTL, 4
    LBBO r4, reg_comm_addr, COMM_MCASP_CONF_AHCLKXCTL, 4
    LBBO r5, reg_comm_addr, COMM_MCASP_CONF_XTDM, 4
    LBBO r6, reg_comm_addr, COMM_MCASP_CONF_XMASK, 4
//TODO: set XCLKCHK
    MCASP_SET_TX r1, r2, r3, r4, r5, MCASP_XINTCTL_VALUE, r6
    QBA MCASP_SET_TX_DONE
MCASP_SET_TX_NOT_BELA_TLV32_OR_BELA_MULTI_TLV:

MCASP_SET_TX_DONE:

// (d) Serializer registers: SRCTL[n].
    IF_NOT_CTAG_JMP_TO MCASP_SRCTL_NOT_CTAG
    MCASP_REG_WRITE_EXT MCASP_SRCTL_R, 0x02     // Set up receive serialiser
    MCASP_REG_WRITE_EXT MCASP_SRCTL_X, 0x01     // Set up transmit serialiser
MCASP_SRCTL_NOT_CTAG:
    IF_NOT_BELA_TLV32_OR_BELA_MULTI_TLV_JMP_TO MCASP_SRCTL_NOT_BELA_TLV32_OR_BELA_MULTI_TLV
    LBBO r1, reg_comm_addr, COMM_MCASP_CONF_SRCTLN, 4
    // 4 bytes, one for each of SRCTL[0]...SRCTL[3]
    MOV r2, 0
    MOV r2, r1.b0
    MCASP_REG_WRITE_EXT MCASP_SRCTL0, r2
    MOV r2, r1.b1
    MCASP_REG_WRITE_EXT MCASP_SRCTL1, r2
    MOV r2, r1.b2
    MCASP_REG_WRITE_EXT MCASP_SRCTL2, r2
    MOV r2, r1.b3
    MCASP_REG_WRITE_EXT MCASP_SRCTL3, r2
MCASP_SRCTL_NOT_BELA_TLV32_OR_BELA_MULTI_TLV:

// (e) Global registers: Registers PFUNC, PDIR, DITCTL, DLBCTL, AMUTE. Note that
// PDIR should only be programmed after the clocks and frames are set up in the
// steps above. This is because the moment a clock pin is configured as an output
// in PDIR, the clock pin starts toggling at the rate defined in the corresponding
// clock control register. Therefore you must ensure that the clock control
// register is configured appropriately before you set the pin to be an output. A
// similar argument applies to the frame sync pins. Also note that the reset state
// for the transmit high-frequency clock divide register (HCLKXDIV) is
// divide-by-1, and the divide-by-1 clocks are not gated by the transmit
// high-frequency clock divider reset enable (XHCLKRST).

    MCASP_REG_WRITE MCASP_PFUNC, 0x00 // All pins are McASP
    // Set pin direction
    LBBO r2, reg_comm_addr, COMM_MCASP_CONF_PDIR, 4
    MCASP_REG_WRITE MCASP_PDIR, r2
    MCASP_REG_WRITE MCASP_DITCTL, 0x00 // disable DIT
    MCASP_REG_WRITE MCASP_DLBCTL, 0x00 // disable loopback
    MCASP_REG_WRITE MCASP_AMUTE, 0x0 // disable audio mute

// (f) DIT registers: For DIT mode operation, set up registers DITCSRA[n],
// DITCSRB[n], DITUDRA[n], and DITUDRB[n]. [not needed here]

// 3. Start the respective high-frequency serial clocks AHCLKX and/or AHCLKR. This
// step is necessary even if external high-frequency serial clocks are used:
// (a) Take the respective internal high-frequency serial clock divider(s) out of
// reset by setting the RHCLKRST bit for the receiver and/or the XHCLKRST bit for
// the transmitter in GBLCTL. All other bits in GBLCTL should be held at 0.
    MCASP_REG_SET_BIT_AND_POLL MCASP_GBLCTL, (1 << 1)  // Set RHCLKRST
    MCASP_REG_SET_BIT_AND_POLL MCASP_GBLCTL, (1 << 9)  // Set XHCLKRST

// The above write sequence may have temporarily changed the AHCLKX frequency
// The codec's PLL (if any) needs time to settle or the sample rate will be
// unstable and possibly cause an underrun. Give it ~1ms before going on.
// 10ns per loop iteration = 10^-8s --> 10^5 iterations needed

MOV r2, 100000
MCASP_INIT_WAIT:    
     SUB r2, r2, 1
     QBNE MCASP_INIT_WAIT, r2, 0

MCASP_REG_SET_BIT_AND_POLL MCASP_GBLCTL, (1 << 0)  // Set RCLKRST
MCASP_REG_SET_BIT_AND_POLL MCASP_GBLCTL, (1 << 8)  // Set XCLKRST

// 5. Setup data acquisition as required:
// (a) If DMA is used to service the McASP, set up data acquisition as desired
// and start the DMA in this step, before the McASP is taken out of reset.
// (b) If CPU interrupt is used to service the McASP, enable the transmit and/
// or receive interrupt as required.
// (c) If CPU polling is used to service the McASP, no action is required in
// this step.

// [not mcuh to do here, McASP->PRU interrupts have been set up by the rtdm driver]

// 6. Activate serializers.
// (a) Before starting, clear the respective transmitter and receiver status registers by writing XSTAT = FFFFh and RSTAT = FFFFh.
MCASP_REG_WRITE MCASP_XSTAT, 0xFFFF
MCASP_REG_WRITE MCASP_RSTAT, 0xFFFF
// (b) Take the respective serializers out of reset by setting the RSRCLR bit
// for the receiver and/or the XSRCLR bit for the transmitter in GBLCTL.
MCASP_REG_SET_BIT_AND_POLL MCASP_GBLCTL, (1 << 2)  // Set RSRCLR
MCASP_REG_SET_BIT_AND_POLL MCASP_GBLCTL, (1 << 10) // Set XSRCLR

// 7. Verify that all transmit buffers are serviced. Skip this step if the
// transmitter is not used. Also, skip this step if time slot 0 is selected as
// inactive (special cases, see Figure 22-21, second waveform). As soon as the
// transmit serializer is taken out of reset, XDATA in the XSTAT register is set,
// indicating that XBUF is empty and ready to be serviced. The XDATA status causes
// an DMA event AXEVT to be generated, and can cause an interrupt AXINT to be
// generated if it is enabled in the XINTCTL register.
// (a) If DMA is used to service the McASP, the DMA automatically services the
// McASP upon receiving AXEVT. Before proceeding in this step, you should verify
// that the XDATA bit in the XSTAT is cleared to 0, indicating that all transmit
// buffers are already serviced by the DMA.
// (b) If CPU interrupt is used to service the McASP, interrupt service routine is
// entered upon the AXINT interrupt. The interrupt service routine should service
// the XBUF registers. Before proceeding in this step, you should verify that the
// XDATA bit in XSTAT is cleared to 0, indicating that all transmit buffers are
// already serviced by the CPU.
// (c) If CPU polling is used to service the McASP, the XBUF registers should be
// written to in this step.

// Write a full frame to transmit FIFOs to prevent underflow and keep slots synced
// Can be probably ignored if first underrun gets ignored for better performance => TODO: test
#ifdef ENABLE_CTAG_FACE
IF_NOT_CTAG_FACE_JMP_TO WRITE_FRAME_NOT_CTAG_FACE
    MCASP_WRITE_TO_DATAPORT 0x00, 4
    MCASP_WRITE_TO_DATAPORT 0x00, 4
    MCASP_WRITE_TO_DATAPORT 0x00, 4
    MCASP_WRITE_TO_DATAPORT 0x00, 4
    MCASP_WRITE_TO_DATAPORT 0x00, 4
    MCASP_WRITE_TO_DATAPORT 0x00, 4
    MCASP_WRITE_TO_DATAPORT 0x00, 4
    MCASP_WRITE_TO_DATAPORT 0x00, 4
    QBA WRITE_FRAME_DONE

WRITE_FRAME_NOT_CTAG_FACE:
#endif /* ENABLE_CTAG_FACE */
#ifdef ENABLE_CTAG_BEAST
    IF_NOT_CTAG_BEAST_JMP_TO WRITE_FRAME_NOT_CTAG_BEAST
    MCASP_WRITE_TO_DATAPORT 0x00, 4
    MCASP_WRITE_TO_DATAPORT 0x00, 4
    MCASP_WRITE_TO_DATAPORT 0x00, 4
    MCASP_WRITE_TO_DATAPORT 0x00, 4
    MCASP_WRITE_TO_DATAPORT 0x00, 4
    MCASP_WRITE_TO_DATAPORT 0x00, 4
    MCASP_WRITE_TO_DATAPORT 0x00, 4
    MCASP_WRITE_TO_DATAPORT 0x00, 4
    MCASP_WRITE_TO_DATAPORT 0x00, 4
    MCASP_WRITE_TO_DATAPORT 0x00, 4
    MCASP_WRITE_TO_DATAPORT 0x00, 4
    MCASP_WRITE_TO_DATAPORT 0x00, 4
    MCASP_WRITE_TO_DATAPORT 0x00, 4
    MCASP_WRITE_TO_DATAPORT 0x00, 4
    MCASP_WRITE_TO_DATAPORT 0x00, 4
    MCASP_WRITE_TO_DATAPORT 0x00, 4
    QBA WRITE_FRAME_DONE
WRITE_FRAME_NOT_CTAG_BEAST:
#endif /* ENABLE_CTAG_BEAST */
#ifdef ENABLE_BELA_TLV32
    IF_NOT_BELA_TLV32_JMP_TO WRITE_FRAME_NOT_BELA_TLV32
    MCASP_WRITE_TO_DATAPORT 0x00, 4
    MCASP_WRITE_TO_DATAPORT 0x00, 4
WRITE_FRAME_NOT_BELA_TLV32:
#endif /* ENABLE_BELA_TLV32 */
#ifdef ENABLE_BELA_GENERIC_TDM
	IF_NOT_BELA_MULTI_TLV_JMP_TO WRITE_FRAME_NOT_MULTI_TLV
	GET_NUM_MCASP_OUT_CHANNELS r2 // How many channels for the McASP
WRITE_FRAME_MULTI_TLV_LOOP:
	MCASP_WRITE_TO_DATAPORT 0x00, 4 // Write 4 bytes for each channel
	SUB r2, r2, 1
	QBNE WRITE_FRAME_MULTI_TLV_LOOP, r2, 0
WRITE_FRAME_NOT_MULTI_TLV:
#endif /* ENABLE_BELA_GENERIC_TDM */
WRITE_FRAME_DONE:
        // the RX fifo should be empty according to the docs, but it's not
        // always case, so we may end up with an offset of 1*numSerializers
        // the below seems to be taking care of that by emptying the FIFO before we start
        MOV r2, 0
WRITE_FRAME_EMPTY_RX:
        // read and discard words
        FIFO_READ_2_WORDS_AND_PACK r1, r1, r1
        ADD r2, r2, 1
        QBEQ WRITE_FRAME_EMPTY_RX, r2, 128 // 128 is arbitrary. Let's say it's large enough


// 8. Release state machines from reset.
// (a) Take the respective state machine(s) out of reset by setting the RSMRST bit
// for the receiver and/or the XSMRST bit for the transmitter in GBLCTL. All other
// bits in GBLCTL should be left at the previous state.

MCASP_REG_SET_BIT_AND_POLL MCASP_GBLCTL, (1 << 3)  // Set RSMRST
MCASP_REG_SET_BIT_AND_POLL MCASP_GBLCTL, (1 << 11) // Set XSMRST

// 9. Release frame sync generators from reset. Note that it is necessary to
// release the internal frame sync generators from reset, even if an external
// frame sync is being used, because the frame sync error detection logic is built
// into the frame sync generator.
// (a) Take the respective frame sync generator(s) out of reset by setting the
// RFRST bit for the receiver, and/or the XFRST bit for the transmitter in GBLCTL.
// All other bits in GBLCTL should be left at the previous state.
MCASP_REG_SET_BIT_AND_POLL MCASP_GBLCTL, ((1 << 4) | (1 << 12))  // Set RFRST and XFRST
// 10. Upon the first frame sync signal, McASP transfers begin. The McASP
// synchronizes to an edge on the frame sync pin, not the level on the frame sync
// pin.

// [In other words: we are good to go]

WRITE_ONE_BUFFER:

     // Write a single buffer of DAC samples and read a buffer of ADC samples
     // Load starting positions
     MOV reg_dac_current, reg_dac_buf0         // DAC: reg_dac_current is current pointer
     LMBD r2, reg_num_channels, 1 // 1, 2 or 3 for 2, 4 or 8 channels
IF_HAS_ANALOG_DAC_JMP_TO BELA_CHANNELS
     // there are 0 dac values, so ADC starts at the same point as DAC
     MOV reg_adc_current, reg_dac_current
     QBA CHANNELS_DONE
BELA_CHANNELS:
     LSL reg_adc_current, reg_frame_spi_total, r2
     LSL reg_adc_current, reg_adc_current, 2   // N * 2 * 2 * bufsize
     ADD reg_adc_current, reg_adc_current, reg_dac_current // ADC: starts N * 2 * 2 * bufsize beyond DAC
CHANNELS_DONE:
     MOV reg_mcasp_dac_current, reg_mcasp_buf0 // McASP: set current DAC pointer
     // If we are on the first buffer, mcasp_adc_current starts
     // MCASP_DAC_BUFFER_SIZE*2 after reg_mcasp_dac_current
     // If we are on the second buffer, mcasp_adc_current starts
     // MCASP_DAC_BUFFER_SIZE + MCASP_ADC_BUFFER_SIZE after reg_mcasp_dac_current
     COMPUTE_SIZE_OF_MCASP_DAC_BUFFER_FAST r2
     ADD reg_mcasp_adc_current, reg_mcasp_dac_current, r2 // add one DAC_BLK_SIZE
QBNE MCASP_IS_ON_BUF1, reg_mcasp_buf0, REG_MCASP_BUF0_INIT
     ADD reg_mcasp_adc_current, reg_mcasp_adc_current, r2 // add another DAC_BLK_SIZE
     QBA MCASP_IS_ON_BUF_DONE
MCASP_IS_ON_BUF1:
     COMPUTE_SIZE_OF_MCASP_ADC_BUFFER r2
     ADD reg_mcasp_adc_current, reg_mcasp_adc_current, r2 // add one ADC_BLK_SIZE
MCASP_IS_ON_BUF_DONE:
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
     MOV r1, 0 //TODO: Check if really required

/* ########## EVENT LOOP BEGIN ########## */
#define EVENT_LOOP_TIMEOUT_COUNT 10000000
EVENT_LOOP:
MOV r28, EVENT_LOOP_TIMEOUT_COUNT
INNER_EVENT_LOOP:
	 // Check if one tx and rx frame of McASP have been processed.
	 // If yes, increment frame counter.
	 // TODO: Not sure if really needed. Maybe remove to improve performance.
	 // Instead jump to NEXT_FRAME, if ADCs have been processed
	 MOV r27, (1 << FLAG_BIT_MCASP_TX_PROCESSED)
	 OR r27, r27, (1 << FLAG_BIT_MCASP_RX_PROCESSED)
	 AND r27, r27, reg_flags
	 QBNE NOT_NEXT_FRAME, r27, 0x60
	 JMP NEXT_FRAME
NOT_NEXT_FRAME:

     // Check if ARM says should finish: flag is zero as long as it should run
     //LBBO r27, reg_comm_addr, COMM_SHOULD_STOP, 4
     MOV r27, 0
     QBEQ CONTINUE_RUNNING, r27, 0
     JAL r28.w0, CLEANUP // JAL allows longer jumps than JMP, but we actually ignore r28 (will never come back)
CONTINUE_RUNNING:

     SUB r28, r28, 1
     QBNE MCASP_CHECK_TX_ERROR_END, r28, 0
     // If we go through EVENT_LOOP_TIMEOUT_COUNT iterations without receiving
     // an interrupt, an error must have occurred
     SEND_ERROR_TO_ARM ARM_ERROR_TIMEOUT
     JMP MCASP_ERROR_RECOVERY
MCASP_CHECK_TX_ERROR_END:

     QBBC INNER_EVENT_LOOP, r31, PRU_INTR_BIT_CH1
/* ########## EVENT LOOP END ########## */
     

/* ########## INTERRUPT HANDLER BEGIN ########## */
HANDLE_INTERRUPT:
     PRU_ICSS_INTC_REG_READ_EXT INTC_REG_SECR1, r27
     QBBS MCASP_TX_INTR_RECEIVED, r27, PRU_SECR1_SYS_EV_MCASP_TX_INTR
     QBBS MCASP_RX_INTR_RECEIVED, r27, PRU_SECR1_SYS_EV_MCASP_RX_INTR
     //QBBS MCSPI_INTR_RECEIVED, r27, PRU_SECR1_SYS_EV_MCSPI_INTR

     JMP EVENT_LOOP
/* ########## INTERRUPT HANDLER END ########## */

/* ########## McASP TX ISR BEGIN ########## */
MCASP_TX_INTR_RECEIVED: // mcasp_x_intr_pend
     // Clear system event and status bit
     PRU_ICSS_INTC_REG_WRITE_EXT INTC_REG_SICR, (0x00000000 | PRU_SYS_EV_MCASP_TX_INTR)
     MCASP_REG_WRITE_EXT MCASP_XSTAT, 0x40 // clear XSTAFRM status bit

     // Load McASP XSTAT register content and check if error occurred
     MCASP_REG_READ_EXT MCASP_XSTAT, r4

     QBBS MCASP_TX_UNDERRUN_OCCURRED, r4, MCASP_XSTAT_XUNDRN_BIT
     QBBS MCASP_TX_UNEXPECTED_FRAME_SYNC_OCCURRED, r4, MCASP_XSTAT_XSYNCERR_BIT
     QBBS MCASP_TX_DMA_ERROR_OCCURRED, r4, MCASP_XSTAT_XDMAERR_BIT
     //QBBS MCASP_TX_CLOCK_FAILURE_OCCURRED, r4, MCASP_XSTAT_XCKFAIL_BIT // this is always set so we ignore it for now

     JMP MCASP_TX_ERROR_HANDLE_END

MCASP_TX_UNDERRUN_OCCURRED:
     SEND_ERROR_TO_ARM ARM_ERROR_XUNDRUN
     MCASP_REG_WRITE_EXT MCASP_XSTAT, 1 << MCASP_XSTAT_XUNDRN_BIT // Clear underrun bit (0)
     JMP MCASP_ERROR_RECOVERY

MCASP_TX_UNEXPECTED_FRAME_SYNC_OCCURRED:
     SEND_ERROR_TO_ARM ARM_ERROR_XSYNCERR
     MCASP_REG_WRITE_EXT MCASP_XSTAT, 1 << MCASP_XSTAT_XSYNCERR_BIT // Clear frame sync error bit (1)
     JMP MCASP_ERROR_RECOVERY

MCASP_TX_CLOCK_FAILURE_OCCURRED:
// A McASP transmit clock error is automatically solved by resetting the bit and jumping back
// to the begin of the error handling routine. Hence no additional error handling should be required.
// in practice, we would still leave it to ARM to decide what to do
     SEND_ERROR_TO_ARM ARM_ERROR_XCKFAIL
     MCASP_REG_WRITE_EXT MCASP_XSTAT, 1 << MCASP_XSTAT_XCKFAIL_BIT // Clear clock failure bit (2)
     JMP MCASP_TX_ERROR_HANDLE_END

MCASP_TX_DMA_ERROR_OCCURRED:
     SEND_ERROR_TO_ARM ARM_ERROR_XDMAERR
     MCASP_REG_WRITE_EXT MCASP_XSTAT, 1 << MCASP_XSTAT_XDMAERR_BIT // Clear DMA error bit (7)
     JMP MCASP_ERROR_RECOVERY

MCASP_TX_ERROR_HANDLE_END:

     // Check if we are in first frame period. If true, transmit full frame to FIFO.
     // Otherwise toggle flag and jump back to event loop
     QBBC MCASP_TX_ISR_END, reg_flags, FLAG_BIT_MCASP_TX_FIRST_FRAME

     // Temporarily save register states in scratchpad to have enough space for full audio frame.
     // ATTENTION: Registers which store memory addresses should never be temporarily overwritten
     XOUT SCRATCHPAD_ID_BANK0, r0, 72 // swap r0-r17 with scratch pad bank 0

     // Prepare some zero-ed out registers to copy to memory after reading the DAC data:
     LDI r8, 0
     LDI r9, 0
     LDI r10, 0
     LDI r11, 0
     LDI r12, 0
     LDI r13, 0
     LDI r14, 0
     LDI r15, 0
     LDI r16, 0

     // Load audio frame from memory, store zeros in their place, and increment pointer to next frame
#ifdef ENABLE_CTAG_FACE
IF_NOT_CTAG_FACE_JMP_TO LOAD_AUDIO_FRAME_NOT_CTAG_FACE
     LBCO r0, C_MCASP_MEM, reg_mcasp_dac_current, 16
     SBCO r8, C_MCASP_MEM, reg_mcasp_dac_current, 16
     ADD reg_mcasp_dac_current, reg_mcasp_dac_current, 16
     QBA LOAD_AUDIO_FRAME_DONE
LOAD_AUDIO_FRAME_NOT_CTAG_FACE:
#endif /* ENABLE_CTAG_FACE */
#ifdef ENABLE_CTAG_BEAST
IF_NOT_CTAG_BEAST_JMP_TO LOAD_AUDIO_FRAME_NOT_CTAG_BEAST
     LBCO r0, C_MCASP_MEM, reg_mcasp_dac_current, 32
     SBCO r8, C_MCASP_MEM, reg_mcasp_dac_current, 32
     ADD reg_mcasp_dac_current, reg_mcasp_dac_current, 32
     QBA LOAD_AUDIO_FRAME_DONE
LOAD_AUDIO_FRAME_NOT_CTAG_BEAST:
#endif /* ENABLE_CTAG_BEAST */
#ifdef ENABLE_BELA_TLV32
     IF_NOT_BELA_TLV32_JMP_TO LOAD_AUDIO_FRAME_NOT_BELA_TLV32
     LBCO r0, C_MCASP_MEM, reg_mcasp_dac_current, 4
     SBCO r8, C_MCASP_MEM, reg_mcasp_dac_current, 4
     ADD reg_mcasp_dac_current, reg_mcasp_dac_current, 4
     QBA LOAD_AUDIO_FRAME_DONE
LOAD_AUDIO_FRAME_NOT_BELA_TLV32:
#endif /* ENABLE_BELA_TLV32 */
#ifdef ENABLE_BELA_GENERIC_TDM
     IF_NOT_BELA_MULTI_TLV_JMP_TO LOAD_AUDIO_FRAME_NOT_MULTI_TLV
     // Number of bytes to load depends on number of active TDM slots
     // LBCO/SBCO only support r0 as indicator of number of bytes
     // so load begins from r1
     LDI r16, 0

     // TLVTODO: this only works up to 16 channels based on number of registers
     // get how many channels of audio ARM has put into memory
     // for us to fetch
     GET_NUM_AUDIO_OUT_CHANNELS r0
     QBGT LOAD_AUDIO_FRAME_MULTI_TLV_LT16CHAN, r0, MCASP_MAX_CHANNELS
     LDI r0, MCASP_MAX_CHANNELS
LOAD_AUDIO_FRAME_MULTI_TLV_LT16CHAN:
     LSL r0, r0, 1 // 16 bits per channel
     // ... and fetch them
     LBCO r1, C_MCASP_MEM, reg_mcasp_dac_current, b0
     // store zeros in their place
     SBCO r9, C_MCASP_MEM, reg_mcasp_dac_current, b0
     // increment pointer
     ADD reg_mcasp_dac_current, reg_mcasp_dac_current, r0.b0
     QBA LOAD_AUDIO_FRAME_DONE
LOAD_AUDIO_FRAME_NOT_MULTI_TLV:
#endif /* ENABLE_BELA_GENERIC_TDM */
LOAD_AUDIO_FRAME_DONE:

     //TODO: Change data structure in RAM to 32 bit samples 
     //     => no masking and shifting required
     //     => support for 24 bit audio
     MOV r17, 0xFFFF

#ifdef ENABLE_CTAG_FACE
IF_NOT_CTAG_FACE_JMP_TO WRITE_AUDIO_FRAME_NOT_CTAG_FACE
     AND r8, r17, r0
     LSR r9, r0, 16
     AND r10, r17, r1
     LSR r11, r1, 16
     AND r12, r17, r2
     LSR r13, r2, 16
     AND r14, r17, r3
     LSR r15, r3, 16
     MCASP_WRITE_TO_DATAPORT r8, 32
     QBA WRITE_AUDIO_FRAME_DONE
WRITE_AUDIO_FRAME_NOT_CTAG_FACE:
#endif /* ENABLE_CTAG_FACE */
#ifdef ENABLE_CTAG_BEAST
IF_NOT_CTAG_BEAST_JMP_TO WRITE_AUDIO_FRAME_NOT_CTAG_BEAST
	 // Note: Could be optimized by only using single operation to write data to McASP FIFO,
	 // but 24 registers need to be free for use
     AND r8, r17, r0
     LSR r9, r0, 16
     AND r10, r17, r1
     LSR r11, r1, 16
     AND r12, r17, r2
     LSR r13, r2, 16
     AND r14, r17, r3
     LSR r15, r3, 16
     MCASP_WRITE_TO_DATAPORT r8, 32

     AND r8, r17, r4
     LSR r9, r4, 16
     AND r10, r17, r5
     LSR r11, r5, 16
     AND r12, r17, r6
     LSR r13, r6, 16
     AND r14, r17, r7
     LSR r15, r7, 16
     MCASP_WRITE_TO_DATAPORT r8, 32
     QBA WRITE_AUDIO_FRAME_DONE
WRITE_AUDIO_FRAME_NOT_CTAG_BEAST:
#endif /* ENABLE_CTAG_BEAST */
#ifdef ENABLE_BELA_TLV32
IF_NOT_BELA_TLV32_JMP_TO WRITE_AUDIO_FRAME_NOT_BELA_TLV32
     AND r8, r17, r0
     LSR r9, r0, 16
     MCASP_WRITE_TO_DATAPORT r8, 8
     QBA WRITE_AUDIO_FRAME_DONE
WRITE_AUDIO_FRAME_NOT_BELA_TLV32:
#endif /* ENABLE_BELA_TLV32 */
#ifdef ENABLE_BELA_GENERIC_TDM
IF_NOT_BELA_MULTI_TLV_JMP_TO WRITE_AUDIO_FRAME_NOT_MULTI_TLV
     LBBO r10, reg_comm_addr, COMM_SHOULD_STOP, 4
     QBEQ CONT, r10, 0
     HALT
CONT:
     LBBO r9, reg_comm_addr, COMM_MCASP_OUT_SERIALIZERS_DISABLED_SUBSLOTS, 4
     // for each disabled slot, we shift all remaining registers forward
     MOV r12, 0
SHIFTING_LOOP_START:
     QBBC SHIFTING_LOOP_NEXT, r9, 0
     // if we are here, we need to shit forward all channels from r12 onwards
     // to avoid messing with unused registers, we  should start from the
     // correct instruction below based on how many subslots the mcasp has.
     // We compute the jump destination as an offset of START_SHIFTING
     // we need to jump (MCASP_MAX_CHANNELS - numMcaspSubSlots) blocks
     // down; each block is two instructions wide
     GET_NUM_MCASP_OUT_CHANNELS r0
     MOV r10, MCASP_MAX_CHANNELS
     // r10 = MCASP_MAX_CHANNELS - numMcaspSubSlots
     SUB r10, r10, r0
     // r10 is the number of blocks; each is 2 instructions wide:
     // r10 = r10 * 2
     LSL r10, r10, 1
     LDI r11, START_SHIFTING
     ADD r11, r11, r10
     JMP r11
START_SHIFTING:
     // TODO: refactor this using the MVIW or MVID instructions
     // these are not well documented and this also needs fixing prudis to
     // understand the instructions
     // here is an example:
     // this (mwiD, where D means 4 bytes) copies the content of
     // r3.w2 into r3.w0 and r4.w0 into r3.w2
     // LDI r1.b0, &r3.w0
     // LDI r1.b1, &r3.w2
     // MVID *r1.b0, *r1.b1
SS15:
     MOV r8.w2, R8.w0
     QBEQ SHIFTING_LOOP_NEXT, r12, 15
SS14:
     MOV r8.w0, R7.w2
     QBEQ SHIFTING_LOOP_NEXT, r12, 14
SS13:
     MOV r7.w2, R7.w0
     QBEQ SHIFTING_LOOP_NEXT, r12, 13
SS12:
     MOV r7.w0, R6.w2
     QBEQ SHIFTING_LOOP_NEXT, r12, 12
SS11:
     MOV r6.w2, R6.w0
     QBEQ SHIFTING_LOOP_NEXT, r12, 11
SS10:
     MOV r6.w0, R5.w2
     QBEQ SHIFTING_LOOP_NEXT, r12, 10
SS09:
     MOV r5.w2, R5.w0
     QBEQ SHIFTING_LOOP_NEXT, r12, 9
SS08:
     MOV r5.w0, R4.w2
     QBEQ SHIFTING_LOOP_NEXT, r12, 8
SS07:
     MOV r4.w2, R4.w0
     QBEQ SHIFTING_LOOP_NEXT, r12, 7
SS06:
     MOV r4.w0, R3.w2
     QBEQ SHIFTING_LOOP_NEXT, r12, 6
SS05:
     MOV r3.w2, R3.w0
     QBEQ SHIFTING_LOOP_NEXT, r12, 5
SS04:
     MOV r3.w0, R2.w2
     QBEQ SHIFTING_LOOP_NEXT, r12, 4
SS03:
     MOV r2.w2, R2.w0
     QBEQ SHIFTING_LOOP_NEXT, r12, 3
SS02:
     MOV r2.w0, R1.w2
     QBEQ SHIFTING_LOOP_NEXT, r12, 2
SS01:
     MOV r1.w2, R1.w0
     QBEQ SHIFTING_LOOP_NEXT, r12, 1
SS00:
     MOV r1.w0, 0
     QBEQ SHIFTING_LOOP_NEXT, r12, 0
SHIFTING_LOOP_NEXT:
     LSR r9, r9, 1
     ADD r12, r12, 1
     QBNE SHIFTING_LOOP_START, r9, 0
SHIFTING_LOOP_DONE:

     // above, we will have shifted all the relevant data in the subslots we
     // need it to be. Now see how many channels the McASP actually
     // has and write to all of those
     GET_NUM_MCASP_OUT_CHANNELS r0
     LSL r0, r0, 1 // 16 bits per channel
     AND r9, r17, r1
     LSR r10, r1, 16
	 MCASP_WRITE_TO_DATAPORT r9, 8
	 QBGE WRITE_AUDIO_FRAME_MULTI_TLV_DONE, r0, 4	// r0 = channels * 2 
	 
	 AND r11, r17, r2
     LSR r12, r2, 16
	 MCASP_WRITE_TO_DATAPORT r11, 8
	 QBGE WRITE_AUDIO_FRAME_MULTI_TLV_DONE, r0, 8
	 
     AND r13, r17, r3
     LSR r14, r3, 16
	 MCASP_WRITE_TO_DATAPORT r13, 8
	 QBGE WRITE_AUDIO_FRAME_MULTI_TLV_DONE, r0, 12
	 
     AND r15, r17, r4
     LSR r16, r4, 16
	 MCASP_WRITE_TO_DATAPORT r15, 8
	 QBGE WRITE_AUDIO_FRAME_MULTI_TLV_DONE, r0, 16
	 
     AND r9, r17, r5
     LSR r10, r5, 16
	 MCASP_WRITE_TO_DATAPORT r9, 8
	 QBGE WRITE_AUDIO_FRAME_MULTI_TLV_DONE, r0, 20
	 
     AND r11, r17, r6
     LSR r12, r6, 16
	 MCASP_WRITE_TO_DATAPORT r11, 8
	 QBGE WRITE_AUDIO_FRAME_MULTI_TLV_DONE, r0, 24
	 
     AND r13, r17, r7
     LSR r14, r7, 16
	 MCASP_WRITE_TO_DATAPORT r13, 8
	 QBGE WRITE_AUDIO_FRAME_MULTI_TLV_DONE, r0, 28
	 
     AND r15, r17, r8
     LSR r16, r8, 16
	 MCASP_WRITE_TO_DATAPORT r15, 8
	 // (r0 * 2) >= 32
	 	 
WRITE_AUDIO_FRAME_MULTI_TLV_DONE:
     QBA WRITE_AUDIO_FRAME_DONE
WRITE_AUDIO_FRAME_NOT_MULTI_TLV:
#endif /* ENABLE_BELA_GENERIC_TDM */
WRITE_AUDIO_FRAME_DONE:

     XIN SCRATCHPAD_ID_BANK0, r0, 72 // load back register states from scratchpad
     SET reg_flags, reg_flags, FLAG_BIT_MCASP_TX_PROCESSED

MCASP_TX_ISR_END:
     XOR reg_flags, reg_flags, (1 << FLAG_BIT_MCASP_TX_FIRST_FRAME) // toggle frame flag
     JMP EVENT_LOOP
/* ########## McASP TX ISR END ########## */


/* ########## McASP RX ISR BEGIN ########## */
MCASP_RX_INTR_RECEIVED: // mcasp_r_intr_pend
     // Clear system event and status bit
     PRU_ICSS_INTC_REG_WRITE_EXT INTC_REG_SICR, (0x00000000 | PRU_SYS_EV_MCASP_RX_INTR)
     MCASP_REG_WRITE_EXT MCASP_RSTAT, 0x40 // clear RSTAFRM status bit

	 // Check if we are in first frame period. 
	 // If true, load full audio frame from FIFO and process SPI afterwards.
	 // Otherwise toggle flag and jump back to event loop.
	 QBBC PROCESS_DIGITAL_END, reg_flags, FLAG_BIT_MCASP_RX_FIRST_FRAME

     // Temporarily save register states in scratchpad to have enough space for full audio frame
     // ATTENTION: Registers which store memory addresses should never be temporarily overwritten
     XOUT SCRATCHPAD_ID_BANK0, r0, 72 // swap r0-r17 with scratch pad bank 0

     // TODO: Change data structure in RAM to 32 bit samples 
     //     => no masking and shifting required
     //     => support for 24 bit audio
     // TODO: Avoid masking and shifting by simply moving sample to word (e.g. MOV r0.w0 value)
     MOV r17, 0xFFFF

#ifdef ENABLE_CTAG_FACE
     IF_NOT_CTAG_FACE_JMP_TO FRAME_READ_NOT_CTAG_FACE
     MCASP_READ_FROM_DATAPORT r8, 32
     AND r0, r8, r17
     LSL r16, r9, 16
     OR r0, r0, r16
     AND r1, r10, r17
     LSL r16, r11, 16
     OR r1, r1, r16
     AND r2, r12, r17
     LSL r16, r13, 16
     OR r2, r2, r16
     AND r3, r14, r17
     LSL r16, r15, 16
     OR r3, r3, r16

#ifdef CTAG_IGNORE_UNUSED_INPUT_TDM_SLOTS
// this one is untested, attempts to only store 4 results instead of 8
     SBCO r0, C_MCASP_MEM, reg_mcasp_adc_current, 8 // store result
     ADD reg_mcasp_adc_current, reg_mcasp_adc_current, 8 // increment memory pointer
#else /* CTAG_IGNORE_UNUSED_INPUT_TDM_SLOTS */
     SBCO r0, C_MCASP_MEM, reg_mcasp_adc_current, 16 // store result
     ADD reg_mcasp_adc_current, reg_mcasp_adc_current, 16 // increment memory pointer
#endif /* CTAG_IGNORE_UNUSED_INPUT_TDM_SLOTS */
     QBA FRAME_READ_DONE
FRAME_READ_NOT_CTAG_FACE:
#endif /* ENABLE_CTAG_FACE */
#ifdef ENABLE_CTAG_BEAST
     IF_NOT_CTAG_BEAST_JMP_TO FRAME_READ_NOT_CTAG_BEAST
	 // Check if there is at least one full frame in FIFO.
	 // This is only required for CTAG Beast
	 MCASP_REG_READ_EXT MCASP_RFIFOSTS, r27
	 QBGT SKIP_AUDIO_RX_FRAME, r27, 2

	 // TODO: Optimize by only using single operation to read data from McASP FIFO.
	 // Channels are swapped for master and slave codec to match correct channel order.
	 MCASP_READ_FROM_DATAPORT r8, 32

     AND r0, r12, r17
     LSL r16, r13, 16
     OR r0, r0, r16
     AND r1, r14, r17
     LSL r16, r15, 16
     OR r1, r1, r16
     AND r2, r8, r17
     LSL r16, r9, 16
     OR r2, r2, r16
     AND r3, r10, r17
     LSL r16, r11, 16
     OR r3, r3, r16
     SBCO r0, C_MCASP_MEM, reg_mcasp_adc_current, 16 // store result
     ADD reg_mcasp_adc_current, reg_mcasp_adc_current, 16 // increment memory pointer

     MCASP_READ_FROM_DATAPORT r8, 32
     AND r0, r8, r17
     LSL r16, r9, 16
     OR r0, r0, r16
     AND r1, r10, r17
     LSL r16, r11, 16
     OR r1, r1, r16
     AND r2, r12, r17
     LSL r16, r13, 16
     OR r2, r2, r16
     AND r3, r14, r17
     LSL r16, r15, 16
     OR r3, r3, r16
#ifdef CTAG_IGNORE_UNUSED_INPUT_TDM_SLOTS
     QBA DONE_STORING_RESULT_BEAST_2
#endif /* CTAG_IGNORE_UNUSED_INPUT_TDM_SLOTS */
     SBCO r0, C_MCASP_MEM, reg_mcasp_adc_current, 16 // store result
     ADD reg_mcasp_adc_current, reg_mcasp_adc_current, 16 // increment memory pointer
DONE_STORING_RESULT_BEAST_2:

SKIP_AUDIO_RX_FRAME:
     QBA FRAME_READ_DONE
FRAME_READ_NOT_CTAG_BEAST:
#endif /* ENABLE_CTAG_BEAST */
#ifdef ENABLE_BELA_TLV32
     IF_NOT_BELA_TLV32_JMP_TO FRAME_READ_NOT_BELA_TLV32

     MCASP_READ_FROM_DATAPORT r8, 8
     AND r0, r8, r17
     LSL r16, r9, 16
     OR r0, r0, r16

     SBCO r0, C_MCASP_MEM, reg_mcasp_adc_current, 4 // store result
     ADD reg_mcasp_adc_current, reg_mcasp_adc_current, 4 // increment memory pointer
     QBA FRAME_READ_DONE
FRAME_READ_NOT_BELA_TLV32:
#endif /* ENABLE_BELA_TLV32 */
#ifdef ENABLE_BELA_GENERIC_TDM
     IF_NOT_BELA_MULTI_TLV_JMP_TO FRAME_READ_NOT_MULTI_TLV
	 
	 GET_NUM_AUDIO_IN_CHANNELS r0
	 QBGT FRAME_READ_MULTI_TLV_LT16CHAN, r0, 16
	 LDI r0, 16
FRAME_READ_MULTI_TLV_LT16CHAN:
	// read from RFIFOSTS the number of words available to read
	MCASP_REG_READ_EXT MCASP_RFIFOSTS, r27
	// Only start reading if all the words we need are available to read.
	// This ensures we do not end up out of sync.
	QBGT FRAME_READ_DONE, r27, r0

	// one FIFO word is 32 bit.
	// below we read two FIFO words at a time into r9 and r10 and then pack
	// them as 16 bit words into r1 to (max) r8. This assumes the number of
	// inputs is even.

	LSL r0, r0, 1 // r0 now contains the size in bytes of the packed data (16 bits per channel)
	 
	FIFO_READ_2_WORDS_AND_PACK r1, r9, r10
	QBGE FRAME_READ_MULTI_TLV_STORE, r0, 4
	 
	FIFO_READ_2_WORDS_AND_PACK r2, r9, r10
	QBGE FRAME_READ_MULTI_TLV_STORE, r0, 8

	FIFO_READ_2_WORDS_AND_PACK r3, r9, r10
	QBGE FRAME_READ_MULTI_TLV_STORE, r0, 12

	FIFO_READ_2_WORDS_AND_PACK r4, r9, r10
	QBGE FRAME_READ_MULTI_TLV_STORE, r0, 16

	FIFO_READ_2_WORDS_AND_PACK r5, r9, r10
	QBGE FRAME_READ_MULTI_TLV_STORE, r0, 20
	 
	FIFO_READ_2_WORDS_AND_PACK r6, r9, r10
	QBGE FRAME_READ_MULTI_TLV_STORE, r0, 24

	FIFO_READ_2_WORDS_AND_PACK r7, r9, r10
	QBGE FRAME_READ_MULTI_TLV_STORE, r0, 28
	 
	FIFO_READ_2_WORDS_AND_PACK r8, r9, r10
	  
FRAME_READ_MULTI_TLV_STORE:
     SBCO r1, C_MCASP_MEM, reg_mcasp_adc_current, b0 	     // store result
     ADD reg_mcasp_adc_current, reg_mcasp_adc_current, r0.b0 // increment memory pointer

     QBA FRAME_READ_DONE
FRAME_READ_NOT_MULTI_TLV:
#endif /* ENABLE_BELA_GENERIC_TDM */

FRAME_READ_DONE:

     XIN SCRATCHPAD_ID_BANK0, r0, 72 // load back register states from scratchpad
     SET reg_flags, reg_flags, FLAG_BIT_MCASP_RX_PROCESSED

MCASP_RX_ISR_END:
/* ########## McASP RX ISR END ########## */

/* ########## PROCESS ANALOG AND DIGITAL BEGIN ########## */
	 // Skip analog processing if SPI is disabled
     QBBC PROCESS_SPI_END, reg_flags, FLAG_BIT_USE_SPI

     // Temporarily save register states in scratchpad to have enough space for SPI data
     // r0 - r3 are used for ADC/DAC data. r4 - r17 are used as temp registers
     // ATTENTION: Registers which store memory addresses should never be temporarily overwritten
     XOUT SCRATCHPAD_ID_BANK0, r0, 72 // swap r0-r17 with scratch pad bank 0

     // Analog ADC data is saved in r0-r1 and analog DAC data is saved in r2-r3 (four samples each)
     LBCO r2, C_ADC_DAC_MEM, reg_dac_current, 8
     // store zeros in their place
     LDI r0, 0
     LDI r1, 0
     SBCO r4, C_ADC_DAC_MEM, reg_dac_current, 8
     ADD reg_dac_current, reg_dac_current, 8

     // DAC: transmit low word (first in little endian)
     QBBC ANALOG_CHANNEL_4, reg_flags, FLAG_BIT_MCSPI_FIRST_FOUR_CH
     MOV r16, 0 // Write channel 0
     JMP ANALOG_CHANNEL_4_END
ANALOG_CHANNEL_4:
     MOV r16, 4 // Write channel 4
ANALOG_CHANNEL_4_END:
     MOV r17, 0xFFFF
     AND r4, r2, r17
     LSL r4, r4, AD5668_DATA_OFFSET
     MOV r5, (0x03 << AD5668_COMMAND_OFFSET)
     OR r4, r4, r5
     DAC_CHANNEL_REORDER r5, r16
     LSL r5, r5, AD5668_ADDRESS_OFFSET
     OR r4, r4, r5
     DAC_WRITE r4

     MOV r0, 0 // Initialize register for first two ADC samples
     // Read ADC channels: result is always 2 commands behind
     // Start by reading channel 2 (result is channel 0) and go
     // to N+2, but masking the channel number to be between 0 and N-1
     ADD r16, r16, 2
     SUB r17, reg_num_channels, 1
     AND r16, r16, r17
     ADC_PREPARE_DATA r16
     ADC_WRITE r16, r16
     ADC_PROCESS_DATA r16
     MOV r17, 0xFFFF // Mask low word
     AND r0, r16, r17

	 // DAC: transmit high word (second in little endian)
     QBBC ANALOG_CHANNEL_5, reg_flags, FLAG_BIT_MCSPI_FIRST_FOUR_CH
	 MOV r16, 1 // Write channel 1
     JMP ANALOG_CHANNEL_5_END
ANALOG_CHANNEL_5:
     MOV r16, 5 // Write channel 5
ANALOG_CHANNEL_5_END:
     LSR r4, r2, 16
     LSL r4, r4, AD5668_DATA_OFFSET
     MOV r5, (0x03 << AD5668_COMMAND_OFFSET)
     OR r4, r4, r5
     DAC_CHANNEL_REORDER r5, r16
     LSL r5, r5, AD5668_ADDRESS_OFFSET
     OR r4, r4, r5
     DAC_WRITE r4     

     ADD r16, r16, 2
     SUB r17, reg_num_channels, 1
     AND r16, r16, r17
     ADC_PREPARE_DATA r16
     ADC_WRITE r16, r16
     ADC_PROCESS_DATA r16

     LSL r16, r16, 16 // Move result to high word
     OR r0, r0, r16

     // DAC: transmit low word (first in little endian)
     QBBC ANALOG_CHANNEL_6, reg_flags, FLAG_BIT_MCSPI_FIRST_FOUR_CH
     MOV r16, 2 // Write channel 2
     JMP ANALOG_CHANNEL_6_END
ANALOG_CHANNEL_6:
     MOV r16, 6 // Write channel 6
ANALOG_CHANNEL_6_END:
     MOV r17, 0xFFFF
     AND r4, r3, r17
     LSL r4, r4, AD5668_DATA_OFFSET
     MOV r5, (0x03 << AD5668_COMMAND_OFFSET)
     OR r4, r4, r5
     DAC_CHANNEL_REORDER r5, r16
     LSL r5, r5, AD5668_ADDRESS_OFFSET
     OR r4, r4, r5
     DAC_WRITE r4

     MOV r1, 0 // Initialize register for next two samples
     ADD r16, r16, 2
     SUB r17, reg_num_channels, 1
     AND r16, r16, r17
     ADC_PREPARE_DATA r16
     ADC_WRITE r16, r16
     ADC_PROCESS_DATA r16
     MOV r17, 0xFFFF // Mask low word
     AND r1, r16, r17

     // DAC: transmit high word (second in little endian)
     QBBC ANALOG_CHANNEL_7, reg_flags, FLAG_BIT_MCSPI_FIRST_FOUR_CH
	 MOV r16, 3 // Write channel 3
     JMP ANALOG_CHANNEL_7_END
ANALOG_CHANNEL_7:
     MOV r16, 7 // Write channel 7
ANALOG_CHANNEL_7_END:
     LSR r4, r3, 16
     LSL r4, r4, AD5668_DATA_OFFSET
     MOV r5, (0x03 << AD5668_COMMAND_OFFSET)
     OR r4, r4, r5
     DAC_CHANNEL_REORDER r5, r16
     LSL r5, r5, AD5668_ADDRESS_OFFSET
     OR r4, r4, r5
     DAC_WRITE r4  

     ADD r16, r16, 2
     SUB r17, reg_num_channels, 1
     AND r16, r16, r17
     ADC_PREPARE_DATA r16
     ADC_WRITE r16, r16
     ADC_PROCESS_DATA r16
     LSL r16, r16, 16 // Move result to high word
     OR r1, r1, r16

     // Store 4 ADC samples in memory
     SBCO r0, C_ADC_DAC_MEM, reg_adc_current, 8
     ADD reg_adc_current, reg_adc_current, 8

#ifdef ENABLE_MUXER
     // If enabled, update the multiplexer settings
     // Change mux settings for ch0-3 after reading ch. 3
     QBBC MUX_0_3_DONE, reg_flags, FLAG_BIT_MCSPI_FIRST_FOUR_CH
     MUX_INCREMENT_0_TO_3
MUX_0_3_DONE:
     // Change mux settings for ch4-7 after reading ch. 7
     QBBS MUX_4_7_DONE, reg_flags, FLAG_BIT_MCSPI_FIRST_FOUR_CH
     MUX_INCREMENT_4_TO_7
MUX_4_7_DONE:
#endif /* ENABLE_MUXER */

     XIN SCRATCHPAD_ID_BANK0, r0, 72 // load back register states from scratchpad

     // Toggle flag to check on which SPI channels (i.e. ch0-ch3 or ch4-ch7) we are, 
     // if eight analog IO channels are used
     QBNE PROCESS_SPI_END, reg_num_channels, 8
     XOR reg_flags, reg_flags, (1 << FLAG_BIT_MCSPI_FIRST_FOUR_CH)

PROCESS_SPI_END:

     // Skip digital processing if digital IOs are disabled
     QBBC PROCESS_DIGITAL_END, reg_flags, FLAG_BIT_USE_DIGITAL
     DO_DIGITAL

PROCESS_DIGITAL_END:

	 XOR reg_flags, reg_flags, (1 << FLAG_BIT_MCASP_RX_FIRST_FRAME) // Toggle frame flag

     JMP EVENT_LOOP
/* ########## PROCESS ANALOG AND DIGITAL END ########## */


/* ########## McSPI (analog) ISR BEGIN ########## */
// This ISR is currently not used, but is probably useful in future (McSPI interrupts)
/*
MCSPI_INTR_RECEIVED: // SINTERRUPTN
     // Clear system event
     PRU_ICSS_INTC_REG_WRITE_EXT INTC_REG_SICR, (0x00000000 | PRU_SYS_EV_MCSPI_INTR)

     // Check which kind of interrupt was received
     LBBO r27, reg_spi_addr, SPI_IRQSTATUS, 4
     QBBS MCSPI_INTR_TX0_EMPTY, r27, SPI_INTR_BIT_TX0_EMPTY
     QBBS MCSPI_INTR_RX1_FULL, r27, SPI_INTR_BIT_RX1_FULL

     // Clear all interrupt status bits
     //TODO: Check if it is safer to only delete specific interrupts
     MOV r27, 0x7F
     SBBO r27, reg_spi_addr, SPI_IRQSTATUS, 4

     JMP EVENT_LOOP

MCSPI_INTR_TX0_EMPTY:
	 MOV r27, (1 << SPI_INTR_BIT_TX0_EMPTY)
	 SBBO r27, reg_spi_addr, SPI_IRQSTATUS, 4

	 //TODO: Handle tx0 empty interrupt here

	 JMP EVENT_LOOP

MCSPI_INTR_RX1_FULL:
	 MOV r27, (1 << SPI_INTR_BIT_RX1_FULL)
	 SBBO r27, reg_spi_addr, SPI_IRQSTATUS, 4

	 //TODO: Handle rx1 full interrupt here

	 JMP EVENT_LOOP
*/
/* ########## McSPI (analog) ISR END ########## */


NEXT_FRAME:
     CLR reg_flags, reg_flags, FLAG_BIT_MCASP_TX_PROCESSED
     CLR reg_flags, reg_flags, FLAG_BIT_MCASP_RX_PROCESSED

#ifdef ENABLE_CTAG_FACE
IF_NOT_CTAG_FACE_JMP_TO SET_REG_FRAMES_NOT_CTAG_FACE
     // Set reg frames total based on number of analog channels
     // 8 analog ch => LSR 1
     // 4 analog ch => LSR 2
     // 2 analog ch => LSR 3
     QBEQ CTAG_FACE_8CH_ANALOG_8, reg_num_channels, 0x8
     QBEQ CTAG_FACE_8CH_ANALOG_4, reg_num_channels, 0x4
     QBEQ CTAG_FACE_8CH_ANALOG_2, reg_num_channels, 0x2

CTAG_FACE_8CH_ANALOG_8: // Eight channels
     LSR r14, reg_frame_mcasp_total, 1
     JMP CTAG_FACE_8CH_ANALOG_CFG_END
CTAG_FACE_8CH_ANALOG_4: // Four channels
	 LSR r14, reg_frame_mcasp_total, 2
	 JMP CTAG_FACE_8CH_ANALOG_CFG_END
CTAG_FACE_8CH_ANALOG_2: // Two channels
	 LSR r14, reg_frame_mcasp_total, 3
CTAG_FACE_8CH_ANALOG_CFG_END:
     QBA SET_REG_FRAMES_DONE
SET_REG_FRAMES_NOT_CTAG_FACE:

#endif /* ENABLE_CTAG_FACE */
#ifdef ENABLE_CTAG_BEAST
IF_NOT_CTAG_BEAST_JMP_TO SET_REG_FRAMES_NOT_CTAG_BEAST
     // Set reg frames total based on number of analog channels
     // 8 analog ch => LSR 2
     // 4 analog ch => LSR 3
     // 2 analog ch => LSR 4
     QBEQ CTAG_BEAST_16CH_ANALOG_8, reg_num_channels, 0x8
     QBEQ CTAG_BEAST_16CH_ANALOG_4, reg_num_channels, 0x4
     QBEQ CTAG_BEAST_16CH_ANALOG_2, reg_num_channels, 0x2

CTAG_BEAST_16CH_ANALOG_8: // Eight channels
	 LSR r14, reg_frame_mcasp_total, 2
	 JMP CTAG_BEAST_16CH_ANALOG_CFG_END
CTAG_BEAST_16CH_ANALOG_4: // Four channels
	 LSR r14, reg_frame_mcasp_total, 3
	 JMP CTAG_BEAST_16CH_ANALOG_CFG_END
CTAG_BEAST_16CH_ANALOG_2: // Two channels
	 LSR r14, reg_frame_mcasp_total, 4
CTAG_BEAST_16CH_ANALOG_CFG_END:
     QBA SET_REG_FRAMES_DONE
SET_REG_FRAMES_NOT_CTAG_BEAST:
#endif /* ENABLE_CTAG_BEAST */
IF_NOT_BELA_TLV32_OR_BELA_MULTI_TLV_JMP_TO SET_REG_FRAMES_NOT_BELA_TLV32_OR_BELA_MULTI_TLV
     MOV r14, reg_frame_mcasp_total
     QBA SET_REG_FRAMES_DONE
SET_REG_FRAMES_NOT_BELA_TLV32_OR_BELA_MULTI_TLV:

SET_REG_FRAMES_DONE:

     ADD reg_frame_current, reg_frame_current, 1
     QBEQ ALL_FRAMES_PROCESSED, reg_frame_current, r14
     JMP EVENT_LOOP

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
    
#ifdef ENABLE_MUXER
     // If multiplexer capelet is enabled, save which channel we got to
     // Muxes 0-3 change at a different time than muxes 4-7 but the first
     // of these is sufficient to capture where we are
     MOV r2, FLAG_MASK_MUX_CONFIG
     AND r2, reg_flags, r2
     QBEQ MUX_CHANNEL_SAVE_DONE, r2, 0
     AND r2, reg_pru1_mux_pins, 0x07
     SBBO r2, reg_comm_addr, COMM_MUX_END_CHANNEL, 4
MUX_CHANNEL_SAVE_DONE:
#endif /* ENABLE_MUXER */

     // Notify ARM of buffer swap
     AND r2, reg_flags, (1 << FLAG_BIT_BUFFER1)    // Mask out every but low bit
     SBBO r2, reg_comm_addr, COMM_CURRENT_BUFFER, 4
     MOV r31.b0, PRU_SYSTEM_EVENT_RTDM_WRITE_VALUE // Interrupt to ARM
    
     // Increment the frame count in the comm buffer (for status monitoring)
     LBBO r2, reg_comm_addr, COMM_FRAME_COUNT, 4
     ADD r2, r2, reg_frame_mcasp_total
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
     //LBBO r2, reg_comm_addr, COMM_SHOULD_STOP, 4
     mov r2, 0
     QBNE CLEANUP, r2, 0
	 JMP WRITE_ONE_BUFFER

CLEANUP:
     MCASP_REG_WRITE MCASP_GBLCTL, 0x00 // Turn off McASP

     // Turn off SPI if enabled
     QBBC SPI_CLEANUP_DONE, reg_flags, FLAG_BIT_USE_SPI

     // write zeros to all analog outputs, to avoid stuck values
     DAC_WRITE_ALL_ZEROS r2
    
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
     XIN SCRATCHPAD_ID_BANK2, r0, 20 // Load test data from scratchpad 2 for evaluation
     // Signal the ARM that we have finished 
     MOV r31.b0, PRU_SYSTEM_EVENT_RTDM_WRITE_VALUE
     HALT
