import * as child_process from 'child_process';
import * as Event_Emitter from 'events';
import * as paths from './paths';
import * as project_settings from './ProjectSettings';
import { Lock } from './Lock';

export class MakeProcess extends Event_Emitter{
	private proc: child_process.ChildProcess;
	private make_target: string;
	project: string;
	private stderr: string;
	private active: boolean = false;
	private killed: boolean = false;
	private callback_queued: boolean = false;
	private queue_callback: (stderr: string, killed: boolean, code: number) => void;
	private return_code: number;

	constructor(make_target: string){
		super();
		this.make_target = make_target;
	}

	async start(project: string){
		this.active = true;
		this.project = project;
		this.stderr = '';
		this.killed = false;
		let project_args: {CL:string, make:string[]} = await project_settings.getArgs(project);
		let args: string[] = [
			'--no-print-directory',
			'-C',
			paths.Bela,
			this.make_target,
			'PROJECT='+project,
			'CL='+project_args.CL
		];
		if (project_args.make){
			for (let arg of project_args.make){
				arg = arg.trim();
				if (arg.length > 0)
					args.push(arg);
			}
		}
		console.log("make '" + args.join("' '") + "'");
		this.proc = child_process.spawn('make', args, {detached: true});
		this.emit('start', this.proc.pid, project);
		this.proc.stdout.setEncoding('utf-8');
		this.proc.stderr.setEncoding('utf-8');
		this.proc.stdout.on('data', (data: string) => {
			this.emit('stdout', data);
		});
		this.proc.stderr.on('data', (data: string) => {
			this.stderr += data;
			this.emit('stderr', data);
		});
		// this.proc.on('exit', () => this.emit('exit') );
		this.proc.on('close', (code: number, signal: string) => {
			this.active = false;
			this.return_code = code;
			this.emit('finish', this.stderr, this.killed, code);
			this.dequeue();
		});
	}

	stop(){
		if (this.active && !this.killed && this.proc.pid){
			this.killed = true;
			// console.log('killing');
			try{
				process.kill(-this.proc.pid);
			}
			catch(e){
				// console.log('could not kill make', this.make_target, ':', e.code);
			}
		}
	}

	get_status(): boolean {
		return this.active;
	}

	queue(queue_callback: (stderr: string, killed: boolean, code: number) => void ){
		// console.log('queueing', this.make_target);
		this.queue_callback = queue_callback;
		this.callback_queued = true;
	}

	private dequeue(){
		if (this.callback_queued){
			// console.log('dequeueing', this.make_target);
			this.callback_queued = false;
			this.queue_callback(this.stderr, this.killed, this.return_code);
		}
	}

	// this function returns the linux-domain cpu usage of all child processes
	// it works for all three make processes but is very expensive
	// CPUMonitor only works for the run process, but is more efficient
	/*async CPU(): Promise<any>{
		if (!this.get_status() || !this.proc.pid) return '0';
		let pids = await pidtree(this.proc.pid, {root: true});
		let out = await pidusage(pids);
		let cpu = 0;
		for (let pid of pids){
			cpu += out[pid].cpu;
		}
		return cpu;
	}*/
}
