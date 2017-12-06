/*
 * I2C_MPR121.cpp
 *
 *  Created on: Oct 14, 2013
 *      Author: Victor Zappi
 */


#include "I2C_MPR121.h"

I2C_MPR121::I2C_MPR121() {

}

boolean I2C_MPR121::begin(uint8_t bus, uint8_t i2caddr) {
  _i2c_address = i2caddr;
	
  if(initI2C_RW(bus, i2caddr, 0) > 0)
	  return false;

  // soft reset
  writeRegister(MPR121_SOFTRESET, 0x63);
  usleep(1000);
  //delay(1);
  for (uint8_t i=0; i<0x7F; i++) {
  //  Serial.print("$"); Serial.print(i, HEX); 
  //  Serial.print(": 0x"); Serial.println(readRegister8(i));
  }
  

  writeRegister(MPR121_ECR, 0x0);

  uint8_t c = readRegister8(MPR121_CONFIG2);
  
  if (c != 0x24) {
	  rt_printf("MPR121 read 0x%x instead of 0x24\n", c);
	  return false;
  }

  setThresholds(12, 6);
  writeRegister(MPR121_MHDR, 0x01);
  writeRegister(MPR121_NHDR, 0x01);
  writeRegister(MPR121_NCLR, 0x0E);
  writeRegister(MPR121_FDLR, 0x00);

  writeRegister(MPR121_MHDF, 0x01);
  writeRegister(MPR121_NHDF, 0x05);
  writeRegister(MPR121_NCLF, 0x01);
  writeRegister(MPR121_FDLF, 0x00);

  writeRegister(MPR121_NHDT, 0x00);
  writeRegister(MPR121_NCLT, 0x00);
  writeRegister(MPR121_FDLT, 0x00);

  writeRegister(MPR121_DEBOUNCE, 0);
  writeRegister(MPR121_CONFIG1, 0x10); // default, 16uA charge current
  writeRegister(MPR121_CONFIG2, 0x20); // 0.5uS encoding, 1ms period

//  writeRegister(MPR121_AUTOCONFIG0, 0x8F);

//  writeRegister(MPR121_UPLIMIT, 150);
//  writeRegister(MPR121_TARGETLIMIT, 100); // should be ~400 (100 shifted)
//  writeRegister(MPR121_LOWLIMIT, 50);
  // enable all electrodes
  writeRegister(MPR121_ECR, 0x8F);  // start with first 5 bits of baseline tracking

  return true;
}

void I2C_MPR121::setThresholds(uint8_t touch, uint8_t release) {
  for (uint8_t i=0; i<12; i++) {
    writeRegister(MPR121_TOUCHTH_0 + 2*i, touch);
    writeRegister(MPR121_RELEASETH_0 + 2*i, release);
  }
}

uint16_t  I2C_MPR121::filteredData(uint8_t t) {
  if (t > 12) return 0;
  return readRegister16(MPR121_FILTDATA_0L + t*2);
}

uint16_t  I2C_MPR121::baselineData(uint8_t t) {
  if (t > 12) return 0;
  uint16_t bl = readRegister8(MPR121_BASELINE_0 + t);
  return (bl << 2);
}

uint16_t  I2C_MPR121::touched(void) {
  uint16_t t = readRegister16(MPR121_TOUCHSTATUS_L);
  return t & 0x0FFF;
}

/*********************************************************************/


uint8_t I2C_MPR121::readRegister8(uint8_t reg) {
	i2c_char_t value;
	readRegisters(reg, (i2c_char_t*)&value, sizeof(value));
	return value;
}

uint16_t I2C_MPR121::readRegister16(uint8_t reg) {
	i2c_char_t inbuf[2];
	readRegisters(reg, inbuf, sizeof(inbuf));
	return (uint16_t)inbuf[0] | (((uint16_t)inbuf[1]) << 8);
}

/**************************************************************************/
/*!
    @brief  Writes 8-bits to the specified destination register
*/
/**************************************************************************/
void I2C_MPR121::writeRegister(uint8_t reg, uint8_t value) {
	writeRegisters(reg, (i2c_char_t*)&value, sizeof(value));
}

