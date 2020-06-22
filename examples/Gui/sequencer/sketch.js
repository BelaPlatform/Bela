/*
 ____  _____ _        _
| __ )| ____| |      / \
|  _ \|  _| | |     / _ \
| |_) | |___| |___ / ___ \
|____/|_____|_____/_/   \_\
http://bela.io
\example Gui/sequencer
Make your own drum patterns with Bela
============================
This project uses Bela GUI library to build a drum sample sequencer, and it is a good example of sending data back anf forth
between Bela (render.cpp) and the GUI (sketch.js).
The GUI displays an 8x8 matrix of rectangles, in which each column is a beat and each row will correspond to a speceific
WAV sound that is loaded to the project and then stored in a buffer. The user can activate and deactivate the rectangles
by clicking on them. For each beat, Bela will receive from the GUI the sounds of that column (beat) that are active,
and it will play them. At the same time, Bela will send to the GUI the beat update.
*/

let patches=[]; //rectangles to be displayed in the GUI interface
let playHead = []; //play head displayed in the GUI interface
let patterns = [0,0,0,0,0,0,0,0,0,0,0]; //array to be sent to Bela
let buttonState = 0; //PLAY/STOP button
let beats = 0; //Current beat being played (8 beats, from 0 to 7)

function setup() {
	createCanvas(975, 600, WEBGL);

	//create and setup slider
	rSlider = createSlider(0, 255, 100);
	rSlider.position(50,100);

	//create and setup text
	p = createP("Speed: ");
	p.position(50,60);

	//create and setup PLAY/STOP button
	button = createButton("PLAY/STOP");
	button.position(50,150);
	button.size(100,100);
	button.mouseClicked(changeButtonState);
	let col = color(0, 10, 10, 50);
	button.style('font-weight','bolder');
	button.style('background-image','url(https://fg-a.com/music/maracas-animation-2018.gif)');
	button.style('background-color',color(0, 200, 0));



	//Create an 8x8 matrix of rectangles (Patch object)
	for (let j = 0;j< 8 ;j++){
		patches[j]=[];
		for (let i = 0;i< 8 ;i++){
			patches[j][i]=new Patch(- width/2 + 100 * (i+1),- height/2 + 60 * (j + 1),40,20*j,0,255 - 20 * j);

			//create a play head, displayed as a red circle
			if(j == 0)
				playHead[i]=new Circle1(- width/2 + 40 + 100 * (i+1), - height/2 + 30, 30);

		}
	}

}

function draw() {

	//Firstly, we read the data sent from Bela. See the bela-to-gui example to see details on how this function works
	//Bela will send the beat number (0 to 7) when changing to a new beat.
	beats = Bela.data.buffers[1];
	//In case we are not reading anything yet..
	if (beats == null) {
	beats = 0;
	}


	//Now we display the GUI interface
	background(200);

	//we loop through the matrix and display each rectangle according to its state
	for (let j = 0;j< 8 ;j++){
		for (let i = 0;i< 8 ;i++){

			//only rectangles that are in the current played column (beats == (i+1)) and that are active, will be
			//displayed in green color
			if (beats == (i+1) % 8 && patches[j][i].state==1)
				patches[j][i].show1(0,200,0);

			//otherwise we call the normal show() function that will display them blue if deactivated and red is activated
			else
				patches[j][i].show();

			//display the play head
			if (j==0 && (i+1)%8 == beats)
				playHead[i].showCircle();
		}
	}
	//Now we send data from the GUI to Bela, so Bela knows the status of the interface
	//We will send all the data within the "patterns" array.
	//"patterns" array will store the state of each of the 8 rectangles (1 if activated, 0 if not).
	//Additionally, it will store the value of the slider and the button
	for (let j = 0;j< 8 ;j++){
		 patterns[j]=patches[j][beats].state;
	}

	patterns[8]=rSlider.value();
	patterns[9]=buttonState;
	
	//Finally, we send an extra value containing the current beat, so we can check in Bela if the Gui is being updated
	patterns[10]=beats;
	
	//Send data buffer of floats to Bela containing the patterns array. 
	//See the gui-to-bela example to see details on how this function works 
	Bela.data.sendBuffer(0, 'float', patterns); 
}

//rectangles of interface
class Patch {
constructor(x,y,l,r,g,b){
	this.x = x; //x position
	this.y = y; //y position
	this.l = l; //rectagles sides are l and 2*l
	this.r = r; // red value
	this.g = g; // green value
	this.b = b; // blue value
	this.state = 0; //when the user clicks on the rectangle, it will change it state from 0 to 1 (or viceversa)
}

//Function to display rectangles with sepcific color given in the arguments
show1(r,g,b) {

	fill(r,g,b);
	rect(this.x,this.y,2 * this.l,this.l);

}

//function to display red rectangles if active, and blue rectangles if inactive
show() {
	if(this.state == 0){
		fill(this.r,this.g,this.b);
		rect(this.x,this.y,2 * this.l,this.l);
	}

	else {
		fill(255,0,0);
		rect(this.x,this.y,2 * this.l,this.l);}
	}
}

//class for displaying the play head (red circle)
class Circle1 {
	constructor(x,y,r){
		this.x = x;
		this.y = y;
		this.r = r;

	}


	showCircle() {
		fill(250,0,0);
		ellipse(this.x,this.y,this.r,this.r);

	}

}



//change state of clicked rectangle
function mouseClicked(){

	for (let j = 0;j< 8 ;j++){
		for (let i = 0;i< 8 ;i++){
			if (mouseX > patches[j][i].x + width/2 && mouseX < patches[j][i].x + width/2 + 2 * patches[j][i].l
			 && mouseY > patches[j][i].y + height/2 && mouseY < patches[j][i].y + height/2 + patches[j][i].l)
				patches[j][i].state=1-patches[j][i].state;
		}
	}
}


//change buttonstate when button is clicked and change its color accordingly
function changeButtonState() {
	buttonState = 1 - buttonState;
	if (buttonState == 0)
		button.style('background-color',color(0, 200, 0));
	else
		button.style('background-color',color(250, 0, 0));
}
