var guiSketch_template = function( sketch ) {

    let canvas_dimensions = [200,200]

    sketch.setup = function() {
        sketch.createCanvas(canvas_dimensions[0], canvas_dimensions[1]);
    };

    sketch.draw = function() {
        sketch.background(255);
        sketch.textSize(32);
        try {
              sketch.text(Bela_data.buffers[0][0].toString(), 10, 30);
        } catch(e) {}
    }


};

var guiSketch = new p5(guiSketch_template);

Bela_data.ws.addEventListener("message", function(){
    if(Bela_data.currentState == Bela_data.states[2])
        console.log("Redrawing");
        guiSketch.redraw();
}, false);
