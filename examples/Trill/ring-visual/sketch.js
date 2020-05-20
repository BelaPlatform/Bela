
let spacing;
let activeTouches = 0;
let sliderTouchSizeScaler = 0.5;
let ringWidth = 800.0;
let belaLogo;

function preload() {
	belaLogo = loadImage('../images/logo_bar14.png');
	Bela.control.loadResource("/libraries/Trill/Trill.js")
}

function setup() {
	createCanvas(windowWidth, windowHeight);
	frameRate(60);
	sliderLength = width-100;
	trill = new Trill('ring', ringWidth, [ windowWidth * 0.5, windowHeight * 0.5 ]);
}

function draw() {
	background(240);
	resizeElements();
	activeTouches = Bela.data.buffers[0];
	for(let t = 0; t < activeTouches; t++) {
		trill.updateTouch(t, Bela.data.buffers[1][t], Bela.data.buffers[2][t]);
	}
	trill.draw();

	image(belaLogo, width-170, height-70, 120, 50);
}

function resizeElements() {
	trill.resize(ringWidth);
}

function windowResized() {
	resizeElements();
	resizeCanvas(windowWidth, windowHeight);
}
