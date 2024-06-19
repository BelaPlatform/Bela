#pragma once
#ifdef __cplusplus
extern "C" {
#endif // __cplusplus

// These four functions are written in assembly in FormatConvert.S
void int16_to_float_audio(int numSamples, int16_t *inBuffer, float *outBuffer);
void int16_to_float_analog(int numSamples, uint16_t *inBuffer, float *outBuffer);
void float_to_int16_audio(int numSamples, float *inBuffer, int16_t *outBuffer);
void float_to_int16_analog(int numSamples, float *inBuffer, uint16_t *outBuffer);

#ifdef __cplusplus
}
#endif // __cplusplus
