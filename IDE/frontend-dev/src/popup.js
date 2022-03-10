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
			popup.body('a<br />\nb<br />\n' + strings.body);
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
	// shorthands for common popup configurations.
	// strings may have fields: title, text(subtitle), code, body, button, cancel

	// A popup with two buttons - Submit and Cancel
	// Builds the popup with the initWithStrings() function, then adds the two button callbacks.
	twoButtons(strings, onSubmit, onCancel, opts) {
		this.initWithStrings(strings);
		var form = [];
		form.push('<button type="submit" class="button popup-save confirm">' + strings.button + '</button>');
		form.push('<button type="button" class="button cancel">' + strings.cancel + '</button>');

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
