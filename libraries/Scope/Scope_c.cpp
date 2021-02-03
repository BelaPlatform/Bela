#include "Scope_c.h"

Scope* Scope_new()
{
	return new Scope();
}
void Scope_delete(Scope* scope)
{
	delete scope;
}

void Scope_setup(Scope* scope, unsigned int numChannels, float sampleRate)
{
	scope->setup(numChannels, sampleRate);
}

void Scope_log(Scope* scope, const float* values)
{
	scope->log(values);
}
