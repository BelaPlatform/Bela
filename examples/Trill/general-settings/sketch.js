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

function radioEventModeParser(value)
{
	var mode;
	switch(value){
		default:
		case("Touch"):
			mode = 0;
			break;
		case("Change"):
			mode = 1;
			break;
		case("Always"):
			mode = 2;
			break;
	}
	return mode;
}

function channelMaskParser(value)
{
	// be lenient in parsing the string.
	// remove whitespaces
	value = value.trim();
	// if it starts with 0x, remove it (we will parse it as hex anyhow)
	value = value.replace(/^0[Xx]/, '');
	// now remove any separators you may have added for legibility
	value = value.replace(/[^0-9a-fA-F]/g,'');
	// and make it an actual hex
	value = "0x" + value;
	let out = parseInt(value);
	// if this fails, we are out of luck
	if(isNaN(out) || 0 === out)
		return 0xffffffff;
	return out;
}

// `this` is the object that has changed
function sendToBela()
{
	let value = this.value();
	if(this.parser)
		value = this.parser(value);
	else if(typeof(this.checked) === "function") // this is a checkbox
		value = this.checked();
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
	if(guiKey != "reset")
		sendToBela.call(obj);
}

function setSliderRange() {
	let bits = parseInt(radioBits.value());
	let maxVal = (1 << bits);
	slider.elt.step = 1 / maxVal;
	slider.elt.min = 0;
	slider.elt.max = 255 / maxVal;
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

	radioSlotBits = createRadio();
	radioSlotBits.option(8);
	radioSlotBits.option(12);
	radioSlotBits.option(16);
	radioSlotBits.value("16");
	belaSenderInit(radioSlotBits, "transmissionWidth");

	radioEventMode = createRadio();
	radioEventMode.option("Touch");
	radioEventMode.option("Change");
	radioEventMode.option("Always");
	radioEventMode.value("Touch");
	belaSenderInit(radioEventMode, "eventMode", radioEventModeParser);

	inputRightShift = createInput("0");
	belaSenderInit(inputRightShift, "transmissionRightShift");

	inputChannelMask = createInput("ff.ff.ff.ff");
	belaSenderInit(inputChannelMask, "channelMask", channelMaskParser);

	// Create a slider object (min, max, initial value, increment)
	slider = createSlider(); // TODO: the range and step of this should change with the number of bits
	setSliderRange();
	slider.value(0);
	belaSenderInit(slider, "noiseThreshold");

	timerPeriodSlider = createSlider(0, 2000, 0, 1);
	belaSenderInit(timerPeriodSlider, "timerPeriod");

	scanTriggerI2c = createCheckbox("I2C", true);
	belaSenderInit(scanTriggerI2c, "scanTriggerI2c");

	scanTriggerTimer = createCheckbox("Timer", false);
	belaSenderInit(scanTriggerTimer, "scanTriggerTimer");

	hostReadTriggerSlider = createSlider(0, 1001, 10, 1);
	belaSenderInit(hostReadTriggerSlider, "hostReadTrigger");

	button = createButton("RESET BASELINE");
	belaSenderInit(button, "baseline");

	resetButton = createButton("RESET THE CHIP<br>Will cause the displayed<br>settings to be out of sync");
	belaSenderInit(resetButton, "reset");

	windowResized();
}

