import * as fs from 'fs-extra-promise';
import * as isBinary from 'isbinaryfile';
import * as util from './utils';
import { Lock } from "./Lock";

// FileManager is only available as a single instance accross the app, exported as fm
// it has a private Lock which is always acquired before manipulating the filesystem
// thus concurent access is prohibited
// only the primitive file and directory manipulation methods should touch the lock
// OR the filesystem, in the whole app

const lock: Lock = new Lock();

async function commit(path: string)
{
	let fd = await fs.openAsync(path, 'r');
	await fs.fsyncAsync(fd);
	await fs.closeAsync(fd);
}
async function commit_folder(path: string)
{
	await commit(path);
	let list = await deep_read_directory(path);
	for(let file_path of list)
		await commit(path+"/"+file_path.name);
}
// primitive file and directory manipulation
export async function write_file(file_path: string, data: string): Promise<void>{
	await lock.acquire();
	try{
		await fs.outputFileAsync(file_path, data);
		await commit(file_path);
	}
	finally{
		lock.release();
	}
}
export async function write_folder(file_path: string): Promise<void>{
  console.log(file_path);
	await lock.acquire();
	try{
		await fs.mkdirSync(file_path);
		await commit(file_path);
	}
	finally{
		lock.release();
	}
}
export async function read_file(file_path: string): Promise<string> {
	await lock.acquire();
	let out: string;
	try{
		out = await fs.readFileAsync(file_path, 'utf8');
	}
	finally{
		lock.release();
	}
	return out;
}
export async function read_file_raw(file_path: string): Promise<Buffer>{
	await lock.acquire();
	let out: Buffer;
	try{
		out = await fs.readFileAsync(file_path);
	}
	finally{
		lock.release();
	}
	return out;
}
export async function rename_file(src: string, dest: string): Promise<void>{
	await lock.acquire();
	try{
		await fs.moveAsync(src, dest, {overwrite: true});
		await commit(dest);
	}
	finally{
		lock.release();
	}
}
export async function delete_file(file_path: string): Promise<void>{
	await lock.acquire();
	try{
		await fs.removeAsync(file_path);
	}
	finally{
		lock.release();
	}
}
export async function read_directory(dir_path: string): Promise<string[]>{
	await lock.acquire();
	let out: string[];
	try{
		out = await fs.readdirAsync(dir_path);
		out.sort(function(a, b) {
			return a.toLowerCase().localeCompare(b.toLowerCase());
		});
	}
	finally{
		lock.release();
	}
	return out;
}
export async function stat_file(file_name: string): Promise<any>{
	await lock.acquire();
	let out: any;
	try{
		out = await fs.lstatAsync(file_name);
	}
	finally{
		lock.release();
	}
	return out;
}
export async function copy_directory(src_path: string, dest_path: string): Promise<void>{
	await lock.acquire();
	try{
		await fs.copyAsync(src_path, dest_path);
	}
	finally{
		lock.release();
	}
	// TODO: this would normally be in the finally(), however it cannot be
	// within lock-guarded section because (for unclear reasons) read_directory
	// (whcih is called under the hood by commit_folder() ) also needs the lock.
	await commit_folder(dest_path);
}
export async function copy_file(src_path: string, dest_path: string): Promise<void>{
	return copy_directory(src_path, dest_path);
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
export {save_file as save_file} from './SaveFile';

// recursively read the contents of a directory, returning an array of File_Descriptors
export async function deep_read_directory(dir_path: string): Promise<util.File_Descriptor[]>{
	let contents: any = await read_directory(dir_path);
	let output: util.File_Descriptor[] = [];
	for (let name of contents){
		const original_path = dir_path+'/'+name;
		let path = original_path;
		let stat = await stat_file(path);
		// follow symlinks (with a maximum limit)
		const maxLevels = 100;
		let levels = 0;
		while(stat.isSymbolicLink()) {
			path = await fs.readlinkAsync(path);
			if('/' != path[0])
				path = dir_path+'/'+path;
			stat = await stat_file(path);
			++levels;
			if(maxLevels <= levels) {
				break;
			}
		}
		if(maxLevels <= levels) {
			console.error('Unable to properly stat %s: too many symlinks to follow(%d)', original_path, levels);
			path = original_path;
		}
		let desc: util.File_Descriptor = new util.File_Descriptor(name);
		if (stat.isDirectory())
			desc.children = await deep_read_directory(path);
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
	// the "/" ensure return stat.isDirectory() is "true" for symlinks to directories
	let stat: any = await stat_file(dir_path+"/")
		.catch( e => {} );
	return (stat && stat.isDirectory && stat.isDirectory()) ? true : false;
}
export async function file_exists(file_path: string): Promise<boolean>{
	let stat: any = await stat_file(file_path)
		.catch( e => {} );
	return (stat && stat.isFile && stat.isFile()) ? true : false;
}
export async function delete_matching_recursive(path: string, matches: Array<string>) {
	// maybe `find path -name=i$match -exec rm {}\;` could be faster?
	let all: any = await read_directory(path);
	let contents: Array<string> = await read_directory(path);
	let matching: Array<string> = contents.filter((file) => {
		let matching = matches.filter((match) => { return match === file; });
		return matching.length > 0;
	});
	let updated: boolean = false;
	for(let match of matching) {
		let full_path = path+'/'+match;
		await delete_file(full_path);
		updated = true;
	}
	// re-read once updated
	if(updated)
		contents = await read_directory(path);
	for(let file of contents) {
		let full_path = path+'/'+file;
		let stat = await stat_file(full_path);
		if(stat.isDirectory()) {
			delete_matching_recursive(full_path, matches);
		}
	}
}
