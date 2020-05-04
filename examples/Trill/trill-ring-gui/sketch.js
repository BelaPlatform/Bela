class TrillRing {
	constructor(width, height, position = [50, 50]) {
		this.position = position;
		this.width = width;
		this.height = height;
		this.ringRadius = this.height*0.5;
		let num = 5;
		this.touches = {
			num: num,
			scale: 0.75,
			sizes: new Array(num),
			locations: new Array(num),
			radial: new Array(num),
			activations: [0, 0, 0, 0, 0],
			// colors: [ 'honeydew', 'azure', 'lavenderblush', 'ivory', 'navajowhite' ]
			colors: [ 'red', 'blue', 'yellow', 'white', 'cyan' ]
		}
	}

	draw() {
		fill(35);

    	push();
	    translate(width*0.5, height*0.5);

		noFill();
		stroke(0);
		strokeWeight(this.ringRadius*0.25);
		ellipse(0,0,this.ringRadius,this.ringRadius);

		pop();

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
			location = constrain(location, 0, 1);
			this.touches.locations[i] = location;
			size = constrain(size, 0, 1);
			this.touches.sizes[i] = size;
		}
	}

	activeTouches() {
		return this.touches.activations.filter(Boolean).length;
	}

	touchActive(i) {
		if(i< this.touches.num)
			return this.touches.activations[i];
		else return 0;
	}

	setTouchState(i, state) {
		if(i< this.touches.num)
			this.touches.activations[t] = Boolean(state);
	}

	drawTouch(i) {
		if(i < this.touches.num) {

			push();

			translate(width*0.5, height*0.5);

			let col = color(this.touches.colors[i]);
			col.setAlpha(this.touches.sizes[i] * 200 + 55);
			fill(col);

			this.touches.radial[i] = (this.touches.locations[i])*PI*2.0;

			if (this.touches.radial[i] >= PI*2){
				this.touches.radial[i] = 0;
			}

			let diameter = this.ringRadius*0.25*this.touches.sizes[i]*this.touches.scale;
			ellipse((this.ringRadius*0.5)*cos(this.touches.radial[i]),(this.ringRadius*0.5)*sin(this.touches.radial[i]),diameter);

			pop();
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

	resize(height) {
		this.ringRadius = height*0.5;
	}
}

let spacing;
let activeTouches = 0;
let sliderTouchSizeScaler = 0.5;
let sliderLength = 200.0;
let belaLogo;

function setup() {
    createCanvas(windowWidth, windowHeight);
    frameRate(60);
    belaLogo = loadImage('../images/logo_bar14.png');

    trillRing = new TrillRing(windowWidth, windowHeight);
}

function draw() {
	background(240);
    resizeElements();

    activeTouches = Bela.data.buffers[0];
    for(let t = 0; t < activeTouches; t++) {
    	trillRing.updateTouch(t, Bela.data.buffers[1][t], Bela.data.buffers[2][t]);
    }

    trillRing.draw();

    image(belaLogo, width-170, height-70, 120, 50);
}

function resizeElements() {
	trillRing.resize(height);
}

function windowResized() {
	resizeElements();
    resizeCanvas(windowWidth, windowHeight);
}
