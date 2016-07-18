'use strict';
var View = require('./View');

class ControlView extends View{

	constructor(className, models){
		super(className, models);
		$('#controlsButton').click(() => this.$parents.toggleClass('hidden') );
	}
	
	// UI events
	selectChanged($element, e){
		var key = $element.data().key;
		var value = $element.val();
		if (this[key]) this[key](value);
		this.emit('settings-event', key, value);
	}
	inputChanged($element, e){
		var key = $element.data().key;
		var value = $element.val();
		this.emit('settings-event', key, value);
		this.$elements.filterByData('key', key).val(value);
	}
	buttonClicked($element, e){
		this.emit('settings-event', $element.data().key);
	}
	
	// settings model events
	modelChanged(data, changedKeys){
		for (let key of changedKeys){
			if (key === 'upSampling' || key === 'downSampling' || key === 'xTimeBase'){
				this['_'+key](data[key], data);
			} else {
				if (key === 'plotMode') this.plotMode(data[key].value);
				this.$elements.filterByData('key', key).val(data[key].value);
			}
		}
	}
	
	plotMode(val){
		if (val == 0){
			if ($('#scopeTimeDomainControls').hasClass('hidden')) $('#scopeTimeDomainControls').removeClass('hidden');
			if (!$('#scopeFFTControls').hasClass('hidden')) $('#scopeFFTControls').addClass('hidden');
		} else {
			if (!$('#scopeTimeDomainControls').hasClass('hidden')) $('#scopeTimeDomainControls').addClass('hidden');
			if ($('#scopeFFTControls').hasClass('hidden')) $('#scopeFFTControls').removeClass('hidden');
		}
	}
	
	_upSampling(value, data){
		$('.xTime-display').html((data.xTimeBase * data.downSampling.value/data.upSampling.value).toPrecision(2));
	}
	_downSampling(value, data){
		$('.xTime-display').html((data.xTimeBase * data.downSampling.value/data.upSampling.value).toPrecision(2));
	}
	_xTimeBase(value, data){
		$('.xTime-display').html((data.xTimeBase * data.downSampling.value/data.upSampling.value).toPrecision(2));
	}
	
	__numChannels(val, data){
		var el = this.$elements.filterByData('key', 'triggerChannel');
		el.empty();
		for (let i=0; i<val.value; i++){
			let opt = $('<option></option>').html(i).val(i).appendTo(el);
			if (i === data.triggerChannel.value) opt.prop('selected', 'selected'); 
		}
	}
	
}

module.exports = ControlView;

$.fn.filterByData = function(prop, val) {
    return this.filter(
        function() { return $(this).data(prop)==val; }
    );
}