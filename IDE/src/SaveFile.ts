import * as file_manager from './FileManager';
import * as path from 'path';
import { Lock } from './Lock';

const lock: Lock = new Lock();

// save_file follows vim's strategy to save a file in a crash-proof way
// it first writes the file to .<file_name>~
// then it deletes the existing file at <file_name>
// then it renames .<file_name>~ to <file_name>
// if a path is given, a lockfile is also created and destroyed
// the lockfile contains the full path of the file being saved
// save_file has its own mutex, so it cannot run concurrently with itself
export async function save_file(file_path: string, file_content: string, lockfile?: string){
	await lock.acquire();
	try{
		const file_name = path.basename(file_path);
		const file_dir = path.dirname(file_path)+'/';
		if (lockfile)
			await file_manager.write_file(lockfile, file_path);
		await file_manager.write_file(file_dir+'.'+file_name+'~', file_content);
		await file_manager.delete_file(file_path);
		await file_manager.rename_file(file_dir+'.'+file_name+'~', file_path);
		if (lockfile)
			await file_manager.delete_file(lockfile);
	}
	finally{
		lock.release();
	}
}
