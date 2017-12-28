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

    // fetch name input dom
    let nameInputDomNode = $("#name-input");
    state.nameInputDomNode = nameInputDomNode;

    // generate select options
    let selectDomNode = $("#folder-select");
    Util.generateFolderSelectOption(folderTree, selectDomNode);
    state.selectDomNode = selectDomNode;

    // fetch scrollbar input dom
    let scrollbarInputDomNode = $("#scrollbar-input");
    state.scrollbarInputDomNode = scrollbarInputDomNode;

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
    Util.setSavedIcon(state.currentTab.id);

    // populate UI and popupState if needed
    g_popupState.parentId = savedNode.parentId;
    state.selectDomNode.val(savedNode.parentId);

    g_popupState.title = savedNode.title;
    state.nameInputDomNode.val(savedNode.title);

    chrome.storage.sync.get(savedNode.id, function(items) {
        // we have saved scrollbar position before
        if (typeof items === "object" && items.hasOwnProperty(savedNode.id)) {
            const value = items[savedNode.id];
            const scrollTop = value.scrollTop;
            const scrollHeight = value.scrollHeight;
            const clientHeight = value.clientHeight;

            let scrollPercentage =  Math.ceil(scrollTop / (scrollHeight - clientHeight) * 100);
            state.scrollbarInputDomNode.val(scrollPercentage + "%");
        }
    });

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

    $("#remove-btn").click(function() {
        g_popupState.node = undefined;
        chrome.bookmarks.remove(savedNode.id);
        chrome.storage.sync.remove(savedNode.id);
        Util.setUnsavedIcon(state.currentTab.id);
        window.close();
    });

    $("#clear-btn").click(function() {
        chrome.storage.sync.remove(savedNode.id);
        state.scrollbarInputDomNode.val("Not Saved");
    });

    // // Defer implementing edit feature, the collapsible list is much more complex
    // // than I thought.
    // $("#edit-btn").click(function() {
    //     chrome.windows.getCurrent(function(curWindow) {
    //         console.log(curWindow);
    //         let width = 200;
    //         let height = 300;
    //         let left = Math.round((curWindow.width - width) / 2) + curWindow.left;
    //         let top = 100 + curWindow.top;
    //         chrome.windows.create({
    //             url: "/src/html/edit.html",
    //             type: "popup",
    //             width: width,
    //             height: height,
    //             left: left,
    //             top: top
    //         });
    //     });
    // });

    $("#save-btn").click(function() {
        chrome.tabs.executeScript(state.currentTab.id, {
            file: "/src/js/injected.js"
        }, function (results) {
            if (Array.isArray(results) && typeof results[0] === "object") {
                const scrollWidth = results[0].scrollWidth;
                const scrollHeight = results[0].scrollHeight;
                const scrollLeft = results[0].scrollLeft;
                const scrollTop = results[0].scrollTop;
                const clientHeight = results[0].clientHeight;

                const value = {
                    scrollWidth: scrollWidth,
                    scrollHeight: scrollHeight,
                    scrollLeft: scrollLeft,
                    scrollTop: scrollTop,
                    clientHeight: clientHeight
                };

                const key = savedNode.id;

                let toStore = {};
                toStore[key] = value;

                chrome.storage.sync.set(toStore, function() {
                    // saved successfully
                    let scrollPercentage =  Math.ceil(scrollTop / (scrollHeight - clientHeight) * 100);
                    state.scrollbarInputDomNode.val(scrollPercentage + "%");
                });
            } else {
                state.scrollbarInputDomNode.val("Can't save for this page!");
            }
        });
    });
})
.catch(function(err) {
    console.log("uncaught error:");
    console.log(err);
});