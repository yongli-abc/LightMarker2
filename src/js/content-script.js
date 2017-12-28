$(document).ready(function() {
    let port = chrome.runtime.connect({
        name: "content"
    });
    
    port.onMessage.addListener(function(scrollTop) {
        window.scrollTo(0, scrollTop);
    });
});