/*
 * Handling popup.html events
 */

function populateNameInput() {

}

Promise.resolve()
.then(function() {
    return new Promise(function(res, rej) {
        $(document).ready(function() {
            res();
        });
    });
})
.then(function() {
    return new Promise(function(res, rej) {
        chrome.tabs.query({
            currentWindow: true,
            active: true
        }, res);
    });
})
.then(function(tabs) {
    var currentTab = tabs[0];
    console.log(currentTab.title);
    $("#name-input").val(currentTab.title);
});