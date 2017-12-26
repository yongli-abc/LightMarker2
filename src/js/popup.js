/*
 * Handling popup.html events
 */

const Util = chrome.extension.getBackgroundPage().LightMarker.Util;

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

    // fill name input
    $("#name-input").val(currentTab.title);

    // generate select options
    let selectDomNode = $("#folder-select");
    Util.generateFolderSelectOption(folderTree, selectDomNode);

    // register event handlers
    // TODO

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
            parentId: Util.defaultSelectedFolderId,
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
.then(function(currentNode) {
    // when promise reaches here, the current page has either been saved before and retrieved,
    // or it has been created as a new node.
    console.assert(currentNode);
})
.catch(function(err) {
    console.log("uncaught error:");
    console.log(err);
});

    // adjust title & folder

    // when the popup dismisses, change title if modified, move folder if modified.
    // The only use for the done button is to dismiss the popup