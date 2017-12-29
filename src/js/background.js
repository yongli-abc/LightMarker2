/*
 * Background.js as a controller page.
 * Other UI is implemented by dumb view pages.
 */

const g_bookmarksBarId = "1"; // id for the bookmarks bar folder.

// Provide scoped namespaces.
window.LightMarker = {};
window.LightMarker.Util = {};

window.LightMarker.Shared = {};
window.LightMarker.Shared.g_popupState = {}; // shared across popup & background.js

// Shortcuts for names to be used within this file.
const Util = window.LightMarker.Util;
let g_popupState = window.LightMarker.Shared.g_popupState;

/*
 * A utility function for setting the saved icon for a particular tab.
 */
window.LightMarker.Util.setSavedIcon = function(tabId) {
    const path = {
        "16": "images/icons16/png/002-shapes-1.png",
        "24": "images/icons24/png/002-shapes-1.png",
        "32": "images/icons32/png/002-shapes-1.png"
    };

    chrome.browserAction.setIcon({
        path: path,
        tabId: tabId
    });
};

/*
 * A utility function for setting the unsaved icon for a particular tab.
 */
window.LightMarker.Util.setUnsavedIcon = function(tabId) {
    const path = {
        "16": "images/icons16/png/001-shapes.png",
        "24": "images/icons24/png/001-shapes.png",
        "32": "images/icons32/png/001-shapes.png"
    };

    chrome.browserAction.setIcon({
        path: path,
        tabId: tabId
    });
};

/*
 * A utility function to clean page nodes inside the bookmarkTree.
 *
 * @param {Object[]} An array of bookmarkTree nodes, that may contain page node.
 *
 * @return {Object[]} BookmarkTree nodes only containing folder nodes.
 */
window.LightMarker.Util.prunePageNodes = function(bookmarkTree) {
    function isFolderNode(node) {
        return node.hasOwnProperty("children");
    }

    let toSplice = [];

    for (let i = 0; i < bookmarkTree.length; ++i) {
        if (isFolderNode(bookmarkTree[i])) {
            bookmarkTree[i].children = Util.prunePageNodes(bookmarkTree[i].children);
        } else {
            toSplice.push(i);
        }
    }

    for (let i = toSplice.length - 1; i >= 0; i--) {
        bookmarkTree.splice(toSplice[i], 1);
    }

    return bookmarkTree;
};

/*
 * A utility function to generate the selection options in DOM.
 *
 * @param {Object[]} folderTree An array of folder nodes. An option will be generated for each one.
 * NOTE: if the array only contains the root virtual node, we skip it and don't generate.
 *
 * @param {Object} selectDomNode The DOM node for the select tag. We require it to be passed as a parameter,
 * so we can avoid querying the DOM in every nested call.
 *
 * @param {Number} [level=0] The level of nested call, will decide how many spaces to be prefixed.
 */
window.LightMarker.Util.generateFolderSelectOption = function(folderTree, selectDomNode, level=0) {
    if (folderTree.length === 1 && folderTree[0].id === "0") {
        // skip the virtual root folder
        Util.generateFolderSelectOption(folderTree[0].children, selectDomNode);
        return;
    }

    for (let i = 0; i < folderTree.length; ++i) {
        let optionDom = $("<option></option>");
        optionDom.attr("id", "folder-option-" + folderTree[i].id);
        optionDom.attr("value", folderTree[i].id);

        optionDom.html(Array(level+1).join("+ ") + folderTree[i].title);

        if (Util.defaultSelectedFolderId === folderTree[i].id) {
            optionDom.attr("selected", true);
        }

        selectDomNode.append(optionDom);
        Util.generateFolderSelectOption(folderTree[i].children, selectDomNode, level+1);
    }
};

/*
 * Represent the folder that will be selected by default when open the popup.
 * Currently it will be the last folder that's used for saving.
 * Upon installing it will default to "1" (Bookmarks Bar).
 */
window.LightMarker.Util.defaultSelectedFolderId = g_bookmarksBarId;

/*
 * Listen to "onConnect" event.
 * Currently only the popup page could connect.
 */
chrome.runtime.onConnect.addListener(function(port) {
    if (port.name === "popup") {
        console.log("port connected with popup page");

        port.onDisconnect.addListener(function(port) {
            console.log("port disconnected from popup page");
            let node = g_popupState.node;
            let title = g_popupState.title;
            let parentId = g_popupState.parentId;
    
            // If node is undefined, the popup is closed by remove button, no action here.
            if (node) {
                // update title if changed
                if (title !== node.title) {
                    chrome.bookmarks.update(node.id, { title: title });
                }
    
                // update parentId if changed
                if (parentId !== node.parentId) {
                    chrome.bookmarks.move(node.id, { parentId: parentId });
                }
            }
        });

    } else if (port.name === "content") {
        console.log("port connected with content page");

        const contentTabId = port.sender.tab.id;
        const contentTabUrl = port.sender.tab.url;
        console.log("content page's tab id: " + contentTabId + ", url: " + contentTabUrl);

        Promise.resolve()
        .then(function() {
            return new Promise(function(res, rej) {
                chrome.bookmarks.search({
                    url: contentTabUrl
                }, res);
            });
        })
        .then(function(matchedResults) {
            if (matchedResults.length === 0) {
                // this url hasn't been saved as a bookmark
                port.disconnect();

            } else {
                console.log("found matched bookmark");
                const nodeId = matchedResults[0].id;
                chrome.storage.sync.get(nodeId, function(items) {
                    if (typeof items === "object" && items.hasOwnProperty(nodeId)) {
                        // this bookmark has saved scrollbar position
                        console.log("found saved scrollbar position");
                        const value = items[nodeId];
                        console.log("value=" + value);
                        const scrollTop = value.scrollTop;
                        console.log("scrollTop=" + scrollTop);
                        port.postMessage(scrollTop);
                    }
                });
            }
        });

    } else {
        console.assert(false);
    }
});

/*
 * Listen to tabs created event.
 * At this time, the url may be set, or may be not set.
 * This is trying to be fast for setting the icon properly.
 */
chrome.tabs.onCreated.addListener(function(tab) {
    if (typeof tab.url === "string") {
        chrome.bookmarks.search({
            url: tab.url
        }, function(matchedResults) {
            if (matchedResults.length > 0) {
                Util.setSavedIcon(tab.id);
            }
        })
    }
});

/*
 * Listen to tabs updated event.
 * 
 */
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    console.log("\nTabs update event");
    console.log(tabId);
    console.log(changeInfo);
    console.log(tab);

    if (typeof changeInfo === "object" && changeInfo.status === "loading") {
        // the first event when a tab starts to load
        chrome.bookmarks.search({
            url: tab.url
        }, function(matchedResults) {
            if (matchedResults.length > 0) {
                Util.setSavedIcon(tabId);
            }
        });
    }
});