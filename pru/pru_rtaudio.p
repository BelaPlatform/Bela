.origin 0
.entrypoint START

#include "../include/PruArmCommon.h"

#define DBOX_CAPE	// Define this to use new cape hardware
	
#ifdef IS_AM572x
#define CLOCK_BASE 0x4A005000
#define CLOCK_MCASP0 0x550
#define CLOCK_MCASP_VALUE 0x7000002
#define CLOCK_SPI0  0x47F8
#else // IS_AM572x
#define CLOCK_BASE  0x44E00000
#define CLOCK_MCASP0 0x34
#define CLOCK_MCASP_VALUE 0x30002 // should probably be just 0x2
#define CLOCK_SPI0  0x4C
#endif // IS_AM572x
#define CLOCK_SPI1  0x50
#define CLOCK_L4LS  0x60

#ifdef IS_AM572x
#define SPI0_BASE   0x4809A100 // McSPI2_REVISION AM572x
#define SPI1_BASE   0x4809A100
#else
#define SPI0_BASE   0x48030100
#define SPI1_BASE   0x481A0100
#endif
#define SPI_BASE    SPI0_BASE
	
#define SPI_SYSCONFIG 0x10
#define SPI_SYSSTATUS 0x14
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

#ifdef IS_AM572x
#define GPIO1 0x4AE10000
#define GPIO2 0x48055000
#define GPIO3 0x48057000
#define GPIO4 0x48059000
#define GPIO5 0x4805B000
#define GPIO6 0x4805D000
#define GPIO7 0x48051000
#define GPIO8 0x48053000
#else // IS_AM572x
#define GPIO0 0x44E07000
#define GPIO1 0x4804C000
#define GPIO2 0x481AC000
#define GPIO3 0x481AE000,
#endif // IS_AM572x

#define GPIO_CLEARDATAOUT 0x190
#define GPIO_SETDATAOUT 0x194

// See am335x TRM 4.4.1.2.2 Event Interface Mapping (R31): PRU System Events:
// "The output channels [of R31] 0-15 are connected to the PRU-ICSS INTC system events 16-31, respectively. This allows the PRU to assert one of the system events 16-31 by writing to its own R31 register."
// PRU_SYSTEM_EVENT_RTDM is 20
// We will be writing to output channel 4, which is system event 20 of the PRU-ICSS INTC
#define PRU_SYSTEM_EVENT_RTDM_WRITE_VALUE (1 << 5) | (PRU_SYSTEM_EVENT_RTDM - 16)

#define C_ADC_DAC_MEM C24     // PRU0 mem
#ifdef IS_AM572x
#define DAC_GPIO      GPIO7
#define DAC_CS_PIN    (1<<17) // GPIO7:17 = P9 pin 17
#else // IS_AM572x
#define DAC_GPIO      GPIO0
#define DAC_CS_PIN    (1<<5) // GPIO0:5 = P9 pin 17
#endif // IS_AM572x
#define DAC_TRM       0       // SPI transmit and receive
#define DAC_WL        32      // Word length
#define DAC_CLK_MODE  1       // SPI mode
#define DAC_CLK_DIV   1       // Clock divider (48MHz / 2^n)
#define DAC_DPE       1       // d0 = receive, d1 = transmit

#define AD5668_COMMAND_OFFSET 24
#define AD5668_ADDRESS_OFFSET 20
#define AD5668_DATA_OFFSET    4
#define AD5668_REF_OFFSET     0

#ifdef IS_AM572x
#define ADC_GPIO      GPIO3
#define ADC_CS_PIN    (1<<12) // GPIO3:12 = P9 pin 15
#else // IS_AM572x
#define ADC_GPIO      GPIO1
#define ADC_CS_PIN    (1<<16) // GPIO1:16 = P9 pin 15
// for BELA_MINI, this is the same as DAC_CS_PIN, but the latter is disabled in DAC_WRITE
#define ADC_GPIO_BELA_MINI      GPIO0
#define ADC_CS_PIN_BELA_MINI    (1<<5) // GPIO1:5 = P1 pin 6
#endif // IS_AM572x

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

#define SHARED_COMM_MEM_BASE  0x00010000  // Location where comm flags are written

// General constants for McASP peripherals (used for audio codec)
#ifdef IS_AM572x
#define MCASP0_BASE 0x48460000  // pg 6118 of AM57x Manual, it actually is MCASP1 but temporarily keeping as 0 for testing ease
#else
#define MCASP0_BASE 0x48038000
#endif

