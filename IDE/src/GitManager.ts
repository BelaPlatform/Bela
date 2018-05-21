import * as file_manager from './FileManager';
import * as child_process from 'child_process';
import * as paths from './paths';
import {Lock} from './Lock';

const lock: Lock = new Lock();

// simple check to see if a git repo exists in a project
export async function repo_exists(project: string): Promise<boolean>{
	return file_manager.directory_exists(paths.projects+project+'/.git');
}

// execute a git command
// data.command is the command, currentProject is the project
// stdout and stderr are saved onto the data object, or extended if they already exist
export async function execute(data: any): Promise<any> {
	return new Promise( (resolve, reject) => {			
		child_process.exec('git '+data.command, {cwd: paths.projects+data.currentProject+'/'}, (err, stdout, stderr) => {
			if (err) reject(err);
			if (data.stdout){
				data.stdout += stdout ? ('\n' + stdout) : '';
			} else { 
				data.stdout = stdout;
			}
			if (data.stderr){ 
				data.stderr += stderr ? ('\n' + stderr) : '';
			} else { 
				data.stderr = stderr;
			}
			resolve();
		});
	});
}
export var command = execute;

export async function info(data: any){
	data.repoExists = await repo_exists(data.currentProject);
	if (!data.repoExists)
		return;
	let commits: any = {
		currentProject: data.currentProject,
		command: "log --all --pretty=oneline --format='%s, %ar %H' --graph"
	};
	let currentCommit: any = {
		currentProject: data.currentProject,
		command: "log -1 --format='%H'"
	};
	let branches: any = {
		currentProject: data.currentProject,
		command: "branch"
	};
	await execute(commits);
	await execute(currentCommit);
	await execute(branches);
	data.commits = commits.stdout;
	data.currentCommit = currentCommit.stdout;
	data.branches = branches.stdout;
}

export async function init(data: any){
	if (await repo_exists(data.currentProject))
		throw new Error('repo already exists');
	await file_manager.write_file(paths.projects+data.currentProject+'/.gitignore', '.DS_Store\nsettings.json\nbuild/*\n'+data.currentProject);
	data.command = 'init';
	await execute(data);
	data.command = 'add -A';
	await execute(data);
	data.command = 'commit -am "first commit"';
	await execute(data);

}
