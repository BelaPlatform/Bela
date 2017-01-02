#include <Bela.h>
#include <OSCServer.h>

OSCServer oscServer;

bool setup(BelaContext *context, void *userData)
{
	oscServer.setup(4368);
	return true;
}

void render(BelaContext *context, void *userData)
{
	while (oscServer.messageWaiting()){
		
		oscpkt::Message msg = oscServer.popMessage();
		
		// rt_printf("received message to: %s\n", msg.addressPattern().c_str());
		
		int intArg;
		float floatArg;
		if (msg.match("/nexus-ui/slider").popInt32(intArg).popFloat(floatArg).isOkNoMoreArgs()){
			rt_printf("slider %i set to value %f\n", intArg, floatArg);
		}
		
	}
	
}

void cleanup(BelaContext *context, void *userData)
{

}