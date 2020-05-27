let trill;
let belaLogo;

function preload() {
	belaLogo = loadImage('../images/logo_bar14.png');
	loadScript("/libraries/Trill/Trill.js")
}

function setup() {
	createCanvas(windowWidth, windowHeight);
	trill = new Trill('hex');
	windowResized();
}

function draw() {
	background(240);

	let touchPosition = Bela.data.buffers[0];
	let touchSize = Bela.data.buffers[1][0];

	trill.updateTouch(0, touchPosition, touchSize);
	trill.draw();
	image(belaLogo,width-170, height-70,120,50);
}

function windowResized() {
	resizeCanvas(windowWidth, windowHeight);
	trill.resize(height * 0.4);
	trill.position = [width / 2, height / 2];
}
