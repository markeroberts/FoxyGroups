var background = chrome.extension.getBackgroundPage(),
	$tabgroups = $('#tabgroups');

// Build each tab group on page load
$(document).ready(function() {
	redrawTabGroups();
});

// Create new empty tabgroup at double click location
$tabgroups.dblclick(function(e) {
	// Calculate new tab group position to avoid overlap with page boundary
	var top = e.pageY,
		left = e.pageX,
		windowWidth = $(window).width(),
		windowHeight = $(window).height();
	if(top < 10) top = 10;
	else if(top + 210 > windowHeight) top = windowHeight - 210;
	if(left < 10) left = 10;
	else if(left + 210 > windowWidth) left = windowWidth - 210;

	// Create new tab group and redraw
	var tabGroup = new background.TabGroup();
	tabGroup.position = {
		top: top,
		left: left
	};
	background.tabGroups.push(tabGroup);
	redrawTabGroups();

	// Set tab in new group to active
	$('.tab.active').removeClass('active');
	$('#' + tabGroup.id + ' .tab').addClass('active');

	// Switch to new tab group
	background.openTabGroup(tabGroup.id);
});

// Switch to tab on click
$tabgroups.on('click', '.tab', function() {
	var $this      = $(this),
		tabId      = parseInt($this.attr('id')),
		tabGroupId = parseInt($this.parents('.tabgroup').attr('id'));

	// Set clicked tab to active
	$('.tab.active').removeClass('active');
	$this.addClass('active');

	// If tab has id and is in current group, switch to it and close extension page
	if(tabId && tabGroupId === background.activeTabGroupId) {
		chrome.tabs.update(tabId, {'active': true});
		close();
	}
	// Otherwise switch to group and activate tab by index as it might not have an id
	else {
		background.openTabGroup(tabGroupId, $this.index());
	}
});

$tabgroups.on('resize', '.tabgroup', function(e, ui) {
	sizeTabsInGroup(ui.element);
});
// Save tabgroup position on dragstop
$tabgroups.on('dragstop', '.tabgroup', function(e, ui) {
	background.getTabGroup(ui.helper.attr('id')).position = ui.position;
});
// Save tabgroup size on resizestop
$tabgroups.on('resizestop', '.tabgroup', function(e, ui) {
	background.getTabGroup(ui.element.attr('id')).size = ui.size;
});

// Ensure tab sorting placeholder is same size as tabs to misalignment
$tabgroups.on('sortstart', '.tabs', function(e, ui) {
	ui.placeholder.width(ui.placeholder.siblings('.tab')[0].getBoundingClientRect().width);
	ui.placeholder.height(ui.placeholder.siblings('.tab')[0].getBoundingClientRect().height);
});
// Restore tab width after sorting and remove other inline styles
$tabgroups.on('sortstop', '.tabs', function(e, ui) {
	var width = ui.item[0].style.width;
	ui.item.removeAttr('style').css('width', width);
});
// Move tabs in group when sorted
$tabgroups.on('sortupdate', '.tabs', function(e, ui) {
	var tabGroupId = parseInt(ui.item.parents('.tabgroup').attr('id')),
		tabId      = parseInt(ui.item.attr('id')),
		tabIndex   = ui.item.index();
	background.moveTab(tabGroupId, tabId, tabIndex);
});

// Rename tab groups
$tabgroups.on({
	change: function() {
		var $this = $(this),
			name = $this.val();

		if(name !== '') {
			$this.parent().addClass('has-name');
		}
		else {
			$this.parent().removeClass('has-name');
		}

		var tabGroupId = parseInt($(this).parents('.tabgroup').attr('id'));
		background.renameTabGroup(tabGroupId, name);
	},
	// Select all text on click
	click: function() {
		$(this).select();
	},
	// Unfocus on enter
	keydown: function(e) {
		if(e.which == 13) {
			$(this).blur();
		}
	}
}, '.name input');

// Redraws tab on message from background page
chrome.runtime.onMessage.addListener(function(message) {
	if(message === 'redrawTabGroups') {
		redrawTabGroups();
	}
});

