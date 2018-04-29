import { fm, File_Descriptor } from "./FileManager";
import { p_settings } from './SettingsManager';
import {paths} from './paths';
import * as readChunk from 'read-chunk';
import * as fileType from 'file-type';

let max_file_size = 50000000;	// bytes (50Mb)

// all ProjectManager methods are async functions called when websocket messages
// with the field event: 'project-event' is received. The function called is 
// contained in the 'func' field. The websocket message is passed into the method
// as the data variable, and is modified and returned by the method, and sent
// back over the websocket
export class ProjectManager {
	constructor(){}

	// openFile takes a message with currentProject and newFile fields
	// it opens the file from the project, if it is not too big or binary
	// if the file is an image or audio file, it is symlinked from the media folder
	async openFile(data: any){
		let file_path = paths.projects+data.currentProject+'/'+data.newFile;
		let file_stat = await fm.stat_file(file_path);
		if (file_stat.size > max_file_size){
			data.error = 'file is too large: '+(file_stat.size/1000000)+'Mb';
			data.fileData = "The IDE can't open non-source files larger than "+(max_file_size/1000000)+"Mb";
			data.readOnly = true;
			data.fileName = data.newFile;
			data.newFile = undefined;
			data.fileType = 0;
			return;
		}
		let chunk: Buffer = await readChunk(file_path, 0, 4100);
		let file_type = await fileType(chunk);
		if (file_type && (file_type.mime.includes('image') || file_type.mime.includes('audio'))){
			await fm.empty_directory(paths.media);
			await fm.make_symlink(file_path, paths.media+data.newFile);
			data.fileData = '';
			data.readOnly = true;
			data.fileName = data.newFile;
			data.newFile = undefined;
			data.fileType = file_type.mime;
			return;
		}
		let is_binary = await fm.is_binary(file_path);
		if (is_binary){
			data.error = 'can\'t open binary files';
			data.fileData = 'Binary files can not be edited in the IDE';
			data.fileName = data.newFile;
			data.newFile = undefined;
			data.readOnly = true;
			data.fileType = 0;
			return;
		}
		data.fileData = await fm.read_file(file_path);
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
	async listProjects(): Promise<string[]>{
		return fm.read_directory(paths.projects);
	}
	async listExamples(): Promise<File_Descriptor[]>{
		return fm.deep_read_directory(paths.examples);
	}

	async openProject(data: any) {
		data.fileList = await fm.deep_read_directory(paths.projects+data.currentProject);
		let settings: any = await p_settings.read(data.currentProject);
		data.newFile = settings.fileName;
		data.CLArgs = settings.CLArgs;
		// TODO: data.exampleName
		// TODO: data.gitData
		await this.openFile(data);
	}

	async openExample(data: any){
		await fm.empty_directory(paths.exampleTempProject);
		await fm.copy_directory(paths.examples+data.currentProject, paths.exampleTempProject);
		data.exampleName = data.currentProject.split('/').pop();
		data.currentProject = 'exampleTempProject';
		await this.openProject(data);
	}

	async newProject(data: any){
		if (await fm.directory_exists(paths.projects+data.newProject)){
			data.error = 'failed, project '+data.newProject+' already exists!';
			return;
		}
		await fm.copy_directory(paths.templates+data.projectType, paths.projects+data.newProject);
		data.projectList = await this.listProjects();
		data.currentProject = data.newProject;
		data.newProject = undefined;
		await this.openProject(data);
	}

	async saveAs(data: any){
		if (await fm.directory_exists(paths.projects+data.newProject)){
			data.error = 'failed, project '+data.newProject+' already exists!';
			return;
		}
		await fm.copy_directory(paths.projects+data.currentProject, paths.projects+data.newProject);
		data.projectList = await this.listProjects();
		data.currentProject = data.newProject;
		data.newProject = undefined;
		await this.openProject(data);
	}

	async deleteProject(data: any){
		await fm.delete_file(paths.projects+data.currentProject);
		data.projectList = await this.listProjects();
		for (let project of data.projectList){
			if (project && project !== 'undefined' && project !== 'exampleTempProject'){
				data.currentProject = project;
				await this.openProject(data);
				return;
			}
		}
		data.currentProject = '';
		data.readOnly = true;
		data.fileData = 'please create a new project to continue';
	}

	async cleanProject(data: any){
		await fm.empty_directory(paths.projects+data.currentProject+'/build');
		await fm.delete_file(paths.projects+data.currentProject+'/'+data.currentProject);
	}

	async newFile(data: any){
		let file_path = paths.projects+data.currentProject+'/'+data.newFile;
		if (await fm.file_exists(file_path)){
			data.error = 'failed, file '+data.newFile+' already exists!';
			return;
		}
		fm.write_file(file_path, '/***** '+data.newFile+' *****/\n');
		data.fileList = await fm.deep_read_directory(paths.projects+data.currentProject);
		data.focus = {'line': 2, 'column': 1};
		await this.openFile(data);
	}

	async uploadFile(data: any){
		let file_path = paths.projects+data.currentProject+'/'+data.newFile;
		let file_exists = (await fm.file_exists(file_path) || await fm.directory_exists(file_path));
		if (file_exists && !data.force){
			data.error = 'failed, file '+data.newFile+' already exists!';
			data.fileData = undefined;
			return;
		}
		await fm.save_file(file_path, data.fileData);
		data.fileList = await fm.deep_read_directory(paths.projects+data.currentProject);
		await this.openFile(data);
	}

	async cleanFile(project: string, file: string){
		if (file.split && file.includes('.')){
			let split_file = file.split('.');
			let ext = split_file.pop();
			let file_root = split_file.join('.');
			if (ext === 'cpp' || ext === 'c' || ext === 'S'){
				let file_path = paths.projects+project+'/build/'+file_root;
				await fm.delete_file(file_path+'.d');
				await fm.delete_file(file_path+'.o');
				await fm.delete_file(paths.projects+project+'/'+project);
			}
		}
	}


}
