import * as express from 'express';
import * as http from 'http';
import * as child_process from 'child_process';
import * as socket_manager from './SocketManager';
import * as paths from './paths';
import * as routes from './RouteManager';
var TerminalManager = require('./TerminalManager');

export function init(){
	console.log('starting IDE');

	// setup webserver 
	const app: express.Application = express();
	const server: http.Server = new http.Server(app);
	setup_routes(app);

	// start serving the IDE on port 80
	server.listen(80, () => console.log('listening on port', 80) );

	// initialise websocket
	socket_manager.init(server);

	TerminalManager.init();
}

function setup_routes(app: express.Application){
	// static paths
	app.use(express.static(paths.webserver_root)); // all files in this directory are served to bela.local/
	app.use('/documentation', express.static(paths.Bela+'Documentation/html'));

	// ajax routes
	// file and project downloads
	app.get('/download', routes.download);
	// doxygen xml
	app.get('/documentation_xml', routes.doxygen);
}

export function get_xenomai_version(): Promise<string>{
	return new Promise(function(resolve, reject){
		child_process.exec('/usr/xenomai/bin/xeno-config --version', (err, stdout, stderr) => {
			if (err){
				console.log('error reading xenomai version');
				reject(err);
			}
			if (stdout.includes('2.6')){
				paths.set_xenomai_stat('/proc/xenomai/stat');
			} else if (stdout.includes('3.0')){
				paths.set_xenomai_stat('/proc/xenomai/sched/stat');
			}
			resolve(stdout);
		});
	});
}

export function set_time(time: string){
	child_process.exec('date -s "'+time+'"', (err, stdout, stderr) => {
		if (err || stderr){
			console.log('error setting time', err, stderr);
		} else {
			console.log('time set to:', stdout);
		}
	});
}

export function shutdown(){
	child_process.exec('shutdown -h now', (err, stdout, stderr) => console.log('shutting down', err, stdout, stderr) );
}

/*process.on('uncaughtException', err => {
	console.log('uncaught exception');
	throw err;
});
process.on('SIGTERM', () => {
	console.log('SIGTERM');
	throw new Error('SIGTERM');
});*/
