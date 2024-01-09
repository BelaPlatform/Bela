/*!
 *  @file DHT.cpp
 *
 *  @mainpage DHT series of low cost temperature/humidity sensors.
 *
 *  @section intro_sec Introduction
 *
 *  This is a library for DHT series of low cost temperature/humidity sensors.
 *
 *  You must have Adafruit Unified Sensor Library library installed to use this
 * class.
 *
 *  Adafruit invests time and resources providing this open source code,
 *  please support Adafruit andopen-source hardware by purchasing products
 *  from Adafruit!
 *
 *  @section author Author
 *
 *  Written by Adafruit Industries.
 *
 *  @section license License
 *
 *  MIT license, all text above must be included in any redistribution
 */

#include "DHT.h"
#include <math.h>
#include <string.h>
typedef uint16_t word;

#define MIN_INTERVAL 2000 /**< min interval value */
#define TIMEOUT                                                                \
  UINT32_MAX /**< Used programmatically for timeout.                           \
                   Not a timeout duration. Type: uint32_t. */

/*!
 *  @brief  Instantiates a new DHT class
 *  @param  pin
 *          pin number that sensor is connected
 *  @param  type
 *          type of sensor
 *  @param  count
 *          number of sensors
 */
DHT::DHT(uint8_t pin, uint8_t type, uint8_t count) {
  (void)count; // Workaround to avoid compiler warning.
  _pin = pin;
  _type = type;
}

/*!
 *  @brief  Setup sensor pins and set pull timings
 *  @param  usec
 *          Optionally pass pull-up time (in microseconds) before DHT reading
 *starts. Default is 55 (see function declaration in DHT.h).
 */
void DHT::begin(uint8_t usec) {
  DEBUG_PRINT("DHT max clock cycles: ");
  DEBUG_PRINTLN(_maxcycles, DEC);
  pullTime = usec;
}

/*!
 *  @brief  Read temperature
 *  @param  S
 *          Scale. Boolean value:
 *					- true = Fahrenheit
 *					- false = Celcius
 *  @param  force
 *          true if in force mode
 *	@return Temperature value in selected scale
 */
float DHT::readTemperature(bool S, bool force) {
  float f = NAN;

  if (read(force)) {
    switch (_type) {
    case DHT11:
      f = data[2];
      if (data[3] & 0x80) {
        f = -1 - f;
      }
      f += (data[3] & 0x0f) * 0.1;
      if (S) {
        f = convertCtoF(f);
      }
      break;
    case DHT12:
      f = data[2];
      f += (data[3] & 0x0f) * 0.1;
      if (data[2] & 0x80) {
        f *= -1;
      }
      if (S) {
        f = convertCtoF(f);
      }
      break;
    case DHT22:
    case DHT21:
      f = ((word)(data[2] & 0x7F)) << 8 | data[3];
      f *= 0.1;
      if (data[2] & 0x80) {
        f *= -1;
      }
      if (S) {
        f = convertCtoF(f);
      }
      break;
    }
  }
  return f;
}

/*!
 *  @brief  Converts Celcius to Fahrenheit
 *  @param  c
 *					value in Celcius
 *	@return float value in Fahrenheit
 */
float DHT::convertCtoF(float c) { return c * 1.8 + 32; }

/*!
 *  @brief  Converts Fahrenheit to Celcius
 *  @param  f
 *					value in Fahrenheit
 *	@return float value in Celcius
 */
float DHT::convertFtoC(float f) { return (f - 32) * 0.55555; }

/*!
 *  @brief  Read Humidity
 *  @param  force
 *					force read mode
 *	@return float value - humidity in percent
 */
float DHT::readHumidity(bool force) {
  float f = NAN;
  if (read(force)) {
    switch (_type) {
    case DHT11:
    case DHT12:
      f = data[0] + data[1] * 0.1;
      break;
    case DHT22:
    case DHT21:
      f = ((word)data[0]) << 8 | data[1];
      f *= 0.1;
      break;
    }
  }
  return f;
}

/*!
 *  @brief  Compute Heat Index
 *          Simplified version that reads temp and humidity from sensor
 *  @param  isFahrenheit
 * 					true if fahrenheit, false if celcius
 *(default true)
 *	@return float heat index
 */
float DHT::computeHeatIndex(bool isFahrenheit) {
  float hi = computeHeatIndex(readTemperature(isFahrenheit), readHumidity(),
                              isFahrenheit);
  return hi;
}

/*!
 *  @brief  Compute Heat Index
 *  				Using both Rothfusz and Steadman's equations
 *					(http://www.wpc.ncep.noaa.gov/html/heatindex_equation.shtml)
 *  @param  temperature
 *          temperature in selected scale
 *  @param  percentHumidity
 *          humidity in percent
 *  @param  isFahrenheit
 * 					true if fahrenheit, false if celcius
 *	@return float heat index
 */
