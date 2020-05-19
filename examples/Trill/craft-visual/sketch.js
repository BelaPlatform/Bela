
let sensorNumber;

let chartTop = 100;
let chartBottom;
let chartLeft = 100;
let chartRight;
let barWidth;

let dataRange = [0, 1];

function setup() {
	createCanvas(windowWidth, windowHeight);
	chartBottom = windowHeight-chartTop;
	chartRight = windowWidth-chartLeft;
	barWidth = (chartRight-chartLeft) / (sensorNumber*1.5);
}

function draw() {
	background(255);

	noStroke();
	textSize(10);

	sensorNumber = Bela.data.buffers[0];
	barWidth = (chartRight-chartLeft) / (sensorNumber*1.5);


	for (let i = 0; i < sensorNumber; i++) {
		let x = map(i, 0, sensorNumber - 1, chartLeft, chartRight);
		//let data = sketch.random(dataRange[0], dataRange[1]);
		let data =  Bela.data.buffers[1][i];
		let y = map(data, dataRange[0], dataRange[1], chartBottom, chartTop);

		strokeWeight(barWidth);
		strokeCap(SQUARE);
		stroke(0);
		line(x, chartBottom, x, y);

		noStroke();
		textAlign(CENTER);
		text(i, x, chartBottom + 15);
	}
}

function windowResized() {
	if(windowWidth > 350  & windowHeight > 250) {
		resizeCanvas(windowWidth, windowHeight);
		chartBottom = windowHeight-chartTop;
		chartRight = windowWidth-chartLeft;
		barWidth = (chartRight-chartLeft) / (sensorNumber*1.5);
	}
}
