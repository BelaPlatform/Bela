#ifndef PRU_ARM_COMMON_H
#define PRU_ARM_COMMON_H

// this file is included by both Pru.h and pru/pru_rtaudio*.h
#define BOARD_FLAGS_BELA_MINI 0
#define BOARD_FLAGS_CTAG_FACE 1
#define BOARD_FLAGS_CTAG_BEAST 2
#define BOARD_FLAGS_BELA_MULTI_TLV 3

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

#endif /* PRU_ARM_COMMON_H */
