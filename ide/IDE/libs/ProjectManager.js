'use strict';
// node modules
var Promise = require('bluebird');
var fs = Promise.promisifyAll(require('fs-extra'));
var fileType = require('file-type');
var isBinaryFile = require("isbinaryfile");
var exec = require('child_process').exec;
var path = require('path');

var git = require('./GitManager');

// private variables
// paths
var belaPath = '/root/Bela/';
var projectPath = belaPath+'projects/';
var examplePath = belaPath+'examples/';
var templatePath = belaPath+'IDE/templates/';
var mediaPath = belaPath+'IDE/public/media/';

//files
var blockedFiles = ['build', 'settings.json', '.DS_Store'];
var exampleTempProject = 'exampleTempProject';
var sourceIndeces = ['cpp', 'c', 'S'];
var headerIndeces = ['h', 'hh', 'hpp'];
var resourceIndeces = ['pd', 'txt', 'json', 'xml'];
//var editableExtensions = [...sourceIndeces, ...headerIndeces, ...resourceIndeces];
var editableExtensions = sourceIndeces.concat(headerIndeces, resourceIndeces);

var resourceData = 'This file type cannot be viewed in the IDE';
var maxFileSize = 50000000;	// bytes (50Mb)

// public functions
module.exports = {
	
	// returns array of project names
	listProjects: function(){
		return fs.readdirAsync(projectPath)
			.catch((err) => console.error(err));
	},
	*listExamples(){
		var examples = [];
		var categories = yield fs.readdirAsync(examplePath);
		for (let category of categories){
			if (yield fs.statAsync(examplePath+category).then( stat => stat.isDirectory() )){
				examples.push({
					name		: category,
					children	: yield fs.readdirAsync(examplePath + category)
				});
			}
		}
		return examples;
	},

	// functions called directly over websocket
	// project & example events
	*openProject(data){
		try {
			data.fileList = yield new Promise.coroutine(listFiles)(projectPath+data.currentProject);
			var settings = yield _getSettings(data.currentProject);
			for (let key in settings){
				data[key] = settings[key];
			}
			if (data.currentProject !== exampleTempProject) data.exampleName = '';
			if (!data.gitData) data.gitData = {};
			data.gitData.currentProject = data.currentProject;
			data.gitData = yield _co(git, 'info', data.gitData);
		}
		catch(e){
			data.error = 'failed, could not open project '+data.currentProject;
			console.log(e.toString());
			return data;
		}
		return yield _co(this, 'openFile', data);
	},
	
	*openExample(data){
		yield fs.emptyDirAsync(projectPath+exampleTempProject);
		yield fs.copyAsync(examplePath+data.currentProject, projectPath+exampleTempProject);
		data.exampleName = data.currentProject.split('/').pop();
		data.currentProject = exampleTempProject;
		return yield _co(this, 'openProject', data);
	},
	
	*newProject(data){
	
		// if the project already exists, reject the request
		if (yield dirExists(projectPath+data.newProject)){
			data.error = 'failed, project '+data.newProject+' already exists!';
			return data;
		}
	console.log('hi', templatePath + (data.projectType || 'C'));
		yield fs.copyAsync(templatePath + (data.projectType || 'C'), projectPath+data.newProject, {clobber: true});
		data.projectList = yield this.listProjects();
		data.currentProject = data.newProject;
		data.newProject = undefined;
		return yield _co(this, 'openProject', data);
	},
	
	*saveAs(data){
	
		// if the project already exists, reject the request
		if (yield dirExists(projectPath+data.newProject)){
			data.error = 'failed, project '+data.newProject+' already exists!';
			return data;
		}
		
		yield fs.copyAsync(projectPath+data.currentProject, projectPath+data.newProject);
		yield fs.removeAsync(projectPath+data.newProject+'/'+data.currentProject);
		data.projectList = yield this.listProjects();
		data.currentProject = data.newProject;
		data.newProject = undefined;
		return yield _co(this, 'openProject', data);
	},
	
	*deleteProject(data){
		yield fs.removeAsync(projectPath+data.currentProject);
		data.projectList = yield this.listProjects();
		for (let proj of data.projectList){
			//console.log(proj, (proj === undefined), (proj === 'undefined'), (proj !== exampleTempProject));
			if ((proj) && (proj !== 'undefined') && (proj !== exampleTempProject)){
				data.currentProject = proj;
				return yield _co(this, 'openProject', data);
			}
		}
		data.currentProject = '';
		data.fileName = undefined;
		data.fileData = '';
		data.fileList = [];
		return data;
	},
	
	*cleanProject(data){
		yield fs.removeAsync(projectPath+data.currentProject+'/build/*');
		yield fs.removeAsync(projectPath+data.currentProject+'/'+data.currentProject);
		return data;
	},
	
	// file events
	*openFile(data){
		// data.newFile is the name of the file to be opened
		// data.fileName will be set to the name of the file opened
		// data.currentProject is the project
	
		if (!data.newFile) data.newFile = data.fileName || '';
		var projectDir = projectPath + data.currentProject + '/';
		
		// check the extension
		var ext;
		if (data.newFile.split && data.newFile.indexOf('.') !== -1)
			ext = data.newFile.split('.').pop();
			
		console.log('opening file with extension', ext);
		
		// if the file can be displayed by the IDE, load it as a string
		if (ext && editableExtensions.indexOf(ext) !== -1){
		
			try{
				let fileData = yield fs.readFileAsync(projectDir + data.newFile, 'utf8');
				//.then( fileData => {
				
				// newFile was opened succesfully
				console.log('opened', data.newFile);
										
				// return the data
				data.fileData = fileData;
				data.readOnly = false;
				data.fileName = data.newFile;
				data.newFile = undefined;
				data.fileType = ext;
					
				//})
			}
			catch(e){
				
				// newFile was not opened succesfully
				console.log('could not open file', data.newFile);
				console.log(e.toString());
				
				// attempt to open a different file
				var projectContents = yield fs.readdirAsync(projectDir);
				
				if (projectContents.length){
					for (let item of projectContents){
						if (blockedFiles.indexOf(item) === -1 && 
							(yield fs.statAsync(projectDir+'/'+item).then( stat => stat.isFile() ).catch( () => false )) && 
							item !== data.currentProject &&
							(item.length && item[0] !== '.')){
								if (!data.exampleName) data.error = 'could not open '+data.newFile+', opening '+item+' instead';
								data.newFile = item;
								return yield _co(this, 'openProject', data);
						}
					}
				}
				
				// return an error
				data.error = 'Could not open file '+data.newFile;
				data.fileData = '';
				data.readOnly = true;
				data.newFile = undefined;
				data.fileName = '';
				data.fileType = 0;
					
			}
				
		} else {
			// either the file has no extension, or it's extension is not allowed by the IDE
			// if the file is not too big, load it as a buffer and try to find its type
			
			let stat = yield fs.statAsync(projectDir + data.newFile).catch( () => {size: 0} );
			console.log(data.newFile, stat);
			
			if (stat && stat.size > maxFileSize){
			
				// newFile has a bad extension and is too big
				console.log('file is too large:', data.newFile, stat.size);
				
				// return an error
				data.error = 'file is too large: '+(stat.size/1000000)+'Mb';
				data.fileData = "The IDE can't open non-source files larger than "+(maxFileSize/1000000)+"Mb";
				data.readOnly = true;
				data.fileName = data.newFile;
				data.newFile = undefined;
				data.fileType = 0;
				
			} else {
			
				try{				
				
					let fileData = yield fs.readFileAsync(projectDir + data.newFile);

					// newFile was opened succesfully
					console.log('opened', data.newFile);
				
					// attempt to get its type
					let fileTypeData = fileType(fileData);
					console.log('guessed filetype:', fileTypeData);
				
					if (fileTypeData && (fileTypeData.mime.indexOf('image') !== -1 || fileTypeData.mime.indexOf('audio') !== -1)){
				
						// the file is image or audio
						data.fileData = '';
						data.fileType = fileTypeData.mime;
						
						data.readOnly = true;
						
						yield new Promise.coroutine(makeSymLink)(projectDir + data.newFile, mediaPath + data.newFile);
											
					} else {
				
						if (isBinaryFile.sync(fileData, stat.size)){
						
							// the file is (probably) binary and can't be displayed in the IDE
							console.log(data.newFile, 'is binary');
							
							// return an error
							data.error = "can't open binary files";
							data.fileData = resourceData;
							data.readOnly = true;
							data.fileType = 0;
							
						} else {
							
							// the file is (probably) not a binary, so try to open it
							console.log(data.newFile, 'is not binary, attempting to open...');
							
							// convert the file to a string
							data.fileData = fileData.toString();
							data.readOnly = false;
							data.fileType = ext || 0;
							
						}
					}

					data.fileName = data.newFile;
					data.newFile = undefined;
					
				}
				catch(e){
			
					// newFile was not opened succesfully
					console.log('could not open file', data.newFile);
					console.log(e.toString());
					
					// attempt to open a different file
					var projectContents = yield fs.readdirAsync(projectDir);
				
					if (projectContents.length){
						for (let item of projectContents){
							if (blockedFiles.indexOf(item) === -1 && 
								(yield fs.statAsync(projectDir+'/'+item).then( stat => stat.isFile() ).catch( () => false )) && 
								item !== data.currentProject &&
								(item.length && item[0] !== '.')){
									data.error = 'could not open '+data.newFile+', opening '+item+' instead';
									data.newFile = item;
									return yield _co(this, 'openProject', data);
							}
						}
					}
				
					// return an error
					data.error = 'Could not open file '+data.newFile;
					data.fileData = '';
					data.readOnly = true;
					data.newFile = undefined;
					data.fileName = '';
					data.fileType = 0;
				
				}
			}
		}
		
		yield Promise.coroutine(_setFile)(data);
		return data;
	},
	
	*newFile(data){
	
		// if the file already exists, reject the request
		if (yield fileExists(projectPath+data.currentProject+'/'+data.newFile)){
			data.error = 'failed, file '+data.newFile+' already exists!';
			return data;
		}
		
		yield fs.outputFileAsync(projectPath+data.currentProject+'/'+data.newFile, '/***** '+data.newFile+' *****/\n');
		data.fileName = data.newFile;
		data.newFile = undefined;
		data.fileList = yield new Promise.coroutine(listFiles)(projectPath+data.currentProject);
		data.focus = {line: 2, column: 1};
		return yield _co(this, 'openFile', data);
	},
	
	*uploadFile(data){
	
		// if the file already exists and the force flag is not set, reject the request
		console.log(projectPath+data.currentProject+'/'+data.newFile, yield fileExists(projectPath+data.currentProject+'/'+data.newFile), data.force);
		if (!data.force && (yield fileExists(projectPath+data.currentProject+'/'+data.newFile))){
			data.error = 'failed, file '+data.newFile+' already exists!';
			data.fileData = undefined;
			return data;
		}
		
		yield fs.outputFileAsync(projectPath+data.currentProject+'/'+data.newFile, data.fileData);
		data.fileName = data.newFile;
		data.newFile = undefined;
		data.fileList = yield new Promise.coroutine(listFiles)(projectPath+data.currentProject);
		return yield _co(this, 'openFile', data);
	},
	
	*renameFile(data){
		
		// if the file already exists, reject the request
		console.log(projectPath+data.currentProject+'/'+data.newFile, yield fileExists(projectPath+data.currentProject+'/'+data.newFile));
		if (yield fileExists(projectPath+data.currentProject+'/'+data.newFile)){
			data.error = 'failed, file '+data.newFile+' already exists!';
			data.fileData = undefined;
			return data;
		}
		
		yield fs.moveAsync(projectPath+data.currentProject+'/'+data.fileName, projectPath+data.currentProject+'/'+data.newFile);
		data.fileName = data.newFile;
		data.newFile = undefined;
		data.fileList = yield new Promise.coroutine(listFiles)(projectPath+data.currentProject);
		return yield _co(this, 'openFile', data);
	},
	
	*deleteFile(data){
		yield fs.removeAsync(projectPath+data.currentProject+'/'+data.fileName);
		data.fileList = yield new Promise.coroutine(listFiles)(projectPath+data.currentProject);
		if (data.fileList.length){
			for (let item of data.fileList){
				if (!item.dir && item.name){
					data.fileName = item.name;
					return yield _co(this, 'openFile', data);
				}
			}
		}
		data.fileName = '';
		data.fileData = '';
		return data;
	},
	
	*setBreakpoints(data){
		var settings = yield _getSettings(data.currentProject);
		settings.breakpoints = data.value;
		return yield _saveSettings(settings, data);
	},
	
	*setCLArg(data){
		var settings = yield _getSettings(data.currentProject);
		settings.CLArgs[data.key] = data.value;
		return yield _saveSettings(settings, data);
	},
	
	*restoreDefaultCLArgs(data){
		var oldSettings = yield _getSettings(data.currentProject);
		var newSettings = _defaultSettings();
		newSettings.fileName = oldSettings.fileName;
		newSettings.breakpoints = oldSettings.breakpoints;
		return yield _saveSettings(newSettings, data);
	},
	
	*getCLArgs(project){
		var settings = yield _getSettings(project);
		return settings.CLArgs;
	},
	
	listFiles(project){
		return new Promise.coroutine(listFiles)(projectPath+project);
	}
}


