var View = require('./View');
var popup = require('../popup');
var sanitise = require('../utils').sanitise;
var json = require('../site-text.json');
var example_order = require('../example_order.json');

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

		this.emit('message', 'project-event', {func: $element.data().func, currentProject: $element.data('name')})

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
    $projects.empty();

		// fill project menu with projects
    if (projects.length > 0) {
      var projLen = projects.length;
    }
    $projects.attr('size', (projLen - 1));
		for (let i=0; i < projLen; i++){
			if (projects[i] && projects[i] !== 'undefined' && projects[i] !== 'exampleTempProject' && projects[i][0] !== '.'){
				$('<li></li>').addClass('projectManager proj-li').val(projects[i]).attr('data-func', 'openProject').html(projects[i]).attr('data-name', projects[i]).appendTo($projects).on('click', function() {
          $(this).blur();
          $(this).parent().parent().removeClass('show');
        });
			}
		}

		if (data && data.currentProject) this._currentProject(data.currentProject);

	}

	_exampleList(examplesDir){

		var $examples = $('[data-examples]');
    var oldListOrder = examplesDir;
    var newListOrder = [];

		$examples.empty();

		if (!examplesDir.length) return;

    oldListOrder.forEach(item => {
      example_order.forEach(new_item => {
        if (new_item == item.name) {
          newListOrder.push(item);
          oldListOrder.splice(oldListOrder.indexOf(item), 1);
        }
      });
    });
    var orderedList = newListOrder.concat(oldListOrder);

		for (let item of orderedList){
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
    var counter = 0;
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
      counter++;

      let name = item.name;
      let parentButton = $('<button></button>').addClass('accordion').attr('data-accordion-for', name).html(name);
			let libraryList = $('<ul></ul>'); // This is the list of library items headed by dropdowns
      let libraryItem = $('<li></li>'); // Individual library dropdown

      let libraryPanel = $('<div></div>').addClass('panel').attr('data-accordion', name); // Div container for library dropdown info
      let libDesc = $('<p></p>').addClass('library-desc');  // Div to contain lib descriotion
      let libVer = $('<p></p>').addClass('library-ver');
      // INCLUDES:
      let includeTitle = $('<button></button>').addClass('accordion-sub').text('Use this library').attr('data-accordion-for', 'use-' + counter); // Header for include instructions
      let includeContent = $('<div></div>').addClass('include-container docs-content').attr('data-accordion', 'use-' + counter); // Div that contains include instructions.
      let includeLines = $('<div></div>').addClass('include-lines'); // Div to contain the lines to include
      let includeCopy = $('<button></button>').addClass('include-copy');

      let infoTitle = $('<button></button>').addClass('accordion-sub').text('Library info').attr('data-accordion-for', 'info-' + counter); // Header for include instructions
      let infoContainer = $('<div></div>').addClass('info-container docs-content').attr('data-accordion', 'info-' + counter); // Div that contains include instructions.


      var clipboard = new Clipboard(includeCopy[0], {
				target: function(trigger) {
					return $(trigger).parent().find($('[data-include="include-text"]'))[0];
				}
			});

      // FILES:
      let filesTitle = $('<button></button>').addClass('accordion-sub').text('Files').attr('data-accordion-for', 'file-list-' + counter); // Header for include instructions

      let filesContainer = $('<div></div>').addClass('docs-content').attr('data-accordion', 'file-list-' + counter);
      let filesList = $('<ul></ul>').addClass('libraries-list');
      let includeInstructions = $('<p></p>').text('Copy & paste at the top of each .cpp file in your project.');
			for (let child of item.children){
				if (child && child.length && child[0] === '.') continue;
        if (child == 'build') continue;
        let childLi = $('<li></li>');
        let testExt = child.split('.');
        let childExt = testExt[testExt.length - 1];
        // The MetaData file
        if (childExt === 'metadata') {
          let i = 0;
          let childPath = '/libraries/' + item.name + "/" + child;
          let libDataDiv = $('<div></div>');
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
              // libDesc.html('Version: ').html(object.version);
              libDesc.html(object.description);

              // FOR LIBRARY INFO


              if (object.version != null) {
                let infoContent = $('<p></p>');
                infoContent.append('Version: ' + object.version);
                infoContent.appendTo(infoContainer);
               }


              if (includeArr.length > 0) {
                for (let include of includeArr) {
                  let includeText = $('<p></p>').text('#include <' + 'libraries/' + object.name + '/' + object.name + '.h>\n').attr('data-include','include-text');
                  includeText.appendTo(includeLines);
                }
                includeLines.appendTo(includeContent);
              } else {
                let includeText = $('<pre></pre>').text('#include <' + 'libraries/' + object.name + '/' + object.name + '.h>').attr('data-include','include-text');
                includeText.appendTo(includeLines);
                includeLines.appendTo(includeContent);
                includeCopy.appendTo(includeContent);
                includeInstructions.appendTo(includeContent);
              }

              includeArr = [];
              libDataDiv.appendTo(libraryPanel);
              libDataDiv.find('.copy').not().first().remove(); // a dirty hack to remove all duplicates of the copy and paste element whilst I work out why I get more than one
            }
          });
        } else {
          childLi.html(child).attr('data-library-link', item.name + '/' + child).on('click', function() {
            let fileLocation = ('/libraries/' + item.name + '/' + child);
             // build the popup content
         		popup.title(child);

         		var form = [];
             $.ajax({
               type: "GET",
               url: "/libraries/" + item.name + "/" + child,
               dataType: "html",
               success: function(text){
                 var codeBlock = $('<pre></pre>');
                 var transformText = text.replace('<', '&lt;').replace('>', '&gt;').split('\n');
                 for (var i = 0; i < transformText.length; i++) {
                   codeBlock.append(transformText[i] + '\n');
                 }
                 popup.code(codeBlock);
               }
             });

         		form.push('<button type="button" class="button popup cancel">Close</button>');
            popup.form.append(form.join(''));
         		popup.find('.cancel').on('click', popup.hide );
         		popup.show();
          });
          includeInstructions.appendTo(includeContent);
          childLi.appendTo(filesList);
        }
			}
      // FOR LIBRARY INFO



      // per section
      // item.name -> parentDiv $examples
      parentButton.appendTo(libraryItem);
      libDesc.appendTo(libraryPanel); // Add library description, if present
      libVer.appendTo(libraryPanel);
      // per item in section
      // childLi -> childUl -> parentDiv -> $examples
      includeTitle.appendTo(libraryPanel);
      includeContent.appendTo(libraryPanel);
      // includeContainer.appendTo(libraryPanel);

      filesTitle.appendTo(libraryPanel);  // Include the Files: section title
      filesList.appendTo(filesContainer);
      filesContainer.appendTo(libraryPanel);

      infoTitle.appendTo(libraryPanel);
      infoContainer.appendTo(libraryPanel);

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
