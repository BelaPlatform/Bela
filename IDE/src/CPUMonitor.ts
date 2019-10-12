import * as child_process from 'child_process';
import * as pidtree from 'pidtree';
import * as ide_settings from './IDESettings';

// this module monitors the linux-domain CPU usage of a running bela process
// once it has found the correct pid it calls the callback passed to start()
// every second with the cpu usage as a parameter

let name: string;
let timeout: NodeJS.Timer;
let found_pid: boolean;
let root_pid: number;
let main_pid: number;
let callback: (cpu: any) => void;
let stopped: boolean;
let find_pid_count: number;

export function start(pid: number, project: string, cb: (cpu: any)=>void){
	root_pid = pid;
	// the process name gets cut off at 15 chars
	if(typeof(project) === "object") {
		project = project.join("");
	} else if (typeof(project) !== "string") {
		project = "";
	}
	name = project.substring(0, 15) || project[0].substring(0, 15);
	callback = cb;
	stopped = false;
	found_pid = false;
	find_pid_count = 0;
	timeout = setTimeout( () => timeout_func(), 1000);
}

export function stop(){
	if (timeout) clearTimeout(timeout);
	stopped = true;
}

// this function keeps trying every second to find the correct pid
// once it has, it uses ps to get the cpu usage, and calls the callback
async function timeout_func(){
	if (!(await ide_settings.get_setting('cpuMonitoring')))
		return;
	let cpu: any = '0';
	try{
		if (!found_pid){
			if (find_pid_count++ < 3){
				await find_pid();
			}
		} else {
			cpu = await getCPU();
		}
	}
	catch(e){
		console.log('Failed to get CPU usage'); 
		found_pid = false;
	}
	finally{
		if(!stopped){
			callback(cpu);
			timeout = setTimeout(timeout_func, 1000);
		}
	}
}

async function find_pid(){
	// use pidtree to find all the child pids of the root process
	let pids = await pidtree(root_pid, {root: true});
	// look through the pids to see if any of them belong to a process with the right name
	for (let pid of pids){
		let test_name = (await name_from_pid(pid) as string).trim();
		if (test_name === name){
			main_pid = pid;
			found_pid = true;
		}
	}
}

// returns the name of the process corresponding to the pid passed in to it
function name_from_pid(pid: number){
	return new Promise((resolve, reject) => {
		child_process.exec('ps -p '+pid+' -o comm=', (err, stdout) => {
			if (err) reject(err);
			resolve(stdout);
		});
	});
}

function getCPU(){
	return new Promise((resolve, reject) => {
		child_process.exec('ps -p '+main_pid+' -o %cpu --no-headers', (err, stdout) => {
			if (err) reject(err);
			resolve(stdout);
		});
	});
}
