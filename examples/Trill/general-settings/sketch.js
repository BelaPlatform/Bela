
let sensorNumber;

let chartTop = 150;
let chartBottom;
let chartLeft = 100;
let chartRight;
let barWidth;

let dataRange = [0, 1];

// Create a variable for radio-button object
var radio;
// Create a variable for slider object
var slider;
// Current state of the reset button.
let buttonState = 1;

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
    radio.option('4');
    radio.option('8');
    radio.option('16');
    radio.option('32');

    radio.value('2');

    // Set the width
    radio.style("width", "400px");
    // Position the radio-button object
    radio.position(chartLeft, windowHeight-chartTop);

    // Create a slider object (min, max, initial value, increment)
    slider = createSlider(0, 200, 10, 10);
	slider.position(chartRight-200, windowHeight-chartTop);
	slider.style("width", "200px");

	//Create a button to reset the graph scaling
	button = createButton("RESET BASELINE AND Y-AXIS SCALING");
	button.position(windowWidth*0.5-100, windowHeight-chartTop);
	//call changeButtonState when button is pressed
	button.mouseClicked(changeButtonState);
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

    	push();
    	textAlign(RIGHT, CENTER);
    	translate(x, chartBottom + 30);
		rotate(-HALF_PI);
		text(data, 0, 0);
		pop();

	}

	textAlign(LEFT);
	text("PRESCALER VALUE:", chartLeft, windowHeight-chartTop-20);
	var radioVal = radio.value();
	text("THRESHOLD VALUE:", chartRight-200, windowHeight-chartTop-20);
	text(slider.value(), chartRight-50, windowHeight-chartTop-20);
	var sliderVal = slider.value();
	var buttonVal = button.value();
	// Send values from interface to Bela
	Bela.data.sendBuffer(0, 'int', [radioVal, sliderVal, buttonState]);
}

function windowResized() {
	if(windowWidth > 350  & windowHeight > 250) {
		resizeCanvas(windowWidth, windowHeight);
		chartBottom = windowHeight-chartTop*2;
		chartRight = windowWidth-chartLeft;
		barWidth = (chartRight-chartLeft) / (sensorNumber*1.5);
		radio.position(chartLeft, windowHeight-chartTop);
		slider.position(chartRight-200, windowHeight-chartTop);
		button.position(windowWidth*0.5-100, windowHeight-chartTop);
	}
}

//Function that changes buttonState variable and changes button's background-color
function changeButtonState() {
	buttonState = !buttonState;
}
