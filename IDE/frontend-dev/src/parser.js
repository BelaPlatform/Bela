var Range = ace.require('ace/range').Range;
var Anchor = ace.require('ace/anchor').Anchor;
var buf = new (require('./CircularBuffer'))(5);
for (let i=0; i<buf.capacity(); i++) buf.enq({});
var TokenIterator = ace.require("ace/token_iterator").TokenIterator;
var editor;

var parsingDeclaration = false;
var parsingBody = false;
var parsing;

var parensCount = 0;

var includes = [];
var typedefs = [];
var markers = [];

var highlights = {};

var contextType;
var contextName;

var parser = {
	init(ed, langTools){
		editor = ed;
		this.enabled = false;
		this.langTools = langTools;
	},

	enable(status){
		this.enabled = status;
		this.doParse();
	},

	highlights(hls){
		highlights = hls;
		if (!hls.contextType || !hls.contextType.length){
			console.log('parser aborted');
			return;
		}
		contextType = hls.contextType[0].name;
		highlights.typerefs = [];
		//console.log(highlights);

		this.doParse();

		this.autoComplete();
	},

	autoComplete(){
		if (!contextName) return;

		// context
		var contextAutocompleteWords = [];
		for (let item of highlights[contextName]){
			contextAutocompleteWords.push(contextName+'->'+item.name);
		}
		var contextWordCompleter = {
			getCompletions: function(editor, session, pos, prefix, callback) {
				callback(null, contextAutocompleteWords.map(function(word) {
					return {
						caption: word,
						value: word,
						meta: 'BelaContext'
					};
				}));

			}
		}
		this.langTools.addCompleter(contextWordCompleter);

		// class members
		var classAutocompleteWords = [];
		if(highlights['typedef']) {
			for (let typedef of highlights['typedef']){
				classAutocompleteWords.push(typedef.name);
			}
		}
		if(highlights['typerefs']) {
			for (let typeref of highlights['typerefs']){
				for (let item of highlights[typeref.id.name]){
					classAutocompleteWords.push(typeref.name+'.'+item.name);
				}
			}
		}
		var classWordCompleter = {
			getCompletions: function(editor, session, pos, prefix, callback) {
				callback(null, classAutocompleteWords.map(function(word) {
					return {
						caption: word,
						value: word,
						meta: 'Bela'
					};
				}));

			}
		}
		this.langTools.addCompleter(classWordCompleter);

		// utilities
		var utilityAutocompleteWords = [];
		for (let utility of highlights['utility']){
			utilityAutocompleteWords.push(utility.name);
		}
		var utilityWordCompleter = {
			getCompletions: function(editor, session, pos, prefix, callback) {
				callback(null, utilityAutocompleteWords.map(function(word) {
					return {
						caption: word,
						value: word,
						meta: 'Utilities'
					};
				}));

			}
		}
		this.langTools.addCompleter(utilityWordCompleter);
	},

	getMarkers(){
		return markers;
	},

	getIncludes(){
		return includes;
	},

	parse(callback){

		if (this.parseTimeout) clearTimeout(this.parseTimeout);
		this.parseTimeout = setTimeout( () => this.doParse(callback), 100);

	},

	doParse(callback){
		for (let marker of markers){
			editor.session.removeMarker(marker.id);
		}
		if (!this.enabled) return;
		// console.time('parse time');

		var iterator = new TokenIterator(editor.getSession(), 0, 0);
		var token = iterator.getCurrentToken();

		// are we parsing a file with Bela API included?
		var parsingAPI = false;

		includes = [];
		typedefs = [];
		markers = [];

		while (token) {

			token.range = new Range(iterator.getCurrentTokenRow(), iterator.getCurrentTokenColumn(), iterator.getCurrentTokenRow(), iterator.getCurrentTokenColumn()+token.value.length);
			//console.log(token);

			if (parsingDeclaration){
				parseDeclaration(token);
			} else if (parsingBody){
				parseBody(token);
			} else {

				// typedefs
				if (typedefs.length &&
						buf.get(1).type === 'identifier' && typedefs.indexOf(buf.get(1).value) !== -1 &&
						buf.get(0).type === 'text' && buf.get(0).value === ' ' &&
						token.type === 'identifier'){
					let link = highlights['typedef'][searchHighlightsFor('typedef', buf.get(1).value)];
					addMarker(buf.get(1), link);
					highlights.typerefs.push({
						name: 	token.value,
						id: 	link
					});
				}

				// includes
				if (buf.get(0).type === 'keyword' && buf.get(0).value === '#include'){

					let include = token.value.split('<').pop().split('>')[0].split('.')[0];

					if (include === 'Bela') parsingAPI = true;

					if (searchHighlightsFor('header', include) !== -1){
						includes.push(include);
						if (searchHighlightsFor('typedef', include) !== -1){
							typedefs.push(include);
						}
					}

				// function detection
				} else if (parsingAPI &&
						buf.get(1).type === 'storage.type' && buf.get(1).value === 'bool' &&
						buf.get(0).type === 'text' && buf.get(0).value === ' ' &&
						token.type === 'identifier' && token.value === 'setup' ){
					//console.log('parsing declaration of setup');
					parsingDeclaration = true;
					parsing = token.value;
					if (highlights['api']) addMarker(token, highlights['api'][searchHighlightsFor('api', 'setup')]);
				} else if (parsingAPI &&
						buf.get(1).type === 'storage.type' && buf.get(1).value === 'void' &&
						buf.get(0).type === 'text' && buf.get(0).value === ' ' &&
						token.type === 'identifier' && token.value === 'render' ){
					//console.log('parsing declaration of  render');
					parsingDeclaration = true;
					parsing = token.value;
					if (highlights['api']) addMarker(token, highlights['api'][searchHighlightsFor('api', 'render')]);
				} else if (parsingAPI &&
						buf.get(1).type === 'storage.type' && buf.get(1).value === 'void' &&
						buf.get(0).type === 'text' && buf.get(0).value === ' ' &&
						token.type === 'identifier' && token.value === 'cleanup' ){
					//console.log('parsing declaration of  cleanup');
					parsingDeclaration = true;
					parsing = token.value;
					if (highlights['api']) addMarker(token, highlights['api'][searchHighlightsFor('api', 'cleanup')]);
				}

			}

			//if (highlights && highlights.typerefs && highlights.typerefs.length){
				let index = searchHighlightsFor('typerefs', token.value);
				if (index !== -1){
					addMarker(token, highlights['typerefs'][index].id);
				} else if (buf.get(1).type === 'identifier'){
					let index = searchHighlightsFor('typerefs', buf.get(1).value);
					//console.log('typeref index', index, token.value);
					if (index !== -1 &&
							buf.get(0).type === 'punctuation.operator' && buf.get(0).value === '.'){
						let typedef = highlights['typerefs'][index].id.name;
						//let newIndex = searchHighlightsFor(typedef, token.value);
						//console.log(newIndex, highlights[typedef][newIndex]);
						addMarker(token, highlights[typedef][searchHighlightsFor(typedef, token.value)]);
					}
				}


			//}


			buf.enq(token);
			token = iterator.stepForward();

		}

		if (callback) callback();

		//console.log('includes', includes);
		//console.log('typedefs', typedefs);
		//console.log('markers', markers);
		//console.log(editor.session.getMarkers());
		//console.timeEnd('parse time');
	}
};

