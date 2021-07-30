#pragma once
#ifdef IS_AM572x // BBAI
const unsigned int codecI2cBus  = 3;	// Bus for TLV320AIC3104 codec
#else // BBB
const unsigned int codecI2cBus  = 2;	// Bus for TLV320AIC3104 codec
#endif // IS_AM572x
const unsigned int codecI2cAddress  = 0x18;	// Address of TLV320AIC3104 codec
const unsigned int kBelaCapeButtonPin = 115; //P9.27 / P2.34 connected to The Button
const unsigned int kAmplifierMutePin = 61; // P8.26 controls amplifier mute

#include <linux/version.h>
#if LINUX_VERSION_CODE >= KERNEL_VERSION(4, 14, 108) // first kernel we shipped with a different location of the spidevs
const char ctagSpidevGpioCs0[] = "/dev/spidev3.0"; // Path for SPI bus 0
const char ctagSpidevGpioCs1[] = "/dev/spidev3.1"; // Path for SPI bus 1
#else // 4.14.108
const char ctagSpidevGpioCs0[] = "/dev/spidev32766.0"; // Path for SPI bus 0
const char ctagSpidevGpioCs1[] = "/dev/spidev32766.1"; // Path for SPI bus 1
#endif // 4.14.108
