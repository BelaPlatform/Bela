#ifdef __cplusplus
#include "Scope.h"
extern "C"
{
#else // __cplusplus
typedef void* Scope;
#endif // __cplusplus

Scope* Scope_new();
void Scope_delete(Scope* scope);
void Scope_setup(Scope* scope, unsigned int numChannels, float sampleRate);
void Scope_log(Scope* scope, const float* values);

#ifdef __cplusplus
}
#endif // __cplusplus
