var View = require('./View');

// ohhhhh i am a comment

var modeswitches = 0;
var NORMAL_MSW = 1;
var nameIndex, CPUIndex, rootName, IRQName;

class ToolbarView extends View {

	constructor(className, models){
		super(className, models);

		this.$elements.on('click', (e) => this.buttonClicked($(e.currentTarget), e));

		this.on('disconnected', () => {
      $('[data-toolbar-run]').removeClass('running-button').removeClass('building-button');
		});

    $('[data-toolbar-run]')
			.mouseover(function() {
				$('[data-toolbar-controltext1]').html('<p>Run</p>');
			})
			.mouseout(function() {
				$('[data-toolbar-controltext1]').html('');
			});

		$('[data-toolbar-stop]')
			.mouseover(function() {
				$('[data-toolbar-controltext1]').html('<p>Stop</p>');
			})
			.mouseout(function() {
				$('[data-toolbar-controltext1]').html('');
			});

		$('[data-toolbar-newtab]')
			.mouseover(function() {
				$('[data-toolbar-controltext2]').html('<p>New Tab</p>');
			})
			.mouseout(function() {
				$('[data-toolbar-controltext2]').html('');
			});

		$('[data-toolbar-download]')
			.mouseover(function() {
				$('[data-toolbar-controltext2]').html('<p>Download</p>');
			})
			.mouseout(function() {
				$('[data-toolbar-controltext2]').html('');
			});

		$('[data-toolbar-console]')
			.mouseover(function() {
				$('[data-toolbar-controltext2]').html('<p>Clear console</p>');
			})
			.mouseout(function() {
				$('[data-toolbar-controltext2]').html('');
			});

		$('[data-toolbar-scope]')
			.mouseover(function() {
				$('[data-toolbar-controltext2]').html('<p>Open scope</p>');
			})
			.mouseout(function() {
				$('[data-toolbar-controltext2]').html('');
			});
    $('[data-toolbar-scope]')
      .on('click', function(){
        window.open('scope');
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
			$('[data-toolbar-run]').removeClass('building-button').addClass('running-button');
		} else {
			$('[data-toolbar-run]').removeClass('running-button');
			$('[data-toolbar-bela-cpu]').html('CPU: --').css('color', 'black');
  		$('[data-toolbar-msw-cpu]').html('MSW: --').css('color', 'black');
			modeswitches = 0;
		}
	}
	__building(status){
		if (status){
  		$('[data-toolbar-run]').removeClass('running-button').addClass('building-button');
		} else {
  		$('[data-toolbar-run]').removeClass('building-button');
		}
	}
	__checkingSyntax(status){
		if (status){
  		$('[data-toolbar-status]').addClass('pending').removeClass('ok').removeClass('stop').prop('title', 'checking syntax&hellip;');
		}
	}
	__allErrors(errors){
		if (errors.length){
			$('[data-toolbar-status]').removeClass('pending').removeClass('ok').addClass('stop').prop('title', 'syntax errors found');
		} else {
			$('[data-toolbar-status]').removeClass('pending').addClass('ok').removeClass('stop').prop('title', 'syntax check clear');
		}
	}

	_xenomaiVersion(ver){
		console.log('xenomai version:', ver);
		if (ver.includes('2.6')){
			nameIndex = 7;
			CPUIndex = 6;
			rootName = 'ROOT';
			IRQName = 'IRQ67:';
		} else {
			nameIndex = 8;
			CPUIndex = 7;
			rootName = '[ROOT]';
			IRQName = '[IRQ16:';
		}
	}

	_CPU(data){
		var bela = 0, rootCPU = 1;

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

			var output = [];
			for (var j=0; j<taskData.length; j++){
				if (taskData[j].length){
					var proc = {
						'name'	: taskData[j][nameIndex],
						'cpu'	: taskData[j][CPUIndex],
						'msw'	: taskData[j][2],
						'csw'	: taskData[j][3]
					};
					if (proc.name === rootName) rootCPU = proc.cpu*0.01;
					if (proc.name === 'bela-audio') this.mode_switches(proc.msw-NORMAL_MSW);
					// ignore uninteresting data
					if (proc && proc.name && proc.name !== rootName && proc.name !== 'NAME' && proc.name !== IRQName){
						output.push(proc);
					}
				}
			}

			for (var j=0; j<output.length; j++){
				if (output[j].cpu){
					bela += parseFloat(output[j].cpu);
				}
			}

			if(data.belaLinux)
				bela += data.belaLinux * rootCPU;

		}

		$('[data-toolbar-bela-cpu]').html('CPU: '+( bela ? bela.toFixed(1)+'%' : '--'));

		if (bela && bela > 80) {
			$('[data-toolbar-bela-cpu]').css('color', 'red');
		} else {
			$('[data-toolbar-bela-cpu]').css('color', 'black');
		}

	}

	_cpuMonitoring(value){
		if (parseInt(value))
			$('[data-toolbar-bela-cpu]').css('visibility', 'visible');
		else
			$('[data-toolbar-bela-cpu]').css('visibility', 'hidden');
	}

	mode_switches(value){
		$('[data-toolbar-msw-cpu]').html('MSW: '+value);
		if (value > modeswitches){
			this.emit('mode-switch-warning', value);
			$('[data-toolbar-msw-cpu]').css('color', 'red');
		}
		modeswitches = value;
	}
}

module.exports = ToolbarView;
