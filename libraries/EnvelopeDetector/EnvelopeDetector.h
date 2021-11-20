#pragma once
#include <math.h>
/*
 * \brief Envelope Detector Class.
 * This detector uses one-pole IIR filters to extract the approximate envelope of an audio signal.
 * Different modes of operation have been implemented to simulate detectors commonly used in compressors and other audio effects.
 *
 * 	Learn more:
 * 		* Reiss, J. D., & McPherson, A. (2014). Audio effects: theory, implementation and application. CRC Press.
 * 		* Pirkle, W. C. (2019). Designing Audio Effect Plugins in C++: For AAX, AU, and VST3 with DSP Theory. Routledge.
 * 		* Giannoulis, D., Massberg, M., & Reiss, J. D. (2012). Digital dynamic range compressor design tutorial and analysis. Journal of the Audio Engineering Society, 60(6), 399-408.
 *
 * 	October 2021
 * 	author: Adan L. Benito
 */

class EnvelopeDetector
{
	public:
		const float kTcAnalog = log(1/M_E);
		const float  kTcDigital= log(0.01);

		/*
		 * Type of time constant employed by envelope detector
		 */
		typedef enum {
			ANALOG = 0, /* < analog */
			DIGITAL = 1 /* < digital */
		} ConstantMode;

		/*
		 * Type of peak detection strategy followed by the peak detector
		 */
		typedef enum {
			DECOUPLING = 0, /* < decoupling: detector with instantaneous attack filtered for release */
			BRANCHING = 1 /* < branching: separated branches for attack and release */
		} BranchingMode;

		/*
		 * Type of level detection strategy employed to provide a smooth representation of signal's level
		 */
		typedef enum {
			PEAK = 0, /* < peak: detection performed over absolute peak values of the signal */
			MS = 1, /* < mean square values of the input are used for detection */
			RMS = 2, /* < root mean square values of the input are used for detecton */
			PREPROCESSED = 3 /* < raw input is used for detection, assumes that a processed signal is feed into the detector */
		} DetectionMode;

		EnvelopeDetector();
		/*
		 * Initialise envelope detector.
		 *
		 * @param attackTimeMs Attack time in milliseconds.
		 * @param releaseTimeMs Release time in milliseconds
		 * @param sampleRate Sampling frequency.
		 * @param constantMode Type of time constant employed by the detector
		 * @param branchingMode Type of peak detection strategy (branching or decoupling)
		 * @param detectionMode Type of level detection strategy
		 * @param smooth Boolean value indicating whether to use smooth release or not
		 */
		EnvelopeDetector(float attackTimeMs, float releaseTimeMs, float sampleRate, unsigned int constantMode = ANALOG, unsigned int branchingMode = BRANCHING, unsigned int detectionMode = PEAK, bool smooth = true);
		~EnvelopeDetector();
		/*
		 * \copydoc EnvelopeDetector::EnvelopeDetector(float, float, float, unsigned int, unsigned int, unsigned int, bool)
		 *
		 * @return 0 upon success, error otherwise
		 */
		int setup(float attackTimeMs, float releaseTimeMs, float sampleRate, unsigned int constantMode = ANALOG, unsigned int branchingMode = BRANCHING, unsigned int detectionMode = PEAK, bool smooth = true);
		int cleanup();

		/*
		 * Process input signal acording to detector's parameters and return envelope.
		 *
		 * @return Computed envelope
		 */
		float process(float input);
		/*
		 * Set attack time
		 *
		 * @param attackTimeMs Attack time (milliseconds)
		 */
		void setAttackTime(float attackTimeMs);
		/*
		 * Get attack time
		 *
		 * @returns Attack time in milliseconds
		 */
		float getAttackTime() { return _attackTimeMs; };
		/*
		 * Set release time
		 *
		 * @param releaseTimeMs Release time (milliseconds)
		 */
		void setReleaseTime(float releaseTimeMs);
		/*
		 * Get release time
		 *
		 * @returns Release time in milliseconds
		 */
		float getReleaseTime() { return _releaseTimeMs; };
		/*
		 * Set mode of operation for time constant
		 *
		 * @param mode Mode of operation for time constant (\see EnvelopeDetector::ConstantMode)
		 */
		void setConstantMode(unsigned int mode);
		/*
		 * Get time constant mode of operation
		 */
		unsigned int getConstantMode() { return _constantMode; };
		/*
		 * Set branching mode
		 *
		 * @param mode Branching mode (\see EnvelopeDetector::BranchingMode)
		 */
		void setBranchingMode(unsigned int mode);
		/*
		 * Get branching mode
		 */
		unsigned int getBranchingMOde() { return _branchingMode; };
		/*
		 * Set envelope detection mode
		 *
		 * @param mode Detection mode (\see EnvelopeDetector::DetectionMode)
		 */
		void setDetectionMode(unsigned int mode);
		/*
		 * Get envelope detection mode
		 */
		unsigned getDetectionMode() { return _detectionMode; };

		/*
		 * Set smooth release operation for detector
		 *
		 * @param isSmooth Boolean, if true then use smooth release.
		 */
		void setSmooth(bool isSmooth);
		/*
		 * Retrieve whether smooth operation is being used or not
		 */
		bool getSmooth() { return _smooth; };

	private:
		float _fs = 0.0; // Sampling frequency
		float _tc = kTcAnalog; // Time contstant

		float _attackTimeMs = 0.0; // Attack time in milliseconds
		float _releaseTimeMs = 0.0; // Release time in milliseconds

		float  _tConstantAttack = 0.0; // Attack time constant
		float  _tConstantRelease = 0.0; // Release time constant

		float _fastPeakEstimation = 0.0;  // Only for DECOUPLING detector
		float _envelope = 0.0; // Envelope value

		unsigned int _constantMode = ANALOG; // Time constant mode
		unsigned int _branchingMode = BRANCHING; // Branching mode
		unsigned int  _detectionMode = PEAK; // Detection mode

		bool _smooth = true; // Flag for smooth operation

		/*
		 * Compute time constant for given time in milliseconds
		 *
		 * @param timeMs Time in milliseconds
		 */
		double computeTimeConstant(float timeMs);
		/*
		 * Reset detector state
		 */
		void resetState();
};
