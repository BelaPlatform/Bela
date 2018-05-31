import * as file_manager from './FileManager';
import * as project_settings from './ProjectSettings';
import * as child_process from 'child_process';
import * as IDE from './main';
import * as socket_manager from './SocketManager';
import * as paths from './paths';

export async function get_boot_project(): Promise<string> {
	let startup_env: string|undefined = await file_manager.read_file(paths.startup_env)
		.catch(e => console.log('error: no startup_env found') );
	if ((typeof startup_env) === 'undefined') return '*none*';
	let lines = startup_env.split('\n');
	for (let line of lines){
		let split_line: string[] = line.split('=');
		if (split_line[0] === 'ACTIVE' && split_line[1] === '0'){
			return '*none*';
		} else if (split_line[0] === 'PROJECT'){
			let project: string;
			if (split_line[1] === ''){
				project = '*loop*';
			} else {
				project = split_line[1];
			}
			listen_on_boot();
			return project;
		}
	}
}

export async function set_boot_project(socket: SocketIO.Socket, project:  string){
	if (project === '*none*'){
		run_on_boot(socket, [
			'--no-print-directory',
			'-C',
			paths.Bela,
			'nostartup'
		]);
	} else if(project === '*loop*'){
		run_on_boot(socket, [
			'--no-print-directory',
			'-C',
			paths.Bela,
			'startuploop',
			'PROJECT='
		]);
	} else {
		let project_args: {CL: string, make: string[]} = await project_settings.getArgs(project);
		let args: string[] = [
			'--no-print-directory',
			'-C',
			paths.Bela,
			'startuploop',
			'PROJECT='+project,
			'CL='+project_args.CL
		];
		if (project_args.make){
			for (let arg of project_args.make){
				args.push(arg.trim());
			}
		}
		run_on_boot(socket, args);
	}
}

// this function should really use MakeProcess
function run_on_boot(socket: SocketIO.Socket, args: string[]){
	console.log("make '" + args.join("' '") + "'");
	let proc = child_process.spawn('make', args);
	proc.stdout.setEncoding('utf8');
	proc.stdout.on('data', data => socket_manager.broadcast('run-on-boot-log', data));
	proc.stderr.setEncoding('utf8');
	proc.stderr.on('data', data => socket_manager.broadcast('run-on-boot-log', data));
	proc.on('close', (code: number) => {
		if (!code){
			if (args[3] === 'nostartup'){
				socket.emit('run-on-boot-log', 'no project set to run on boot succesfully');
			} else {
				socket.emit('run-on-boot-log', 'project set to run on boot succesfully');
			}
		} else {
			socket.emit('std-warn', 'error setting project to run on boot!');
		}
	});
/*	child_process.exec('make '+args.join(' '), (err, stdout, stderr) => {
		if (err) console.log('error setting boot project', err);
		if (stdout) socket.emit('run-on-boot-log', stdout);
		if (stderr) socket.emit('run-on-boot-log', stderr);
		socket.emit('run-on-boot-log', 'done');
	});
*/
}

async function listen_on_boot(){
	let version: string = await IDE.get_xenomai_version();
	if (!version.includes('2.6')){
		let proc = child_process.spawn('journalctl', ['-fu', 'bela_startup']);
		proc.stdout.setEncoding('utf8');
		proc.stdout.on('data', data => socket_manager.broadcast('run-on-boot-log', data));
		proc.stderr.setEncoding('utf8');
		proc.stderr.on('data', data => socket_manager.broadcast('run-on-boot-log', data));
	}
}
