#include <libraries/ne10/NE10.h>
#include <vector>

// Abstract base class for decimator and intepolator
class ResampleBase {
public:
	enum fir_quality { high,
					   low };
	enum fir_phase { minimum,
					 linear };
	~ResampleBase() { cleanup(); };
	virtual int setup(unsigned int factor, unsigned int blockSize, fir_quality quality, fir_phase phase) = 0;
	virtual void process(float* outBlock, const float* inBlock) = 0;

protected:
	std::vector<float> get_fir(unsigned int factor, fir_quality quality, fir_phase phase);
	void cleanup();
	unsigned int blockSizeIn;
	unsigned int factor;
	ne10_float32_t* pCoeff = nullptr;
	ne10_float32_t* pState = nullptr;
};

class Decimator : public ResampleBase {
public:
	Decimator(){};
	Decimator(unsigned int factor, unsigned int blockSize, fir_quality quality, fir_phase phase) {
		setup(factor, blockSize, quality, phase);
	};
	int setup(unsigned int decimationFactor, unsigned int blockSize, fir_quality quality = high, fir_phase phase = linear);
	void process(float* outBlock, const float* inBlock);

private:
	ne10_fir_decimate_instance_f32_t decimator;
};

class Interpolator : public ResampleBase {
public:
	Interpolator(){};
	Interpolator(unsigned int factor, unsigned int blockSize, fir_quality quality, fir_phase phase) {
		setup(factor, blockSize, quality, phase);
	};
	int setup(unsigned int interpolationFactor, unsigned int blockSize, fir_quality quality = high, fir_phase phase = linear);
	void process(float* outBlock, const float* inBlock);

private:
	ne10_fir_interpolate_instance_f32_t interpolator;
};