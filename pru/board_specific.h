// board-specific peripheral and pins definitions

//#define AUDIO_CAPE // as in: CircuitCo Audio Cape (I _think_: long untested)

#ifdef IS_AM572x

#define CLOCK_BASE 0x4A005000
#define CLOCK_MCASP1 0x550
#define CLOCK_MCASP_VALUE 0x7000002
#define CLOCK_SPI2 0x47F8
#define SPI2_BASE 0x4809A100
#define MCASP1_BASE 0x48460000
#define MCASP1_DATAPORT 0x45800000
#define GPIO1 0x4AE10000
#define GPIO2 0x48055000
#define GPIO3 0x48057000
#define GPIO4 0x48059000
#define GPIO5 0x4805B000
#define GPIO6 0x4805D000
#define GPIO7 0x48051000
#define GPIO8 0x48053000

#else // IS_AM572x

#define CLOCK_BASE 0x44E00000
#define CLOCK_MCASP0 0x34
#define CLOCK_MCASP_VALUE 0x30002 // should probably be just 0x2
#define CLOCK_SPI0 0x4C
#define SPI0_BASE 0x48030100
#define MCASP0_BASE 0x48038000
#define MCASP0_DATAPORT 0x46000000
#define GPIO0 0x44E07000
#define GPIO1 0x4804C000
#define GPIO2 0x481AC000
#define GPIO3 0x481AE000,

#endif // IS_AM572x

// below we select the peripherals and pins we are actually using
#ifdef IS_AM572x

#define SPI_BASE SPI2_BASE
#define CLOCK_SPI CLOCK_SPI2
#define MCASP_BASE MCASP1_BASE
#define CLOCK_MCASP CLOCK_MCASP1
#define MCASP_DATAPORT MCASP1_DATAPORT
#define DAC_GPIO GPIO7
#define DAC_CS_PIN (1<<17) // GPIO7:17 = P9 pin 17
#define SPI_DPE_IS 0x6 // d1 = receive, d0 = transmit, input select d1
#define ADC_GPIO GPIO3
#define ADC_CS_PIN (1<<12) // GPIO3:12 = P9 pin 15

// MCASP settings below are ignored by pru_rtaudio_irq when in BELA_GENERIC_TDM mode
#define MCASP_SRCTL_X MCASP_SRCTL11 // Ser. 11 is transmitter
#define MCASP_SRCTL_R MCASP_SRCTL10 // Ser. 10 is receiver
#define MCASP_XBUF MCASP_XBUF11
#define MCASP_RBUF MCASP_RBUF10
#define MCASP_OUTPUT_PINS MCASP_PIN_AHCLKX | (1 << 11) // AHCLKX and AXR2 outputs

#else // IS_AM572x

#define SPI_BASE SPI0_BASE
#define CLOCK_SPI CLOCK_SPI0
#define MCASP_BASE MCASP0_BASE
#define CLOCK_MCASP CLOCK_MCASP0
#define MCASP_DATAPORT MCASP0_DATAPORT
#define DAC_GPIO GPIO0
#define DAC_CS_PIN (1<<5) // GPIO0:5 = P9 pin 17
#define SPI_DPE_IS 0x1 // d0 = receive, d1 = transmit, input select d0
#define ADC_GPIO GPIO1
#define ADC_CS_PIN (1<<16) // GPIO1:16 = P9 pin 15
// for BELA_MINI, this is the same as DAC_CS_PIN, but the latter is disabled in DAC_WRITE
#define ADC_GPIO_BELA_MINI GPIO0
#define ADC_CS_PIN_BELA_MINI (1<<5) // GPIO1:5 = P1 pin 6

// MCASP settings below are ignored by pru_rtaudio_irq when in BELA_GENERIC_TDM mode
#define MCASP_SRCTL_X MCASP_SRCTL2 // Ser. 2 is transmitter
#define MCASP_SRCTL_R MCASP_SRCTL0 // Ser. 0 is receiver
#define MCASP_XBUF MCASP_XBUF2
#define MCASP_RBUF MCASP_RBUF0
#define MCASP_OUTPUT_PINS MCASP_PIN_AHCLKX | (1 << 2) // AHCLKX and AXR2 outputs

#endif // IS_AM572x

#ifdef AUDIO_CAPE
#ifdef IS_AM572x
#error You should define appropriate values for AUDIO_CAPE
#else // IS_AM572x
#undef MCASP_SRCTL_X
#undef MCASP_SRCTL_R
#undef MCASP_XBUF
#undef MCASP_RBUF
#undef MCASP_OUTPUT_PINS
#define MCASP_SRCTL_X MCASP_SRCTL3 // Ser. 3 is transmitter
#define MCASP_SRCTL_R MCASP_SRCTL2 // Ser. 2 is receiver
#define MCASP_XBUF MCASP_XBUF3
#define MCASP_RBUF MCASP_RBUF2
#define MCASP_OUTPUT_PINS (1 << 3) // Which pins are outputs
#endif // IS_AM572x
#endif // AUDIO_CAPE
