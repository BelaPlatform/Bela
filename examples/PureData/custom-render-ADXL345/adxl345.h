#ifndef ADXL345_H
#define ADXL345_H

#define I2C_DEVICE_0 "/dev/i2c-0"
#define I2C_DEVICE_1 "/dev/i2c-1"
#define I2C_DEVICE_2 "/dev/i2c-2"

#define ADXL345_ADDR_LOW 0x53
#define ADXL345_ADDR_HIGH 0x1d

/* Used with register 0x2C (ADXL345_REG_BW_RATE) to set bandwidth */
typedef enum
{
  ADXL345_DATARATE_3200_HZ = 0b1111, // 1600Hz Bandwidth 140µA IDD
  ADXL345_DATARATE_1600_HZ = 0b1110, // 800Hz Bandwidth 90µA IDD
  ADXL345_DATARATE_800_HZ  = 0b1101, // 400Hz Bandwidth 140µA IDD
  ADXL345_DATARATE_400_HZ  = 0b1100, // 200Hz Bandwidth 140µA IDD
  ADXL345_DATARATE_200_HZ  = 0b1011, // 100Hz Bandwidth 140µA IDD
  ADXL345_DATARATE_100_HZ  = 0b1010, // 50Hz Bandwidth 140µA IDD
  ADXL345_DATARATE_50_HZ   = 0b1001, // 25Hz Bandwidth 90µA IDD
  ADXL345_DATARATE_25_HZ   = 0b1000, // 12.5Hz Bandwidth 60µA IDD
  ADXL345_DATARATE_12_5_HZ = 0b0111, // 6.25Hz Bandwidth 50µA IDD
  ADXL345_DATARATE_6_25HZ  = 0b0110, // 3.13Hz Bandwidth 45µA IDD
  ADXL345_DATARATE_3_13_HZ = 0b0101, // 1.56Hz Bandwidth 40µA IDD
  ADXL345_DATARATE_1_56_HZ = 0b0100, // 0.78Hz Bandwidth 34µA IDD
  ADXL345_DATARATE_0_78_HZ = 0b0011, // 0.39Hz Bandwidth 23µA IDD
  ADXL345_DATARATE_0_39_HZ = 0b0010, // 0.20Hz Bandwidth 23µA IDD
  ADXL345_DATARATE_0_20_HZ = 0b0001, // 0.10Hz Bandwidth 23µA IDD
  ADXL345_DATARATE_0_10_HZ = 0b0000  // 0.05Hz Bandwidth 23µA IDD (default value)
} adxl345_datarate;

typedef struct {
  int x;
  int y;
  int z;
} three_d_space;

#ifdef __cplusplus
extern "C" {
#endif /* __cplusplus */

int adxl345_init(const char *device, char sdo, adxl345_datarate rate);
int adxl345_default_init(void);
three_d_space* adxl345_get_acceleration(void);
void adxl345_finish(void);

#ifdef __cplusplus
}
#endif /* __cplusplus */

#endif // ADXL345_H
