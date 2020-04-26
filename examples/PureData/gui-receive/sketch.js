var guiSketch = new p5(( sketch ) => {
	
    let canvas_dimensions = [sketch.windowWidth, sketch.windowHeight];

    sketch.setup = function() {
        sketch.createCanvas(canvas_dimensions[0], canvas_dimensions[1]);
    };

    sketch.draw = function() {
        sketch.background(220);
		sketch.line(sketch.mouseX, 0, sketch.mouseX, sketch.height);
  		sketch.line(0, sketch.mouseY, sketch.width, sketch.mouseY);
    };
    
    sketch.mouseMoved = function() {
    	let mouseX = sketch.mouseX/sketch.width;
    	let mouseY = sketch.mouseY/sketch.height;
    	Bela.data.sendBuffer(0, 'float', [mouseX, mouseY]);
    	Bela.control.send({mouseX: mouseX, mouseY: mouseY});
    };
    sketch.mousePressed = function(event) {
    	Bela.control.send({clickX: event.screenX/sketch.width, clickY: event.screenY/sketch.height});
    };
}, 'gui');


