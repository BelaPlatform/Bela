import * as child_process from 'child_process';
import * as file_manager from './FileManager';
import * as socket_manager from './SocketManager';
import * as paths from './paths';
import { MakeProcess } from './MakeProcess';
import { Lock } from './Lock';

const lock: Lock = new Lock();

let syntax_process: MakeProcess = new MakeProcess('syntax');
let build_process: MakeProcess = new MakeProcess('all');
let run_process: MakeProcess = new MakeProcess('runide');

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
	if (syntax_process.get_status()){
		syntax_process.stop();
		syntax_process.queue(() => syntax_process.start(data.currentProject));
	} else if (build_process.get_status()){
		build_process.stop();
		build_process.queue( () => syntax_process.start(data.currentProject) );
	} else {
		syntax_process.start(data.currentProject);
	}
}

// this function is called when the run button is clicked
// if a program is already building or running it is stopped and restarted
// any syntax check in progress is stopped
export function run(data: any){
	if (run_process.get_status()){
		run_process.stop();
		run_process.queue( () => build_run(data.currentProject) );
	} else if (build_process.get_status()){
		build_process.stop();
		build_process.queue( () => build_run(data.currentProject) );
	} else if (syntax_process.get_status()){
		syntax_process.stop();
		syntax_process.queue( () => build_run(data.currentProject) );	
	} else {
		build_run(data.currentProject);
	}
}

// this function starts a build process and when it ends it checks
// if it was stopped by a call to stop() or if there were build errors
// if neither of these are true the project is immediately run
function build_run(project: string){
	build_process.start(project);
	build_process.queue( (stderr: string, killed: boolean) => {
		if (!killed && !build_error(stderr)){
			run_process.start(project); 
		}
	});
}

// this function parses the stderr output of the build process 
// returning true if build errors (not warnings) are found
function build_error(stderr: string): boolean {
	let lines: string[] = stderr.split('\n');
	for (let line of lines){
		let split_line: string[] = line.split(':');
		if (line.length > 4){
			if (line[3] === ' error' || line[3] === ' fatal error'){
				return true;
			} else if (line[3] === ' warning'){
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
	if (run_process.get_status()){
		run_process.stop();
		stopped = true;
	}
	if (build_process.get_status()){
		build_process.stop();
		stopped = true;
	}
	if (syntax_process.get_status()){
		syntax_process.stop();
		stopped = true;
	}
	if (!stopped){
		console.log('make -C '+paths.Bela+' stop');
		child_process.exec('make -C '+paths.Bela+' stop');	
	}
}

function get_status(){
	return {
		checkingSyntax	: syntax_process.get_status(),
		building	: build_process.get_status(),
		buildProject	: (build_process.get_status() ? build_process.project : ''),
		running		: run_process.get_status(),
		runProject	: (run_process.get_status() ? run_process.project : '')
	};
}

// each process emits start and finish events, which are handled here
syntax_process.on('start', (project: string) => socket_manager.broadcast('status', get_status()) );
syntax_process.on('finish', (stderr: string) => {
	let status = get_status();
	status.syntaxError = stderr;
	socket_manager.broadcast('status', status);
});

build_process.on('start', (project: string) => socket_manager.broadcast('status', get_status()) );
build_process.on('finish', (stderr: string) => {
	let status = get_status();
	status.syntaxError = stderr;
	socket_manager.broadcast('status', status);
});
build_process.on('stdout', (data) => socket_manager.broadcast('status', {buildLog: data}) );

run_process.on('start', (project: string) => socket_manager.broadcast('status', get_status()) );
run_process.on('finish', (project: string) => socket_manager.broadcast('status', get_status()) );
run_process.on('stdout', (data) => socket_manager.broadcast('status', {belaLog: data}) );
run_process.on('stderr', (data) => socket_manager.broadcast('status', {belaLogErr: data}) );
