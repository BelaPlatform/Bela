#include <Bela.h>
# include <math.h>
#include <math_neon.h>
#include <stdlib.h>
#include <stdio.h>
#include <vector>
#include <array>
#include <string.h>
#include "SimplexNoise.h"

float cvFrequencyOffset = 16.35; // C0
// Adjust these for 1V/oct
float cvInScaling = 10; // input voltage range?
float cvOutScaling = 0.1; // (1 / (output voltage range)). If bypass gain were 0, then this should be 1/cvInScaling

typedef float sample_t;
bool isBrowser = false;

namespace Math{
sample_t abs(sample_t value)
{
	return value >= 0 ? value : -value;
}

sample_t atan2(sample_t x, sample_t y)
{
	return atan2f(x, y);
}

sample_t atan(sample_t value)
{
	return atanf(value);
}

sample_t exp(sample_t value)
{
	return expf_neon(value);
}

int floor(sample_t value)
{
	return (int32_t)(value + 1);
}

int ceil(sample_t value)
{
	return (int32_t)(value);
}

sample_t log(sample_t value)
{
	return logf_neon(value);
}

static constexpr sample_t PI = 3.14159265359;

sample_t pow(sample_t x, sample_t y)
{
	return powf(x, y);
}

sample_t round(sample_t value)
{
	return (sample_t)(int32_t)(value + (sample_t)0.5);
}

sample_t cos(sample_t phase)
{
	return cosf_neon(phase);
}

sample_t sin(sample_t phase)
{
	return sinf_neon(phase);
}
sample_t sqrt(sample_t value){
	return sqrtf_neon(value);
}

sample_t random(){
	return rand()/(sample_t)RAND_MAX;
}

sample_t max(sample_t first, sample_t second){
	return first > second ? first : second;
}

sample_t min(sample_t first, sample_t second){
	return first < second ? first : second;
}

sample_t clamp(sample_t number, sample_t min, sample_t max) {
    if (number<min) return min;
    else if (number>max) return max;
    else return number;
}

sample_t moveTowards(sample_t current, sample_t target, sample_t amount)
{
    if (current<target) return min(current+amount, target);
    else return max(current-amount, target);
}

sample_t moveTowards(sample_t current, sample_t target, sample_t amountUp, sample_t amountDown)
{
    if (current<target) return min(current+amountUp, target);
    else return max(current-amountDown, target);
}

sample_t gaussian()
{
    float s = 0;
    for (int c=0; c<16; c++) s+=random();
    return (s-8)/4;
}

};

float sampleRate;
//var time = 0;
bool alwaysVoice = true;
bool autoWobble = true;
float noiseFreq = 500;
float noiseQ = 0.7;

/**
Touch::fricative_intensity is the amount of turbulence
In the original implementation it has a 100ms linear AR envelope (done by UI::updateTouches())

Glottis::UITenseness (amount of noise (breath) in the generator)
it also affects Glottis::loudness

Glottis::intensity (0,1) AR global envelope

Glottis::UIFrequency target pitch, smoothed in Glottis::smoothFrequency

Glottis::handleTouches() (currently not implemented) would set Glottis::frequency, Glottis::tenseness  also it sets Glottis::isTouched which is needed when the auto voice is turned off.

UI::touchesWithMouse contains all the current touches. If one of these is in the Toungue area, it will become the new TongueTouch

After any touch is added/removed/moved, you need to call TractUI::handleTouches (and Glottis::handleTouches if you are using it).

Every time a touch is added or moved, diameter and index should be set for each touch with TractUI::getIndex and TractUI::getDiameter.

To end a touch, set its alive=false and/or remove it form the list. The original implementation uses updateTouches() to apply the AR envelope to Touch::fricative_intensity. This is bad because it would be handled at evey GUI call.
We should look into incorporating it somewhere else.

In Tract the `diameter` of a touch is the diameter of the tract (when it is negative there is an obstruction) at the `index`.


TractUI
bladeStart, tipStart, lipStart are constants set at init(). They are the idnex in the tract where each section starts.

*Tract*
reshapeTract() and calculateReflections() are called once for every block:

reshapeTract() smooths the diameter of the tract and checks for obstructions in the vocal tract. When an obstruction is removed it generates a transient (addTransient). It then does something with noseDiameter and noseA

calculateReflections() sets the reflections...

Tract::handleTouches()
- checks for touches to use as tongueTouch
- processes the tongueTouch to set the tongueIndex and tongueDiameter
- setRestDiameter(): set the diameter of the tract as dictated by the tongue
- processes other touches: 
-- Tract.velumTarget is set to : 0.4 if the touch opens the velum, 0.01 otherwise
-- Tract.targetDiameter is updated if other touches shrink it more than the tongue does





*/

class Touch {
public:
	float x;
	float y;
	float diameter;
	float fricative_intensity;
	bool alive;
	bool enabled;
	float index;
	float endTime;
	Touch(float x, float y, float diameter, float fricative_intensity, bool alive, bool enabled, float endTime) :
		x(x)
	, y(y)
	, diameter(diameter)
	, fricative_intensity(fricative_intensity)
	, alive(alive)
	, enabled(enabled)
	, endTime(endTime)
	{}

	Touch()
	{
		memset(this, 0, sizeof(Touch));
	}
};

class UIClass {
public:
    float width;
    float top_margin;
    float left_margin;
    bool inAboutScreen;
    bool inInstructionsScreen;
    float instructionsLine;

	std::vector<Touch> touchesWithMouse;
	UIClass(){
		width = 600;
		top_margin = 5;
		left_margin = 5;
		inAboutScreen = true;
		inInstructionsScreen = false;
		instructionsLine = 0;
		touchesWithMouse.reserve(10);

            //tractCanvas.addEventListener('touchstart', UI.startTouches);
            //tractCanvas.addEventListener('touchmove', UI.moveTouches);
            //tractCanvas.addEventListener('touchend', UI.endTouches);
            //tractCanvas.addEventListener('touchcancel', UI.endTouches);
            //document.addEventListener('mousedown', (function(event)
                //{UI.mouseDown = true; event.preventDefault(); UI.startMouse(event);}));
            //document.addEventListener('mouseup', (function(event)
                //{UI.mouseDown = false; UI.endMouse(event);}));
            //document.addEventListener('mousemove', UI.moveMouse);
		//}
    }

	/*
    startTouches : function(event)
    {
        var touches = event.changedTouches;
        for (var j=0; j<touches.length; j++)
        {
            var touch = {};
            touch.startTime = time;
            touch.endTime = 0;
            touch.fricative_intensity = 0;
            touch.alive = true;
            touch.id = touches[j].identifier;
            touch.x = (touches[j].pageX-UI.left_margin)/UI.width*600;
            touch.y = (touches[j].pageY-UI.top_margin)/UI.width*600;
            touch.index = TractUI.getIndex(touch.x, touch.y);
            touch.diameter = TractUI.getDiameter(touch.x, touch.y);
            UI.touchesWithMouse.push(touch);
        }

        UI.handleTouches();
    },

    moveTouches : function(event)
    {
        var touches = event.changedTouches;
        for (var j=0; j<touches.length; j++)
        {
            var touch = UI.getTouchById(touches[j].identifier);
            if (touch != 0)
            {
                touch.x = (touches[j].pageX-UI.left_margin)/UI.width*600;
                touch.y = (touches[j].pageY-UI.top_margin)/UI.width*600;
                touch.index = TractUI.getIndex(touch.x, touch.y);
                touch.diameter = TractUI.getDiameter(touch.x, touch.y);
            }
        }
        UI.handleTouches();
    },

    endTouches : function(event)
    {
        var touches = event.changedTouches;
        for (var j=0; j<touches.length; j++)
        {
            var touch = UI.getTouchById(touches[j].identifier);
            if (touch != 0)
            {
                touch.alive = false;
                touch.endTime = time;
            }
        }
        UI.handleTouches();
    },
	*/

