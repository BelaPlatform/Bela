/////////////////////////////////////////////////////////////////////////////////
// trigger.cpp: 
// produces a 440Hz sine wave at -6dB FS on a digital input trigger
//
// Set Make Parameters in Bela IDE: LDLIBS= -lcsound
// 
// (c) V Lazzarini, 2018

#include <Bela.h>
#include <libraries/csound/csound.h>
#include <string>

// digital input pin
#define PIN 0

struct CsData {
  Csound *csound;
  int bframes;
  int res;
  int frames;
  int state;
};
  
static CsData gCsData;

bool setup(BelaContext *context, void *Data)
{
  Csound *csound;
  int res;
  // simple sinewave instrument
  std::string code = R"orc(
  nchnls = 2;
  ksmps = 32;
  0dbfs = 1;
  instr 1
   a1 linenr p4, 0.01,0.1,0.01
   a2 oscili a1, p5
      outs a2, a2
  endin
  )orc"; 

  // Create a Csound engine
  csound = new Csound();
  csound->SetHostImplementedAudioIO(1,0);
  csound->SetOption("-odac");
  csound->SetOption("--realtime");
  csound->SetOption("--daemon");

  // Compile orc code
  res = csound->CompileOrc(code.c_str());
  if(res == 0) {
    gCsData.res = res;
    gCsData.bframes = csound->GetKsmps();
    gCsData.frames = 0;
    gCsData.state = 0;
    gCsData.csound = csound;
    pinMode(context,0,PIN,0);
    csound->Start();
    return true;
  } else return false;
}

void render(BelaContext *context, void *Data)
{
  if(gCsData.res == 0) {
    int n, i;
    int res = gCsData.res;
    int frames = gCsData.frames;
    int bframes = gCsData.bframes;
    Csound *csound = gCsData.csound;
    MYFLT scal = csound->Get0dBFS();
    MYFLT* audioOut = csound->GetSpout();
    int nchnls = csound->GetNchnls();
    int val, state = gCsData.state;

    // set the number of channels to
    // write to output
    nchnls = nchnls < context->audioOutChannels ?
      nchnls : context->audioOutChannels;
    
    // process 
    for(n = 0; n < context->audioFrames; n++, frames++){

       val = digitalRead(context,n,PIN);
       if(val == 0 && state == 1) {
         // stop instrument 1
         csound->InputMessage("i -1 0 0");
         state = val;
       }
       else if(val == 1 && state == 0) {
         // start instrument 1
         csound->InputMessage("i 1 0 -1 1 440");
         state = val;
       }
      
      // if we run out of frames to output
      // call Csound to process another block
      if(frames == bframes) {
	if((res = csound->PerformKsmps()) == 0)
          frames = 0;
	else break;
      }
      
      // write audio data
      for(i = 0; i < nchnls; i++)
	audioWrite(context, n, i, audioOut[frames*nchnls+i]/scal);
      
    }
    gCsData.res = res;
    gCsData.frames = frames;
  }
}

void cleanup(BelaContext *context, void *Data)
{
  delete gCsData.csound;
}


