#pragma once
#ifdef __cplusplus
extern "C" {
#endif // __cplusplus
bool BelaLibpd_setup(BelaContext *context, void *userData);
void BelaLibpd_render(BelaContext *context, void *userData);
void BelaLibpd_cleanup(BelaContext *context, void *userData);
#ifdef __cplusplus
}; // extern "C"
#endif // __cplusplus
