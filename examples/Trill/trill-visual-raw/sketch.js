var guiSketch = new p5(( sketch ) => {
	
	let canvas_dimensions = [sketch.windowWidth, sketch.windowHeight];
	
	let sensorNumber = 30;

	let chartTop = 100;
	let chartBottom = canvas_dimensions[1]-chartTop;
	let chartLeft = 100;
	let chartRight = canvas_dimensions[0]-chartLeft;

	let dataRange = [0, 1];
	
	let barWidth = (chartRight-chartLeft) / (sensorNumber*1.5);
	
	sketch.setup = function () {
		sketch.createCanvas(canvas_dimensions[0], canvas_dimensions[1]);
	}
	
	sketch.draw = function () {
			sketch.background(255);
		 
			sketch.noStroke();
			sketch.textSize(10);
			
			sensorNumber = Bela.data.buffers[0];
			dataRange = Bela.data.buffers[1];
			barWidth = (chartRight-chartLeft) / (sensorNumber*1.5);
	
	
			for (let i = 0; i < sensorNumber; i++) {
		    	let x = sketch.map(i, 0, sensorNumber - 1, chartLeft, chartRight);
		    	//let data = sketch.random(dataRange[0], dataRange[1]);
		    	let data =  Bela.data.buffers[2][i];
		    	let y = sketch.map(data, dataRange[0], dataRange[1], chartBottom, chartTop);
		    
		    	sketch.strokeWeight(barWidth);
		    	sketch.strokeCap(sketch.SQUARE);
		    	sketch.stroke(0);
		    	sketch.line(x, chartBottom, x, y);
		    
		    	sketch.noStroke();
		    	sketch.textAlign(sketch.CENTER);
		    	sketch.text(i, x, chartBottom + 15);
			}
	}
	
	sketch.windowResized = function() {
		if(sketch.windowWidth > 350  & sketch.windowHeight > 250) {
			canvas_dimensions = [sketch.windowWidth, sketch.windowHeight]
			sketch.resizeCanvas(canvas_dimensions[0], canvas_dimensions[1]);
	
			chartBottom = canvas_dimensions[1]-chartTop;
			chartRight = canvas_dimensions[0]-chartLeft;
			barWidth = (chartRight-chartLeft) / (sensorNumber*1.5);
		}
	}
}, 'gui');


