#pragma once
// User defined structure to pass between main and render the data retrieved from file
struct SampleData {
	const float *samples; // Samples in file
	size_t sampleLen; // Total number of samples
};