// private functions
function *loadData(filePath, backupFilePath, encoding){
	// if the file at filePath exists, open it. Otherwise open the file at backupFilePath
	var file = yield _fileExists(filePath) ? filePath : backupFilePath;
	return yield fs.readFileAsync(file, encoding);
}

function fileExists(file){
	return new Promise((resolve, reject) => {
		fs.stat(file, function(err, stats){
			if (err || !stats.isFile()) resolve(false);
			else resolve(true);
		});
	});
}

function dirExists(dir){
	return new Promise((resolve, reject) => {
		fs.stat(dir, function(err, stats){
			if (err || !stats.isDirectory()) resolve(false);
			else resolve(true);
		});
	});
}

function *makeSymLink(file, link){
	return fs.emptyDirAsync(mediaPath)
		.then( () => {
			return new Promise( (resolve, reject) => {
				exec('mkdir --parents '+path.dirname(link)+'; ln -s '+file+' '+link, (err, stdout, stderr) => {
					if (err) reject(err);
					//console.log(stdout, stderr);
					else resolve();
				});
			});
		})
		.catch( e => console.log('error making symlink', e.toString()) );
}

// save the last opened file
function *_setFile(data){
	var settings = yield _getSettings(data.currentProject)
	settings.fileName = data.fileName;
	return yield _saveSettings(settings, data);
}

