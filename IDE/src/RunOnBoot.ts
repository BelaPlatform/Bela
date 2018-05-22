import * as file_manager from './FileManager';
import * as project_settings from './ProjectSettings';
import * as child_process from 'child_process';
import * as paths from './paths';

export async function get_boot_project(): Promise<string> {
	let startup_env: string|undefined = await file_manager.read_file(paths.startup_env)
		.catch(e => console.log('error: no startup_env found') );
	if ((typeof startup_env) === 'undefined') return 'none';
	let lines = startup_env.split('\n');
	for (let line of lines){
		let split_line: string[] = line.split('=');
		if (split_line[0] === 'ACTIVE' && split_line[1] === '0'){
			return 'none';
		} else if (split_line[0] === 'PROJECT'){
			listen_on_boot();
			return split_line[1];
		}
	}
}

export async function set_boot_project(socket: SocketIO.Socket, project:  string){
	if (project === 'none'){
		run_on_boot(socket, [
			'--no-print-directory',
			'-C',
			paths.Bela,
			'nostartup'
		]);
	} else {
		let args: {CL: string, make: string} = await project_settings.getArgs(project);
		run_on_boot(socket, [
			'--no-print-directory',
			'-C',
			paths.Bela,
			'startuploop',
			'PROJECT='+project,
			'CL="'+args.CL+'"',
			args.make
		]);
	}
}

function run_on_boot(socket: SocketIO.Socket, args: string[]){
	console.log('make '+args.join(' '));
	child_process.exec('make '+args.join(' '), (err, stdout, stderr) => {
		if (err) console.log('error setting boot project', err);
		if (stdout) socket.emit('run-on-boot-log', stdout);
		if (stderr) socket.emit('run-on-boot-log', stderr);
		socket.emit('run-on-boot-log', 'done');
	});
}

function listen_on_boot(){

}
