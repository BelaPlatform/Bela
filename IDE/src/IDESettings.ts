import * as file_manager from './FileManager';
import * as paths from './paths';
import { Lock } from './Lock';

var lock: Lock = new Lock();
let cached: boolean = false;
let cached_settings: any;
	
export async function read(): Promise<any> {
	if (cached) return Promise.resolve(cached_settings);
	let output: any = await file_manager.read_json(paths.ide_settings)
		.catch( e => {
			// console.log('error reading IDE settings', (e.message ? e.message : null));
			// console.log('recreating default settings');
			return write(default_IDE_settings());
		});
	cached_settings = output;
	cached = true;
	return output;
}
export async function write(data: any): Promise<any> {
	cached_settings = data;
	cached = true;
	await file_manager.write_json(paths.ide_settings, data);
	return data;
}

export async function setIDESetting(data: any){
	await lock.acquire();
	try{
		var settings = await read();
		settings[data.key] = data.value;
		await write(settings);
	}
	catch(e){
		lock.release();
		throw e;
	}
	lock.release();
	return settings;
}

export async function get_setting(key: string){
	let settings = await read();
	return settings[key];
}

export async function restoreDefaultIDESettings(data: any){
	await lock.acquire();
	try{
		let settings = await read();
		var newSettings = default_IDE_settings();
		newSettings.project = settings.project;
		await write(newSettings);
	}
	catch(e){
		lock.release();
		throw e;
	}
	lock.release();
	return newSettings;
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
