var View = require('./View');

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
    // this.on('linkClicked', () => console.log('link click'));
    this.$elements.on('click', (e) => this.linkClicked($(e.currentTarget), e));
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
