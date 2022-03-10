var View = require('./View');
var popup = require('../popup');
var sanitise = require('../utils').sanitise;
var json = require('../site-text.json');

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

	newFile(func, base){
		popup.twoButtons({
			title: json.popups.create_new_file.title,
			text: json.popups.create_new_file.text,
			button: json.popups.create_new_file.button,
		}, function onSubmit(e){
      if (!base) {
        this.emit('message', 'project-event', {func, newFile: sanitise(popup.find('input[type=text]').val())});
      } else {
        this.emit('message', 'project-event', {func, newFile: sanitise(popup.find('input[type=text]').val()), folder: base});
      }
		}.bind(this)
		);
		let filenameInput = '<input type="text" placeholder="' + json.popups.create_new_file.input + '"><br/>';
		popup.form.prepend(filenameInput);
	}

  newFolder(func){
		popup.twoButtons({
			title: json.popups.create_new_folder.title,
			subtitle: json.popups.create_new_folder.text,
			button: json.popups.create_new_folder.button,
		}, function onSubmit(e){
			this.emit('message', 'project-event', {func, newFolder: sanitise(popup.find('input[type=text]').val())});
		}.bind(this)
		);
		let foldernameInput = '<input type="text" placeholder="' + json.popups.create_new_folder.input + '"><br/>';
		popup.form.prepend(foldernameInput);
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
			function onSubmit(e){
				e.preventDefault();
				var file = $('[data-form-file]')[0];
				var formEl = $('[data-popup] form')[0];
				var formDataOrig = new FormData(formEl);
				let formData = new FormData;
				for(let entry of formDataOrig.entries()){
					// TODO: check for overwrite, project etc, prompting for each file
					formData.append(entry[0], entry[1]);
				}
				var popupBlock = $('[data-popup-nointeraction]');
				if (file.files.length > 0) {
					popupBlock.addClass('active');
					$('body').addClass('uploading');
					popupBlock.addClass('active');
					popup.find('.confirm')
							 .attr('disabled', true);
					this.doLargeFileUpload(formData);
				} else {
					this.uploadFileError();
				}
		}.bind(this)
		);
		popup.form.attr('action', '/uploads')
			.attr('enctype','multipart/form-data')
			.attr('method', 'POST');
		popup.form.prepend('<input type="file" name="data" multiple data-form-file></input><br/><br/>');
	}

	rename(type, e){
		let popupStrings;
		if('file' === type)
			popupStrings = json.popups.rename_file;
		else if('folder' === type)
			popupStrings = json.popups.rename_folder;
		else
			return;
		// Get the name of the file to be renamed:
		var name = $(e.target).data('name');
    //var func = $(e.target).data('func'); // TODO: do something with this or remove it from _fileList()
    var folder = $(e.target).data('folder');
		popup.twoButtons({
			title: 'Rename ' + name + '?',
			subtitle: popupStrings.text,
			button: popupStrings.button,
		}, function onSubmit(e){
			e.preventDefault();
			var newName = sanitise(popup.find('input[type=text]').val());
			if('file' === type)
				this.emit('message', 'project-event', {func: 'renameFile', folderName: folder, oldName: name, newFile: newName});
			else if('folder' === type)
				this.emit('message', 'project-event', {func: 'renameFolder', oldName: name, newFolder: newName});
			popup.hide();
		}.bind(this)
		);
		popup.form.prepend('<input type="text" placeholder="' + popupStrings.input + '" value="' + name + '"><br/>');
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
		popup.twoButtons({
			title: 'Delete ' + name + '?',
			subtitle: json.popups.delete_file.text,
			button: json.popups.delete_file.button,
		}, function onSubmit(e){
			this.emit('message', 'project-event', {func: 'deleteFile', fileName: name, currentFile: $('[data-current-file]')[0].innerText});
		}.bind(this)
		);
	}

	openFile(e){
		this.emit('message', 'project-event', {func: 'openFile', newFile: $(e.currentTarget).data('file')})
	}

	// model events
	_fileList(files, data){

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
		for (let item of files){

			// exclude hidden files

			if (!viewHiddenFiles && (item.name[0] === '.' || (isDir(item) && item.name === 'build') || item.name === 'settings.json' || item.name == data.currentProject)) {
				continue;
			}

			if (isDir(item)){

				directories.push(item);

			} else {

				let ext = item.name.split('.').pop();

				if (item.size < 1000000){
					item.size = (item.size/1000).toFixed(1) + 'kb';
				} else if (item.size >= 1000000 && item.size < 1000000000){
					item.size = (item.size/1000000).toFixed(1) + 'mb';
				}

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
                  .html(item.name + ' <span class="file-list-size">' + item.size + '</span>')
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
                  .attr('data_name', item.name)
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
              var subListItem = $('<li></li>')
                    .addClass('source-text')
                    .text(child.name)
                    .data('file', item.name + "/" + child.name)
                    .on('click', (e) => this.openFile(e));
              var deleteButton = $('<button></button>')
                    .addClass('file-delete file-button fileManager')
                    .attr('title', 'Delete')
                    .attr('data-func', 'deleteFile')
                    .attr('data-name', item.name + '/' + child.name)
                    .appendTo(subListItem)
                    .on('click', (e) => this.deleteFile(e));
              var renameButton = $('<button></button>')
                    .addClass('file-rename file-button fileManager')
                    .attr('title', 'Rename')
                    .attr('data-func', 'renameFile')
                    .attr('data-name', child.name)
                    .attr('data-folder', item.name)
                    .appendTo(subListItem)
                    .on('click', (e) => this.renameFile(e));
    	        var downloadButton = $('<button></button>')
                    .addClass('file-download file-button fileManager')
                    .attr('href-stem', '/download?project=' + data.currentProject + '&file=')
                    .attr('data_name', item.name + '/' + child.name)
                    .appendTo(subListItem)
                    .on('click', (e, projName) => this.downloadFile(e, data.currentProject));
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
		var filename = $(e.target).attr('data_name');
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

	doFileUpload(file){

		if (uploadingFile){
			fileQueue.push(file);
			return;
		}
		uploadingFile = true;
		var fileExists = false;
		for (let item of this.listOfFiles){
			if (item.name === sanitise(file.name)) fileExists = true;
		}

		if (file.name === '_main.pd') forceRebuild = true;

		let next = () => {
			uploadingFile = false;
			this.processQueue();
		}
		// ensure that any of the cases below ends up either calling next() or calling
		// actuallyDoFileUpload(), which will eventually do the equivalent
		if (fileExists && askForOverwrite){
			popup.twoButtons({
				title: json.popups.overwrite.title,
				text: file.name + json.popups.overwrite.text,
				button: json.popups.overwrite.button,
			}, function onSubmit(e){
				if (popup.find('input[type=checkbox]').is(':checked')){
					askForOverwrite = false;
					overwriteAction = 'upload';
				}
				this.actuallyDoFileUpload(file, true);
			}.bind(this), function onCancel() {
				if (popup.find('input[type=checkbox]').is(':checked')){
					askForOverwrite = false;
					overwriteAction = 'reject';
				}
				forceRebuild = false;
				next();
			});
			let checkbox = '<input id="popup-remember-upload" type="checkbox"><label for="popup-remember-upload">' + json.popups.overwrite.tick + '</label<br\>';
			popup.form.prepend(checkbox);
			popup.find('.cancel').focus();

		} else if (fileExists && !askForOverwrite){

			if (overwriteAction === 'upload')
				this.actuallyDoFileUpload(file, !askForOverwrite);
			else {
				this.emit('file-rejected', 'upload failed, file '+file.name+' already exists.');
				next();
			}

		} else {
			this.actuallyDoFileUpload(file, !askForOverwrite);
		}
	}

  doLargeFileUpload(formData, force){
    var popupBlock = $('[data-popup-nointeraction]').addClass('active');
    var that = this;
    $.ajax({
      type: "POST",
      url: '/uploads',
      enctype: 'multipart/form-data',
      processData: false,
      contentType: false,
      data: formData,
      success: function(r){
        for(let entry of formData.entries()) {
          let fileName = entry[1].name.split('\\').pop();
          that.emit('message', 'project-event', {func: 'moveUploadedFile', sanitisedNewFile: sanitise(fileName), newFile: fileName});
        }
        $('body').removeClass('uploading');
        popupBlock.removeClass('active');
        popup.hide();
      },
      error: function(e) {
		oneButton({
			title: json.popups.upload_file_error.title,
			text: e,
		})
      }
    });
    this.emit('force-rebuild');
  }

	actuallyDoFileUpload(file, force){
		// ensure this eventually sets uploadingFile = false
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
						args.newFile = sanitise(file.name);
						args.fileData = ev.target.result;
						args.force = force;
						args.queue = fileQueue.length;
						this.emit('message', 'project-event', args);
					}
				}
				uploadingFile = false;
				this.processQueue();
		}
		// TODO: if something fails on the server(e.g.: project existing, file
		// cannot be written, whatev), the rest of the queue may not be handled
		// properly because the popup from the error will overwrite any active popup
		if (file.name.search(/\.zip$/) != -1) {
			let newProject = sanitise(file.name.replace(/\.zip$/, ""));
			popup.twoButtons({
				title: json.popups.create_new_project_from_zip.title + file.name,
				text: json.popups.create_new_project_from_zip.text,
				button: json.popups.create_new_project_from_zip.button,
			}, function onSubmit(e) {
				let val = popup.find('input[type=text]').val();
				if(!val)
					return;
				newProject = sanitise(val);
				reader.onloadend = onloadend.bind(this, 'uploadZipProject', { newProject: newProject });
				reader.readAsArrayBuffer(file);
			}, function onCancel() {
				onloadend(); // TODO: unclear to me why this works without a this or a bind
			});
			let projectNameInput =
				'<input type="text" data-name="newProjectName" placeholder="' + json.popups.create_new_project_from_zip.input + '" value="' + newProject + '" />'
				+ '<span class="input-already-existing"></span>'
				+ '<div class="input-sanitised"></div>'
				+ '<p class="create_file_subtext">' + json.popups.create_new_project_from_zip.sub_text + '</p>'
				+ '<br/><br/>';
			popup.form.prepend(projectNameInput);
			let input = $('input[data-name=newProjectName]', popup.form);
			let existingWarning = $('.input-already-existing', popup.form);
			let sanitisedWarning = $('.input-sanitised', popup.form);
			let validateName = (e) => {
				let projectList = this.getProjectList();
				let origName = input[0].value.trim();
				let sanName = sanitise(origName);
				if(sanName !== origName)
					sanitisedWarning.html(json.popups.create_new_project_from_zip.sanitised + sanName);
				else
					sanitisedWarning.html("");
				if(projectList.includes(sanName)) {
					existingWarning.html(json.popups.create_new_project_from_zip.exists);
					popup.disableSubmit();
				}
				else {
					existingWarning.html("");
					popup.enableSubmit();
				}
			};
			validateName();
			input.on('change keypress paste input', validateName);
		} else {
			reader.onloadend = onloadend.bind(this, 'uploadFile', {});
			reader.readAsArrayBuffer(file);
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

function isDir(item){
	return ((typeof item.size) === 'undefined' && (typeof item.children) !== 'undefined');
}

module.exports = FileView;
