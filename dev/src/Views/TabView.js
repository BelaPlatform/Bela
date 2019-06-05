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
            $(this).fadeIn();
          }
        }
      });
    }

    openTabs();
  }

	_boardString(data){
		var boardString;
		if(data && data.trim)
			boardString = data.trim();
		else
			return

		if (boardString === 'BelaMini'){
			$('[data-pin-diagram]').prop('data', 'diagram_mini.html');
		}
		else if (boardString === 'CtagFace')
		{
			$('[data-pin-diagram]').prop('data', 'diagram_ctag_FACE.html');
		}
		else if (boardString === 'CtagBeast')
		{
			$('[data-pin-diagram]').prop('data', 'diagram_ctag_BEAST.html');
		}
		else if (boardString === 'CtagFaceBela')
		{
			$('[data-pin-diagram]').prop('data', 'diagram_ctag_BELA.html');
		}
		else if (boardString === 'CtagBeastBela')
		{
			$('[data-pin-diagram]').prop('data', 'diagram_ctag_BEAST_BELA.html');
		}
	}

}

module.exports = new TabView();
