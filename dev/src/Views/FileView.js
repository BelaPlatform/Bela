var View = require('./View');
var popup = require('../popup');

var sourceIndeces = ['cpp', 'c', 'S'];
var headerIndeces = ['h', 'hh', 'hpp'];

var askForOverwrite = true;
var uploadingFile = false;
var overwriteAction = '';
var fileQueue = [];
var forceRebuild = false;
var viewHiddenFiles = false;
var firstViewHiddenFiles = true;

class FileView extends View {
	
	constructor(className, models){
		super(className, models);
		
		this.listOfFiles = [];

		// hack to upload file
		$('#uploadFileInput').on('change', (e) => {
			for (var i=0; i<e.target.files.length; i++){
				this.doFileUpload(e.target.files[i]);
			}
		});
		
		// drag and drop file upload on editor
		$('body').on('dragenter dragover drop', (e) => {
			e.stopPropagation();
			e.preventDefault();
			if (e.type === 'drop'){
				for (var i=0; i<e.originalEvent.dataTransfer.files.length; i++){
					this.doFileUpload(e.originalEvent.dataTransfer.files[i]);
				}
			}
			return false;
		});
	
	}
	
	// UI events
	buttonClicked($element, e){
		var func = $element.data().func;
		if (func && this[func]){
			this[func](func);
		}
	}
	
	newFile(func){
	
		// build the popup content
		popup.title('Creating a new file');
		popup.subtitle('Enter the name of the new file. Only files with extensions .cpp, .c or .S will be compiled.');
		
		var form = [];
		form.push('<input type="text" placeholder="Enter the file name">');
		form.push('</br >');
		form.push('<button type="submit" class="button popup-create">Create</button>');
		form.push('<button type="button" class="button popup-cancel">Cancel</button>');
		
		popup.form.append(form.join('')).off('submit').on('submit', e => {
			e.preventDefault();
			this.emit('message', 'project-event', {func, newFile: sanitise(popup.find('input[type=text]').val())});
			popup.hide();
		});
		
		popup.find('.popup-cancel').on('click', popup.hide );
		
		popup.show();

	}
	uploadFile(func){
		$('#uploadFileInput').trigger('click');
	}
	renameFile(func){
		
		// build the popup content
		popup.title('Renaming this file');
		popup.subtitle('Enter the new name of the file. Only files with extensions .cpp, .c or .S will be compiled.');
		
		var form = [];
		form.push('<input type="text" placeholder="Enter the new file name">');
		form.push('</br >');
		form.push('<button type="submit" class="button popup-rename">Rename</button>');
		form.push('<button type="button" class="button popup-cancel">Cancel</button>');
		
		popup.form.append(form.join('')).off('submit').on('submit', e => {
			e.preventDefault();
			this.emit('message', 'project-event', {func, newFile: sanitise(popup.find('input[type=text]').val())});
			popup.hide();
		});
		
		popup.find('.popup-cancel').on('click', popup.hide );
		
		popup.show();

	}
	deleteFile(func){
	
		// build the popup content
		popup.title('Deleting file');
		popup.subtitle('Are you sure you wish to delete this file? This cannot be undone!');
		
		var form = [];
		form.push('<button type="submit" class="button popup-delete">Delete</button>');
		form.push('<button type="button" class="button popup-cancel">Cancel</button>');
		
		popup.form.append(form.join('')).off('submit').on('submit', e => {
			e.preventDefault();
			this.emit('message', 'project-event', {func});
			popup.hide();
		});
		
		popup.find('.popup-cancel').on('click', popup.hide );
		
		popup.show();
		
		popup.find('.popup-delete').trigger('focus');
		
	}
	openFile(e){
		this.emit('message', 'project-event', {func: 'openFile', newFile: $(e.currentTarget).data('file')})
	}
	
	// model events
	_fileList(files, data){

		this.listOfFiles = files;

		var $files = $('#fileList')
		$files.empty();
		
		if (!files.length) return;

		var headers = [];
		var sources = [];
		var resources = [];
		var directories = [];
		
		for (let item of files){

			// exclude hidden files
			if (!viewHiddenFiles && (item.name[0] === '.' || (item.dir && item.name === 'build') || item.name === 'settings.json' || item.name === data.currentProject)) continue;
					
			if (item.dir){
			
				directories.push(item);
				
			} else {
			
				let ext = item.name.split('.').pop();
				
				if (item.size < 1000000){
					item.size = (item.size/1000).toFixed(1)+'kb';
				} else if (item.size >= 1000000 && item.size < 1000000000){
					item.size = (item.size/1000000).toFixed(1)+'mb';
				} 
			
				if (sourceIndeces.indexOf(ext) !== -1){
					sources.push(item);
				} else if (headerIndeces.indexOf(ext) !== -1){
					headers.push(item);
				} else if (item){
					resources.push(item);
				}
				
			}
			
		}
		
		//console.log(headers, sources, resources, directories);

		headers.sort( (a, b) => a.name - b.name );
		sources.sort( (a, b) => a.name - b.name );
		resources.sort( (a, b) => a.name - b.name );
		directories.sort( (a, b) => a.name - b.name );
		
		//console.log(headers, sources, resources, directories);
				
		if (headers.length){
			$('<li></li>').html('Headers:').appendTo($files);
		}
		for (let i=0; i<headers.length; i++){
			$('<li></li>').addClass('sourceFile').html(headers[i].name+'<span class="file-list-size">'+headers[i].size+'</span>').data('file', headers[i].name).appendTo($files).on('click', (e) => this.openFile(e));
		}
		
		if (sources.length){
			$('<li></li>').html('Sources:').appendTo($files);
		}
		for (let i=0; i<sources.length; i++){
			$('<li></li>').addClass('sourceFile').html(sources[i].name+'<span class="file-list-size">'+sources[i].size+'</span>').data('file', sources[i].name).appendTo($files).on('click', (e) => this.openFile(e));
		}
		
		if (resources.length){
			$('<li></li>').html('Resources:').appendTo($files);
		}
		for (let i=0; i<resources.length; i++){
			$('<li></li>').addClass('sourceFile').html(resources[i].name+'<span class="file-list-size">'+resources[i].size+'</span>').data('file', resources[i].name).appendTo($files).on('click', (e) => this.openFile(e));
		}
		
		if (directories.length){
			$('<li></li>').html('Directories:').appendTo($files);
		}
		for (let dir of directories){
			$files.append(this.subDirs(dir));
		}
		
		if (data && data.fileName) this._fileName(data.fileName);
	}
	_fileName(file, data){

		// select the opened file in the file manager tab
		$('.selectedFile').removeClass('selectedFile');
		
		var foundFile = false
		$('#fileList li').each(function(){
			if ($(this).data('file') === file){
				$(this).addClass('selectedFile');
				foundFile = true;
			}
		});
				
		if (data && data.currentProject){
			// set download link
			$('#downloadFileLink').attr('href', '/download?project='+data.currentProject+'&file='+file);
		}
	}
	