function draw() {
	if(Bela.data.buffers.length != 2)
		return;
	setSliderRange();
	background(255);
	stroke(0);
	strokeWeight(0.4);
	rect(chartLeft - barWidth, chartTop, chartRight - chartLeft + 2 * barWidth, chartBottom - chartTop);
	noStroke();
	textSize(10);

	sensorNumber = Bela.data.buffers[0][0];
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
	text("MODE:", chartLeft - 40, controlStart - 10);
	var radioModeVal = radioMode.value();

	text("PRESCALER VALUE:", chartLeft - 40, controlStart + 40);
	text("SCAN BIT DEPTH:", chartRight-200, controlStart + 30);
	text("CHANNEL\nMASK (hex):", chartRight - 500, controlStart + 55);
	text("EVENT MODE:", chartRight - 500, controlStart + 85);
	text("TRANSMISSION:", chartRight-200, controlStart + 85);
	text("WIDTH:", chartRight-185, controlStart + 105);
	text("RIGHT\nSHIFT:", chartRight-40, controlStart + 97);
	text("THRESHOLD VALUE:", chartRight-200, controlStart - 20);
	text("DEVICE TRIGGER SCAN ON: ", chartRight - 900, controlStart - 20);
	text(slider.value().toFixed(4), chartRight-50, controlStart - 20);
	{
		let val = Math.round(timerPeriodSlider.value()).toFixed(0);
		// let label = "every " + (val / 32000 * 1000).toFixed(0) + "ms";
		let label = "every " + val + "ms";
		if(0 == val)
			label = "disabled";

		text("DEVICE AUTO SCAN INTERVAL: " + label, chartRight - 720, controlStart - 20);
	}
	{
		let val = hostReadTriggerSlider.value();
		let label = val.toFixed(0) + "ms";
		if(0 == val)
			label = "EVT";
		else if (1001 == val)
			label = "disabled";
		text("HOST READ TRIGGER: " + label, chartRight - 720, controlStart + 20);
	}
	let frameId = Bela.data.buffers[0][1];
	let frameIdUnwrapped = Bela.data.buffers[0][2];
	let activityDetected = Bela.data.buffers[0][3];
	let hasReset = Bela.data.buffers[0][4];
	let periodFromFrameId = (Bela.data.buffers[0][5] / 1000).toFixed(3) + "ms";
	let periodFromEvent = Bela.data.buffers[0][6];

	if(periodFromEvent > 0)
		periodFromEvent = (periodFromEvent / 1000).toFixed(3) + "ms";
	else
		periodFromEvent = "N/A";
	text("frameId: " + frameId, chartLeft + 50, controlStart + 80);
	text("frameIdUnwrapped: " + frameIdUnwrapped, chartLeft + 50, controlStart + 95);
	text("activityDetected: " + activityDetected, chartLeft + 50, controlStart + 110);
	let logX = chartLeft + 210;
	push();
	if(hasReset)
		fill([255, 0, 0]);
	text("hasReset: " + hasReset, logX, controlStart + 65);
	pop();
	text("period estimates: ", logX, controlStart + 80);
	text("from frameId: " + periodFromFrameId, logX + 10, controlStart + 95);
	text("from EVT pin: " + periodFromEvent, logX + 10, controlStart + 110);
}

function windowResized() {
	if(windowWidth > 750 && windowHeight > 300) {
		createCanvas(windowWidth, windowHeight);
		chartBottom = windowHeight - chartTop - 200;
		chartRight = windowWidth - chartLeft;
		barWidth = (chartRight-chartLeft) / (sensorNumber*1.5);
		controlStart = chartBottom + 100;
		radioMode.style("width", "200px");
		radioMode.position(chartLeft - 40, controlStart);
		radioPres.style("width", "240px");
		radioPres.position(chartLeft - 40, controlStart + 50);
		radioBits.style("width", "300px")
		radioBits.position(chartRight-200, controlStart + 40);
		// radioSlotBits.style("width", "150px");
		radioSlotBits.position(chartRight - 150, controlStart + 90);
		radioEventMode.style("width", "200px");
		radioEventMode.style("font-size", "12px");
		radioEventMode.position(chartRight - 500, controlStart + 90);
		inputRightShift.style("width", "3em");
		inputRightShift.position(chartRight + 20, controlStart + 90);
		inputChannelMask.style("width", "8em")
		inputChannelMask.style("font-family", "monospace");
		inputChannelMask.position(chartRight - 420, controlStart + 47);
		slider.position(chartRight-200, controlStart - 18);
		slider.style("width", "200px");
		scanTriggerI2c.position(chartRight - 900, controlStart - 10);
		scanTriggerTimer.position(chartRight - 850, controlStart - 10);
		timerPeriodSlider.position(chartRight - 740, controlStart - 18);
		timerPeriodSlider.style("width", "520px");
		hostReadTriggerSlider.position(chartRight - 740, controlStart + 20);
		hostReadTriggerSlider.style("width", "520px");
		button.position(chartRight - 700, controlStart + 40);
		resetButton.position(chartRight - 700, controlStart + 70);
	}
}

//Function that changes buttonState variable and changes button's background-color
function changeButtonState() {
	buttonState = !buttonState;
}
