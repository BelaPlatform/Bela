/*
 * IirFilter.h
 *
 *  Created on: 17 Sep 2015
 *      Author: giulio
 */

#ifndef IIRFILTER_H_
#define IIRFILTER_H_

#define IIR_FILTER_STAGE_COEFFICIENTS (5)
#define IIR_FILTER_STAGE_STATES (IIR_FILTER_STAGE_COEFFICIENTS - 1)

class IirFilterStage{ //TODO : to save (some) memory we should only store the coefficients pointers here,
						//so that IirFilter can share them among multiple stages if needbe)
private:
	double coefficients[IIR_FILTER_STAGE_COEFFICIENTS]; // these are b0,b1,b2,a1,a2
	double states[IIR_FILTER_STAGE_STATES]; // these are xprev, xprevprev, yprev, yprevprev
public:
	IirFilterStage();
	void setCoefficients(double* newCoefficients);
	void setStates(double* newStates);
	// this is not meant to be efficient, just of practical use!
	double process(double in){
		process(&in, 1);
		return in;
	}

	void process(double* inout, int length){
		// make variables explicit. A smart compiler will optimize these out, right?
		double b0=coefficients[0];
		double b1=coefficients[1];
		double b2=coefficients[2];
		double a1=coefficients[3];
		double a2=coefficients[4];
		double x1 = states[0];
		double x2=  states[1];
		double y1 = states[2];
		double y2 = states[3];
		for(int n = 0; n < length; n++){
			double x0 = inout[n];
			double y = x0 * b0 + x1 * b1 + x2 * b2 +
					- y1 * a1 - y2 * a2;
			inout[n] = y;
			x2 = x1;
			x1 = x0;
			y2 = y1;
			y1 = y;
		}
		states[0] = x1;
		states[1] = x2;
		states[2] = y1;
		states[3] = y2;
	}
};

class IirFilter{
private:
	struct IirFilterStage** stages;
	int numberOfStages;
	void dealloc();
public:
	IirFilter();
	IirFilter(int newNumberOfStages);
	IirFilter(int newNumberOfStages, double *newCoefficients);
	void setCoefficients(double* newCoefficients);
	void setStates(double* newStates);
	void setNumberOfStages(int newNumberOfStages);
//	double process(double in);
//	inline void process(double* inout, int length);
//	inline void process(double* in, double* out, int length);
	double process(double in){
		process(&in, 1);
		return in;
	};
	void process(double* inout, int length){
		for(int n = 0; n < numberOfStages && n < 8/* TODO: this "8" compensates for a memory corruption somewhere on the BBB*/; n++){
			stages[n]->process(inout, length);
		}
	}
};


//void IirFilter::process(double* in, double* out, int length);

#endif /* IIRFILTER_H_ */