	/*
    handleTouches : function(event)
    {
        TractUI.handleTouches();
        Glottis.handleTouches();
    },

	/// this only applyes the AR to fricative_intensity
    updateTouches : function()
    {
        var fricativeAttackTime = 0.1;
        for (var j=UI.touchesWithMouse.length-1; j >=0; j--)
        {
            var touch = UI.touchesWithMouse[j];
            if (!(touch.alive) && (time > touch.endTime + 1))
            {
                UI.touchesWithMouse.splice(j,1);
            }
            else if (touch.alive)
            {
                touch.fricative_intensity = Math::clamp((time-touch.startTime)/fricativeAttackTime, 0, 1);
            }
            else
            {
                touch.fricative_intensity = Math::clamp(1-(time-touch.endTime)/fricativeAttackTime, 0, 1);
            }
        }
    },
	*/
};


class GlottisClass
{
public:
	float waveformLength;
	float timeInWaveform;
	float oldFrequency;
	float newFrequency;
	float UIFrequency;
	float smoothFrequency;
	float oldTenseness;
	float newTenseness;
	float UITenseness;
	float totalTime;
	float vibratoAmount;
	float vibratoFrequency;
	float intensity;
	float loudness;
	bool isTouched;
	int touch;
	int semitones;
	float baseNote;
	float frequency;
	float Rd;
	float alpha;
	float E0;
	float epsilon;
	float shift;
	float Delta;
	float Te;
	float omega;

	GlottisClass(){
		timeInWaveform = 0;
		oldFrequency = 140;
		newFrequency = 140;
		UIFrequency = 140;
		smoothFrequency = 140;
		oldTenseness = 0.6;
		newTenseness = 0.6;
		UITenseness = 0.6;
		totalTime = 0;
		vibratoAmount = 0.005;
		vibratoFrequency = 6;
		intensity = 0;
		loudness = 1;
		isTouched = false;
		touch = 0;
		semitones = 20;
		baseNote = 87.3071; //F
	}

    void init()
    {
        this->setupWaveform(0);
    }


/*
    handleTouches :  function()
    {
        if (this.touch != 0 && !this.touch.alive) this.touch = 0;

        if (this.touch == 0)
        {
			// search if there is any touch on the Glottis
            for (var j=0; j<UI.touchesWithMouse.length; j++)
            {
                var touch = UI.touchesWithMouse[j];
                if (!touch.alive) continue;
                if (touch.y<this.keyboardTop) continue;
                this.touch = touch;
            }
        }

        if (this.touch != 0)
        {
            var local_y = this.touch.y -  this.keyboardTop-10;
            var local_x = this.touch.x - this.keyboardLeft;
            local_y = Math::clamp(local_y, 0, this.keyboardHeight-26);
            var semitone = this.semitones * local_x / this.keyboardWidth + 0.5;
            Glottis.UIFrequency = this.baseNote * Math::pow(2, semitone/12);
            if (Glottis.intensity == 0) Glottis.smoothFrequency = Glottis.UIFrequency;
            //Glottis.UIRd = 3*local_y / (this.keyboardHeight-20);
            var t = Math::clamp(1-local_y / (this.keyboardHeight-28), 0, 1);
            Glottis.UITenseness = 1-Math::cos(t*Math::PI*0.5);
            Glottis.loudness = Math::pow(Glottis.UITenseness, 0.25);
            this.x = this.touch.x;
            this.y = local_y + this.keyboardTop+10;
        }
        Glottis.isTouched = (this.touch != 0);
    },
	*/

    sample_t runStep(float lambda, sample_t noiseSource)
    {
        float timeStep = (sample_t)1.0 / sampleRate;
        this->timeInWaveform += timeStep;
        this->totalTime += timeStep;
        if (this->timeInWaveform>this->waveformLength)
        {
            this->timeInWaveform -= this->waveformLength;
            this->setupWaveform(lambda);
        }
        sample_t out = this->normalizedLFWaveform(this->timeInWaveform/ this->waveformLength);
        sample_t aspiration = this->intensity*((sample_t)1-Math::sqrt(this->UITenseness))* this->getNoiseModulator()*noiseSource;
        aspiration *= (sample_t)0.2 + (sample_t)0.02*(Math::random() * (sample_t)2 - (sample_t)1);//noise.simplex1(this->totalTime * 1.99);
        out += aspiration;
        return out;
    }

    float getNoiseModulator()
    {
		// TODO: optimize sin
        float voiced = (sample_t)0.1+(sample_t)0.2*Math::max(0,Math::sin(Math::PI*(sample_t)2* this->timeInWaveform/ this->waveformLength));
        //return 0.3;
        return  this->UITenseness*  this->intensity * voiced + ((sample_t)1- this->UITenseness*  this->intensity ) * (sample_t)0.3;
    }

    void finishBlock()
    {
		static SimplexNoise noise;
        sample_t vibrato = 0;
        vibrato += this->vibratoAmount * Math::sin((sample_t)2*Math::PI * this->totalTime *this->vibratoFrequency);
        vibrato += (sample_t)0.02 * noise.simplex1(this->totalTime * 4.07);
        vibrato += (sample_t)0.04 * noise.simplex1(this->totalTime * 2.15);
        if (autoWobble)
        {
			float autoWobbleVibrato =  0.2 * noise.simplex1(this->totalTime * 0.98);
			autoWobbleVibrato +=  0.4 * noise.noise(this->totalTime * 0.5);
			vibrato += autoWobbleVibrato;
        }
		this->smoothFrequency = this->UIFrequency;
		/*
		 * this smoothing is just too smooth , use the above non-smoothing instead.
		 * Actual smoothing is performed in setupWaveform anyhow
        if (this->UIFrequency>this->smoothFrequency)
            this->smoothFrequency = Math::min(this->smoothFrequency * (sample_t)1.1, this->UIFrequency);
        if (this->UIFrequency<this->smoothFrequency)
            this->smoothFrequency = Math::max(this->smoothFrequency / (sample_t)1.1, this->UIFrequency);
		*/
        this->oldFrequency = this->newFrequency;
        this->newFrequency = this->smoothFrequency * ((sample_t)1+vibrato);
        this->oldTenseness = this->newTenseness;
        this->newTenseness = this->UITenseness
            + (sample_t)0.1*(Math::random() * (sample_t)2 - (sample_t)1) /*noise.simplex1(this->totalTime*0.46) */ +(sample_t)0.05*(Math::random() * (sample_t)2 - (sample_t)1); //noise.simplex1(this->totalTime*0.36);
        if (!this->isTouched && alwaysVoice) this->newTenseness += ((sample_t)3-this->UITenseness)*((sample_t)1-this->intensity);

		// AR global envelope
        if (this->isTouched || alwaysVoice) this->intensity += (sample_t)0.13;
        else this->intensity -= (sample_t)0.05;
        this->intensity = Math::clamp(this->intensity, 0, 1);
    }

    void setupWaveform(float lambda)
    {
        this->frequency = this->oldFrequency*((sample_t)1-lambda) + this->newFrequency*lambda;
        float tenseness = this->oldTenseness*((sample_t)1-lambda) + this->newTenseness*lambda;
        this->Rd = (sample_t)3*((sample_t)1-tenseness);
        this->waveformLength = (sample_t)1.0/ this->frequency;

        float Rd = this->Rd;
        if (Rd<0.5) Rd = 0.5;
        if (Rd>2.7) Rd = 2.7;
        //var output;
        // normalized to time = 1, Ee = 1
        float Ra = (sample_t)-0.01 + (sample_t)0.048*Rd;
        float Rk = (sample_t)0.224 + (sample_t)0.118*Rd;
        float Rg = (Rk * (sample_t)0.25)*((sample_t)0.5+(sample_t)1.2*Rk)/((sample_t)0.11*Rd-Ra*((sample_t)0.5+(sample_t)1.2*Rk));

        float Ta = Ra;
        float Tp = (sample_t)1 / ((sample_t)2*Rg);
        float Te = Tp + Tp*Rk; //

        float epsilon = (sample_t)1/Ta;
        float shift = Math::exp(-epsilon * ((sample_t)1-Te));
        float Delta = (sample_t)1 - shift; //divide by this to scale RHS

        float RHSIntegral = ((sample_t)1/epsilon)*(shift - (sample_t)1) + ((sample_t)1-Te)*shift;
        RHSIntegral = RHSIntegral/Delta;

        float totalLowerIntegral = - (Te-Tp)/(sample_t)2 + RHSIntegral;
        float totalUpperIntegral = -totalLowerIntegral;

        float omega = Math::PI/Tp;
        float s = Math::sin(omega*Te);
        // need E0*e^(alpha*Te)*s = -1 (to meet the return at -1)
        // and E0*e^(alpha*Tp/2) * Tp*2/pi = totalUpperIntegral
        //             (our approximation of the integral up to Tp)
        // writing x for e^alpha,
        // have E0*x^Te*s = -1 and E0 * x^(Tp/2) * Tp*2/pi = totalUpperIntegral
        // dividing the second by the first,
        // letting y = x^(Tp/2 - Te),
        // y * Tp*2 / (pi*s) = -totalUpperIntegral;
        float y = -Math::PI*s*totalUpperIntegral / (Tp*(sample_t)2);
        float z = Math::log(y);
        float alpha = z/(Tp/(sample_t)2 - Te);
        float E0 = -(sample_t)1 / (s*Math::exp(alpha*Te));
        this->alpha = alpha;
        this->E0 = E0;
        this->epsilon = epsilon;
        this->shift = shift;
        this->Delta = Delta;
        this->Te=Te;
        this->omega = omega;
    }


