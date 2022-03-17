var View = require('./View');
var popup = require('../popup');
var sanitise = require('../utils').sanitise;
var json = require('../site-text.json');
let sanitisePath = (name) => {
	return sanitise(name, { isPath: true, });
}
var prettySize = require('../utils').prettySize;

var sourceIndeces = ['cpp', 'c', 's'];
var headerIndeces = ['h', 'hh', 'hpp'];
var imageIndeces = ['jpg', 'jpeg', 'png', 'gif'];
var absIndeces = ['pd'];

var askForOverwrite = true;
var uploadingFile = false;
var overwriteAction = '';
var fileQueue = [];
var forceRebuild = false;
var viewHiddenFiles = false;
var firstViewHiddenFiles = true;

var listCount = 0;

function isDragEvent(e, type)
{
	return e.originalEvent.dataTransfer.types.includes(type);
}
class FileView extends View {

	constructor(className, models, getProjectList){
		super(className, models);
		this.getProjectList = getProjectList;
		this.currentProject = null;
		this.listOfFiles = [];

    var data = {
      fileName: "",
      project: ""
    };

		var overlayActiveClass = 'active-drag-upload';
		// drag and drop file upload on editor
		var overlay = $('[data-overlay]');
		overlay.on('dragleave', (e) => {
			overlay.removeClass(overlayActiveClass);
		});
		$('body').on('dragenter dragover drop', (e) => {
			if(!isDragEvent(e, "Files"))
				return;
			e.stopPropagation();
			e.preventDefault();
      if (e.type == 'dragenter') {
        overlay.addClass(overlayActiveClass);
      }
			if (e.type === 'drop'){
				for (var i = 0; i < e.originalEvent.dataTransfer.files.length; i++){
          // console.log(e.originalEvent.dataTransfer.files[i].size);
          // 20mb maximum drag and drop file size
          if (e.originalEvent.dataTransfer.files[i].size >= 20000000) {
            let that = this;
            overlay.addClass('no');
            setTimeout(function(){
              overlay.removeClass('no')
                     .removeClass(overlayActiveClass);
              that.uploadSizeError();
            }, 1500);
            return false;
          } else {
            fileQueue.push(e.originalEvent.dataTransfer.files[i])
          }
          if (i == e.originalEvent.dataTransfer.files.length - 1) {
            setTimeout(function(){
              overlay.removeClass(overlayActiveClass)
                     .removeClass('no');
            }, 1500);
          }
				}
				this.processQueue();
			}
			return false;
		});

	}

	// UI events
	buttonClicked($element){
		var func = $element.data().func;
		if (func && this[func]){
			this[func](func);
		}
	}

	_getFlattenedFileList(foldersOnly){
		let listDir = (out, inp, base) => {
			if(!base)
				base = '';
			for(let f of inp) {
				if(!foldersOnly || isDir(f))
					out.push(base + f.name);
				if(isDir(f))
					listDir(out, f.children, base + f.name + '/');
			}
		}
		let flattenedFiles = [];
		listDir(flattenedFiles, this.listOfFiles);
		return flattenedFiles;
	}

	async newFile(func, base){
		let name = await popup.requestValidInputAsync({
			initialValue: base + '/',
			getDisallowedValues: () => { return this._getFlattenedFileList(false); },
			strings: json.popups.create_new_file,
			sanitise: sanitisePath,
		});
		if(null === name)
			return;
		this.emit('message', 'project-event', {func, newFile: name});
	}

	async newFolder(func) {
		let name = await popup.requestValidInputAsync({
			initialValue: '',
			getDisallowedValues: () => { return this._getFlattenedFileList(true); },
			strings: json.popups.create_new_folder,
			sanitise: sanitisePath,
		});
		if(null === name)
			return;
		this.emit('message', 'project-event', {func, newFolder: name});
	}

  uploadSizeError(){
		popup.twoButtons(json.popups.upload_size_error,
			function onSubmit(){
				this.uploadFile();
			}.bind(this),
			undefined,
			{
				titleClass: 'error',
			}
		);
  }

