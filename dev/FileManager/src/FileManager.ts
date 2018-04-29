import * as fs from 'fs-extra-promise';
import * as isBinary from 'isbinaryfile';
import { Lock } from "./Lock";

// FileManager is only available as a single instance accross the app, exported as fm
// it has a private Lock which is always acquired before manipulating the filesystem
// thus concurent access is prohibited
// only the primitive file and directory manipulation methods should touch the lock
// OR the filesystem, in the whole app

class FileManager {
	private lock: Lock;
	private save_lock: Lock;
	constructor(){
		this.lock = new Lock();
		this.save_lock = new Lock();
	}

	private error_handler(e: Error){
		this.lock.release();
		throw e;
	}

	// primitive file and directory manipulation
	async write_file(file_path: string, data: string): Promise<void>{
		await this.lock.acquire();
		await fs.outputFileAsync(file_path, data)
			.catch( e => this.error_handler(e) );
		this.lock.release();
	}
	async read_file(file_path: string): Promise<string> {
		await this.lock.acquire();
		let out: string = await fs.readFileAsync(file_path, 'utf8')
			.catch( e => {
				this.error_handler(e);
				return '';
			});
		this.lock.release();
		return out;
	}
	async read_file_raw(file_path: string): Promise<Buffer>{
		await this.lock.acquire();
		let out: Buffer = await fs.readFileAsync(file_path)
			.catch( e => {
				this.error_handler(e);
				return Buffer.alloc(0); 
			});
		this.lock.release();
		return out;
	}
	async rename_file(src: string, dest: string): Promise<void>{
		await this.lock.acquire();
		await fs.moveAsync(src, dest, {overwrite: true})
			.catch( e => this.error_handler(e) );
		this.lock.release();
	}
	async delete_file(file_path: string): Promise<void>{
		await this.lock.acquire();
		await fs.removeAsync(file_path)
			.catch( e => this.error_handler(e) );
		this.lock.release();
	}
	async read_directory(dir_path: string): Promise<string[]>{
		await this.lock.acquire();
		let out: string[] = await fs.readdirAsync(dir_path)
			.catch( e => {
				this.error_handler(e);
				return ['']; 
			});
		this.lock.release();
		return out;
	}
	async stat_file(file_name: string): Promise<any>{
		await this.lock.acquire();
		let out: any = await fs.lstatAsync(file_name)
			.catch( e => this.error_handler(e) );
		this.lock.release();
		return out;
	}
	async copy_directory(src_path: string, dest_path: string): Promise<void>{
		await this.lock.acquire();
		await fs.copyAsync(src_path, dest_path)
			.catch( e => this.error_handler(e) );
		this.lock.release();
	}
	// for some reason fs does not have ensureSymLinkAsync or emptyDirAsync
	// so promisify them manually
	async make_symlink(src_path: string, dest_path: string): Promise<any>{
		await this.lock.acquire();
		return new Promise( (resolve, reject) => {
			fs.ensureSymlink(src_path, dest_path, err => {
				this.lock.release();
				if (err) reject(err);
				resolve();
			});
		});
	}
	async empty_directory(dir_path: string): Promise<any>{
		await this.lock.acquire();
		return new Promise( (resolve, reject) => {
			fs.emptyDir(dir_path, err => {
				this.lock.release();
				if (err) reject(err);
				resolve();
			});
		});
	}

	// sophisticated file and directory manipulation
	
	// save_file follows vim's strategy to save a file in a crash-proof way
	// it first writes the file to .<file_name>~
	// then it deletes the existing file at <file_name>
	// then it renames .<file_name>~ to <file_name>
	// if a path is given, a lockfile is also created and destroyed
	// save_file has its own mutex, so it cannot run concurrently with itself
	async save_file(file_name: string, file_content: string, lockfile: string|undefined = undefined){
		await this.save_lock.acquire();
		try{
			if (lockfile)
				await this.write_file(lockfile, file_name);
			await this.write_file('.'+file_name+'~', file_content);
			await this.delete_file(file_name);
			await this.rename_file('.'+file_name+'~', file_name);
			if (lockfile)
				await this.delete_file(lockfile)
		}
		catch(e){
			this.save_lock.release();
			throw e;
		}
		this.save_lock.release();
	}

	// recursively read the contents of a directory, returning an array of File_Descriptors
	async deep_read_directory(dir_path: string): Promise<File_Descriptor[]>{
		let contents: any = await this.read_directory(dir_path);
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
		await this.lock.acquire();
		return new Promise( (resolve, reject) => {
			isBinary(file_path, (err: any, result: any) => {
				this.lock.release();
				if (err) reject(err);
				resolve(result);
			});
		});
	}

	async read_json(file_path: string): Promise<any> {
		let output: string = await this.read_file(file_path);
		return JSON.parse(output);
	}
	async write_json(file_path: string, data: any): Promise<void> {
		return this.write_file(file_path, JSON.stringify(data));
	}

	async directory_exists(dir_path: string): Promise<boolean>{
		let stat: any = await this.stat_file(dir_path)
			.catch( e => {} );
		return (stat && stat.isDirectory && stat.isDirectory()) ? true : false;
	}
	async file_exists(file_path: string): Promise<boolean>{
		let stat: any = await this.stat_file(file_path)
			.catch( e => {} );
		return (stat && stat.isFile && stat.isFile()) ? true : false;
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

let fm = new FileManager();
export {fm};
