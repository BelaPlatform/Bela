
var settings = {}, channelConfig = [];

var wsAddress = "ws://" + location.host + ":5432/scope_data";
var ws = new WebSocket(wsAddress);
var ws_onerror = function(e){
	setTimeout(() => {
		ws = new WebSocket(wsAddress);
		ws.onerror = ws_onerror;
		ws.onopen = ws_onopen;
		ws.onmessage = ws_onmessage;
	}, 500);
};
ws.onerror = ws_onerror;

var ws_onopen = function(){
	ws.binaryType = 'arraybuffer';
	console.log('scope data websocket open');
	ws.onclose = ws_onerror;
	ws.onerror = undefined;
};
ws.onopen = ws_onopen;

var zero = 0, triggerChannel = 0, xOffset = 0, triggerLevel = 0, numChannels = 0, upSampling = 0;
var inFrameWidth = 0, outFrameWidth = 0, inArrayWidth = 0, outArrayWidth = 0, interpolation = 0;

const plotModeTimeDomain = 0;
const plotModeFft = 1;

onmessage = function(e){
	if (!e.data || !e.data.event) return;
	if (e.data.event === 'settings'){
		settings = e.data.settings;
		if (plotModeTimeDomain == settings.plotMode){
			zero = settings.frameHeight/2;
		} else if (plotModeFft == settings.plotMode){
			zero = settings.frameHeight;
		}
		
		triggerChannel = settings.triggerChannel;
		xOffset = settings.xOffset;
		triggerLevel = settings.triggerLevel;
	
		numChannels = settings.numChannels;
		upSampling = settings.upSampling;
	
		inFrameWidth = Math.floor(settings.frameWidth/upSampling);
		outFrameWidth = settings.frameWidth;
	
		inArrayWidth = numChannels * inFrameWidth;
		outArrayWidth = numChannels * outFrameWidth;
		
		interpolation = !settings.interpolation;
		
	} else if (e.data.event === 'channelConfig'){
		channelConfig = e.data.channelConfig;
		//console.log(channelConfig);
	}
}

var ws_onmessage = function(e){

	var inArray = new Float32Array(e.data);
// 	console.log("worker: recieved buffer of length "+inArray.length, inArrayWidth);
//	console.log(settings.frameHeight, settings.numChannels, settings.frameWidth, channelConfig);
	
	var outArray = new Float32Array(outArrayWidth);
		
	if (inArray.length !== inArrayWidth) {
		console.log(inArray.length, inArrayWidth, inFrameWidth);
		console.log('worker: frame dropped');
		return;
	}
	
	for (var channel=0; channel<numChannels; ++channel){
		var outIndex;
		var endOfInArray = (channel + 1) * inFrameWidth;
		for (var frame=0; frame<inFrameWidth; ++frame){
			for (var u=0; u<upSampling; ++u){
				var inIndex = channel*inFrameWidth + frame;
				var first = inArray[inIndex];
				var second = inArray[inIndex + 1 < endOfInArray ? inIndex + 1 : endOfInArray];
				var diff = interpolation ? u*(second-first)/upSampling : 0;
				outIndex = channel*outFrameWidth + frame*upSampling + u;
				outArray[outIndex] = zero * (1 - (channelConfig[channel].yOffset + (inArray[inIndex]+diff)) * channelConfig[channel].yAmplitude);
			}
		}
		// the above will not always get to the end of outArray, depending on the ratio between upSampling and outFrameWidth
		// fill in the remaining of the buffer
		var endOfOutArray = (channel + 1) * outFrameWidth;
		// we could fill with nans or zero-order hold
		//var fillValue = outArray[outIndex]; // ZOH
		var fillValue = NaN; // NaN
		if(interpolation){
			// if we are interpolating, we will now have a flat line at the end of the frame,
			// as we have interpolated between two values that are the same
			// so let's overwrite those as well
			outIndex -= upSampling;
		}
		while(outIndex < endOfOutArray){
			outArray[outIndex++] = fillValue;
		}
	}
//  	for(var n = 0; n < upSampling; ++n){
// 		outArray[outArray.length - 1 - n] = outArray[outArray.length - upSampling - 1];
// 	}
	
	postMessage(outArray, [outArray.buffer]);

};
ws.onmessage = ws_onmessage;
