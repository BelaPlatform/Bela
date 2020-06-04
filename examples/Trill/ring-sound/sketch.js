
let activeTouches = 0;
let ringWidth;
let belaLogo;

let w;
let phase = 0;
let speed = 1;

function preload() {
	belaLogo = loadImage('../images/logo_bar14.png');
	loadScript("/libraries/Trill/Trill.js")
}

function setup() {
	createCanvas(windowWidth, windowHeight);
	frameRate(60);
	ringWidth = windowWidth * 0.2
	trill = new Trill('ring', ringWidth, [ windowWidth * 0.5, windowHeight * 0.5 ]);

	// w is used for drawing bars off screen
	w = sqrt(width * width + height * height);
}

function draw() {
	background(240);
	resizeElements();

	// Retrieve the data being sent from render.cpp
	let numOscillators = Bela.data.buffers[3];
	let touchPosition = Bela.data.buffers[4];

	fill(255);
	rect(width * 0.3, 0, width * 0.7, height);
	// Draw the lines, rotate and then animate position
	push();
	fill(255);
	translate(width / 2, height / 2);　
	rotate(PI*0.3);
	translate(-w / 2, -w / 2);
	phase = touchPosition * width / 4;
	for (let i = 0; i < numOscillators; i++)
	{

		x = w - ((i / numOscillators * w + phase) % w);

		if (i % 2 === 0) {
			stroke(198,	28,	15);
		} else {
			stroke(0, 33, 153);
		}
		strokeWeight(w / (numOscillators*2));
		line(x, 0, x, w);
	}
	pop();

	// Masking boxes
	fill(240);
	noStroke();
	rect(0, 0, width*0.3, height);
	rect(width*0.7, 0, width, height);

	// Ring visualiser
	activeTouches = Bela.data.buffers[0];
	for(let t = 0; t < activeTouches; t++) {
		trill.updateTouch(t, Bela.data.buffers[1][t], Bela.data.buffers[2][t]);
	}
	trill.draw();

	image(belaLogo, width-170, height-70, 120, 50);
}

function resizeElements() {
	ringWidth = windowWidth * 0.3
	trill.resize(ringWidth);
}

function windowResized() {
	resizeCanvas(windowWidth, windowHeight);
	resizeElements();
}
