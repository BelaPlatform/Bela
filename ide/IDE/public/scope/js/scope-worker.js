importScripts('../../socket.io/socket.io.js');

var settings = {}, channelConfig = [];

var socket = io('/BelaScopeWorker');

var zero = 0;

onmessage = function(e){
	if (!e.data || !e.data.event) return;
	if (e.data.event === 'settings'){
		settings = e.data.settings;
		if (settings.plotMode.value == 0){
			zero = settings.frameHeight/2;
		} else if (settings.plotMode.value == 1){
			zero = settings.frameHeight;
		}
	} else if (e.data.event === 'channelConfig'){
		channelConfig = e.data.channelConfig;
		//console.log(channelConfig);
	}
}

socket.on('ready', function(){
	socket.emit('buffer-received');
});

socket.on('buffer', function(buf){

	socket.emit('buffer-received');

	var inArray = new Float32Array(buf);
	//console.log("worker: recieved buffer of length "+inArray.length);
	//console.log(settings.frameHeight, settings.numChannels.value, settings.frameWidth.value, channelConfig);
	var triggerChannel = settings.triggerChannel.value;
	var xOffset = settings.xOffset.value;
	var triggerLevel = settings.triggerLevel.value;
	
	
	var numChannels = settings.numChannels.value;
	var upSampling = settings.upSampling.value;
	
	var inFrameWidth = parseInt(settings.frameWidth.value/settings.upSampling.value);
	var outFrameWidth = settings.frameWidth.value;
	
	var inArrayWidth = numChannels * inFrameWidth;
	var outArrayWidth = numChannels * outFrameWidth;
	
	var outArray = new Float32Array(outArrayWidth);
	
	if (inArray.length !== inArrayWidth) {
		console.log(inArray.length, inArrayWidth);
		console.log('frame dropped');
		return;
	}
	
	for (let channel=0; channel<numChannels; channel++){
		for (let u=0; u<upSampling; u++){
			for (let frame=0; frame<inFrameWidth; frame++){
				var outIndex = channel*outFrameWidth + frame*upSampling + u;
				var inIndex = channel*inFrameWidth + frame;
				outArray[outIndex] = zero * (1 - (channelConfig[channel].yOffset + (inArray[inIndex]+u*(inArray[inIndex+1]-inArray[inIndex])/upSampling)) / channelConfig[channel].yAmplitude);
			}
		}
	}
	
	postMessage(outArray, [outArray.buffer]);
	
	/*if (floatArray.length <= settings.numChannels.value*settings.frameWidth.value){
	
		for (var i=0; i<settings.numChannels.value; i++){
			for (var j=0; j<settings.frameWidth.value; j++){
				var index = i*settings.frameWidth.value + j;
				floatArray[index] = ( zero * (1 - (channelConfig[i].yOffset+floatArray[index])/channelConfig[i].yAmplitude)  );
			}
		}
		//console.log("worker: passing buffer of length "+floatArray.length);
		postMessage(floatArray, [floatArray.buffer]);
		
	} else {
	
		console.log('frame dropped');
		
	}*/

});