    sample_t normalizedLFWaveform(sample_t t)
    {
		sample_t output;
        if (t>this->Te) output = (-Math::exp(-this->epsilon * (t-this->Te)) + this->shift)/this->Delta;
        else output = this->E0 * Math::exp(this->alpha*t) * Math::sin(this->omega * t);

        return output * this->intensity * this->loudness;
    }
};


class TractClass
{
typedef struct _Transient{
	float position;
	float timeAlive;
	float lifeTime;
	float strength;
	float exponent;
} Transient;

public:
	UIClass& UI;
	GlottisClass* Glottis;
    int n;
    int bladeStart;
    int tipStart;
    int lipStart;
	std::vector<sample_t> R;
	std::vector<sample_t> L;
	std::vector<sample_t> junctionOutputR;
	std::vector<sample_t> junctionOutputL;
	std::vector<sample_t> maxAmplitude;
	std::vector<sample_t> diameter;
	std::vector<sample_t> restDiameter;
	std::vector<sample_t> targetDiameter;
	std::vector<sample_t> newDiameter;
	std::vector<sample_t> A;
	int noseLength;
	int noseStart;
	std::vector<sample_t> noseR;
	std::vector<sample_t> noseL;
	std::vector<sample_t> noseJunctionOutputR;
	std::vector<sample_t> noseJunctionOutputL;
	std::vector<sample_t> noseReflection;
	std::vector<sample_t> noseDiameter;
	std::vector<sample_t> noseA;
	std::vector<sample_t> noseMaxAmplitude;
	std::vector<sample_t> reflection;
	std::vector<sample_t> newReflection;
	sample_t reflectionLeft;
	sample_t reflectionRight;
	sample_t reflectionNose;
	sample_t newReflectionLeft;
	sample_t newReflectionRight;
	sample_t newReflectionNose;



    float glottalReflection;
    float lipReflection;
    int lastObstruction;
    float fade;
    float movementSpeed;
    std::vector<Transient> transients;
    sample_t lipOutput;
    sample_t noseOutput;
    float velumTarget;
	float blockTime;

	TractClass(UIClass& newUI) :
		UI(newUI)
	{
		transients.reserve(100);
		n = 44;
		bladeStart = 10;
		tipStart = 32;
		lipStart = 39;
		//R : [], //component going right
		//L : [], //component going left
		//reflection = [];
		//junctionOutputR = [];
		//junctionOutputL = [];
		//maxAmplitude = [];
		//diameter = [];
		//restDiameter = [];
		//targetDiameter = [];
		//newDiameter = [];
		//A = [];
		glottalReflection = 0.75;
		lipReflection = -0.85;
		lastObstruction = -1;
		fade = 1.0, //0.9999;
		movementSpeed = 15; //cm per second
		//transients = [];
		lipOutput = 0;
		noseOutput = 0;
		velumTarget = 0.01;
	}

    void init(GlottisClass* newGlottis, float newBlockTime)
    {
		this->blockTime = newBlockTime;
		this->Glottis = newGlottis;
        this->bladeStart = Math::floor(this->bladeStart*this->n/(sample_t)44);
        this->tipStart = Math::floor(this->tipStart*this->n/(sample_t)44);
        this->lipStart = Math::floor(this->lipStart*this->n/(sample_t)44);
        this->diameter = std::vector<sample_t> (this->n);
        this->restDiameter = std::vector<sample_t> (this->n);
        this->targetDiameter = std::vector<sample_t> (this->n);
        this->newDiameter = std::vector<sample_t> (this->n);
        for (int i=0; i<this->n; i++)
        {
            float diameter = 0;
            if (i<(sample_t)7*this->n/(sample_t)44-(sample_t)0.5) diameter = (sample_t)0.6;
            else if (i<(sample_t)12*this->n/(sample_t)44) diameter = (sample_t)1.1;
            else diameter = (sample_t)1.5;
            this->diameter[i] = this->restDiameter[i] = this->targetDiameter[i] = this->newDiameter[i] = diameter;
        }
        this->R = std::vector<sample_t> (this->n);
        this->L = std::vector<sample_t> (this->n);
        this->reflection = std::vector<sample_t> (this->n+1);
        this->newReflection = std::vector<sample_t> (this->n+1);
        this->junctionOutputR = std::vector<sample_t> (this->n+1);
        this->junctionOutputL = std::vector<sample_t> (this->n+1);
        this->A = std::vector<sample_t> (this->n);
        this->maxAmplitude = std::vector<sample_t> (this->n);

        this->noseLength = Math::floor((sample_t)28*this->n/(sample_t)44);
        this->noseStart = this->n-this->noseLength + 1;
        this->noseR = std::vector<sample_t> (this->noseLength);
        this->noseL = std::vector<sample_t> (this->noseLength);
        this->noseJunctionOutputR = std::vector<sample_t> (this->noseLength + 1);
        this->noseJunctionOutputL = std::vector<sample_t> (this->noseLength + 1);
        this->noseReflection = std::vector<sample_t> (this->noseLength + 1);
        this->noseDiameter = std::vector<sample_t> (this->noseLength);
        this->noseA = std::vector<sample_t> (this->noseLength);
        this->noseMaxAmplitude = std::vector<sample_t> (this->noseLength);
        for (int i=0; i<this->noseLength; i++)
        {
            float diameter;
            float d = (sample_t)2*(i/this->noseLength);
            if (d<1) diameter = (sample_t)0.4+(sample_t)1.6*d;
            else diameter = (sample_t)0.5+(sample_t)1.5*((sample_t)2-d);
            diameter = Math::min(diameter, (sample_t)1.9);
            this->noseDiameter[i] = diameter;
        }
        this->newReflectionLeft = this->newReflectionRight = this->newReflectionNose = 0;
        this->calculateReflections();
        this->calculateNoseReflections();
        this->noseDiameter[0] = this->velumTarget;
    }

   	void reshapeTract(float deltaTime)
    {
        float amount = deltaTime * this->movementSpeed;
        int newLastObstruction = -1;
        for (int i=0; i<this->n; i++)
        {
            float diameter = this->diameter[i];
            float targetDiameter = this->targetDiameter[i];
            if (diameter <= 0) newLastObstruction = i;
            float slowReturn;
            if (i<this->noseStart) slowReturn = (sample_t)0.6;
            else if (i >= this->tipStart) slowReturn = (sample_t)1.0;
            else slowReturn = (sample_t)0.6+(sample_t)0.4*(i-this->noseStart)/(this->tipStart-this->noseStart);
            this->diameter[i] = Math::moveTowards(diameter, targetDiameter, slowReturn*amount, (sample_t)2*amount);
        }
        if (this->lastObstruction>-1 && newLastObstruction == -1 && this->noseA[0]<(sample_t)0.05)
        {
            this->addTransient(this->lastObstruction);
        }
        this->lastObstruction = newLastObstruction;

        amount = deltaTime * this->movementSpeed;
        this->noseDiameter[0] = Math::moveTowards(this->noseDiameter[0], this->velumTarget, amount*(sample_t)0.25, amount*(sample_t)0.1);
        this->noseA[0] = this->noseDiameter[0]*this->noseDiameter[0];
    }

