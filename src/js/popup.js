/*
 * Handling popup.html events
 */

const Util = chrome.extension.getBackgroundPage().LightMarker.Util;
let g_popupState = chrome.extension.getBackgroundPage().LightMarker.Shared.g_popupState;
    // shared across popup & background.js

/*
 * Resolved when the document is ready.
 */
const docReadyP = Promise.resolve()
.then(function() {
    return new Promise(function(res, rej) {
        $(document).ready(function() {
            res();
        });
    });
});

/*
 * Resolve with {[Tab]}.
 * This is the current active tba.
 */
const tabP = Promise.resolve()
.then(function() {
    return new Promise(function(res, rej) {
        chrome.tabs.query({
            currentWindow: true,
            active: true
        }, function(tabs) {
            res(tabs[0]);
        })
    });
});

/*
 * Resolve with {BookmarkTreeNode[]} tree
 * This tree has been pruned to only contain folder nodes.
 */
const folderP = Promise.resolve()
.then(function() {
    /*
     * This Promise will resolve with a bookmarkTree.
     * See {/misc/bookmarkTree-example.json}.
     */
    return new Promise(function(res, rej) {
        chrome.bookmarks.getTree(res);
    });
})
.then(function(bookmarkTree) {
    return Util.prunePageNodes(bookmarkTree);
});

const checkSavedP = Promise.resolve()
.then(function() {

});

let state = {}; // preserve states across promises
Promise.all([docReadyP, tabP, folderP])
.then(function(results) {
    const currentTab = results[1];
    const folderTree = results[2];

    state.currentTab = currentTab;

    let nameInputDomNode = $("#name-input");
    state.nameInputDomNode = nameInputDomNode;

    // generate select options
    let selectDomNode = $("#folder-select");
    Util.generateFolderSelectOption(folderTree, selectDomNode);
    state.selectDomNode = selectDomNode;

    // register event handlers
    nameInputDomNode.change(function() {
        console.log("new bookmark name:");
        console.log(nameInputDomNode.val());
        g_popupState.title = nameInputDomNode.val();
    });

    selectDomNode.change(function() {
        console.log("new selected optoin:");
        console.log(selectDomNode.val());
        g_popupState.parentId = selectDomNode.val();
    });

    // check if this page has been bookmarked
    return new Promise(function(res, rej) {
        chrome.bookmarks.search({
            url: currentTab.url
        }, res);
    });
})
.then(function(matchedResults) {
    if (matchedResults.length === 0) {
        // save it immediately
        let bookmark = {
            parentId: state.selectDomNode.val(),
            title: state.currentTab.title,
            url: state.currentTab.url
        };

        // if this page hasn't been saved, save it to the default selected folder with the title.
        return new Promise(function(res, rej) {
            chrome.bookmarks.create(bookmark, res);
        });
    } else {
        // if this page has been saved before, do nothing at this stage
        return Promise.resolve(matchedResults[0]);
    }
})
.then(function(savedNode) {
    // when promise reaches here, the current page has either been saved before and retrieved,
    // or it has been created as a new node.
    console.assert(savedNode);
    g_popupState.node = savedNode;

    // populate the popupState and UI
    g_popupState.parentId = savedNode.parentId;
    state.selectDomNode.val(savedNode.parentId);

    g_popupState.title = savedNode.title;
    state.nameInputDomNode.val(savedNode.title);

    // Start a runtime connection to background.js
    // This is a workaround as the 'unload' event on `window` is buggy in Chrome extension,
    // and it's never emitted.
    // So the background.js has to listen to "onDisconnect" in order to handle popup close.
    chrome.runtime.connect({
        name: "popup"
    });

    // Done bttn handler is better set after port connected.
    // We want to ensure when the popup is closed, background definitely gets the disconnect event.
    $("#done-btn").click(function() {
        window.close();
    });
})
.catch(function(err) {
    console.log("uncaught error:");
    console.log(err);
});