var View = require('./View');

var menuOpened = false;
var tabs = {};

class TabView extends View {

	constructor(){

		super('tab');

		// golden layout
		var layout = new GoldenLayout({
			settings:{
				hasHeaders: false,
				constrainDragToContainer: true,
				reorderEnabled: false,
				selectionEnabled: false,
				popoutWholeStack: false,
				blockedPopoutsThrowError: true,
				closePopoutsOnUnload: true,
				showPopoutIcon: false,
				showMaximiseIcon: false,
				showCloseIcon: false
			},
			dimensions: {
				borderWidth: 5,
				minItemHeight: 10,
				minItemWidth: 10,
				headerHeight: 20,
				dragProxyWidth: 300,
				dragProxyHeight: 200
			},
			labels: {
				close: 'close',
				maximise: 'maximise',
				minimise: 'minimise',
				popout: 'open in new window'
			},
      content: [{
        type: 'column',
        content: [
        	{
            type:'component',
            componentName: 'Editor'
        	},
          {
            type:'component',
            componentName: 'Console',
            height: 25
         }]
      }]
		});
		layout.registerComponent( 'Editor', function( container, componentState ){
			container.getElement().append($('[data-upper]'));
		});
    layout.registerComponent('Console', function( container, componentState ){
      container.getElement().append($('[data-console]'));
    });

		layout.init();
		layout.on('initialised', () => this.emit('change') );
		layout.on('stateChanged', () => this.emit('change') );

    this.on('toggle', this.toggle);
		this.on('boardString', this._boardString);
    this.editor = ace.edit('editor');
    var editor = this.editor;
    $('[data-tab-open]').on('click', function() {
      if ($('[data-tabs]').hasClass('tabs-open')) {
        setTimeout(
          function() {
            $('[data-editor]').addClass('tabs-open');
            editor.resize();
          },
        750);
      } else {
        $('[data-editor]').removeClass('tabs-open');
        setTimeout(
          function() {
            editor.resize();
          },
        500);
      }
    });

    $('[data-tab-open]').on('click', () => this.toggle(event.type, 'tab-control', $('[data-tab-for].active').data('tab-for')) );
    $('[data-tab-for]').on('click', () => this.toggle(event.type, 'tab-link', event.srcElement.dataset.tabFor) );
	}

  toggle(event, origin, target) {

    tabs = {event, origin, target};

    if (tabs.event == undefined) {
      return;
    }
    tabs.active = $('[data-tab-for].active').data('tabFor');
    if (tabs.target == undefined && tabs.active == null) {
      tabs.target = 'explorer';
    }

    function openTabs() {
      if (tabs.origin == 'tab-control') {
        if (menuOpened == false) {
          $('[data-tabs]').addClass('tabs-open');
          $('[data-tab-open] span').addClass('rot');
          menuOpened = true;
        } else {
          $('[data-tabs]').removeClass('tabs-open');
          $('[data-tab-open] span').removeClass('rot');
          menuOpened = false;
          // reset x offset position but only after the tabbed menu has closed.
          setTimeout( function(){
            // $('[data-tab-content]').offset().top;
            $('[data-tab-content]').scrollTop($('#tab-content-area').offset().top);
          }, 500);
        }
      }
      if (tabs.origin == 'tab-link' && menuOpened == false) {
        $('[data-tabs]').addClass('tabs-open');
        $('[data-tab-open] span').addClass('rot');
        menuOpened = true;
      }
      matchTabFor();
    }

    function matchTabFor() {
      $('[data-tab-for]').each(function(){
        var tabFor = $(this).data('tab-for');
        if (tabs.origin == 'tab-link') {
          $(this).removeClass('active');
        }
        if (tabFor === tabs.target) {
          $(this).addClass('active');
          matchTabForAndTab();
        } else {
        }
      });
    }

    function matchTabForAndTab() {
      $('[data-tab]').each(function(){
        if (tabs.active != tabs.target) {
          var tab = $(this).data('tab');
          $(this).hide();
          if (tab === tabs.target) {
            // reset the x offset position of the tab content if it's changing
            // $('[data-tab-content]').offset().top;
            $('[data-tab-content]').scrollTop($('#tab-content-area').offset().top);
            $(this).fadeIn();
          }
        }
      });
    }

    openTabs();
  }

	_boardString(data){
		var boardString;
    var rootDir = "belaDiagram/";
		if(data && data.trim)
			boardString = data.trim();
		else
			return

    $('[data-pin-diagram]').prop('data', rootDir + 'diagram.html?' + boardString);
    console.log(boardString);
	}

}

module.exports = new TabView();
