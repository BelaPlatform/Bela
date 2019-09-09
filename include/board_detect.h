#pragma once
#include "Bela.h"

BelaHw Bela_detectUserHw();
bool Bela_checkHwCompatibility(BelaHw userHw, BelaHw detectedHw);
BelaHw getBelaHw(std::string board);
std::string getBelaHwName(BelaHw hardware);
