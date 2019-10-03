if(typeof TrillBar === "undefined") {
	TrillBar = class {
		constructor(sketch, length, position = [50, 50]) {
			this.s = sketch;
			this.position = position;
			this.dimensions = [ length, length/5 ];
			this.touches = {
				num: 5,
				scale: 0.75,
				sizes: new Array(5),
				locations: new Array(5),
				activations: [0, 0, 0, 0, 0],
				colors: [ 'honeydew', 'azure', 'lavenderblush', 'ivory', 'navajowhite' ]
				//colors: [ 'red', 'blue', 'yellow', 'white', 'cyan' ]
			}
		}
		
		draw() {
			this.s.fill(35);
	        this.s.rect(this.position[0], this.position[1], this.dimensions[0], this.dimensions[1], 30);
	       
	        for(let t = 0; t < this.touches.num; t++) {
	        	if(this.touchActive(t)) {
	        		this.drawTouch(t);
	        		this.touches.activations[t] = 0;
	        	}
	        }
		}
		
		updateTouch(i, location, size) {
			if(i<5) {
				this.touches.activations[i] = 1;
				location = this.s.constrain(location, 0, 1);
				this.touches.locations[i] = this.dimensions[0]*location;
				size = this.s.constrain(size, 0, 1);
				this.touches.sizes[i] = size;
			}
		}
		
		activeTouches() {
			return this.touches.activations.filter(Boolean).length;
		}
		
		touchActive(i) {
			if(i<5)
				return this.touches.activations[i];
		}
		
		setTouchState(i, state) {
			if(i<5)
				this.touches.activations[t] = Boolean(state);
		}
		
		drawTouch(i) {
			if(i<5) {
				this.s.fill(this.touches.colors[i]);
				let diameter = this.dimensions[1]*this.touches.sizes[i]*this.touches.scale;
				this.s.ellipse(this.position[0] + this.touches.locations[i], this.position[1] + this.dimensions[1]/2, diameter);
			}
		}
		
		changeTouchColor(i, newColor) {
			this.touches.colors[i] = this.s.color(newColor);
		}
		
		changeTouchScale(scale) {
			if(scale <=1 ) {
				this.touches.scale = scale;
			}
		}
		
		resize(length) {
			this.dimensions = [length, length/5];
		}
	}
}

var guiSketch = new p5(function( sketch ) {

    let canvas_dimensions = [sketch.windowHeight,sketch.windowWidth];

    let spacing;
    let activeTouches = 0;
    let sliderTouchSizeScaler = 0.5;
    let sliderLength = 0.0;
    let belaLogo

    sketch.setup = function() {

        sketch.createCanvas(sketch.windowWidth, sketch.windowHeight);
        sketch.frameRate(120);
        belaLogo = sketch.loadImage('../images/logo_bar14.png');
        sliderLength = sketch.width-100;
        sketch.trillBar = new TrillBar(sketch, sliderLength*0.60);

    }

    sketch.draw = function() {
          
        sketch.background(240);
        sliderLength = sketch.width-100
        sketch.trillBar.resize(sliderLength);
        activeTouches = Bela.data.buffers[0];
        for(let t = 0; t < activeTouches; t++) {
        	sketch.trillBar.updateTouch(t, Bela.data.buffers[1][t], Bela.data.buffers[2][t]);
        }
        sketch.trillBar.draw();
        
        sketch.image(belaLogo,sketch.width-170, sketch.height-70,120,50)


    }
});