#define MCASP_PWRIDLESYSCONFIG 		0x04
#define MCASP_PFUNC			0x10
#define MCASP_PDIR			0x14
#define MCASP_PDOUT			0x18
#define MCASP_PDSET			0x1C
#define MCASP_PDIN			0x1C
#define MCASP_PDCLR			0x20
#define MCASP_GBLCTL			0x44
#define MCASP_AMUTE			0x48
#define MCASP_DLBCTL			0x4C
#define MCASP_DITCTL			0x50
#define MCASP_RGBLCTL			0x60
#define MCASP_RMASK			0x64
#define MCASP_RFMT			0x68
#define MCASP_AFSRCTL			0x6C
#define MCASP_ACLKRCTL			0x70
#define MCASP_AHCLKRCTL			0x74
#define MCASP_RTDM			0x78
#define MCASP_RINTCTL			0x7C
#define MCASP_RSTAT			0x80
#define MCASP_RSLOT			0x84
#define MCASP_RCLKCHK			0x88
#define MCASP_REVTCTL			0x8C
#define MCASP_XGBLCTL			0xA0
#define MCASP_XMASK			0xA4
#define MCASP_XFMT			0xA8
#define MCASP_AFSXCTL			0xAC
#define MCASP_ACLKXCTL			0xB0
#define MCASP_AHCLKXCTL			0xB4
#define MCASP_XTDM			0xB8
#define MCASP_XINTCTL			0xBC
#define MCASP_XSTAT			0xC0
#define MCASP_XSLOT			0xC4
#define MCASP_XCLKCHK			0xC8
#define MCASP_XEVTCTL			0xCC
#define MCASP_SRCTL0			0x180
#define MCASP_SRCTL1			0x184
#define MCASP_SRCTL2			0x188
#define MCASP_SRCTL3			0x18C
#define MCASP_SRCTL4			0x190
#define MCASP_SRCTL5			0x194
#define MCASP_SRCTL6			0x198
#define MCASP_SRCTL7			0x19C
#define MCASP_SRCTL8			0x1A0
#define MCASP_SRCTL9			0x1A4
#define MCASP_SRCTL10			0x1A8
#define MCASP_SRCTL11			0x1AC
#define MCASP_SRCTL12			0x1B0
#define MCASP_SRCTL13			0x1B4
#define MCASP_SRCTL14			0x1B8
#define MCASP_SRCTL15			0x1BC
#define MCASP_XBUF0			0x200
#define MCASP_XBUF1			0x204
#define MCASP_XBUF2			0x208
#define MCASP_XBUF3			0x20C
#define MCASP_XBUF4			0x210
#define MCASP_XBUF5			0x214
#define MCASP_XBUF10			0x228
#define MCASP_XBUF11			0x22C
#define MCASP_RBUF0			0x280
#define MCASP_RBUF1			0x284
#define MCASP_RBUF2			0x288
#define MCASP_RBUF3			0x28C
#define MCASP_RBUF4			0x290
#define MCASP_RBUF5			0x294
#define MCASP_RBUF10			0x2A8
#define MCASP_WFIFOCTL			0x1000
#define MCASP_WFIFOSTS			0x1004
#define MCASP_RFIFOCTL			0x1008
#define MCASP_RFIFOSTS			0x100C

#define MCASP_XSTAT_XUNDRN_BIT          0        // Bit to test if there was an underrun
#define MCASP_XSTAT_XDATA_BIT           5        // Bit to test for transmit ready
#define MCASP_RSTAT_RDATA_BIT           5        // Bit to test for receive ready 
	
// Constants used for this particular audio setup
#define MCASP_BASE 	MCASP0_BASE
#ifdef DBOX_CAPE
#ifdef IS_AM572x
#define MCASP_SRCTL_X	MCASP_SRCTL11	// Ser. 11 is transmitter
#define MCASP_SRCTL_R	MCASP_SRCTL10	// Ser. 10 is receiver
#define MCASP_XBUF	MCASP_XBUF11
#define MCASP_RBUF	MCASP_RBUF10
#else // IS_AM572x
#define MCASP_SRCTL_X	MCASP_SRCTL2	// Ser. 2 is transmitter
#define MCASP_SRCTL_R	MCASP_SRCTL0	// Ser. 0 is receiver
#define MCASP_XBUF	MCASP_XBUF2
#define MCASP_RBUF	MCASP_RBUF0
#endif // IS_AM572x
#else
#define MCASP_SRCTL_X	MCASP_SRCTL3	// Ser. 3 is transmitter
#define MCASP_SRCTL_R	MCASP_SRCTL2	// Ser. 2 is receiver
#define MCASP_XBUF	MCASP_XBUF3
#define MCASP_RBUF	MCASP_RBUF2
#endif
	
#define MCASP_PIN_AFSX		(1 << 28)
#define MCASP_PIN_AHCLKX	(1 << 27)
#define MCASP_PIN_ACLKX		(1 << 26)
#define MCASP_PIN_AMUTE		(1 << 25)	// Also, 0 to 3 are XFR0 to XFR3

#ifdef DBOX_CAPE
#ifdef IS_AM572x
#define MCASP_OUTPUT_PINS   	MCASP_PIN_AHCLKX | (1 << 11) // AHCLKX and AXR2 outputs
#else // IS_AM572x
#define MCASP_OUTPUT_PINS   	MCASP_PIN_AHCLKX | (1 << 2) // AHCLKX and AXR2 outputs
#endif // IS_AM572x
#else
#define MCASP_OUTPUT_PINS   	(1 << 3)	// Which pins are outputs
#endif