  uploadFileError(){
		popup.twoButtons(
			json.popups.upload_file_nofileselected_error,
			function onSubmit(e){
				this.uploadFile();
			}.bind(this),
			undefined, {
				titleClass: 'error',
			}
		);
  }

	uploadFile(func){
		popup.twoButtons(json.popups.upload_file,
			async function onSubmit(e){
				var formEl = $('[data-popup] form')[0];
				var formDataOrig = new FormData(formEl);
				let formData = new FormData;
				let uploadFiles = 0;
				let selectedFiles = 0;
				for(let entry of formDataOrig.entries()){
					++selectedFiles;
					// TODO: can we get useful directory information here?
					let bareName = entry[1].name.split('\\').pop();
					let destName = sanitise(bareName);
					// TODO: this should check against sanitised versions of the
					// filenames that have already been checked, so that we
					// are forbidden to upload e.g.: 'ren er.cpp' and 'ren_er.cpp'
					// at the same time.
					////let file = Object.assign({}, entry[1]);
					//file.name = sanitise(file.name);
					let ret = await this.promptForOverwrite(destName);
					if(ret.do) {
						formData.append(entry[0], entry[1]);
						uploadFiles++;
					}
					// bundle project-event messages in the POST in order to
					// move the file once it's been saved _before_ returning success
					formData.append("project-event", JSON.stringify({
						currentProject: this.currentProject,
						func: 'moveUploadedFile',
						newFile: bareName,
						sanitisedNewFile: destName
					}));
				}
				if (!selectedFiles)
					this.uploadFileError();
				if (uploadFiles)
					this.doLargeFileUpload(formData);
			}.bind(this)
		);
		popup.form.attr('action', '/uploads')
			.attr('enctype','multipart/form-data')
			.attr('method', 'POST');
		popup.form.prepend('<input type="file" name="data" multiple data-form-file></input><br/><br/>');
	}

	async rename(type, e){
		let popupStrings;
		if('file' === type)
			popupStrings = json.popups.rename_file;
		else if('folder' === type)
			popupStrings = json.popups.rename_folder;
		else
			return;
		// Get the name of the file to be renamed:
		var name = $(e.target).data('name');
		let path = name;
		popupStrings = Object.assign({}, popupStrings);
		popupStrings.title = 'Rename `' + path + '`?';
		let newName = await popup.requestValidInputAsync({
			initialValue: path,
			getDisallowedValues: () => {
				// remove current name (i.e.: allow rename to same, which
				// yields NOP)
				let arr = this._getFlattenedFileList(false);
				arr.splice(arr.indexOf(name), 1);
				return arr;
			},
			strings: popupStrings,
			sanitise: sanitisePath,
		});
		if(null === newName)
			return;
		if(newName === path) // rename to same: NOP
			return;
		if('file' === type)
			this.emit('message', 'project-event', {func: 'renameFile', oldName: name, newFile: newName});
		else if('folder' === type)
			this.emit('message', 'project-event', {func: 'renameFolder', oldName: name, newFolder: newName});
		popup.hide();
	}

	renameFile(e){
		this.rename('file', e);
	}

  renameFolder(e){
		this.rename('folder', e);
  }

	deleteFile(e){
		// Get the name of the file to be deleted:
		var name = $(e.target).data('name');
    var func = $(e.target).data('func');
		let strings = Object.assign({}, json.popups.delete_file);
		strings.title = 'Delete `' + name + '`?';
		popup.twoButtons(strings, function onSubmit(e){
			this.emit('message', 'project-event', {func: 'deleteFile', fileName: name, currentFile: $('[data-current-file]')[0].innerText});
		}.bind(this)
		);
	}

	openFile(e){
		this.emit('message', 'project-event', {func: 'openFile', newFile: $(e.currentTarget).data('file')})
	}

