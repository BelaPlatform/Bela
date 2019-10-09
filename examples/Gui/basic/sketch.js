var guiSketch = new p5(function( sketch ) {

    let string = "";
    let canvas_dimensions = [sketch.windowWidth, sketch.windowHeight];

    sketch.setup = function() {
        sketch.createCanvas(canvas_dimensions[0], canvas_dimensions[1]);
    };

    sketch.draw = function() {
        sketch.background('rgba(28, 232, 181, 0.5)');
        sketch.textSize(sketch.round(sketch.windowWidth/50));
        sketch.textFont('Courier');
        sketch.textAlign(sketch.CENTER, sketch.CENTER);
		string = string + "Hello!"
		string = string + "\n\n This is a basic p5 example \nto help you get started with the Bela GUI";
        sketch.text(string,  sketch.width/2,  sketch.height/2);
        sketch.noLoop();
    }
}, 'gui');
