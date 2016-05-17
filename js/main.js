var background = chrome.extension.getBackgroundPage(),
	tabImages = background.tabImages,
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

	var tabGroup = new background.TabGroup();
	tabGroup.active = true;
	tabGroup.position = {
		top: top,
		left: left
	};
	background.tabGroups.push(tabGroup);
	activeTabGroup = tabGroup.id;

	buildTabGroup(tabGroup);
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
$tabgroups.on('sortstop', '.tabs', function(e, ui) {
	var width = ui.item[0].style.width;
	ui.item.removeAttr('style').css('width', width);
});

// Switch to tab on click and close Tab Groups
$tabgroups.on('click', '.tab', function() {
	// Check if opening tab in current tab group
	var tabGroupId = parseInt($(this).parents('.tabgroup').attr('id'));
	if(tabGroupId === background.activeTabGroup) {
		// chrome.tabs.update(parseInt($(this).attr('id')), {'active': true});
		// chrome.tabs.getCurrent(function(tab) {
		// 	chrome.tabs.remove(tab.id);
		// });
	}
	else {
		// background.openTabGroup(tabGroupId);
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
		.append('<div class="name">' + tabGroup.name + '</div>')
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
	var $tabs = $group.find('.tabs').removeClass('collapse'),
		$tab  = $group.find('.tab'),
		tabMinSize = 100;

	var tabsBottom = $tabs.offset().top + $tabs.outerHeight(),
		groupBottom = $group.offset().top + $group.outerHeight();

	// Calculate how many tabs should fit in row
	var tabsAcross = 1,
		tabWidth = null;

	// Check if this number allows vertical fit
	var fitsVertically = false;
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
				// Check if width divided by one more tab across is bigger than tabMinSize
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
			tabWidth = tabWidth || Math.floor($tabs.width() / tabsAcross);
			tabsHeight = numberOfRows * tabWidth * 0.8 + 10;

			if($tabs.offset().top + tabsHeight <= groupBottom) {
				fitsVertically = true;
			}
			else {
				if(tabWidth - 1 >= tabMinSize) {
					tabWidth -= 1;
				}
				else {
					fitsVertically = true;
				}
			}
		}
	}

	$tab.css('width', tabWidth ? tabWidth: 100/tabsAcross + '%');
}