#define MCASP_DATA_MASK 	0xFFFF		// 16 bit data
#define MCASP_DATA_FORMAT	0x807C		// MSB first, 0 bit delay, 16 bits, CFG bus, ROR 16bits

#define C_MCASP_MEM             C28     	// Shared PRU mem

// Flags for the flags register
#define FLAG_BIT_BUFFER1	0
#define FLAG_BIT_USE_SPI	1
#define FLAG_BIT_MCASP_HWORD	2		// Whether we are on the high word for McASP transmission
#define FLAG_BIT_USE_DIGITAL	3
	
#define FLAG_BIT_MUX_CONFIG0	 8		// Mux capelet configuration:
#define FLAG_BIT_MUX_CONFIG1	 9		// 00 = off, 01 = 2 ch., 10 = 4 ch., 11 = 8 ch.
#define FLAG_MASK_MUX_CONFIG	 0x0300
#define FLAG_BIT_BELA_MINI      10
#define FLAG_BIT_CTAG_FACE      11
#define FLAG_BIT_CTAG_BEAST     12
#define FLAG_BIT_ADS816X        13
		
// Registers used throughout

// r1, r2, r3 are used for temporary storage
#define MEM_DIGITAL_BASE 0x11000 //Base address for DIGITAL : Shared RAM + 0x400
#define MEM_DIGITAL_BUFFER1_OFFSET 0x400 //Start pointer to DIGITAL_BUFFER1, which is 256 words after.
// 256 is the maximum number of frames allowed

#define reg_digital_current r6  // Pointer to current storage location of DIGITAL
#define reg_num_channels	r9		// Number of SPI ADC/DAC channels to use
#define reg_frame_current	r10		// Current frame count in SPI ADC/DAC transfer
#define reg_frame_total		r11		// Total frame count for SPI ADC/DAC
#define reg_dac_data		r12		// Current dword for SPI DAC
#define reg_adc_data		r13		// Current dword for SPI ADC
#define reg_mcasp_dac_data	r14		// Current dword for McASP DAC
#define reg_mcasp_adc_data	r15		// Current dword for McASP ADC
#define reg_dac_buf0		r16		// Start pointer to SPI DAC buffer 0
#define reg_dac_buf1		r17		// Start pointer to SPI DAC buffer 1
#define reg_dac_current		r18		// Pointer to current storage location of SPI DAC
#define reg_adc_current		r19		// Pointer to current storage location of SPI ADC
#define reg_mcasp_buf0		r20		// Start pointer to McASP DAC buffer 0
#define reg_mcasp_buf1		r21		// Start pointer to McASP DAC buffer 1
#define reg_mcasp_dac_current	r22		// Pointer to current storage location of McASP DAC
#define reg_mcasp_adc_current	r23		// Pointer to current storage location of McASP ADC
#define reg_flags		r24		// Buffer ID (0 and 1) and other flags
#define reg_comm_addr		r25		// Memory address for communicating with ARM
#define reg_spi_addr		r26		// Base address for SPI
// r27, r28 used in macros
#define reg_mcasp_addr		r29		// Base address for McASP
#define reg_pru1_mux_pins	r30		// Register mapped directly to P8 pins (PRU1 only)

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
//#define GPIO_CLEARDATAOUT 0x190 //SETDATAOUT is CLEARDATAOUT+4
#define GPIO_OE 0x134 
#define GPIO_DATAIN 0x138

.macro BELA_MINI_AND_JMP_TO
.mparam DEST
    QBBS DEST, reg_flags, FLAG_BIT_BELA_MINI
.endm

.macro BELA_MINI_OR_JMP_TO
.mparam DEST
    QBBC DEST, reg_flags, FLAG_BIT_BELA_MINI
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

// when first starting, we should go to START, skipping this section.
// however, the section is fairly long, so we have to use an intermediate step
QBA START_INTERMEDIATE

DIGITAL:
//IMPORTANT: do NOT use r28 in this macro, as it contains the return address for JAL
//r27 is now the input word passed in render(), one word per frame
//[31:16]: data(1=high, 0=low), [15:0]: direction (0=output, 1=input) )

#ifdef IS_AM572x
// same code as below with different mappings and without comments for brevity
// GPIO6-start
    MOV r2, GPIO6 | GPIO_OE
    LBBO r2, r2, 0, 4
    MOV r8, 0
    MOV r7, 0
    SET_GPIO_BITS r2, r8, r7, 5, 0, r27
    SET_GPIO_BITS r2, r8, r7, 6, 1, r27
    SET_GPIO_BITS r2, r8, r7, 18, 2, r27
    SET_GPIO_BITS r2, r8, r7, 4, 3, r27
    MOV r3, GPIO6 | GPIO_OE
    SBBO r2, r3, 0, 4
