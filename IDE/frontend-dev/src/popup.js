var overlay	= $('[data-overlay]');
var parent	= $('[data-popup]');
var content	= $('[data-popup-content]');
var titleEl	= parent.find('h1');
var subEl	= parent.find('p');
var codeEl = parent.find('code');
var bodyEl = parent.find('p');
var formEl	= parent.find('form');

const overlayActiveClass = 'active-popup';
var popup = {

	show(){
		overlay.addClass(overlayActiveClass);
		parent.addClass('active');
		content.find('input[type=text]').first().trigger('focus');
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

	// a template popup with two buttons which will hide itself and call the
	// provided callbacks on button presses.
	// strings must have fields: title, text, submit, cancel
	// strings.button can be used instead of strings.submit  for backwards
	// compatibility
	submitCancel(strings, onSubmit, onCancel) {
		popup.title(strings.title);
		popup.subtitle(strings.text);

		// strings.button is provided for backwards compatbility.
		if(typeof(strings.submit) === 'undefined')
			strings.submit = strings.button;
		var form = [];
		form.push('<button type="submit" class="button popup-save">' + strings.button + '</button>');
		form.push('<button type="button" class="button cancel">' + strings.cancel + '</button>');

		popup.form.empty().append(form.join('')).off('submit').on('submit', (e) => {
			popup.hide();
			onSubmit(e);
		});
		popup.find('.cancel').on('click', () => {
			popup.hide();
			onCancel();
		});
		popup.show();
	},

	find: selector => content.find(selector),

	title: text => titleEl.text(text),
	subtitle: text => subEl.text(text),
  code: html => codeEl.html(html),
  body: text => bodyEl.text(text),
	formEl: html => formEl.html(html),

	append: child => content.append(child),

	form: formEl,

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
			cb(arg);
		}, delay);
		popup.hide();
	});

	popup.find('.cancel').on('click', () => {
		popup.hide();
		if (cancelCb) cancelCb();
	});

	popup.show();

	popup.find('.confirm').trigger('focus');

}
