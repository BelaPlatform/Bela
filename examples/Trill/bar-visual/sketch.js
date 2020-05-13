class TrillBar {
	constructor(length, position = [50, 50]) {
		this.position = position;
		this.dimensions = [ length, length/5 ];
		this.touches = {
			num: 5,
			scale: 0.75,
			sizes: new Array(5),
			locations: new Array(5),
			activations: [0, 0, 0, 0, 0],
			// colors: [ 'honeydew', 'azure', 'lavenderblush', 'ivory', 'navajowhite' ]
			colors: [ 'red', 'blue', 'yellow', 'white', 'cyan' ]
		}
	}

	draw() {
		fill(35);
        rect(this.position[0], this.position[1], this.dimensions[0], this.dimensions[1], 30);

        for(let t = 0; t < this.touches.num; t++) {
        	if(this.touchActive(t)) {
        		this.drawTouch(t);
        		this.touches.activations[t] = 0;
        	}
        }
	}

	updateTouch(i, location, size) {
		if(i < this.touches.num) {
			this.touches.activations[i] = 1;
			location = constrain(location, 0, 1);
			this.touches.locations[i] = this.dimensions[0]*location;
			size = constrain(size, 0, 1);
			this.touches.sizes[i] = size;
		}
	}

	activeTouches() {
		return this.touches.activations.filter(Boolean).length;
	}

	touchActive(i) {
		if(i < this.touches.num)
			return this.touches.activations[i];
	}

	setTouchState(i, state) {
		if(i < this.touches.num)
			this.touches.activations[t] = Boolean(state);
	}

	drawTouch(i) {
		if(i < this.touches.num) {
			fill(this.touches.colors[i]);
			let diameter = this.dimensions[1]*this.touches.sizes[i]*this.touches.scale;
			ellipse(this.position[0] + this.touches.locations[i], this.position[1] + this.dimensions[1]/2, diameter);
		}
	}

	changeTouchColor(i, newColor) {
		this.touches.colors[i] = color(newColor);
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

let spacing;
let activeTouches = 0;
let sliderTouchSizeScaler = 0.5;
let sliderLength = 0.0;
let belaLogo;

function setup() {
    createCanvas(windowWidth, windowHeight);
    frameRate(60);
    belaLogo = loadImage('../images/logo_bar14.png');
    sliderLength = width-100;
    trillBar = new TrillBar(sliderLength*0.60);
}

function draw() {
	background(240);
    resizeElements();
    activeTouches = Bela.data.buffers[0];
    for(let t = 0; t < activeTouches; t++) {
    	trillBar.updateTouch(t, Bela.data.buffers[1][t], Bela.data.buffers[2][t]);
    }
    trillBar.draw();

    image(belaLogo, width-170, height-70, 120, 50);
}

function resizeElements() {
	sliderLength = width-100;
	trillBar.resize(sliderLength);
}

function windowResized() {
	resizeElements();
    resizeCanvas(windowWidth, windowHeight);
}
