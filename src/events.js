const KEY_VERSION = 'versionInfo';
const KEY_HOST = 'investHost';
var versionInfo = function () {
  var versionInfo;
  try {
    versionInfo = JSON.parse(localStorage.getItem(KEY_VERSION));
  } catch (e) {}
  versionInfo = versionInfo || {};
  if (versionInfo.version !== chrome.app.getDetails().version || !versionInfo.lastCheck || versionInfo.lastCheck + 3 * 60 * 60 * 1000 < Date.now()) checkUpdate();
  return versionInfo;
}();
var investHost;
readHost();

function readHost() {
  investHost = localStorage.getItem(KEY_HOST) || 'https://backend-invest.dtcj.com';
}

function checkTab(tab) {
  if (findRule(tab.url)) {
    chrome.pageAction.show(tab.id);
  } else {
    chrome.pageAction.hide(tab.id);
  }
}

const findRule = function () {
  const cache = {};
  return function (url) {
    var rule = cache[url];
    if (rule) return rule;
    rule = rules.find(rule => !rule.match || rule.match(url));
    if (rule) {
      cache[url] = rule;
      setTimeout(() => {
        delete cache[url];
      }, 3000);
    }
    return rule;
  };
}();

chrome.runtime.onMessage.addListener(function (req, src, callback) {
  if (req.cmd === 'grabbed') {
    const article = req.article;
    article.origin_url = article.origin_url || src.url.split('#')[0];
    article.compose_organization = article.compose_organization || '第一财经｜CBN';
    chrome.tabs.create({
      url: investHost + '/draft/columns/_new',
    }, tab => {
      chrome.tabs.executeScript(tab.id, {
        code: 'editAs(' + serialize(article) + ')',
        runAt: 'document_end',
      });
    });
  } else if (req.cmd === 'checkVersion') {
    callback(versionInfo);
  } else if (req.cmd === 'setHost') {
    localStorage.setItem(KEY_HOST, req.data);
    readHost();
  }
});

chrome.pageAction.onClicked.addListener(tab => {
  const rule = findRule(tab.url);
  rule && rule.data && chrome.tabs.executeScript(tab.id, {
    code: 'grab(' + serialize(rule.data) + ')',
    runAt: 'document_start',
  });
});

chrome.windows.getAll(windows => {
  windows.forEach(win => {
    chrome.tabs.getAllInWindow(win.id, tabs => {
      tabs.forEach(checkTab);
    });
  });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  checkTab(tab);
});

function checkUpdate() {
  const localVersion = chrome.app.getDetails().version.split('.');
  fetch('https://api.github.com/repos/TapasTech/HugoInvestGrabber/releases/latest')
  .then(res => res.json())
  .then(data => {
    const remoteVersion = data.tag_name.slice(1).split('.');
    var i = 0;
    while (1) {
      const lv = localVersion[i];
      const rv = remoteVersion[i];
      const nlv = +lv || 0;
      const nrv = +rv || 0;
      if (!lv && !rv || nlv > nrv) return Promise.reject();
      if (nlv < nrv) return data.tag_name;
      i ++;
    }
  })
  .then(newVersion => ({
    name: newVersion,
  }), () => ({}))
  .then(info => {
    info.version = localVersion;
    info.lastCheck = Date.now();
    versionInfo = info;
    localStorage.setItem(KEY_VERSION, JSON.stringify(info));
  });
}