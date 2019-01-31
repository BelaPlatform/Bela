var overlay	= $('[data-overlay]');
var parent	= $('[data-popup]');
var content	= $('[data-popup-content]');
var titleEl	= parent.find('h1');
var subEl	= parent.find('p');
var formEl	= parent.find('form');

var popup = {

	show(){
		overlay.addClass('active');
		parent.addClass('active');
		content.find('input[type=text]').first().trigger('focus');
	},

	hide(keepOverlay){
		if (keepOverlay !== 'keep overlay') overlay.removeClass('active');
		parent.removeClass('active');
		titleEl.empty();
		subEl.empty();
		formEl.empty();
	},

	overlay(){
		overlay.toggleClass('active');
	},

	find: selector => content.find(selector),

	title: text => titleEl.text(text),
	subtitle: text => subEl.text(text),
	formEl: html => formEl.html(html),

	append: child => content.append(child),

	form: formEl,

	exampleChanged: example

};

module.exports = popup;

function example(cb, arg, delay, cancelCb){

	// build the popup content
	popup.title('Save your changes?');
	popup.subtitle('You have made changes to an example project. If you continue, your changes will be lost. To keep your changes, click cancel and then Save As in the project manager tab');

	var form = [];
	form.push('<button type="submit" class="button popup-continue">Continue</button>');
	form.push('<button type="button" class="button popup-cancel">Cancel</button>');

	popup.form.append(form.join('')).off('submit').on('submit', e => {
		e.preventDefault();
		setTimeout(function(){
			cb(arg);
		}, delay);
		popup.hide();
	});

	popup.find('.popup-cancel').on('click', () => {
		popup.hide();
		if (cancelCb) cancelCb();
	});

	popup.show();

	popup.find('.popup-continue').trigger('focus');

}
