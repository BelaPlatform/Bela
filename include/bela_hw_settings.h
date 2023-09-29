#pragma once
// This assumes BBB/BBG/PB
const unsigned int codecI2cBus = 2; // Bus for TLV320AIC3104 and/or ES9080Q
const unsigned int kBelaCapeButtonPin = 115; //P9.27 / P2.34
const unsigned int kAmplifierMutePin = 61; // P8.26 / nothing on BelaMini
const unsigned int kSpiDacChipSelectPin = 5; // P9.17 used for ADC on BelaMini
const unsigned int kSpiAdcChipSelectPin = 48; // P9.15 unused on BelaMini
// below are for user LED USR3
const unsigned int kUserLedGpioPin = 56;
const unsigned int kUserLedNumber = 3;
const char kUserLedDefaultTrigger[] = "mmc1";
const unsigned int tlv320CodecI2cAddress = 0x18; // Address of TLV320AIC3104
const unsigned int es9080CodecAddress = 0x4c; // write-only address of TLV320AIC3104
const unsigned int es9080CodecResetPin = 11; // reset GPIO

#include <linux/version.h>
#if LINUX_VERSION_CODE >= KERNEL_VERSION(4, 14, 108) // first kernel we shipped with a different location of the spidevs
const char ctagSpidevGpioCs0[] = "/dev/spidev3.0"; // Path for SPI bus 0
const char ctagSpidevGpioCs1[] = "/dev/spidev3.1"; // Path for SPI bus 1
#else // 4.14.108
const char ctagSpidevGpioCs0[] = "/dev/spidev32766.0"; // Path for SPI bus 0
const char ctagSpidevGpioCs1[] = "/dev/spidev32766.1"; // Path for SPI bus 1
#endif // 4.14.108
