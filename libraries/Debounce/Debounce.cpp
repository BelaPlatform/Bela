#include "Debounce.h"

Debounce::Debounce() {}

Debounce::Debounce(unsigned int interval)
{
	setup(interval);
}

Debounce::Debounce(const Settings& settings)
{
	setup(settings);
}

void Debounce::setup(unsigned int interval)
{
	setup({.intervalPositiveEdge = interval, .intervalNegativeEdge = interval});
}

void Debounce::setup(const Settings& settings)
{
	intervalPositiveEdge = settings.intervalPositiveEdge;
	intervalNegativeEdge = settings.intervalNegativeEdge;
	debouncing = 0;
	state = false;
	oldState = false;
}

#if 0
#undef NDEBUG
#include <assert.h>
#include <vector>
#include <stdlib.h>
#include <stdio.h>
#include <cmath>
#include "Debouncer.h"

bool DebounceTest()
{
	std::vector<unsigned int> debouncingLengths = {0, 1, 10, 50, 100};
	std::vector<double> bouncingToDebouncingRatio = {0.1, 0.5, 0.9, 1, 1.2};
	unsigned int count = 0;
	for(auto& positiveDebouncingLength : debouncingLengths)
	{
		for(auto& negativeDebouncingLength : debouncingLengths)
		{
			for(auto& ratio : bouncingToDebouncingRatio)
			{
				// std::ceil to ensure that a small
				unsigned int negativeBouncingLength = std::ceil(negativeDebouncingLength * ratio);
				unsigned int positiveBouncingLength = std::ceil(positiveDebouncingLength * ratio);
				if(0 == positiveBouncingLength && ratio >1)
					positiveBouncingLength = 1;
				if(0 == negativeBouncingLength && ratio >1)
					negativeBouncingLength = 1;
				std::vector<unsigned int> transitions;
				std::vector<bool> inputs(2000);
				srand(0);
				unsigned int inc = std::max(5u, std::max(positiveDebouncingLength, negativeDebouncingLength)) * 2;
				unsigned int idx = inc;
				while(idx < inputs.size())
				{
					transitions.push_back(idx);
					idx += inc;
				}
				unsigned int ti = 0;
				bool initialState = false;
				bool state = initialState;
				unsigned int bouncing = 0;
				for(unsigned int n = 0; n < inputs.size(); ++n)
				{
					bool in;
					if(ti < transitions.size() && transitions[ti] == n) {
						// at a transition, jump to the new value. Successive
						// values will be bouncing
						state = !state;
						bouncing = state ? positiveBouncingLength : negativeBouncingLength;
						in = state;
						++ti;
					} else {
						if(bouncing) {
							--bouncing;
							in = random() > RAND_MAX / 2;
						} else
							in = state;
					}
					inputs[n] = in;
				}
				Debounce deb({.intervalPositiveEdge = positiveDebouncingLength, .intervalNegativeEdge = negativeDebouncingLength});
				state = initialState;
				ti = 0;
				int error = -1;
				bool pastComputedState = false;
				for(unsigned int n = 0; n < inputs.size(); ++n)
				{
					if(ti < transitions.size() && transitions[ti] == n) {
						state = !state;
						++ti;
					}
					bool computedState = deb.process(inputs[n]);
					const Debounce::Edge computedEdge = deb.edgeDetected();
					Debounce::Edge expectedEdge;
					if(computedState > pastComputedState)
						expectedEdge = Debounce::RISING;
					else if(computedState < pastComputedState)
						expectedEdge = Debounce::FALLING;
					else
						expectedEdge = Debounce::NONE;
					pastComputedState = computedState;
					//printf("{%5d} [%4d] +%d(%d) -%d(%d): in %d, exSt %d, comSt %d, exEd %+d, comEd %+d %s%s\n", count++, n, positiveBouncingLength, positiveDebouncingLength, negativeBouncingLength, negativeDebouncingLength, (int)inputs[n], state, computedState, expectedEdge, computedEdge, computedState != state ? "*" : " ", computedEdge != expectedEdge ? "&" : " ");
					if(count > 10018)
						assert(computedEdge == expectedEdge);
					assert(deb.get() == computedState);

					// we would expect that we will fail
					// sometimes, specifically when the
					// bouncing time is longer than the
					// debounce time. So we log it here and check it below
					if(state != computedState)
						error = n;
				}
				bool success;
				if(positiveBouncingLength > positiveDebouncingLength || negativeBouncingLength > negativeDebouncingLength)
					success = (-1 != error);
				else
					success = (-1 == error);
				if(!success){
					printf("Error for negDeb: %d, posDeb: %d, negBou: %d, posBou: %d, ratio: %f, at %d\n",
							negativeDebouncingLength, positiveDebouncingLength, negativeBouncingLength, positiveBouncingLength, ratio, error);
					assert(0);
				}
			}
		}
	}
	return true;
}
#endif
