import {paths} from './paths';
import { fm } from "./FileManager";

class ProjectSettings {
	constructor(){}
	async read(project: string): Promise<any> {
		let output: any = await fm.read_json(paths.projects+project+'/settings.json')
			.catch( e => {
				console.log('error reading project '+project+' settings.json', (e.message ? e.message : null));
				console.log('recreating default settings.json');
				return this.write(project, default_project_settings());
			});
		return output;
	}
	async write(project: string, data: any): Promise<any> {
		await fm.write_json(paths.projects+project+'/settings.json', data);
		return data;
	}

}

function default_project_settings(){
	let CLArgs = {
		"-p": "16",		// audio buffer size
		"-C": "8",		// no. analog channels
		"-B": "16",		// no. digital channels
		"-H": "-6",		// headphone level (dB)
		"-N": "1",		// use analog
		"-G": "1",		// use digital
		"-M": "0", 		// mute speaker
		"-D": "0",		// dac level
		"-A": "0", 		// adc level
		"--pga-gain-left": "10",
		"--pga-gain-right": "10",
		"user": '',		// user-defined clargs
		"make": '',		// user-defined Makefile parameters
		"-X": "0",		// multiplexer capelet
		"audioExpander": "0",	// audio expander capelet
		"-Y": "",		// audio expander inputs
		"-Z": ""		// audio expander outputs
	};
	return {
		"fileName"		: "render.cpp",
		CLArgs
	};
}

let p_settings = new ProjectSettings();
export {p_settings};
