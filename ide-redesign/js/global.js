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
	width : $(window).width(),
	height : $(window).height()
}

var width = $docInfo.width;
var height = $docInfo.height;

var $currentMousePos = { 
	x: 0, 
	y: 0 
};

function getMousePosition() {
    $(document).mousemove(function(event) {
        $currentMousePos.x = event.pageX;
        $currentMousePos.y = event.pageY;
	})
};

// Drag toolbar up and down.
// 1. Have something to click on that we know is what we want to detect as dragging.

var $dragObject = $( '.dragButton' );
var areWeDragging = false;
var dragEventStarted = false;



$dragObject.mousedown(function() {
	$(this).addClass('dragActive');
	dragEventStarted = true;
	areWeDragging = false;
	console.log("CLICK, wait for drag");

}).
      mousemove(function() {
  areWeDragging = true;
  if(areWeDragging && dragEventStarted) {
    getMousePosition();
    console.log($currentMousePos.x, $currentMousePos.y);
    $('.lower').css('height', $currentMousePos.y)
      
    ;
    }
  }).
      mouseup(function() {
  $(this).removeClass('dragActive');
  areWeDragging = false;
  dragEventStarted = false;
  if (!areWeDragging) {
    console.log("DRAGDONE");
  }
});

// TOOLBAR FUNCTION LABELS ////////////////////////////////////////


var startStopButtons = $('div.start-stop').find('span');
$(startStopButtons)
	.mouseover(function() {
		var data = $(this).attr('data');
		$('div.tool-text.st-st').text(data);
	})
	.mouseout(function() {
		$('div.tool-text.st-st').text('');	
	});

var toolbarTools = $('div.toolbar-functions').find('span');
$(toolbarTools)
	.mouseover(function() {
		var data = $(this).attr('data');
		$('div.tool-text.other').text(data);
	})
	.mouseout(function() {
		$('div.tool-text.other').text('');	
	});

function inputNumber(el) {

    var min = el.attr('min') || false;
    var max = el.attr('max') || false;
    // Get the second class, which is the identifier:
    var className = el.attr('class').split(' ')[0];
    console.log(className);

    var els = {};

    els.dec = el.prev();
    els.inc = el.next();

    el.each(function() {
      init($(this));
    });

    function init(el) {

      els.dec.on('click', decrement);
      els.inc.on('click', increment);

      function decrement() {
        var value = el[0].value;
        value--;
        if(!min || value >= min) {
          el[0].value = value;
        }
      }

      function increment() {
        var value = el[0].value;
        value++;
        if(!max || value <= max) {
          el[0].value = value++;
        }
      }
  }
};

$('inputNumber').on('click', function() {
	inputNumber($(this));
});




	function openTabs() {
		$( '.tabs' ).toggleClass('tabs-open');
		if ($('.tabs').hasClass('tabs-open')) {
			$('#open-tab span').toggleClass('rot');
		} else {
			$('#open-tab span').toggleClass('rot');
		}
		
	}

		// Open the goddamn tabs:
	 	$('#open-tab').click(function() {
			// If none of the tabs are active:
			var len = $('#tab-menu .active').length;
			if(len < 1 ){
				// Then show the project explorer.
				$('.explorer').addClass('active');
				$(".tab-info").hide();
				$('#expl').fadeIn();
			}
	 		openTabs();
	 	});

	 	// Making the tab labels active/inactive:
		$('#tab-menu li:not(#open-tab)').click(function() {
			//  First remove class "active" from currently active tab
			$('#tab-menu li:not(#open-tab)').removeClass('active');
			$(this).addClass('active');
			//  Hide all tab content
			$(".tab-info").hide();
			var selected_tab = $(this).find("a").attr("href");
			$('div '+selected_tab).fadeIn();
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



});



