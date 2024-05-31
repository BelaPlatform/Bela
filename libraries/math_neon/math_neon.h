#pragma once
#if __has_include_next(<math_neon.h>)
#include_next <math_neon.h>
#else
#include <math.h>
// TODO: add more
#define sqrtf_neon(a) sqrtf(a)
#define sinf_neon(a) sinf(a)
#define cosf_neon(a) cosf(a)
#define expf_neon(a) expf(a)
#define logf_neon(a) logf(a)
#endif
