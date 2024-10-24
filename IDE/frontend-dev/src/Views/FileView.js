var View = require('./View');
var popup = require('../popup');
var utils = require('../utils');
var sanitise = utils.sanitise;
var json = require('../site-text.json');
let sanitisePath = (name) => {
	return sanitise(name, { isPath: true, });
}
var prettySize = utils.prettySize;

var sourceIndeces = ['cpp', 'c', 's'];
var headerIndeces = ['h', 'hh', 'hpp'];
var imageIndeces = ['jpg', 'jpeg', 'png', 'gif'];
var absIndeces = ['pd'];
const overlayActiveClass = 'active-drag-upload';
let lastOverlay;

var askForOverwrite = true;
var uploadingFile = false;
var overwriteAction = '';
var fileQueue = [];
var largeFileQueue = [];
var viewHiddenFiles = false;
var firstViewHiddenFiles = true;

var listCount = 0;

function isDragEvent(e, type)
{
	return e.originalEvent.dataTransfer.types.includes(type);
}

// the old version of jQuery we are using cannot easily add/remove classes
// from svg elements. We need to work around that.
// See: https://stackoverflow.com/questions/8638621/jquery-svg-why-cant-i-addclass
// Solution below is (modified) from https://stackoverflow.com/a/24194877/2958741
/*
 * .addClassSVG(className)
 * Adds the specified class(es) to each of the set of matched SVG elements.
 */
$.fn.addClassSVG = function(className){
	$(this).attr('class', function(index, existingClassNames) {
		return ((existingClassNames !== undefined) ? (existingClassNames + ' ') : '') + className;
	});
	return this;
};

/*
 * .removeClassSVG(className)
 * Removes the specified class to each of the set of matched SVG elements.
 */
