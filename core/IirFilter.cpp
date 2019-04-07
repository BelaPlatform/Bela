/*
 * IirFilter.cpp
 *
 *  Created on: 17 Sep 2015
 *      Author: giulio
 */
#include "IirFilter.h"

IirFilterStage::IirFilterStage(){
	for(int n = 0; n < IIR_FILTER_STAGE_COEFFICIENTS; n++){
		coefficients[n] = 0;
	}
	for(int n = 0; n < IIR_FILTER_STAGE_STATES; n++){
		states[n]=0;
	}
}
void IirFilterStage::setCoefficients(double* newCoefficients){
	for(int n = 0; n < IIR_FILTER_STAGE_COEFFICIENTS; n++){
		coefficients[n] = newCoefficients[n];
	}
}
void IirFilterStage::setStates(double* newStates){
	for(int n = 0; n < IIR_FILTER_STAGE_STATES; n++){
		states[n] = newStates[n];
	}
}

/*	struct IirFilterStage* stages;
	int numberOfStages;
*/
IirFilter::IirFilter(){
	stages=(IirFilterStage**)0;
	setNumberOfStages(0);
}
IirFilter::IirFilter(int newNumberOfStages){
	setNumberOfStages(newNumberOfStages);
}
IirFilter::IirFilter(int newNumberOfStages, double* newCoefficients){
	setNumberOfStages(newNumberOfStages);
	setCoefficients(newCoefficients);
}
void IirFilter::dealloc(){
	if( stages == 0 )
		return;
	for(int n = 0; n < numberOfStages; n++){
		delete stages[n];
	}
	delete stages;
	stages = 0;
	numberOfStages = 0;
}
void IirFilter::setCoefficients(double* newCoefficients){
	for(int n = 0; n < numberOfStages; n++){
		stages[n]->setCoefficients(newCoefficients);
	}
};
void IirFilter::setCoefficients(double* newCoefficients, unsigned int stage){
	stages[stage]->setCoefficients(newCoefficients);
};
void IirFilter::setStates(double* newStates){
	for(int n = 0; n < numberOfStages; n++){
		stages[n]->setStates(newStates);
	}
};
void IirFilter::setStates(double* newStates, unsigned int stage){
	stages[stage]->setStates(newStates);
};
void IirFilter::setNumberOfStages(int newNumberOfStages){
	dealloc();
	numberOfStages=newNumberOfStages;
	stages = new IirFilterStage*[numberOfStages];
	for( int n = 0; n < numberOfStages; n++){
		stages[n] = new IirFilterStage;
	}
}