//GPIO6-end
//GPIO4-start
    MOV r3, GPIO4 | GPIO_OE
    LBBO r3, r3, 0, 4
    MOV r5, 0
    MOV r4, 0
    SET_GPIO_BITS r3, r5, r4, 3, 8, r27
    SET_GPIO_BITS r3, r5, r4, 29, 9, r27
    SET_GPIO_BITS r3, r5, r4, 26, 10, r27
    SET_GPIO_BITS r3, r5, r4, 9, 11, r27
    SET_GPIO_BITS r3, r5, r4, 23, 12, r27
    SET_GPIO_BITS r3, r5, r4, 19, 13, r27
    SET_GPIO_BITS r3, r5, r4, 22, 14, r27
    SET_GPIO_BITS r3, r5, r4, 20, 15, r27
    MOV r2, GPIO4 | GPIO_OE  //use r2 as a temp registerp
    SBBO r3, r2, 0, 4 //takes two cycles (10ns)
//GPIO4-end
#else // IS_AM572x
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
QBBC BELA_SET_GPIO_BITS_0, reg_flags, FLAG_BIT_BELA_MINI
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
BELA_SET_GPIO_BITS_0:
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
//r3 will hold GPIO2_OE
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
QBBC BELA_SET_GPIO_BITS_1, reg_flags, FLAG_BIT_BELA_MINI
    SET_GPIO_BITS r3, r5, r4, 0, 7, r27
    SET_GPIO_BITS r3, r5, r4, 22, 12, r27
    SET_GPIO_BITS r3, r5, r4, 24, 13, r27
    QBA SET_GPIO_BITS_1_DONE
BELA_SET_GPIO_BITS_1:
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
#endif // IS_AM572x

QBA START_INTERMEDIATE_DONE
START_INTERMEDIATE: // intermediate step to jump to START
    QBA START
START_INTERMEDIATE_DONE:

#ifdef IS_AM572x
    MOV r2, GPIO6 | GPIO_DATAIN
    MOV r3, GPIO4 | GPIO_DATAIN
    LBBO r2, r2, 0, 4
    LBBO r3, r3, 0, 4
//GPIO6
    READ_GPIO_BITS r2, 5, 0, r27
    READ_GPIO_BITS r2, 6, 1, r27
    READ_GPIO_BITS r2, 18, 2, r27
    READ_GPIO_BITS r2, 4, 3, r27
//GPIO4
    READ_GPIO_BITS r3, 3, 8, r27
    READ_GPIO_BITS r3, 29, 9, r27
    READ_GPIO_BITS r3, 26, 10, r27
    READ_GPIO_BITS r3, 9, 11, r27
    READ_GPIO_BITS r3, 23, 12, r27
    READ_GPIO_BITS r3, 19, 13, r27
    READ_GPIO_BITS r3, 22, 14, r27
    READ_GPIO_BITS r3, 20, 15, r27
    MOV r2, GPIO6 | GPIO_CLEARDATAOUT
    MOV r3, GPIO4 | GPIO_CLEARDATAOUT
    SBBO r7, r2, 0, 8
    SBBO r4, r3, 0, 8
#else // IS_AM572x
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
QBBC BELA_READ_GPIO_BITS, reg_flags, FLAG_BIT_BELA_MINI
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
BELA_READ_GPIO_BITS:
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
#endif // IS_AM572x
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
QBBS SKIP_CS_ASSERT, reg_flags, FLAG_BIT_BELA_MINI
     DAC_CS_ASSERT
SKIP_CS_ASSERT:
     DAC_TX reg
     DAC_WAIT_FOR_FINISH
QBBS SKIP_CS_UNASSERT, reg_flags, FLAG_BIT_BELA_MINI
     DAC_CS_UNASSERT
SKIP_CS_UNASSERT:
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

// Bring CS line low to write to ADC
.macro ADC_CS_ASSERT
#ifndef IS_AM572x
     BELA_MINI_OR_JMP_TO BELA
     MOV r27, ADC_CS_PIN_BELA_MINI
     MOV r28, ADC_GPIO_BELA_MINI + GPIO_CLEARDATAOUT
     QBA DONE
#endif // IS_AM572x
BELA:
     MOV r27, ADC_CS_PIN
     MOV r28, ADC_GPIO + GPIO_CLEARDATAOUT
DONE:
     SBBO r27, r28, 0, 4
.endm

// Bring CS line high at end of ADC transaction
.macro ADC_CS_UNASSERT
#ifndef IS_AM572x
     BELA_MINI_OR_JMP_TO BELA
     MOV r27, ADC_CS_PIN_BELA_MINI
     MOV r28, ADC_GPIO_BELA_MINI + GPIO_SETDATAOUT
     QBA DONE
#endif // IS_AM572x
BELA:
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

     LBBO r2, reg_comm_addr, COMM_BOARD_FLAGS, 4
     // Find out whether we are on BELA_MINI
     QBBC BELA_MINI_CHECK_DONE, r2, BOARD_FLAGS_BELA_MINI
     SET reg_flags, reg_flags, FLAG_BIT_BELA_MINI
BELA_MINI_CHECK_DONE:

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
     LBBO reg_num_channels, reg_comm_addr, COMM_SPI_NUM_CHANNELS, 4
     QBGT SPI_NUM_CHANNELS_LT8, reg_num_channels, 8 // 8 > num_channels ?
     LDI reg_num_channels, 8		// If N >= 8, N = 8
     QBA SPI_NUM_CHANNELS_DONE
