
let sensorNumber;

let chartTop = 100;
let chartBottom;
let chartLeft = 100;
let chartRight;
let barWidth;

let dataRange = [0, 1];

// Create a variable for radio-button object
var radio;
// Create a variable for slider object
var slider;

function setup() {
	createCanvas(windowWidth, windowHeight);
	chartBottom = windowHeight-chartTop*2;
	chartRight = windowWidth-chartLeft;
	barWidth = (chartRight-chartLeft) / (sensorNumber*1.5);

	// Create a radio-button object
    radio = createRadio();

    // Set up options
    radio.option('1');
    radio.option('2');
    radio.option('3');
    radio.option('4');
    radio.option('5');
    radio.option('6');
    radio.option('7');
    radio.option('8');

    // Set the width
    radio.style("width", "400px");
    // Position the radio-button object
    radio.position(chartLeft, windowHeight-chartTop);

    // Create a slider object (min, max, initial value, increment)
    slider = createSlider(0, 200, 10, 10);
	slider.position(chartRight-200, windowHeight-chartTop);
	slider.style("width", "200px");
}

function draw() {
	background(255);

	noStroke();
	textSize(10);

	sensorNumber = Bela.data.buffers[0];
	dataRange = Bela.data.buffers[1];
	barWidth = (chartRight-chartLeft) / (sensorNumber*1.5);

	createRadio();

	for (let i = 0; i < sensorNumber; i++) {
    	let x = map(i, 0, sensorNumber - 1, chartLeft, chartRight);
    	//let data = sketch.random(dataRange[0], dataRange[1]);
    	let data =  Bela.data.buffers[2][i];
    	let y = map(data, dataRange[0], dataRange[1], chartBottom, chartTop);

    	strokeWeight(barWidth);
    	strokeCap(SQUARE);
    	stroke(0);
    	line(x, chartBottom, x, y);

    	noStroke();
    	textAlign(CENTER);
    	text(i, x, chartBottom + 15);
	}

	textAlign(LEFT);
	text("PRESCALER VALUE:", chartLeft, windowHeight-chartTop-20);
	var radioVal = radio.value();
	// Send radio value here
	text("THRESHOLD VALUE:", chartRight-200, windowHeight-chartTop-20);
	var sliderVal = slider.value();
	// Send slider value here
	Bela.data.sendBuffer(0, 'int', [radioVal, sliderVal]);
}

function windowResized() {
	if(windowWidth > 350  & windowHeight > 250) {
		resizeCanvas(windowWidth, windowHeight);
		chartBottom = windowHeight-chartTop*2;
		chartRight = windowWidth-chartLeft;
		barWidth = (chartRight-chartLeft) / (sensorNumber*1.5);
		radio.position(chartLeft, windowHeight-chartTop);
		slider.position(chartRight-200, windowHeight-chartTop);
	}
}
