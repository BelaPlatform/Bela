var guiSketch = new p5(function( sketch ) {

    let string = "";
    let canvas_dimensions = [sketch.windowWidth, sketch.windowHeight];

    sketch.setup = function() {
        sketch.createCanvas(canvas_dimensions[0], canvas_dimensions[1]);
    };

    sketch.draw = function() {
        sketch.background('rgba(28, 232, 181, 0.5)');
        //sketch.textSize(32);
        sketch.textSize(sketch.round(sketch.windowWidth/50));
        sketch.textFont('Courier');
        sketch.textAlign(sketch.CENTER, sketch.CENTER);

        if(Bela.control.projectName != null && Bela.control.projectName != "exampleTempProject")
                    string = string + "Project name: "+Bela.control.projectName;

        string = string + "\n\nIt seems that this project is using the GUI library \n but that you forgot to include a sketch.js file in your project."
        string = string + "\n\n Look at GUI/Basic example to get started."

        sketch.text(string,  sketch.width/2,  sketch.height/2);

        sketch.noLoop();
    }
}, 'gui');
