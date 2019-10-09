 /**
 * \example Gui/clock
 *
 * GUI clock
 * =========
 *
 * New GUI fuctionality for Bela!
 *
 * Is this project you can find a sketch.js file which is a p5.js file that is rendered
 * in a browser tab. Click the GUI button (next to the Scope button) in the IDE to see the rendering of this file.
 * 
 * This example sends a buffer of data from the Bela render to the browser via a web socket:
 * 	`gui.sendBuffer(0, dateTimeComponents);`
 * 
 * The p5.js file displays the received data (time and date).
 * 
 * If you want to edit sketch.js you can do so in the browser but must write your p5.js code in instance mode.
 * 
 **/

#include <Bela.h>
#include <libraries/Gui/Gui.h>
#include <string>
#include <sstream>
#include <math.h>
#include <time.h>

// GUI object declaration
Gui gui;

// Vector that holds the different components for the date
// Order after filling the values using calcDate() should be: [year, month, day, hours, minutes, seconds, milliseconds]
std::vector<int> dateTimeComponents;

// Time period (in seconds) after which date will be updated and sent 
float gTimePeriod = 0.01;

// Get current date/time, format is YYYY-MM-DD.HH:mm:ss
const std::vector<std::string> currentDateTime() {
    time_t     now = time(0);
    struct tm  tstruct;
    std::vector<std::string> dateTime;
    char       date[50];
    char       time[50];
    tstruct = *localtime(&now);
    // Visit http://en.cppreference.com/w/cpp/chrono/c/strftime
    // for more information about date/time format
    strftime(date, sizeof(date), "%Y-%m-%d", &tstruct);
    strftime(time, sizeof(time), "%T", &tstruct);
	dateTime.emplace_back(date);
	dateTime.emplace_back(time);

    // Returns vector holding 2 strings: [ "Y-m-d", "h-M-s"] 
    return dateTime;
}

// Utility function to split strings by a delimiter character
std::vector<std::string> split(const std::string& s, char delimiter)
{
   std::vector<std::string> tokens;
   std::string token;
   std::istringstream tokenStream(s);
   while (std::getline(tokenStream, token, delimiter))
   {
      tokens.push_back(token);
   }
   return tokens;
}

// Update date [Y, m, d, h, M, s, ms] based on the number of samples elapsed
void calcDate(unsigned int samplesElapsed, unsigned int sampleRate, std::vector<int> &date)
{
	unsigned int miliseconds = floor(1000 * samplesElapsed / sampleRate) + date[6];
	date[6] = miliseconds % 1000;
	unsigned int seconds = floor(miliseconds / 1000) + date[5];
	date[5] = seconds%60;
	unsigned int minutes = floor(seconds/60) + date[4];
	date[4] = minutes%60;
	unsigned int hours = floor(minutes/60) + date[3];
	date[3] = hours%24;
	unsigned int days = floor(hours/60) + date[2];
	date[2] = days%30; // This is wrong
	unsigned int months = floor(days/30) + date[1];
	date[1] = months%12;
	date[0] = floor(months/12) + date[0];
}

bool setup(BelaContext *context, void *userData)
{
	// Get Y-m-d from current time, split and place in date components vector
	std::vector<std::string> dateComponents = split(currentDateTime()[0], '-');
	for(unsigned int i=0; i<dateComponents.size(); i++)
		dateTimeComponents.push_back(atoi(dateComponents[i].c_str()));
	// Get h:M:s from current time, split and place in date components vector
	std::vector<std::string> timeComponents = split(currentDateTime()[1], ':');
	for(unsigned int i=0; i<timeComponents.size(); i++)
		dateTimeComponents.push_back(atoi(timeComponents[i].c_str()));
	// Add milliseconds to date components
	dateTimeComponents.push_back(0);// milliseconds

	// Setup GUI. By default, the Bela GUI runs on port 5555 and address 'gui'
	gui.setup(context->projectName);

	return true;
}

void render(BelaContext *context, void *userData)
{
	static unsigned int count = 0;

	for(unsigned int n = 0; n < context->audioFrames; n++) {
		if (count >= gTimePeriod*context->audioSampleRate)
		{
			// Calculate date based on elapsed number of seconds and update date and time components
			calcDate(count, context->audioSampleRate, dateTimeComponents);
			// Send int buffer holding the date and time components to the GUI with index 0
			gui.sendBuffer(0, dateTimeComponents);
			count = 0;
		}
		count++;
	}

}

void cleanup(BelaContext *context, void *userData)
{

}
