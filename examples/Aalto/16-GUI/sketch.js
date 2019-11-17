var guiSketch = new p5(function( sketch ) {

    let canvas_dimensions = [sketch.windowWidth, sketch.windowHeight];

    sketch.setup = function() {
        sketch.createCanvas(canvas_dimensions[0], canvas_dimensions[1]);
    };

    sketch.draw = function() {
        
        // Draw a white background with opacity
        sketch.background(0, 50);
        
        // Retreive the data being sent from render.cpp
        let sine = Bela.data.buffers[0];
        
        let circlePosition = sketch.windowWidth/5;
        
        // Draw a circle whose size changes with the value received from render.cpp
        sketch.noFill();
        sketch.stroke(255);
        sketch.strokeWeight(10);
        
        for (var i = 0; i < 4; i++) {
          const thickness = 30 * sketch.abs(sine[i]);
          sketch.strokeWeight(thickness);
          sketch.ellipse(circlePosition + (circlePosition*i), sketch.windowHeight / 2, 200, 200);
        }
        
    };
    
}, 'gui');
