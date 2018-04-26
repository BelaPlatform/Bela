import * as fs from 'fs-extra-promise';
import * as isBinary from 'isbinaryfile';

export class FileManager {
	constructor(){}

	// primitive file and directory manipulation
	async write_file(file_path: string, data: string): Promise<void>{
		return fs.outputFile(file_path, data);
	}
	async read_file(file_path: string): Promise<string>{
		return fs.readFileAsync(file_path, 'utf8');
	}
	async read_file_raw(file_path: string): Promise<Buffer>{
		return fs.readFileAsync(file_path);
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
	async stat_file(file_name: string): Promise<any>{
		return fs.lstatAsync(file_name);
	}
	async make_symlink(src_path: string, dest_path: string): Promise<any>{
		return new Promise(function(resolve, reject){
			fs.ensureSymlink(src_path, dest_path, function(err){
				if (err) reject(err);
				resolve();
			});
		});
	}
	async empty_directory(dir_path: string): Promise<void>{
		return fs.emptyDir(dir_path);
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

	// recursively read the contents of a directory, returning an array of File_Descriptors
	async deep_read_directory(dir_path: string): Promise<File_Descriptor[]>{
		let contents: string[] = await this.read_directory(dir_path);
		let output: File_Descriptor[] = [];
		for (let name of contents){
			let stat = await this.stat_file(dir_path+'/'+name);
			let desc: File_Descriptor = new File_Descriptor(name);
			if (stat.isDirectory())
				desc.children = await this.deep_read_directory(dir_path+'/'+name);
			else
				desc.size = stat.size;
			output.push(desc);
		}
		return output;
	}
	
	// checks if a file is binary - only reads a few thousand bytes at most
	// returns a boolean when awaited
	async is_binary(file_path: string){
		return new Promise(function(resolve, reject){
			isBinary(file_path, (err: any, result: any) => {
				if (err) reject(err);
				resolve(result);
			});
		});
	}

}

export class File_Descriptor {
	constructor(name: string, size: number|undefined = undefined, children: File_Descriptor[]|undefined = undefined){
		this.name = name;
		this.size = size;
		this.children = children;
	}
	private name: string;
	size: number | undefined = undefined;
	children: File_Descriptor[] | undefined = undefined;
}
