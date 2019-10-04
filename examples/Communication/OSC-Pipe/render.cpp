/**
\example OSC-pipe/render.cpp

Open Sound Control
------------------

This example shows an implementation of OSC (Open Sound Control) which was
developed at UC Berkeley Center for New Music and Audio Technology (CNMAT).
It is very similar to Communication/OSC, but it uses a rt-safe pipe to
exchange data between the thread that receives the incoming OSC messages
and the audio thread.

It is designed to run alongside resources/osc/osc.js.
For the example to work, run in a terminal on the board
```
node /root/Bela/resources/osc/osc.js
```

In `setup()` an OSC message is sent to address `/osc-setup`, it then waits
1 second for a reply on `/osc-setup-reply`.

In `render()` the code receives OSC messages, parses them, and sends
back an acknowledgment.

Incoming OSC messages reach the program through the on_receive() callback.
In here, their content is written to a pipe. The pipe is read at the other
end from within render(). Once render() is done with the data, the data
is sent back through the pipe so that it can be deleted in a real-time safe
way.

Unfortunately, the process of creating a OSC message within render() is not
itself real-time safe, but it seems to only cause a problem the first time
render() is run, so it is acceptable.
*/

#include <Bela.h>
#include <libraries/OscSender/OscSender.h>
#include <libraries/OscReceiver/OscReceiver.h>
#include <libraries/Pipe/Pipe.h>

Pipe oscPipe;

OscReceiver oscReceiver;
OscSender oscSender;
int localPort = 7562;
int remotePort = 7563;
const char* remoteIp = "127.0.0.1";

void on_receive(oscpkt::Message* msg, void*)
{
	// we make a copy of the incoming message and we send it down the pipe to the real-time thread
	oscpkt::Message* incomingMsg = new oscpkt::Message(msg);
	oscPipe.writeNonRt(incomingMsg);

	// the real-time thread sends back to us the pointer once it is done with it
	oscpkt::Message* returnedMsg;
	while(oscPipe.readNonRt(returnedMsg) > 0)
	{
		delete returnedMsg;
	}
}

bool setup(BelaContext *context, void *userData)
{
	oscPipe.setup("incomingOsc");
	oscReceiver.setup(localPort, on_receive);
	oscSender.setup(remotePort, remoteIp);

	// the following code sends an OSC message to address /osc-setup
	oscSender.newMessage("/osc-setup").send();

	printf("Waiting for handshake ....\n");
	// we want to stop our program and wait for a new message to come in.
	// therefore, we set the pipe to blocking mode.
	oscPipe.setBlockingNonRt(false);
	oscPipe.setBlockingRt(true);
	oscPipe.setTimeoutMsRt(1000);
	oscpkt::Message* msg = nullptr;
	int ret = oscPipe.readRt(msg);
	bool ok = false;
	if(ret > 0) {
		if(msg && msg->match("/osc-setup-reply"))
		{
			printf("handshake received!\n");
			ok = true;
		}
		delete msg;
	}
	if(!ok) {
		fprintf(stderr, "No handshake received: %d\n", ret);
		return false;
	}
	// in the remainder of the program, we will be calling readRt() from render(), and we want it
	// to return immediately if there are no new messages available. We therefore set the
	// pipe to non-blocking mode
	oscPipe.setBlockingRt(false);

	return true;
}

void render(BelaContext *context, void *userData)
{
	oscpkt::Message* msg;
	// read incoming messages from the pipe
	while(oscPipe.readRt(msg) > 0)
	{
		if(msg && msg->match("/osc-test")){
			int intArg;
			float floatArg;
			msg->arg().popInt32(intArg).popFloat(floatArg).isOkNoMoreArgs();
			rt_printf("received a message with int %i and float %f\n", intArg, floatArg);
			// the call below is not real-time safe, as it may allocate memory. We should not be calling it from here,
			// If you see your mode switches (MSW) increase over time, you should really get it out of here.
			oscSender.newMessage("/osc-acknowledge").add(intArg).add(4.2f).add(std::string("OSC message received")).send();
		}
		oscPipe.writeRt(msg); // return the pointer to the other thread, where it will be destroyed
	}
}

void cleanup(BelaContext *context, void *userData)
{
	oscpkt::Message* returnedMsg;
	// drain the pipes, so that any objects trapped in there can be appropriately destroyed
	while(oscPipe.readRt(returnedMsg) > 0)
	{
		delete returnedMsg;
	}
	while(oscPipe.readNonRt(returnedMsg) > 0)
	{
		delete returnedMsg;
	}
}
