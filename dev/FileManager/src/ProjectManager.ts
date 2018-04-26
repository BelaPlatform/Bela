import { FileManager, File_Descriptor } from "./FileManager";
import {paths} from './paths';
import * as readChunk from 'read-chunk';
import * as fileType from 'file-type';

var fm: FileManager = new FileManager();

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
			return data;
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
			return data;
		}
		let is_binary = await fm.is_binary(file_path);
		if (is_binary){
			data.error = 'can\'t open binary files';
			data.fileData = 'Binary files can not be edited in the IDE';
			data.fileName = data.newFile;
			data.newFile = undefined;
			data.readOnly = true;
			data.fileType = 0;
			return data;
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
		return data;
	}

	async listProjects(data: any){
		data.projectList = await fm.read_directory(paths.projects);
		return data;
	}

}
