var View = require('./View');
var popup = require('../popup');
var sanitise = require('../utils').sanitise;
var json = require('../site-text.json');

var sourceIndeces = ['cpp', 'c', 'S'];
var headerIndeces = ['h', 'hh', 'hpp'];
var imageIndeces = ['jpg', 'jpeg', 'png'];

var askForOverwrite = true;
var uploadingFile = false;
var overwriteAction = '';
var fileQueue = [];
var forceRebuild = false;
var viewHiddenFiles = false;
var firstViewHiddenFiles = true;

var listCount = 0;

class FileView extends View {

	constructor(className, models){
		super(className, models);

		this.listOfFiles = [];

		// hack to upload file
    $('[data-upload-file-input]').on('change', (e) => {
			for (var i=0; i < e.target.files.length; i++){
				this.doFileUpload(e.target.files[i]);
			}
		});

    var data = {
      fileName: "",
      project: ""
    };

		// drag and drop file upload on editor
		$('body').on('dragenter dragover drop dragleave dragexit', (e) => {
			e.stopPropagation();
			e.preventDefault();
      if (e.type == 'dragenter') {
        $('[data-overlay]').addClass('active')
                           .addClass('drag-upload');
      }
			if (e.type === 'drop'){
				for (var i = 0; i < e.originalEvent.dataTransfer.files.length; i++){
          console.log(e.originalEvent.dataTransfer.files[i].size);
          // 20mb maximum drag and drop file size
          if (e.originalEvent.dataTransfer.files[i].size >= 20000000) {
            $('[data-overlay]').addClass('no');
            setTimeout(function(){
              $('[data-overlay]').removeClass('active')
                                 .removeClass('drag-upload')
                                 .removeClass('no');
            }, 1500);
          } else {
            this.doFileUpload(e.originalEvent.dataTransfer.files[i]);
          }
          if (i == e.originalEvent.dataTransfer.files.length - 1) {
            setTimeout(function(){
              $('[data-overlay]').removeClass('active')
                                 .removeClass('drag-upload')
                                 .removeClass('no');
            }, 1500);
          }
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
		popup.title(json.popups.create_new_file.title);
		popup.subtitle(json.popups.create_new_file.text);

		var form = [];
		form.push('<input type="text" placeholder="' + json.popups.create_new_file.input + '">');
		form.push('</br >');
		form.push('<button type="submit" class="button popup confirm">' + json.popups.create_new_file.button + '</button>');
		form.push('<button type="button" class="button popup cancel">' + json.popups.cancel + '</button>');

		popup.form.append(form.join('')).off('submit').on('submit', e => {
			e.preventDefault();
			this.emit('message', 'project-event', {func, newFile: sanitise(popup.find('input[type=text]').val())});
			popup.hide();
		});

		popup.find('.cancel').on('click', popup.hide );

		popup.show();

	}

  uploadError(){
    // build the popup content
    popup.title("Error: No file selected for upload")
         .addClass("error");
    popup.subtitle("No file was selected for upload");

    var form = [];
    form.push('</br >');
		form.push('<button type="submit" class="button popup confirm">' + "Try Again" + '</button>');
		form.push('<button type="button" class="button popup cancel">' + json.popups.cancel + '</button>');
    popup.form.append(form.join('')).off('submit').on('submit', e => {
      e.preventDefault();
      popup.hide();
      this.uploadFile();
    });
    popup.show();
  }

	uploadFile(func){
    // build the popup content
		popup.title(json.popups.upload_file.title);
		popup.subtitle(json.popups.upload_file.text);

		var form = [];
    $('[data-popup] form').attr('action', '/uploads')
                          .attr('enctype','multipart/form-data')
                          .attr('method', 'POST');
    form.push('<input type="file" name="data" data-form-file></input>');
		form.push('</br >');
    form.push('</br >');
		form.push('<button type="submit" class="button popup confirm">' + json.popups.upload_file.button + '</button>');
		form.push('<button type="button" class="button popup cancel">' + json.popups.cancel + '</button>');

		popup.form.append(form.join('')).off('submit').on('submit', e => {
			e.preventDefault();
      var file = $('[data-form-file]')[0];
      var location = '/projects/basic';
      var formEl = $('[data-popup] form')[0];
      var formData = new FormData(formEl);
      var popupBlock = $('[data-popup-nointeraction]');
      if (file.value.length > 0) {
        popupBlock.addClass('active');
        $('body').addClass('uploading');
        popupBlock.addClass('active');
        popup.find('.confirm')
             .attr('disabled', true);
        this.doLargeFileUpload(formData, file, location);
      } else {
        popup.hide();
        this.uploadError();
      }
		});

		popup.find('.cancel').on('click', popup.hide );

		popup.show();

	}
	renameFile(e){
		// Get the name of the file to be renamed:
		var name = $(e.target).data('name');
	var func = $(e.target).data('func');
		// build the popup content
		popup.title('Rename ' + name + '?');
		popup.subtitle(json.popups.rename_file.text);

		var form = [];
		form.push('<input type="text" placeholder="' + json.popups.rename_file.input + '">');
		form.push('</br >');
		form.push('<button type="submit" class="button popup confirm">' + json.popups.rename_file.button + '</button>');
		form.push('<button type="button" class="button popup cancel">Cancel</button>');

		popup.form.append(form.join('')).off('submit').on('submit', e => {
			e.preventDefault();
			var newName = sanitise(popup.find('input[type=text]').val());
			this.emit('message', 'project-event', {func: 'renameFile', oldName: name, newFile: newName});
			popup.hide();
		});

		popup.find('.cancel').on('click', popup.hide );

		popup.show();

	}

	deleteFile(e){
		// Get the name of the file to be deleted:
		var name = $(e.target).data('name');
    var func = $(e.target).data('func');
		// build the popup content
		popup.title('Delete ' + name + '?');
		popup.subtitle(json.popups.delete_file.text);

		var form = [];
		form.push('<button type="submit" class="button popup delete">' + json.popups.delete_file.button + '</button>');
		form.push('<button type="button" class="button popup cancel">Cancel</button>');

		popup.form.append(form.join('')).off('submit').on('submit', e => {
			e.preventDefault();
			this.emit('message', 'project-event', {func: 'deleteFile', fileName: name, currentFile: $('[data-current-file]')[0].innerText});
			popup.hide();
		});

		popup.find('.cancel').on('click', popup.hide );

		popup.show();

		popup.find('.delete').trigger('focus');

	}

	openFile(e){
		this.emit('message', 'project-event', {func: 'openFile', newFile: $(e.currentTarget).data('file')})
	}

	// model events
	_fileList(files, data){

		this.listOfFiles = files;

		var $files = $('[data-file-list]')
		$files.empty();

		if (!files.length) return;

		var headers = [];
		var sources = [];
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
		images.sort( (a, b) => a.name - b.name );
		resources.sort( (a, b) => a.name - b.name );
		directories.sort( (a, b) => a.name - b.name );

		var file_list_elements = [ sources, headers, images, resources, directories ];
		var file_list_elements_names = [ 'Sources', 'Headers', 'Images', 'Resources', 'Directories' ];

		// Build file structure by listing the contents of each section (if they exist)

		for (let i = 0; i < file_list_elements.length; i++) {

			if (file_list_elements[i].length) {

				var section = $('<li></li>');
				$('<p></p>').addClass('file-heading').html(file_list_elements_names[i]).appendTo(section);
				var fileList = $('<ul></ul>').addClass('sub-file-list');

				for (let j = 0; j < file_list_elements[i].length; j++) {
	        var listItem = $('<li></li>').addClass('source-file').appendTo(fileList);
	        var itemData = $('<div></div>').addClass('source-data-container').appendTo(listItem);
	        var itemText = $('<div></div>').addClass('source-text').data('file', file_list_elements[i][j].name).appendTo(itemData).on('click', (e) => this.openFile(e));
	        $(itemText).prepend('<p>' + file_list_elements[i][j].name + '</p> <span class="file-list-size">' + file_list_elements[i][j].size + '</span>');

	        var buttons = $('<div></div>').addClass('buttons').appendTo(itemData);
	        var renameButton = $('<button></button>').addClass('file-rename file-button fileManager').attr('title', 'Rename').attr('data-func', 'renameFile').attr('data-name', file_list_elements[i][j].name).appendTo(buttons).on('click', (e) => this.renameFile(e));
	        var downloadButton = $('<button></button>').addClass('file-download file-button fileManager').attr('href-stem', '/download?project=' + data.currentProject + '&file=').attr('data_name', file_list_elements[i][j].name).appendTo(buttons).on('click', (e, projName) => this.downloadFile(e, data.currentProject));
	        var deleteButton = $('<button></button>').addClass('file-delete file-button fileManager').attr('title', 'Delete').attr('data-func', 'deleteFile').attr('data-name', file_list_elements[i][j].name).appendTo(buttons).on('click', (e) => this.deleteFile(e));
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

	subDirs(dir){
		var ul = $('<ul></ul>').html(dir.name + ':');
		for (let child of dir.children){
			if (!isDir(child)){
				if (child.size < 1000000){
					child.size = (child.size/1000).toFixed(1) + 'kb';
				} else if (child.size >= 1000000 && child.size < 1000000000){
					child.size = (child.size/1000000).toFixed(1) + 'mb';
				}
				$('<li></li>').addClass('source-file').html(child.name + '<span class="file-list-size">' + child.size + '</span>').data('file', (dir.dirPath || dir.name) + '/' + child.name).appendTo(ul).on('click', (e) => this.openFile(e));
			} else {
				child.dirPath = (dir.dirPath || dir.name) + '/' + child.name;
				ul.append(this.subDirs(child));
			}
		}
		return ul;
	}

	doFileUpload(file){

		if (uploadingFile){
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
			popup.title(json.popups.overwrite.title);
			popup.subtitle(file.name + json.popups.overwrite.text);

			var form = [];
			form.push('<input id="popup-remember-upload" type="checkbox">');
			form.push('<label for="popup-remember-upload">' + json.popups.overwrite.tick + '</label>')
			form.push('</br >');
			form.push('<button type="submit" class="button confirm">' + json.popups.overwrite.button + '</button>');
			form.push('<button type="button" class="button cancel">Cancel</button>');

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

			popup.find('.cancel').on('click', () => {
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

			popup.find('.cancel').focus();

		} else if (fileExists && !askForOverwrite){

			if (overwriteAction === 'upload')
				this.actuallyDoFileUpload(file, !askForOverwrite);
			else {
				this.emit('file-rejected', file.name);
			}

			if (fileQueue.length) this.doFileUpload(fileQueue.pop());

		} else {

			this.actuallyDoFileUpload(file, !askForOverwrite);
			if (fileQueue.length) this.doFileUpload(fileQueue.pop());

		}
	}

  doLargeFileUpload(formData, file, location, force){
    var fileName = file.value.split('\\').pop();
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
        that.emit('message', 'project-event', {func: 'moveUploadedFile', sanitisedNewFile: sanitise(fileName), newFile: fileName});
        $('body').removeClass('uploading');
        popupBlock.removeClass('active');
        popup.hide();
      },
      error: function(e) {
        popup.hide();
        popup.title(json.popups.upload_file_error.title);
    		popup.subtitle(e);

    		var form = [];
    		form.push('<button type="button" class="button popup cancel">' + json.popups.cancel + '</button>');

    		popup.find('.cancel').on('click', popup.hide );
        $('body').removeClass('uploading');
        popupBlock.removeClass('active');
    		popup.show();
      }
    });
    this.emit('force-rebuild');
  }

	actuallyDoFileUpload(file, force){
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

function isDir(item){
	return ((typeof item.size) === 'undefined' && (typeof item.children) !== 'undefined');
}

module.exports = FileView;
