var View = require('./View');

// ohhhhh i am a comment

var modeswitches = 0;
var NORMAL_MSW = 1;
var CPULines;
var rootCPU = 1;

class ToolbarView extends View {
	
	constructor(className, models){
		super(className, models);

		this.$elements.on('click', (e) => this.buttonClicked($(e.currentTarget), e));
		
		this.on('disconnected', () => {
			$('#run').removeClass('running-button').removeClass('building-button');
		});
		
		$('#run')
			.mouseover(function() {
				$('#control-text-1').html('<p>Run</p>');
			})
			.mouseout(function() {
				$('#control-text-1').html('');
			});
		
		$('#stop')
			.mouseover(function() {
				$('#control-text-1').html('<p>Stop</p>');
			})
			.mouseout(function() {
				$('#control-text-1').html('');
			});

		$('#new-tab')
			.mouseover(function() {
				$('#control-text-2').html('<p>New Tab</p>');
			})
			.mouseout(function() {
				$('#control-text-2').html('');
			});
		
		$('#download')
			.mouseover(function() {
				$('#control-text-2').html('<p>Download</p>');
			})
			.mouseout(function() {
				$('#control-text-2').html('');
			});

		$('#console')
			.mouseover(function() {
				$('#control-text-3').html('<p>Clear console</p>');
			})
			.mouseout(function() {
				$('#control-text-3').html('');
			});
		
		$('#scope')
			.mouseover(function() {
				$('#control-text-3').html('<p>Open scope</p>');
			})
			.mouseout(function() {
				$('#control-text-3').html('');
			});
	}
	
	// UI events
	buttonClicked($element, e){
		var func = $element.data().func;
		if (func && this[func]){
			this[func](func);
		}
	}
	
	run(func){
		this.emit('process-event', func);
	}
	
	stop(func){
		this.emit('process-event', func);
	}
	
	clearConsole(){
		this.emit('clear-console');
	}
	
	// model events
	__running(status){
		if (status){
			$('#run').removeClass('building-button').addClass('running-button');
		} else {
			$('#run').removeClass('running-button');
			$('#bela-cpu').html('CPU: --').css('color', 'black');
			$('#msw-cpu').html('MSW: --').css('color', 'black');
			modeswitches = 0;
		}
	}
	__building(status){
		if (status){
			$('#run').removeClass('running-button').addClass('building-button');
		} else {
			$('#run').removeClass('building-button');
		}
	}
	__checkingSyntax(status){
		if (status){
			$('#status').css('background', 'url("images/icons/status_wait.png")').prop('title', 'checking syntax...');
		} else {
			//this.syntaxTimeout = setTimeout(() => $('#status').css('background', 'url("images/toolbar.png") -140px 35px'), 10);
		}
	}
	__allErrors(errors){
		//if (this.syntaxTimeout) clearTimeout(this.syntaxTimeout); 
		if (errors.length){
			$('#status').css('background', 'url("images/icons/status_stop.png")').prop('title', 'syntax errors found'); 
		} else {
			$('#status').css('background', 'url("images/icons/status_ok.png")').prop('title', 'syntax check clear');
		}
	}

	_xenomaiVersion(ver){
		console.log('xenomai version:', ver);
		if (ver.includes('2.6.3'))
			CPULines = CPU2;
		else
			CPULines = CPU3;
	}

	_CPU(data){
	//	var ide = (data.syntaxCheckProcess || 0) + (data.buildProcess || 0) + (data.node || 0);
		var bela = 0;

		if (data.bela != 0 && data.bela !== undefined){
		
			// extract the data from the output
			var lines = data.bela.split('\n');
			var taskData = [];
			for (var j=0; j<lines.length; j++){
				taskData.push([]);
				lines[j] = lines[j].split(' ');
				for (var k=0; k<lines[j].length; k++){
					if (lines[j][k]){
						taskData[j].push(lines[j][k]);
					}
				}
			}
			
			var output = CPULines(taskData, this.mode_switches);

			for (var j=0; j<output.length; j++){
				if (output[j].cpu){
					bela += parseFloat(output[j].cpu);
				}
			}

			if(data.belaLinux)
				bela += data.belaLinux * rootCPU;

		}

	//	$('#ide-cpu').html('IDE: '+(ide*rootCPU).toFixed(1)+'%');
		$('#bela-cpu').html('CPU: '+( bela ? bela.toFixed(1)+'%' : '--'));
		
	//	if (bela && (ide*rootCPU + bela) > 80){
		if (bela && bela > 80) {
			$('#bela-cpu').css('color', 'red');
		} else {
			$('#bela-cpu').css('color', 'black');
		}
		
	}
	
	_cpuMonitoring(value){
		if (parseInt(value))
			$('#bela-cpu').css('visibility', 'visible');
		else
			$('#bela-cpu').css('visibility', 'hidden');
	}
	
	mode_switches(value){
		$('#msw-cpu').html('MSW: '+value);
		if (value > modeswitches){
			this.emit('mode-switch-warning', value);
			$('#msw-cpu').css('color', 'red');
		}
		modeswitches = value;
	}
}


function CPU2(taskData, msw_func){
	var output = [];
	for (var j=0; j<taskData.length; j++){
		if (taskData[j].length){
			var proc = {
				'name'	: taskData[j][7],
				'cpu'	: taskData[j][6],
				'msw'	: taskData[j][2],
				'csw'	: taskData[j][3]
			};
			if (proc.name === 'ROOT') rootCPU = proc.cpu*0.01;
			if (proc.name === 'bela-audio') msw_func(proc.msw-NORMAL_MSW);
			// ignore uninteresting data
			if (proc && proc.name && proc.name !== 'ROOT' && proc.name !== 'NAME' && proc.name !== 'IRQ67:'){
				output.push(proc);
			}
		}
	}
	return output;
}
function CPU3(taskData, msw_func){

	var output = [];
	for (var j=0; j<taskData.length; j++){
		if (taskData[j].length){
			var proc = {
				'name'	: taskData[j][8],
				'cpu'	: taskData[j][7],
				'msw'	: taskData[j][2],
				'csw'	: taskData[j][3]
			};
			if (proc.name === '[ROOT]') rootCPU = proc.cpu*0.01;
			if (proc.name === 'bela-audio') msw_func(proc.msw-NORMAL_MSW);
			// ignore uninteresting data
			if (proc && proc.name && proc.name !== '[ROOT]' && proc.name !== 'NAME' && proc.name !== '[IRQ16:'){
				output.push(proc);
			}
		}
	}

	return output;
}

module.exports = ToolbarView;