    void calculateReflections()
    {
        for (int i=0; i<this->n; i++)
        {
            this->A[i] = this->diameter[i]*this->diameter[i]; //ignoring PI etc.
        }
        for (int i=1; i<this->n; i++)
        {
            this->reflection[i] = this->newReflection[i];
            if (this->A[i] == 0) this->newReflection[i] = (sample_t)0.999; //to prevent some bad behaviour if 0
            else this->newReflection[i] = (this->A[i-1]-this->A[i]) / (this->A[i-1]+this->A[i]);
        }

        //now at junction with nose

        this->reflectionLeft = this->newReflectionLeft;
        this->reflectionRight = this->newReflectionRight;
        this->reflectionNose = this->newReflectionNose;
        sample_t sum = this->A[this->noseStart]+this->A[this->noseStart+1]+this->noseA[0];
        this->newReflectionLeft = ((sample_t)2*this->A[this->noseStart]-sum)/sum;
        this->newReflectionRight = ((sample_t)2*this->A[this->noseStart+1]-sum)/sum;
        this->newReflectionNose = ((sample_t)2*this->noseA[0]-sum)/sum;
    }

    void calculateNoseReflections()
    {
        for (int i=0; i<this->noseLength; i++)
        {
            this->noseA[i] = this->noseDiameter[i]*this->noseDiameter[i];
        }
        for (int i=1; i<this->noseLength; i++)
        {
            this->noseReflection[i] = (this->noseA[i-1]-this->noseA[i]) / (this->noseA[i-1]+this->noseA[i]);
        }
    }

    void runStep(sample_t glottalOutput, sample_t turbulenceNoise, sample_t lambda)
    {
        sample_t updateAmplitudes = (Math::random()<(sample_t)0.1);

        //mouth
        this->processTransients();
        this->addTurbulenceNoise(turbulenceNoise);

        //this->glottalReflection = -0.8 + 1.6 * Glottis.newTenseness;
        this->junctionOutputR[0] = this->L[0] * this->glottalReflection + glottalOutput;
        this->junctionOutputL[this->n] = this->R[this->n-1] * this->lipReflection;

        for (int i=1; i<this->n; i++)
        {
            sample_t r = this->reflection[i] * ((sample_t)1-lambda) + this->newReflection[i]*lambda;
            sample_t w = r * (this->R[i-1] + this->L[i]);
            this->junctionOutputR[i] = this->R[i-1] - w;
            this->junctionOutputL[i] = this->L[i] + w;
        }

        //now at junction with nose
        int i = this->noseStart;
        sample_t r = this->newReflectionLeft * ((sample_t)1-lambda) + this->reflectionLeft*lambda;
        this->junctionOutputL[i] = r*this->R[i-1]+((sample_t)1+r)*(this->noseL[0]+this->L[i]);
        r = this->newReflectionRight * ((sample_t)1-lambda) + this->reflectionRight*lambda;
        this->junctionOutputR[i] = r*this->L[i]+((sample_t)1+r)*(this->R[i-1]+this->noseL[0]);
        r = this->newReflectionNose * ((sample_t)1-lambda) + this->reflectionNose*lambda;
        this->noseJunctionOutputR[0] = r*this->noseL[0]+((sample_t)1+r)*(this->L[i]+this->R[i-1]);

        for (int i=0; i<this->n; i++)
        {
            this->R[i] = this->junctionOutputR[i]*(sample_t)0.999;
            this->L[i] = this->junctionOutputL[i+1]*(sample_t)0.999;

            //this->R[i] = Math::clamp(this->junctionOutputR[i] * this->fade, -1, 1);
            //this->L[i] = Math::clamp(this->junctionOutputL[i+1] * this->fade, -1, 1);

            if (updateAmplitudes)
            {
                sample_t amplitude = Math::abs(this->R[i]+this->L[i]);
                if (amplitude > this->maxAmplitude[i]) this->maxAmplitude[i] = amplitude;
                else this->maxAmplitude[i] *= (sample_t)0.999;
            }
        }

        this->lipOutput = this->R[this->n-1];

        //nose
        this->noseJunctionOutputL[this->noseLength] = this->noseR[this->noseLength-1] * this->lipReflection;

        for (int i=1; i<this->noseLength; i++)
        {
            sample_t w = this->noseReflection[i] * (this->noseR[i-1] + this->noseL[i]);
            this->noseJunctionOutputR[i] = this->noseR[i-1] - w;
            this->noseJunctionOutputL[i] = this->noseL[i] + w;
        }

        for (int i=0; i<this->noseLength; i++)
        {
            this->noseR[i] = this->noseJunctionOutputR[i] * this->fade;
            this->noseL[i] = this->noseJunctionOutputL[i+1] * this->fade;

            //this->noseR[i] = Math::clamp(this->noseJunctionOutputR[i] * this->fade, -1, 1);
            //this->noseL[i] = Math::clamp(this->noseJunctionOutputL[i+1] * this->fade, -1, 1);

            if (updateAmplitudes)
            {
                sample_t amplitude = Math::abs(this->noseR[i]+this->noseL[i]);
                if (amplitude > this->noseMaxAmplitude[i]) this->noseMaxAmplitude[i] = amplitude;
                else this->noseMaxAmplitude[i] *= (sample_t)0.999;
            }
        }

        this->noseOutput = this->noseR[this->noseLength-1];

    }

    void finishBlock()
    {
        this->reshapeTract(this->blockTime);
        this->calculateReflections();
    }

    void addTransient(int position)
    {
		rt_printf("Added transient at %d\n", position);
        Transient trans;
        trans.position = position;
        trans.timeAlive = 0;
        trans.lifeTime = 0.2;
        trans.strength = 0.3;
        trans.exponent = 200;
        this->transients.push_back(trans);
    }

    void processTransients()
    {
        for (int i = 0; i < this->transients.size(); i++)
        {
            Transient& trans = this->transients[i];
            sample_t amplitude = trans.strength * Math::pow((sample_t)2, -trans.exponent * trans.timeAlive);
            this->R[trans.position] += amplitude/(sample_t)2;
            this->L[trans.position] += amplitude/(sample_t)2;
            trans.timeAlive += (sample_t)1.0/(sampleRate*(sample_t)2);
        }
        for (int i=this->transients.size()-1; i>=0; i--)
        {
            Transient trans = this->transients[i];
            if (trans.timeAlive > trans.lifeTime)
            {
                this->transients.erase(transients.begin()+i);
            }
        }
    }

    void addTurbulenceNoise(sample_t turbulenceNoise)
    {
        for (int j=0; j<UI.touchesWithMouse.size(); j++)
        {
            Touch& touch = UI.touchesWithMouse[j];
            if (touch.index<2 || touch.index>this->n) continue;
            if (touch.diameter<=0) continue;
            float intensity = touch.fricative_intensity;
            if (intensity == 0) continue;
            this->addTurbulenceNoiseAtIndex((sample_t)0.66*turbulenceNoise*intensity, touch.index, touch.diameter);
        }

		// TODO:
		// attempt to compensate for touch.fricative_intensity when setting
		// diameter directly (no touches used). This is very 
		// CPU intensive though.
		//for(unsigned int n = 2; n < this->targetDiameter.size() - 1; ++n)
		//{
			// if the diameter is small, there has to be some turbulence!
			//if(this->targetDiameter[n] < 0.2f)
			//{
				//addTurbulenceNoiseAtIndex(0.66f * turbulenceNoise, n + 0.5f, this->targetDiameter[n]);
			//}
		//}
    }

    void addTurbulenceNoiseAtIndex(sample_t turbulenceNoise, float index, float diameter)
    {
        int i = Math::floor(index);
        float delta = index - i;
        turbulenceNoise *= Glottis->getNoiseModulator();
        sample_t thinness0 = Math::clamp((sample_t)8*((sample_t)0.7-diameter),0,1);
        sample_t openness = Math::clamp((sample_t)30*(diameter-(sample_t)0.3), 0, 1);
        sample_t noise0 = turbulenceNoise*((sample_t)1-delta)*thinness0*openness;
        sample_t noise1 = turbulenceNoise*delta*thinness0*openness;
        this->R[i+1] += noise0 * (sample_t)0.5;
        this->L[i+1] += noise0 * (sample_t)0.5;
        this->R[i+2] += noise1 * (sample_t)0.5;
        this->L[i+2] += noise1 * (sample_t)0.5;
    }
	
};

