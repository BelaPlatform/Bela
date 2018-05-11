import * as fs from 'fs-extra-promise';
import * as isBinary from 'isbinaryfile';
import * as util from './utils';
import { Lock } from "./Lock";

// FileManager is only available as a single instance accross the app, exported as fm
// it has a private Lock which is always acquired before manipulating the filesystem
// thus concurent access is prohibited
// only the primitive file and directory manipulation methods should touch the lock
// OR the filesystem, in the whole app

var lock: Lock = new Lock();
var save_lock: Lock = new Lock();

function error_handler(e: Error){
	lock.release();
	throw e;
}

// primitive file and directory manipulation
export async function write_file(file_path: string, data: string): Promise<void>{
	await lock.acquire();
	await fs.outputFileAsync(file_path, data)
		.catch( e => error_handler(e) );
	lock.release();
}
export async function read_file(file_path: string): Promise<string> {
	await lock.acquire();
	let out: string = await fs.readFileAsync(file_path, 'utf8')
		.catch( e => {
			error_handler(e);
			return '';
		});
	lock.release();
	return out;
}
export async function read_file_raw(file_path: string): Promise<Buffer>{
	await lock.acquire();
	let out: Buffer = await fs.readFileAsync(file_path)
		.catch( e => {
			error_handler(e);
			return Buffer.alloc(0); 
		});
	lock.release();
	return out;
}
export async function rename_file(src: string, dest: string): Promise<void>{
	await lock.acquire();
	await fs.moveAsync(src, dest, {overwrite: true})
		.catch( e => error_handler(e) );
	lock.release();
}
export async function delete_file(file_path: string): Promise<void>{
	await lock.acquire();
	await fs.removeAsync(file_path)
		.catch( e => error_handler(e) );
	lock.release();
}
export async function read_directory(dir_path: string): Promise<string[]>{
	await lock.acquire();
	let out: string[] = await fs.readdirAsync(dir_path)
		.catch( e => {
			error_handler(e);
			return ['']; 
		});
	lock.release();
	return out;
}
export async function stat_file(file_name: string): Promise<any>{
	await lock.acquire();
	let out: any = await fs.lstatAsync(file_name)
		.catch( e => error_handler(e) );
	lock.release();
	return out;
}
export async function copy_directory(src_path: string, dest_path: string): Promise<void>{
	await lock.acquire();
	await fs.copyAsync(src_path, dest_path)
		.catch( e => error_handler(e) );
	lock.release();
}
// for some reason fs does not have ensureSymLinkAsync or emptyDirAsync
// so promisify them manually
export async function make_symlink(src_path: string, dest_path: string): Promise<any>{
	await lock.acquire();
	return new Promise( (resolve, reject) => {
		fs.ensureSymlink(src_path, dest_path, err => {
			lock.release();
			if (err) reject(err);
			resolve();
		});
	});
}
export async function empty_directory(dir_path: string): Promise<any>{
	await lock.acquire();
	return new Promise( (resolve, reject) => {
	fs.emptyDir(dir_path, err => {
			lock.release();
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
export async function save_file(file_name: string, file_content: string, lockfile: string|undefined = undefined){
	await save_lock.acquire();
	try{
		if (lockfile)
			await write_file(lockfile, file_name);
		await write_file('.'+file_name+'~', file_content);
		await delete_file(file_name);
		await rename_file('.'+file_name+'~', file_name);
		if (lockfile)
			await delete_file(lockfile)
	}
	catch(e){
		save_lock.release();
		throw e;
	}
	save_lock.release();
}
// recursively read the contents of a directory, returning an array of File_Descriptors
export async function deep_read_directory(dir_path: string): Promise<util.File_Descriptor[]>{
	let contents: any = await read_directory(dir_path);
	let output: util.File_Descriptor[] = [];
	for (let name of contents){
		let stat = await stat_file(dir_path+'/'+name);
		let desc: util.File_Descriptor = new util.File_Descriptor(name);
		if (stat.isDirectory())
			desc.children = await deep_read_directory(dir_path+'/'+name);
		else
			desc.size = stat.size;
		output.push(desc);
	}
	return output;
}

// checks if a file is binary - only reads a few thousand bytes at most
// returns a boolean when awaited
export async function is_binary(file_path: string){
	await lock.acquire();
	return new Promise( (resolve, reject) => {
		isBinary(file_path, (err: any, result: any) => {
			lock.release();
			if (err) reject(err);
			resolve(result);
		});
	});
}
export async function read_json(file_path: string): Promise<any> {
	let output: string = await read_file(file_path);
	return JSON.parse(output);
}
export async function write_json(file_path: string, data: any): Promise<void> {
	return write_file(file_path, JSON.stringify(data));
}
export async function directory_exists(dir_path: string): Promise<boolean>{
	let stat: any = await stat_file(dir_path)
		.catch( e => {} );
	return (stat && stat.isDirectory && stat.isDirectory()) ? true : false;
}
export async function file_exists(file_path: string): Promise<boolean>{
	let stat: any = await stat_file(file_path)
		.catch( e => {} );
	return (stat && stat.isFile && stat.isFile()) ? true : false;
}

