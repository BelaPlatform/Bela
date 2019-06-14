import * as file_manager from './FileManager';
import * as git_manager from './GitManager';
import * as project_settings from './ProjectSettings';
import * as util from './utils';
import * as paths from './paths';
import * as readChunk from 'read-chunk';
import * as fileType from 'file-type';

let max_file_size = 50000000;	// bytes (50Mb)

// all ProjectManager methods are async functions called when websocket messages
// with the field event: 'project-event' is received. The function called is
// contained in the 'func' field. The websocket message is passed into the method
// as the data variable, and is modified and returned by the method, and sent
// back over the websocket

// openFile takes a message with currentProject and newFile fields
// it opens the file from the project, if it is not too big or binary
// if the file is an image or audio file, it is symlinked from the media folder
export async function openFile(data: any){
  let file_path;
  if (typeof data.newFile == 'undefined') {
    data.newFile = data.fileName;
    file_path = paths.projects+data.currentProject+'/'+data.newFile;
  } else {
    file_path = paths.projects+data.currentProject+'/'+data.newFile;
  }
	try{
		var file_stat = await file_manager.stat_file(file_path);
	}
	catch(e){
		// if we are trying to open an example or template and we can't find the file, we are (probably)
		// trying to open a pd or supercollider project, so open _main* if it exists instead
		if (typeof data.exampleName !== 'undefined' || data.func === 'newProject'){
			for(let file of data.fileList){
				if (file.name.includes('_main')){
					data.newFile = file.name;
					await openFile(data);
					return;
				}
			}
		}
		data.error = 'error opening file '+data.newFile+': '+e.toString();
		data.fileData = 'Error opening file. Please open a different file to continue';
		data.fileName = data.newFile;
		data.newFile = undefined;
		data.readOnly = true;
		data.fileType = 0;
		return;
	}
	if (file_stat.size > max_file_size){
		data.error = 'file is too large: '+(file_stat.size/1000000)+'Mb';
		data.fileData = "The IDE can't open files larger than "+(max_file_size/1000000)+"Mb";
		data.readOnly = true;
		data.fileName = data.newFile;
		data.newFile = undefined;
		data.fileType = 0;
		return;
	}
	let chunk: Buffer = await readChunk(file_path, 0, 4100);
	let file_type = await fileType(chunk);
	if (file_type && (file_type.mime.includes('image') || file_type.mime.includes('audio'))){
		await file_manager.empty_directory(paths.media);
		await file_manager.make_symlink(file_path, paths.media+data.newFile);
		data.fileData = '';
		data.readOnly = true;
		data.fileName = data.newFile;
		data.newFile = undefined;
		data.fileType = file_type.mime;
		return;
	}
	let is_binary = await file_manager.is_binary(file_path);
	if (is_binary){
		data.error = 'can\'t open binary files';
		data.fileData = 'Binary files can not be edited in the IDE';
		data.fileName = data.newFile;
		data.newFile = undefined;
		data.readOnly = true;
		data.fileType = 0;
		return;
	}
	try{
		data.fileData = await file_manager.read_file(file_path);
	}
	catch(e){
		data.error = 'error opening file '+data.newFile+': '+e.toString();
		data.fileData = 'Error opening file. Please open a different file to continue';
		data.fileName = data.newFile;
		data.newFile = undefined;
		data.readOnly = true;
		data.fileType = 0;
		return;
	}
	if (data.newFile.split && data.newFile.includes('.')){
		data.fileType = data.newFile.split('.').pop();
	} else {
		data.fileType = 0;
	}
	data.fileName = data.newFile;
	data.newFile = undefined;
	data.readOnly = false;
	return;
}

// these two methods are exceptions and don't take the data object
export async function listProjects(): Promise<string[]>{
	return file_manager.read_directory(paths.projects);
}

export async function listLibraries(): Promise<any>{
	let libraries = [];
	let categories = await file_manager.read_directory(paths.libraries);
	for (let category of categories){
		if (await file_manager.directory_exists(paths.libraries+'/'+category)){
			libraries.push({
				name: category,
				children: await file_manager.read_directory(paths.libraries+'/'+category)
			});
		}
	}
	return libraries;
}

export async function listExamples(): Promise<any>{
	let examples = [];
	let categories = await file_manager.read_directory(paths.examples);
	for (let category of categories){
		if (await file_manager.directory_exists(paths.examples+'/'+category)){
			examples.push({
				name: category,
				children: await file_manager.read_directory(paths.examples+'/'+category)
			});
		}
	}
	return examples;
}

