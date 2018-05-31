import * as child_process from 'child_process';
import * as file_manager from './FileManager';
import * as socket_manager from './SocketManager';
import * as processes from './IDEProcesses';
import * as paths from './paths';
import * as util from './utils';
import { Lock } from './Lock';
import * as cpu_monitor from './CPUMonitor';

const lock: Lock = new Lock();

// this function gets called whenever the ace editor is modified
// the file data is saved robustly using a lockfile, and a syntax
// check started if the flag is set
export async function upload(data: any){
	await lock.acquire();
	try{
		await file_manager.save_file(paths.projects+data.currentProject+'/'+data.newFile, data.fileData, paths.lockfile);
		if (data.checkSyntax){
			checkSyntax(data);
		}
	}
	catch(e){
		lock.release();
		throw e;
	}
	lock.release();
}

// this function starts a syntax check
// if a syntax check or build process is in progress they are stopped
// a running program is not stopped
export function checkSyntax(data: any){
	if (processes.syntax.get_status()){
		processes.syntax.stop();
		processes.syntax.queue(() => processes.syntax.start(data.currentProject));
	} else if (processes.build.get_status()){
		processes.build.stop();
		processes.build.queue( () => processes.syntax.start(data.currentProject) );
	} else {
		processes.syntax.start(data.currentProject);
	}
}

// this function is called when the run button is clicked
// if a program is already building or running it is stopped and restarted
// any syntax check in progress is stopped
export function run(data: any){
	if (processes.run.get_status()){
		processes.run.stop();
		processes.run.queue( () => build_run(data.currentProject) );
	} else if (processes.build.get_status()){
		processes.build.stop();
		processes.build.queue( () => build_run(data.currentProject) );
	} else if (processes.syntax.get_status()){
		processes.syntax.stop();
		processes.syntax.queue( () => build_run(data.currentProject) );	
	} else {
		build_run(data.currentProject);
	}
}

// this function starts a build process and when it ends it checks
// if it was stopped by a call to stop() or if there were build errors
// if neither of these are true the project is immediately run
function build_run(project: string){
	processes.build.start(project);
	processes.build.queue( (stderr: string, killed: boolean, code: number) => {
		if (!killed && !code){
			processes.run.start(project); 
		}
	});
}

// this function parses the stderr output of the build process 
// returning true if build errors (not warnings) are found
function build_error(stderr: string): boolean {
	let lines: string[] = stderr.split('\n');
	for (let line of lines){
		let split_line: string[] = line.split(':');
		if (split_line.length >= 4){
			if (split_line[3] === ' error' || split_line[3] === ' fatal error'){
				return true;
			} else if (split_line[3] === ' warning'){
				//console.log('warning');
			}
		}
	}
	return false;
}


// this function is called when the stop button is clicked
// it calls the stop() method of any running process
// if there is no running process, 'make stop' is called
export function stop(){
	let stopped: boolean = false;
	if (processes.run.get_status()){
		processes.run.stop();
		stopped = true;
	}
	if (processes.build.get_status()){
		processes.build.stop();
		stopped = true;
	}
	if (processes.syntax.get_status()){
		processes.syntax.stop();
		stopped = true;
	}
	if (!stopped){
		console.log('make -C '+paths.Bela+' stop');
		child_process.exec('make -C '+paths.Bela+' stop');	
	}
}

function get_status(): util.Process_Status {
	return {
		checkingSyntax	: processes.syntax.get_status(),
		building	: processes.build.get_status(),
		buildProject	: (processes.build.get_status() ? processes.build.project : ''),
		running		: processes.run.get_status(),
		runProject	: (processes.run.get_status() ? processes.run.project : '')
	};
}

// each process emits start and finish events, which are handled here
processes.syntax.on('start', (project: string) => socket_manager.broadcast('status', get_status()) );
processes.syntax.on('finish', (stderr: string) => {
	let status: util.Process_Status = get_status();
	status.syntaxError = stderr;
	socket_manager.broadcast('status', status);
});

processes.build.on('start', (project: string) => socket_manager.broadcast('status', get_status()) );
processes.build.on('finish', (stderr: string, killed: boolean) => {
	let status: util.Process_Status = get_status();
	status.syntaxError = stderr;
	socket_manager.broadcast('status', status);
	if (!killed)
		socket_manager.broadcast('std-warn', stderr);
});
processes.build.on('stdout', (data) => socket_manager.broadcast('status', {buildLog: data}) );

processes.run.on('start', (pid: number, project: string) => {
	socket_manager.broadcast('status', get_status());
	cpu_monitor.start(pid, project, async cpu => {
		socket_manager.broadcast('cpu-usage', {
			bela: await file_manager.read_file(paths.xenomai_stat).catch(e => console.log('error reading xenomai stats', e)),
			belaLinux: cpu
		});
	});
});
processes.run.on('finish', (project: string) => {
	socket_manager.broadcast('status', get_status());
	cpu_monitor.stop();
});
processes.run.on('stdout', (data) => socket_manager.broadcast('status', {belaLog: data}) );
processes.run.on('stderr', (data) => socket_manager.broadcast('status', {belaLogErr: data}) );
