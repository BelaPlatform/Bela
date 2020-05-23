let spacing;
let startPoint;
let touchSize = 0;
let touchVerticalPosition = [0, 0];
let touchHorizontalPosition = [0, 0];
let trill;

function preload() {
	belaLogo = loadImage('../images/logo_bar14.png');
	Bela.control.loadResource("/libraries/Trill/Trill.js")
}

function setup() {
	createCanvas(windowWidth, windowHeight);
	spacing=height/20;
	startPoint=(width/2)-spacing*7;
	rectWidth = height*0.7;
	rectStart = height*0.1;

	trill = new Trill('square', rectWidth, [width/2-rectWidth/2, rectStart]);
}

function draw() {
	background(240);
	resizeElements();
		
	activeVTouches = Bela.data.buffers[0];
	activeHTouches = Bela.data.buffers[1];
	for(let t = 0; t < activeVTouches; t++) {
		for(let u = 0; u < activeHTouches; u++) {
			trill.updateTouch(t*activeVTouches + u, [Bela.data.buffers[2][u], Bela.data.buffers[3][t]], Bela.data.buffers[4][t]);
		}
	}

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
