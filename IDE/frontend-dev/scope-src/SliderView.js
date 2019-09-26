'use strict';
var View = require('./View');

class SliderView extends View{
	
	constructor(className, models){
		super(className, models);
		
		this.on('set-slider', args => {
			$('#scopeSlider'+args.slider)
				.find('input[type=range]')
					.prop('min', args.min)
					.prop('max', args.max)
					.prop('step', args.step)
					.val(args.value)
				.siblings('input[type=number]')
					.prop('min', args.min)
					.prop('max', args.max)
					.prop('step', args.step)
					.val(args.value)
				.siblings('h1')
					.html((args.name == 'Slider') ? 'Slider '+args.slider : args.name);
					
			var inputs = $('#scopeSlider'+args.slider).find('input[type=number]');
			inputs.filterByData('key', 'min').val(args.min);
			inputs.filterByData('key', 'max').val(args.max);
			inputs.filterByData('key', 'step').val(args.step);
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
		
		if (val == 0){
			el.appendTo($('#sliderColumn')).css('display', 'none');
		}
		
		for (var i=0; i<val; i++){
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
