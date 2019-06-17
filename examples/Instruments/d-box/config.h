/*
 * config.h
 *
 * Global settings for D-Box project
 *
 * Andrew McPherson and Victor Zappi 2014
 */


#ifndef DBOX_CONFIG_H_
#define DBOX_CONFIG_H_


/* Number of maximum touches used by the TouchKey sensors */
#define MAX_TOUCHES 5

// for sensor 1 filter
#define EXP_DENOM 53.5981500331			// exp(4)-1

/* Define this to use Xenomai real-time extensions */
#define DBOX_USE_XENOMAI
//#define OLD_OSCBANK

#ifdef DBOX_USE_XENOMAI
// Xenomai-specific includes
#include <sys/mman.h>

#endif

#ifdef DBOX_USE_XENOMAI

#define dbox_printf rt_printf

#else

#define dbox_printf printf

#endif

#endif /* DBOX_CONFIG_H */
