/*
 * Background.js as a controller page.
 * Other UI is implemented by dumb view pages.
 */

const g_bookmarksBarId = "1"; // id for the bookmarks bar folder.

// Provide scoped namespaces.
 window.LightMarker = {};
 window.LightMarker.Util = {};

// Shortcuts for namespaces to be used within this file.
const Util = window.LightMarker.Util;

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

        optionDom.html(Array(level+1).join("× ") + folderTree[i].title);

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
 * Main entry point
 */
function main() {
    console.log("background.js#main");
}
main();