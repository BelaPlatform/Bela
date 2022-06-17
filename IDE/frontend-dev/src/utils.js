var json = require('./site-text.json');
var popup = require('./popup');
// replace most non alpha-numeric chars with '_'
module.exports.sanitise = function (name, options){
	var isPath = false;
	if(options && options.isPath)
		isPath = options.isPath;
	var newName = name.replace(/[^a-zA-Z0-9\.\-\+\%\_\/~]/g, '_');
	if(isPath) {
		// if this is a path, simply remove trailing slash
		newName = newName.replace(/\/$/, '');
	} else {
		// otherwise do not allow any '/'
		newName = newName.replace(/[\/]/g, '_');
	}
	return newName;
}

module.exports.dirname = function (path) {
	let lastIndex = path.lastIndexOf('/');
	return path.slice(0, lastIndex);
}

module.exports.filename = function (path) {
	let lastIndex = path.lastIndexOf('/');
	return path.slice(lastIndex + 1);
}

module.exports.prettySize = function(size) {
	let ret;
	let uom;
	let s;
	if (size < 1000000){
		s = size / 1000;
		uom = "kB";
	} else if (size >= 1000000 && size < 1000000000){
		uom = "MB";
		s = size / 1000 / 1000;
	} else if (size >= 1000000000){
		uom = "GB"
		s = size / 1000 / 1000 / 1000;
	}
	let f;
	if(s >= 100)
		f = 0;
	else if(s >= 10)
		f = 1;
	else
		f = 2;
	ret = (s).toFixed(f) + uom;
	return ret;
}

module.exports.formatString = function (format, vargs) {
	var args = Array.prototype.slice.call(arguments, 1);
	return format.replace(/{(\d+)}/g, function(match, number) {
	  return typeof args[number] != 'undefined'
		? args[number]
		: match ;
	});
}

// add onClick events for accordion functionality to relevant elements of the
// provided elements
module.exports.addAccordionEvent = function(elements) {
	if(!elements)
		elements = $("*");
	elements = elements.filter('[data-accordion-for]:not([data-accordion-ready])');
	elements.on('click', function() {
		var that = $(this);
		var parent = $('[data-tab=' + $(this)[0].dataset.parent + ']');
		var source = $(this).data('accordion-for');
		$(parent).find('[data-accordion]').each(function() {
			var target = $(this).data('accordion');
			if (target === source) {
				if (that.hasClass('active')) {
					that.removeClass('active');
					$(this).removeClass('show');
				} else {
					that.addClass('active');
					$(this).addClass('show');
				}
			}
		});
	});
	elements.attr('data-accordion-ready', "");
}

// dropdowns
module.exports.addDropdownEvent = function (elements){
	if(!elements)
		elements = $("*");
	elements.filter('[data-dropdown-for]').on('click', function() {
		var source = $(this).data('dropdown-for');
		$('[data-dropdown]').each(function() {
			var target = $(this).data('dropdown');
			if (target === source) {
				$(this).addClass('show');
			}
		});
	});
	// Close the dropdown menu if the user clicks outside of it
	window.onclick = function(event) {
		if (!event.target.matches('[data-dropdown-for]') && !event.target.matches('[data-dropdown] *')) {
			$('[data-dropdown]').removeClass('show')
		}
	}
}
module.exports.doLargeFileUpload = function (formData, success, error){
	popup.noButton(json.popups.upload_file_progress);
	$.ajax({
		type: "POST",
		url: '/uploads',
		enctype: 'multipart/form-data',
		processData: false,
		contentType: false,
		data: formData,
		success: success,
		error: error,
	});
}

module.exports.breakable = function (text){
	return '<span class="word-breakable">' + text + '</span>';
}
