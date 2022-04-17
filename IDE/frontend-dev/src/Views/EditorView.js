var View = require('./View');
var Range = ace.require('ace/range').Range;
var json = require('../site-text.json');
var TokenIterator = ace.require("ace/token_iterator").TokenIterator;

const uploadDelay = 50;

var uploadBlocked = false;
let editorDirty = false;
var currentFile;
var imageUrl;
var tmpData = {};
var tmpOpts = {};
var activeWords = [];
var activeWordIDs = [];

class EditorView extends View {

	constructor(className, models, data){
		super(className, models);
		this.projectModel = models[0];

		this.highlights = {};
    var data = tmpData;
    var opts = tmpOpts;

		this.editor = ace.edit('editor');
		var langTools = ace.require("ace/ext/language_tools");

		this.parser = require('../parser');
		this.parser.init(this.editor, langTools);
		this.parser.enable(true);

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
		this.editor.renderer.setOptions({
			//this ensures that the offset to hide the scrollbar in #editor is constant
			vScrollBarAlwaysVisible: true,
		});


		// use hard tabs, not spaces
		this.editor.session.setOption('useSoftTabs', false);

		// this function is called when the user modifies the editor
		this.editor.session.on('change', (e) => {
			//console.log('upload', !uploadBlocked);
      var data = tmpData;
      var opts = tmpOpts;
			if (!uploadBlocked){
				this.editorChanged(false);
				this.editor.session.bgTokenizer.fireUpdateEvent(0, this.editor.session.getLength());
				// console.log('firing tokenizer');
			}
      // set syntax mode - defaults to text
      if (opts.fileType &&
          opts.fileType == "cpp" ||
          opts.fileType == "c" ||
          opts.fileType == "h" ||
          opts.fileType == "hh" ||
          opts.fileType == "hpp" ||
          opts.fileType == "cc" ) {
        this.editor.session.setMode('ace/mode/c_cpp');
      } else if (opts.fileType && opts.fileType == "js") {
    		this.editor.session.setMode('ace/mode/javascript');
      } else if (opts.fileType && opts.fileType == "csd") {
        this.editor.session.setMode('ace/mode/csound_document');
      } else if (opts.fileType && opts.fileType == "scd") {
        this.editor.session.setMode('ace/mode/supercollider');
      } else {
        // if we don't know what the file extension is just default to plain text
        this.editor.session.setMode('ace/mode/text');
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

		this.on('resize', () => {
			this.editor.resize();
			var data = tmpData;
			var opts = tmpOpts;
			if (opts.fileType && (
				opts.fileType == "pd"
				|| opts.fileType.indexOf('image') !== -1)
			) {
				this.__fileData(data, opts);
			}
		});

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

    this.on('search', this.search);

	}

  search(){
    this.editor.execCommand('find');
  }

	flush(){
		this.editorChanged(true);
	}
	editorChanged(flush){
		this.emit('editor-changed');
		clearTimeout(this.uploadTimeout);
		let doUpdate = () => {
			editorDirty = false;
			this.emit('upload', this.editor.getValue());
		}
		if(flush) {
			if(editorDirty)
				doUpdate();
		}
		else {
			editorDirty = true;
			this.uploadTimeout = setTimeout(doUpdate, uploadDelay);
		}
	}

	// model events
	// new file saved
	__fileData(data, opts){
	// hide the pd patch and image displays if present, and the editor
	let allAltSelectors = [
		'data-img-display-parent', 'data-img-display',
		'data-audio-parent', 'data-audio',
		'data-pd-svg-parent', 'data-pd-svg',
		'data-editor-msg-parent', 'data-editor-msg',
	];
	allAltSelectors = '['+allAltSelectors.join('], [')+']'; // turn them into valid jquery selectors
	let allEditorAlts = $(allAltSelectors);
	allEditorAlts.removeClass('active');
	$('[data-editor]').removeClass('active');

	allEditorAlts.css({
		'max-width'	: $('[data-editor]').width() + 'px',
		'max-height': ($('[data-editor]').height() - 2) + 'px' // -2 because it makes for a better Pd patch
		});
    tmpData = data;
    tmpOpts = opts;

	this.modelChanged({readOnly: true}, ['readOnly']);
	this.modelChanged({openElsewhere: false}, ['openElsewhere']);

		this.projectModel.setKey('readOnly', true);
		if (!opts.fileType) opts.fileType = '0';

		if (null === data || null === opts.fileName) { // file was deleted
				// print a warning in the pd div. This is so that we don't need
				// special handling of yet another div
				$('[data-editor-msg]').html(json.editor_view.deleted.error);
				$('[data-editor-msg-parent]').addClass('active');
		} else if (opts.fileType.indexOf('image') !== -1){

			// opening image file
			$('[data-img-display-parent]').addClass('active');

			$('[data-img-display]').prop('src', 'media/'+opts.fileName);

			// stop comparison with file on disk
			this.emit('compare-files', false);

		} else if (opts.fileType.indexOf('audio') !== -1){

      $('[data-audio-parent]')
      .addClass('active')
      .css({
        'position': 'absolute',
				'left'	: ($('[data-editor]').width() / 2) - ($('[data-audio]').width() / 2)  + 'px',
				'top': ($('[data-editor]').height() / 2) - ($('[data-audio]').height() / 2) + 'px'
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
					text: json.editor_view.preview
				});

				// render pd patch
				try {
					$('[data-pd-svg]').html(pdfu.renderSvg(pdfu.parse(data), {svgFile: false}))
					$('[data-pd-svg-parent]').addClass('active');
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

			} else if ('binary' === opts.fileType) {
				// print a warning in the pd div like above
				$('[data-editor-msg]').html(json.editor_view.binary.error);
				$('[data-editor-msg-parent]').addClass('active');
			} else {

				this.projectModel.setKey('readOnly', false);
				// show the editor
				$('[data-editor]').addClass('active');

				// stop comparison with file on disk
				this.emit('compare-files', false);

			}

			// block upload
			uploadBlocked = true;

			// put the file into the editor
			if('string' !== typeof(data))
				data = ''; // if no data, at least empty the editor
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

	_openElsewhere(status){
		const magic = 23985235;
		this.projectModel.setKey('readOnly', status);
		if(status) {
			$('#editor').on('keypress', (e) => {
				this.emit('console-brief', json.editor_view.keypress_read_only, magic);
			});
		} else {
			$('#editor').off('keypress');
		}
	}

	// readonly status has changed
	_readOnly(status){
		if (status){
			$('.ace_content').addClass('editor_read_only');
			this.editor.setReadOnly(true);
		} else {
			$('.ace_content').removeClass('editor_read_only');
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
