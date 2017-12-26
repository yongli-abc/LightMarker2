/*
 * Handling popup.html events
 */

 /*
  * A utility function to clean page nodes inside the bookmarkTree.
  *
  * @param {Object[]} An array of bookmarkTree nodes, that may contain page node.
  *
  * @return {Object[]} BookmarkTree nodes only containing folder nodes.
  */
function prunePageNodes(bookmarkTree) {
    function isFolderNode(node) {
        return node.hasOwnProperty("children");
    }

    let toSplice = [];

    for (let i = 0; i < bookmarkTree.length; ++i) {
        if (isFolderNode(bookmarkTree[i])) {
            bookmarkTree[i].children = prunePageNodes(bookmarkTree[i].children);
        } else {
            toSplice.push(i);
        }
    }

    for (let i = toSplice.length - 1; i >= 0; i--) {
        bookmarkTree.splice(toSplice[i], 1);
    }

    return bookmarkTree;
}

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
function generateFolderSelectOption(folderTree, selectDomNode, level=0) {
    console.log("level=" + level);
    if (folderTree.length === 1 && folderTree[0].id === "0") {
        // skip the virtual root folder
        generateFolderSelectOption(folderTree[0].children, selectDomNode);
        return;
    }

    for (let i = 0; i < folderTree.length; ++i) {
        let optionDom = $("<option></option>");
        optionDom.attr("id", "folder-option-" + folderTree[i].id);
        optionDom.attr("value", folderTree[i].id);
        optionDom.css("white-space", "pre-line");
        optionDom.html(Array(level+1).join("&nbsp &nbsp") + folderTree[i].title);

        console.log(optionDom);
        selectDomNode.append(optionDom);
        generateFolderSelectOption(folderTree[i].children, selectDomNode, level+1);
    }
}

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
    console.log("bookmarkTree:");
    console.log(bookmarkTree);
    return prunePageNodes(bookmarkTree);
});

Promise.all([docReadyP, tabP, folderP])
.then(function(results) {
    const currentTab = results[1];
    const folderTree = results[2];

    // fill name input
    $("#name-input").val(currentTab.title);

    // generate select options
    let selectDomNode = $("#folder-select");
    generateFolderSelectOption(folderTree, selectDomNode);
});