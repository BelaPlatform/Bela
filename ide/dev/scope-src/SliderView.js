'use strict';
var View = require('./View');

class SliderView extends View{
	
	constructor(className, models){
		super(className, models);
		
		this.on('set-slider', args => {
			$('#scopeSlider'+args[0].value)
				.find('input[type=range]')
					.prop('min', args[1].value.toFixed(4))
					.prop('max', args[2].value.toFixed(4))
					.prop('step', args[3].value.toFixed(8))
					.val(args[4].value.toFixed(8))
				.siblings('input[type=number]')
					.prop('min', args[1].value.toFixed(4))
					.prop('max', args[2].value.toFixed(4))
					.prop('step', args[3].value.toFixed(8))
					.val(args[4].value.toFixed(8))
				.siblings('h1')
					.html((args[5].value == 'Slider') ? 'Slider '+args[0].value : args[5].value);
					
			var inputs = $('#scopeSlider'+args[0].value).find('input[type=number]');
			inputs.filterByData('key', 'min').val(args[1].value.toFixed(4));
			inputs.filterByData('key', 'max').val(args[2].value.toFixed(4));
			inputs.filterByData('key', 'step').val(args[3].value.toFixed(8));
		});
		
	}
	
	inputChanged($element, e){
		
		var key = $element.data().key;
		var slider = $element.data().slider;
		var value = $element.val();
		
		if (key === 'value'){
			this.emit('slider-value', parseInt(slider), parseFloat(value));
		} else {
			$element.closest('div.sliderView')
				.find('input[type=range]').prop(key, value)
				.siblings('input[type=number]').prop(key, value);
		}

		$element.siblings('input').val(value);
	}
	
	_numSliders(val){

		var el = $('#scopeSlider0');
		
		$('#sliderColumn').empty();
		
		if (val.value == 0){
			el.appendTo($('#sliderColumn')).css('display', 'none');
		}
		
		for (var i=0; i<val.value; i++){
			var slider = el
				.clone(true)
				.prop('id', 'scopeSlider'+i)
				.appendTo($('#sliderColumn'))
				.css('display', 'block');
				
			slider.find('input')
				.data('slider', i)
				.on('input', (e) => this.inputChanged($(e.currentTarget), e));
		}
		
	}
	
}

module.exports = SliderView;

$.fn.filterByData = function(prop, val) {
    return this.filter(
        function() { return $(this).data(prop)==val; }
    );
}