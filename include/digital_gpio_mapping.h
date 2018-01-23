#ifndef DIGITAL_MAPPING_H
#define DIGITAL_MAPPING_H

#define BELA_MINI
#define NUM_DIGITALS 16
extern short int digitalPins[NUM_DIGITALS];
//GPIO_INPUT and GPIO_OUTPUT values when calling the setDigitalDirection() macro.
//TODO: these are inverted with respect to INPUT_PIN and OUTPUT_PIN defined in GPIOcontrol.h,
//which might lead to unexpected results in case someone uses those in place of these or viceversa
#define GPIO_INPUT 1
#define GPIO_OUTPUT 0
#define GPIO_HIGH 1
#define GPIO_LOW 0
//mapping GPIO numbers to header pins
//if you want to use different pins/ordering, define here new pins. The ordering here is NOT binding
#ifdef BELA_MINI
#define P2_01_GPIO_NO 50
#define P2_02_GPIO_NO 59
#define P2_04_GPIO_NO 58
#define P2_06_GPIO_NO 57
#define P2_08_GPIO_NO 60
#define P2_10_GPIO_NO 52
#define P2_18_GPIO_NO 47
#define P2_20_GPIO_NO 64
#define P2_22_GPIO_NO 46
#define P2_24_GPIO_NO 44
#define P2_25_GPIO_NO 41
#define P2_27_GPIO_NO 40
#define P2_35_GPIO_NO 86
#define P1_35_GPIO_NO 88
#define P1_32_GPIO_NO 42
#define P1_30_GPIO_NO 43

#else /* BELA_MINI */

#define P8_07_GPIO_NO 66
#define P8_08_GPIO_NO 67
#define P8_09_GPIO_NO 69
#define P8_10_GPIO_NO 68
#define P8_11_GPIO_NO 45
#define P8_12_GPIO_NO 44
#define P9_12_GPIO_NO 60
#define P9_14_GPIO_NO 50
#define P8_15_GPIO_NO 47
#define P8_16_GPIO_NO 46
#define P9_16_GPIO_NO 51
#define P8_18_GPIO_NO 65
#define P8_27_GPIO_NO 86
#define P8_28_GPIO_NO 88
#define P8_29_GPIO_NO 87
#define P8_30_GPIO_NO 89

#endif /* BELA_MINI */

//mapping pin headers to bits in the digital word.
//used in the declaration of short int digitalPins[NUM_DIGITALS] below, which is used in PRU::prepareGPIO to export the pins
//if you want to use different pins, declare them above and use them here
//The ordering here is NOT binding, but if you want to use a different ordering, please change it here as well as below and in the PRU, for consistency
#ifdef BELA_MINI
#define GPIO_NO_BIT_0 P2_01_GPIO_NO
#define GPIO_NO_BIT_1 P2_02_GPIO_NO
#define GPIO_NO_BIT_2 P2_04_GPIO_NO
#define GPIO_NO_BIT_3 P2_06_GPIO_NO
#define GPIO_NO_BIT_4 P2_08_GPIO_NO
#define GPIO_NO_BIT_5 P2_10_GPIO_NO
#define GPIO_NO_BIT_6 P2_18_GPIO_NO
#define GPIO_NO_BIT_7 P2_20_GPIO_NO
#define GPIO_NO_BIT_8 P2_22_GPIO_NO
#define GPIO_NO_BIT_9 P2_24_GPIO_NO
#define GPIO_NO_BIT_10 P2_25_GPIO_NO
#define GPIO_NO_BIT_11 P2_27_GPIO_NO
#define GPIO_NO_BIT_12 P2_35_GPIO_NO
#define GPIO_NO_BIT_13 P1_35_GPIO_NO
#define GPIO_NO_BIT_14 P1_32_GPIO_NO
#define GPIO_NO_BIT_15 P1_30_GPIO_NO
#else /* BELA_MINI */
#define GPIO_NO_BIT_0 P8_07_GPIO_NO
#define GPIO_NO_BIT_1 P8_08_GPIO_NO
#define GPIO_NO_BIT_2 P8_09_GPIO_NO
#define GPIO_NO_BIT_3 P8_10_GPIO_NO
#define GPIO_NO_BIT_4 P8_11_GPIO_NO
#define GPIO_NO_BIT_5 P8_12_GPIO_NO
#define GPIO_NO_BIT_6 P9_12_GPIO_NO
#define GPIO_NO_BIT_7 P9_14_GPIO_NO
#define GPIO_NO_BIT_8 P8_15_GPIO_NO
#define GPIO_NO_BIT_9 P8_16_GPIO_NO
#define GPIO_NO_BIT_10 P9_16_GPIO_NO
#define GPIO_NO_BIT_11 P8_18_GPIO_NO
#define GPIO_NO_BIT_12 P8_27_GPIO_NO
#define GPIO_NO_BIT_13 P8_28_GPIO_NO
#define GPIO_NO_BIT_14 P8_29_GPIO_NO
#define GPIO_NO_BIT_15 P8_30_GPIO_NO
#endif /* BELA_MINI */

//mapping bits in the digital word to pin headers, so that pin header name can be used instead of but number
//The ordering here IS binding. If you want to use different pins/ordering, please do it above as well as here and in the PRU, for consistency

#ifdef BELA_MINI
#define P2_01 0
#define P2_02 1
#define P2_04 2
#define P2_06 3
#define P2_08 4
#define P2_10 5
#define P2_18 6
#define P2_20 7
#define P2_22 8
#define P2_24 9
#define P2_25 10
#define P2_27 11
#define P2_35 12
#define P1_35 13
#define P1_32 14
#define P1_30 15
#else /* BELA_MINI */
#define P8_07 0
#define P8_08 1
#define P8_09 2
#define P8_10 3
#define P8_11 4
#define P8_12 5
#define P9_12 6
#define P9_14 7
#define P8_15 8
#define P8_16 9
#define P9_16 10
#define P8_18 11
#define P8_27 12
#define P8_28 13
#define P8_29 14
#define P8_30 15
#endif /* BELA_MINI */

#endif
