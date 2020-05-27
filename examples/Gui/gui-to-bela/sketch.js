/*
\example Gui/gui-to-bela

Gui to Bela
===========

This project is a minimal example on how to send data buffers from p5.js to Bela.
The sketch creates a button and two sliders that will control start/stop, frequency and amplitude
of an oscillator object. For the buttons and sliders we use the DOM objects available in p5js
(see https://p5js.org/reference/#group-DOM)

For sending a buffer from p5.js to Bela we use the function:
```
Bela.data.sendBuffer(0, 'float', buffer);
```
where the first argument (0) is the index of the sent buffer, second argument ('float') is the type of the
data, and third argument (buffer) is the data array to be sent.
*/

//buffer to send to Bela. 3 elements: two sliders + 1 button
let buffer = [0,0,0];
//current state of the PLAY/STOP button.
let buttonState = 1;

function setup() {
	//Create a thin canvas where to allocate the elements (this is not strictly neccessary because
	//we will use DOM elements which can be allocated directly in the window)
	createCanvas(windowWidth /5, windowHeight * 2 / 3);

	//Create two sliders, first to control frequency and second to control amplitude of oscillator
	//both go from 0 to 100, starting with value of 60
	fSlider = createSlider(0, 100, 60);
	aSlider = createSlider(0, 100, 50);

	//Create a button to START/STOP sound
	button = createButton("PLAY/STOP");
	//call changeButtonState when button is pressed
	button.mouseClicked(changeButtonState);

	//Text
	p1 = createP("Frequency:");
	p2 = createP("Amplitude:");

	//This function will format colors and positions of the DOM elements (sliders, button and text)
	formatDOMElements();

	//Initially, we set the button to 0 (not playing)
    changeButtonState();


}

function draw() {

    background(5,5,255,1);

    //store values in the buffer
	buffer[0]=fSlider.value()/100;//dividing by 100, the value range is now [0,1]
	buffer[1]=aSlider.value()/100;
	buffer[2]=buttonState;

	//SEND BUFFER to Bela. Buffer has index 0 (to be read by Bela),
	//contains floats and sends the 'buffer' array.
    Bela.data.sendBuffer(0, 'float', buffer);



}

function formatDOMElements() {

	//Format sliders
	fSlider.position((windowWidth-fSlider.width)/2,windowHeight/2 + 20);
	aSlider.position((windowWidth-aSlider.width)/2,windowHeight/2 + 90);

	//Format START/STOP button
	button.position((windowWidth-button.width)/2,windowHeight/2-150);
	button.size(100,100);

	let col = color(0, 10, 10, 50);
	button.style('font-weight','bolder');
	//button.style('background-image','url(https://fg-a.com/music/maracas-animation-2018.gif)');
	button.style('border', '2px solid #000000');
	button.style('border-radius', '50%');
	button.style('color', 'white');


	//Format text as paragraphs
	p1.position((windowWidth-fSlider.width)/2,windowHeight/2-20);
	p2.position((windowWidth-fSlider.width)/2,windowHeight/2+50);

	}

//Function that changes buttonState variable and changes button's background-color
function changeButtonState() {
buttonState = 1 - buttonState;
if (buttonState == 0) {
button.style('background-color',color(50, 50, 255));

}
else
button.style('background-color',color(250, 0, 0));
}