SPI_NUM_CHANNELS_LT8:	
     QBGT SPI_NUM_CHANNELS_LT4, reg_num_channels, 4 // 4 > num_channels ?
     LDI reg_num_channels, 4		// If N >= 4, N = 4
     QBA SPI_NUM_CHANNELS_DONE
SPI_NUM_CHANNELS_LT4:
     LDI reg_num_channels, 2		// else N = 2
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

     // Configure CH1 for ADC, starting with ADS816X
     MOV r2, (3 << 27) | (ADC_DPE << 16) | (ADC_TRM << 12) | ((ADC_WL_ADS816X - 1) << 7) | (ADC_CLK_DIV << 2) | ADC_CLK_MODE
     SBBO r2, reg_spi_addr, SPI_CH1CONF, 4
   
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

    // enable MCASP interface clock in PRCM
    MOV r2, CLOCK_MCASP_VALUE
    MOV r3, CLOCK_BASE + CLOCK_MCASP0
    SBBO r2, r3, 0, 4

    // we need to wait for a few cycles after enabling the clock in order for
    // the McASP to work properly (we found experimentally that this is
    // required for some SoCs (e.g.: AM572x))
    MOV r2, 1000
MCASP_CLOCK_ENABLE_LOOP:
    SUB r2, r2, 1
    QBNE MCASP_CLOCK_ENABLE_LOOP, r2, 0

    // Prepare McASP0 for audio
    MCASP_REG_WRITE MCASP_GBLCTL, 0			// Disable McASP
    MCASP_REG_WRITE_EXT MCASP_SRCTL0, 0		// All serialisers off
    MCASP_REG_WRITE_EXT MCASP_SRCTL1, 0
    MCASP_REG_WRITE_EXT MCASP_SRCTL2, 0
    MCASP_REG_WRITE_EXT MCASP_SRCTL3, 0
    MCASP_REG_WRITE_EXT MCASP_SRCTL4, 0
    MCASP_REG_WRITE_EXT MCASP_SRCTL5, 0
#ifdef IS_AM572x
    MCASP_REG_WRITE_EXT MCASP_SRCTL6, 0
    MCASP_REG_WRITE_EXT MCASP_SRCTL7, 0
    MCASP_REG_WRITE_EXT MCASP_SRCTL8, 0
    MCASP_REG_WRITE_EXT MCASP_SRCTL9, 0
    MCASP_REG_WRITE_EXT MCASP_SRCTL10, 0
    MCASP_REG_WRITE_EXT MCASP_SRCTL11, 0
    MCASP_REG_WRITE_EXT MCASP_SRCTL12, 0
    MCASP_REG_WRITE_EXT MCASP_SRCTL13, 0
    MCASP_REG_WRITE_EXT MCASP_SRCTL14, 0
    MCASP_REG_WRITE_EXT MCASP_SRCTL15, 0
#endif // IS_AM572x

    MCASP_REG_WRITE MCASP_PWRIDLESYSCONFIG, 0x02	// Power on
    MCASP_REG_WRITE MCASP_PFUNC, 0x00		// All pins are McASP
    MCASP_REG_WRITE MCASP_PDIR, MCASP_OUTPUT_PINS	// Set pin direction
    MCASP_REG_WRITE MCASP_DLBCTL, 0x00
    MCASP_REG_WRITE MCASP_DITCTL, 0x00
    MCASP_REG_WRITE MCASP_RMASK, MCASP_DATA_MASK	// 16 bit data receive
    MCASP_REG_WRITE MCASP_RFMT, MCASP_DATA_FORMAT	// Set data format
    MCASP_REG_WRITE MCASP_AFSRCTL, 0x100		// I2S mode
    MCASP_REG_WRITE MCASP_ACLKRCTL, 0x80		// Sample on rising edge
    MCASP_REG_WRITE MCASP_AHCLKRCTL, 0x8000		// Internal clock, not inv, /1; irrelevant?
    MCASP_REG_WRITE MCASP_RTDM, 0x03		// Enable TDM slots 0 and 1
    MCASP_REG_WRITE MCASP_RINTCTL, 0x00		// No interrupts
    MCASP_REG_WRITE MCASP_XMASK, MCASP_DATA_MASK	// 16 bit data transmit
    MCASP_REG_WRITE MCASP_XFMT, MCASP_DATA_FORMAT	// Set data format
    MCASP_REG_WRITE MCASP_AFSXCTL, 0x100		// I2S mode
    MCASP_REG_WRITE MCASP_ACLKXCTL, 0x00		// Transmit on rising edge, sync. xmit and recv
    MCASP_REG_WRITE MCASP_AHCLKXCTL, 0x8000		// External clock from AHCLKX
    MCASP_REG_WRITE MCASP_XTDM, 0x03		// Enable TDM slots 0 and 1
    MCASP_REG_WRITE MCASP_XINTCTL, 0x00		// No interrupts
	
    MCASP_REG_WRITE_EXT MCASP_SRCTL_R, 0x02		// Set up receive serialiser
    MCASP_REG_WRITE_EXT MCASP_SRCTL_X, 0x01		// Set up transmit serialiser
    MCASP_REG_WRITE_EXT MCASP_WFIFOCTL, 0x00	// Disable FIFOs
    MCASP_REG_WRITE_EXT MCASP_RFIFOCTL, 0x00

    MCASP_REG_WRITE MCASP_XSTAT, 0xFF		// Clear transmit errors
    MCASP_REG_WRITE MCASP_RSTAT, 0xFF		// Clear receive errors

    MCASP_REG_SET_BIT_AND_POLL MCASP_RGBLCTL, (1 << 1)	// Set RHCLKRST
    MCASP_REG_SET_BIT_AND_POLL MCASP_XGBLCTL, (1 << 9)	// Set XHCLKRST

