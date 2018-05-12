import * as express from 'express';
import * as http from 'http';
import * as child_process from 'child_process';
import * as socket_manager from './SocketManager';

// setup webserver to serve files from ~/Bela/IDE/public
const app: express.Application = express();
const server: http.Server = new http.Server(app);
app.use(express.static('public'));

export function init(){
	console.log('starting IDE');

	// start serving the IDE on port 80
	server.listen(80, () => console.log('listening on port', 80) );

	// initialise websocket
	socket_manager.init(server);
}

export function get_xenomai_version(): Promise<string>{
	return new Promise(function(resolve, reject){
		child_process.exec('/usr/xenomai/bin/xeno-config --version', (err, stdout, stderr) => {
			if (err){
				console.log('error reading xenomai version');
				reject(err);
			}
			resolve(stdout);
		});
	});
}
