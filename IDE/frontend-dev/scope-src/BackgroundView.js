'use strict';
var View = require('./View');

class BackgroundView extends View{

	constructor(className, models, renderer){
		super(className, models);
		var saveCanvas =  document.getElementById('saveCanvas');
		this.canvas = document.getElementById('scopeBG');
		saveCanvas.addEventListener('click', () => {
			this.canvas.getContext('2d').drawImage(renderer.view, 0, 0);
			saveCanvas.href = this.canvas.toDataURL();
			this.repaintBG();
		});
	}
	
	repaintBG(xTime, data){
		var canvas = this.canvas;
		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;
		var ctx = canvas.getContext('2d');
		ctx.rect(0, 0, canvas.width, canvas.height);
		ctx.fillStyle="white";
		ctx.fill();
		//ctx.clearRect(0, 0, canvas.width, canvas.height);
		
		if (data.plotMode == 1){
			this.FFTBG(canvas, ctx, data);
			return;
		}

		var xPixels = xTime*this.models[0].getKey('sampleRate')/1000;
		var numVLines = Math.floor(canvas.width/xPixels);
		var mspersample = xTime*data.downSampling/data.upSampling;
		
		//console.log(xTime);

		//faint lines
		ctx.strokeStyle = '#000000';
		ctx.fillStyle="grey";
		ctx.font = "14px inconsolata";
		ctx.textAlign = "center";
		ctx.lineWidth = 0.2;
		ctx.setLineDash([]);
		ctx.beginPath();
		ctx.fillText(0, canvas.width/2, canvas.height/2+11);
		for (var i=1; i<numVLines; i++){
			ctx.moveTo(canvas.width/2 + i*xPixels, 0);
			ctx.lineTo(canvas.width/2 + i*xPixels, canvas.height);
			ctx.fillText((i*mspersample).toPrecision(2), canvas.width/2 + i*xPixels, canvas.height/2+11);
			ctx.moveTo(canvas.width/2 - i*xPixels, 0);
			ctx.lineTo(canvas.width/2 - i*xPixels, canvas.height);
			ctx.fillText((-i*mspersample).toPrecision(2), canvas.width/2 - i*xPixels, canvas.height/2+11);
		}
		
		var numHLines = 6;
		for (var i=1; i<numHLines; i++){
			if (i != numHLines/2){
				ctx.moveTo(0, canvas.height*i/numHLines);
				ctx.lineTo(canvas.width, canvas.height*i/numHLines);
			}
		}
		
		//ticks
		var numTicks = 10;
		var tickSize;
		for (var i=0; i<numVLines; i++){
			for (var j=1; j<numTicks; j++){
				tickSize = 7;
				if (j === Math.floor(numTicks/2)){
					tickSize = 10;
				}
				ctx.moveTo(canvas.width/2 + i*xPixels + xPixels*j/numTicks, canvas.height/2 + tickSize);
				ctx.lineTo(canvas.width/2 + i*xPixels + xPixels*j/numTicks, canvas.height/2 - tickSize);
				if (i){
					ctx.moveTo(canvas.width/2 - i*xPixels + xPixels*j/numTicks, canvas.height/2 + tickSize);
					ctx.lineTo(canvas.width/2 - i*xPixels + xPixels*j/numTicks, canvas.height/2 - tickSize);
				}
			}
		}	
		
		numTicks = 10;
		for (var i=0; i<numHLines; i++){
			for (var j=1; j<numTicks; j++){
				tickSize = 7;
				if (j === Math.floor(numTicks/2)){
					tickSize = 10;
				}
				ctx.moveTo(canvas.width/2 - tickSize, canvas.height*i/numHLines + canvas.height*j/(numTicks*numHLines));
				ctx.lineTo(canvas.width/2 + tickSize, canvas.height*i/numHLines + canvas.height*j/(numTicks*numHLines));
			}
		}	
		ctx.stroke();
		
		//dashed lines
		ctx.beginPath();
		ctx.setLineDash([2, 5]);
		
		ctx.moveTo(0, canvas.height*3/4);
		ctx.lineTo(canvas.width, canvas.height*3/4);
		ctx.moveTo(0, canvas.height*1/4);
		ctx.lineTo(canvas.width, canvas.height*1/4);
		
		ctx.stroke();	
		ctx.setLineDash([]);	
		
		//fat lines
		ctx.lineWidth = 1;
		ctx.beginPath();
		var numVLines = 2;
		for (var i=0; i<=numVLines; i++){
			ctx.moveTo(canvas.width*i/numVLines, 0);
			ctx.lineTo(canvas.width*i/numVLines, canvas.height);
		}
		
		var numHLines = 2;
		for (var i=0; i<=numHLines; i++){
			ctx.moveTo(0, canvas.height*i/numHLines);
			ctx.lineTo(canvas.width, canvas.height*i/numHLines);
		}
		
		ctx.stroke();
		
		//trigger line
		/*ctx.strokeStyle = '#0000ff';
		ctx.lineWidth = 0.2;
		ctx.beginPath();
		ctx.moveTo(0, (canvas.height/2)*(1-(this.yOffset+this.triggerLevel)/this.yAmplitude) );
		ctx.lineTo(canvas.width, (canvas.height/2)*(1-(this.yOffset+this.triggerLevel)/this.yAmplitude) );
		ctx.stroke();*/
	}
	
