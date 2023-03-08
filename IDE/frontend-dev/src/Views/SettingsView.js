var View = require('./View');
var popup = require('../popup');
var json = require('../site-text.json');
var utils = require('../utils');

var belaCoreVersionString = "Unknown";
var belaImageVersionString = "Unknown";
var inputChangedTimeout;

class SettingsView extends View {

	constructor(className, models, settings){
		super(className, models, settings);
		//this.$elements.filter('input').on('change', (e) => this.selectChanged($(e.currentTarget), e));
		this.settings.on('change', (data) => this._IDESettings(data) );
		this.$elements.filterByData = function(prop, val) {
			return this.filter(
				function() {
					let text = $(this).data(prop);
					if (typeof(val) === 'string')
						return text === val;
					else
						return text && text.match(val) !== null;
					}
			);
		}

		$('[data-run-on-boot]').on('change', () => {
			if ($('[data-run-on-boot]').val() && $('[data-run-on-boot]').val() !== '--select--')
				this.emit('run-on-boot', $('[data-run-on-boot]').val());
		});

		$('.audioExpanderCheck').on('change', e => {
			var inputs = '', outputs = '';
			$('.audioExpanderCheck').each(function(){
				var $this = $(this);
				if ($this.is(':checked')){
					if ($this.data('func') === 'input'){
						inputs += $this.data('channel') + ',';
					} else {
						outputs += $this.data('channel') + ',';
					}
				}
			});
			if (inputs.length) inputs = inputs.slice(0, -1);
			if (outputs.length) outputs = outputs.slice(0, -1);

			this.emit('project-settings', {func: 'setCLArgs', args: [{key: '-Y', value: inputs}, {key: '-Z', value: outputs}] });
		});

	}

	selectChanged($element, e){
		var data = $element.data();
		var func = data.func;
		var key = data.key;
		if (func && this[func]){
			this[func](func, key, $element.val());
		}
		if (key === '-C'){
			this.$elements.filterByData('key', key).not($element).val($element.val());
		}
	}

	buttonClicked($element, e){
    var data = $element.data();
		var func = data.func;
    var key = data.key;
    var val = $element.val();
		if (func && this[func]){
      if (val) {
        this[func](func, key, $element.val());
      } else {
        this[func](func);
      }
		}
	}

	inputChanged($element, e){
		var data = $element.data();
		var func = data.func;
		var key = data.key;
		var type = $element.prop('type');
		console.log(key);
		if (type == 'textarea' || type === 'number' || type === 'text'){
			if (func && this[func]){
				this[func](func, key, $element.val());
			}
		} else if (type === 'checkbox'){
			if (func && this[func]){
				this[func](func, key, $element.is(':checked') ? 1 : 0);
			}
		}
	}

	setCLArg(func, key, value){
		this.emit('project-settings', {func, key, value});
	}

	restoreDefaultCLArgs(func){
		popup.twoButtons(json.popups.restore_default_project_settings,
			() => this.emit('project-settings', {func}));
	}

	setIDESetting(func, key, value){
		this.emit('IDE-settings', {func, key, value: value});
	}

	restoreDefaultIDESettings(func){
		popup.twoButtons(json.popups.restore_default_ide_settings,
			() => this.emit('IDE-settings', {func}));
	}

	shutdownBBB(){
		// build the popup content
		popup.title(json.popups.shutdown.title);
		popup.subtitle(json.popups.shutdown.text);

		var form = [];
		form.push('<button type="submit" class="button popup confirm">' + json.popups.shutdown.button + '</button>');
		form.push('<button type="button" class="button popup cancel">Cancel</button>');

		popup.form.append(form.join('')).off('submit').on('submit', e => {
			e.preventDefault();
			this.emit('halt');
			popup.hide();
		});

		popup.find('.cancel').on('click', popup.hide );

		popup.show();

		popup.find('.confirm').trigger('focus');
	}

