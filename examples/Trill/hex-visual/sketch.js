let touchSize = 0;
let touchPosition = [0, 0];
let trill;

let hexWidth;

function preload() {
	belaLogo = loadImage('../images/logo_bar14.png');
	Bela.control.loadResource("/libraries/Trill/trill.js")
}

function setup() {
	createCanvas(windowWidth, windowHeight);

	hexWidth = height*0.25;
	trill = new Trill('hex', hexWidth, [width * 0.5, height * 0.5]);
}

function draw() {
	background(240);
	resizeElements();

	if(typeof Bela.data.buffers[0] != 'undefined')
		touchPosition = Bela.data.buffers[0];

	if(typeof Bela.data.buffers[1] != 'undefined')
		touchSize = Bela.data.buffers[1][0];

	trill.updateTouch(0, touchPosition, touchSize);
	trill.draw();
	image(belaLogo,width-170, height-70,120,50);
}

function resizeElements() {
	hexWidth = height*0.25;
}

function windowResized() {
	resizeElements();
	trill.resize(hexWidth);
	resizeCanvas(windowWidth, windowHeight);
}