	FFTBG(canvas, ctx, data){
		
		var numVlines = 10;
		
		//faint lines
		ctx.strokeStyle = '#000000';
		ctx.fillStyle="grey";
		ctx.font = "14px inconsolata";
		ctx.textAlign = "center";
		ctx.lineWidth = 0.3;
		ctx.setLineDash([]);
		ctx.beginPath();
				
		for (var i=0; i <= numVlines; i++){
			ctx.moveTo(i*window.innerWidth/numVlines, 0);
			ctx.lineTo(i*window.innerWidth/numVlines, canvas.height);
			if (i && i !== numVlines){
				var val;
				if (parseInt(this.models[0].getKey('FFTXAxis')) === 0){	// linear x axis
					val = ((i*this.models[0].getKey('sampleRate')/(numVlines*2))*data.upSampling/data.downSampling).toFixed(0);
					//console.log(val);
				} else {
					val = (Math.pow(Math.E, -(Math.log(1/window.innerWidth))*i/numVlines) * (this.models[0].getKey('sampleRate')/(2*window.innerWidth)) * (data.upSampling/data.downSampling)).toFixed(0);
				}
				
				ctx.fillText(val, i*window.innerWidth/numVlines, canvas.height-2);
			}
		}
		
		var numHLines = 6;
		for (var i=1; i<numHLines; i++){
			ctx.moveTo(0, canvas.height*i/numHLines);
			ctx.lineTo(canvas.width, canvas.height*i/numHLines);
		}
		
		ctx.stroke();
		
		//fat lines
		ctx.lineWidth = 1;
		ctx.beginPath();

		ctx.moveTo(0, 0);
		ctx.lineTo(0, canvas.height);

		ctx.moveTo(0, canvas.height);
		ctx.lineTo(canvas.width, canvas.height);
			
		ctx.stroke();
	}
	
	__xTimeBase(value, data){
		//console.log(value);
		this.repaintBG(value, data);
	}
	
	_plotMode(value, data){
		this.repaintBG(data.xTimeBase, data);
	}
	_FFTXAxis(value, data){
		this.repaintBG(data.xTimeBase, data);
	}
	
	_upSampling(value, data){
		this.repaintBG(data.xTimeBase, data);
	}
	_downSampling(value, data){
		this.repaintBG(data.xTimeBase, data);
	}
	
	_triggerLevel(value, data){
		//console.log(value, data);
	}
	
}

module.exports = BackgroundView;
