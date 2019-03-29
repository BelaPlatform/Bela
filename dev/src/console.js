'use strict';
var popup = require('./popup');
var EventEmitter = require('events').EventEmitter;
//var $ = require('jquery-browserify');

var enabled = true, scrollEnabled = true, suspended = false;

// module variables
var numElements = 0, maxElements = 200, consoleDelete = true;

class Console extends EventEmitter {

	constructor(){
		super();
    // this.$element = $('#beaglert-consoleWrapper');
		// this.parent = document.getElementById('beaglert-console');
    this.$element = $('[data-console-contents-wrapper]');
		this.parent = $('[data-console]');
	}

	block(){
		enabled = false;
	}
	unblock(){
		enabled = true;
	}

	print(text, className, id, onClick){
		if (!enabled) return;

		// this is a faster way maybe?
		//var str = '<div '+(id ? 'id="'+id+'" ' : '') +'class="beaglert-console-'+className+'"><span>'+text+'</span></div>';
		//this.$element.append(str);

		var el = $('<div></div>').addClass('beaglert-console-'+className).appendTo(this.$element);
		if (id) el.prop('id', id);
		$('<span></span>').html(text).appendTo(el);

		if (numElements++ > maxElements) this.clear(numElements/4);
		if (onClick) el.on('click', onClick);
		return el;
	}

	// log an unhighlighted message to the console
	log(text, css){

		if (suspended) return;

		if (!consoleDelete && numElements > maxElements){
			//console.log('cleared & rejected', numElements, text.split('\n').length);
			this.clear(numElements - maxElements/2);
			suspended = true;
			setTimeout( () => suspended = false, 1000);
			this.warn('Too many messages have been printed to the console too quickly. Reduce your printing frequency');
		} else {
			this.checkScroll();
			var msgs = text.split('\n');
			var str = '';
			for (let i=0;  i<msgs.length; i++){
				if (msgs[i] !== '' && msgs[i] !== ' '){
					//this.print(msgs[i], css || 'log');
					str += '<div class="beaglert-console-'+(css || 'log')+'"><span>'+msgs[i]+'</span></div>';
					numElements++;
				}
			}
			this.$element.append(str);
			if (numElements > maxElements) this.clear(numElements/4);
			this.scroll();
		}
	}
	// log a warning message to the console
	warn(text, id){

		//this.checkScroll();
		scrollEnabled = true;

		var msgs = text.split('\n');
		for (let i=0;  i<msgs.length; i++){
			if (msgs[i] !== ''){
				this.print(msgs[i], 'warning', id);/*, function(){
					var $el = $(this);
					$el.addClass('beaglert-console-collapsed');
					$el.on('transitionend', () => {
						if ($el.hasClass('beaglert-console-collapsed')){
							$el.remove();
						} else {
							$el.addClass('beaglert-console-collapsed');
						}
					});
				});*/
			}
		}
		this.scroll();
	}

	newErrors(errors){

		//this.checkScroll();
		scrollEnabled = true;

		$('.beaglert-console-ierror, .beaglert-console-iwarning').remove();

    // build the popup content
    popup.title("Error");
    popup.subtitle();

    var form = [];

		for (let err of errors){

			// create the element and add it to the error object
			var div = $('<div></div>').addClass('beaglert-console-i' + err.type)

			// create the link and add it to the element
			var span = $('<span></span>').html(err.text.split('\n').join(' ') + ', line: ' + (err.row + 1)).appendTo(div);

			// add a button to copy the contents to the clipboard
			var copyButton = $('<div></div>').addClass('clipboardButton').appendTo(div);
			var clipboard = new Clipboard(copyButton[0], {
				target: function(trigger) {
					return $(trigger).siblings('span')[0];
				}
			});
      var popUpErr = $('<p></p>').html(err.text.split('\n').join(' ') + ', line: ' + (err.row + 1));
      form.push(popUpErr.get(0).outerHTML);

			div.appendTo(this.$element);

		}
    // console.log(form);
    form.push('<button type="button" class="button popup cancel">Cancel</button>');
    popup.form.append(form.join(''))
    popup.find('.cancel').on('click', popup.hide );

    popup.show();

		this.scroll();
	}

	// log a positive notification to the console
	// if persist is not true, the notification will be removed quickly
	// otherwise it will just fade
	notify(notice, id){

		if (!enabled) return;

		//this.checkScroll();
		scrollEnabled = true;

		$('#'+id).remove();
		var el = this.print(notice, 'notify', id);

		this.scroll();

		return el;
	}

	fulfill(message, id, persist){
		if (!enabled) return;
		var el = document.getElementById(id);
		//if (!el) el = this.notify(message, id);
		var $el = $(el);
		$el.appendTo(this.$element);//.removeAttr('id');
		$el.html($el.html()+message);
		setTimeout( () => $el.addClass('beaglert-console-faded'), 500);
		if (!persist){
			$el.on('transitionend', () => {
				if ($el.hasClass('beaglert-console-collapsed')){
					$el.remove();
				} else {
					$el.addClass('beaglert-console-collapsed');
				}
			});
		}
	}

	reject(message, id, persist){
		var el = document.getElementById(id);
		//if (!el) el = this.notify(message, id);
		var $el = $(el);
		$el.appendTo(this.$element);//.removeAttr('id');
		$el.html($el.html()+message);
		$el.addClass('beaglert-console-rejectnotification');
		setTimeout( () => $el.removeClass('beaglert-console-rejectnotification').addClass('beaglert-console-faded'), 500);
		$el.on('click', () => $el.addClass('beaglert-console-collapsed').on('transitionend', () => $el.remove() ));
	}

	// clear the console
	clear(number, force){
		if (consoleDelete && !force) return;
		if (number){
			$("[data-console-contents-wrapper] > div:lt("+parseInt(number)+")").remove();
			numElements -= parseInt(number);
		} else {
			$('[data-console-contents-wrapper] > div').remove();
			numElements = 0;
		}
	}

	checkScroll(){
		if (this.parent.scrollHeight-this.parent.scrollTop === this.parent.clientHeight){
			scrollEnabled = true;
		} else {
			scrollEnabled = false;
		}
	}

	// force the console to scroll to the bottom
	scroll(){
		if (scrollEnabled){
			scrollEnabled = false;
			setTimeout((() => this.parent.scrollTop = this.parent.scrollHeight), 0);
		}
	}

	setConsoleDelete(to){
		consoleDelete = to;
	}
};
module.exports = new Console();

// gracefully remove a console element after an event ((this) must be bound to the element)
/*function dismiss(){
	if (IDE.getSetting('consoleAnimations')) $(this).addClass('beaglert-console-collapsed');
	setTimeout(() => {
		if ($.contains(parent, this)){
			$(this).remove();
			numElements -= 1;
		}
	}, 500);
}*/
