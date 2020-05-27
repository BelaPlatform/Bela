let counter = 0;
let pg;
let patches=[];
let metro = [];
let patterns = [0,0,0,0,0,0,0,0,0,0];
let k;
let buttonState = 0;

function setup() {
 createCanvas(975, 600, WEBGL);

   rSlider = createSlider(0, 255, 100);

   rSlider.position(50,100);
   p = createP("Velocity: ");
   p.position(50,60);
   button = createButton("PLAY/STOP");
   button.position(50,150);
   button.size(100,100);
   button.mouseClicked(changeButtonState);
   let col = color(0, 10, 10, 50);
   button.style('font-weight','bolder');
   button.style('background-image','url(https://fg-a.com/music/maracas-animation-2018.gif)');
   changeButtonState();




for (let j = 0;j< 8 ;j++){
patches[j]=[];
for (let i = 0;i< 8 ;i++){
patches[j][i]=new Patch(- width/2 + 100 * (i+1),- height/2 + 60 * (j + 1),40,20*j,0,255 - 20 * j);

if(j == 0)
metro[i]=new Circle1(- width/2 + 40 + 100 * (i+1), - height/2 + 30, 30);


}
}

}

function draw() {


 let playedDrums = Bela.data.buffers[1];
 let beats = Bela.data.buffers[2];



 if (beats > counter || (beats == 0 && counter ==7)  ) {
	 counter=beats;
	 k = ((counter));

	 for (let j = 0;j< 8 ;j++){
	 patterns[j]=patches[j][k].state;
	 }
	 patterns[8]=rSlider.value();
	 patterns[9]=buttonState;
	 Bela.data.sendBuffer(0, 'float', patterns);
}

  background(200);
    for (let j = 0;j< 8 ;j++){
    for (let i = 0;i< 8 ;i++){

	if (counter == (i+1) % 8 && playedDrums[j]==1) {
	patches[j][i].show1(0,200,0);
	}
	else
	patches[j][i].show();


    if (j==0 && (i+1)%8 == counter) {
    metro[i].showCircle();
    }

    }
    }




/*
if (frameCount % 14 === 0) {
Bela.data.sendBuffer(0, 'float', [counter, counter]);


}
else
Bela.data.sendBuffer(0, 'float', [0, counter]);

 */
	 for (let j = 0;j< 8 ;j++){
	 patterns[j]=patches[j][k].state;
	 }
	 patterns[8]=rSlider.value();
	 patterns[9]=buttonState;
	 Bela.data.sendBuffer(0, 'float', patterns);


}


class Patch {
constructor(x,y,l,r,g,b){
	this.x = x;
	this.y = y;
	this.l = l;
	this.r = r;
	this.g = g;
	this.b = b;
	this.state = 0;
}

show1(r,g,b) {

	fill(r,g,b);
	rect(this.x,this.y,2 * this.l,this.l);

}

show() {
	if(this.state == 0){
	fill(this.r,this.g,this.b);
	rect(this.x,this.y,2 * this.l,this.l);}

	else {
	fill(255,0,0);
	rect(this.x,this.y,2 * this.l,this.l);}
	}
}


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




function mouseClicked(){

for (let j = 0;j< 8 ;j++){
for (let i = 0;i< 8 ;i++){

if (mouseX > patches[j][i].x + width/2 && mouseX < patches[j][i].x + width/2 + 2 * patches[j][i].l
 && mouseY > patches[j][i].y + height/2 && mouseY < patches[j][i].y + height/2 + patches[j][i].l)
patches[j][i].state=1-patches[j][i].state;



}}




}



function changeButtonState() {
buttonState = 1 - buttonState;
if (buttonState == 1) {
button.style('background-color',color(0, 200, 0));

}
else
button.style('background-color',color(250, 0, 0));
}