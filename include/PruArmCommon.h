#ifndef PRU_ARM_COMMON_H
#define PRU_ARM_COMMON_H

// this file is included by both core/Pru.cpp and pru/pru_rtaudio*.p
#define BOARD_FLAGS_BELA_MINI 0
#define BOARD_FLAGS_CTAG_FACE 1
#define BOARD_FLAGS_CTAG_BEAST 2
#define BOARD_FLAGS_BELA_GENERIC_TDM 3

#define PRU_SYSTEM_EVENT_RTDM 20
#define PRU_SYS_EV_MCASP_RX_INTR    54 // mcasp_r_intr_pend
#define PRU_SYS_EV_MCASP_TX_INTR    55 // mcasp_x_intr_pend

// error codes sent from the PRU
#define ARM_ERROR_TIMEOUT 1
#define ARM_ERROR_XUNDRUN 2
#define ARM_ERROR_XSYNCERR 3
#define ARM_ERROR_XCKFAIL 4
#define ARM_ERROR_XDMAERR 5
#define ARM_ERROR_INVALID_INIT 6

// Offsets within CPU <-> PRU communication memory (4 byte slots)
#define COMM_SHOULD_STOP                 0 // Set to be nonzero when loop should stop
#define COMM_CURRENT_BUFFER              4 // Which buffer we are on
#define COMM_BUFFER_MCASP_FRAMES         8 // How many frames per buffer for audio
#define COMM_SHOULD_SYNC                12 // Whether to synchronise to an external clock
#define COMM_SYNC_ADDRESS               16 // Which memory address to find the GPIO on
#define COMM_SYNC_PIN_MASK              20 // Which pin to read for the sync
#define COMM_LED_ADDRESS                24 // Which memory address to find the status LED on
#define COMM_LED_PIN_MASK               28 // Which pin to write to change LED
#define COMM_FRAME_COUNT                32 // How many frames have elapse since beginning
#define COMM_USE_SPI                    36 // Whether or not to use SPI ADC and DAC
#define COMM_SPI_NUM_CHANNELS           40 // Low 2 bits indicate 8 [0x3], 4 [0x1] or 2 [0x0] channels
#define COMM_USE_DIGITAL                44 // Whether or not to use DIGITAL
#define COMM_PRU_NUMBER                 48 // Which PRU this code is running on
#define COMM_MUX_CONFIG                 52 // Whether to use the mux capelet, and how many channels
#define COMM_MUX_END_CHANNEL            56 // Which mux channel the last buffer ended on
#define COMM_BUFFER_SPI_FRAMES          60 // How many frames per buffer for analog i/o
#define COMM_BOARD_FLAGS                64 // Flags for the board we are on (BOARD_FLAGS_... are defined in include/PruArmCommon.h)
#define COMM_ERROR_OCCURRED             68 // Signals the ARM CPU that an error happened
#define COMM_ACTIVE_CHANNELS            72 // How many TDM slots contain useful data
// the order of the following registers has to strictly follow the order of the
// members of McaspRegisters
#define COMM_MCASP_CONF_PDIR            76
#define COMM_MCASP_CONF_RMASK           80
#define COMM_MCASP_CONF_RFMT            84
#define COMM_MCASP_CONF_AFSRCTL         88
#define COMM_MCASP_CONF_ACLKRCTL        92
#define COMM_MCASP_CONF_AHCLKRCTL       96
#define COMM_MCASP_CONF_RTDM           100
#define COMM_MCASP_CONF_XMASK          104
#define COMM_MCASP_CONF_XFMT           108
#define COMM_MCASP_CONF_AFSXCTL        112
#define COMM_MCASP_CONF_ACLKXCTL       116
#define COMM_MCASP_CONF_AHCLKXCTL      120
#define COMM_MCASP_CONF_XTDM           124
#define COMM_MCASP_CONF_SRCTLN         128 // 4 bytes, one for each of SRCTL[0]...SRCTL[3]
#define COMM_MCASP_CONF_WFIFOCTL       132
#define COMM_MCASP_CONF_RFIFOCTL       136

// ARM accesses these memory locations as uint32_t
// to avoid duplication and mistakes, we use macros to generate the values for ARM
// pasm is stupid and doesn't know about __TIME__, so this gives us a clue that
// we are using clang/gcc and we can use some more advanced preprocessor
// directives in here to generate some C code
#ifdef __TIME__
#define ENUM(NAME) PRU_ ## NAME = (NAME/4),
typedef enum {
ENUM(COMM_SHOULD_STOP)
ENUM(COMM_CURRENT_BUFFER)
ENUM(COMM_BUFFER_MCASP_FRAMES)
ENUM(COMM_SHOULD_SYNC)
ENUM(COMM_SYNC_ADDRESS)
ENUM(COMM_SYNC_PIN_MASK)
ENUM(COMM_LED_ADDRESS)
ENUM(COMM_LED_PIN_MASK)
ENUM(COMM_FRAME_COUNT)
ENUM(COMM_USE_SPI)
ENUM(COMM_SPI_NUM_CHANNELS)
ENUM(COMM_USE_DIGITAL)
ENUM(COMM_PRU_NUMBER)
ENUM(COMM_MUX_CONFIG)
ENUM(COMM_MUX_END_CHANNEL)
ENUM(COMM_BUFFER_SPI_FRAMES)
ENUM(COMM_BOARD_FLAGS)
ENUM(COMM_ERROR_OCCURRED)
ENUM(COMM_ACTIVE_CHANNELS)
ENUM(COMM_MCASP_CONF_PDIR)
} PruCommonFlags;
#endif // __TIME__

#endif /* PRU_ARM_COMMON_H */