// The above write sequence will have temporarily changed the AHCLKX frequency
// The PLL needs time to settle or the sample rate will be unstable and possibly
// cause an underrun. Give it ~1ms before going on.
// 10ns per loop iteration = 10^-8s --> 10^5 iterations needed

MOV r2, 100000
MCASP_INIT_WAIT:	
     SUB r2, r2, 1
     QBNE MCASP_INIT_WAIT, r2, 0

MCASP_REG_SET_BIT_AND_POLL MCASP_RGBLCTL, (1 << 0)	// Set RCLKRST
MCASP_REG_SET_BIT_AND_POLL MCASP_XGBLCTL, (1 << 8)	// Set XCLKRST
MCASP_REG_SET_BIT_AND_POLL MCASP_RGBLCTL, (1 << 2)	// Set RSRCLR
MCASP_REG_SET_BIT_AND_POLL MCASP_XGBLCTL, (1 << 10)	// Set XSRCLR
MCASP_REG_SET_BIT_AND_POLL MCASP_RGBLCTL, (1 << 3)	// Set RSMRST
MCASP_REG_SET_BIT_AND_POLL MCASP_XGBLCTL, (1 << 11)	// Set XSMRST

MCASP_REG_WRITE_EXT MCASP_XBUF, 0x00		// Write to the transmit buffer to prevent underflow

MCASP_REG_SET_BIT_AND_POLL MCASP_RGBLCTL, (1 << 4)	// Set RFRST
MCASP_REG_SET_BIT_AND_POLL MCASP_XGBLCTL, (1 << 12)	// Set XFRST

// Initialisation
    LBBO reg_frame_total, reg_comm_addr, COMM_BUFFER_MCASP_FRAMES, 4  // Total frame count (SPI; 0.5x-2x for McASP)
    MOV reg_dac_buf0, 0                      // DAC buffer 0 start pointer
    LSL reg_dac_buf1, reg_frame_total, 1     // DAC buffer 1 start pointer = N[ch]*2[bytes]*bufsize
    LMBD r2, reg_num_channels, 1		 // Returns 1, 2 or 3 depending on the number of channels
    LSL reg_dac_buf1, reg_dac_buf1, r2	 // Multiply by 2, 4 or 8 to get the N[ch] scaling above
    MOV reg_mcasp_buf0, 0			 // McASP DAC buffer 0 start pointer
    LSL reg_mcasp_buf1, reg_frame_total, r2  // McASP DAC buffer 1 start pointer = 2[ch]*2[bytes]*(N/4)[samples/spi]*bufsize
    CLR reg_flags, reg_flags, FLAG_BIT_BUFFER1  // Bit 0 holds which buffer we are on
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
// Here we are out of sync by one TDM slot since the 0 word transmitted above will have occupied
// the first output slot. Send one more word before jumping into the loop.
MCASP_DAC_WAIT_BEFORE_LOOP:	
     LBBO r2, reg_mcasp_addr, MCASP_XSTAT, 4
     QBBC MCASP_DAC_WAIT_BEFORE_LOOP, r2, MCASP_XSTAT_XDATA_BIT

     MCASP_REG_WRITE_EXT MCASP_XBUF, 0x00

// Likewise, read and discard the first sample we get back from the ADC. This keeps the DAC and ADC
// in sync in terms of which TDM slot we are reading (empirically found that we should throw this away
// rather than keep it and invert the phase)
MCASP_ADC_WAIT_BEFORE_LOOP:
     LBBO r2, reg_mcasp_addr, MCASP_RSTAT, 4
     QBBC MCASP_ADC_WAIT_BEFORE_LOOP, r2, MCASP_RSTAT_RDATA_BIT

     MCASP_REG_READ_EXT MCASP_RBUF, r2
	
WRITE_ONE_BUFFER:

     // Write a single buffer of DAC samples and read a buffer of ADC samples
     // Load starting positions
     MOV reg_dac_current, reg_dac_buf0         // DAC: reg_dac_current is current pointer
     LMBD r2, reg_num_channels, 1		// 1, 2 or 3 for 2, 4 or 8 channels
QBBC BELA_CHANNELS, reg_flags, FLAG_BIT_BELA_MINI
     // there are 0 dac values, so ADC starts at the same point as DAC
     MOV reg_adc_current, reg_dac_current
     QBA CHANNELS_DONE
