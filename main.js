const regex = /github\.com\/([^/]*)\/([^/]*)\/?((tree|blob|commits)\/?([^/]*))?/;
const isOnGithubRegex = /:\/\/github\.com\//;
const input = document.getElementById('file-traversal-input');
const limit = 10;

const fetchAsync = async function(url) {
  const response = await fetch(url);
  return response;  
}

const getJsonAsync = async function(response) {
  const data = await response.json();
  return data;
}

chrome.tabs.query({ active: true, currentWindow: true }, async function(tab) {
  const currentTab = tab[0];
  const curTabUrl = currentTab.url;
  const onGithubMatch = curTabUrl.match(isOnGithubRegex);

  if (!onGithubMatch) {
    // We're not on a Github repo page...
    window.close();
    return ;
  }

  const match = curTabUrl.match(regex);
  const tree = (match[5]) ? match[5] : 'master';

  const repoOwner = match[1];
  const repoName = match[2];
  const repoTree = tree;

  let apiUrl = `https://api.github.com/repos/${match[1]}/${match[2]}/git/trees/${tree}?recursive=1`;

  // Let's fetch our options to see if we have an access token saved
  chrome.storage.sync.get('accessToken', async function(items) {
    if (items.accessToken) {
      apiUrl += `&access_token=${items.accessToken}`;
    }

    chrome.browserAction.setBadgeText({ text: '...' });
    const response = await fetchAsync(apiUrl);

    const errorStatuses = [401, 403, 404];
    if (errorStatuses.includes(response.status)) {
      // User isn't authorized to view this repo yet, maybe it's private?
      const goToOptions = confirm("You're not authorized to view this repo's tree, would you like to go to this plugin's options to add an access token?");
      if (goToOptions) {
        if (chrome.runtime.openOptionsPage) {
          chrome.runtime.openOptionsPage();
        } else {
          window.open(chrome.runtime.getURL('options.html'));
        }
      }

      window.close();
    }

    const json = await getJsonAsync(response);
    const paths = (json && json.tree) ? json.tree.map((item) => item.path) : [];

    input.value = "";
    input.disabled = false;
    input.focus();
    chrome.browserAction.setBadgeText({text: ''});
    horsey(input, {
      source(data, done) {
        done(null, [{ list: paths }]);
      },
      set(selectedValue) {
        input.value = selectedValue;
        const chosenFileUrl = `https://github.com/${repoOwner}/${repoName}/tree/${repoTree}/${selectedValue}`;
        chrome.tabs.update(currentTab.id, { url: chosenFileUrl });
        window.close();
      },
      noMatches: "No files found. Note that I only fetch 1000 files per repo. ",
      limit,
      renderCategory(div, data) {
        let numItemsToDisplay = (data.list.length > limit) ? limit : data.list.length;
        let height = (numItemsToDisplay * 30) + 21;
        document.body.style['height'] = `${height}px`; // Resize our popup window
      }
    });
  });
});

input.addEventListener('keydown', function(e) {
  if (e.keyCode === 27) {
    // User hit escape, close popup
    window.close();
  }
});
