import * as io from 'socket.io';
import * as http from 'http';
import * as IDE from './main';
import * as project_manager from './ProjectManager';
import * as ide_settings from './IDESettings';
import * as boot_project from './RunOnBoot';
import * as util from './utils';

// all connected sockets
let ide_sockets: SocketIO.Namespace;

export function init(server: http.Server){
	ide_sockets = io(server).of('/IDE');
	ide_sockets.on('connection', connection);
}

function connection(socket: SocketIO.Socket){
	init_message(socket);
	socket.on('set-time', IDE.set_time);
}

async function init_message(socket: SocketIO.Socket){
	console.log('constructing');
	let message: util.Init_Message = {
		projects : await project_manager.listProjects(),
		examples : await project_manager.listExamples(),
		settings : await ide_settings.read(),
		boot_project : await boot_project.get_boot_project(),
		xenomai_version : await IDE.get_xenomai_version()
//	status : await process_manager.status()
	};
	console.log('done');
//	console.dir(message, {depth:null});
	socket.emit('init', message);
}
