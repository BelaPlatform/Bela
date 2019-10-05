// Function to control showing/hiding of tab content.

// MAKING SENSE OF BELA.JS

// Variable naming conventions: Know when a var is an object.
// ----------------------------------------------------------------------
// Variables in JS can often have lots of components, but there is no way of knowing this without
// tracing that var back to the point of delcaration. What a buttpain!

// To remedy this and make this code easier to decipher, all variables that have component parts
// are preceded by a $. Here's an example:

// var $tiger = {
//	species : "cat", 
//	weight: 165,
//	ferocity: 1
// };

// Now, when you see $tiger in the code, you know that this isn't just a unidimensional object, and 
// that it contains more information. 

// START IT
$( document ).ready( function () {
	// First, we need some global variables. Mainly the height and width of the whole window.

var $docInfo = {
	width : $(window).width();
	height : $(window).height();
}

var width = $docInfo.width;
var height = $docInfo.height;

// Drag toolbar up and down.
// 1. Have something to click on that we know is what we want to detect as dragging.

var $dragObject = $( '.dragButton' );

$dragObject.on('click', function() {
	console.log('I AM BUTTON');
});


	function openTabs() {
		$( '.tabs' ).toggleClass('tabs-open');
	}

		// Open the goddamn tabs:
	 	$('#open-tab').click(function() {
	 		openTabs();
			// If none of the tabs are active:
			var len = $('#tab-menu .active').length;
			if(len < 1 ){
				// Then show the project explorer.
				$('.expl').addClass('active');
				$('#expl').find('a').attr('href').fade();
			}
	 	});

	 	// Making the tab labels active/inactive:
		$('#tab-menu li:not(#open-tab)').click(function() {
			//  First remove class "active" from currently active tab
			$('#tab-menu li:not(#open-tab)').removeClass('active');
			$(this).addClass('active');
			//  Hide all tab content
			$(".tab-info").hide();
			var selected_tab = $(this).find("a").attr("href");
			$(selected_tab).fadeIn();
			if ($('.tabs').hasClass('tabs-open')) {
				return false;
			} else {
				openTabs();
			}

			//  At the end, we add return false so that the click on the link is not executed
			return false;
		});


	 	if ($('.dragButton').hasClass('dragActive')) {
	 		console.log('barp');
	 	}
	 	
	 	// DRAG BUTTON
	 	$('.dragButton').on('mousedown', function() {
	 		$(this).addClass('dragActive');
	 	
	 	});
	 	 	$('.dragButton').on('mouseup', function() {
	 		$(this).removeClass('dragActive');
	 	
	 	});


});