	aboutPopup(){
		// build the popup content
		popup.title(json.popups.about.title);
		popup.subtitle(json.popups.about.text);
		var form = [];
		form.push('<button type="submit" class="button popup cancel">' + json.popups.about.button + '</button>');

		popup.form.append(form.join('')).off('submit').on('submit', e => {
			e.preventDefault();
			popup.hide();
		});

		popup.show();

		popup.find('.cancel').trigger('focus');
	}

	updateBela(){
		popup.twoButtons(json.popups.update,
			async function onSubmit(e){
				var formEl = $('[data-popup] form')[0];
				var formDataOrig = new FormData(formEl);
				var formData = new FormData();
				console.log(formDataOrig.entries());
				let selectedFiles = 0;
				let file;
				for(let entry of formDataOrig.entries()){
					file = entry[1].name.split('\\').pop();
					formData.append(entry[0], entry[1]);
					++selectedFiles;
					// there will be only one because the <input> is not `multiple`
					// TODO: write it better than this ugly-but-effective
					// single-iteration loop
					break;
				}
				if (file && (file.search(/\.zip$/) != -1)) {
					this.emit('warning', json.settings_view.update);
					this.emit('warning', json.settings_view.browser);
					this.emit('warning', json.settings_view.ide);

					formData.append("update-event", JSON.stringify({
						currentProject: this.currentProject,
						func: 'upload',
						newFile: file,
					}));
					utils.doLargeFileUpload(formData, (r) => {
						// file has been successfully loaded, start the update.
						// We do not do this in the POST request itself in
						// order to avoid timeout.
						this.emit('do-update');
						popup.ok({});
						popup.hide("keep overlay");
					}, (e) => {
						popup.ok({text: "Error while uploading:", e});
					});
				} else {

					this.emit('warning', json.settings_view.zip);
					popup.hide();

				}
			}.bind(this)
		);
		popup.form.attr('action', '/uploads')
			.attr('enctype','multipart/form-data')
			.attr('method', 'POST');
		popup.form.prepend('<input type="file" name="data" data-form-file></input><br/><br/>');
	}

	// model events
	__CLArgs(data){

		for (let key in data) {

			if (key === '-Y' || key === '-Z'){
				this.setAudioExpander(key, data[key]);
				continue;
			} else if (key === 'audioExpander'){
				if (data[key] == 1)
					$('[data-audio-expander-table]').css('display', 'table');
			}

			let el = this.$elements.filterByData('key', key);

			// set the input value
			if(!el.length) {
				console.log("Unrecognized CLArg received: ", key, data[key]);
				continue;
			}
			if (el[0].type === 'checkbox') {
				el.prop('checked', (data[key] == 1));
			} else {
				//console.log(el.val(), data[key]);
				el.val(data[key]);
			}

		}

	}

	_IDESettings(data){
		for (let key in data){
			this.$elements.filterByData('key', key).val(data[key]).prop('checked', data[key]);
		}
	}

	_projectList(projects, data){

		var $projects = $('[data-run-on-boot]');
		$projects.empty();

		// add a none option
		$('<option></option>').attr('value', '*none*').html('•none•').appendTo($projects);

		// add a loop_* option
		$('<option></option>').attr('value', '*loop*').html('•loop_*•').appendTo($projects);

		// fill project menu with projects
		for (let i=0; i<projects.length; i++){
			if (projects[i] && projects[i] !== 'undefined' && projects[i] !== 'exampleTempProject' && projects[i][0] !== '.'){
				$('<option></option>').attr('value', projects[i]).html(projects[i]).appendTo($projects);
			}
		}

	}

	useAudioExpander(func, key, val){
		if (val == 1) {
			this.setCLArg('setCLArg', key, val);
		} else {
			// clear channel picker
			$('.audioExpanderCheck').prop('checked', false);
			this.emit('project-settings', {func: 'setCLArgs', args: [
				{key: '-Y', value: ''},
				{key: '-Z', value: ''},
				{key, value: val}
			] });
		}
	}

