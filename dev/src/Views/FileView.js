var View = require('./View');
var popup = require('../popup');
var sanitise = require('../utils').sanitise;
var json = require('../site-text.json');

var sourceIndeces = ['cpp', 'c', 'S'];
var headerIndeces = ['h', 'hh', 'hpp'];

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

		var data = {
			fileName: "",
			project: ""
		};

		// hack to upload file
    $('[data-upload-file-input]').on('change', (e) => {
  			for (var i=0; i < e.target.files.length; i++){
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
	buttonClicked($element){
		var func = $element.data().func;
		if (func && this[func]){
			this[func](func);
		}
	}

	newFile(func, base){
		popup.title(json.popups.create_new_file.title);
		popup.subtitle(json.popups.create_new_file.text);
		var form = [];
		form.push('<input type="text" placeholder="' + json.popups.create_new_file.input + '">');
		form.push('</br >');
		form.push('<button type="submit" class="button popup confirm">' + json.popups.create_new_file.button + '</button>');
		form.push('<button type="button" class="button popup cancel">' + json.popups.generic.cancel + '</button>');

		popup.form.append(form.join('')).off('submit').on('submit', e => {
			e.preventDefault();
      if (!base) {
        this.emit('message', 'project-event', {func, newFile: sanitise(popup.find('input[type=text]').val())});
      } else {
        this.emit('message', 'project-event', {func, newFile: sanitise(popup.find('input[type=text]').val()), folder: base});
      }
			popup.hide();
		});

		popup.find('.cancel').on('click', popup.hide );

		popup.show();

	}

  newFolder(func){
		// build the popup content
		popup.title(json.popups.create_new_folder.title);
		popup.subtitle(json.popups.create_new_folder.text);

		var form = [];
    form.push('<input type="hidden"></input>');
		form.push('<input type="text" placeholder="' + json.popups.create_new_folder.input + '">');
		form.push('</br >');
		form.push('<button type="submit" class="button popup confirm">' + json.popups.create_new_folder.button + '</button>');
		form.push('<button type="button" class="button popup cancel">' + json.popups.generic.cancel + '</button>');

		popup.form.append(form.join('')).off('submit').on('submit', e => {
			e.preventDefault();
			this.emit('message', 'project-event', {func, newFolder: sanitise(popup.find('input[type=text]').val())});
			popup.hide();
		});

		popup.find('.cancel').on('click', popup.hide );

		popup.show();

	}

	uploadFile(func){
		$('[data-upload-file-input]').trigger('click');
	}

	renameFile(e){
		// Get the name of the file to be renamed:
		var name = $(e.target).data('name');
    var func = $(e.target).data('func');
    var folder = $(e.target).data('folder');
		// build the popup content
		popup.title('Rename ' + name + '?');
		popup.subtitle(json.popups.rename_file.text);

		var form = [];
		form.push('<input type="text" placeholder="' + json.popups.rename_file.input + '">');
		form.push('</br >');
		form.push('<button type="submit" class="button popup confirm">' + json.popups.rename_file.button + '</button>');
		form.push('<button type="button" class="button popup cancel">' + json.popups.generic.cancel + '</button>');

		popup.form.append(form.join('')).off('submit').on('submit', e => {
			e.preventDefault();
			var newName = sanitise(popup.find('input[type=text]').val());
			this.emit('message', 'project-event', {func: 'renameFile', folderName: folder, oldName: name, newFile: newName});
			popup.hide();
		});

		popup.find('.cancel').on('click', popup.hide );

		popup.show();

	}

  renameFolder(e){
    // Get the name of the file to be renamed:
		var name = $(e.target).data('name');
    var func = $(e.target).data('func');
		// build the popup content
		popup.title('Rename ' + name + '?');
		popup.subtitle(json.popups.rename_folder.text);

		var form = [];
		form.push('<input type="text" placeholder="' + json.popups.rename_folder.input + '">');
		form.push('</br >');
		form.push('<button type="submit" class="button popup confirm">' + json.popups.rename_folder.button + '</button>');
		form.push('<button type="button" class="button popup cancel">' + json.popups.generic.cancel + '</button>');

		popup.form.append(form.join('')).off('submit').on('submit', e => {
			e.preventDefault();
			var newName = sanitise(popup.find('input[type=text]').val());
			this.emit('message', 'project-event', {func: 'renameFolder', oldName: name, newFolder: newName});
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
		form.push('<button type="button" class="button popup cancel">' + json.popups.generic.cancel + '</button>');

		popup.form.append(form.join('')).off('submit').on('submit', e => {
			e.preventDefault();
			this.emit('message', 'project-event', {func: 'deleteFile', fileName: name});
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
		resources.sort( (a, b) => a.name - b.name );
		directories.sort( (a, b) => a.name - b.name );

		var file_list_elements = [ sources, headers, resources, directories ];
    file_list_elements[0].name = json.file_view.sources;
    file_list_elements[1].name = json.file_view.headers;
    file_list_elements[2].name = json.file_view.resources;
    file_list_elements[3].name = json.file_view.directories;
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

	// subDirs(dir){
	// 	var ul = $('<ul></ul>').html(dir.name + ':');
	// 	for (let child of dir.children){
	// 		if (!isDir(child)){
	// 			if (child.size < 1000000){
	// 				child.size = (child.size/1000).toFixed(1) + 'kb';
	// 			} else if (child.size >= 1000000 && child.size < 1000000000){
	// 				child.size = (child.size/1000000).toFixed(1) + 'mb';
	// 			}
	// 			$('<li></li>').addClass('source-file').html(child.name + '<span class="file-list-size">' + child.size + '</span>').data('file', (dir.dirPath || dir.name) + '/' + child.name).appendTo(ul).on('click', (e) => this.openFile(e));
	// 		} else {
	// 			child.dirPath = (dir.dirPath || dir.name) + '/' + child.name;
	// 			ul.append(this.subDirs(child));
	// 		}
	// 	}
	// 	return ul;
	// }

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
			form.push('<button type="button" class="button popup cancel">' + json.popups.generic.cancel + '</button>');

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
