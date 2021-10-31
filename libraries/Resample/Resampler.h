#define ENABLE_NE10_FIR_DECIMATE_FLOAT_NEON // Defines needed for Ne10 library
#define ENABLE_NE10_FIR_INTERPOLATE_FLOAT_NEON

#include <libraries/ne10/NE10.h>   // neon library
#include <vector>

enum fir_quality {FIR_HIGH, FIR_LOW};
enum fir_phase   {MINIMUM, LINEAR};

class DecimatorChannel {
public:
	DecimatorChannel() {};
	~DecimatorChannel() { cleanup(); };
    int  setup(unsigned int decimationFactor, unsigned int blockSize, enum fir_quality quality=FIR_HIGH, enum fir_phase phase=LINEAR);
    void process(ne10_float32_t* outBlock, ne10_float32_t* inBlock);
    void cleanup();

private:
    unsigned int                        blockSize;
    unsigned int                        decimationFactor;
    ne10_fir_decimate_instance_f32_t    decimator;
    ne10_float32_t*                     pCoeff = nullptr;
    ne10_float32_t*                     pState = nullptr;
};


class InterpolatorChannel {
public:
    InterpolatorChannel() {};
    ~InterpolatorChannel() { cleanup(); };
    int  setup(unsigned int decimationFactor, unsigned int blockSize, enum fir_quality quality=FIR_HIGH, enum fir_phase phase=LINEAR);
    void process(ne10_float32_t* outBlock, ne10_float32_t* inBlock);
    void cleanup();

private:
    unsigned int                        blockSize;
    unsigned int                        interpolationFactor;
    ne10_fir_interpolate_instance_f32_t Interpolator;
    ne10_float32_t*                     pCoeff = nullptr;
    ne10_float32_t*                     pState = nullptr;
};
