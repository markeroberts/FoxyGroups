var tabGroups = [],
	activeTabGroup = null,
	activeTabId = null,
	extensionPageId = null,
	activeListeners = true;

// Create new tab group of open tabs when extension loaded
chrome.tabs.query({}, function(tabs) {
	var tabObjects = tabs.map(function(tab) {
		return {
			id: tab.id,
			title: tab.title,
			url: tab.url,
			favicon: tab.favIconUrl,
			image: null
		};
	});

	var tabGroup = new TabGroup();
	tabGroup.active = true;
	tabGroup.tabs = tabObjects;
	tabGroups.push(tabGroup);
	activeTabGroup = tabGroup.id;
});

// Extension button clicked
chrome.browserAction.onClicked.addListener(function() {
	// If extension page is already open
	if(extensionPageId) {
		chrome.tabs.get(extensionPageId, function(tab) {
			// Close extension page if also active
			if(tab.active) {
				chrome.tabs.remove(extensionPageId);
			}
			// Otherwise refresh current tab image and switch to page
			else {
				captureActiveTab(function() {
					chrome.tabs.update(extensionPageId, {active: true});
				});
			}
		});
	}
	// Otherwise refresh current tab image and open extension page
	else {
		activeListeners = false;
		captureActiveTab(function() {
			chrome.tabs.create({'url': chrome.extension.getURL('foxygroups.html')}, function(tab) {
				extensionPageId = tab.id;
				activeListeners = true;
			});
		});
	}

});

// Get tab image when tab is made active or finished loading
chrome.tabs.onActivated.addListener(function(activeInfo) {
	if(activeListeners) captureActiveTab();
});
chrome.webNavigation.onCompleted.addListener(function(details) {
	if(activeListeners) captureActiveTab();
});

// Remove tab image when tab is closed
chrome.tabs.onRemoved.addListener(function(tabId) {
	if(tabId === extensionPageId) {
		extensionPageId = null;
	}
	console.log(extensionPageId);
	// delete tabImages[tabId];
});

function TabGroup() {
	this.id = (new Date()).getTime();
	this.name = '';
	this.active = false;
	this.position = {
		top: 10,
		left: 10
	};
	this.size = {
		width: 200,
		height: 200
	};
	this.tabs = [{
		id: null,
		title: 'New Tab',
		url:'chrome://newtab/',
		image: null
	}];
}

// function createTabGroup(tabs) {
// 	var tabGroup = new TabGroup(tabs);
// 	tabGroups.push(tabGroup);
// 	return tabGroup;
// }

function getTabGroup(id) {
	return tabGroups.find(function(tabGroup) {
		return tabGroup.id === parseInt(id);
	});
}

function openTabGroup(tabGroupId) {
	// Close all tabs except Tab Groups
	// Get list of tabIds in current group to close
	var tabIds = getTabGroup(activeTabGroup).tabs.map(function(tab) {
		return tab.id;
	});

	chrome.tabs.remove(tabIds, function() {
		// Now open each tab in new tab group
		console.log(getTabGroup(tabGroupId).tabs);
		getTabGroup(tabGroupId).tabs.forEach(function(tab) {
			console.log('CREATE: ' + tab.url);
			chrome.tabs.create({url: tab.url});
		});
		activeTabGroup = tabGroupId;
	});
}

// Capture image of tab by given id and save to active tab group
function captureActiveTab(callback) {
	chrome.tabs.query({active: true}, function(tabs) {
		activeTabId = tabs[0].id;

		// Check tab is still active
		chrome.tabs.get(activeTabId, function(tab) {
			if(tab.active) {
				chrome.tabs.captureVisibleTab(null, {format: 'jpeg', 'quality': 1}, function(dataUrl) {
					// Randomly fails to capture tab, try again
					if(chrome.runtime.lastError || !dataUrl){
						setTimeout(function() {
							captureActiveTab(activeTabId);
						}, 100);
					}
					else {
						// Find tab to save image to
						var tab = getTabGroup(activeTabGroup).tabs.find(function(tab) {
							return tab.id === activeTabId;
						});
						tab.image = dataUrl;

						if(callback) callback();
					}
				});
			}
		});
	});
}