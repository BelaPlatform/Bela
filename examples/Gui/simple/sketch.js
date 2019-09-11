var guiSketch = new p5(function( sketch ) {

    let canvas_dimensions = [sketch.windowWidth, sketch.windowHeight];

    sketch.setup = function() {
        sketch.createCanvas(canvas_dimensions[0], canvas_dimensions[1]);
    };

    sketch.draw = function() {
        
        // Draw a white background with opacity
        sketch.background(255, 10);
        
        // Retreive the data being sent from render.cpp
        let sine = Bela.data.buffers[0];
        
        // Draw a circle whose size changes with the value received from render.cpp
        sketch.noFill();
        sketch.strokeWeight(10);
        sketch.ellipse(sketch.windowWidth / 2, sketch.windowHeight / 2, (sketch.windowHeight-100)*sine, (sketch.windowHeight-100)*sine);
        
        // Draw a circle on the left hand side whose position changes with the values received from render.cpp
        sketch.ellipse(100, sketch.windowHeight/2 + (((sketch.windowHeight/2)-100)*sine), 50, 50);
        // Draw the zero crossing line
        sketch.line(50,sketch.windowHeight/2,150,sketch.windowHeight/2);
        
    };
    
}, 'gui');
