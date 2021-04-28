import * as paths from './paths';
import * as file_manager from "./FileManager";
import { Lock } from "./Lock";

var lock: Lock = new Lock("ProjectSettings");
const maxHp = 8;
const maxInputGains = 8;
	
export async function read(project: string): Promise<any> {
	let output: any = await file_manager.read_json(paths.projects+project+'/settings.json')
		.catch( e => {
			// console.log('error reading project '+project+' settings.json', (e.message ? e.message : null));
			// console.log('recreating default settings.json');
			return write(project, default_project_settings());
		});
	// backwards compatibility: update legacy command lines
	for (let key in output.CLArgs) {
		if (key === '-H') {
			for (let n = 0; n < maxHp; ++n)
				output.CLArgs[`-H${n},`] = output.CLArgs[key];
			delete output.CLArgs[key];
		} else if (key.match(/^--pga-left/)) {
			for (let n = 0; n < maxInputGains; n += 2)
				output.CLArgs[`-I${n},`] = output.CLArgs[key];
			delete output.CLArgs[key];
		} else if (key.match(/^--pga-right/)) {
			for (let n = 1; n < maxInputGains; n += 2)
				output.CLArgs[`-I${n},`] = output.CLArgs[key];
			delete output.CLArgs[key];
		}
	}
	return output;
}
export async function write(project: string, data: any): Promise<any> {
	await file_manager.write_json(paths.projects+project+'/settings.json', data);
	return data;
}
export async function setCLArg(data: any): Promise<any> {
	let newData = data;
	newData.args = [
		{ key: data.key, value: data.value}
	];
	delete newData.key;
	delete newData.value;
	return await setCLArgs(newData);
}
export async function setCLArgs(data: any): Promise<any> {
	lock.acquire();
	try{
		var settings = await read(data.currentProject);
		for (let item of data.args){
			if("undefined" === typeof(settings.CLArgs))
				settings.CLArgs = {};
			settings.CLArgs[item.key] = item.value;
		}
		write(data.currentProject, settings);
	}
	finally{
		lock.release();
	}
	return settings;
}
export async function set_fileName(project: string, fileName: string){
	lock.acquire();
	try{
		let settings = await read(project);
		settings.fileName = fileName;
		write(project, settings);
	}
	finally{
		lock.release();
	}
}
export async function restoreDefaultCLArgs(data: any): Promise<any> {
	lock.acquire();
	try{
		var settings = await read(data.currentProject);
		settings.CLArgs = default_project_settings().CLArgs;
		write(data.currentProject, settings);
	}
	catch(e){
		lock.release();
		throw e;
	}
	lock.release();
	return settings;
}
export async function getArgs(project: any): Promise<{CL: string, make: string[]}> {
	let CLArgs = (await read(project)).CLArgs;
	if(!CLArgs)
		return { CL: "", make: []};
	let CL: string = '';
	for (let key in CLArgs) {
		if (key[0] === '-' && key[1] === '-'){
			if (key === '--disable-led'){
				if (CLArgs[key] === 1)
					CL += key+' ';
			} else {
				CL += key+'='+CLArgs[key]+' ';
			}
		} else if (key === 'user'){
			CL += CLArgs[key]+' ';
		} else if (key !== 'make' && key !== 'audioExpander' && CLArgs[key] !== ''){
			CL += key+CLArgs[key]+' ';
		}
	}
	let make: string[] = []; 
	if (CLArgs.make && CLArgs.make.split){
		make = CLArgs.make.split(';');
	}
	CL = CL.trim();
	return {CL, make};
}


export function default_project_settings(){
	let CLArgs = {
		"-p": "16",		// audio buffer size
		"-C": "8",		// no. analog channels
		"-B": "16",		// no. digital channels
		"-N": "1",		// use analog
		"-G": "1",		// use digital
		"-M": "0", 		// mute speaker
		// headphone level (dB)
		"-H0,": "-6",
		"-H1,": "-6",
		"-H2,": "-6",
		"-H3,": "-6",
		"-H4,": "-6",
		"-H5,": "-6",
		"-H6,": "-6",
		"-H7,": "-6",
		// input gain (dB)
		"-I0,": "10",
		"-I1,": "10",
		"-I2,": "10",
		"-I3,": "10",
		"-I4,": "10",
		"-I5,": "10",
		"-I6,": "10",
		"-I7,": "10",
		"user": '',		// user-defined clargs
		"make": '',		// user-defined Makefile parameters
		"-X": "0",		// multiplexer capelet
		"audioExpander": "0",	// audio expander capelet
		"-Y": "",		// audio expander inputs
		"-Z": "",		// audio expander outputs
		"--disable-led": "0"
	};
	return {
		"fileName"		: "render.cpp",
		CLArgs
	};
}
