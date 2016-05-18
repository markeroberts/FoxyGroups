var tabGroups = [],
	activeTabGroupId = null,
	activeTabId = null,
	extensionPageId = null,
	activeListeners = true;

// Create new tab group
var tabGroup = new TabGroup();
tabGroup.active = true;
tabGroups.push(tabGroup);
activeTabGroupId = tabGroup.id;
updateActiveTabGroup();

// Set current tab as active
chrome.tabs.query({active: true}, function(tabs) {
	activeTabId = tabs[0].id;
});

// Extension button clicked
chrome.browserAction.onClicked.addListener(function() {
	activeListeners = false;

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
					activeListeners = true;
				});
			}
		});
	}
	// Otherwise refresh current tab image and open extension page
	else {
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
	if(activeListeners) {
		if(activeInfo.tabId !== extensionPageId) {
			activeTabId = activeInfo.tabId;
		}
		captureActiveTab();
	}
});
chrome.webNavigation.onCompleted.addListener(function(details) {
	if(activeListeners) {
		captureActiveTab();
	}
});

// If extension page is open and tabs are modified, update tab group and redraw
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
	if(extensionPageId) {
		updateActiveTabGroup();
	}
});
chrome.tabs.onRemoved.addListener(function(tabId) {
	// Clear extension page id if closed
	if(tabId === extensionPageId) {
		extensionPageId = null;
	}
	if(extensionPageId) {
		updateActiveTabGroup();
	}
});
chrome.tabs.onMoved.addListener(function(tabId) {
	if(extensionPageId && tabId !== extensionPageId) {
		updateActiveTabGroup();
	}
});

// Remove tab image when tab is closed
// chrome.tabs.onRemoved.addListener(function(tabId) {
// 	if(tabId === extensionPageId) {
// 		extensionPageId = null;
// 	}
// 	// delete tabImages[tabId];
// });

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
		url: 'chrome://newtab/',
		favicon: null
	}];
	this.images = {};
}

// Find tab group by id
function getTabGroup(id) {
	return tabGroups.find(function(tabGroup) {
		return tabGroup.id === parseInt(id);
	});
}

// Updates tabs in active tab group with currently open tabs
function updateActiveTabGroup() {
	// Get all open tabs
	chrome.tabs.query({}, function(tabs) {
		var activeTabGroup = getTabGroup(activeTabGroupId);

		// Put into array and ignore extension page
		var tabObjects = [];
		tabs.forEach(function(tab) {
			if(tab.id !== extensionPageId) {
				var tabObject = {
					id: tab.id,
					title: tab.title,
					url: tab.url,
					favicon: tab.favIconUrl
				};
				tabObjects.push(tabObject);
			}
		});
		activeTabGroup.tabs = tabObjects;

		redrawTabGroups();
	});
}

function openTabGroup(tabGroupId) {
	// Close all tabs except Tab Groups
	// Get list of tabIds in current group to close
	var tabIds = getTabGroup(activeTabGroupId).tabs.map(function(tab) {
		return tab.id;
	});

	chrome.tabs.remove(tabIds, function() {
		// Now open each tab in new tab group
		getTabGroup(tabGroupId).tabs.forEach(function(tab) {
			chrome.tabs.create({url: tab.url});
		});
		activeTabGroupId = tabGroupId;
	});
}

// Capture image of active tab and save to active tab group
function captureActiveTab(callback) {
	// Check tab is still active
	chrome.tabs.get(activeTabId, function(tab) {
		if(tab.active) {
			chrome.tabs.captureVisibleTab(tab.windowId, {format: 'jpeg', 'quality': 1}, function(dataUrl) {
				// Randomly fails to capture tab, try again
				if(chrome.runtime.lastError || !dataUrl){
					setTimeout(function() {
						captureActiveTab();
					}, 100);
				}
				else {
					// Save image to images object of tab group
					getTabGroup(activeTabGroupId).images[activeTabId] = dataUrl;
					redrawTabGroups();


					if(callback) callback();
				}
			});
		}
		else {
			if(callback) callback();
		}
	});
}

function redrawTabGroups() {
	chrome.runtime.sendMessage(null, 'redrawTabGroups');
}

function moveTab(tabGroupId, tabId, tabIndex) {
	if(tabGroupId === activeTabGroupId) {
		chrome.tabs.move(tabId, {index: tabIndex});
	}
}