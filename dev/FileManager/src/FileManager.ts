import * as fs from 'fs-extra-promise';

export class FileManager {
	constructor(){
		console.log('hi');
	}

	// primitive file and directory manipulation
	async write_file(file_path: string, data: string): Promise<void>{
		return fs.outputFile(file_path, data);
	}
	async read_file(file_path: string): Promise<string>{
		return fs.readFileAsync(file_path, 'utf8');
	}
	async rename_file(src: string, dest: string): Promise<void>{
		return fs.moveAsync(src, dest, {overwrite: true});
	}
	async delete_file(file_path: string): Promise<void>{
		return fs.remove(file_path);
	}
}
