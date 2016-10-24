'use strict';

// worker
var worker = new Worker("js/scope-worker.js");

// models
var Model = require('./Model');
var settings = new Model();

// views
var controlView = new (require('./ControlView'))('scopeControls', [settings]);
var backgroundView = new (require('./BackgroundView'))('scopeBG', [settings]);
var channelView = new (require('./ChannelView'))('channelView', [settings]);
var sliderView = new (require('./SliderView'))('sliderView', [settings]);

// main bela socket
var belaSocket = io('/IDE');

// scope socket
var socket = io('/BelaScope');

var paused = false, oneShot = false;

// view events
controlView.on('settings-event', (key, value) => {
	if (key === 'scopePause'){
		if (paused){
			paused = false;
			$('#pauseButton').html('pause');
			$('#scopeStatus').html('waiting');
		} else {
			paused = true;
			$('#pauseButton').html('resume');
			$('#scopeStatus').removeClass('scope-status-triggered').addClass('scope-status-waiting').html('paused');
		}
		return;
	} else if (key === 'scopeOneShot'){
		oneShot = true;
		if (paused){
			paused = false;
			$('#pauseButton').html('pause');
		}
		$('#scopeStatus').removeClass('scope-status-triggered').addClass('scope-status-waiting').html('waiting (one-shot)');
	}
	socket.emit('settings-event', key, value);
	// console.log(key, value);
	if (value !== undefined) settings.setKey(key, value);
});

channelView.on('channelConfig', (channelConfig) => {
	worker.postMessage({
		event			: 'channelConfig',
		channelConfig
	});
});

sliderView.on('slider-value', (slider, value) => socket.emit('slider-value', slider, value) );

// socket events
socket.on('settings', (newSettings) => {
	
	let obj = {};
	for (let key in newSettings){
		obj[key] = newSettings[key].value;
	}
	
	obj.frameWidth = window.innerWidth;
	obj.frameHeight = window.innerHeight;
	
	// console.log(newSettings, obj);
	settings.setData(obj);
	
	controlView.setControls(obj);
});
socket.on('scope-slider', args => sliderView.emit('set-slider', args) );
socket.on('dropped-count', count => {
	$('#droppedFrames').html(count);
	if (count > 10)
		$('#droppedFrames').css('color', 'red');
	else
		$('#droppedFrames').css('color', 'black');
});

belaSocket.on('cpu-usage', CPU);

// model events
settings.on('set', (data, changedKeys) => {
	if (changedKeys.indexOf('frameWidth') !== -1){
		var xTimeBase = Math.max(Math.floor(1000*(data.frameWidth/8)/data.sampleRate), 1);
		settings.setKey('xTimeBase', xTimeBase);
		socket.emit('settings-event', 'frameWidth', data.frameWidth)
	} else {
		worker.postMessage({
			event		: 'settings',
			settings	: data
		});
	}
});

// window events
$(window).on('resize', () => {
	settings.setKey('frameWidth', window.innerWidth);
	settings.setKey('frameHeight', window.innerHeight);
});

$('#scope').on('mousemove', e => {
	if (settings.getKey('plotMode') === undefined) return;
	var plotMode = settings.getKey('plotMode');
	var scale = settings.getKey('downSampling') / settings.getKey('upSampling');
	var x, y;
	if (plotMode == 0){
		x = (1000*scale*(e.clientX-window.innerWidth/2)/settings.getKey('sampleRate')).toPrecision(4)+'ms';
		y = (1 - 2*e.clientY/window.innerHeight).toPrecision(3);
	} else if (plotMode == 1){
		if (parseInt(settings.getKey('FFTXAxis')) === 0){
			x = parseInt(settings.getKey('sampleRate')*e.clientX/(2*window.innerWidth*scale));
		} else {
			x = parseInt(Math.pow(Math.E, -(Math.log(1/window.innerWidth))*e.clientX/window.innerWidth) * (settings.getKey('sampleRate')/(2*window.innerWidth)) * (settings.getKey('upSampling')/(settings.getKey('downSampling'))));
		}
		if (x > 1500) x = (x/1000) + 'khz';
		else x += 'hz';
		y = (1 - e.clientY/window.innerHeight).toPrecision(3);
	}
	$('#scopeMouseX').html('x: '+x);
	$('#scopeMouseY').html('y: '+y);
});

