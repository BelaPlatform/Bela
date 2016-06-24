'use strict';
var dgram = require('dgram');
var scopeOSC = require('./scope-osc');

var scopeConnected = false;
var settings = {
	connected		: {type: 'integer', value: 0},
	numChannels		: {type: 'integer', value: 2},
	sampleRate		: {type: 'float', value: 44100},
	frameWidth		: {type: 'integer', value: 1280},
	triggerMode		: {type: 'integer', value: 0},
	triggerChannel	: {type: 'integer', value: 0},
	triggerDir		: {type: 'integer', value: 0},
	triggerLevel	: {type: 'float', value: 0},
	xOffset			: {type: 'integer', value: 0},
	upSampling		: {type: 'integer', value: 1},
	downSampling	: {type: 'integer', value: 1},
	holdOff			: {type: 'float', value: 20}
}

var UDP_RECIEVE = 8677;

var scope = {
	
	init(io){	
		
		// setup the websockets
		this.webSocket = io.of('/BelaScope');
		this.workerSocket = io.of('/BelaScopeWorker');
		
		this.webSocket.on('connection', (socket) => this.browserConnected(socket) );
		this.workerSocket.on('connection', (socket) => this.workerConnected(socket) );
		
		// setup the OSC server
		scopeOSC.init();
		scopeOSC.on('scope-setup', (args) => this.scopeConnected(args) );
		
		// UDP socket to receive raw scope data from bela scope
		var scopeUDP = dgram.createSocket('udp4');
		scopeUDP.bind(UDP_RECIEVE, '127.0.0.1');

		// echo raw scope data over websocket to browser
		scopeUDP.on('message', (buffer) => {
			//console.log('raw scope buffer recieved, of length', buffer.length);
			this.workerSocket.emit('buffer', buffer);
		});
		
	},
	
	scopeConnected(args){
		
		if (args[0].type === 'integer' && args[1].type === 'float'){
			settings.numChannels = args[0];
			settings.sampleRate = args[1];
		} else {
			console.log('bad setup message args', args);
			return;
		}
		
		console.log('scope connected');
		scopeConnected = true;
		
		this.webSocket.emit('settings', settings);
		
		scopeOSC.sendSetupReply(settings);
			
	},
	
	browserConnected(socket){
		console.log('scope browser connected');
		
		// send the settings to the browser
		socket.emit('settings', settings);
		
		// tell the scope that the browser is connected
		settings.connected.value = 1;
		if (scopeConnected)
			scopeOSC.sendSetting('connected', settings.connected);
			
		socket.on('disconnect', () => {
			console.log('scope browser disconnected');
			// tell the scope that the browser is connected
			settings.connected.value = 0;
			if (scopeConnected)
				scopeOSC.sendSetting('connected', settings.connected);
		});
		
		socket.on('settings-event', (key, value) => {
			if (settings[key]){
				if (key === 'upSampling' || key === 'downSampling') {
					this[key]();
					return;
				}
				if (settings[key].type === 'integer') value = parseInt(value);
				else if (settings[key].type === 'float') value = parseFloat(value);
				settings[key].value = value;
				if (scopeConnected)
					scopeOSC.sendSetting(key, settings[key]);
			} else {
				console.log('bad settings-event', key, value);
			}
		});
		
	},
	
	upSampling(){
		if (settings.downSampling.value > 1){
			settings.downSampling.value -= 1;
			this.webSocket.emit('settings', {downSampling: settings.downSampling});
			if (scopeConnected)
				scopeOSC.sendSetting('downSampling', settings['downSampling']);
		} else {
			settings.upSampling.value += 1;
			this.webSocket.emit('settings', {upSampling: settings.upSampling});
			if (scopeConnected)
				scopeOSC.sendSetting('upSampling', settings['upSampling']);
		}
	},
	downSampling(){
		if (settings.upSampling.value > 1){
			settings.upSampling.value -= 1;
			this.webSocket.emit('settings', {upSampling: settings.upSampling});
			if (scopeConnected)
				scopeOSC.sendSetting('upSampling', settings['upSampling']);
		} else {
			settings.downSampling.value += 1;
			this.webSocket.emit('settings', {downSampling: settings.downSampling});
			if (scopeConnected)
				scopeOSC.sendSetting('downSampling', settings['downSampling']);
		}
	},
	
	workerConnected(socket){
		socket.emit('hi');
	}
	
};

module.exports = scope;