	// model events
	_fileList(files, data){

		// TODO: it would be great to be able to get this from this.models, but
		// we don't actually know which one is the project model, so we cache
		// it here instead
		this.currentProject = data.currentProject;
		if (!Array.isArray(files)) return;

		this.listOfFiles = files;

		var $files = $('[data-file-list]')
		$files.empty();

		var headers = [];
		var sources = [];
    var abstractions = [];
		var resources = [];
		var directories = [];
		var images = [];
		for (let it of files){

			// defensive copy so that changes below to the way the size is
			// displayed do not affect the model
			let item = Object.assign({}, it);
			// exclude hidden files

			if (!viewHiddenFiles && (item.name[0] === '.' || (isDir(item) && item.name === 'build') || item.name === 'settings.json' || item.name == data.currentProject)) {
				continue;
			}

			if (isDir(item)){

				directories.push(item);

			} else {

				let ext = item.name.split('.').pop();

				if (sourceIndeces.indexOf(ext) !== -1){
					sources.push(item);
				} else if (headerIndeces.indexOf(ext) !== -1){
					headers.push(item);
				} else if (imageIndeces.indexOf(ext.toLowerCase()) !== -1) {
					images.push(item);
				} else if (ext == "pd" && item.name == "_main.pd") {
					sources.push(item);
				} else if (ext == "pd") {
          abstractions.push(item);
        } else if (item){
					resources.push(item);
				}

			}

		}

		var pd = '_main.pd';
		var render = 'render.cpp';
		headers.sort( (a, b) => a.name - b.name );
		sources.sort( (a, b) => a.name - b.name );
		sources.sort( (a, b) => a.name == pd ? -1 : b.name == pd ? 1 : 0 );
		sources.sort( (a, b) => a.name == render ? -1 : b.name == render ? 1 : 0 );
    abstractions.sort( (a, b) => a.name - b.name );
    images.sort( (a, b) => a.name - b.name );
		resources.sort( (a, b) => a.name - b.name );
		directories.sort( (a, b) => a.name - b.name );

		var file_list_elements = [ sources, headers, abstractions, images, resources, directories ];
        file_list_elements[0].name = json.file_view.sources;
        file_list_elements[1].name = json.file_view.headers;
        file_list_elements[2].name = json.file_view.abstractions;
        file_list_elements[3].name = json.file_view.images;
        file_list_elements[4].name = json.file_view.resources;
        file_list_elements[5].name = json.file_view.directories;
    var i18n_dir_str = json.file_view.directories;

		// Build file structure by listing the contents of each section (if they exist)

		for (let i = 0; i < file_list_elements.length; i++) {

			if (file_list_elements[i].length) {

				var section = $('<div></div>')
            .addClass('section');
				$('<p></p>')
            .addClass('file-heading')
            .html(file_list_elements[i].name)
            .appendTo(section);
            // console.log('current sec: ' + file_list_elements[i].name);
				var fileList = $('<ul></ul>')
            .addClass('sub-file-list');

				for (let j = 0; j < file_list_elements[i].length; j++) {
	        var listItem = $('<li></li>')
                .addClass('source-file')
                .appendTo(fileList);
          var item = file_list_elements[i][j];
	        // var itemData = $('<div></div>').addClass('source-data-container').appendTo(listItem);
          if (file_list_elements[i].name != i18n_dir_str) {
            var itemText = $('<div></div>')
                  .addClass('source-text')
                  .html(item.name + ' <span class="file-list-size">' + prettySize(item.size) + '</span>')
                  .data('file', item.name)
                  .appendTo(listItem)
                  .on('click', (e) => this.openFile(e));
            var renameButton = $('<button></button>')
                  .addClass('file-rename file-button fileManager')
                  .attr('title', 'Rename')
                  .attr('data-func', 'renameFile')
                  .attr('data-name', item.name)
                  .appendTo(listItem)
                  .on('click', (e) => this.renameFile(e));
  	        var downloadButton = $('<button></button>')
                  .addClass('file-download file-button fileManager')
                  .attr('href-stem', '/download?project=' + data.currentProject + '&file=')
                  .attr('data-name', item.name)
                  .appendTo(listItem)
                  .on('click', (e, projName) => this.downloadFile(e, data.currentProject));
            var deleteButton = $('<button></button>')
                  .addClass('file-delete file-button fileManager')
                  .attr('title', 'Delete')
                  .attr('data-func', 'deleteFile')
                  .attr('data-name', item.name)
                  .appendTo(listItem)
                  .on('click', (e) => this.deleteFile(e));
          } else {
            section.addClass('is-dir');
            var itemText = $('<div></div>')
                  .addClass('source-text')
                  .text(item.name)
                  .data('file', item.name)
                  .appendTo(listItem);
            var renameButton = $('<button></button>')
                  .addClass('file-rename file-button fileManager')
                  .attr('title', 'Rename')
                  .attr('data-func', 'renameFolder')
                  .attr('data-name', item.name)
                  .appendTo(listItem)
                  .on('click', (e) => this.renameFolder(e));
            var newButton = $('<button></button>')
                  .addClass('file-new file-button fileManager')
                  .attr('title', 'New File')
                  .attr('data-func', 'newFile')
                  .attr('data-folder', item.name)
                  .appendTo(listItem)
                  .on('click', () => this.newFile('newFile', event.target.dataset.folder));
            var deleteButton = $('<button></button>')
                  .addClass('file-delete file-button fileManager')
                  .attr('title', 'Delete')
                  .attr('data-func', 'deleteFile')
                  .attr('data-name', item.name)
                  .appendTo(listItem)
                  .on('click', (e) => this.deleteFile(e));
            var subList = $('<ul></ul>');
            for (var k = 0; k < item.children.length; k++) {
              var child = item.children[k];
              let path = item.name + '/' + child.name;
              let size = (typeof(child.size) !== 'undefined') ? prettySize(child.size) : '';
              var subListItem = $('<li></li>')
                    .addClass('source-file');
              var itemText = $('<div></div>')
                  .addClass('source-text')
                  .html(child.name + ' <span class="file-list-size">' + size + '</span>')
                  .data('file', path)
                  .appendTo(subListItem)
                  .on('click', (e) => this.openFile(e));
              var deleteButton = $('<button></button>')
                    .addClass('file-delete file-button fileManager')
                    .attr('title', 'Delete')
                    .attr('data-func', 'deleteFile')
                    .attr('data-name', path)
                    .appendTo(subListItem)
                    .on('click', (e) => this.deleteFile(e));
              var renameButton = $('<button></button>')
                    .addClass('file-rename file-button fileManager')
                    .attr('title', 'Rename')
                    .attr('data-func', 'renameFile')
                    .attr('data-name', path)
                    .appendTo(subListItem)
                    .on('click', (e) => this.renameFile(e));
              if(!child.children) {
                var downloadButton = $('<button></button>')
                    .addClass('file-download file-button fileManager')
                    .attr('href-stem', '/download?project=' + data.currentProject + '&file=')
                    .attr('data-name', path)
                    .appendTo(subListItem)
                    .on('click', (e, projName) => this.downloadFile(e, data.currentProject));
              }
              subListItem.appendTo(subList);
            }
            subList.appendTo(listItem);
          }
	      }
	      fileList.appendTo(section);
	      section.appendTo($files);
			}
		}
		if (data && data.fileName) this._fileName(data.fileName);

	}