float DHT::computeHeatIndex(float temperature, float percentHumidity,
                            bool isFahrenheit) {
  float hi;

  if (!isFahrenheit)
    temperature = convertCtoF(temperature);

  hi = 0.5 * (temperature + 61.0 + ((temperature - 68.0) * 1.2) +
              (percentHumidity * 0.094));

  if (hi > 79) {
    hi = -42.379 + 2.04901523 * temperature + 10.14333127 * percentHumidity +
         -0.22475541 * temperature * percentHumidity +
         -0.00683783 * pow(temperature, 2) +
         -0.05481717 * pow(percentHumidity, 2) +
         0.00122874 * pow(temperature, 2) * percentHumidity +
         0.00085282 * temperature * pow(percentHumidity, 2) +
         -0.00000199 * pow(temperature, 2) * pow(percentHumidity, 2);

    if ((percentHumidity < 13) && (temperature >= 80.0) &&
        (temperature <= 112.0))
      hi -= ((13.0 - percentHumidity) * 0.25) *
            sqrt((17.0 - abs(temperature - 95.0)) * 0.05882);

    else if ((percentHumidity > 85.0) && (temperature >= 80.0) &&
             (temperature <= 87.0))
      hi += ((percentHumidity - 85.0) * 0.1) * ((87.0 - temperature) * 0.2);
  }

  return isFahrenheit ? hi : convertFtoC(hi);
}


void DHT::switchState(DHT::State newState)
{
  state = newState;
  count = 0;
}

void DHT::process(BelaContext* context)
{
  float tus = 1000.f * 1000.f / context->digitalSampleRate;
  for(size_t n = 0; n < context->digitalFrames; ++n)
  {
    bool in = digitalRead(context, n, _pin);
    switch(state)
    {
      case kDisabled:
        break;
      case kShouldStart:
        switchState(kHostStartSignal);
        // nobreak;
      case kHostStartSignal:
        {
          pinModeOnce(context, n, _pin, OUTPUT);
          digitalWriteOnce(context, n, _pin, 0);
	  float target;
          switch (_type) {
          case DHT22:
          case DHT21:
            // data sheet says "at least 1ms"
	    target = 1100;
            break;
          case DHT11:
          default:
            // data sheet says at least 18ms, 20ms just to be safe
	    target = 20000;
            break;
          }
          if(count * tus > target)
            switchState(kHostPullUp);
        }
        break;
      case kHostPullUp:
        pinModeOnce(context, n, _pin, OUTPUT);
        digitalWriteOnce(context, n, _pin, 1);
        if(count * tus > 40)
          switchState(kWaitForInput);
        break;
      case kWaitForInput:
        pinModeOnce(context, n, _pin, INPUT);
        if(count >= context->digitalFrames * 2 + 1)
          switchState(kWaitForSensorRising);
        break;
      case kWaitForSensorRising:
        if(in && !pastIn)
          switchState(kWaitForSensorFalling);
        break;
      case kWaitForSensorFalling:
        if(!in && pastIn) // falling edge
        {
          switchState(kBit);
          inIdx = 0;
	  memset(data, 0, sizeof(data));
	  inWord = 0;
        }
        break;
      case kBit:
        if(in && !pastIn) // rising edge
          count = 0;
        if(!in && pastIn) // falling edge
        {
          bool val = count > 2;//(count * tus > 42);
#ifdef DHT_DEBUG
          rt_printf("[%d]%d(%d)  ", 40 - inIdx - 1, count, val);
#endif // DHT_DEBUG
	  data[inIdx / 8] <<= 1;
	  data[inIdx / 8] |= val;
	  inWord |= uint64_t(val) << (40 - inIdx - 1);
          inIdx++;
          if(40 == inIdx)
          {
#ifdef DHT_DEBUG
            rt_printf("\n");
#endif // DHT_DEBUG
            switchState(kTxEnd);
          }
        }
        break;
      case kTxEnd:
#ifdef DHT_DEBUG
        rt_printf("INPUT: %010llx----\n", inWord);
#endif // DHT_DEBUG
        switchState(kDisabled);
        break;
    }
    count++;
    pastIn = in;
  }
}

/*!
 *  @brief  Read value from sensor or return last one from less than two
 *seconds.
 *  @param  force
 *          true if using force mode
 *	@return float value
 */
bool DHT::read(bool force) {
  DEBUG_PRINTLN(F("Received from DHT:"));
  for(size_t n = 0; n < 4; ++n)
  {
	  DEBUG_PRINT(int(data[n]), HEX);
	  DEBUG_PRINT(F(", "));
  }
  DEBUG_PRINT(F(" =? "));
  DEBUG_PRINTLN((data[0] + data[1] + data[2] + data[3]) & 0xFF, HEX);

  // Check we read 40 bits and that the checksum matches.
  if (data[4] == ((data[0] + data[1] + data[2] + data[3]) & 0xFF)) {
    _lastresult = true;
    DEBUG_PRINTLN(F("DHT checksum OK"));
  } else {
    _lastresult = false;
    DEBUG_PRINTLN(F("DHT checksum failure!"));
  }
  _lastresult = true;
  return _lastresult;
}
