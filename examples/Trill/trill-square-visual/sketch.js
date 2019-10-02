if(typeof TrillSquare === 'undefined') {
	TrillSquare = class {
		constructor(sketch, width, position = [50, 50]) {
			this.s = sketch;
			this.position = position;
			this.width = width;
			this.touch = {
				scale: 0.25,
				size: 0,
				location: [null, null],
				active: 0,
				color: 'ivory'
			}
		}
		
		draw() {
			this.s.fill(0);
	        this.s.rect(this.position[0], this.position[1], this.width, this.width, 20);
	        if(this.touchActive()) {
				this.drawTouch();
	        	this.touch.active = 0;
	        }
		}
		
		updateTouch(location, size) {
			this.touch.active = 1;
			location[0] = this.s.constrain(location[0], 0, 1);
			location[1] = this.s.constrain(location[1], 0, 1);
			this.touch.location = [this.width*location[0], this.width*location[1]];
			size = this.s.constrain(size, 0, 1);
			this.touch.size = size;
		}
		
		touchActive() {
			return this.touch.active;
		}
		
		setTouchState(state) {
			this.touch.active = Boolean(state);
		}
		
		drawTouch(i) {
			this.s.fill(this.touch.color);
			let diameter = this.width*this.touch.size*this.touch.scale;
			this.s.ellipse(this.position[0] + this.touch.location[0], this.position[1] + this.touch.location[1], diameter);
			
		}
		
		changeTouchColor(newColor) {
			this.touch.color = this.s.color(newColor);
		}
		
		changeTouchScale(scale) {
			if(scale <=1 ) {
				this.touch.scale = scale;
			}
		}
		
		resize(width) {
			this.width = width;
		}
	}
}
var guiSketch_template = function( sketch ) {

    let canvas_dimensions = [sketch.windowHeight,sketch.windowWidth];

    let spacing;
    let startPoint;

    let numTouches = 0;
    let touchSize = 0;
    let touchPosition = [0, 0];


    sketch.setup = function() {
        sketch.createCanvas(sketch.windowWidth, sketch.windowHeight);
        spacing=sketch.height/20;
        startPoint=(sketch.width/2)-spacing*7;
        rectWidth = sketch.height*0.7;
        rectStart = sketch.height*0.1;
        
        sketch.trill = new TrillSquare(sketch, rectWidth, [sketch.width/2-rectWidth/2, rectStart]);

        belaLogo = sketch.loadImage('../images/logo_bar14.png');

    };

    sketch.draw = function() {
          
        sketch.background(240);
        sketch.resizeElements();

        if(typeof Bela.data.buffers[0] != 'undefined')
        	touchPosition = Bela.data.buffers[0];
        
        if(typeof Bela.data.buffers[1] != 'undefined')
        	touchSize = Bela.data.buffers[1][0];
        sketch.print(touchSize);
        sketch.trill.updateTouch(touchPosition, touchSize);
        sketch.trill.draw();
        sketch.image(belaLogo,sketch.width-170, sketch.height-70,120,50);

    }

    sketch.resizeElements = function() {
        rectWidth = sketch.height*0.7;
        rectStart = sketch.height*0.1;
    }

    sketch.windowResized = function() {
    	rectWidth = sketch.height*0.7;
        rectStart = sketch.height*0.1;
        sketch.trill.resize(recWidth);
        sketch.resizeCanvas(sketch.windowWidth, sketch.windowHeight)
    }
};



var guiSketch = new p5(guiSketch_template);

