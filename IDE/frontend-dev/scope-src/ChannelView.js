'use strict';
var View = require('./View');

function ChannelConfig(){
  this.yAmplitude = 1;
  this.yOffset = 0;
  this.color = '0xff0000';
  this.lineWeight = 1.5;
}

var channelConfig = [new ChannelConfig()];
var colours = ['0xff0000', '0x0000ff', '0x00ff00', '0xffff00', '0x00ffff', '0xff00ff'];

var tdGainVal = 1, tdOffsetVal = 0, tdGainMin = 0.5, tdGainMax = 2, tdOffsetMin = -5, tdOffsetMax = 5;
var FFTNGainVal = 1, FFTNOffsetVal = -0.005, FFTNGainMin = 0.5, FFTNGainMax = 2, FFTNOffsetMin = -1, FFTNOffsetMax = 1;
var FFTDGainVal = 1/70, FFTDOffsetVal = 69, FFTDGainMin = 0.00001, FFTDGainMax = 1.5, FFTDOffsetMin = 0, FFTDOffsetMax = 100;
const sliderPowExponent = Math.log2(100.1);
const yAmplitudeMin = 0.0001;

class ChannelView extends View{

  constructor(className, models){
    super(className, models);
  }

  // UI events
  inputChanged($element, e){
    var key = $element.data().key;
    var channel = $element.data().channel;
    var value = (key === 'color') ? $element.val().replace('#', '0x') : parseFloat($element.val());
    if (!(key === 'color') && isNaN(value)) return;
	if("yAmplitude" === key || "yAmplitudeSlider" === key) {
		if("yAmplitudeSlider" === key) {
			// remap the slider position to a log scale
			value = Math.pow(value, sliderPowExponent);
			key = "yAmplitude";
		} else {
			// remap the textbox input to the slider scale
			var sliderValue = Math.pow(value, 1/sliderPowExponent);
			this.$elements.filterByData('key', "yAmplitudeSlider").filterByData('channel', channel).val(sliderValue);
		}
	}
    if (key === 'yAmplitude' && value < yAmplitudeMin) value = yAmplitudeMin; // prevent amplitude hitting zero
    this.$elements.not($element).filterByData('key', key).filterByData('channel', channel).val(value);
    channelConfig[channel][key] = value;
    this.emit('channelConfig', channelConfig);
  }

  setChannelGains(value, min, max){
    this.$elements.filterByData('key', 'yAmplitudeSlider').prop('min', min).prop('max', max);
    this.$elements.filterByData('key', 'yAmplitude').val(value);
    for (let item of channelConfig){
      item.yAmplitude = value;
    }
    this.emit('channelConfig', channelConfig);
    // console.log(value, this.$elements.filterByData('key', 'yAmplitude').val());
  }
  setChannelOffsets(value, min, max){
    this.$elements.filterByData('key', 'yOffset').not('input[type=number]').prop('min', min).prop('max', max);
    this.$elements.filterByData('key', 'yOffset').val(value);
    for (let item of channelConfig){
      item.yOffset = value;
    }
    this.emit('channelConfig', channelConfig);
  }

  resetAll(){
    for (let i=0; i<channelConfig.length; i++){
      this.$elements.filterByData('key', 'yAmplitude').filterByData('channel', i).val(channelConfig[i].yAmplitude);
      this.$elements.filterByData('key', 'yOffset').filterByData('channel', i).val(channelConfig[i].yOffset);
    }
  }

  _numChannels(val){
    var numChannels = val;
    if (numChannels < channelConfig.length){
      while(numChannels < channelConfig.length){
        $('.channel-view-'+(channelConfig.length)).remove();
        channelConfig.pop();
      }
    } else if (numChannels > channelConfig.length){
      while(numChannels > channelConfig.length){
        channelConfig.push(new ChannelConfig());
        channelConfig[channelConfig.length-1].color = colours[(channelConfig.length-1)%colours.length];
        var el = $('.channel-view-0')
          .clone(true)
          .prop('class', 'channel-view-'+(channelConfig.length))
          .appendTo($('.control-section.channel'));
        el.find('h3').html('Channel '+(channelConfig.length));
        el.find('input').each(function(){
          $(this).data('channel', channelConfig.length-1)
        });
        el.find('input[type=color]').val(colours[(channelConfig.length-1)%colours.length].replace('0x', '#'));
      }
    }
    this.emit('channelConfig', channelConfig);
    this.$elements = $('.'+this.className);
  }

  _plotMode(val, data){

    if (val == 0){  // time domain

      this.setChannelGains(tdGainVal, tdGainMin, tdGainMax);
      this.setChannelOffsets(tdOffsetVal, tdOffsetMin, tdOffsetMax);

    } else {  // FFT

      if (data.FFTYAxis == 0){  // normalised

        this.setChannelGains(FFTNGainVal, FFTNGainMin, FFTNGainMax);
        this.setChannelOffsets(FFTNOffsetVal, FFTNOffsetMin, FFTNOffsetMax);

      } else {  // decibels

        this.setChannelGains(FFTDGainVal, FFTDGainMin, FFTDGainMax);
        this.setChannelOffsets(FFTDOffsetVal, FFTDOffsetMin, FFTDOffsetMax);

      }

    }

  }
  _FFTYAxis(val, data){

    if (data.plotMode == 1){

      if (val == 0){  // normalised

        this.setChannelGains(FFTNGainVal, FFTNGainMin, FFTNGainMax);
        this.setChannelOffsets(FFTNOffsetVal, FFTNOffsetMin, FFTNOffsetMax);

      } else {  // decibels

        this.setChannelGains(FFTDGainVal, FFTDGainMin, FFTDGainMax);
        this.setChannelOffsets(FFTDOffsetVal, FFTDOffsetMin, FFTDOffsetMax);

      }

    }

  }

}

module.exports = ChannelView;

$.fn.filterByData = function(prop, val) {
    return this.filter(
        function() { return $(this).data(prop)==val; }
    );
}
