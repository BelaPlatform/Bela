import * as file_manager from './FileManager';
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

function listen_on_boot(){

}