	subDirs(dir){
		var ul = $('<ul></ul>').html(dir.name+':');
		for (let child of dir.children){
			if (!child.dir){
				if (child.size < 1000000){
					child.size = (child.size/1000).toFixed(1)+'kb';
				} else if (child.size >= 1000000 && child.size < 1000000000){
					child.size = (child.size/1000000).toFixed(1)+'mb';
				} 
				$('<li></li>').addClass('sourceFile').html(child.name+'<span class="file-list-size">'+child.size+'</span>').data('file', (dir.dirPath || dir.name)+'/'+child.name).appendTo(ul).on('click', (e) => this.openFile(e));
			} else {
				child.dirPath = (dir.dirPath || dir.name) + '/' + child.name;
				ul.append(this.subDirs(child));
			}
		}
		return ul;
	}
	
	doFileUpload(file){
	
		//console.log('doFileUpload', file.name);
	
		if (uploadingFile){
			//console.log('queueing upload', file.name);
			fileQueue.push(file);
			return;
		}
	
		var fileExists = false;
		for (let item of this.listOfFiles){
			if (item.name === sanitise(file.name)) fileExists = true;
		}
		
		if (file.name === 'settings.json') fileExists = true;
		
		if (file.name === '_main.pd') forceRebuild = true;
		
		if (fileExists && askForOverwrite){
		
			uploadingFile = true;

			// build the popup content
			popup.title('Overwriting file');
			popup.subtitle('The file '+file.name+' already exists in this project. Would you like to overwrite it?');
		
			var form = [];
			form.push('<input id="popup-remember-upload" type="checkbox">');
			form.push('<label for="popup-remember-upload">don\'t ask me again this session</label>')
			form.push('</br >');
			form.push('<button type="submit" class="button popup-upload">Overwrite</button>');
			form.push('<button type="button" class="button popup-cancel">Cancel</button>');
		
			popup.form.append(form.join('')).off('submit').on('submit', e => {
				e.preventDefault();
				if (popup.find('input[type=checkbox]').is(':checked')){
					askForOverwrite = false;
					overwriteAction = 'upload';
				}
				this.actuallyDoFileUpload(file, true);
				popup.hide();
				uploadingFile = false;
				if (fileQueue.length){
					this.doFileUpload(fileQueue.pop());
				}
			});
		
			popup.find('.popup-cancel').on('click', () => {
				if (popup.find('input[type=checkbox]').is(':checked')){
					askForOverwrite = false;
					overwriteAction = 'reject';
				}
				popup.hide();
				uploadingFile = false;
				forceRebuild = false;
				if (fileQueue.length) this.doFileUpload(fileQueue.pop());
			});
		
			popup.show();
			
			popup.find('.popup-cancel').focus();
			
		} else if (fileExists && !askForOverwrite){
		
			if (overwriteAction === 'upload')
				this.actuallyDoFileUpload(file, !askForOverwrite);
			else {
				//console.log('rejected', file.name);
				this.emit('file-rejected', file.name);
			}
				
			if (fileQueue.length) this.doFileUpload(fileQueue.pop());
			
		} else {
			
			this.actuallyDoFileUpload(file, !askForOverwrite);
			
			if (fileQueue.length) this.doFileUpload(fileQueue.pop());
			
		}
	}
	
	actuallyDoFileUpload(file, force){
		//console.log('actuallyDoFileUpload', file.name, force);
		var reader = new FileReader();
		reader.onload = (ev) => this.emit('message', 'project-event', {func: 'uploadFile', newFile: sanitise(file.name), fileData: ev.target.result, force} );
		reader.readAsArrayBuffer(file);
		if (forceRebuild && !fileQueue.length){
			forceRebuild = false;
			this.emit('force-rebuild');
		}
	}
	
	_viewHiddenFiles(val){
		viewHiddenFiles = val;
		if (firstViewHiddenFiles){
			firstViewHiddenFiles = false;
		} else {
			this.emit('message', 'project-event', {func: 'openProject', timestamp: performance.now()} );
		}
	}
	
}

module.exports = FileView;

// replace all non alpha-numeric chars other than '-' and '.' with '_'
function sanitise(name){
	return name.replace(/[^a-zA-Z0-9\.\-\/~]/g, '_');
}