class AudioSystemClass
{
public:
    int blockLength;
    float blockTime;
    bool started;
    bool soundOn;
	GlottisClass& Glottis;
	TractClass& Tract;
	int samplesBetweenUpdates;

	AudioSystemClass(GlottisClass& newGlottis, TractClass& newTract, int newBlockLength, int newSamplesBetweenUpdates) :
		Glottis(newGlottis)
		, Tract(newTract)
	{
    	blockLength = newBlockLength;
		samplesBetweenUpdates = newSamplesBetweenUpdates;
    	blockTime = 1;
    	started = false;
    	soundOn = false;
	}

    void init()
    {
        //this.audioContext = new audioContextParent.AudioContext();
        //if(!isBrowser){
            //console.log("setting out to stdout");
            //this.audioContext.outStream = process.stdout;
        //}
		//this.audioContext.sampleRate = 44100;
        sampleRate = 44100;
        this->blockTime = this->blockLength/sampleRate;
		Glottis.init();
		Tract.init(&Glottis, this->samplesBetweenUpdates/sampleRate);
    }

	/* TODO: startSound
    void startSound()
    {
        //scriptProcessor may need a dummy input channel on iOS
        //this.scriptProcessor = this.audioContext.createScriptProcessor(this.blockLength, 2, 1);
        //this.scriptProcessor.connect(this.audioContext.destination);
        //this.scriptProcessor.onaudioprocess = AudioSystem.doScriptProcessor;

        //var whiteNoise = this.createWhiteNoiseNode(2*sampleRate); // 2 seconds of noise

        var aspirateFilter = this.audioContext.createBiquadFilter();
        aspirateFilter.type = "bandpass";
        aspirateFilter.frequency.value = 500;
        aspirateFilter.Q.value = 0.5;
        whiteNoise.connect(aspirateFilter);
        aspirateFilter.connect(this.scriptProcessor);

        var fricativeFilter = this.audioContext.createBiquadFilter();
        fricativeFilter.type = "bandpass";
        fricativeFilter.frequency.value = 1000;
        fricativeFilter.Q.value = 0.5;
        whiteNoise.connect(fricativeFilter);
        fricativeFilter.connect(this.scriptProcessor);

        //whiteNoise.start(0);
    }
	*/

	/*
	 * TODO: handle white noise appropriately
    createWhiteNoiseNode : function(frameCount)
    {
        var myArrayBuffer = this.audioContext.createBuffer(1, frameCount, sampleRate);

        var nowBuffering = myArrayBuffer.getChannelData(0);
        for (var i = 0; i < frameCount; i++)
        {
            nowBuffering[i] = Math::random();// gaussian();
        }

        var source = this.audioContext.createBufferSource();
        source.buffer = myArrayBuffer;
        source.loop = true;

        return source;
    },
	*/


    void doScriptProcessor(sample_t* inputArray, sample_t* glottalOutArray, sample_t* tractOutArray, int length)
    {
		static int samplesSinceLastUpdate = 0;
        for (int j = 0, N = samplesBetweenUpdates; j < length; j++)
        {
            sample_t lambda1 = (samplesSinceLastUpdate+j)/(sample_t)N;
            sample_t lambda2 = (samplesSinceLastUpdate+j+(sample_t)0.5)/(sample_t)N;
            sample_t glottalOutput = Glottis.runStep(lambda1, Math::random());
			// store back glottal output
			glottalOutArray[j] = glottalOutput;

            sample_t vocalOutput = 0;
            //Tract runs at twice the sample rate
			float random = Math::random();
            Tract.runStep(inputArray[j], random, lambda1);
            vocalOutput += Tract.lipOutput + Tract.noseOutput;
            Tract.runStep(inputArray[j], random, lambda2);
            vocalOutput += Tract.lipOutput + Tract.noseOutput;
            tractOutArray[j] = vocalOutput * (sample_t)0.125;
        }
		samplesSinceLastUpdate += length;
		if(samplesSinceLastUpdate >= samplesBetweenUpdates){
			samplesSinceLastUpdate -= samplesBetweenUpdates;
			Glottis.finishBlock();
			Tract.finishBlock();
		}
    }

	/*
    mute()
    {
        this.scriptProcessor.disconnect();
    },

    unmute : function()
    {
        this.scriptProcessor.connect(this.audioContext.destination);
    }
	*/

};




class TractUIClass
{
public:
    int originX;
    int originY;
    int radius;
    float scale;
    float tongueIndex;
    float tongueDiameter;
    float innerTongueControlRadius;
    float outerTongueControlRadius;
    float angleScale;
    float angleOffset;
    float noseOffset;
    float gridOffset;
	Touch tongueTouch;
	TractClass& Tract;
	UIClass& UI;
	int tongueLowerIndexBound;
	int tongueUpperIndexBound;
	float tongueIndexCentre;

	TractUIClass(TractClass& newTract, UIClass& newUI) : 
		Tract(newTract)
		, UI(newUI)
	{
		originX = 340;
		originY = 449;
		radius = 298;
		scale = 60;
		tongueIndex = 12.9;
		tongueDiameter = 2.43;
		innerTongueControlRadius = 2.05;
		outerTongueControlRadius = 3.5;
		tongueTouch.enabled = false;
		angleScale = 0.64;
		angleOffset = -0.24;
		noseOffset = 0.8;
		gridOffset = 1.7;
	}

    void init()
    {
        this->setRestDiameter();
        for(int i=0; i<Tract.n; i++)
        {
            Tract.diameter[i] = Tract.targetDiameter[i] = Tract.restDiameter[i];
        }
        this->tongueLowerIndexBound = Tract.bladeStart+2;
        this->tongueUpperIndexBound = Tract.tipStart-3;
        this->tongueIndexCentre = (sample_t)0.5*(this->tongueLowerIndexBound+this->tongueUpperIndexBound);
    }

    float getIndex(float x,float y)
    {
        float xx = x-this->originX; float yy = y-this->originY;
        float angle = Math::atan2(yy, xx);
        while (angle> 0) angle -= (sample_t)2*Math::PI;
        return (Math::PI + angle - this->angleOffset)*(Tract.lipStart-1) / (this->angleScale*Math::PI);
    }

    float getDiameter(float x,float y)
    {
        float xx = x-this->originX; float yy = y-this->originY;
        return (this->radius-Math::sqrt(xx*xx + yy*yy))/this->scale;
    }

    void setRestDiameter()
    {
        for (int i=Tract.bladeStart; i<Tract.lipStart; i++)
        {
            float t = (sample_t)1.1 * Math::PI*(this->tongueIndex - i)/(Tract.tipStart - Tract.bladeStart);
            float fixedTongueDiameter = (sample_t)2+(this->tongueDiameter-(sample_t)2)/(sample_t)1.5;
            float curve = ((sample_t)1.5-fixedTongueDiameter+this->gridOffset)*Math::cos(t);
            if (i == Tract.bladeStart-2 || i == Tract.lipStart-1) curve *= (sample_t)0.8;
            if (i == Tract.bladeStart || i == Tract.lipStart-2) curve *= (sample_t)0.94;
            Tract.restDiameter[i] = (sample_t)1.5 - curve;
        }
    }

