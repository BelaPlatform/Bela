
let sensorNumber;

let chartTop = 20;
let chartBottom;
let chartLeft = 100;
let chartRight;
let barWidth;

let dataRange = [0, 1];

// Create a variable for radio-button object
var radioPres;
var radioBits;
var radioMode;
var controlStart;
// Create a variable for slider object
var slider;
// Current state of the reset button.
let buttonState = 1;

function radioModeParser(value)
{
	var mode;
	switch(value){
		case("Diff"):
			mode = 3;
			break;
		case("Raw"):
			mode = 1;
			break;
		case("Baseline"):
			mode = 2;
			break;
		default:
			mode = 3;
	}
	return mode;
}

// `this` is the object that has changed
function sendToBela()
{
	let value = this.value();
	if(this.parser)
		value = this.parser(value);
	else
		if(typeof(value) === "string")
			value = parseFloat(value);
	if(isNaN(value)) {
		// this is required for the C++ parser to recognize is it as a
		// number (NaN is not recognized as a number)
		value = 0;
	}
	let obj = {};
	obj[this.guiKey] = value;
	console.log("Sending ", obj);
	Bela.control.send(obj);
}

function belaSenderInit(obj, guiKey, parser)
{
	obj.guiKey = guiKey;
	if("button" === obj.elt.localName)
		obj.mouseReleased(sendToBela);
	else
		obj.input(sendToBela);
	obj.parser = parser;
	sendToBela.call(obj);
}

function setup() {

	radioMode = createRadio();
	radioMode.option("Raw");
	radioMode.option("Diff");
	radioMode.option("Baseline");
	radioMode.value("Diff");
	belaSenderInit(radioMode, "mode", radioModeParser);

	radioPres = createRadio();
	for(let n = 1; n <= 8; ++n)
		radioPres.option(n+"");
	radioPres.value("2");
	belaSenderInit(radioPres, "prescaler");

	radioBits = createRadio();
	for(let n = 9; n <= 16; ++n)
		radioBits.option(n);
	radioBits.value("12");
	belaSenderInit(radioBits, "numBits");

	// Create a slider object (min, max, initial value, increment)
	slider = createSlider(0, 255/4096, 0.0, 1/4096); // TODO: the range and step of this should change with the number of bits
	belaSenderInit(slider, "noiseThreshold");

	button = createButton("RESET BASELINE");
	belaSenderInit(button, "baseline");

	windowResized();
}

function draw() {
	background(255);
	stroke(0);
	strokeWeight(0.4);
	rect(chartLeft - barWidth, chartTop, chartRight - chartLeft + 2 * barWidth, chartBottom - chartTop);
	noStroke();
	textSize(10);

	sensorNumber = Bela.data.buffers[0];
	barWidth = (chartRight-chartLeft) / (sensorNumber*1.5);

	for (let i = 0; i < sensorNumber; i++) {
		let x = map(i, 0, sensorNumber - 1, chartLeft, chartRight);
		let data =  Bela.data.buffers[1][i];
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
		text(data.toFixed(3), 0, 0);
		pop();

	}

	textAlign(LEFT);
	text("MODE:", chartLeft, controlStart - 10);
	var radioModeVal = radioMode.value();

	text("PRESCALER VALUE:", chartLeft, controlStart + 40);
	text("NUMBER OF BITS:", chartRight-200, controlStart + 40);
	text("THRESHOLD VALUE:", chartRight-200, controlStart -10);
	text(slider.value(), chartRight-50, controlStart - 10);
}

function windowResized() {
	if(windowWidth > 750 && windowHeight > 300) {
		createCanvas(windowWidth, windowHeight);
		chartBottom = windowHeight - chartTop - 200;
		chartRight = windowWidth - chartLeft;
		barWidth = (chartRight-chartLeft) / (sensorNumber*1.5);
		controlStart = chartBottom + 100;
		let radioWidth = "400px";
		radioMode.style("width", radioWidth);
		radioMode.position(chartLeft, controlStart);
		radioPres.style("width", radioWidth);
		radioPres.position(chartLeft, controlStart + 50);
		radioBits.style("width", radioWidth)
		radioBits.position(chartRight-200, controlStart + 50);
		slider.position(chartRight-200, controlStart);
		slider.style("width", "200px");
		button.position(windowWidth * 0.5 - 100, controlStart);
	}
}

//Function that changes buttonState variable and changes button's background-color
function changeButtonState() {
	buttonState = !buttonState;
}