// Redraws all tab groups
function redrawTabGroups() {
	// Empty tabgroups div and rebuild
	$tabgroups.empty();
	background.tabGroups.forEach(function(tabGroup) {
		buildTabGroup(tabGroup);
	});
}

// Builds tab group into div
function buildTabGroup(tabGroup) {
	// Build each tab and add into .tabs div
	var $tabs = $('<div>').addClass('tabs');

	tabGroup.tabs.forEach(function(tab) {
		// Replace chrome page favicons with local images
		if(tab.favicon && tab.favicon.startsWith('chrome://theme/')) {
			tab.favicon = tab.favicon.replace('chrome://theme/', 'img/') + '.png';
		}

		// Get image url for background-image if saved
		var image = '';
		if(tabGroup.images[tab.id]) {
			image = 'url(' + tabGroup.images[tab.id] + ')';
		}
		$tabs.append($('<div>').addClass(tab.id === background.activeTabId ? 'tab active' : 'tab')
				.attr('id', tab.id)
				.append($('<div>').addClass('content')
					.append($('<div>').addClass('favicon')
						.append($('<img>').attr('src', tab.favicon))
					)
					.append($('<div>').addClass('image')
						.append($('<div>').css('background-image', image))
					)
					.append($('<div>').addClass('title').text(tab.title))
				)
				.append($('<div>').addClass('tooltip')
					.append($('<span>').text(tab.title))
					.append($('<span>').text(tab.url))
				)
		);
	});

	// Build tab group
	var group = $('<div>').addClass('tabgroup')
		.attr('id', tabGroup.id)
		.css('top', tabGroup.position.top).css('left', tabGroup.position.left)
		.css('width', tabGroup.size.width).css('height', tabGroup.size.height)
		.append($('<div>').addClass(tabGroup.name ? 'name has-name' : 'name')
			.append('<i class="fa fa-pencil" aria-hidden="true"></i>')
			.append(
				$('<input>')
					.attr('type', 'text')
					.attr('placeholder', 'Name this tab group')
					.attr('value', tabGroup.name ? tabGroup.name : '')
					// type="text" placeholder="Name this tab group">')
			)
		)
		.append(
			$tabs.sortable({
				cursor: 'move',
				connectWith: '.tabs',
				handle: '.content',
				placeholder: 'tab',
				containment: '#tabgroups'
			})
		)
		.appendTo($tabgroups)
		.draggable({
			containment: '#tabgroups'
		})
		.resizable({
			handles: 'se'
		});

	sizeTabsInGroup(group);
}

function sizeTabsInGroup($group) {
	var $tabs          = $group.find('.tabs').removeClass('collapse'),
		$tab           = $group.find('.tab'),
		groupBottom    = $group.offset().top + $group.outerHeight(),
		tabMinSize     = 100,
		tabsAcross     = 1,
		tabWidth       = null,
		fitsVertically = false;

	// Check if this number allows vertical fit
	while(!fitsVertically) {
		var numberOfRows = Math.ceil($tab.length / tabsAcross),
			tabHeight = $tabs.width() / tabsAcross * 0.8,
			tabsHeight = numberOfRows * tabHeight;

		if(numberOfRows > 1) {
			// Compare bottom of tabs to bottom of group to check vertical fit
			if($tabs.offset().top + tabsHeight <= groupBottom) {
				fitsVertically = true;
			}
			// If it doesn't fit, check if one more tab would fit horizontally
			else {
				// Ensure tabs wouldn't be less than minimum size
				if($tabs.width() / (tabsAcross + 1) >= tabMinSize) {
					tabsAcross += 1;
				}
				else {
					$tabs.addClass('collapse');
					fitsVertically = true;
				}
			}
		}
		else {
			// Calculate by pixel width instead of percentage
			tabWidth = tabWidth || Math.floor($tabs.width() / tabsAcross);
			tabsHeight = numberOfRows * tabWidth * 0.8 + 10;

			if($tabs.offset().top + tabsHeight <= groupBottom) {
				fitsVertically = true;
			}
			else {
				// Keep shrinking tabs until fit
				tabWidth -= 1;
			}
		}
	}

	$tab.css('width', tabWidth ? tabWidth : 100/tabsAcross + '%');
}