BELA_CHANNELS:
     LSL reg_adc_current, reg_frame_total, r2
     LSL reg_adc_current, reg_adc_current, 2   // N * 2 * 2 * bufsize
     ADD reg_adc_current, reg_adc_current, reg_dac_current // ADC: starts N * 2 * 2 * bufsize beyond DAC
CHANNELS_DONE:
    MOV reg_mcasp_dac_current, reg_mcasp_buf0 // McASP: set current DAC pointer
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

WRITE_LOOP:
     // Write N channels to DAC from successive values in memory
     // At the same time, read N channels from ADC
     // Unrolled by a factor of 2 to get high and low words
     MOV r1, 0
ADC_DAC_LOOP:
     QBBC SPI_DAC_LOAD_DONE, reg_flags, FLAG_BIT_USE_SPI
     // Load next 2 SPI DAC samples and store zero in their place
     LBCO reg_dac_data, C_ADC_DAC_MEM, reg_dac_current, 4
     MOV r2, 0
     SBCO r2, C_ADC_DAC_MEM, reg_dac_current, 4
     ADD reg_dac_current, reg_dac_current, 4
SPI_DAC_LOAD_DONE:

     // On even iterations, load two more samples and choose the first one
     // On odd iterations, transmit the second of the samples already loaded
     // QBBS MCASP_DAC_HIGH_WORD, r1, 1
     QBBS MCASP_DAC_HIGH_WORD, reg_flags, FLAG_BIT_MCASP_HWORD
MCASP_DAC_LOW_WORD:	
     // Load next 2 Audio DAC samples and store zero in their place
     LBCO reg_mcasp_dac_data, C_MCASP_MEM, reg_mcasp_dac_current, 4
     MOV r2, 0
     SBCO r2, C_MCASP_MEM, reg_mcasp_dac_current, 4
     ADD reg_mcasp_dac_current, reg_mcasp_dac_current, 4

     // Mask out the low word (first in little endian)
     MOV r2, 0xFFFF
     AND r7, reg_mcasp_dac_data, r2
	
     QBA MCASP_WAIT_XSTAT
MCASP_DAC_HIGH_WORD:
     // Take the high word of the previously loaded data
     LSR r7, reg_mcasp_dac_data, 16
	
     // Every 2 channels we send one audio sample; this loop already
     // sends exactly two SPI channels.
     // Wait for McASP XSTAT[XDATA] to set indicating we can write more data
MCASP_WAIT_XSTAT:
     LBBO r2, reg_mcasp_addr, MCASP_XSTAT, 4
     QBBS START, r2, MCASP_XSTAT_XUNDRN_BIT // if underrun occurred, reset the PRU
     QBBC MCASP_WAIT_XSTAT, r2, MCASP_XSTAT_XDATA_BIT

     MCASP_REG_WRITE_EXT MCASP_XBUF, r7
	
     // Same idea with ADC: even iterations, load the sample into the low word, odd
     // iterations, load the sample into the high word and store
     // QBBS MCASP_ADC_HIGH_WORD, r1, 1
     QBBS MCASP_ADC_HIGH_WORD, reg_flags, FLAG_BIT_MCASP_HWORD
MCASP_ADC_LOW_WORD:	
     // Start ADC data at 0
     LDI reg_mcasp_adc_data, 0
	
     // Now wait for a received word to become available from the audio ADC
MCASP_WAIT_RSTAT_LOW:
     LBBO r2, reg_mcasp_addr, MCASP_RSTAT, 4
     QBBC MCASP_WAIT_RSTAT_LOW, r2, MCASP_RSTAT_RDATA_BIT

     // Mask low word and store in ADC data register
     MCASP_REG_READ_EXT MCASP_RBUF, r3
     MOV r2, 0xFFFF
     AND reg_mcasp_adc_data, r3, r2
     QBA MCASP_ADC_DONE

MCASP_ADC_HIGH_WORD:	
     // Wait for a received word to become available from the audio ADC
MCASP_WAIT_RSTAT_HIGH:
     LBBO r2, reg_mcasp_addr, MCASP_RSTAT, 4
     QBBC MCASP_WAIT_RSTAT_HIGH, r2, MCASP_RSTAT_RDATA_BIT

     // Read data and shift 16 bits to the left (into the high word)
     MCASP_REG_READ_EXT MCASP_RBUF, r3
     LSL r3, r3, 16
     OR reg_mcasp_adc_data, reg_mcasp_adc_data, r3

     // Now store the result and increment the pointer
     SBCO reg_mcasp_adc_data, C_MCASP_MEM, reg_mcasp_adc_current, 4
     ADD reg_mcasp_adc_current, reg_mcasp_adc_current, 4
MCASP_ADC_DONE:	
     QBBC SPI_SKIP_WRITE, reg_flags, FLAG_BIT_USE_SPI

