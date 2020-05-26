class TrillTouch {
	constructor(scale = 0.25, color = 'ivory', size = [0, 0], location = [null, null], active = 0 ) {
		this.scale = scale;
		this.size = size;
		this.location = location;
		this.active = active;
		this.color = color
	}

	update(location, size) {
		this.active = 1;
		this.location = location;
		this.size = constrain(size, 0, 1);
	}

	changeColor(newColor) { this.color = color(newColor); }

	changeScale(scale) {
		if(scale <= 1 ) {
			this.scale = scale;
		}
	}

	isActive() { return this.active; }
}

class Trill {
	constructor(type, length, position = [200, 200], touchScale = 0.4) {
		this.position = position;
		this.types = ['bar', 'square', 'hex', 'ring']
		type = type.toLowerCase();
		this.type = (this.types.includes(type)) ? type :null;
		if(!this.type)
			throw("Trill: Unknown Trill type `"+type+"`");
		this.touchScale = touchScale;
		this.resize(length);

		this.sensorColor = 'black';
		this.touchColors = [ 'red', 'blue', 'yellow', 'white', 'cyan'];
		this.touches = [];
	}

	draw() {
		fill(this.sensorColor);
		if (this.type == 'bar' || this.type == 'square') {
			rectMode(CENTER);
			rect(this.position[0], this.position[1], this.dimensions[0], this.dimensions[1], this.cornerRadius);
		} else if (this.type == 'ring') {
			push();
			translate(this.position[0], this.position[1]);
			noFill();
			stroke(this.sensorColor);
			strokeWeight(this.dimensions[0] * 0.25);
			ellipse(0,0,this.dimensions[0], this.dimensions[1]);
			pop();
		} else if (this.type == 'hex') {
			push();
			// move to the centre of the hex
			translate(this.position[0], this.position[1]);
			// draw the hexagon
			beginShape();
			vertex(0, this.dimensions[1] * -0.5);
			vertex(this.dimensions[0]*0.5, this.dimensions[1] * -0.25);
			vertex(this.dimensions[0]*0.5, this.dimensions[1] * 0.25);
			vertex(0, this.dimensions[1] * 0.5);
			vertex(-this.dimensions[0]*0.5, this.dimensions[1] * 0.25);
			vertex(-this.dimensions[0]*0.5, this.dimensions[1] * -0.25);
			endShape(CLOSE);
			pop();
		}

		for(let t = 0; t < this.touches.length; t++) {
			if(this.touches[t] && this.touches[t].active) {
				this.drawTouch(t);
				this.touches[t].active = 0;
			}
		}
	}

	updateTouch(i, location, size) {
		location = Array.isArray(location) ? location : [location, null];
		let _location= new Array(2);
		_location[0] = location[0];
		if(this.type == 'bar') {
			_location[1] = 0.5;
		} else if (this.type == 'square') {
			_location[1] = 1 - location[1]
		} else if (this.type == 'ring') {
			_location[1] = 0.5;
		} else if (this.type == 'hex') {
			_location[1] = 1 - location[1];
		}
		let _size = constrain(size, 0, 1);
		if(!this.touches[i])
			this.touches[i] = new TrillTouch(this.touchScale,
				this.touchColors[i % this.touchColors.length]);
		this.touches[i].update(_location, _size);
	}

	drawTouch(i) {
		if(i < this.touches.length) {
			fill(this.touches[i].color);
			let diameter = this.dimensions[1]*this.touches[i].size*this.touches[i].scale;

			if(this.type == 'bar' || this.type == 'square') {
				ellipse(this.position[0] - this.dimensions[0] * 0.5 + this.dimensions[0] * this.touches[i].location[0], this.position[1] - this.dimensions[1] * 0.5 + this.dimensions[1] * this.touches[i].location[1], diameter);
			} else if (this.type == 'ring') {
				push();
				translate(this.position[0], this.position[1]);
				let _radial = new Array(5);
				_radial[i] = (this.touches[i].location[0]) * PI * 2.0;
				if (_radial[i] >= PI*2){
					_radial[i] = 0;
				}
				ellipse((this.dimensions[0] * 0.5) * cos(_radial[i]), (this.dimensions[0] * 0.5) * sin(_radial[i]), diameter);
				pop();
			} else if (this.type == 'hex') {
				ellipse((this.position[0] - this.dimensions[0] * 0.5) + this.touches[i].location[0] * this.dimensions[0], (this.position[1] - this.dimensions[1] * 0.5) + this.touches[i].location[1] * this.dimensions[1], diameter);
			}
		}
	}

	activeTouches() {
		return touches.filter(touch => {
			return touch.active === 1
		}).length
	}

	changeTouchScale(scale) {
		this.touchScale = scale;
		for(let t = 0; t < this.touches.length; t++) {
			this.touches[t]. changeScale(this.touchScale);
		}
	}

	resize(length) {
		this.dimensions = (this.type == 'bar') ? [ length, length/5 ] :
			(this.type == 'hex') ? [ length, length/0.866 ] : [length, length];
		if(this.type == 'square')
			this.cornerRadius = 0.02*this.dimensions[0];
		else if (this.type == 'bar')
			this.cornerRadius = 0.03*this.dimensions[0];
		else
			this.cornerRadius = 0;
	}
}
