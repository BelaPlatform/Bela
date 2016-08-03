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

	var floatArray = new Float32Array(buf);
	//console.log("worker: recieved buffer of length "+floatArray.length);
	//console.log(settings.frameHeight, settings.numChannels.value, settings.frameWidth.value, channelConfig);
	
	if (floatArray.length <= settings.numChannels.value*settings.frameWidth.value){
	
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
		
	}
	
	socket.emit('buffer-received');

});