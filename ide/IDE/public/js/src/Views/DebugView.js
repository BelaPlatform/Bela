var View = require('./View');

class DebugView extends View {
	
	constructor(className, models){
		super(className, models);
		this._debugMode(false);
	}
	
	// UI events
	selectChanged($element, e){
		var data = $element.data();
		var func = data.func;
		if (func && this[func]){
			this[func]($element.val());
		}
	}
	buttonClicked($element, e){
		this.setLocation('');
		this.emit('debugger-event', $element.data().func);
	}
	debugMode(status){
		this.emit('debug-mode', (status==true));
	}
	
	// model events
	_debugMode(status){
		if (!status){
			this.$parents.find('button').prop('disabled', 'disabled');
		}
	}
	// debugger process has started or stopped
	_debugRunning(status){
		this.clearVariableList();
		this.clearBacktrace();
		this.$parents.find('button').prop('disabled', 'disabled');
		if (!status) this.setLocation('n/a');
	}
	// debugger is doing something
	_debugBelaRunning(status){
		if (!status){
			this.$parents.find('button:not(#debugInterrupt)').prop('disabled', '');
			$('#expList, #backtraceList').removeClass('debuggerOutOfScope');
		} else {
			this.$parents.find('button:not(#debugInterrupt)').prop('disabled', 'disabled');
			$('#expList, #backtraceList').addClass('debuggerOutOfScope');
		}
	}
	_debugInterruptable(status){
		if (status) $('#debugInterrupt').prop('disabled', '');
		else $('#debugInterrupt').prop('disabled', 'disabled');
	}
	_debugStatus(value, data){
		if (value) this.setStatus(value);
	}
	_debugReason(value){
		this.setStatus($('#debuggerStatus').html()+', '+value);
	}
	_debugLine(line, data){
		var location = '';
		if (data.debugFile)
			location += data.debugFile+', line ';
		
		if (data.debugLine)
			location += data.debugLine;
		
		this.setLocation(location);
	}
	_variables(variables){
		console.log(variables);
		this.clearVariableList();
		for (let variable of variables){
			this.addVariable($('#expList'), variable);
		}
		prepareList();
	}
	_backtrace(trace){
		this.clearBacktrace();
		for (let item of trace){
			$('<li></li>').text(item).appendTo($('#backtraceList'));
		}
	}
	
	// utility methods
	setStatus(value){
		$('#debuggerStatus').html(value);
	}
	setLocation(value){
		$('#debuggerLocation').html(value);
	}
	clearVariableList(){
		$('#expList').empty();
	}
	clearBacktrace(){
		$('#backtraceList').empty();
	}
	addVariable(parent, variable){
		var name;
		if (variable.key) 
			name = variable.key;
		else {
			name = variable.name.split('.');
			if (name.length) name = name[name.length-1];
		}
		//console.log('adding variable', name, variable);
		var li = $('<li></li>');
		var table = $('<table></table>').appendTo(li);
		$('<td></td>').text(variable.type).addClass('debuggerType').appendTo(table);
		$('<td></td>').text(name).addClass('debuggerName').appendTo(table);
		var valTD = $('<td></td>').text(variable.value).addClass('debuggerValue').appendTo(table);
		li.attr('id', variable.name).appendTo(parent);
		if (variable.numchild && variable.children && variable.children.length){
			var ul = $('<ul></ul>').appendTo(li);
			for (let child of variable.children){
				this.addVariable(ul, child);
			}
		}
		if (variable.value == undefined){
			li.addClass('debuggerOutOfScope');
			valTD.text('out of scope');
		}
	}
}

module.exports = DebugView;

function prepareList() {
    $('#expList').find('li:has(ul)').each(function(){
    	var $this = $(this);
    	if (!$this.hasClass('collapsed')){
    		$this.click( function(event) {
				$(this).toggleClass('expanded');
				$(this).children('ul').toggle('fast');
				return false;
			})
			.addClass('collapsed')
			.children('ul').hide();
    	}
    });
    
};