// return the project settings
function _getSettings(projectName){
	return fs.readJSONAsync(projectPath+projectName+'/settings.json')
		.catch((error) => {
			//console.log('settings.json error', error, error.stack);
			console.log('could not find settings.json in project folder, creating default project settings');
			// if there is an error loading the settings object, create a new default one
			return _saveSettings(_defaultSettings(), {currentProject: projectName});
		})
}

// save the project settings
function _saveSettings(settings, data){
	//console.log('saving settings', settings, ' in', projectPath+data.currentProject);
	return fs.outputJSONAsync(projectPath+data.currentProject+'/settings.json', settings)
		.then( () => settings )
		.catch( (e) => console.log(e) );
}

// list all files in project, excluding blocked & hidden files or directories
function _listFiles(projectName){
	return fs.readdirAsync(projectPath+projectName)
		.filter((fileName) => {
			if (fileName && fileName[0] && fileName[0] !== '.' && fileName !== projectName && blockedFiles.indexOf(fileName) === -1) return fileName;
		});
}

// recursive listFiles, returning an array of objects with names, sizes, and (if dir) children
function *listFiles(dir, subDir){

	//console.log('listFiles entering dir', dir);

	var contents = yield fs.readdirAsync(dir).filter( item => {
			if (!subDir && item && item[0] && item[0] !== '.' && item !== dir.split('/').pop() && blockedFiles.indexOf(item) === -1) return item;
			else if(subDir && item && item[0] && item[0] !== '.') return item;
		});
		
	var output = [];
	for (let item of contents){
	
		let stat = yield fs.statAsync(dir+'/'+item);
		
		//console.log(stat);
		
		let data = {
			name: item,
			dir: stat.isDirectory(),
			size: stat.size
		};
		
		if (data.dir) 
			data.children = yield new Promise.coroutine(listFiles)(dir + '/' + data.name, true);
			
		output.push(data);
	
	}

	//console.log('listFiles exiting dir', dir);
	//if (!subDir) console.dir(output,{depth:null})
	return output;
}

// create default project settings
function _defaultSettings(){
	var CLArgs = CLArgs = {
		"-p": "16",		// audio buffer size
		"-C": "8",		// no. analog channels
		"-B": "16",		// no. digital channels
		"-H": "-6",		// headphone level (dB)
		"-N": "1",		// use analog
		"-G": "1",		// use digital
		"-M": "0", 		// mute speaker
		"-D": "0",		// dac level
		"-A": "0", 		// adc level
		"--pga-gain-left": "10",
		"--pga-gain-right": "10",
		"user": '',		// user-defined clargs
		"make": ''		// user-defined Makefile parameters
	};
	return {
		"fileName"		: "render.cpp",
		CLArgs,
		"breakpoints"	: []
	};
}

// coroutine factory and binder
function _co(obj, func, args){
	return Promise.coroutine(obj[func]).bind(obj)(args);
}




