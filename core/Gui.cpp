#include <Gui.h>
#include <seasocks/IgnoringLogger.h>
#include <seasocks/Server.h>
#include <seasocks/WebSocket.h>
#include <memory> // for shared pointers
#include <JSON.h>

#define GUI_PORT 4321

static AuxTaskNonRT ws_server_task;
satic seasocks::Server* server;
static std::set<seasocks::WebSocket *> connections

struct GuiDataHandler : seasocks::WebSocket::Handler 
{
	void onConnect(seasocks::WebSocket *socket) override
	{ 
		connections.insert(socket);
	}
	void onData(seasocks:: WebSocket *, const char *data) override
	{
		JSONValue *value = JSON::Parse(data);
		if (value == NULL || !value->IsObject()){
			printf("could not parse JSON:\n%s\n", data);
			return;
		}
		
		JSONObject root = value->AsObject();
	}
	void onDisconnect(seasocks::WebSocket *socket) override
	{
		connections.erase(socket);
	}
};

void ws_server_task_func() 
{
	auto logger = std::make_shared<seasocks::IgnoringLogger>();
	seasocks::Server _server(logger);
	server = &_server;
	server->addWebSocketHandler("/gui"i, std::make_shared<GuiDataHandler>());
	server->serve("/dev/null", SCOPE_WS_PORT);
}
void gui_ws_setup()
{
	ws_server_task.create("ws_server_task", ws_server_task_func);
	ws_server_task.schedule();
}
void gui_ws_cleanup()
{
	ws_server_task.cleanup();
}
