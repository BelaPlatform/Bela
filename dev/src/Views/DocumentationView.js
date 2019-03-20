var View = require('./View');

var apiFuncs = ['setup', 'render', 'cleanup', 'Bela_createAuxiliaryTask', 'Bela_scheduleAuxiliaryTask'];

var classes = [
  'Scope',
  'OSCServer',
  'OSCClient',
  'OSCMessageFactory',
  'UdpServer',
  'UdpClient',
  'Midi',
  'MidiParser',
  'WriteFile'
];

class DocumentationView extends View {

  constructor(className, models){
    super(className, models);

    this.on('init', this.init);

  }

  init(){

    var self = this;

    // The API
    $.ajax({
      type: "GET",
      url: "documentation_xml?file=Bela_8h",
      dataType: "html",
      success: function(xml){
        var counter = 0;
        for (let item of apiFuncs){
          var li = createlifrommemberdef($(xml).find('memberdef:has(name:contains(' + item + '))'), 'APIDocs' + counter, self, 'api');
          li.appendTo($('[data-docs-api]'));
          counter += 1;
        }
      }
    });

    // The Audio Context
    $.ajax({
      type: "GET",
      url: "documentation_xml?file=structBelaContext",
      dataType: "html",
      success: function(xml){
        var counter = 0;
        createlifromxml($(xml), 'contextDocs' + counter, 'structBelaContext', self, 'contextType').appendTo($('[data-docs-context]'));
        counter += 1;
        $(xml).find('memberdef').each(function(){
          var li = createlifrommemberdef($(this), 'contextDocs' + counter, self, 'context');
          li.appendTo($('[data-docs-context]'));
          counter += 1;
        });
      }
    });

    // Utilities
    $.ajax({
      type: "GET",
      url: "documentation_xml?file=Utilities_8h",
      dataType: "html",
      success: function(xml){
        var counter = 0;
        createlifromxml($(xml), 'utilityDocs' + counter, 'Utilities_8h', self, 'header').appendTo($('[data-docs-utility]'));
        counter += 1;
        $(xml).find('memberdef').each(function(){
          var li = createlifrommemberdef($(this), 'utilityDocs' + counter, self, 'utility');
          li.appendTo($('[data-docs-utility]'));
          counter += 1;
        });
      }
    });

    // all classes
    for (let item of classes){
      xmlClassDocs(item, this);
    }

  }

}

module.exports = DocumentationView;

function createlifrommemberdef($xml, id, emitter, type){

  var name = $xml.find('name').html();
  emitter.emit('add-link', {name, id}, type);

  var li = $('<li></li>');

  // title
  li.append($('<button class="accordion-sub" data-accordion-for="' + name + '"></button>').html($xml.find('name').html() ));

  var content = $('<div class="docs-content" data-accordion="' + name + '"></div>');
  content.append($('<h3 class="memberdef-title"></h3>').html( $xml.find('definition').html() + $xml.find('argsstring').html() ));

  // subtitle
  content.append($('<p></p>').html( $xml.find('briefdescription > para').html() || '' ));

  // main text
  $xml.find('detaileddescription > para').each(function(){
    if ($(this).find('parameterlist').length){
      content.append('<h4>Parameters:</h4>');
      var ul = $('<ul></ul>');
      $(this).find('parameteritem').each(function(){
        var li = $('<li></li>');
        li.append($('<h5></h5>').html( $(this).find('parametername').html() + ': ' ));
        $(this).find('parameterdescription>para').each(function(){
          li.append($('<p></p>').html( $(this).html() || '' ));
        });
        ul.append(li);
      });
      content.append(ul);
    } else {
      content.append($('<p></p>').html( $(this).html() || '' ));
    }
  });

  li.append(content);
  return li;
}

function createlifromxml($xml, id, filename, emitter, type){

  var name = $xml.find('compoundname').html();
  emitter.emit('add-link', {name, id}, type);

  var li = $('<li></li>');

  var content = $('<div class="intro-content"></div>');

  // subtitle
  li.append($('<h3 class="intro-header"></h3>').html( $xml.find('compounddef > briefdescription > para').html() || '' ));

  // main text
  $xml.find('compounddef > detaileddescription > para').each(function(){
    if ($(this).find('parameterlist').length){
      content.append('<h3>Parameters:</h3>');
      var ul = $('<ul></ul>');
      $(this).find('parameteritem').each(function(){
        var li = $('<li></li>');
        li.append($('<h4></h4>').html( $(this).find('parametername').html() + ': ' ));
        $(this).find('parameterdescription>para').each(function(){
          li.append($('<p></p>').html( $(this).html() || '' ));
        });
        ul.append(li);
      });
      content.append(ul);
    } else {
      content.append($('<p></p>').html( $(this).html() || '' ));
    }
  });

  content.append('<a href="documentation/' + filename + '.html" target="_blank" class="button">Full Documentation</a>');

  li.append(content);
  return li;
}

function xmlClassDocs(classname, emitter){
  var filename = 'class' + classname;
  var parent = $('[data-docs="' + classname + 'Docs"]');
  $.ajax({
    type: "GET",
    url: "documentation_xml?file=" + filename,
    dataType: "html",
    success: function(xml){
      var counter = 0;
      createlifromxml($(xml), classname + counter, filename, emitter, 'typedef').appendTo(parent);
      emitter.emit('add-link', {name: classname, id: classname + counter}, 'header');

      counter += 1;
      $(xml).find('[kind="public-func"]>memberdef:not(:has(name:contains(' + classname  + ')))').each(function(){
        var li = createlifrommemberdef($(this), classname + counter, emitter, classname);
        li.appendTo(parent);
        counter += 1;
      });

      $.ajax({
        type: "GET",
        url: "documentation_xml?file=" + classname + "_8h",
        dataType: "html",
        success: function(xml){
          var includes = $(xml).find('includedby');
          var doInclude = false;
          if (includes.length){
            var content = $('<div></div>').addClass('subsections');
            content.append($('<p class="examples-header"></p>').html('Examples using this class:'));
            var exampleList = $('<ul></ul>').addClass('example-list');
            includes.each(function(){
              var exampleListItem = $('<li></li>');
              var include = $(this).html();
              exampleListItem.attr('data-location', include);
              if (include && include.split && include.split('/')[0] === 'examples') {
                doInclude = true;
                var link = $('<a></a>').html(include.split('/')[2]).text(include);
                link.on('click', () => emitter.emit('open-example', [include.split('/')[1], include.split('/')[2]].join('/')));
                exampleListItem.append(link);
                exampleListItem.appendTo(exampleList);
              }
            });
            if (doInclude) {
              exampleList.appendTo(content);
              content.appendTo($('[data-docs="' + classname + 'Docs"]').parent());
            }
          }
        }
      });
    }
  });
}
