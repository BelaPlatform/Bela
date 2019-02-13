var View = require('./View');
var popup = require('../popup');

var inputChangedTimeout;

class SettingsView extends View {

	constructor(className, models, settings){
		super(className, models, settings);
		//this.$elements.filter('input').on('change', (e) => this.selectChanged($(e.currentTarget), e));
		this.settings.on('change', (data) => this._IDESettings(data) );
		this.$elements.filterByData = function(prop, val) {
			return this.filter(
				function() { return $(this).data(prop)==val; }
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
    console.log(func, key, val);
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
		if (type === 'number' || type === 'text'){
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

		// build the popup content
		popup.title('Restoring default project settings');
		popup.subtitle('Are you sure you wish to continue? Your current project settings will be lost!');

		var form = [];
		form.push('<button type="submit" class="button popup-continue">Continue</button>');
		form.push('<button type="button" class="button popup-cancel">Cancel</button>');

		popup.form.append(form.join('')).off('submit').on('submit', e => {
			e.preventDefault();
			this.emit('project-settings', {func});
			popup.hide();
		});

		popup.find('.popup-cancel').on('click', popup.hide );

		popup.show();

		popup.find('.popup-continue').trigger('focus');

	}

	setIDESetting(func, key, value){
		this.emit('IDE-settings', {func, key, value: value});
	}
	restoreDefaultIDESettings(func){

		// build the popup content
		popup.title('Restoring default IDE settings');
		popup.subtitle('Are you sure you wish to continue? Your current IDE settings will be lost!');

		var form = [];
		form.push('<button type="submit" class="button popup-continue">Continue</button>');
		form.push('<button type="button" class="button popup-cancel">Cancel</button>');

		popup.form.append(form.join('')).off('submit').on('submit', e => {
			e.preventDefault();
			this.emit('IDE-settings', {func});
			popup.hide();
		});

		popup.find('.popup-cancel').on('click', popup.hide );

		popup.show();

		popup.find('.popup-continue').trigger('focus');

	}

	shutdownBBB(){

		// build the popup content
		popup.title('Shutting down Bela');
		popup.subtitle('Are you sure you wish to continue? The BeagleBone will shutdown gracefully, and the IDE will disconnect.');

		var form = [];
		form.push('<button type="submit" class="button popup-continue">Continue</button>');
		form.push('<button type="button" class="button popup-cancel">Cancel</button>');

		popup.form.append(form.join('')).off('submit').on('submit', e => {
			e.preventDefault();
			this.emit('halt');
			popup.hide();
		});

		popup.find('.popup-cancel').on('click', popup.hide );

		popup.show();

		popup.find('.popup-continue').trigger('focus');

	}
	aboutPopup(){

		// build the popup content
		popup.title('About Bela');
		popup.subtitle('Bela is an open source project, and is a product of the Augmented Instruments Laboratory at Queen Mary University of London, and Augmented Instruments Ltd. For more information, visit http://bela.io');
		var form = [];
		form.push('<button type="submit" class="button popup-continue">Close</button>');

		popup.form.append(form.join('')).off('submit').on('submit', e => {
			e.preventDefault();
			popup.hide();
		});

		popup.show();

		popup.find('.popup-continue').trigger('focus');

	}
	updateBela(){

		// build the popup content
		popup.title('Updating Bela');
		popup.subtitle('Please select the update zip archive');

		var form = [];
		form.push('<input id="popup-update-file" type="file">');
		form.push('</br>');
		form.push('<button type="submit" class="button popup-upload">Upload</button>');
		form.push('<button type="button" class="button popup-cancel">Cancel</button>');

		/*popup.form.prop({
			action	: 'updates',
			method	: 'get',
			enctype	: 'multipart/form-data'
		});*/

		popup.form.append(form.join('')).off('submit').on('submit', e => {

			//console.log('submitted', e);

			e.preventDefault();

			var file = popup.find('input[type=file]').prop('files')[0];

			//console.log('input', popup.find('input[type=file]'));
			//console.log('file', file);

			if (file){

				this.emit('warning', 'Beginning the update - this may take several minutes');
				this.emit('warning', 'The browser may become unresponsive and will temporarily disconnect');
				this.emit('warning', 'Do not use the IDE during the update process!');

				popup.hide('keep overlay');

				var reader = new FileReader();
				reader.onload = (ev) => this.emit('upload-update', {name: file.name, file: ev.target.result} );
				reader.readAsArrayBuffer(file);

			} else {

				this.emit('warning', 'not a valid update zip archive');
				popup.hide();

			}

		});

		popup.find('.popup-cancel').on('click', popup.hide );

		popup.show();

	}

	// model events
	__CLArgs(data){

		for (let key in data) {

			if (key === '-Y' || key === '-Z'){
				this.setAudioExpander(key, data[key]);
				continue;
			} else if (key === 'audioExpander'){
				if (data[key] == 1)
					$('#audioExpanderTable').css('display', 'table');
				// else
				// 	$('#audioExpanderTable').css('display', 'none');
			}

			let el = this.$elements.filterByData('key', key);

			// set the input value
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

		var $projects = $('#runOnBoot');
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
			// $('#audioExpanderTable').css('display', 'table');
			this.setCLArg('setCLArg', key, val);
		} else {
			// $('#audioExpanderTable').css('display', 'none');
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

		var settingExceptions = {
			Bela: {
				sections: [],
				subsections: ['disable-led'],
				options: []
			},
			BelaMini: {
				sections: ['capelet-settings'],
				subsections: ['mute-speaker'],
				options: []
			},
			Ctag: {
				sections: ['capelet-settings'],
				subsections: ['disable-led', 'mute-speaker', 'hp-level', 'pga-left', 'pga-right', 'analog-channels', 'analog-samplerate', 'use-analog', 'adc-level'],
				options: []
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
					}]
			},
			Face: {
				sections: [],
				subsections: [],
				options: [{
					selector: 'buffer-size',
					optVal: [128]
				}]
			},
			Beast: {
				sections: [],
				subsections: [],
				options: [{
					selector: 'buffer-size',
					optVal: [64, 128]
				}]
			}
		}

		var exceptions = {
			sections: null,
			subsections: null
		};

		if (boardString === 'BelaMini') {
			exceptions['sections'] = settingExceptions['BelaMini']['sections'];
			exceptions['subsections'] = settingExceptions['BelaMini']['subsections'];
			exceptions['options'] = settingExceptions['BelaMini']['options'];
		} else if(boardString === 'CtagFace' || boardString === 'CtagBeast') {
			exceptions['sections'] = settingExceptions['Ctag']['sections'];
			exceptions['subsections'] = settingExceptions['Ctag']['subsections'];
			exceptions['options'] = settingExceptions['Ctag']['options'];
		} else if(boardString === 'CtagFaceBela' || boardString === 'CtagBeastBela') {
			exceptions['sections'] = settingExceptions['CtagBela']['sections'];
			exceptions['subsections'] = settingExceptions['CtagBela']['subsections'];
			exceptions['options'] = settingExceptions['CtagBela']['options'];
		} else {
			exceptions['sections'] = settingExceptions['Bela']['sections'];
			exceptions['subsections'] = settingExceptions['Bela']['subsections'];
			exceptions['options'] = settingExceptions['Bela']['options'];
		}

		if(boardString === 'CtagFace' || boardString === 'CtagFaceBela') {
			exceptions['options'] = exceptions['options'].concat(settingExceptions['Face']['options'])
		} else if(boardString === 'CtagBeast' || boardString === 'CtagBeastBela') {
			exceptions['options'] = exceptions['options'].concat(settingExceptions['Beast']['options'])
		}

		if(boardString.includes('Ctag'))
		{
			var sRates = $('#analog-samplerate').children("option");
			for (let i = 0; i < sRates.length; i++) {
				var rate = sRates[i].innerHTML;
				if (rate == "44100") {
					sRates[i].innerHTML = "48000";
				} else if (rate == "22050") {
					sRates[i].innerHTML = "24000";
				}
			}
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
			$('#'+exceptions['subsections'][subsect]).parent().parent().css('display', 'none');
		}
		for(var sect in exceptions['sections']) {
			$('.'+exceptions['sections'][sect]).css('display', 'none');
		}
	}
}

module.exports = SettingsView;
