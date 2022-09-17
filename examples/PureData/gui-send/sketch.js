function setup() {
    createCanvas(windowWidth, windowHeight);
}

function draw () {
        
    if(Bela.data.buffers.length < 2) {
        // haven't received enough data yet
        return;
    }
    // Draw a white background with opacity
    background(0, 50);
    
    // Retrieve the data being sent from the Pd patch
    let pdBuf0 = Bela.data.buffers[0];
    let pdBuf1 = Bela.data.buffers[1];
    let numCircles = min(pdBuf0.length, pdBuf1.length);

    let circlePosition = windowWidth/(numCircles + 1);
        
    // Draw a circle whose size changes with the value received from render.cpp
    noFill();
    stroke(255);
    strokeWeight(10);
        
    for (var i = 0; i < numCircles; i++) {
        const thickness = 30 * abs(pdBuf0[i]);
        stroke(255 * abs(pdBuf1[i]));
        strokeWeight(thickness);
        ellipse(circlePosition + (circlePosition*i), windowHeight / 2, 200, 200);
    }   
}