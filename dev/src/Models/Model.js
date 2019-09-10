var EventEmitter = require('events').EventEmitter;

class Model extends EventEmitter{

	constructor(data){
		super();
		var _data = data || {};
		this._getData = () => _data;
    this.setMaxListeners(50);
	}

	getKey(key){
		return this._getData()[key];
	}

	setData(newData){
		if (!newData) return;
		var newKeys = [];
		for (let key in newData){
			if (!_equals(newData[key], this._getData()[key], false)){
				newKeys.push(key);
				this._getData()[key] = newData[key];
			}
		}
		if (newKeys.length) {
			//console.log('changed setdata');
			this.emit('change', this._getData(), newKeys);
		}
		this.emit('set', this._getData(), Object.keys(newData));
	}

	setKey(key, value){
		if (!_equals(value, this._getData()[key], false)){
			this._getData()[key] = value;
			//console.log('changed setkey');
			this.emit('change', this._getData(), [key]);
		}
		this.emit('set', this._getData(), [key]);
	}

	pushIntoKey(key, value){
		this._getData()[key].push(value);
		this.emit('change', this._getData(), [key]);
		this.emit('set', this._getData(), [key]);
	}

	spliceFromKey(key, index){
		this._getData()[key].splice(index, 1);
		this.emit('change', this._getData(), [key]);
		this.emit('set', this._getData(), [key]);
	}

	print(){
		console.log(this._getData());
	}

}

module.exports = Model;

function _equals(a, b, log){
	if (log) console.log('a:', a, 'b:', b);
	if (a instanceof Array && b instanceof Array){
		if (log) console.log('arrays', 'a:', a, 'b:', b, (a.length === b.length), a.every( function(element, index){ return _equals(element, b[index], log) }));
		return ( (a.length === b.length) && a.every( function(element, index){ return _equals(element, b[index], log) }) );
	} else if (a instanceof Object && b instanceof Object){
		if (log) console.log('objects', 'a:', a, 'b:', b);
		for (let c in a){
			if (log) console.log('a[c]:', a[c], 'b[c]:', b[c], 'c:', c);
			if (!_equals(a[c], b[c], log)) return false;
		}
		return true;
	} else {
		if (log) console.log('a:', a, 'b:', b, Object.is(a, b), (a === b));
		return Object.is(a, b);
	}
}
