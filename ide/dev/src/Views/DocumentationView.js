var View = require('./View');

var apiFuncs = ['setup', 'render', 'cleanup', 'Bela_createAuxiliaryTask', 'Bela_scheduleAuxiliaryTask'];

class DocumentationView extends View {
	
	constructor(className, models){
		super(className, models);
		
		this.on('init', this.init);
	}
	
	init(){
		
		// The API
		$.ajax({
			type: "GET",
			url: "documentation_xml?file=Bela_8h",
			dataType: "xml",
			success: function(xml){
				//console.log(xml);
				var counter = 0;
				for (let item of apiFuncs){
					var li = createlifrommemberdef($(xml).find('memberdef:has(name:contains('+item+'))'), 'APIDocs'+counter);
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
				$(xml).find('memberdef').each(function(){
					var li = createlifrommemberdef($(this), 'contextDocs'+counter);
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
				$(xml).find('memberdef').each(function(){
					var li = createlifrommemberdef($(this), 'utilityDocs'+counter);
					li.appendTo($('#utilityDocs'));
					counter += 1;
				});
			}
		});
		
		// Scope
		$.ajax({
			type: "GET",
			url: "documentation_xml?file=classScope",
			dataType: "xml",
			success: function(xml){
				//console.log(xml);
				var counter = 0;
				$(xml).find('[kind="public-func"]>memberdef:not(:has(name:contains(Scope)))').each(function(){
					//console.log($(this));
					var li = createlifrommemberdef($(this), 'scopeDocs'+counter);
					li.appendTo($('#scopeDocs'));
					counter += 1;
				});
			}
		});
		
	}
	
}

module.exports = DocumentationView;

function createlifrommemberdef($xml, id){
	var li = $('<li></li>');
	li.append($('<input></input>').prop('type', 'checkbox').addClass('docs').prop('id', id));
	li.append($('<label></label>').prop('for', id).addClass('docSectionHeader').addClass('sub').html($xml.find('name').html()));
	
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