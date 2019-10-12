var EventEmitter = require('events').EventEmitter;

class View extends EventEmitter{

	constructor(CSSClassName, models, settings){
		super();
		this.className = CSSClassName;
		this.models = models;
		this.settings = settings;
		this.$elements = $('.'+CSSClassName);
		this.$parents = $('.'+CSSClassName+'-parent');
    this.setMaxListeners(50);

		if (models){
			for (var i=0; i<models.length; i++){
				models[i].on('change', (data, changedKeys) => {
					this.modelChanged(data, changedKeys);
				});
				models[i].on('set', (data, changedKeys) => {
					this.modelSet(data, changedKeys);
				});
			}
		}
		this.$elements.filter('select').on('change', (e) => this.selectChanged($(e.currentTarget), e));
		this.$elements.filter('input').on('input', (e) => this.inputChanged($(e.currentTarget), e));
		this.$elements.filter('input[type=checkbox]').on('change', (e) => this.inputChanged($(e.currentTarget), e));
		this.$elements.filter('button').on('click', (e) => this.buttonClicked($(e.currentTarget), e));

	}

	modelChanged(data, changedKeys){
		for (let value of changedKeys){
			if (this['_'+value]){
				this['_'+value](data[value], data, changedKeys);
			}
		}
	}
	modelSet(data, changedKeys){
		for (let value of changedKeys){
			if (this['__'+value]){
				this['__'+value](data[value], data, changedKeys);
			}
		}
	}
	testSelect(){}
	selectChanged(element, e){}
	buttonClicked(element, e){}

	printElements(){
		console.log('elements:', this.$elements, 'parents:', this.$parents);
	}

}

module.exports = View;