	setAudioExpander(key, val){
		if (!val.length) return;

		var channels = val.split(',');

		if (!channels.length) return;

		$('.audioExpanderCheck').each( function(){
			let $this = $(this);
			if (($this.data('func') === 'input' && key === '-Y') || ($this.data('func') === 'output' && key === '-Z')){
				let checked = false;
				for (let channel of channels){
					if (channel == $this.data('channel'))
						checked = true;
				}
				$this.prop('checked', checked);
			}
		});

	}

	_boardString(data){
		var boardString;
		if(data && data.trim)
			boardString = data.trim();
		else
			return

		function excludeSubsecs(num, max, prefix) {
			var subsections = [];
			for (let i = num; i < max; ++i)
				subsections = subsections.concat(prefix + i);
			return subsections;
		}
		function excludeInputSubsecs(num) {
			return excludeSubsecs(num, 8, 'input-level');
		}
		function excludeHpSubsecs(num) {
			return excludeSubsecs(num, 8, 'headphone-level');
		}
		var settingExceptions = {
			Bela: {
				sections: [],
				subsections: ['disable-led'],
				options: [],
				inputsWithGain: 2,
				headphones: 2,
			},
			BelaRevC: {
				sections: [],
				subsections: [],
				options: [{
						selector: 'analog-samplerate',
						optVal: [88200]
					},
					{
						selector: 'analog-channels',
						optVal: [2]
					}],
				inputsWithGain: 2,
				headphones: 2,
			},
			BelaMini: {
				sections: ['capelet-settings'],
				subsections: ['mute-speaker'],
				options: [],
				inputsWithGain: 2,
				headphones: 2,
			},
			BelaMiniMultiAudio: {
				sections: ['capelet-settings'],
				subsections: ['mute-speaker'],
				options: [],
				inputsWithGain: 8,
				headphones: 8,
			},
			Ctag: {
				sections: ['capelet-settings'],
				subsections: ['disable-led', 'mute-speaker', 'hp-level', 'pga-left', 'pga-right', 'analog-channels', 'analog-samplerate', 'use-analog', 'adc-level'],
				options: [],
				inputsWithGain: 0,
				headphones: 0,
			},
			CtagBela: {
				sections: [],
				subsections: ['disable-led', 'mute-speaker', 'hp-level', 'pga-left', 'pga-right'],
				options: [{
						selector: 'analog-samplerate',
						optVal: [88200]
					},
					{
						selector: 'analog-channels',
						optVal: [2]
					}],
				inputsWithGain: 0,
				headphones: 0,
			},
			Face: {
				sections: [],
				subsections: [],
				options: [],
				inputsWithGain: 0,
				headphones: 0,
			},
			Beast: {
				sections: [],
				subsections: [],
				options: [],
				inputsWithGain: 0,
				headphones: 0,
			}
		}

		var exceptions = {
			sections: null,
			subsections: null
		};

		var excLabel = boardString;
		// possible overrides for composite cases
		if(boardString === 'CtagFace' || boardString === 'CtagBeast') {
			excLabel = 'Ctag'
		} else if(boardString === 'CtagFaceBela' || boardString === 'CtagBeastBela') {
			excLabel = 'CtagBela'
		}
		if (!settingExceptions[excLabel]) {
			// default in case something went wrong above
			excLabel = 'Bela';
		}
		exceptions['sections'] = settingExceptions[excLabel]['sections'];
		var inputsWithGain = settingExceptions[excLabel].inputsWithGain;
		var headphones = settingExceptions[excLabel].headphones;
		var ioSubsecExcepts = excludeInputSubsecs(inputsWithGain).concat(excludeHpSubsecs(headphones));
		exceptions['subsections'] = settingExceptions[excLabel]['subsections'].concat(ioSubsecExcepts);
		exceptions['options'] = settingExceptions[excLabel]['options'];

		if(boardString === 'CtagFace' || boardString === 'CtagFaceBela') {
			exceptions['options'] = exceptions['options'].concat(settingExceptions['Face']['options'])
		} else if(boardString === 'CtagBeast' || boardString === 'CtagBeastBela') {
			exceptions['options'] = exceptions['options'].concat(settingExceptions['Beast']['options'])
		}

		if (boardString.includes('Ctag')) {
			var sRates = $('[data-analog-samplerate]').children("option");
			for (let i = 0; i < sRates.length; i++) {
				var rate = sRates[i].innerHTML;
				if (rate == "44100") {
					sRates[i].innerHTML = "48000";
				} else if (rate == "22050") {
					sRates[i].innerHTML = "24000";
				}
			}
		}
		function replaceDataSettings(value, find, replace) {
			var tags = $('[data-settings="' + value + '"]>td.left-choice');
			if (tags.length) {
				var tag = tags[0];
				tag.innerHTML = tag.innerHTML.replace(find, replace);
			}
		}
		if (2 === settingExceptions[excLabel].inputsWithGain) {
			replaceDataSettings('input-level0', '0', 'Left');
			replaceDataSettings('input-level1', '1', 'Right');
		}
		if (2 === settingExceptions[excLabel].headphones) {
			replaceDataSettings('headphone-level0', '0', 'Left');
			replaceDataSettings('headphone-level1', '1', 'Right');
		}
		for(var e in exceptions['options']) {
			var opts = $('#'+exceptions['options'][e].selector).children("option");
			var exceptOpts = exceptions['options'][e].optVal;
			for(let i = 0; i < opts.length; i++) {
				var html = opts[i].innerHTML;
				if(exceptOpts.includes(parseInt(html))) {
					opts[i].remove();
				}
			}
		}

		for(var subsect in exceptions['subsections']) {
			$('[data-settings="' + exceptions['subsections'][subsect] + '"]').remove();
		}
		for(var sect in exceptions['sections']) {
			$('[data-accordion-for="' + exceptions['sections'][sect] + '"]').remove();
			$('[data-accordion="' + exceptions['sections'][sect] + '"]').remove();
		}
	}

