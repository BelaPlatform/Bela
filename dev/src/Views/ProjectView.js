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
		form.push('<input type="text" placeholder="' + json.popups.save_as.input + '">');
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

		// fill project menu with projects
    if (projects.length > 0) {
      var projLen = projects.length;
    }
    $projects.attr('size', (projLen - 1));
		for (let i=0; i < projLen; i++){
			if (projects[i] && projects[i] !== 'undefined' && projects[i] !== 'exampleTempProject' && projects[i][0] !== '.'){
				$('<option></option>').addClass('projectManager').val(projects[i]).attr('data-func', 'openProject').html(projects[i]).appendTo($projects).on('click', function() {
          $(this).blur();
          $(this).parent().parent().removeClass('show');
        });
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
      /*
      Button header text    +
      Library description here.

      [Later button to launch KB]

      Use this library:
      ------------------------------
      // This div is includeContent
      #include <example>                                // This line is includeLine
      (small) Copy and paste in the header of render.cpp// This line is includeInstructions
      // End includeContent

      Files:
      ------------------------------
      > one
      > two

      Library info:
      ------------------------------
      Name: XXX
      Version: XXX
      Author: XXX (mailto link)
      Maintainer: xxx 
      */

      let name = item.name;
      let parentButton = $('<button></button>').addClass('accordion').attr('data-accordion-for', name).html(name);
			let libraryList = $('<ul></ul>'); // This is the list of library items headed by dropdowns
      let libraryItem = $('<li></li>'); // Individual library dropdown

      let libraryPanel = $('<div></div>').addClass('panel').attr('data-accordion', name); // Div container for library dropdown info

      let libDesc = $('<div></div>').addClass('library-desc');  // Div to contain lib descriotion

      // INCLUDES:
      let includeTitle = $('<p></p>').addClass('file-heading').text('Use this library:'); // Header for include instructions
      let includeContent = $('<div></div>'); // Div that contains include instructions.
      let includeLines = $('<div></div>').addClass('include-lines'); // Div to contain the lines to include
      let includeCopy = $('<button></button>').text('Copy to clipboard').addClass('include-copy');
      // let includeLine = $('<p></p>').addClass('include-text');

      // FILES:
      let filesTitle = $('<p></p>').addClass('file-heading').text('Files');
      let filesList = $('<ul></ul>').addClass('libraries-list');

      let libInfoTitle = $('<p></p>').addClass('file-heading').text('Library Information');
      let libInfoContent = $('<div></div>').addClass('lib-info-content');

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
          // let libDataDiv = $('<div></div>');
          // let libData = $('<dl></dl>');
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
              // Get the #include line and add to includeContent
              if (includeArr.length > 0) {
                for (let include of includeArr) {
                  let includeText = $('<p></p>').text('#include <' + 'libraries/' + object.name + '/' + object.name + '.h>\n').attr('data-include','include-text');
                  //   includeText.text('#include <' + 'libraries/' + object.name + '/' + object.name + '.h>').attr('data-include','');
                  includeText.appendTo(includeLines);
                }
                includeLines.appendTo(includeContent);
              } else {
                let includeText = $('<p></p>').text('#include <' + 'libraries/' + object.name + '/' + object.name + '.h>').attr('data-include','include-text');
                includeText.appendTo(includeLines);
                includeLines.appendTo(includeContent);
                includeCopy.appendTo(includeContent);
              }



              // Get text for library description
              if (object.description != '' && object.description != '.') {
                let libDescText = $('<p></p>').text(object.description);
                libDesc.append(libDescText);
              }
              // Construct the libInfo elements:
              // Library name
              if (object.name) {
                var infoName = $('<p></p>').text("Library name: ");
                infoName.append(object.name);
                infoName.appendTo(libInfoContent);
              }
              // Library version
              if (object.version) {
                var infoVer = $('<p></p>').text('Version: ');
                infoVer.append(object.version);
                infoVer.appendTo(libInfoContent);
              }
              // Authors
              if (object.author) {
                var infoAuth = $('<p></p>').text('Author: ');
                infoAuth.append(object.author);
                infoAuth.appendTo(libInfoContent);
              }
              // Maintainers
              if (object.maintainer) {
                var infoMaintainer = $('<p></p>').text('Maintainer: ');
                infoMaintainer.append(object.maintainer);
                infoMaintainer.appendTo(libInfoContent);
              }

              // includeInstructions.appendTo(libDataDiv);
              // includeCP.appendTo(libDataDiv);
              // includeForm.appendTo(includeContent);
              // if (includeArr.length > 0) {
              //   includeTitle.appendTo(libDataDiv);
              //   for (let include of includeArr) {
              //     let includeText = $('<pre></pre>');
              //     includeText.text('#include <' + include + '>').attr('data-include','');
              //     includeForm.text(includeForm.text() + "\n" + '#include <' + include + '>').attr('data-include','');
              //     // includeText.appendTo(libDataDiv);
              //     // includeForm.appendTo(includeLine);
              //     includeText.appendTo(libDataDiv);
              //   }
              // includeInstructions.appendTo(libDataDiv);
              // includeCP.appendTo(libDataDiv);
              // includeForm.appendTo(includeContent);
              // if (includeArr.length > 0) {
              //   // includeTitle.appendTo(libDataDiv);
              //   for (let include of includeArr) {
              //     let includeText = $('<pre></pre>');
              //     includeText.text('#include <' + include + '>').attr('data-include','');
              //     includeForm.text(includeForm.text() + "\n" + '#include <' + include + '>').attr('data-include','');
              //     // includeText.appendTo(libDataDiv);
              //     // includeForm.appendTo(includeLine);
              //     // includeText.appendTo(libDataDiv);
              //     includeCP.appendTo(includeContent);
              //   }
              // } else {
              //   includeText.text('#include <' + 'libraries/' + object.name + '/' + object.name + '.h>').attr('data-include','');
              //   includeForm.text('#include <' + 'libraries/' + object.name + '/' + object.name + '.h>').attr('data-include','');
              //   includeText.appendTo(includeLine);
              // }
              includeArr = [];
              // libTitle.appendTo(libDataDiv);
              // libData.appendTo(libDataDiv);
              libDataDiv.appendTo(libraryPanel);
              libDataDiv.find('.copy').not().first().remove(); // a dirty hack to remove all duplicates of the copy and paste element whilst I work out why I get more than one
            }
          });
        } else {
          childLi.html(child).attr('data-library-link', item.name + '/' + child);
          childLi.appendTo(filesList);
        }
			}
      // per section
      // item.name -> parentDiv $examples
      parentButton.appendTo(libraryItem);
      libDesc.appendTo(libraryPanel); // Add library description, if present
      // per item in section
      // childLi -> childUl -> parentDiv -> $examples
      includeTitle.appendTo(libraryPanel);
      // includeLine.appendTo(includeContent);
      includeContent.appendTo(libraryPanel);

      filesTitle.appendTo(libraryPanel);  // Include the Files: section title
      filesList.appendTo(libraryPanel);   // List the files

      libInfoTitle.appendTo(libraryPanel);
      libInfoContent.appendTo(libraryPanel);

      libraryPanel.appendTo(libraryItem); // Append the whole panel to the library item
      libraryItem.appendTo(libraryList);  // Append the whole item to the list of library items
      libraryItem.appendTo($libraries);

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
    $('[data-project-download]').attr('href', '/download?project=' + project);

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
