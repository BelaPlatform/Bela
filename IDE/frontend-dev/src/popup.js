var json = require('./site-text.json');

var overlay	= $('[data-overlay]');
var parent	= $('[data-popup]');
var content	= $('[data-popup-content]');
var titleEl	= parent.find('h1');
var subEl	= parent.find('p');
var codeEl = parent.find('code');
var bodyEl = parent.find('p');
var formEl	= parent.find('form');

function callFunc(func, arg)
{
	if('function' === typeof(func))
		func(arg);
}

const overlayActiveClass = 'active-popup';
var popup = {
	defaultStrings: {
		cancel: json.popups.generic.cancel,
		button: json.popups.generic.ok,
	},
	defaultOpts: {
		focus: [ // in reverse order of priority
			'button[type=submit]',
			'.cancel',
			'input[type=text]',
		],
		titleClass: '',
	},
	isShown(){
		return parent.hasClass('active');
	},
	show(skipFocus){
		overlay.addClass(overlayActiveClass);
		parent.addClass('active');
		if(!skipFocus) // used for backwards compatibilty
			content.find('input[type=text]').first().focus();
	},

	hide(keepOverlay){
		if (keepOverlay !== 'keep overlay') overlay.removeClass(overlayActiveClass);
		parent.removeClass('active');
		titleEl.removeClass('error');
		titleEl.empty();
		subEl.empty();
		subEl.removeClass('error');
		codeEl.empty();
		bodyEl.empty();
		formEl.empty();
	},

	// presses the cancel button, which in turns should hide the popup
	cancel(keepOverlay){
		let done = false;
		if(this.isShown()) {
			let selectors = [
				'.cancel',
				// possibly add more here?
			];
			for(let s of selectors)
			{
				let target = this.find(s);
				if(target.length){
					target.click();
					done = true;
					break;
				}
			}
		}
		return done;
	},

	overlay(){
		overlay.toggleClass(overlayActiveClass);
	},

	initWithStrings(strings) {
		this.seq++;
		popup.hide();
		// override with default values if appropriate
		for (let [key, value] of Object.entries(this.defaultStrings)) {
		  if(!strings.hasOwnProperty(key))
				strings[key] = value;
		}
		if(strings.title)
			popup.title(strings.title);
		if(strings.body)
			popup.body(strings.body);
		if(strings.text)
			popup.subtitle(strings.text);
		if(strings.code)
			popup.code(strings.code);
	},

	finalize(newOpts) {
		popup.show();
		let opts = {};
		for (let [key, value] of Object.entries(this.defaultOpts))
			opts[key] = value;
		if('object' === typeof(newOpts)){
			for (let [key, value] of Object.entries(newOpts))
				opts[key] = value;
		}
		if(!Array.isArray(opts.focus))
			opts.focus = [opts.focus];
		for (let f of opts.focus)
			content.find(f).first().focus();
		titleEl.addClass(opts.titleClass);
	},

	respondToEvent(callback, e) {
			e.preventDefault();
			let previousSeq = this.seq;
			callFunc(callback, e);
			if(this.seq === previousSeq) // the callback may have started a new popup. In that case, we don't want to hide the new one!
				popup.hide();
	},
	disableSubmit() {
		this.form.off('submit');
		$('button[type=submit]', this.form).addClass('button-disabled');
	},
	enableSubmit() {
		this.form.on('submit', (e) => {
			this.respondToEvent(this.stashedOnSubmit, e)
		});
		$('button[type=submit]', this.form).removeClass('button-disabled');
	},
	// shorthands for common popup configurations.
	// strings may have fields: title, text(subtitle), code, body, button, cancel

	// A popup with two buttons - Submit and Cancel
	// Builds the popup with the initWithStrings() function, then adds the two button callbacks.
	twoButtons(strings, onSubmit, onCancel, opts) {
		this.initWithStrings(strings);
		var form = [];
		form.push('<button type="submit" class="button popup-save confirm">' + strings.button + '</button>');
		form.push('<button type="button" class="button cancel">' + strings.cancel + '</button>');

		this.stashedOnSubmit = onSubmit;
		popup.form.empty().append(form.join('')).off('submit').on('submit', (e) => {
			this.respondToEvent(onSubmit, e);
		});
		popup.find('.cancel').on('click', (e) => {
			this.respondToEvent(onCancel, e);
		})
		popup.finalize(opts);
	},

	// For popups with only one button that needs to fire an event when clicked (eg, confirmation)
	// To work a strings.button string must be present in the strings object that's passed in
	oneButton(strings, onCancel, opts) {
		this.initWithStrings(strings);
		var form = [];
		form.push('<button type="cancel" class="button popup-save">' + strings.button + '</button>');
		popup.form.empty().append(form.join('')).find('.popup-save').on('click', (e) => {
			this.respondToEvent(onCancel, e);
		});
		popup.finalize(opts);
	},

	// a popup with one button which will hide itself upon click
	// To change the text on the button pass in strings.button to the strings object
	ok(strings, opts) {
		this.initWithStrings(strings);
		var form = [];
		form.push('<button type="submit" class="button popup cancel">' + strings.button + '</button>');
		popup.form.empty().append(form.join('')).off('submit').on('submit', e => {
			this.respondToEvent(undefined, e);
		});
		popup.finalize(opts);
	},

	// a popup with two buttons and an input field. The input field can be
	// checked against an array of disallowedValues. If the name is disallowed,
	// the submit button will be grayed out.
	// args has: initialValue(string), getDisallowedValues(function that returns an arrayof strings), sanitise(function), strings(contains title, text, button, input, sub_text, sanitised, exists (all optional), sanitise(function))  (all optional)
	// callback takes a single argument: a valid value or null if the popup was cancelled or the input field was empty
	requestValidInput(args, callback){
		let initialValue = args.initialValue;
		let getDisallowedValues = args.getDisallowedValues;
		let strings = Object.assign({}, args.strings);
		let sanitise = args.sanitise;
		// defaults
		if(typeof(initialValue) !== "string")
			initialValue = "";
		if(typeof(getDisallowedValues) !== 'function')
			getDisallowedValues = () => { return []; }
		if(typeof(strings) !== "object")
			strings = {};
		if(typeof(sanitise) !== "function")
			sanitise = (a) => { return a;};
		for(let field of ['input', 'sub_text', ]) {
			if(typeof(strings[field]) !== "string")
				strings[field] = '';
		}
		popup.twoButtons(strings, function onSubmit(e) {
			let val = popup.find('input[type=text]').val();
			if(!val)
				val = null;
			else
				sanitise ? val = sanitise(val) : val;
			callback(val);
		}, function onCancel() {
			callback(null);
		});
		let newValueInput =
			'<input type="text" data-name="newValue" placeholder="' + strings.input + '" value="' + initialValue + '" />'
			+ '<span class="input-already-existing"></span>'
			+ '<div class="input-sanitised"></div>';
		if(strings.sub_text)
			newValueInput += '<p class="create_file_subtext">' + strings.sub_text + '</p>'
		newValueInput += '<br/><br/>';
		popup.form.prepend(newValueInput);
		let input = $('input[data-name=newValue]', popup.form);
		let existingWarning = $('.input-already-existing', popup.form);
		let sanitisedWarning = $('.input-sanitised', popup.form);
		let validateValue = (e) => {
			let origValue = input[0].value.trim();
			let sanValue = sanitise ? sanitise(origValue) : origValue;
			if(sanValue !== origValue && strings.sanitised)
				sanitisedWarning.html(strings.sanitised + ' ' + sanValue);
			else
				sanitisedWarning.html('');
			if(getDisallowedValues().includes(sanValue)) {
				if(strings.exists)
					existingWarning.html(strings.exists);
				popup.disableSubmit();
			}
			else {
				existingWarning.html('');
				popup.enableSubmit();
			}
		};
		validateValue();
		input.on('change keypress paste input', validateValue);
		// duplicated call, but this allows re-focus after input was created
		popup.finalize();
	},

	find: selector => content.find(selector),

	title: text => titleEl.text(text),
	subtitle: text => subEl.text(text),
	code: html => codeEl.html(html),
	body: text => bodyEl.text(text),
	formEl: html => formEl.html(html),

	append: child => content.append(child),

	form: formEl,

	seq: 0,

	exampleChanged: example

};

module.exports = popup;

function example(cb, arg, delay, cancelCb){

	// build the popup content
	popup.title('Save your changes?');
	popup.subtitle('Warning: Any unsaved changes will be lost');
	popup.body('You have made changes to an example project. If you continue, your changes will be lost. To keep your changes, click cancel and then Save As in the project manager tab');
	var form = [];
	form.push('<button type="submit" class="button popup confirm">Continue</button>');
	form.push('<button type="button" class="button popup cancel">Cancel</button>');

	popup.form.append(form.join('')).off('submit').on('submit', e => {
		e.preventDefault();
		setTimeout(function(){
			callFunc(cb, arg);
		}, delay);
		popup.hide();
	});

	popup.find('.cancel').on('click', (e) => {
		popup.hide();
		callFunc(cancelCb, e);
	});

	popup.show();

	popup.find('.confirm').focus();

}
