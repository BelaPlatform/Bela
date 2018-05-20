import * as io from 'socket.io';
import * as http from 'http';
import * as IDE from './main';
import * as project_manager from './ProjectManager';
import * as process_manager from './ProcessManager';
import * as project_settings from './ProjectSettings';
import * as ide_settings from './IDESettings';
import * as boot_project from './RunOnBoot';
import * as util from './utils';

//remove this
import * as Make from './MakeProcess';
let make = new Make.MakeProcess('syntax');

// all connected sockets
let ide_sockets: SocketIO.Namespace;

export function init(server: http.Server){
	ide_sockets = io(server, {
		pingInterval: 3000,
		pingTimeout: 6500
	}).of('/IDE');
	ide_sockets.on('connection', connection);
}

export function broadcast(event: string, message: any){
	// console.log('broadcasting', event, message);
	if (ide_sockets) ide_sockets.emit(event, message);
}

function connection(socket: SocketIO.Socket){
	socket.on('set-time', IDE.set_time);
	socket.on('project-event', (data: any) => project_event(socket, data) );
	socket.on('project-settings', (data: any) => project_settings_event(socket, data) );
	socket.on('process-event', (data: any) => process_event(socket, data) );
	socket.on('IDE-settings', (data: any) => ide_settings_event(socket, data) );
	init_message(socket);
}

async function init_message(socket: SocketIO.Socket){
	let message: util.Init_Message = {
		projects : await project_manager.listProjects(),
		examples : await project_manager.listExamples(),
		settings : await ide_settings.read(),
		boot_project : await boot_project.get_boot_project(),
		xenomai_version : await IDE.get_xenomai_version()
//	status : await process_manager.status()
	};
	socket.emit('init', message);
}

// Process all websocket events which need to be handled by the ProjectManager
async function project_event(socket: SocketIO.Socket, data: any){
//	console.log('project-event');
//	console.dir(data);
	// reject any malformed websocket message
	if ((!data.currentProject && !data.newProject) || !data.func || !(project_manager as any)[data.func]) {
		console.log('bad project-event');
		console.dir(data, {depth:null});
		return;
	}
	// call the project_manager function specified in the func field of the ws message
	await (project_manager as any)[data.func](data)
		.catch( (e: Error) => {
			// in the event of an error, log it to the IDE console
			// and send a string back to the browser for display to the user
			console.log('project-event error:');
			console.log(e);
			data.error = e.toString();
			socket.emit('project-data', data);
		});
//	console.dir(data);
	// after a succesful operation, send the data back
	socket.emit('project-data', data);
	if (data.currentProject){
		// save the current project in the IDE settings
		ide_settings.setIDESetting({key: 'project', value: data.currentProject});
		// if a fileList was created, send it to other tabs
		if (data.fileList)
			socket.broadcast.emit('file-list', data.currentProject, data.fileList);
		// if a projectList was created, send it to other tabs
		if (data.projectList)
			socket.broadcast.emit('project-list', data.currentProject, data.projectList);
	}
}

async function project_settings_event(socket: SocketIO.Socket, data: any){
//	console.log('project_settings')
//	console.dir(data);
	if (!data.currentProject || !data.func || !(project_settings as any)[data.func]) {
		console.log('bad project-settings', data);
		return;
	}
	let settings = await (project_settings as any)[data.func](data)
		.catch( (e: Error) => {
			console.log('project-settings error');
			console.log(e);
			socket.emit('report-error', e.toString());
		});
//	console.log('project_settings')
//	console.dir(settings);
	if (data.func === 'setCLArg'){
		socket.broadcast.emit('project-settings-data', data.currentProject, settings);
	} else {
		ide_sockets.emit('project-settings-data', data.currentProject, settings);
	}
}

async function process_event(socket: SocketIO.Socket, data: any){
	if (!data || !data.currentProject || !data.event || !(process_manager as any)[data.event]){
		console.log('bad process-event', data);
		return;
	}
	await (process_manager as any)[data.event](data);
}

async function ide_settings_event(socket: SocketIO.Socket, data: any){
	if (!data || !data.func || !(ide_settings as any)[data.func]){
		console.log('bad ide_settings event', data);
		return;
	}
	let result = await (ide_settings as any)[data.func](data)
		.catch( (e: Error) => console.log('ide_settings error', e) );
	broadcast('IDE-settings-data', result);
}