    void handleTouches()
    {
        if (this->tongueTouch.enabled && !this->tongueTouch.alive) this->tongueTouch.enabled = false;

		// if there is no toungueTouch, look for one
        if (!this->tongueTouch.enabled)
        {
            for (int j=0; j<UI.touchesWithMouse.size(); j++)
            {
                Touch& touch = UI.touchesWithMouse[j];
                if (!touch.alive) continue;
                if (touch.fricative_intensity == 1) continue; //only new touches will pass this
                //float x = touch.x;
                //float y = touch.y;
                float index = touch.index;//getIndex(x,y);
                float diameter = touch.diameter;//getDiameter(x,y);
				// if the touch is on the tongue, it becomes the new tongueTouch
                if (index >= this->tongueLowerIndexBound-4 && index<=this->tongueUpperIndexBound+4
                    && diameter >= this->innerTongueControlRadius-(sample_t)0.5 && diameter <= this->outerTongueControlRadius+(sample_t)0.5)
                {
                    this->tongueTouch = touch;
                }
            }
        }

        if (this->tongueTouch.enabled)
        {
            //float x = this->tongueTouch.x;
            //float y = this->tongueTouch.y;
            float index = this->tongueTouch.index;// getIndex(x,y);
            float diameter = this->tongueTouch.diameter;// getDiameter(x,y);
            float fromPoint = (this->outerTongueControlRadius-diameter)/(this->outerTongueControlRadius-this->innerTongueControlRadius);
            fromPoint = Math::clamp(fromPoint, 0, 1);
            fromPoint = Math::pow(fromPoint, 0.58) - (sample_t)0.2*(fromPoint*fromPoint-fromPoint); //horrible kludge to fit curve to straight line
            this->tongueDiameter = Math::clamp(diameter, this->innerTongueControlRadius, this->outerTongueControlRadius);
            //this->tongueIndex = Math::clamp(index, this->tongueLowerIndexBound, this->tongueUpperIndexBound);
            float out = fromPoint*(sample_t)0.5*(this->tongueUpperIndexBound-this->tongueLowerIndexBound);
            this->tongueIndex = Math::clamp(index, this->tongueIndexCentre-out, this->tongueIndexCentre+out);

        }

        this->setRestDiameter();
        for (int i=0; i<Tract.n; i++) Tract.targetDiameter[i] = Tract.restDiameter[i];

        //other constrictions and nose
        //Tract.velumTarget = 0.01;
        for (int j=0; j<UI.touchesWithMouse.size(); j++)
        {
            Touch& touch = UI.touchesWithMouse[j];
            if (!touch.alive) continue;
            //float x = touch.x;
            //float y = touch.y;
            float index = touch.index; // getIndex(x,y);
            float diameter = touch.diameter; // getDiameter(x,y);
            if (index > Tract.noseStart && diameter < -this->noseOffset)
            {
                // touch in the nose area: open velum
                //Tract.velumTarget = 0.4;
            }
            if (diameter < -(sample_t)0.85-this->noseOffset) continue;
            diameter -= (sample_t)0.3;
            if (diameter<0) diameter = 0;
            float width=2;
            if (index<25) width = 10;
            else if (index>=Tract.tipStart) width= 5;
            else width = (sample_t)10-(sample_t)5*(index-(sample_t)25)/(Tract.tipStart-(sample_t)25);
            if (index >= 2 && index < Tract.n && diameter < 3)
            {
				// regular touch
                int intIndex = Math::round(index);
                for (int i=-Math::ceil(width)-1; i<width+1; i++)
                {
                    if (intIndex+i<0 || intIndex+i>=Tract.n) continue;
                    float relpos = (intIndex+i) - index;
                    relpos = Math::abs(relpos)-(sample_t)0.5;
                    float shrink;
                    if (relpos <= 0) shrink = 0;
                    else if (relpos > width) shrink = 1;
                    else shrink = (sample_t)0.5*((sample_t)1-Math::cos(Math::PI * relpos / width));
                    if (diameter < Tract.targetDiameter[intIndex+i])
                    {
	// the touch makes the diameter smaller than the rest value, update it here
                        Tract.targetDiameter[intIndex+i] = diameter + (Tract.targetDiameter[intIndex+i]-diameter)*shrink;
                    }
                }
            }
        }
    }
};

/*
if(isBrowser)
    requestAnimationFrame(redraw);
function redraw(highResTimestamp)
{
    UI.shapeToFitScreen();
    TractUI.draw();
    UI.draw();
    requestAnimationFrame(redraw);
    time = Date.now()/1000;
    UI.updateTouches();
}
*/



/**********************************************************************************/
/**********************************************************************************/

/*
 * A speed-improved perlin and simplex noise algorithms for 2D.
 *
 * Based on example code by Stefan Gustavson (stegu@itn.liu.se).
 * Optimisations by Peter Eastman (peastman@drizzle.stanford.edu).
 * Better rank ordering method by Stefan Gustavson in 2012.
 * Converted to Javascript by Joseph Gentle.
 *
 * Version 2012-03-09
 *
 * This code was placed in the public domain by its original author,
 * Stefan Gustavson. You may use it as you see fit, but
 * attribution is appreciated.
 *
 */

/*
(function(global){
  var module = global.noise = {};

  function Grad(x, y, z) {
    this.x = x; this.y = y; this.z = z;
  }

  Grad.prototype.dot2 = function(x, y) {
    return this.x*x + this.y*y;
  };

  Grad.prototype.dot3 = function(x, y, z) {
    return this.x*x + this.y*y + this.z*z;
  };

  var grad3 = [new Grad(1,1,0),new Grad(-1,1,0),new Grad(1,-1,0),new Grad(-1,-1,0),
               new Grad(1,0,1),new Grad(-1,0,1),new Grad(1,0,-1),new Grad(-1,0,-1),
               new Grad(0,1,1),new Grad(0,-1,1),new Grad(0,1,-1),new Grad(0,-1,-1)];

  var p = [151,160,137,91,90,15,
  131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,8,99,37,240,21,10,23,
  190, 6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,35,11,32,57,177,33,
  88,237,149,56,87,174,20,125,136,171,168, 68,175,74,165,71,134,139,48,27,166,
  77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,55,46,245,40,244,
  102,143,54, 65,25,63,161, 1,216,80,73,209,76,132,187,208, 89,18,169,200,196,
  135,130,116,188,159,86,164,100,109,198,173,186, 3,64,52,217,226,250,124,123,
  5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,189,28,42,
  223,183,170,213,119,248,152, 2,44,154,163, 70,221,153,101,155,167, 43,172,9,
  129,22,39,253, 19,98,108,110,79,113,224,232,178,185, 112,104,218,246,97,228,
  251,34,242,193,238,210,144,12,191,179,162,241, 81,51,145,235,249,14,239,107,
  49,192,214, 31,181,199,106,157,184, 84,204,176,115,121,50,45,127, 4,150,254,
  138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180];
  // To remove the need for index wrapping, double the permutation table length
  var perm = new Array(512);
  var gradP = new Array(512);

  // This isn't a very good seeding function, but it works ok. It supports 2^16
  // different seed values. Write something better if you need more seeds.
  module.seed = function(seed) {
    if(seed > 0 && seed < 1) {
      // Scale the seed out
      seed *= 65536;
    }

    seed = Math::floor(seed);
    if(seed < 256) {
      seed |= seed << 8;
    }

    for(var i = 0; i < 256; i++) {
      var v;
      if (i & 1) {
        v = p[i] ^ (seed & 255);
      } else {
        v = p[i] ^ ((seed>>8) & 255);
      }

      perm[i] = perm[i + 256] = v;
      gradP[i] = gradP[i + 256] = grad3[v % 12];
    }
  };

  module.seed(Date.now());

  
  //for(var i=0; i<256; i++) {
    //perm[i] = perm[i + 256] = p[i];
    //gradP[i] = gradP[i + 256] = grad3[perm[i] % 12];
  //}

  // Skewing and unskewing factors for 2, 3, and 4 dimensions
  var F2 = 0.5*(Math::sqrt(3)-1);
  var G2 = (3-Math::sqrt(3))/6;

  var F3 = 1/3;
  var G3 = 1/6;

  // 2D simplex noise
  module.simplex2 = function(xin, yin) {
    var n0, n1, n2; // Noise contributions from the three corners
    // Skew the input space to determine which simplex cell we're in
    var s = (xin+yin)*F2; // Hairy factor for 2D
    var i = Math::floor(xin+s);
    var j = Math::floor(yin+s);
    var t = (i+j)*G2;
    var x0 = xin-i+t; // The x,y distances from the cell origin, unskewed.
    var y0 = yin-j+t;
    // For the 2D case, the simplex shape is an equilateral triangle.
    // Determine which simplex we are in.
    var i1, j1; // Offsets for second (middle) corner of simplex in (i,j) coords
    if(x0>y0) { // lower triangle, XY order: (0,0)->(1,0)->(1,1)
      i1=1; j1=0;
    } else {    // upper triangle, YX order: (0,0)->(0,1)->(1,1)
      i1=0; j1=1;
    }
    // A step of (1,0) in (i,j) means a step of (1-c,-c) in (x,y), and
    // a step of (0,1) in (i,j) means a step of (-c,1-c) in (x,y), where
    // c = (3-sqrt(3))/6
    var x1 = x0 - i1 + G2; // Offsets for middle corner in (x,y) unskewed coords
    var y1 = y0 - j1 + G2;
    var x2 = x0 - 1 + 2 * G2; // Offsets for last corner in (x,y) unskewed coords
    var y2 = y0 - 1 + 2 * G2;
    // Work out the hashed gradient indices of the three simplex corners
    i &= 255;
    j &= 255;
    var gi0 = gradP[i+perm[j]];
    var gi1 = gradP[i+i1+perm[j+j1]];
    var gi2 = gradP[i+1+perm[j+1]];
    // Calculate the contribution from the three corners
    var t0 = 0.5 - x0*x0-y0*y0;
    if(t0<0) {
      n0 = 0;
    } else {
      t0 *= t0;
      n0 = t0 * t0 * gi0.dot2(x0, y0);  // (x,y) of grad3 used for 2D gradient
    }
    var t1 = 0.5 - x1*x1-y1*y1;
    if(t1<0) {
      n1 = 0;
    } else {
      t1 *= t1;
      n1 = t1 * t1 * gi1.dot2(x1, y1);
    }
    var t2 = 0.5 - x2*x2-y2*y2;
    if(t2<0) {
      n2 = 0;
    } else {
      t2 *= t2;
      n2 = t2 * t2 * gi2.dot2(x2, y2);
    }
    // Add contributions from each corner to get the final noise value.
    // The result is scaled to return values in the interval [-1,1].
    return 70 * (n0 + n1 + n2);
  };

  module.simplex1 = function(x)
  {
    return module.simplex2(x*1.2, -x*0.7);
  };


})(this);
*/
#include <Midi.h>
#include <signal.h>
std::vector<const char*> gMidiPortNames;
static std::vector<Midi*> midi;

