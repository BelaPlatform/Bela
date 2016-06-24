#ifndef DIGITAL_MAPPING_H
#define DIGITAL_MAPPING_H

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

//mapping pin headers to bits in the digital word.
//used in the declaration of short int digitalPins[NUM_DIGITALS] below, which is used in PRU::prepareGPIO to export the pins
//if you want to use different pins, declare them above and use them here
//The ordering here is NOT binding, but if you want to use a different ordering, please change it here as well as below and in the PRU, for consistency
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

//mapping bits in the digital word to pin headers, so that pin header name can be used instead of but number
//The ordering here IS binding. If you want to use different pins/ordering, please do it above as well as here and in the PRU, for consistency
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

#endif