export async function openProject(data: any) {
	data.fileList = await listFiles(data.currentProject);
	let settings: any = await project_settings.read(data.currentProject);
	data.newFile = settings.fileName;
	data.CLArgs = settings.CLArgs;
	if (data.currentProject !== 'exampleTempProject') data.exampleName = '';
	if (!data.gitData)
		data.gitData = {};
	data.gitData.currentProject = data.currentProject;
	await git_manager.info(data.gitData);
	await openFile(data);
}
export async function openExample(data: any){
	await file_manager.empty_directory(paths.exampleTempProject);
	await file_manager.copy_directory(paths.examples+data.currentProject, paths.exampleTempProject);
	data.exampleName = data.currentProject.split('/').pop();
	data.currentProject = 'exampleTempProject';
	await openProject(data);
}
export async function newProject(data: any){
	if (await file_manager.directory_exists(paths.projects+data.newProject)){
		data.error = 'failed, project '+data.newProject+' already exists!';
		return;
	}
	await file_manager.copy_directory(paths.templates+data.projectType, paths.projects+data.newProject);
	data.projectList = await listProjects();
	data.currentProject = data.newProject;
	data.newProject = undefined;
	await openProject(data);
}

export async function saveAs(data: any){
	if (await file_manager.directory_exists(paths.projects+data.newProject)){
		data.error = 'failed, project '+data.newProject+' already exists!';
		return;
	}
	await cleanProject(data);
	await file_manager.copy_directory(paths.projects+data.currentProject, paths.projects+data.newProject);
	data.projectList = await listProjects();
	data.currentProject = data.newProject;
	data.newProject = undefined;
	await openProject(data);
}
export async function deleteProject(data: any){
	await file_manager.delete_file(paths.projects+data.currentProject);
	data.projectList = await listProjects();
	for (let project of data.projectList){
		if (project && project !== 'undefined' && project !== 'exampleTempProject'){
			data.currentProject = project;
			await openProject(data);
			return;
		}
	}
	data.currentProject = '';
	data.readOnly = true;
	data.fileData = 'please create a new project to continue';
}
export async function cleanProject(data: any){
	await file_manager.empty_directory(paths.projects+data.currentProject+'/build');
	await file_manager.delete_file(paths.projects+data.currentProject+'/'+data.currentProject);
}
export async function newFile(data: any){
	let file_path = paths.projects+data.currentProject+'/'+data.newFile;
	if (await file_manager.file_exists(file_path)){
		data.error = 'failed, file '+data.newFile+' already exists!';
		return;
	}
	file_manager.write_file(file_path, '/***** '+data.newFile+' *****/\n');
	data.fileList = await listFiles(data.currentProject);
	data.focus = {'line': 2, 'column': 1};
	await openFile(data);
}
export async function uploadFile(data: any){
	let file_path = paths.projects+data.currentProject+'/'+data.newFile;
	let file_exists = (await file_manager.file_exists(file_path) || await file_manager.directory_exists(file_path));
	if (file_exists && !data.force){
		data.error = 'failed, file '+data.newFile+' already exists!';
		data.fileData = undefined;
		return;
	}
	await file_manager.save_file(file_path, data.fileData);
	data.fileList = await listFiles(data.currentProject);
	await openFile(data);
}
export async function cleanFile(project: string, file: string){
	if (file.split && file.includes('.')){
		let split_file = file.split('.');
		let ext = split_file.pop();
		let file_root = split_file.join('.');
		if (ext === 'cpp' || ext === 'c' || ext === 'S'){
			let file_path = paths.projects+project+'/build/'+file_root;
			await file_manager.delete_file(file_path+'.d');
			await file_manager.delete_file(file_path+'.o');
			await file_manager.delete_file(paths.projects+project+'/'+project);
		}
	}
}
export async function renameFile(data: any){
	let file_path = paths.projects+data.currentProject+'/'+data.newFile;
	let file_exists = (await file_manager.file_exists(file_path) || await file_manager.directory_exists(file_path));
	if (file_exists){
		data.error = 'failed, file '+data.newFile+' already exists!';
		return;
	}
	await file_manager.rename_file(paths.projects+data.currentProject+'/'+data.fileName, file_path);
	await cleanFile(data.currentProject, data.fileName);
	data.fileList = await listFiles(data.currentProject);
	await openFile(data);
}
export async function deleteFile(data: any){
	await file_manager.delete_file(paths.projects+data.currentProject+'/'+data.fileName);
	await cleanFile(data.currentProject, data.fileName);
	data.fileList = await listFiles(data.currentProject);
	data.fileData = 'File deleted - open another file to continue';
	data.fileName = '';
	data.readOnly = true;
}

export async function listFiles(project: string): Promise<util.File_Descriptor[]>{
	return await file_manager.deep_read_directory(paths.projects+project);
}
