var View = require('./View');
var popup = require('../popup');

class ProjectView extends View {
	
	constructor(className, models){
		super(className, models);
		
		//this.exampleChanged = false;
		this.on('example-changed', () => this.exampleChanged = true );
	}

	// UI events
	selectChanged($element, e){
	
		if (this.exampleChanged){
			this.exampleChanged = false;
			popup.exampleChanged( () => {
				this.emit('message', 'project-event', {func: $element.data().func, currentProject: $element.val()});
			}, undefined, 0, () => {
				$element.find('option').filter(':selected').attr('selected', '');
				$element.val($('#projects > option:first').val());
				this.exampleChanged = true;
			});
			return;
		}

		this.emit('message', 'project-event', {func: $element.data().func, currentProject: $element.val()})
		
	}
	buttonClicked($element, e){
		var func = $element.data().func;
		if (func && this[func]){
			this[func](func);
		}
	}
	
	newProject(func){

		if (this.exampleChanged){
			this.exampleChanged = false;
			popup.exampleChanged(this.newProject.bind(this), func, 500, () => this.exampleChanged = true );
			return;
		}
				
		// build the popup content
		popup.title('Creating a new project');
		popup.subtitle('Choose what kind of project you would like to create, and enter the name of your new project');
		
		var form = [];
		form.push('<input id="popup-C" type="radio" name="project-type" data-type="C" checked>');
		form.push('<label for="popup-C">C++</label>')
		form.push('</br>');
		form.push('<input id="popup-PD" type="radio" name="project-type" data-type="PD">');
		form.push('<label for="popup-PD">Pure Data</label>')
		form.push('</br>');
		form.push('<input id="popup-SC" type="radio" name="project-type" data-type="SC">');
		form.push('<label for="popup-SC">SuperCollider</label>')
		form.push('</br>');
		form.push('<input type="text" placeholder="Enter your project name">');
		form.push('</br>');
		form.push('<button type="submit" class="button popup-save">Create</button>');
		form.push('<button type="button" class="button popup-cancel">Cancel</button>');
		
		popup.form.append(form.join('')).off('submit').on('submit', e => {
			e.preventDefault();
			this.emit('message', 'project-event', {
				func, 
				newProject	: sanitise(popup.find('input[type=text]').val()),
				projectType	: popup.find('input[type=radio]:checked').data('type')
			});
			popup.hide();
		});
		
		popup.find('.popup-cancel').on('click', popup.hide );
		
		popup.show();

	}
	saveAs(func){
	
		// build the popup content
		popup.title('Saving project');
		popup.subtitle('Enter the name of your project');
		
		var form = [];
		form.push('<input type="text" placeholder="Enter the new project name">');
		form.push('</br >');
		form.push('<button type="submit" class="button popup-save">Save</button>');
		form.push('<button type="button" class="button popup-cancel">Cancel</button>');
		
		popup.form.append(form.join('')).off('submit').on('submit', e => {
			e.preventDefault();
			this.emit('message', 'project-event', {func, newProject: sanitise(popup.find('input[type=text]').val())});
			popup.hide();
		});
		
		popup.find('.popup-cancel').on('click', popup.hide );
		
		popup.show();

	}
	deleteProject(func){

		// build the popup content
		popup.title('Deleting project');
		popup.subtitle('Are you sure you wish to delete this project? This cannot be undone!');
		
		var form = [];
		form.push('<button type="submit" class="button popup-delete">Delete</button>');
		form.push('<button type="button" class="button popup-cancel">Cancel</button>');
		
		popup.form.append(form.join('')).off('submit').on('submit', e => {
			e.preventDefault();
			this.emit('message', 'project-event', {func});
			popup.hide();
		});
		
		popup.find('.popup-cancel').on('click', popup.hide );
		
		popup.show();
		
		popup.find('.popup-delete').trigger('focus');
		
	}
	cleanProject(func){
		this.emit('message', 'project-event', {func});
	}
	
	// model events
	_projectList(projects, data){

		var $projects = $('#projects');
		$projects.empty();
		
		// add an empty option to menu and select it
		var opt = $('<option></option>').attr({'value': '', 'selected': 'selected'}).html('--Projects--').appendTo($projects);

		// fill project menu with projects
		for (let i=0; i<projects.length; i++){
			if (projects[i] && projects[i] !== 'undefined' && projects[i] !== 'exampleTempProject' && projects[i][0] !== '.'){
				var opt = $('<option></option>').attr('value', projects[i]).html(projects[i]).appendTo($projects);
			}
		}
		
		if (data && data.currentProject) this._currentProject(data.currentProject);
		
	}
	_exampleList(examplesDir){

		var $examples = $('#examples');
		$examples.empty();

		if (!examplesDir.length) return;

		for (let item of examplesDir){
			let ul = $('<ul></ul>').html(item.name+':');
			for (let child of item.children){
				if (child && child.length && child[0] === '.') continue;
				$('<li></li>').addClass('sourceFile').html(child).appendTo(ul)
					.on('click', (e) => {

						if (this.exampleChanged){
							this.exampleChanged = false;
							popup.exampleChanged( () => {
								this.emit('message', 'project-event', {
									func: 'openExample',
									currentProject: item.name+'/'+child
								});
								$('.selectedExample').removeClass('selectedExample');
								$(e.target).addClass('selectedExample');
							}, undefined, 0, () => this.exampleChanged = true );
							return;
						}
							
						this.emit('message', 'project-event', {
							func: 'openExample',
							currentProject: item.name+'/'+child
						});
						$('.selectedExample').removeClass('selectedExample');
						$(e.target).addClass('selectedExample');
						
					});
			}
			ul.appendTo($examples);
		}
		
	}
	_currentProject(project){
	
		// unselect currently selected project
		$('#projects').find('option').filter(':selected').attr('selected', '');
		
		if (project === 'exampleTempProject'){
			// select no project
			$('#projects').val($('#projects > option:first').val());
		} else {
			// select new project
			//$('#projects option[value="'+project+'"]').attr('selected', 'selected');
			$('#projects').val($('#projects > option[value="'+project+'"]').val());
			// unselect currently selected example
			$('.selectedExample').removeClass('selectedExample');
		}
		
		// set download link
		$('#downloadLink').attr('href', '/download?project='+project);
		
	}
	
	__currentProject(){
		this.exampleChanged = false;
	}
	
	subDirs(dir){
		var ul = $('<ul></ul>').html(dir.name+':');
		for (let child of dir.children){
			if (!child.dir)
				$('<li></li>').addClass('sourceFile').html(child.name).data('file', (dir.dirPath || dir.name)+'/'+child.name).appendTo(ul);
			else {
				child.dirPath = (dir.dirPath || dir.name) + '/' + child.name;
				ul.append(this.subDirs(child));
			}
		}
		return ul;
	}
	
}

module.exports = ProjectView;

// replace all non alpha-numeric chars other than '-' and '.' with '_'
function sanitise(name){
	return name.replace(/[^a-zA-Z0-9\.\-]/g, '_');
}