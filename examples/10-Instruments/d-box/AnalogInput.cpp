/*
 * AnalogInput.cpp
 *
 *  Created on: Oct 17, 2013
 *      Author: Victor Zappi
 */


#include "AnalogInput.h"

using namespace std;


AnalogInput::AnalogInput()
{
	ActivateAnalogHnd  = NULL;
	activateAnalogPath = "";
	analogIsSet        = false;

	AnalogInHnd    = NULL;
	analogInPath   = "";
	helperNumFound = false;

	// support var for init
	// these are fixed for BBB
	startPath = "/sys/devices/bone_capemgr.*/slots";
	readPath = "";

	buffer = (char*) malloc (sizeof(char)*lSize); // reading buffer

	verbose = false;
}


AnalogInput::~AnalogInput()
{
	free(buffer);
}

int AnalogInput::initAnalogInputs()
{
	 if(analogIsSet)
	 {
		 if(verbose)
			 cout << "Fine, but Analog Input already active..."<< endl;
		 return 0;
	 }

	// title
	 if(verbose)
	 	cout << "Init Analog Input"<< endl;


	  // first: activate analog pins on cape manager
	  // cape-bone-iio > /sys/devices/bone_capemgr.*/slots

	  // we have to look for the semi-random number the BBB has initialized the bone_capemgr with [value of *]
	  // to reach /slots and set cape-bone-iio.
	  // to do so, we use glob lib, which translates wildcards [*] into all the values found in paths


	  glob( startPath.c_str(), 0, NULL, &globbuf);

	  if(globbuf.gl_pathc >0)
	  {
	    if (globbuf.gl_pathc == 1 )
	    {
	      activateAnalogPath = globbuf.gl_pathv[0];

	      // check if file is existing
	      if((ActivateAnalogHnd = fopen(activateAnalogPath.c_str(), "r+")) != NULL)
	      {
	        // we found that current capemgr num

			fwrite("cape-bone-iio", sizeof(char), 13, ActivateAnalogHnd); // activate pins

	        analogIsSet = true;

			if(verbose)
				cout << "Analog Pins activated via cape-bone-iio at path " << activateAnalogPath << endl;

			fclose(ActivateAnalogHnd); // close file
	      }
	    }
	    //else
	      //printf("toomany", );
	  }

	  globfree(&globbuf); // self freeing


	  if(!analogIsSet)
	  {
	    cout << "cannot find bone_capemgr" << endl;
	    cout << "------Init failed------" << endl;
	    return 1;
	  }


	  // build read path
	  startPath = "/sys/devices/ocp.2/helper.*";

	  glob( startPath.c_str(), 0, NULL, &globbuf);

	  if(globbuf.gl_pathc >0)
	  {
		if (globbuf.gl_pathc == 1 )
		{
		  analogInPath = globbuf.gl_pathv[0] + (string)"/AIN";
		}
	    else
	      cout << "Too many analog inputs with this name! [I am puzzled...]" << endl;
	  }
	  else
	    cout << "Cannot find analog input dir...puzzled" << endl;


	  return 0;
}


int AnalogInput::read(int index)
{
	  // convert int index into string
	  stringstream ss;
	  ss << index;

	  readPath = analogInPath + ss.str(); // create pin0 file path


	  // check if file is existing
	  if((AnalogInHnd = fopen(readPath.c_str(), "rb")) != NULL)
	  {
		// we found that current helper num

		// prepare read buffer to reading
		fseek (AnalogInHnd , 0 , SEEK_END);
		lSize = ftell (AnalogInHnd);
		rewind (AnalogInHnd);

		result = fread (buffer, 1, lSize, AnalogInHnd);

		fclose(AnalogInHnd); // close file

		helperNumFound = true;

		//cout << "Analog Pins can be read at path " << analogInPath << endl;
		//cout << "Test reading of Pin0 gives: " << buffer << endl;
	  }

	  if(!helperNumFound)
	  {
	    cout << "cannot find helper" << endl;
	    cout << "------Analog Read failed------" << endl;
	    return -1;
	  }

	  return atoi(buffer);

}



