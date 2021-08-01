#ifndef DIGITAL_MAPPING_H
#define DIGITAL_MAPPING_H

enum {NUM_DIGITALS = 16};
//GPIO_INPUT and GPIO_OUTPUT values when calling the setDigitalDirection() macro.
//TODO: these are inverted with respect to INPUT_PIN and OUTPUT_PIN defined in GPIOcontrol.h,
//which might lead to unexpected results in case someone uses those in place of these or viceversa
#define GPIO_INPUT 1
#define GPIO_OUTPUT 0
#define GPIO_HIGH 1
#define GPIO_LOW 0
//mapping GPIO numbers to header pins
//if you want to use different pins/ordering, define here new pins. The ordering here is NOT binding
enum
{
	// these are for PocketBeagle (BelaMini)
	P2_01_GPIO_NO = 50,
	P2_02_GPIO_NO = 59,
	P2_04_GPIO_NO = 58,
	P2_06_GPIO_NO = 57,
	P2_08_GPIO_NO = 60,
	P2_10_GPIO_NO = 52,
	P2_18_GPIO_NO = 47,
	P2_20_GPIO_NO = 64,
	P2_22_GPIO_NO = 46,
	P2_24_GPIO_NO = 44,
	P2_25_GPIO_NO = 41,
	P2_27_GPIO_NO = 40,
	P2_35_GPIO_NO = 86,
	P1_35_GPIO_NO = 88,
	P1_32_GPIO_NO = 42,
	P1_30_GPIO_NO = 43,
};

enum
{
#ifdef IS_AM572x
	// these are for BeagleBoneAI
	P8_07_GPIO_NO = 165,
	P8_08_GPIO_NO = 166,
	P8_09_GPIO_NO = 178,
	P8_10_GPIO_NO = 164,
	P8_11_GPIO_NO = 75,
	P8_12_GPIO_NO = 74,
	P9_12_GPIO_NO = 128,
	P9_14_GPIO_NO = 121,
	P8_15_GPIO_NO = 99,
	P8_16_GPIO_NO = 125,
	P9_16_GPIO_NO = 122,
	P8_18_GPIO_NO = 105,
	P8_27_GPIO_NO = 119,
	P8_28_GPIO_NO = 115,
	P8_29_GPIO_NO = 118,
	P8_30_GPIO_NO = 116,
#else // IS_AM572x
	// these are for BeagleBone (Everything else)
	P8_07_GPIO_NO = 66,
	P8_08_GPIO_NO = 67,
	P8_09_GPIO_NO = 69,
	P8_10_GPIO_NO = 68,
	P8_11_GPIO_NO = 45,
	P8_12_GPIO_NO = 44,
	P9_12_GPIO_NO = 60,
	P9_14_GPIO_NO = 50,
	P8_15_GPIO_NO = 47,
	P8_16_GPIO_NO = 46,
	P9_16_GPIO_NO = 51,
	P8_18_GPIO_NO = 65,
	P8_27_GPIO_NO = 86,
	P8_28_GPIO_NO = 88,
	P8_29_GPIO_NO = 87,
	P8_30_GPIO_NO = 89,
#endif // IS_AM572x
};

//mapping pin headers to bits in the digital word.
//used in the declaration of short int digitalPins[NUM_DIGITALS] below, which is used in PRU::prepareGPIO to export the pins
//if you want to use different pins, declare them above and use them here
//The ordering here is NOT binding, but if you want to use a different ordering, please change it here as well as below and in the PRU, for consistency
static unsigned int digitalPinsPocketBeagle[NUM_DIGITALS] = {
	P2_01_GPIO_NO,
	P2_02_GPIO_NO,
	P2_04_GPIO_NO,
	P2_06_GPIO_NO,
	P2_08_GPIO_NO,
	P2_10_GPIO_NO,
	P2_18_GPIO_NO,
	P2_20_GPIO_NO,
	P2_22_GPIO_NO,
	P2_24_GPIO_NO,
	P2_25_GPIO_NO,
	P2_27_GPIO_NO,
	P2_35_GPIO_NO,
	P1_35_GPIO_NO,
	P1_32_GPIO_NO,
	P1_30_GPIO_NO,
};

static unsigned int digitalPinsBeagleBone[NUM_DIGITALS] = {
	P8_07_GPIO_NO,
	P8_08_GPIO_NO,
	P8_09_GPIO_NO,
	P8_10_GPIO_NO,
	P8_11_GPIO_NO,
	P8_12_GPIO_NO,
	P9_12_GPIO_NO,
	P9_14_GPIO_NO,
	P8_15_GPIO_NO,
	P8_16_GPIO_NO,
	P9_16_GPIO_NO,
	P8_18_GPIO_NO,
	P8_27_GPIO_NO,
	P8_28_GPIO_NO,
	P8_29_GPIO_NO,
	P8_30_GPIO_NO,
};

//mapping bits in the digital word to pin headers, so that pin header name can be used instead of but number
//The ordering here IS binding. If you want to use different pins/ordering, please do it above as well as here and in the PRU, for consistency

enum {
	P2_01 = 0,
	P2_02 = 1,
	P2_04 = 2,
	P2_06 = 3,
	P2_08 = 4,
	P2_10 = 5,
	P2_18 = 6,
	P2_20 = 7,
	P2_22 = 8,
	P2_24 = 9,
	P2_25 = 10,
	P2_27 = 11,
	P2_35 = 12,
	P1_35 = 13,
	P1_32 = 14,
	P1_30 = 15,
};
enum {
	P8_07 = 0,
	P8_08 = 1,
	P8_09 = 2,
	P8_10 = 3,
	P8_11 = 4,
	P8_12 = 5,
	P9_12 = 6,
	P9_14 = 7,
	P8_15 = 8,
	P8_16 = 9,
	P9_16 = 10,
	P8_18 = 11,
	P8_27 = 12,
	P8_28 = 13,
	P8_29 = 14,
	P8_30 = 15,
};

#endif
