$(document).ready(function() {
    alert("nihao");
    new Promise(function(res, rej) {
        chrome.tabs.query({
            currentWindow: true,
            active: true
        }, function(tabs) {
            res(tabs[0]);
        })
    })
    .then(function(currenTab) {
        Promise.resolve()
        .then(function() {
            return new Promise(function(res, rej) {
                chrome.bookmarks.search({
                    url: currenTab.url
                }, res);
            });
        })
        .then(function(matchedResults) {
            // this tab opened a bookmarked page
            if (matchedResults.length > 0) {
                let nodeId = matchedResults[0].id;
                state.nodeId = nodeId;
                return new Promise(function(res, rej) {
                    chrome.storage.sync.get(nodeId, res);
                });
            } else {
                return undefined;
            }
        })
        .then(function(items) {
            if (typeof items === "object" && items.hasOwnProperty(state.nodeId)) {
                // this saved bookmark has saved scrollbar position
                const scrollTop = items[state.nodeId].scrollTop;
                const codeToInject = "window.scrollTo(0, " + scrollTop + ");";
                chrome.tabs.executeScript(currenTab.id, {
                    code: codeToInject
                });
            }
        });
    });
});