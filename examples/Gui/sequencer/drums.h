/*
 * assignment2_drums
 * ECS7012 Music and Audio Programming
 *
 * Second assignment, to create a sequencer-based
 * drum machine which plays sampled drum sounds in loops.
 *
 * This code runs on the Bela embedded audio platform (bela.io).
 *
 * Andrew McPherson, Becky Stewart and Victor Zappi
 * 2015-2020
 */


#ifndef _DRUMS_H
#define _DRUMS_H

#define NUMBER_OF_DRUMS 8
#define NUMBER_OF_PATTERNS 6
#define FILL_PATTERN 5

/* Start playing a particular drum sound */
void startPlayingDrum(int drumIndex);

/* Start playing the next event in the pattern */
void startNextEvent();

/* Returns whether the given event contains the given drum sound */
int eventContainsDrum(int event, int drum);

#endif /* _DRUMS_H */