	versionPopup() {
		var strings = {};
		strings.title = json.popups.version.title;
		strings.button = json.popups.version.button;
		// popup.code is the only one that accepts HTML, so we have to use that
		// to make it pickup the line breaks
		strings.code = utils.formatString('<p>{0}<br />{1}</p><p>{2}<br />{3}</p>',
			json.popups.version.image_version_label, belaImageVersionString,
			json.popups.version.core_version_label, belaCoreVersionString);
		popup.ok(strings);
	}

	_belaCoreVersion(ver) {
		var format = utils.formatString;
		var s = [];
		var templates = json.popups.version;
		if(ver.date || ver.fileName) {
			var t;
			switch(ver.success) {
				case 0:
					t = templates.textTemplateFailed;
					break;
				case 1:
					t = templates.textTemplateSuccess;
					break;
				default:
				case -1:
					t = templates.textTemplateUnknown; // unknown success (e.g.: incomplete legacy log)
					break;
			}
			if(ver.date) {
				var date = new Date(ver.date);
				var dateString = date.getDate() + ' ' + date.toLocaleString('default', {month: "short"}) + ' '
								+ date.getFullYear() + ' ' + date.toTimeString().replace(/GMT.*/, '');
				s.push(format(t[0], dateString));
			}
			if(ver.fileName)
				s.push(format(t[1], ver.fileName));
			if(ver.method)
				s.push(format(t[2], ver.method));
			s.push(t[3]);
		} else {
			s.push(templates.textUnknown); // no info available
		}
		if(ver.git_desc)
			s.push(format(templates.textTemplateGitDesc, ver.git_desc));
		belaCoreVersionString = s.join('<br \>');
	}

	_belaImageVersion(ver){
		if(ver)
			belaImageVersionString = ver;
	}

}
module.exports = SettingsView;