QBBS SPI_SKIP_DAC_WRITE_0, reg_flags, FLAG_BIT_BELA_MINI
     // DAC: transmit low word (first in little endian)
     MOV r2, 0xFFFF
     AND r7, reg_dac_data, r2
     LSL r7, r7, AD5668_DATA_OFFSET
     MOV r8, (0x03 << AD5668_COMMAND_OFFSET)
     OR r7, r7, r8
     DAC_CHANNEL_REORDER r8, r1
     LSL r8, r8, AD5668_ADDRESS_OFFSET
     OR r7, r7, r8
     DAC_WRITE r7
SPI_SKIP_DAC_WRITE_0:

     // Read ADC channels: result is always 2 commands behind
     // Start by reading channel 2 (result is channel 0) and go
     // to N+2, but masking the channel number to be between 0 and N-1
     LDI reg_adc_data, 0
     ADD r8, r1, 2
     SUB r7, reg_num_channels, 1
     AND r8, r8, r7

     ADC_PREPARE_DATA r8
     ADC_WRITE_GPIO r8, r7, r1 // includes DO_DIGITAL
     ADC_PROCESS_DATA r7

     // Mask out only the relevant 16 bits and store in reg_adc_data
     MOV r2, 0xFFFF
     AND reg_adc_data, r7, r2
     // Increment channel index
     ADD r1, r1, 1

QBBS SPI_SKIP_DAC_WRITE_1, reg_flags, FLAG_BIT_BELA_MINI
     // DAC: transmit high word (second in little endian)
     LSR r7, reg_dac_data, 16
     LSL r7, r7, AD5668_DATA_OFFSET
     MOV r8, (0x03 << AD5668_COMMAND_OFFSET)
     OR r7, r7, r8
     DAC_CHANNEL_REORDER r8, r1
     LSL r8, r8, AD5668_ADDRESS_OFFSET
     OR r7, r7, r8
SPI_SKIP_DAC_WRITE_1:
     // this DAC_WRITE should also be conditional to BELA_MINI, but if we do that, the ADC reads weird values. No idea why. Anyhow, we disabled the CS_ in DAC_WRITE
     DAC_WRITE r7

     // Read ADC channels: result is always 2 commands behind
     // Start by reading channel 2 (result is channel 0) and go
     // to N+2, but masking the channel number to be between 0 and N-1
     ADD r8, r1, 2
     SUB r7, reg_num_channels, 1
     AND r8, r8, r7

     ADC_PREPARE_DATA r8
     ADC_WRITE r8, r7
     ADC_PROCESS_DATA r7

     // Move this result up to the 16 high bits
     LSL r7, r7, 16
     OR reg_adc_data, reg_adc_data, r7

     // Store 2 ADC words in memory
     SBCO reg_adc_data, C_ADC_DAC_MEM, reg_adc_current, 4
     ADD reg_adc_current, reg_adc_current, 4

     // If enabled, update the multiplexer settings
     QBNE MUX_0_3_DONE, r1, 3    // Change mux settings for ch0-3 after reading ch. 3
     MUX_INCREMENT_0_TO_3
MUX_0_3_DONE:
     QBNE MUX_4_7_DONE, r1, 7    // Change mux settings for ch4-7 after reading ch. 7
     MUX_INCREMENT_4_TO_7
MUX_4_7_DONE:
	
     // Toggle the high/low word for McASP control (since we send one word out of
     // 32 bits for each pair of SPI channels)
     XOR reg_flags, reg_flags, (1 << FLAG_BIT_MCASP_HWORD)
	
     // Repeat 4 times for 8 channels (2 samples per loop, r1 += 1 already happened)
     // For 4 or 2 channels, repeat 2 or 1 times, according to flags
     ADD r1, r1, 1
     QBNE ADC_DAC_LOOP, r1, reg_num_channels
     QBA ADC_DAC_LOOP_DONE
SPI_SKIP_WRITE:
     // We get here only if the SPI ADC and DAC are disabled

     // if digital is enabled and SPI is disabled, do digital here on even frames
     QBBC GPIO_DONE, reg_flags, FLAG_BIT_USE_DIGITAL //skip if DIGITAL is disabled
     AND r27, reg_frame_current, 0x1 // even frames only
     QBNE GPIO_DONE, r27, 0
     DO_DIGITAL
GPIO_DONE:
     // Just keep the loop going for McASP

     // Toggle the high/low word for McASP control (since we send one word out of
     // 32 bits for each pair of SPI channels)
     XOR reg_flags, reg_flags, (1 << FLAG_BIT_MCASP_HWORD)

     ADD r1, r1, 2
     QBNE ADC_DAC_LOOP, r1, reg_num_channels
	
ADC_DAC_LOOP_DONE:
     // Increment number of frames, see if we have more to write
     ADD reg_frame_current, reg_frame_current, 1
     QBNE WRITE_LOOP, reg_frame_current, reg_frame_total

WRITE_LOOP_DONE:
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
     MOV r31.b0, PRU_SYSTEM_EVENT_RTDM_WRITE_VALUE // Interrupt to ARM
	
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
     MCASP_REG_WRITE MCASP_GBLCTL, 0x00	// Turn off McASP

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
     // Signal the ARM that we have finished 
     MOV r31.b0, PRU_SYSTEM_EVENT_RTDM_WRITE_VALUE
     HALT
