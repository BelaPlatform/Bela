import * as file_manager from './FileManager';
import * as child_process from 'child_process';
import * as paths from './paths';
import {Lock} from './Lock';

const lock: Lock = new Lock();

export async function repo_exists(project: string): Promise<boolean>{
	return file_manager.directory_exists(paths.projects+project+'/.git');
}