// CPU usage
function CPU(data){
	var ide = (data.syntaxCheckProcess || 0) + (data.buildProcess || 0) + (data.node || 0);
	var bela = 0, rootCPU = 1;
	
	if (data.bela != 0 && data.bela !== undefined){
	
		// extract the data from the output
		var lines = data.bela.split('\n');
		var taskData = [], output = [];
		for (var j=0; j<lines.length; j++){
			taskData.push([]);
			lines[j] = lines[j].split(' ');
			for (var k=0; k<lines[j].length; k++){
				if (lines[j][k]){
					taskData[j].push(lines[j][k]);
				}
			}
		}
			
		for (var j=0; j<taskData.length; j++){
			if (taskData[j].length){
				var proc = {
					'name'	: taskData[j][7],
					'cpu'	: taskData[j][6],
					'msw'	: taskData[j][2],
					'csw'	: taskData[j][3]
				};
				if (proc.name === 'ROOT') rootCPU = proc.cpu*0.01;
				// ignore uninteresting data
				if (proc && proc.name && proc.name !== 'ROOT' && proc.name !== 'NAME' && proc.name !== 'IRQ29:'){
					output.push(proc);
				}
			}
		}

		for (var j=0; j<output.length; j++){
			if (output[j].cpu){
				bela += parseFloat(output[j].cpu);
			}
		}

		bela += data.belaLinux * rootCPU;	

	}
	
	$('#ide-cpu').html('ide: '+(ide*rootCPU).toFixed(1)+'%');
	$('#bela-cpu').html('bela: '+( bela ? bela.toFixed(1)+'%' : '--'));
	
	if (bela && (ide*rootCPU + bela) > 80){
		$('#ide-cpu, #bela-cpu').css('color', 'red');
	} else {
		$('#ide-cpu, #bela-cpu').css('color', 'black');
	}
	
}

