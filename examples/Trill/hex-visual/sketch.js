class TrillHex {
	constructor(width, position = [0, 0]) {
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

		fill(0);

		push();

		// move to the centre of the canvas
		translate(windowWidth * 0.5, windowHeight * 0.5);

		// draw the hexagon
		let hexHeight = windowHeight * 0.5;
		beginShape();
		vertex(0, hexHeight * -0.5);
		vertex(hexHeight * 0.433, hexHeight * -0.25);
		vertex(hexHeight * 0.433, hexHeight * 0.25);
		vertex(0, hexHeight * 0.5);
		vertex(hexHeight * -0.433, hexHeight * 0.25);
		vertex(hexHeight * -0.433, hexHeight * -0.25);
		endShape(CLOSE);
		pop();

		// rect(this.position[0], this.position[1], this.width, this.width, 20);
		if(this.touchActive()) {
			this.drawTouch();
			this.touch.active = 0;
		}
	}

	touchActive() {
		return this.touch.active;
	}

	updateTouch(location, size) {
		this.touch.active = 1;
		location[0] = constrain(location[0], 0, 1);
		location[1] = constrain(location[1], 0, 1);
		this.touch.location = [windowHeight * 0.5 * location[0], windowHeight * 0.5 * location[1]];
		size = constrain(size, 0, 0.5);
		this.touch.size = size;
	}

	setTouchState(state) {
		this.touch.active = Boolean(state);
	}

	drawTouch(i) {
		fill(this.touch.color);
		let diameter = this.width*this.touch.size*this.touch.scale;
		ellipse(this.touch.location[0] + windowWidth * 0.5 - windowHeight * 0.2165, this.touch.location[1] + windowHeight * 0.25, diameter);
	}

	changeTouchColor(newColor) {
		this.touch.color = color(newColor);
	}

	changeTouchScale(scale) {
		if(scale <=1 ) {
			this.touch.scale = scale;
		}
	}

	resize(width, start) {
		this.width = width;
		this.position[0] = windowWidth/2-width/2;
	}
}


let spacing;
let startPoint;

let numTouches = 0;
let touchSize = 0;
let touchPosition = [0, 0];


function setup() {
    createCanvas(windowWidth, windowHeight);
    spacing=height/20;
    startPoint=(width/2)-spacing*7;
    rectWidth = height*0.7;
    rectStart = height*0.1;

    trill = new TrillHex(rectWidth, [width/2-rectWidth/2, rectStart]);

    belaLogo = loadImage('../images/logo_bar14.png');
}

function draw() {
    background(240);
    resizeElements();

    if(typeof Bela.data.buffers[0] != 'undefined')
    	touchPosition = Bela.data.buffers[0];

    if(typeof Bela.data.buffers[1] != 'undefined')
    	touchSize = Bela.data.buffers[1][0];
    print(touchSize);
    trill.updateTouch(touchPosition, touchSize);
    trill.draw();
    image(belaLogo,width-170, height-70,120,50);
}

function resizeElements() {
    rectWidth = height*0.7;
    rectStart = height*0.1;
}

function windowResized() {
	resizeElements();
    trill.resize(rectWidth, rectStart);
    resizeCanvas(windowWidth, windowHeight);
}
