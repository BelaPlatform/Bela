#pragma once
#include <ne10/NE10_types.h>
#include <vector>
#include <map>
#include <memory>

#define FRAMES_STORED 4

#define TRIGGER_LOG_COUNT 16

// forward declarations
class WSServer;
class JSONValue;
// typedef std::map<std::wstring, JSONValue*> JSONObject;
class AuxTaskRT;

/** 
 * \brief An oscilloscope which allows data to be visualised in a browser in real time.
 *
 * To use the scope, ensure the Bela IDE is running, and navigate to 
 * http://bela.local/scope
 */
class Scope{
    public:
	typedef enum {
		AUTO, ///< Auto triggering
		NORMAL, ///< Normal triggering
		CUSTOM, ///< Triggering when calling trigger()
	} TriggerMode;
	typedef enum {
		POSITIVE, ///< Trigger when crossing the threshold and the signal is increasing
		NEGATIVE, ///< Trigger when crossing the threshold and the signal is decreasing
		BOTH, ///< Trigger on any crossing of the threshold.
	} TriggerSlope;
	typedef enum {
		X_NORMAL, ///< X-axis normal
		X_INCREMENTAL, ///< X-axis incremental
		X_ROLLING, ///< X-axis rolling
	} XAxisBehaviour;

        Scope();
	Scope(unsigned int numChannels, float sampleRate);
	~Scope();
        /**
         * \brief Initialise the scope, setting the number of channels and the sample rate
         *
         * This function must be called once during setup. numChannels must be set
         * to the number of parameters passed in to log() or the channels may not be
         * displayed correctly. sampleRate must be the rate at which data is logged to
         * the scope (the rate at which log() is called) in Hz or the x-axis time values
         * displayed on the scope will be incorrect.
         *
         * @param numChannels number of channels displayed by the scope.
         * @param sampleRate sample rate of the data passed in.
         */
        void setup(unsigned int numChannels, float sampleRate);

	void cleanup();
        /** 
         * \brief Logs a frame of data to the scope.
         *
         * Pass one argument per channel (starting from the first), up to the
         * number of channels of the object.
         * Omitted values will be set to 0.
         */
        void log(double chn1, ...);

        /**
         * \brief Logs a frame of data to the scope.
         *
         * Accepts a pointer to an array of floats representing each channel's value in
         * ascending order.
         *
         * @param values a pointer to an array containing numChannels values.
         */
        void log(const float* values);
        
        /** 
         * \brief Cause the scope to trigger when set to custom trigger mode.
         *
         * This method can be used to force the scope to trigger rather than relying on
         * the typical auto or normal trigger.
         */
        bool trigger();
        
	/**
	 * Set the triggering mode for the scope
	 */
	void setTrigger(TriggerMode mode, unsigned int channel = 0, TriggerSlope dir = BOTH, float level = 0);
		
    private:
	typedef enum {
		TIME_DOMAIN, ///< Time domain
		FREQ_DOMAIN, ///< Frequency domain
	} PlotMode;
	void dealloc();
        void start();
        void stop();
        void triggerTimeDomain();
        void triggerFFT();
        bool triggered();
        bool prelog();
        void postlog();
        void setPlotMode();
        void doFFT();
        void setXParams();
        void scope_control_connected();
        void scope_control_data(const char* data);
        void parse_settings(std::shared_ptr<JSONValue> value);
	void outBufferSetTimestamp();
	void outBufferAppendData(size_t startptr, size_t endptr, size_t outChannelWidth);
	void outBufferSend();
        
	bool volatile isUsingOutBuffer;
	bool volatile isUsingBuffer;
	bool volatile isResizing;
		
        // settings
        size_t numChannels;
        float sampleRate;
        int pixelWidth;
        int frameWidth;
        PlotMode plotMode = TIME_DOMAIN;
        TriggerMode triggerMode;
        unsigned int triggerChannel;
        TriggerSlope triggerDir;
	XAxisBehaviour xAxisBehaviour = X_NORMAL;
        float triggerLevel;
        int xOffset;
        int xOffsetSamples;
        int upSampling;
        int downSampling;
        float holdOff;
        
        int logCount;
        
        int channelWidth;
        int downSampleCount;
        int holdOffSamples;
        
        // buffers
        std::vector<float> buffer;
        std::vector<float> outBuffer;
	uint32_t timestamp = 0;
	size_t outBufferSize;
	size_t rollPtr = 0;
	static constexpr size_t kTimestampSlots = sizeof(timestamp) / sizeof(outBuffer[0]);
        
        // pointers
        int writePointer;
        int readPointer;
        int triggerPointer;
        int customTriggerPointer;
        
        // trigger status
        bool triggerPrimed;
        bool triggerCollecting;
        bool triggerWaiting;
        int triggerCount;
        int autoTriggerCount;
        bool started;
        bool customTriggered;
        
        // FFT
        int FFTLength;
		int newFFTLength;
        float FFTScale;
		float FFTLogOffset;
        int pointerFFT;
        bool collectingFFT;
        float *windowFFT;
        int FFTXAxis;
        int FFTYAxis;
        
        ne10_fft_cpx_float32_t* inFFT;
        ne10_fft_cpx_float32_t* outFFT;
        ne10_fft_cfg_float32_t cfg;
        
        std::unique_ptr<AuxTaskRT> scopeTriggerTask;
        void triggerTask();
		
		void setSetting(std::wstring setting, float value);

        std::unique_ptr<WSServer> ws_server;
        
		std::map<std::wstring, float> settings;
};