// plotting
{
	
	let canvas = document.getElementById('scope');
	let ctx = canvas.getContext('2d');
	ctx.lineWidth = 2;
	
	let width, height, numChannels, channelConfig = [], xOff = 0, triggerChannel = 0, triggerLevel = 0, xOffset = 0, upSampling = 1;;
	settings.on('change', (data, changedKeys) => {
		if (changedKeys.indexOf('frameWidth') !== -1 || changedKeys.indexOf('frameHeight') !== -1){
			canvas.width = window.innerWidth;
			width = canvas.width;
			canvas.height = window.innerHeight;
			height = canvas.height;
		}
		if (changedKeys.indexOf('numChannels') !== -1){
			numChannels = data.numChannels;
		}
		if (changedKeys.indexOf('triggerChannel') !== -1){
			triggerChannel = data.triggerChannel;
		}
		if (changedKeys.indexOf('triggerLevel') !== -1){
			triggerLevel = data.triggerLevel;
		}
		if (changedKeys.indexOf('xOffset') !== -1){
			xOffset = data.xOffset;
		}
		if (changedKeys.indexOf('upSampling') !== -1){
			upSampling = data.upSampling;
		}
	});
	channelView.on('channelConfig', (config) => channelConfig = config );
	
	let frame, length, plot = false;

	worker.onmessage = function(e) {
		frame = e.data;
		length = Math.floor(frame.length/numChannels);
		// if scope is paused, don't set the plot flag
		plot = !paused;
		
		// interpolate the trigger sample to get the sub-pixel x-offset
		if (settings.getKey('plotMode') == 0){
			if (upSampling == 1){
				let one = Math.abs(frame[Math.floor(triggerChannel*length+length/2)+xOffset-1] + (height/2) * ((channelConfig[triggerChannel].yOffset + triggerLevel)/channelConfig[triggerChannel].yAmplitude - 1));
				let two = Math.abs(frame[Math.floor(triggerChannel*length+length/2)+xOffset] + (height/2) * ((channelConfig[triggerChannel].yOffset + triggerLevel)/channelConfig[triggerChannel].yAmplitude - 1));
				xOff = (one/(one+two)-1.5);
			} else {
				for (var i=0; i<=(upSampling*2); i++){
					let one = frame[Math.floor(triggerChannel*length+length/2)+xOffset*upSampling-i] + (height/2) * ((channelConfig[triggerChannel].yOffset + triggerLevel)/channelConfig[triggerChannel].yAmplitude - 1);
					let two = frame[Math.floor(triggerChannel*length+length/2)+xOffset*upSampling+i] + (height/2) * ((channelConfig[triggerChannel].yOffset + triggerLevel)/channelConfig[triggerChannel].yAmplitude - 1);
					if ((one > triggerLevel && two < triggerLevel) || (one < triggerLevel && two > triggerLevel)){
						xOff = i*(Math.abs(one)/(Math.abs(one)+Math.abs(two))-1);
						break;
					}
				}
			}
			//console.log(xOff);
		}
	};
	
	function plotLoop(){
		requestAnimationFrame(plotLoop);
		
		if (plot){
		
			plot = false;
			ctx.clearRect(0, 0, width, height);
			//console.log('plotting');
			
			for (var i=0; i<numChannels; i++){

				ctx.strokeStyle = channelConfig[i].color;
	
				ctx.beginPath();
				ctx.moveTo(0, frame[i * length] + xOff*(frame[i * length + 1] - frame[i * length]));
				
				for (var j=1; (j-xOff)<(length); j++){
					ctx.lineTo(j-xOff, frame[j+i*length]);
				}
				//ctx.lineTo(length, frame[length*(i+1)-1]);
				//if (!i) console.log(length, j-xOff-1);

				ctx.stroke();
		
			}
			
			triggerStatus();
		
		} /*else {
			console.log('not plotting');
		}*/
		
	}
	plotLoop();
	
	// update the status indicator when triggered
	let triggerTimeout; 
	let inactiveTimeout = setTimeout(() => {
		if (!oneShot && !paused) inactiveOverlay.addClass('inactive-overlay-visible');
	}, 5000);
	let scopeStatus = $('#scopeStatus');
	let inactiveOverlay = $('#inactive-overlay');
	function triggerStatus(){
	
		scopeStatus.removeClass('scope-status-waiting');
		inactiveOverlay.removeClass('inactive-overlay-visible');
			
		// hack to restart the fading animation if it is in progress
		if (scopeStatus.hasClass('scope-status-triggered')){
			scopeStatus.removeClass('scope-status-triggered');
			void scopeStatus[0].offsetWidth;
		}
		
		scopeStatus.addClass('scope-status-triggered').html('triggered');
		
		if (oneShot){
			oneShot = false;
			paused = true;
			$('#pauseButton').html('resume');
			scopeStatus.removeClass('scope-status-triggered').addClass('scope-status-waiting').html('paused');
		} else {
			if (triggerTimeout) clearTimeout(triggerTimeout);
			triggerTimeout = setTimeout(() => {
				if (!oneShot && !paused) scopeStatus.removeClass('scope-status-triggered').addClass('scope-status-waiting').html('waiting');
			}, 1000);
			
			if (inactiveTimeout) clearTimeout(inactiveTimeout);
			inactiveTimeout = setTimeout(() => {
				if (!oneShot && !paused) inactiveOverlay.addClass('inactive-overlay-visible');
			}, 5000);
		}
	}
	
	let saveCanvasData =  document.getElementById('saveCanvasData');		
	saveCanvasData.addEventListener('click', function(){

		let downSampling = settings.getKey('downSampling');
		let upSampling = settings.getKey('upSampling');
		let sampleRate = settings.getKey('sampleRate');
		let plotMode = settings.getKey('plotMode');
		let scale = downSampling/upSampling;
		let FFTAxis = settings.getKey('FFTXAxis');
		
		console.log(FFTAxis)
				
		let out = "data:text/csv;charset=utf-8,";
		
		for (let i=0; i<length; i++){
		
			if (plotMode === 0){		// time domain
				out += scale*i/sampleRate;
			} else if (plotMode === 1) {	// FFT
				out += sampleRate*i/(2*length*scale);
			}
			
			for (let j=0; j<numChannels; j++){
				out += ','+ ( ( 1 - frame[j*length + i] / (height/2) ) * channelConfig[j].yAmplitude - channelConfig[j].yOffset );
			}
			out += '\n';
		}


		this.href = encodeURI(out);
	});
	
}









