var View = require('./View');
var popup = require('../popup');
var sanitise = require('../utils').sanitise;
var json = require('../site-text.json');

class ProjectView extends View {

	constructor(className, models){
		super(className, models);

		this.on('example-changed', () => this.exampleChanged = true );
	}

	// UI events
	selectChanged($element, e){
		if (this.exampleChanged){
			this.exampleChanged = false;
			popup.exampleChanged( () => {
				this.emit('message', 'project-event', {func: $element.data().func, currentProject: $element.val()});
			}, undefined, 0, () => {
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
		popup.title(json.popups.create_new.title);
		popup.subtitle(json.popups.create_new.text);

		var form = [];
		form.push('<label for="popup-C" class="radio-container">C++')
		form.push('<input id="popup-C" type="radio" name="project-type" data-type="C" checked>')
		form.push('<span class="radio-button"></span>')
		form.push('</label>');
		form.push('<label for="popup-PD" class="radio-container">Pure Data')
		form.push('<input id="popup-PD" type="radio" name="project-type" data-type="PD">')
		form.push('<span class="radio-button"></span>')
		form.push('</label>');
		form.push('<label for="popup-SC" class="radio-container">SuperCollider')
		form.push('<input id="popup-SC" type="radio" name="project-type" data-type="SC">');
		form.push('<span class="radio-button"></span>')
		form.push('</label>');
		form.push('<label for="popup-CS" class="radio-container">Csound');
		form.push('<input id="popup-CS" type="radio" name="project-type" data-type="CS">');
		form.push('<span class="radio-button"></span>')
		form.push('</label>');
		form.push('<input type="text" placeholder="Enter your project name">');
		form.push('</br>');
		form.push('<button type="submit" class="button popup confirm">' + json.popups.create_new.button + '</button>');
		form.push('<button type="button" class="button popup cancel">Cancel</button>');

		popup.form.append(form.join('')).off('submit').on('submit', e => {
			e.preventDefault();
			this.emit('message', 'project-event', {
				func,
				newProject	: sanitise(popup.find('input[type=text]').val()),
				projectType	: popup.find('input[type=radio]:checked').data('type')
			});
      $('[data-projects-select]').html('');
			popup.hide();
		});

		popup.find('.cancel').on('click', popup.hide );

		popup.show();

	}
	saveAs(func){

		// build the popup content
		popup.title(json.popups.save_as.title);
		popup.subtitle(json.popups.save_as.text);

		var form = [];
		form.push('<input type="text" placeholder="Enter the new project name">');
		form.push('</br >');
		form.push('<button type="submit" class="button popup confirm">'+json.popups.save_as.button+'</button>');
		form.push('<button type="button" class="button popup cancel">Cancel</button>');

		popup.form.append(form.join('')).off('submit').on('submit', e => {
			e.preventDefault();
			this.emit('message', 'project-event', {func, newProject: sanitise(popup.find('input[type=text]').val())});
			popup.hide();
		});

		popup.find('.cancel').on('click', popup.hide );

		popup.show();

	}

	deleteProject(func){

		// build the popup content
		popup.title(json.popups.delete_project.title);
		popup.subtitle(json.popups.delete_project.text);

		var form = [];
		form.push('<button type="submit" class="button popup delete">' + json.popups.delete_project.button + '</button>');
		form.push('<button type="button" class="button popup cancel">Cancel</button>');

		popup.form.append(form.join('')).off('submit').on('submit', e => {
			e.preventDefault();
      $('[data-projects-select]').html('');
			this.emit('message', 'project-event', {func});
			popup.hide();
		});

		popup.find('.cancel').on('click', popup.hide );

		popup.show();

		popup.find('.delete').trigger('focus');

	}
	cleanProject(func){
		this.emit('message', 'project-event', {func});
	}

	// model events
	_projectList(projects, data){

		var $projects = $('[data-projects-select]');

    // var option = $('<ul></ul>').addClass('dropdown-content').attr('data-dropdown', 'project');
		// fill project menu with projects
		for (let i=0; i<projects.length; i++){
			if (projects[i] && projects[i] !== 'undefined' && projects[i] !== 'exampleTempProject' && projects[i][0] !== '.'){
				$('<option></option>').addClass('projectManager').val(projects[i]).attr('data-func', 'openProject').html(projects[i]).appendTo($projects);
			}
		}

		if (data && data.currentProject) this._currentProject(data.currentProject);

	}

	_exampleList(examplesDir){

		var $examples = $('[data-examples]');
		$examples.empty();

		if (!examplesDir.length) return;

		for (let item of examplesDir){
      let parentButton = $('<button></button>').addClass('accordion').attr('data-accordion-for', item.name).html(item.name + ':');
			let parentUl = $('<ul></ul>');
      let parentLi = $('<li></li>');
      let childUl = $('<ul></ul>').addClass('example-list');
      let childDiv = $('<div></div>').addClass('panel').attr('data-accordion', item.name);

			for (let child of item.children){
				if (child && child.length && child[0] === '.') continue;
        let childLi = $('<li></li>');
				childLi.html(child).attr('data-example-link', item.name + '/' + child)
					.on('click', (e) => {

						if (this.exampleChanged){
							this.exampleChanged = false;
							popup.exampleChanged( () => {
								this.emit('message', 'project-event', {
									func: 'openExample',
									currentProject: item.name + '/' + child
								});
								$('.selectedExample').removeClass('selectedExample');
								$(e.target).addClass('selectedExample');
							}, undefined, 0, () => this.exampleChanged = true );
							return;
						}

						this.emit('message', 'project-event', {
							func: 'openExample',
							currentProject: item.name + '/' + child
						});
						$('.selectedExample').removeClass('selectedExample');
						$(e.target).addClass('selectedExample');
					});
          childLi.appendTo(childUl);
			}
      // per section
      // item.name -> parentDiv $examples
      parentButton.appendTo(parentLi);
      // per item in section
      // childLi -> childUl -> parentDiv -> $examples
      childUl.appendTo(childDiv);
      childDiv.appendTo(parentLi);
      parentLi.appendTo(parentUl);
      parentLi.appendTo($examples);
		}
	}

  _libraryList(librariesDir){

		var $libraries = $('[data-libraries-list]');
		$libraries.empty(librariesDir);
		if (!librariesDir.length) return;

		for (let item of librariesDir){
      let name = item.name;
      let parentButton = $('<button></button>').addClass('accordion').attr('data-accordion-for', name).html(name + ':');
			let parentUl = $('<ul></ul>');
      let parentLi = $('<li></li>');
      let childUl = $('<ul></ul>').addClass('libraries-list');
      let childDiv = $('<div></div>').addClass('panel').attr('data-accordion', name);
      let childTitle = $('<p></p>').addClass('file-heading').text('Files');
      let libTitle = $('<p></p>').addClass('file-heading').text('Library Information');
      let includeTitle = $('<p></p>').addClass('file-heading').text('Include Library');
      let includeInstructions = $('<p></p>').text('To include this library copy and paste the following lines into the head of your project.');
      let includeCP = $('<p><p>').addClass('copy').text('Copy to clipboard').on('click', function(){
        let includes = $(this).parent().find('[data-form]');
        // includes.focus();
        includes.select();
        document.execCommand("copy");
      });
			for (let child of item.children){
        // console.log(child);
				if (child && child.length && child[0] === '.') continue;
        let childLi = $('<li></li>');
        let testExt = child.split('.');
        let childExt = testExt[testExt.length - 1];
        // The MetaData file
        if (childExt === 'metadata') {
          let i = 0;
          let childPath = '/libraries/' + item.name + "/" + child;
          let libDataDiv = $('<div></div>');
          let libData = $('<dl></dl>');
          let includeArr = [];
          let includeForm = $('<textarea></textarea>').addClass('hide-include').attr('data-form', '');
          let includeText = $('<pre></pre>');
          $.ajax({
            type: "GET",
            url: "/libraries/" + name + "/" + child,
            dataType: "html",
            success: function(text){
              i += 1;
              var object = {};
              var transformText = text.split('\n');
              for (let line of transformText) {
                if (line.length > 0) {
                  var splitKeyVal = line.split('=');
                  var key = splitKeyVal[0];
                  if (key == 'include') {
                    includeArr.push(splitKeyVal[1]);
                  } else {
                    object[key] = splitKeyVal[1];
                  }
                }
              }
              if (object.name) {
                var libNameDT = $('<dt></dt>').text('Name:');
                libNameDT.appendTo(libData);
                var libNameDD = $('<dd></dd>').text(object.name);
                libNameDD.appendTo(libData);
              }
              if (object.version) {
                var libVersionDT = $('<dt></dt>').text('Version:');
                libVersionDT.appendTo(libData);
                var libVersionDD = $('<dd></dd>').text(object.version);
                libVersionDD.appendTo(libData);
              }
              if (object.author) {
                var libAuthorDT = $('<dt></dt>').text('Author:');
                libAuthorDT.appendTo(libData);
                var libAuthorDD = $('<dd></dd>').text(object.author);
                libAuthorDD.appendTo(libData);
              }
              if (object.maintainer) {
                var libMaintainerDT = $('<dt></dt>').text('Maintainer:');
                libMaintainerDT.appendTo(libData);
                var libMaintainerDD = $('<dd></dd>').text(object.maintainer);
                libMaintainerDD.appendTo(libData);
              }
              if (object.description) {
                var libDescriptionDT = $('<dt></dt>').text('Description:');
                libDescriptionDT.appendTo(libData);
                var libDescriptionDD = $('<dd></dd>').text(object.description);
                libDescriptionDD.appendTo(libData);
              }
              includeInstructions.appendTo(libDataDiv);
              includeCP.appendTo(libDataDiv);
              includeForm.appendTo(libDataDiv);
              if (includeArr.length > 0) {
                includeTitle.appendTo(libDataDiv);
                for (let include of includeArr) {
                  let includeText = $('<pre></pre>');
                  includeText.text('#include <' + include + '>').attr('data-include','');
                  includeForm.text(includeForm.text() + "\n" + '#include <' + include + '>').attr('data-include','');
                  includeText.appendTo(libDataDiv);
                }
              } else {
                includeText.text('#include <' + 'libraries/' + object.name + '/' + object.name + '.h>').attr('data-include','');
                includeForm.text('#include <' + 'libraries/' + object.name + '/' + object.name + '.h>').attr('data-include','');
                includeText.appendTo(libDataDiv);
              }
              includeArr = [];
              libTitle.appendTo(libDataDiv);
              libData.appendTo(libDataDiv);
              libDataDiv.appendTo(childDiv);
              libDataDiv.find('.copy').not().first().remove(); // a dirty hack to remove all duplicates of the copy and paste element whilst I work out why I get more than one
            }
          });
        } else {
          childLi.html(child).attr('data-library-link', item.name + '/' + child);
          childLi.appendTo(childUl);
        }
			}
      // per section
      // item.name -> parentDiv $examples
      parentButton.appendTo(parentLi);
      // per item in section
      // childLi -> childUl -> parentDiv -> $examples
      childTitle.appendTo(childDiv);
      childUl.appendTo(childDiv);
      childDiv.appendTo(parentLi);
      parentLi.appendTo(parentUl);
      parentLi.appendTo($libraries);
		}

	}

	_boardString(data){
		var boardString;
		if(data && data.trim)
			boardString = data.trim();
		else
			return

			var exceptString = boardString;
			if(exceptString === "CtagFace" || exceptString === "CtagBeast")
				exceptString = 'Ctag'

			$.getJSON( "../example_except.json", function( data ) {

				if (exceptString in data)
				{
					for(var example in data[exceptString]) {
					  var exampleId = data[exceptString][example].section+"/"+data[exceptString][example].name;
						try{
							 document.getElementById(exampleId).style.display = 'none';
						}
						catch(err){}
					}
				}
			})
	}
	_currentProject(project){

		// unselect currently selected project
		$('[data-projects-select]').find('option').filter(':selected').attr('selected', '');

		if (project === 'exampleTempProject'){
			// select no project
			$('[data-projects-select]').val($('[data-projects-select] > option:first').val());
		} else {
			// select new project
			$('[data-projects-select]').val($('[data-projects-select] > option[value="' + project + '"]').val());
		}

		// set download link
		$('[data-download-file]').attr('href', '/download?project=' + project);

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
