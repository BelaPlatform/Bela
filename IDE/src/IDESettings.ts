import * as file_manager from './FileManager';
import * as paths from './paths';
import { Lock } from './Lock';

var lock: Lock = new Lock();
	
export async function read(): Promise<any> {
	let output: any = await file_manager.read_json(paths.ide_settings)
		.catch( e => {
			// console.log('error reading IDE settings', (e.message ? e.message : null));
			// console.log('recreating default settings');
			return write(default_IDE_settings());
		});
	return output;
}
export async function write(data: any): Promise<any> {
	await file_manager.write_json(paths.ide_settings, data);
	return data;
}

export async function set_setting(key: string, value: string){
	lock.acquire();
	try{
		let settings = await read();
		settings[key] = value;
		await write(settings);
	}
	catch(e){
		lock.release();
		throw e;
	}
	lock.release();
}

function default_IDE_settings(){
	return {
		'project'		: 'basic',
		'liveAutocompletion'	: 1,
		'liveSyntaxChecking'	: 1,
		'verboseErrors'		: 0,
		'cpuMonitoring'		: 1,
		'cpuMonitoringVerbose'	: 0,
		'consoleDelete'		: 0,
		'viewHiddenFiles'	: 0
	};
}
