/*
 * DigitalStream.cpp
 *
 *  Created on: 7 Jun 2016
 *      Author: giulio
 */

#include <DigitalChannelManager.h>

DigitalChannelManager::DigitalChannelManager() :
	verbose(true)
{
	// TODO Auto-generated constructor stub

}

DigitalChannelManager::~DigitalChannelManager() {
	// TODO Auto-generated destructor stub
}

void DigitalChannelManager::setVerbose(bool isVerbose)
{
	verbose = isVerbose;
}