	downloadFile(e, projName) {
		var filename = $(e.target).attr('data-name');
		var project = projName;
		var href = $(e.target).attr('href-stem') + filename;
    e.preventDefault();  //stop the browser from following the link
    window.location.href = href;
	}

	_fileName(file, data){

		// select the opened file in the file manager tab
		$('.selectedFile').removeClass('selectedFile');

		var foundFile = false
		$('[data-file-list]').find('li').each(function(){
			if ($(this).data('file') === file){
				$(this).addClass('selected');
				foundFile = true;
			} else {
				$(this).removeClass('selected');
			}
		});


	}

	processQueue(){
		// keep processing the queue in the background
		console.log("processQueue", uploadingFile, fileQueue.length)
		if(!uploadingFile && fileQueue.length)
		{
			setTimeout(() => {
				console.log("processQueue do file upload", uploadingFile, fileQueue.length)
				if(!uploadingFile && fileQueue.length)
				{
					console.log("processQueue do file upload")
					this.doFileUpload(fileQueue.pop());
				}
			}, 0);
		}
	}

	async promptForOverwrite(filename){
		return new Promise((resolve, reject) => {
			let fileExists = this._getFlattenedFileList().includes(filename);
			const dont = {
				do: false,
				force: false,
			};
			if (fileExists && askForOverwrite){
				popup.twoButtons({
					title: json.popups.overwrite.title,
					text: filename + json.popups.overwrite.text,
					button: json.popups.overwrite.button,
				}, function onSubmit(e){
					if (popup.find('input[type=checkbox]').is(':checked')){
						askForOverwrite = false;
						overwriteAction = 'upload';
					}
					resolve({
						do: true,
						force: true,
					})
				}.bind(this), function onCancel() {
					if (popup.find('input[type=checkbox]').is(':checked')){
						askForOverwrite = false;
						overwriteAction = 'reject';
					}
					resolve(dont);
				});
				let checkbox = '<input id="popup-remember-upload" type="checkbox"><label for="popup-remember-upload">' + json.popups.overwrite.tick + '</label<br\>';
				popup.form.prepend(checkbox);
				popup.find('.cancel').focus();

			} else if (fileExists && !askForOverwrite){

				if (overwriteAction === 'upload') {
					resolve({
						do: true,
						force: true,
					});
				} else {
					resolve(dont);
					this.emit('file-rejected', 'upload failed, file '+filename+' already exists.');
				}
			} else {
				resolve({
					do: true,
					force: false,
				});
			}
		});
	}

