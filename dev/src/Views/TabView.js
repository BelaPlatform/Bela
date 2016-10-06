var View = require('./View');

// private variables
var _tabsOpen = false;

class TabView extends View {
	
	constructor(){
	
		super('tab');

		// open/close tabs 
		$('#flexit').on('click', () => {
			if (_tabsOpen){
				this.closeTabs();
			} else {				
				this.openTabs();
			}
		});

		$('.tab > label').on('click', (e) => {
			if (!_tabsOpen){
				if ($(e.currentTarget).prop('id') === 'tab-0' && $('[type=radio]:checked ~ label').prop('id') === 'tab-0')
					$('#file-explorer').parent().trigger('click');

				this.openTabs();
				e.stopPropagation();
			}
		});
		
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
				content: [{
					type:'row',
					content: [{
						type:'component',
						componentName: 'Editor',
					}]
				}, {
					type:'component',
					componentName: 'Console',
					height: 25
				}]
			}]
		});
		layout.registerComponent( 'Editor', function( container, componentState ){
			container.getElement().append($('#innerContent'));
		});
		layout.registerComponent( 'Console', function( container, componentState ){
			container.getElement().append($('#beaglert-console'));
		});
		
		layout.init();
		layout.on('initialised', () => this.emit('change') );
		layout.on('stateChanged', () => this.emit('change') );
		
		$(window).on('resize', () => {
			if (_tabsOpen){
				this.openTabs();
			} else {
				this.closeTabs();
			}
		});
		
		this.on('open-tab', (id) => $('#'+id).siblings('label').trigger('click') );
		this.on('toggle', () => {
			if (_tabsOpen) this.closeTabs();
			else this.openTabs();
		})
		
	}
	
	openTabs(){
		$('#editor').css('right', '500px');
		$('#top-line').css('margin-right', '500px');
		$('#right').css('left', window.innerWidth - 500 + 'px');
		_tabsOpen = true;
		this.emit('change');
		$('#tab-0').addClass('open');
		
		// fix pd patch
		$('#pd-svg-parent').css({
			'max-width'	: $('#editor').width()+'px',
			'max-height': $('#editor').height()+'px'
		});
	}

	closeTabs(){
		$('#editor').css('right', '60px');
		$('#top-line').css('margin-right', '60px');
		$('#right').css('left', window.innerWidth - 60 + 'px');
		_tabsOpen = false;
		this.emit('change');
		$('#tab-0').removeClass('open');
		
		// fix pd patch
		$('#pd-svg-parent').css({
			'max-width'	: $('#editor').width()+'px',
			'max-height': $('#editor').height()+'px'
		});
		
	}
	
	getOpenTab(){
		if (!_tabsOpen) return false;
		return $('[type=radio]:checked ~ label').prop('for');
	}
	
}

module.exports = new TabView();