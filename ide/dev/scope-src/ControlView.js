'use strict';
var View = require('./View');

var xTime, sampleRate, upSampling, downSampling

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
		this.$elements.not($element).filterByData('key', key).val(value);
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
				if (key === 'plotMode') this.plotMode(data[key].value, data);
				this.$elements.filterByData('key', key).val(data[key].value);
			}
		}
	}
	
	plotMode(val, data){
		this.emit('plotMode', val, data);
		if (val == 0){
			if ($('#triggerControls').hasClass('hidden')) $('#triggerControls').removeClass('hidden');
			if (!$('#FFTControls').hasClass('hidden')) $('#FFTControls').addClass('hidden');
			$('.xAxisUnits').html('ms');
			$('.xUnit-display').html((xTime * downSampling/upSampling).toPrecision(2));
			$('#zoomUp').html('in');
			$('#zoomDown').html('out');
		} else if (val == 1){
			if (!$('#triggerControls').hasClass('hidden')) $('#triggerControls').addClass('hidden');
			if ($('#FFTControls').hasClass('hidden')) $('#FFTControls').removeClass('hidden');
			$('.xAxisUnits').html('Hz');
			$('.xUnit-display').html((sampleRate/20 * upSampling/downSampling));
			$('#zoomUp').html('out');
			$('#zoomDown').html('in');
		}
	}
	
	FFTXAxis(val, data){
		this.emit('FFTXAxis', val, data);
	}
	
	_upSampling(value, data){
		upSampling = value.value;
		if (data.plotMode.value == 0){
			$('.xUnit-display').html((data.xTimeBase * data.downSampling.value/data.upSampling.value).toPrecision(2));
		} else if (data.plotMode.value == 1){
			$('.xUnit-display').html((data.sampleRate.value/20 * data.upSampling.value/data.downSampling.value));
		}
		$('.zoom-display').html((100*data.upSampling.value/data.downSampling.value).toPrecision(4)+'%');
	}
	_downSampling(value, data){
		downSampling = value.value;
		if (data.plotMode.value == 0){
			$('.xUnit-display').html((data.xTimeBase * data.downSampling.value/data.upSampling.value).toPrecision(2));
		} else if (data.plotMode.value == 1){
			$('.xUnit-display').html((data.sampleRate.value/20 * data.upSampling.value/data.downSampling.value));
		}
		$('.zoom-display').html((100*data.upSampling.value/data.downSampling.value).toPrecision(4)+'%');
	}
	_xTimeBase(value, data){
		xTime = data.xTimeBase;
		sampleRate = data.sampleRate.value;
		if (data.plotMode.value == 0){
			$('.xUnit-display').html((data.xTimeBase * data.downSampling.value/data.upSampling.value).toPrecision(2));
		}
	}
	
	__numChannels(val, data){
		var el = this.$elements.filterByData('key', 'triggerChannel');
		el.empty();
		for (let i=0; i<val.value; i++){
			let opt = $('<option></option>').html(i+1).val(i).appendTo(el);
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