$.fn.removeClassSVG = function(className){
	$(this).attr('class', function(index, existingClassNames) {
	if(!existingClassNames)
		return '';
	var re = new RegExp(' *\\b' + className + '\\b', 'g');
		return existingClassNames.replace(re, '');
	});
	return this;
};

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

		this.folderItems = [];
		this.svg = $('[data-drag-svg]');
		let body = $('body');
		body.off('dragenter dragover drop dragleave');
		body.on('dragenter', (e) => {
			if(!isDragEvent(e, "Files"))
				return;
			this.buildOverlay();
			this.showOverlay();
		});
		this.svg.on('dragover dragleave drop', (e) => {
			if(!isDragEvent(e, "Files"))
				return;
			e.preventDefault();
			if('dragover' === e.type)
				return;
			if('drop' === e.type)
			{
				this.svg.addClassSVG('no');
				setTimeout(() => {
					this.hideOverlay();
					this.svg.removeClassSVG('no');
				}, 300);
			} else if ('dragleave' === e.type)
			{
				this.hideOverlay();
			}

		});
	}

	createDragPolygon(points, dataFunc, dataArg)
	{
		//let polygon = document.createElement("polygon");
		let polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
		this.svg.append(polygon);
		polygon = $(polygon);
		polygon.attr('data-drag-func', dataFunc);
		polygon.attr('data-drag-arg', dataArg);
		for(let point of points)
		{
			let p = this.svg[0].createSVGPoint();
			p.x = point[0];
			p.y = point[1];
			polygon[0].points.appendItem(p);
		}
		this.dragFileHandler(polygon, polygon);
		return polygon;
	}

	dragFileHandler(target, overlay)
	{
		let getAttr = (e, attr) => {
			return $(e.currentTarget).attr(attr);
		}
		// target is the element that starts the drag-drop gesture
		// overlay is the element which displays it.
		// the gesture starts when entering target and ends
		// when leaving _overlay_
		target.off('dragenter dragover drop dragleave');
		overlay.off('dragleave');
		overlay.on('dragleave', ((overlay, e) => {
			if(!isDragEvent(e, "Files"))
				return;
			overlay.removeClassSVG(overlayActiveClass);
		}).bind(this, overlay));
		// not sure we need dragover AND e.preventDefault() in order for drop to work
		// Not sure how that works, but this is hinted at here https://www.w3schools.com/jsref/event_ondrop.asp
		target.on('dragenter dragover drop', ((overlay, e) => {
			if(!isDragEvent(e, "Files"))
				return;
			e.stopPropagation();
			e.preventDefault();
			if ('dragenter' === e.type) {
				overlay.addClassSVG(overlayActiveClass);
			}
			else if (e.type == 'drop') {
				for (var i = 0; i < e.originalEvent.dataTransfer.files.length; i++){
					let file = e.originalEvent.dataTransfer.files[i];
					// the `data-drag-func=main` is the largest drop target.
					// For now, we make it behave exactly as if it was
					// `data-drag-func=folder data-drag-arg=''`
					// (i.e.: upload files to the project's root folder).
					let folder;
					let attr = getAttr(e, 'data-drag-func');
					if('main' === attr)
						folder = '';
					else if('folder' === attr)
						folder = getAttr(e, 'data-drag-arg');
					if('undefined' === typeof(folder))
						continue;
					file.folder = folder;
					file.overlay = overlay;
					fileQueue.push(file);
				}
				this.processQueue();
			}
			return false;
		}).bind(this, overlay));
	}

	buildOverlay() {
		this.svg.empty();
		// First, draw one polygon per each folder
		// do not draw outside the area of the"Directories" list
		// things are complicated by the presence of the scroll on the side tab.
		let title = $(".title-container");
		if(!title.length) // in case we are not ready yet, don't do anything
			return;
		let bar = $("#toolbar");
		let maxY = bar.offset().top - $(window).scrollTop();;
		let directories = $(".section.is-dir");
		let dirOffset = directories.offset() ? directories.offset().top : maxY; // if no directories, we will take up the whole surface so maxY = minY
		let minY = Math.max(dirOffset- $(window).scrollTop(),
					title.offset().top - $(window).scrollTop() + title.height());
		for(let listItem of this.folderItems)
		{
			let overlay = listItem;
			let folder = $("[data-folder]", listItem).attr('data-file');
			let offset = listItem.offset();
			let posY = offset.top - $(window).scrollTop();
			let posX = offset.left - $(window).scrollLeft();
			let wid = listItem.width();
			let hei = listItem.height();
			if(posY > maxY || posY + hei < minY)
				continue;
			if(posY + hei > maxY)
				hei = maxY - posY;
			if(posY < minY)
			{
				hei -= minY - posY
				posY = minY;
			}
			if(hei < 15)
				continue;
			let pol = this.createDragPolygon([
				[posX, posY],
				[posX + wid, posY],
				[posX + wid, posY + hei],
				[posX, posY + hei],
			], 'folder', folder);
		}
		// now draw a polygon that covers almost everything else.
		// We need a C-shaped polygon which skips the folder boxes above.
		// The C's "cutout" is delimited by minY, maxY and maxX
		let menu = $('[data-tab-menu]');
		let maxX = menu.offset().left + menu.width();
		let pol = this.createDragPolygon([
				[0, 0],
				[this.svg.width(), 0],
				[this.svg.width(), minY],
				[maxX, minY],
				[maxX, maxY],
				[this.svg.width(), maxY],
				[this.svg.width(), this.svg.height()],
				[0, this.svg.height()],
			], 'main', '');
	}

	showOverlay(){
		this.svg.addClassSVG(overlayActiveClass);
	}

	hideOverlay(){
		if(this.svg)
		{
			this.svg.removeClassSVG(overlayActiveClass);
			$('polygon', this.svg).removeClassSVG(overlayActiveClass);
		}
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
			initialValue: base ? base + '/' : '',
			getExistingValues: () => { return this._getFlattenedFileList(false); },
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
			getExistingValues: () => { return this._getFlattenedFileList(true); },
			strings: json.popups.create_new_folder,
			sanitise: sanitisePath,
		});
		if(null === name)
			return;
		this.emit('message', 'project-event', {func, newFolder: name});
	}

  uploadSizeError(name){
		let strings = Object.assign({}, json.popups.upload_size_error);
		strings.title = utils.formatString(strings.title, utils.breakable(name));
		this.hideOverlay();
		popup.twoButtons(strings,
			() =>{
				this.uploadFile();
			},
			undefined,
			{
				titleClass: 'error',
				error: true,
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
					utils.doLargeFileUpload(formData, (r) => {
						// would be great if these could be sent as part of the POST body
						// note: for drag-and-drop files, the equivalent to these is
						// done in ProjectManager::uploadFile on the server
						this.emit('list-files');
						this.emit('file-uploaded');
						popup.ok(json.popups.upload_file_success);
					}, (e) => {
						this.emit('list-files');
						popup.ok({
							title: json.popups.upload_file_error.title,
							text: e.responseText,
						});
					});
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
			getExistingValues: () => {
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
		strings.title = utils.formatString(strings.title, utils.breakable(name));
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
		this.folderItems = [];

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
                  .attr('data-file', item.name)
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
                  .attr('data-file', item.name)
                  .attr('data-folder', '')
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
                  .attr('data-file', path)
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
			this.folderItems.push(listItem);
          }
	      }
	      fileList.appendTo(section);
	      section.appendTo($files);
			}
		}
		this.buildOverlay(); // this is needed only in case an updated file list comes in while the overlay is active
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
		if(!uploadingFile && fileQueue.length)
		{
			setTimeout(() => {
				if(!uploadingFile && fileQueue.length)
				{
					let file = fileQueue.pop();
					// 20mb maximum drag and drop file size
					if (file.size >= 20000000) {
						// postpone large files
						largeFileQueue.push(file.name);
						// and keep going
						this.processQueue();
					} else {
						this.doFileUpload(file);
					}
				}
			}, 0);
		} else if(largeFileQueue.length)
		{
			// once we finished uploading the small files, print a
			// single error message for all of the large ones
			this.uploadSizeError(largeFileQueue.join('`, `'));
			largeFileQueue = [];
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

		let basePath = file.folder ? file.folder + '/' : '';
		let obj = await this.promptForOverwrite(basePath + sanitise(file.name));
		let saveas = null;
		let force = obj.force;
		if(obj.do) {
			let serverFunc;
			if (file.name.search(/\.zip$/) != -1) {
				let newProject = sanitise(file.name.replace(/\.zip$/, ""));
				let strings = Object.assign({}, json.popups.create_new_project_from_zip);
				strings.title += file.name;
				saveas = await popup.requestValidInputAsync({
					initialValue: newProject,
					getExistingValues: this.getProjectList,
					strings: strings,
					allowExisting: true,
					sanitise: sanitise,
				});
				serverFunc = "uploadZipProject";
			} else {
				saveas = basePath + sanitise(file.name);
			}
			if(null !== saveas)
				this.actuallyDoFileUpload(file, saveas, force, serverFunc);
		}
		lastOverlay = file.overlay;
		if(null === saveas) {
			// when the last file is actuallyDoFileUpload'ed above, the overlay is
			// removed there upon completion
			// If the last file in the queue is not uploaded, however, we have to
			// remove the overlay here
			if(!fileQueue.length)
				this.hideOverlay();
		}
		uploadingFile = false;
		this.processQueue();
	}


	async actuallyDoFileUpload(file, saveas, force, serverFunc){
		var reader = new FileReader();
		let onloadend = (func, args, ev) => {
				if(func && ev){
					if(ev.loaded != ev.total || ev.srcElement.error || ev.target.error || null === ev.target.result)
						this.emit('file-rejected', 'error while uploading '+file.name);
					else {
						args.func = func;
						args.fileData = ev.target.result;
						args.force = force;
						args.queue = fileQueue.length;
						this.emit('message', 'project-event', args);
					}
					if(!fileQueue.length) {
						this.hideOverlay();
					}
				}
		}
		// TODO: if something fails on the server(e.g.: project existing, file
		// cannot be written, whatev), the rest of the queue may not be handled
		// properly because the popup from the error will overwrite any active popup.
		// A reset may be required.
		if (serverFunc) {
			reader.onloadend = onloadend.bind(this, serverFunc, {
				newProject: saveas,
				newFile: saveas + '.zip',
			});
		} else {
			reader.onloadend = onloadend.bind(this, 'uploadFile', {
				newFile: saveas,
			});
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
