class TrillTouch {
	constructor(idx, scale = 0.25, color = 'ivory', size = [0, 0], location = [null, null], active = 0 ) {
		this.idx = idx;
		this.scale = scale;
		this.size = size;
		this.location = location;
		this.active = active;
		this.color = color
	}

	update(location, size) {
		this.active = 1;
		this.touch.active = 1;
		this.location = location;
		this.size = constrain(size, 0, 1);
	}

	setState(state) { this.active = Boolean(state); }

	changeColor(newColor) { this.color = color(newColor); }

	changeScale(scale) {
		if(scale <= 1 ) {
			this.scale = scale;
		}
	}

	isActive() { return this.active; }
}

class Trill {
	constructor(type, length, position = [50, 50]) {
		this.position = position;
		this.types = ['bar', 'square', 'hex', 'ring']
		this.type = (this.types.includes(type)) ? type : null;
		this.dimensions = (this.type == 'bar') ? [ length, length/5 ] : [length, length];
		this.numTouches = (this.type == 'bar' || this.type == 'ring') ? 5 : 1;

		this.cornerRadius = 0;
		if(this.type == 'square') {
			this.cornerRadius = 0.02*this.dimensions[0];
		} else if (this.type == 'bar') {
			this.cornerRadius = 0.03*this.dimensions[0];
		}

		this.sensorColor = 'black';
		this.touchColors = [ 'ivory', 'honeydew', 'azure', 'lavenderblush' , 'navajowhite']

		this.touches = [];
		for(let t = 0; t < this.numTouches; t++) {
			this.touches.push(new TrillTouch(t, 0.25, this.touchColors[t]))
		}
	}

	draw() {
		fill(this.sensorColor);
		if (this.type == 'bar' || this.type == 'square') {
			rect(this.position[0], this.position[1], this.dimensions[0], this.dimensions[1], this.cornerRadius);
		} else if (this.type == 'ring') {
		} else if (this.type == 'hex') {
		}

		for(let t = 0; t < this.numTouches; t++) {
			if(this.touches[t].active) {
				this.drawTouch(t);
				this.touches[t].setState(0);
			}
		}
	}

	updateTouch(i, location, size) {
		if(i < this.numTouches) {
			let loc = new Array(2);
			loc[0] = location[0];
			if(this.type == 'bar') {
				loc[1] = this.dimensions[1]/2;
			} else if (this.type == 'square') {
				loc[1] = location[1]
			} else if (this.type == 'ring') {
			} else if (this.type == 'hex') {
			}
			let size = constrain(size, 0, 1);
			touches[i].update(loc, size);
		}
	}

	drawTouch(i) {
		if(i < this.this.numTouches) {
			fill(this.touches[i].color);
			let diameter = this.dimensions[1]*this.touches[i].size*this.touches[i].scale;

			if(this.type == 'bar' || this.type == 'square') {
				ellipse(this.position[0] + this.touches[i].locations[0], this.position[1] + touches[i].locations[1], diameter);
			} else if (this.type == 'ring') {
			} else if (this.type == 'hex') {
			}
		}
	}

	activeTouches() {
		return touches.filter(touch => {
			return touch.active === 1
		}).length
	}

	resize(length) {
		this.dimensions = (this.type == 'bar') ? [ length, length/5 ] : [length, length];
	}
}