	async doFileUpload(file){

		if (uploadingFile){
			fileQueue.push(file);
			return;
		}
		uploadingFile = true;

		if (file.name === '_main.pd') forceRebuild = true;

		let obj = await this.promptForOverwrite(sanitise(file.name));
		if(obj.do) {
			let saveas;
			let isProject;
			if (file.name.search(/\.zip$/) != -1) {
				let newProject = sanitise(file.name.replace(/\.zip$/, ""));
				let strings = Object.assign({}, json.popups.create_new_project_from_zip);
				strings.title += file.name;
				saveas = await popup.requestValidInputAsync({
					initialValue: newProject,
					getDisallowedValues: this.getProjectList,
					strings: strings,
					sanitise: sanitise,
				});
				isProject = true;
			} else {
				saveas = sanitise(file.name);
				isProject = false
			}
			if(null !== saveas)
				this.actuallyDoFileUpload(file, saveas, obj.force, isProject);
		}
		uploadingFile = false;
		this.processQueue();
	}

  doLargeFileUpload(formData, force){
    var that = this;
    popup.ok(json.popups.upload_file_progress);
    $.ajax({
      type: "POST",
      url: '/uploads',
      enctype: 'multipart/form-data',
      processData: false,
      contentType: false,
      data: formData,
      success: function(r){
        // would be great if this could be sent as part of the POST body
        that.emit('list-files');
        popup.ok(json.popups.upload_file_success);
        that.emit('force-rebuild');
      },
      error: function(e) {
        that.emit('list-files');
        popup.ok({
          title: json.popups.upload_file_error.title,
          text: e.responseText,
        })
      }
    });
  }

	async actuallyDoFileUpload(file, saveas, force, isProject){
		var reader = new FileReader();
		if (forceRebuild && !fileQueue.length){
			forceRebuild = false;
			this.emit('force-rebuild');
		}
		let onloadend = (func, args, ev) => {
				if(func && ev){
					if(ev.loaded != ev.total || ev.srcElement.error || ev.target.error || null === ev.target.result)
						this.emit('file-rejected', 'error while uploading '+file.name);
					else {
						args.func = func;
						args.newFile = saveas;
						args.fileData = ev.target.result;
						args.force = force;
						args.queue = fileQueue.length;
						this.emit('message', 'project-event', args);
					}
				}
		}
		// TODO: if something fails on the server(e.g.: project existing, file
		// cannot be written, whatev), the rest of the queue may not be handled
		// properly because the popup from the error will overwrite any active popup.
		// A reset may be required.
		if (isProject) {
			reader.onloadend = onloadend.bind(this, 'uploadZipProject', { newProject: saveas });
		} else {
			reader.onloadend = onloadend.bind(this, 'uploadFile', {});
		}
		reader.readAsArrayBuffer(file);
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

function isDir(item){
	return ((typeof item.size) === 'undefined' && (typeof item.children) !== 'undefined');
}

module.exports = FileView;
