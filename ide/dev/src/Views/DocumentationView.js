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
		
		this.on('open', (id) => {
			this.closeAll();
			$('#'+id).prop('checked', 'checked');
			$('#'+id).parent().parent().siblings('input').prop('checked', 'checked');
			var offset = $('#'+id).siblings('label').position().top + $('#docTab').scrollTop();
			if (offset) $('#docTab').scrollTop(offset);
		})
	}
	
	init(){
	
		var self = this;
		
		// The API
		$.ajax({
			type: "GET",
			url: "documentation_xml?file=Bela_8h",
			dataType: "xml",
			success: function(xml){
				//console.log(xml);
				var counter = 0;
				for (let item of apiFuncs){
					var li = createlifrommemberdef($(xml).find('memberdef:has(name:contains('+item+'))'), 'APIDocs'+counter, self, 'api');
					li.appendTo($('#APIDocs'));
					counter += 1;
				}
			}
		});
		
		// The Audio Context
		$.ajax({
			type: "GET",
			url: "documentation_xml?file=structBelaContext",
			dataType: "xml",
			success: function(xml){
				//console.log(xml);
				var counter = 0;
				createlifromxml($(xml), 'contextDocs'+counter, 'structBelaContext', self, 'contextType').appendTo($('#contextDocs'));
				counter += 1;
				$(xml).find('memberdef').each(function(){
					var li = createlifrommemberdef($(this), 'contextDocs'+counter, self, 'context');
					li.appendTo($('#contextDocs'));
					counter += 1;
				});
			}
		});
		
		// Utilities
		$.ajax({
			type: "GET",
			url: "documentation_xml?file=Utilities_8h",
			dataType: "xml",
			success: function(xml){
				//console.log(xml);
				var counter = 0;
				createlifromxml($(xml), 'utilityDocs'+counter, 'Utilities_8h', self, 'header').appendTo($('#utilityDocs'));
				counter += 1;
				$(xml).find('memberdef').each(function(){
					var li = createlifrommemberdef($(this), 'utilityDocs'+counter, self, 'utility');
					li.appendTo($('#utilityDocs'));
					counter += 1;
				});
			}
		});
		
		// all classes
		for (let item of classes){
			xmlClassDocs(item, this);
		}
		
	}
	
	closeAll(){
		$('#docsParent').find('input:checked').prop('checked', '');
	}
	
}

module.exports = DocumentationView;

function createlifrommemberdef($xml, id, emitter, type){

	var name = $xml.find('name').html();
	emitter.emit('add-link', {name, id}, type);
	
	var li = $('<li></li>');
	li.append($('<input></input>').prop('type', 'checkbox').addClass('docs').prop('id', id));
	li.append($('<label></label>').prop('for', id).addClass('docSectionHeader').addClass('sub').html(name));
	
	var content = $('<div></div>');
	
	// title
	content.append($('<h2></h2>').html( $xml.find('definition').html() + $xml.find('argsstring').html() ));
	
	// subtitle
	content.append($('<h3></h3>').html( $xml.find('briefdescription > para').html() || '' ));
	
	// main text
	$xml.find('detaileddescription > para').each(function(){
		if ($(this).find('parameterlist').length){
			content.append('</br><h3>Parameters:</h3>');
			var ul = $('<ul></ul>');
			$(this).find('parameteritem').each(function(){
				var li = $('<li></li>');
				li.append($('<strong></strong>').html( $(this).find('parametername').html()+': ' ));
				$(this).find('parameterdescription>para').each(function(){
					li.append($('<span></span>').html( $(this).html() || '' ));
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
	li.append($('<input></input>').prop('type', 'checkbox').addClass('docs').prop('id', id));
	li.append($('<label></label>').prop('for', id).addClass('docSectionHeader').addClass('sub').html(name));
	
	var content = $('<div></div>');
	
	// title
	//content.append($('<h2></h2>').html( $xml.find('definition').html() + $xml.find('argsstring').html() ));
	
	// subtitle
	content.append($('<h3></h3>').html( $xml.find('compounddef > briefdescription > para').html() || '' ));
	
	// main text
	$xml.find('compounddef > detaileddescription > para').each(function(){
		if ($(this).find('parameterlist').length){
			content.append('</br><h3>Parameters:</h3>');
			var ul = $('<ul></ul>');
			$(this).find('parameteritem').each(function(){
				var li = $('<li></li>');
				li.append($('<strong></strong>').html( $(this).find('parametername').html()+': ' ));
				$(this).find('parameterdescription>para').each(function(){
					li.append($('<span></span>').html( $(this).html() || '' ));
				});
				ul.append(li);
			});
			content.append(ul);
		} else {
			content.append($('<p></p>').html( $(this).html() || '' ));
		}
	});
	
	content.append('</br><a href="http://192.168.7.2/documentation/'+filename+'.html" target="_blank">Full Documentation</a>');

	li.append(content);
	return li;
}

function xmlClassDocs(classname, emitter){
	var filename = 'class' + classname;
	var parent = $('#'+classname+'Docs');
	$.ajax({
		type: "GET",
		url: "documentation_xml?file="+filename,
		dataType: "xml",
		success: function(xml){
			//console.log(xml);
			
			var counter = 0;
			createlifromxml($(xml), classname+counter, filename, emitter, 'typedef').appendTo(parent);
			emitter.emit('add-link', {name: classname, id: classname+counter}, 'header');
			
			counter += 1;
			$(xml).find('[kind="public-func"]>memberdef:not(:has(name:contains('+classname+')))').each(function(){
				//console.log($(this));
				var li = createlifrommemberdef($(this), classname+counter, emitter, classname);
				li.appendTo(parent);
				counter += 1;
			});
			
			// when tab is opened
			parent.siblings('input').on('change', function(){
				console.log(classname);
			});

			$.ajax({
				type: "GET",
				url: "documentation_xml?file="+classname+"_8h",
				dataType: "xml",
				success: function(xml){
					//console.log(xml);
					var includes = $(xml).find('includedby');
					if (includes.length){
						var content = $('#'+classname+'0').siblings('div');
						content.append($('<p></p>').html('Examples featuring this class:'));
						includes.each(function(){
							var include = $(this).html();
							if (include && include.split && include.split('/')[0] === 'examples'){
								var link = $('<a></a>').html(include.split('/')[2]);
								link.on('click', () => emitter.emit('open-example', [include.split('/')[1], include.split('/')[2]].join('/')));
								content.append(link).append('</br>');
							}
						});
					}
				}
			});
		}
	});
}