AudioSystemClass* AudioSystem;
int gLength;
GlottisClass Glottis;
UIClass UI;
TractClass Tract(UI);
TractUIClass* TractUI;
const unsigned int localDiameterSize = 9;
std::array<int, localDiameterSize> localDiameterMappings = {{19, 23, 27, 31, 49, 53, 57, 61, 62}};
std::array<float, localDiameterSize> localDiameter = {{0}};

unsigned int touch1IndexAnIn = 0;
unsigned int touch1DiameterAnIn = 1;
unsigned int tensenessAnIn = 2;
unsigned int frequencyAnIn = 3;
unsigned int touch2IndexAnIn = 4;
unsigned int touch2DiameterAnIn = 5;
unsigned int tongueTouchIndexAnIn = 6;
unsigned int tongueTouchDiameterAnIn = 7;
unsigned int pitchAnOut = 0;

std::array<unsigned int, 2> touchesIndexAnIn = {{touch1IndexAnIn, touch2IndexAnIn}};
std::array<unsigned int, 2> touchesDiameterAnIn = {{touch1DiameterAnIn, touch2DiameterAnIn}};
enum
{
	switch1 = 6,
	trigIn1 = 15,
	trigIn2 = 14,
	trigIn3 = 1,
	trigIn4 = 3,
	trigOut1 = 0,
	trigOut2 = 5,
	trigOut3 = 12,
	trigOut4 = 13,
	ledOut1 = 2,
	ledOut2 = 4,
	ledOut3 = 8,
	ledOut4 = 10,
	pwmOut = 7,
};

unsigned int velumDigIn = trigIn1;
unsigned int wobbleDigIn = trigIn2;
unsigned int high1DigOut = trigOut1;
unsigned int high2DigOut = trigOut2;
unsigned int velumDigOut = ledOut1;
unsigned int wobbleDigOut = ledOut2;
unsigned int obstructionDigOut = ledOut3;
std::array<unsigned int, 2> digitalIns = {{velumDigIn, wobbleDigIn}};
std::array<unsigned int, 6> digitalOuts = {{high1DigOut, high2DigOut, velumDigOut, obstructionDigOut, wobbleDigOut, pwmOut}};

AuxiliaryTask logTask;
void log(void*);
bool setup(BelaContext* context, void*)
{
	gMidiPortNames.push_back("hw:1,0,0");
	gMidiPortNames.push_back("hw:0,0,0");
	midi.resize(gMidiPortNames.size());
	for(unsigned int n = 0; n < midi.size(); ++n){
		midi[n] = new Midi();
		const char* name = gMidiPortNames[n];
		midi[n]->readFrom(name);
		midi[n]->writeTo(name);
		midi[n]->enableParser(true);
	}
	gLength = context->audioFrames;

	TractUI = new TractUIClass(Tract, UI);

	AudioSystem = new AudioSystemClass(Glottis, Tract, gLength, 4096);
	AudioSystem->init();
	AudioSystem->started = true;
	AudioSystem->soundOn = true;

	TractUI->init();

	// initialize digital I/O
	for(unsigned int n = 0; n < digitalIns.size(); ++n)
		pinMode(context, 0, digitalIns[n], INPUT);
	for(unsigned int n = 0; n < digitalOuts.size(); ++n)
		pinMode(context, 0, digitalOuts[n], OUTPUT);

	// Create and enable the appropriate number of touches: 
	std::vector<Touch>& touches = UI.touchesWithMouse;
	for(unsigned int n = 0; n < touchesIndexAnIn.size(); ++n)
	{
		touches.emplace_back();
		Touch& touch = touches[touches.size() - 1];
		touch.alive = true;
		touch.enabled = true;
		touch.diameter = 3;
		touch.index = 20;
		touch.fricative_intensity = 1;
	}
	TractUI->tongueTouch.alive = true;
	TractUI->tongueTouch.enabled = true;

	Tract.velumTarget =  0.4;

	logTask = Bela_createAuxiliaryTask(log, 40, "logTask", NULL);
	Bela_scheduleAuxiliaryTask(logTask);

	return true;
}

void drivePwm(BelaContext* context, int pwmPin);
void setLed(BelaContext* context, int ledPin,  int color);

