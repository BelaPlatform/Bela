var View = require('./View');
var Range = ace.require('ace/range').Range;

const uploadDelay = 50;

var uploadBlocked = false;
var currentFile;
var imageUrl;
var activeWords = [];
var activeWordIDs = [];

class EditorView extends View {

	constructor(className, models){
		super(className, models);

		this.highlights = {};

		this.editor = ace.edit('editor');
		var langTools = ace.require("ace/ext/language_tools");

		this.parser = require('../parser');
		this.parser.init(this.editor, langTools);
		this.parser.enable(true);

		// set syntax mode
		this.on('syntax-highlighted', () => this.editor.session.setMode({ path: "ace/mode/c_cpp", v: Date.now() }));
		this.editor.session.setMode('ace/mode/c_cpp');
		this.editor.$blockScrolling = Infinity;

		// set theme
		this.editor.setTheme("ace/theme/chrome");
		this.editor.setShowPrintMargin(false);

		// autocomplete settings
		this.editor.setOptions({
			enableBasicAutocompletion: true,
			enableLiveAutocompletion: false,
			enableSnippets: true
		});

		// use hard tabs, not spaces
		this.editor.session.setOption('useSoftTabs', false);

		// this function is called when the user modifies the editor
		this.editor.session.on('change', (e) => {
			//console.log('upload', !uploadBlocked);
			if (!uploadBlocked){
				this.editorChanged();
				this.editor.session.bgTokenizer.fireUpdateEvent(0, this.editor.session.getLength());
				// console.log('firing tokenizer');
			}
		});

		// fired when the cursor changes position
		this.editor.session.selection.on('changeCursor', () => {
			this.getCurrentWord();
		});

		/*this.editor.session.on('changeBackMarker', (e) => {
			console.log($('.bela-ace-highlight'));
			$('.bela-ace-highlight').on('click', (e) => {
				console.log('click');
				this.getCurrentWord();
			});
		});*/

		this.on('resize', () => this.editor.resize() );

		this.on('add-link', (link, type) => {

			if (!this.highlights[type] || !this.highlights[type].length)
				this.highlights[type] = [];

			this.highlights[type].push(link);

			/*if (activeWords.indexOf(name) == -1){
				activeWords.push(name);
				activeWordIDs.push(id);
			}*/
			if (this.linkTimeout) clearTimeout(this.linkTimeout);
			this.linkTimeout = setTimeout(() => this.parser.highlights(this.highlights) )//this.emit('highlight-syntax', activeWords), 100);
		});

		this.editor.session.on('tokenizerUpdate', (e) => {
			// console.log('tokenizerUpdate');
			this.parser.parse( () => {
				this.getCurrentWord();
			});
		});

	}

	editorChanged(){
		this.emit('editor-changed');
		clearTimeout(this.uploadTimeout);
		this.uploadTimeout = setTimeout( () => this.emit('upload', this.editor.getValue()), uploadDelay );
	}