function parseDeclaration(token){
	if (token.type === 'paren.lparen' && token.value === '('){
		parensCount += 1;
	} else if (token.type === 'paren.rparen' && token.value === ')'){
		parensCount -= 1;
		if (parensCount <= 0){
			parensCount = 0;
			// console.log('parsing body of', parsing);
			parsingDeclaration = false;
			parsingBody = true;
		}
	} else if (
			buf.get(0).type === 'keyword.operator' && buf.get(0).value === '*' &&
			buf.get(1).type === 'text' && buf.get(1).value === ' ' &&
			buf.get(2).type === 'identifier' && buf.get(2).value === contextType ){
		contextName = token.value;
		// console.log('contextName', contextName);
		addMarker(token, highlights.contextType[0]);
		addMarker(buf.get(2), highlights.contextType[0]);
	}
}

function parseBody(token){
	if (token.type === 'paren.lparen' && token.value === '{'){
		parensCount += 1;
	} else if (token.type === 'paren.rparen' && token.value === '}'){
		parensCount -= 1;
		if (parensCount <= 0){
			parensCount = 0;
			// console.log('finished parsing body of', parsing);
			parsingBody = false;
		}
	} else if (token.type === 'identifier' && token.value === contextName){
		// console.log('context!');
		addMarker(token, highlights.contextType[0]);
	} else if (
			buf.get(1).type === 'identifier' && buf.get(1).value === contextName &&
			buf.get(0).type === 'keyword.operator' && buf.get(0).value === '->'){
		let index = searchHighlightsFor(contextName, token.value);
		if (index !== -1) addMarker(token, highlights[contextName][index]);
	} else if (token.type === 'identifier'){
		let index = searchHighlightsFor('utility', token.value);
		if (index !== -1) addMarker(token, highlights['utility'][index]);
	}
}

function addMarker(token, type){
	var range = token.range;
	var marker = {
		token,
		type,
		range,
		id: 	editor.session.addMarker(range, "bela-ace-highlight", "text")//,
		//anchor:	new Anchor(editor.session.doc, range.start.row, range.start.column)
	};
	/*marker.anchor.on('change', function(e){
		range.setStart(e.value.row, e.value.column);
		range.setEnd(e.value.row, e.value.column + token.value.length);
	});*/
	markers.push(marker);
}

function searchHighlightsFor(sub, val){
	//console.log('searching', sub)
	//console.log(highlights[sub]);
	//console.log('for', val);
	if (!highlights || !highlights[sub]) return -1;
	for (let item of highlights[sub]){
		if (item.name === val){
			return highlights[sub].indexOf(item);
		}
	}
	return -1;
}

module.exports = parser;
