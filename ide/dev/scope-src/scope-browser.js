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
});
controlView.on('plotMode', (val) => {
	settings.setKey('plotMode', {type: 'integer', value: val});
	//backgroundView._plotMode(val, settings._getData());
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
	if (newSettings.frameWidth) newSettings.frameWidth.value = window.innerWidth;
	newSettings.frameHeight = window.innerHeight;
	settings.setData(newSettings);
	//console.log(newSettings);
	//settings.print();
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
		var xTimeBase = Math.max(Math.floor(1000*(data.frameWidth.value/8)/data.sampleRate.value), 1);
		settings.setKey('xTimeBase', xTimeBase);
		socket.emit('settings-event', 'frameWidth', data.frameWidth.value)
	} else {
		worker.postMessage({
			event		: 'settings',
			settings	: data
		});
	}
});

// window events
$(window).on('resize', () => {
	settings.setKey('frameWidth', {type: 'integer', value: window.innerWidth});
	settings.setKey('frameHeight', window.innerHeight);
});

$('#scope').on('mousemove', e => {
	if (settings.getKey('plotMode') === undefined) return;
	var plotMode = settings.getKey('plotMode').value;
	var scale = settings.getKey('downSampling').value / settings.getKey('upSampling').value;
	var x, y;
	if (plotMode == 0){
		x = (1000*scale*(e.clientX-window.innerWidth/2)/settings.getKey('sampleRate').value).toPrecision(4)+'ms';
		y = (1 - 2*e.clientY/window.innerHeight).toPrecision(3);
	} else if (plotMode == 1){
		x = parseInt(settings.getKey('sampleRate').value*e.clientX/(2*window.innerWidth*scale));
		if (x > 1500) x = (x/1000) + 'khz';
		else x += 'hz';
		y = (1 - e.clientY/window.innerHeight).toPrecision(3);
	}
	$('#scopeMouseX').html('x: '+x);
	$('#scopeMouseY').html('y: '+y);
});

// CPU usage
function CPU(data){
	var ide = data.syntaxCheckProcess + data.buildProcess + data.node + data.gdb;
	var bela = 0, rootCPU = 1;
	
	if (data.bela != 0){
	
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

	$('#scope-cpu').html('cpu: '+(ide*rootCPU + bela).toFixed(1)+'%');
	
	if (bela && (ide*rootCPU + bela) > 80){
		$('#scope-cpu').css('color', 'red');
	} else {
		$('#scope-cpu').css('color', 'black');
	}
}

// plotting
{
	
	let canvas = document.getElementById('scope');
	let ctx = canvas.getContext('2d');
	ctx.lineWidth = 2;
	
	let width, height, numChannels, channelConfig = [];
	settings.on('change', (data, changedKeys) => {
		if (changedKeys.indexOf('frameWidth') !== -1 || changedKeys.indexOf('frameHeight') !== -1){
			canvas.width = window.innerWidth;
			width = canvas.width;
			canvas.height = window.innerHeight;
			height = canvas.height;
		}
		if (changedKeys.indexOf('numChannels') !== -1){
			numChannels = data.numChannels.value;
		}
	});
	channelView.on('channelConfig', (config) => channelConfig = config );
	
	let frame, length, plot = false;

	worker.onmessage = function(e) {
		frame = e.data;
		length = Math.floor(frame.length/numChannels);
		// if scope is paused, don't set the plot flag
		plot = !paused; 
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
				ctx.moveTo(0, frame[i*length]);	
				
				for (var j=1; j<length; j++){
					ctx.lineTo(j, frame[j+i*length]);
				}
	
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
	let scopeStatus = $('#scopeStatus');
	function triggerStatus(){
	
		if (scopeStatus.hasClass('scope-status-waiting')) scopeStatus.removeClass('scope-status-waiting');
			
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
		}
	}
	
	let saveCanvasData =  document.getElementById('saveCanvasData');		
	saveCanvasData.addEventListener('click', function(){

		let downSampling = settings.getKey('downSampling').value;
		let upSampling = settings.getKey('upSampling').value;
		let sampleRate = settings.getKey('sampleRate').value;
		
		let out = "data:text/csv;charset=utf-8,";
		
		for (let i=0; i<length; i++){
			out += i*downSampling/(upSampling * sampleRate);
			for (let j=0; j<numChannels; j++){
				out += ','+ ( ( 1 - frame[j*length + i] / (height/2) ) * channelConfig[j].yAmplitude - channelConfig[j].yOffset );
			}
			out += '\n';
		}

		this.href = encodeURI(out);
	});
	
}









