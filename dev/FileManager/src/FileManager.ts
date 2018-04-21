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
	async read_directory(dir_path: string): Promise<string[]>{
		return fs.readdirAsync(dir_path);
	}

	// sophisticated file and directory manipulation
	
	// save_file follows vim's strategy to save a file in a crash-proof way
	// it first writes the file to .<file_name>~
	// then it deletes the existing file at <file_name>
	// then it renames .<file_name>~ to <file_name>
	// if a path is given, a lockfile is also created and destroyed
	async save_file(file_name: string, file_content: string, lockfile: string|undefined = undefined){
		if (lockfile)
			await this.write_file(lockfile, file_name);
		await this.write_file('.'+file_name+'~', file_content);
		await this.delete_file(file_name);
		await this.rename_file('.'+file_name+'~', file_name);
		if (lockfile)
			await this.delete_file(lockfile)
	}
}
