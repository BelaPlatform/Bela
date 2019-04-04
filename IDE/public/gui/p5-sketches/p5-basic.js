var guiSketch_template = function( sketch ) {

    let canvas_dimensions = [sketch.windowHeight,sketch.windowWidth];

    sketch.setup = function() {
        sketch.createCanvas(canvas_dimensions[0], canvas_dimensions[1]);
    };

    sketch.draw = function() {
        sketch.background(255);
        sketch.textSize(32);
        try {
              sketch.text(Bela_data.buffers[0][0].toString() + " frames elapsed", 10, 30);
        } catch(e) {}
    }
};

var guiSketch = new p5(guiSketch_template);

// Instead of looking for 'message' event, trigger a new event from ws that you can look for once the data is ready

Bela_data.target.addEventListener('buffer-ready', function(event) {
    guiSketch.redraw();
});
