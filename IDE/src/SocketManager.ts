import * as io from 'socket.io';
import * as http from 'http';
import * as project_manager from './ProjectManager';

// all connected sockets
let ide_sockets: SocketIO.Namespace;

export function init(server: http.Server){
	ide_sockets = io(server).of('/IDE');
	ide_sockets.on('connection', connection);
}

function connection(socket: SocketIO.Socket){
	init_message(socket);
}

/*async function init_message(socket: SocketIO.Socket){
	let message: Init_Message;
	message.projects = await project_manager.listProjects();
	message.examples = await project_manager.listExamples();
//	message.settings = await ide_settings.read();
//	message.boot_project = await IDE.boot_project();
//	message.xenomai_version = await IDE.xenomai_version();
//	message.status = await process_manager.status();
	console.log('init message');
	console.dir(message, {depth:null});
	socket.emit('init', message);
}*/
