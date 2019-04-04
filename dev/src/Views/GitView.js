'use strict';
var View = require('./View');
var popup = require('../popup');
var json = require('../site-text.json');

class GitView extends View{

	constructor(className, models, settings){
		super(className, models, settings);
		this.$form = $('[data-git-form]');
		this.$input = $('[data-git-input]');

		// git input events
		this.$form.on('submit', (e) => {
			e.preventDefault();
			this.emit('git-event', {
				func: 'command',
				command: this.$input.val()
			});
			this.$input.val('');
		});
	}

	buttonClicked($element, e){
		var func = $element.data().func;
		if (this[func]){
			this[func]();
			return;
		}
		var command = $element.data().command;
		this.emit('git-event', {func, command});
	}

	selectChanged($element, e){
		this.emit('git-event', {
			func: 'command',
			command: 'checkout ' + ($("option:selected", $element).data('hash') || $("option:selected", $element).val())
		});
	}

	commit(){

		// build the popup content
		popup.title(json.popups.commit.title);
		popup.subtitle(json.popups.commit.text);

		var form = [];
		form.push('<input type="text" placeholder="' + json.popups.commit.input + '">');
		form.push('</br >');
		form.push('<button type="submit" class="button popup confirm">' + json.popups.commit.button +'</button>');
		form.push('<button type="button" class="button popup cancel">Cancel</button>');

		popup.form.append(form.join('')).off('submit').on('submit', e => {
			e.preventDefault();
			this.emit('git-event', {func: 'command', command: 'commit -am "'+popup.find('input[type=text]').val()+'"'});
			popup.hide();
		});

		popup.find('.cancel').on('click', popup.hide );

		popup.show();

	}
	branch(){

		// build the popup content
		popup.title(json.popups.branch.title);
		popup.subtitle(json.popups.branch.text);

		var form = [];
		form.push('<input type="text" placeholder="' + json.popups.branch.input + '">');
		form.push('</br >');
		form.push('<button type="submit" class="button popup confirm">' + json.popups.branch.button + '</button>');
		form.push('<button type="button" class="button popup cancel">Cancel</button>');

		popup.form.append(form.join('')).off('submit').on('submit', e => {
			e.preventDefault();
			this.emit('git-event', {func: 'command', command: 'checkout -b '+popup.find('input[type=text]').val()});
			popup.hide();
		});

		popup.find('.cancel').on('click', popup.hide );

		popup.show();

	}

	discardChanges(){

		// build the popup content
		popup.title(json.popups.discard.title);
		popup.subtitle(json.popups.discard.text);

		var form = [];
		form.push('<button type="submit" class="button popup confirm">' + json.popups.discard.button + '</button>');
		form.push('<button type="button" class="button popup cancel">Cancel</button>');

		popup.form.append(form.join('')).off('submit').on('submit', e => {
			e.preventDefault();
			this.emit('git-event', {func: 'command', command: 'checkout -- .'});
			popup.hide();
		});

		popup.find('.cancel').on('click', popup.hide );

		popup.show();

		popup.find('.confirm').trigger('focus');

	}

	_repoExists(exists){
		if (exists){
			$('[data-git-repo]').css('display', 'block');
			$('[data-git-no-repo]').css('display', 'none');
		} else {
			$('[data-git-repo]').css('display', 'none');
			$('[data-git-no-repo]').css('display', 'block');
		}
	}
	__commits(commits, git){

		var commits = commits.split('\n');
		var current = git.currentCommit.trim();
		var branches = git.branches.split('\n');

		// fill commits menu
		// var $commits = $('#commits');
    var $commits = $('[data-git-commits]');
		$commits.empty();

		var commit, hash, opt;
		for (var i=0; i<commits.length; i++){
			commit = commits[i].split(' ');
			if (commit.length > 2){
				hash = commit.pop().trim();
				opt = $('<option></option>').html(commit.join(' ')).data('hash', hash).appendTo($commits);
				if (hash === current){
					$(opt).attr('selected', 'selected');
				}
			} else {
				//$('<option></option>').html(commit).appendTo($commits);
				if (!(commit.length == 1 && commit[0] === '')) console.log('skipped commit', commit);
			}
		}

		// fill branches menu
		// var $branches = $('#branches');
    var $branches = $('[data-git-branches]');
		$branches.empty();

		for (var i=0; i<branches.length; i++){
			if (branches[i]){
				opt = $('<option></option>').html(branches[i]).appendTo($branches);
				if (branches[i][0] === '*'){
					$(opt).attr('selected', 'selected');
				}
			}
		}
	}
	__stdout(text, git){
		this.emit('console', text);
	}
	__stderr(text){
		this.emit('console', text);
	}

}

module.exports = GitView;