	// model events
	// new file saved
	__fileData(data, opts){

		// hide the pd patch and image displays if present, and the editor
		$('[data-svg-parent], [data-img-display-parent], [data-editor], [data-audio-parent]').css('display', 'none');

		if (!opts.fileType) opts.fileType = '0';

		if (opts.fileType.indexOf('image') !== -1){

			// opening image file
			$('[data-img-display-parent], [data-img-display]').css({
				'max-width'	: $('[data-editor]').width() + 'px',
				'max-height': $('[data-editor]').height() + 'px'
			});
			$('[data-img-display-parent]').css('display', 'block');

			$('[data-img-display]').prop('src', 'media/'+opts.fileName);

			// stop comparison with file on disk
			this.emit('compare-files', false);

		} else if (opts.fileType.indexOf('audio') !== -1){

			//console.log('opening audio file');

			$('[data-audio-parent]').css({
				'display'	: 'block',
				'max-width'	: $('[data-editor]').width() + 'px',
				'max-height': $('[data-editor]').height() + 'px'
			});

			$('[data-audio]').prop('src', 'media/' + opts.fileName);

			// stop comparison with file on disk
			this.emit('compare-files', false);

		} else {

			if (opts.fileType === 'pd'){

				// we're opening a pd patch
				let timestamp = performance.now();
				this.emit('open-notification', {
					func: 'editor',
					timestamp,
					text: 'This is a preview only. GUI objects will not be updated and you cannot edit the patch (yet).'
				});

				// render pd patch
				try{

					$('[data-pd-svg]').html(pdfu.renderSvg(pdfu.parse(data), {svgFile: false})).css({
						'max-width'	: $('[data-editor]').width() + 'px',
						'max-height': $('[data-editor]').height() + 'px'
					});

					$('[data-pd-svg-parent]').css({
						'display'	: 'block',
						'max-width'	: $('[data-editor]').width() + 'px',
						'max-height': $('[data-editor]').height() + 'px'
					});

					this.emit('close-notification', {timestamp});

				}
				catch(e){
					this.emit('close-notification', {
						timestamp,
						text: 'Rendering pd patch failed!'
					});
					throw e;
				}

				// load an empty string into the editor
				data = '';

				// start comparison with file on disk
				this.emit('compare-files', true);

			} else {

				// show the editor
				$('[data-editor]').css('display', 'block');

				// stop comparison with file on disk
				this.emit('compare-files', false);

			}

			// block upload
			uploadBlocked = true;

			// put the file into the editor
			this.editor.session.setValue(data, -1);

			// parse the data
			this.parser.parse();

			// unblock upload
			uploadBlocked = false;

			// force a syntax check
			this.emit('check-syntax');

			// focus the editor
			this.__focus(opts.focus);

		}

	}
	// editor focus has changed
	__focus(data){

		if (data && data.line !== undefined && data.column !== undefined)
			this.editor.gotoLine(data.line, data.column);

		this.editor.focus();
	}
	// syntax errors in current file have changed
	_currentFileErrors(errors){

		// clear any error annotations on the ace editor
		this.editor.session.clearAnnotations();

		if (errors.length >= 1){
			// errors exist!
			// annotate the errors in this file
			this.editor.session.setAnnotations(errors);

		}
	}
	// autocomplete settings have changed
	_liveAutocompletion(status){
	//console.log(status, (parseInt(status) === 1));
		this.editor.setOptions({
			enableLiveAutocompletion: (parseInt(status) === 1)
		});
	}
	// readonly status has changed
	_readOnly(status){
		if (status){
			this.editor.setReadOnly(true);
		} else {
			this.editor.setReadOnly(false);
		}
	}
	// a new file has been opened
	_fileName(name, data){
		currentFile = name;
	}

	getCurrentWord(){
		var pos = this.editor.getCursorPosition();
		//var range = this.editor.session.getAWordRange(pos.row, pos.column);
		/*var word = this.editor.session.getTextRange(this.editor.session.getAWordRange(pos.row, pos.column)).trim();
		var index = activeWords.indexOf(word);
		var id;
		if (index !== -1) id = activeWordIDs[index];
		//console.log(word, index);
		this.emit('goto-docs', index, word, id);*/

		var iterator = new TokenIterator(this.editor.getSession(), pos.row, pos.column);
		var token = iterator.getCurrentToken();
		if (!token || !token.range){
			//console.log('no range');
			this.emit('clear-docs');
			return;
		}

		//console.log('clicked', token);

		var markers = this.parser.getMarkers();
		for (let marker of markers){
			if (token.range.isEqual(marker.range) && marker.type && marker.type.name && marker.type.id){
				//console.log(marker);
				this.emit('goto-docs', marker.type.name, marker.type.id);
				return;
			}
		}

		this.emit('clear-docs');
	}

	getData(){
		return this.editor.getValue();
	}
}

module.exports = EditorView;
