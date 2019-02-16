chrome.tabs.onActiveChanged.addListener(function(tabId, selectInfo) {
  chrome.tabs.get(tabId, function(tab) {
    if (tab.url.indexOf("github.com") !== -1) {
      chrome.browserAction.setIcon({ path: '/icons/github_file_traversal_128.png', tabId })
    } else {
      chrome.browserAction.setIcon({ path: '/icons/github_file_traversal_128_bw.png', tabId })
    }
  });
});