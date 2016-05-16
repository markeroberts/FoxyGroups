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
		background.openTabGroup(tabGroupId);
	}
});

// Redraws all tab groups
function redrawTabGroups() {
	// Refresh active tab group with currently open tabs
	// background.getOpenTabs(function(tabs) {
	// 	background.getTabGroup(background.activeTabGroup).tabs = tabs;
	// });

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

		$tabs.append($('<div>').addClass(tab.id === background.activeTabId ? 'tab active' : 'tab')
				.attr('id', tab.id)
				.append($('<div>').addClass('content')
					.append($('<div>').addClass('favicon')
						.append($('<img>').attr('src', tab.favicon))
					)
					.append($('<div>').addClass('image')
						.append(tabGroup.images[tab.id] ? $('<img>').attr('src', tabGroup.images[tab.id]) : '')
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
	var $tabs = $group.find('.tabs'),
		$tab  = $group.find('.tab'),
		tabMinSize = 100;

	var tabsBottom = $tabs.offset().top + $tabs.outerHeight(),
		groupBottom = $group.offset().top + $group.outerHeight();

	// Calculate how many tabs should fit in row
	var tabsAcross = Math.floor($tabs.width() / tabMinSize);

	// Check if this number allows vertical fit
	var fitsVertically = false;
	while(!fitsVertically) {
		var numberOfRows = Math.ceil($tab.length / tabsAcross),
			tabsHeight   = numberOfRows * ($tabs.width()/tabsAcross) * 0.8;
		if($tabs.offset().top + tabsHeight + 10 <= groupBottom) {
			fitsVertically = true;
		}
		else {
			tabsAcross += 1;
		}
	}

	$tab.css('width', 100/tabsAcross + '%');
}
