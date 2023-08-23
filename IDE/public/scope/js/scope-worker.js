
var settings = {}, channelConfig = [];

let wsUrl;
function setWsCbs(ws) {
	ws.onerror = ws_onerror.bind(null,ws);
	ws.onopen = ws_onopen.bind(null, ws);
	ws.onmessage = ws_onmessage.bind(null, ws);
}
var ws_onerror = function(ws, e){
	setTimeout(() => {
		ws = new WebSocket(wsUrl);
		setWsCbs(ws);
	}, 500);
};

function wsConnect(wsRemote) {
	wsUrl = wsRemote + "scope_data"
	let ws = new WebSocket(wsUrl)
	setWsCbs(ws);
}

var ws_onopen = function(ws){
	ws.binaryType = 'arraybuffer';
	console.log('scope data websocket open');
	ws.onclose = ws_onerror;
	ws.onerror = undefined;
};

var zero = 0, triggerChannel = 0, xOffset = 0, triggerLevel = 0, numChannels = 0, upSampling = 0, downSampling = 1, xAxisBehaviour = 0;
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
		downSampling = settings.downSampling;
		xAxisBehaviour = settings.xAxisBehaviour;
	
		inFrameWidth = Math.floor(settings.frameWidth/upSampling);
		outFrameWidth = settings.frameWidth;
	
		inArrayWidth = numChannels * inFrameWidth;
		outArrayWidth = numChannels * outFrameWidth;
		
		interpolation = !settings.interpolation;
		
	} else if (e.data.event === 'channelConfig'){
		channelConfig = e.data.channelConfig;
		//console.log(channelConfig);
	} else if (e.data.event === 'wsConnect') {
		wsConnect(e.data.remote);
	}
}

let rollPtr = 0;
let globalArray = new Array();
let counter = 0;

function inToOut(c, val) {
	return zero * (1 - (channelConfig[c].yOffset + val) * channelConfig[c].yAmplitude);
}

var ws_onmessage = function(ws, e){

	let timestamp = new Uint32Array(e.data.slice(0, 4))[0];
	var inArray = new Float32Array(e.data.slice(4));
// 	console.log("worker: recieved buffer of length "+inArray.length, inArrayWidth);
//	console.log(settings.frameHeight, settings.numChannels, settings.frameWidth, channelConfig);
	
	let roll = 2 == xAxisBehaviour;
	let incDrawing = downSampling > 1 && 0 != xAxisBehaviour;
	globalArray.length = outArrayWidth * (roll ? 2 : 1);
	var outArray = new Float32Array(outArrayWidth);
		
	if(incDrawing) {
		let globalFrameWidth = outFrameWidth * (roll ? 2 : 1);
		let frames = inArray.length / numChannels;
		for(let n = 0; n < frames; ++n) {
			for(let c = 0; c < numChannels; ++c) {
				let inIndex = c * frames + n;
				let outIndex = c * globalFrameWidth + rollPtr;
				globalArray[outIndex] = inToOut(c, inArray[inIndex]);
			}
			rollPtr++;
			rollPtr %= globalFrameWidth;
		}
		if(roll) {
			for(let n = 0; n < outFrameWidth; ++n) {
				for(let c = 0; c < numChannels; ++c) {
					let offset = (globalFrameWidth + n + rollPtr - outFrameWidth) % globalFrameWidth;
					outArray[c * outFrameWidth + n] = globalArray[(c * globalFrameWidth + offset)];
				}
			}
		} else
			for(let i = 0; i < outArray.length; ++i)
				outArray[i] = globalArray[i];
	} else {
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
				outArray[outIndex] = inToOut(channel, inArray[inIndex] + diff);
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
	}
//  	for(var n = 0; n < upSampling; ++n){
// 		outArray[outArray.length - 1 - n] = outArray[outArray.length - upSampling - 1];
// 	}
	
	postMessage({
		outArray: outArray,
		oldDataSeparator: 1 == xAxisBehaviour ? rollPtr : -1,
	}, [outArray.buffer]);

};

// load test
/*
let testArray = new Float32Array(0);
let testPtr = 0;
setInterval(() => {
	if(testArray.length != outArrayWidth) {
		testArray = new Float32Array(outArrayWidth);
		for(let n = 0; n < outFrameWidth ; ++n) {
			for(let c = 0; c < numChannels ; ++c) {
				testArray[c * outFrameWidth + n] = (n + testPtr) / outFrameWidth* 150 + c * 150;
			}
		}
		testPtr += 10;
		if(testPtr >= outFrameWidth)
			testPtr = 0;
	}
	postMessage({
		outArray: testArray,
		oldDataSeparator: -1,
	}, [testArray.buffer]);
}, 20);
//*/
