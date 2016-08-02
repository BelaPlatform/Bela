'use strict';
var View = require('./View');

function ChannelConfig(){
	this.yAmplitude = 1;
	this.yOffset = 0;
	this.color = '#ff0000';
}

var channelConfig = [new ChannelConfig()];
var colours = ['#ff0000', '#0000ff', '#00ff00', '#ffff00', '#00ffff', '#ff00ff'];

class ChannelView extends View{

	constructor(className, models){
		super(className, models);
	}
	
	// UI events
	inputChanged($element, e){
		var key = $element.data().key;
		var channel = $element.data().channel;
		var value = (key === 'color') ? $element.val() : parseFloat($element.val());
		console.log(key, channel, value, isNaN(value));
		if (!(key === 'color') && isNaN(value)) return;
		this.$elements.not($element).filterByData('key', key).filterByData('channel', channel).val(value);
		channelConfig[channel][key] = value;
		console.log(key, channel, value);
		this.emit('channelConfig', channelConfig);
	}
	
	setChannelGains(value){
		this.$elements.filterByData('key', 'yAmplitude').val(value);
		for (let item of channelConfig){
			item.yAmplitude = value;
		}
		this.emit('channelConfig', channelConfig);
	}
	
	_numChannels(val){
		var numChannels = val.value;
		if (numChannels < channelConfig.length){
			while(numChannels < channelConfig.length){
				$('#channelViewChannel'+(channelConfig.length-1)).remove();
				channelConfig.pop();
			}
		} else if (numChannels > channelConfig.length){
			while(numChannels > channelConfig.length){
				channelConfig.push(new ChannelConfig());
				channelConfig[channelConfig.length-1].color = colours[(channelConfig.length-1)%colours.length];
				var el = $('#channelViewChannel0')
					.clone(true)
					.prop('id', 'channelViewChannel'+(channelConfig.length-1))
					.appendTo($(this.$parents[0]));
				el.find('h1').html('Channel '+(channelConfig.length-1));
				el.find('input').each(function(){
					$(this).data('channel', channelConfig.length-1)
				});
				el.find('input[type=color]').val(colours[(channelConfig.length-1)%colours.length]);
			}
		}
		this.emit('channelConfig', channelConfig);
		this.$elements = $('.'+this.className);
	}
	
	_plotMode(val){
		if (val.value == 0){
			this.setChannelGains(1);
		} else {
			this.setChannelGains(0.2);
		}
	}
	
}

module.exports = ChannelView;

$.fn.filterByData = function(prop, val) {
    return this.filter(
        function() { return $(this).data(prop)==val; }
    );
}