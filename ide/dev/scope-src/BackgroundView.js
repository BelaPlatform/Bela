'use strict';
var View = require('./View');

class BackgroundView extends View{

	constructor(className, models){
		super(className, models);
		var saveCanvas =  document.getElementById('saveCanvas');
		this.canvas = document.getElementById('scopeBG');
		saveCanvas.addEventListener('click', () => {
			this.canvas.getContext('2d').drawImage(document.getElementById('scope'), 0, 0);
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
		
		var xPixels = xTime*this.models[0].getKey('sampleRate').value/1000;
		var numVLines = Math.floor(canvas.width/xPixels);

		//faint lines
		ctx.strokeStyle = '#000000';
		ctx.lineWidth = 0.2;
		ctx.setLineDash([]);
		ctx.beginPath();
		for (var i=1; i<numVLines; i++){
			ctx.moveTo(canvas.width/2 + i*xPixels, 0);
			ctx.lineTo(canvas.width/2 + i*xPixels, canvas.height);
			ctx.moveTo(canvas.width/2 - i*xPixels, 0);
			ctx.lineTo(canvas.width/2 - i*xPixels, canvas.height);
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
	
	__xTimeBase(value, data){
		//console.log(value);
		this.repaintBG(value, data);
	}
	
}

module.exports = BackgroundView;