void render(BelaContext* context, void*)
{
	drivePwm(context, pwmOut);
	// Check for MIDI messages
	bool changed = false;
	int num;
	for(unsigned int port = 0; port < midi.size(); ++port){
		while((num = midi[port]->getParser()->numAvailableMessages()) > 0){
			static MidiChannelMessage message;
			message = midi[port]->getParser()->getNextChannelMessage();
			//message.prettyPrint();
			if(message.getType() == kmmNoteOn){
				if(message.getDataByte(1) > 0)
				{ //onset: get the frequency
					float f0 = powf(2, (message.getDataByte(0)-69)/12.0f) * 440;
					Glottis.UIFrequency = f0;
					rt_printf("Note: %d, frequency: %.2f\n", message.getDataByte(0), f0);
				}
			}
			if(message.getType() == kmmControlChange){
				//rt_printf("channel: %d, control: %d, value: %d\n", message.getChannel(), message.getDataByte(0), message.getDataByte(1));
				Touch& t = TractUI->tongueTouch;
				// Control change 1 : x
				if(message.getDataByte(0) == 1)
				{
					float x = message.getDataByte(1);
					x = x*4 ;
					rt_printf("x: %.3f\n", x);
					t.x = x;
				}

				// Control change 2 : x
				if(message.getDataByte(0) == 2)
				{
					float y = message.getDataByte(1);
					y = y*4;
					rt_printf("y: %.3f\n", y);
					t.y = y;
				}
				//t.diameter = 2.1;
				//t.fricative_intensity = 0;
				//t.alive = true;
				//t.enabled = true;
				//TractUI->handleTouches();
				
				if(message.getDataByte(0) == 3)
				{
					float tenseness = message.getDataByte(1)/127.f;
					Glottis.UITenseness = tenseness;
					Glottis.loudness = Math::pow(Glottis.UITenseness, 0.25);
				}
				short int control = message.getDataByte(0);
				float value = message.getDataByte(1) / 127.f;
				if(control == 16)
					Tract.velumTarget = value;
				value = value * 3.f - 0.4f;

				for(unsigned int n = 0; n < localDiameterMappings.size(); ++n)
				{
					if(localDiameterMappings[n] == control){
						localDiameter[n] = value;
						//rt_printf("Setting %d (CC %d) to %.3f\n", n, control, value);
						changed = true;
					}
				}
			}
		}
	}
	if(changed)
	{
		std::vector<sample_t>& diameter = Tract.targetDiameter;
		float ratio = ((float)localDiameter.size() - 1.f) / (float)diameter.size();
		for(int n = 0; n < diameter.size(); ++n)
		{
			//linearly interpolate between the positions to obtain diameter
			float index = n * ratio;
			int intIndex = (int)index;
			float frac = index - intIndex;
			diameter[n] = localDiameter[intIndex] * (1 - frac) + localDiameter[intIndex + 1] * frac;
			// TODO: add a condition for velumTarget
		}
	}
	
	if(1) 
	{
		// handle I/O

		// regular touches
		std::vector<Touch>& touches = UI.touchesWithMouse;
		for(unsigned int n = 0; n < touches.size() && n < touchesIndexAnIn.size(); ++n)
		{
			float diameter = (1.f - analogRead(context, 0, touchesDiameterAnIn[n])) * 3.f - 0.1f;
			float index = analogRead(context, 0, touchesIndexAnIn[n]) * 40.f + 2.f;
			Touch& touch = touches[n];
			touch.diameter = diameter;
			touch.index = index;

		}

		// tongueTouch
		Touch& tongueTouch = TractUI->tongueTouch;
		tongueTouch.diameter = (1.f - analogRead(context, 0, tongueTouchDiameterAnIn)) * 2.f + 1.6f;
		tongueTouch.index = analogRead(context, 0, tongueTouchIndexAnIn) * 20.f + 10.f;
		//rt_printf("tongueTouch: %f %f\n", tongueTouch.index, tongueTouch.diameter);

		// apply changes
		TractUI->handleTouches();

		int velumInput = digitalRead(context, 0, velumDigIn);
		Tract.velumTarget =  velumInput ? 0.4 : 0.01 ;
		// echo velum to LED
		setLed(context, velumDigOut, (Tract.velumTarget > 0.2) * 2);
		int wobbleInput = digitalRead(context, 0, wobbleDigIn);
		autoWobble = !wobbleInput;
		setLed(context, wobbleDigOut, autoWobble * 2);

		// if there is one (or more) obstruction active, blink led
		setLed(context, obstructionDigOut, (Tract.lastObstruction > -1) * 2);

		float tenseness = analogRead(context, 0, tensenessAnIn);

		// float frequency = analogRead(context, 0, frequencyAnIn) * 1000.f + 50.f; // linear frequency scaling

		// expo frequency scaling
		float frequencyInput = analogRead(context, 0, frequencyAnIn);
		float frequency = cvFrequencyOffset * powf(2, frequencyInput * cvInScaling);

		Glottis.UITenseness = tenseness;
		Glottis.UIFrequency = frequency;
		
		// set digital out 1 and 2 to "high". This can be useful to control the trig inputs
		digitalWrite(context, 0, high1DigOut, 1);
		digitalWrite(context, 0, high2DigOut, 1);
	}

	// update the Tract
	static int state = 0;
	static int lastChange = 10000;
	static int numStates = 2;
	if(0)
	if((int)context->audioFramesElapsed - lastChange > 70000){
		rt_printf("last: %d, current: %d\n", lastChange, context->audioFramesElapsed);
		lastChange = context->audioFramesElapsed;
		state++;
		static int count = -1;
		count++;
		if(state >= numStates)
			state -= numStates;
		std::vector<Touch>& touches = UI.touchesWithMouse;
		if(state == 0){
            Tract.addTransient(count%44);
			touches.clear();
			rt_printf("Default\n");
		}
		if(state == 1){
			Touch t;
			t.x = 240;
			t.y = 188;
			t.index = 30;
			t.diameter = 0.44;
			t.fricative_intensity = 0.9;
			t.alive = true;
			t.enabled = true;
			touches.push_back(t);
			rt_printf("Change\n");
		}
		if(state == 2){
			Touch t;
			t.x = 182;
			t.y = 265;
			t.index = 30;
			t.diameter = 0.44;
			touches[0].fricative_intensity = 0;
			t.fricative_intensity = 0.4;
			t.alive = true;
			t.enabled = true;
			touches.push_back(t);
			rt_printf("Change again\n");
		}
		TractUI->handleTouches();
	}
	if(0)
	if(context->audioFramesElapsed - lastChange > 150000){
		lastChange = context->audioFramesElapsed;
		state++;
		if(state >= numStates)
			state -= numStates;
		Touch& t = TractUI->tongueTouch;
		if(state == 0){
			t.x = 286;
			t.y = 386;
			t.diameter = 2.1;
			t.fricative_intensity = 0;
			t.alive = true;
			t.enabled = true;
			rt_printf("Default\n");
		}
		if(state == 1){
			t.x = 174;
			t.y = 386;
			t.diameter = 2.1;
			t.fricative_intensity = 0;
			t.alive = true;
			t.enabled = true;
			rt_printf("Change\n");
		}
		if(state == 2){
			t.x = 286;
			t.y = 234;
			t.alive = true;
			t.enabled = true;
			rt_printf("Change again\n");
		}
		TractUI->handleTouches();
	}

	sample_t inputArray[gLength];
	sample_t glottalOutArray[gLength];
	sample_t tractOutArray[gLength];
	for(unsigned int n = 0; n < context->audioFrames; ++n)
	{
		// sum audio inputs
		inputArray[n] = 0.5f * (audioRead(context, n, 0) + audioRead(context, n, 1));
	}
	AudioSystem->doScriptProcessor(inputArray, glottalOutArray, tractOutArray, gLength);
	
	// write pitch out, smoothed
	//TODO: this could probably be extracted sample-accurate from the Glottis.
	float targetFrequency = log2f(Glottis.newFrequency / cvFrequencyOffset) * cvOutScaling;
	float alpha = 1.f/context->analogFrames;
	static float oldFrequency = 0;
	float frequency = oldFrequency;
	for(unsigned int n = 0; n < context->analogFrames; ++n)
	{
		frequency = oldFrequency * alpha + targetFrequency * (1.f - alpha);
		analogWriteOnce(context, n, pitchAnOut, targetFrequency);
		analogWriteOnce(context, n, 1, 0.4f);
		oldFrequency = frequency;
	}

	// write audio out
	// mute at startup to get rid of nasty onset transient
	if(context->audioFramesElapsed > 1.f * context->audioSampleRate)
		for(unsigned int n = 0; n < context->audioFrames; ++n)
		{
			audioWrite(context, n, 0, glottalOutArray[n]);
			audioWrite(context, n, 1, tractOutArray[n]);
		}
}

void cleanup(BelaContext* context, void*)
{
	delete AudioSystem;
}

void log(void*)
{
return;
	// logging the tract
	while(!gShouldStop)
	{
		//std::vector<sample_t>& diameter = Tract.targetDiameter;
		//for(int n = 0; n < diameter.size(); ++n)
		//{
			//rt_printf("%.2f ", diameter[n]);
		//}
		//rt_printf("V: %.2f", Tract.velumTarget);
		//rt_printf("\n");
		for(int n = 0; n < UI.touchesWithMouse.size(); ++n){
			Touch& touch = UI.touchesWithMouse[n];
			rt_printf("Touch %d: ", n);
			rt_printf("index: %.2f, diameter: %.2f\n", touch.index, touch.diameter);
		}
		Touch& touch = TractUI->tongueTouch;
		rt_printf("Tongue:index: %.2f, diameter: %.2f\n", touch.index, touch.diameter);
		rt_printf("tenseness: %.2f, frequency: %.2f\n", Glottis.UITenseness, Glottis.UIFrequency);
		rt_printf("velum: %.2f\n", Tract.velumTarget);
		usleep(200000);
	}
}
