#ifndef BELA_MIDI_H_
#define BELA_MIDI_H_

#ifdef __cplusplus
#include "Midi.h"
extern "C" {
#else
typedef void* Midi;
#endif /* __cplusplus */

/**
 * C API for the Midi class. Only a subset of
 * methods is currently implemented
 */

int Midi_availableMessages(Midi* midi);
unsigned int Midi_getMessage(Midi* midi, unsigned char* buf);

/**
 * Creates a new BelaMidi object and listens to port.
 *
 * @param port the port to listen on
 *
 * @return a pointer to the object, or NULL if creation failed
 */
Midi* Midi_new(const char* port);
void Midi_delete(Midi* midi);

#ifdef __cplusplus
} /* extern "C" */
#endif /* __cplusplus */
#endif /* BELA_MIDI_H_ */
