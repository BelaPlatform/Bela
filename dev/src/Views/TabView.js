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

		this.on('boardString', this._boardString);

	}

	_boardString(data){
		var boardString;
		if(data && data.trim)
			boardString = data.trim();
		else
			return

		if (boardString === 'BelaMini'){
			$('#pin_diagram_object').prop('data', 'diagram_mini.html');
		}
		else if (boardString === 'CtagFace')
		{
			$('#pin_diagram_object').prop('data', 'diagram_ctag_FACE.html');
		}
		else if (boardString === 'CtagBeast')
		{
			$('#pin_diagram_object').prop('data', 'diagram_ctag_BEAST.html');
		}
		else if (boardString === 'CtagFaceBela')
		{
			$('#pin_diagram_object').prop('data', 'diagram_ctag_BELA.html');
		}
		else if (boardString === 'CtagBeastBela')
		{
			$('#pin_diagram_object').prop('data', 'diagram_ctag_BEAST_BELA.html');
		}
	}

}

module.exports = new TabView();
