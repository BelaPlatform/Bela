var guiSketch = new p5(function( sketch ) {

    let canvas_dimensions = [sketch.windowWidth, sketch.windowHeight];


    sketch.setup = function() {
        sketch.createCanvas(canvas_dimensions[0], canvas_dimensions[1]);
        sketch.textSize(50);
        sketch.textFont('Courier New');
    };

    sketch.draw = function() {
        sketch.background(254);
  
        let date = Bela.data.buffers[0];
        if(date && date.length >= 7){
	        let dateString = date[2]+'-'+date[1]+'-'+date[0];
	        dateString += ' '+date[3]+':'+date[4]+':'+date[5]+'.'+date[6];
	        sketch.fill(255, 0, 255);
	        sketch.text(dateString , 40, sketch.height/2);
        }
    }
}, 'gui');
