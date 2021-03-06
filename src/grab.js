window.grab = window.grab || function () {
  function cleanHTML(html, meta) {
    var imageRule = Object.assign({
      el: 'img[src]',
      src: function (img) {return img.src;},
      maxSize: 1024 * 1024,
    }, meta.image);
    var div = document.createElement('div');
    div.innerHTML = html.trim();
    var ignoreTags = [
      'script',
      'noscript',
      'style',
      'textarea',
      'video',
      'audio',
      'iframe',
      'object',
    ];
    if (!imageRule.el) ignoreTags.push('img');
    ignoreTags.forEach(function (tag) {
      Array.prototype.forEach.call(div.querySelectorAll(tag), function (el) {el.remove();});
    });
    if (!imageRule.el) return div.innerHTML;
    var els = typeof imageRule.el === 'string' ? div.querySelectorAll(imageRule.el) : imageRule.el(div);
    return Promise.all(Array.prototype.map.call(els, function (img) {
      return new Promise(function (resolve, reject) {
        chrome.runtime.sendMessage({
          cmd: 'url2dataUrl',
          data: {
            url: imageRule.src(img),
            maxSize: imageRule.maxSize,
          },
        }, function (res) {
          res.error ? reject(res.error) : resolve(res.data);
        });
      })
      .then(function (url) {
        var image = new Image;
        image.src = url;
        img.parentNode.replaceChild(image, img);
      })
      .catch(function (err) {
        console.error(err);
        img.remove();
      });
    }))
    .then(function () {return div.innerHTML;});
  }

  function extractOne(item, meta) {
    if (item.value != null) {
      return typeof item.value === 'function' ? item.value(window) : item.value;
    }
    var el = document.querySelector(item.sel);
    var str = el ? (
      item.type === 'html' ? cleanHTML(el.innerHTML, meta) : el.textContent.trim()
    ) : '';
    if (item.transform) str = item.transform(str);
    return str;
  }

  function extract(group, meta) {
    return Promise.all(group.map(function (item) {return extractOne(item, meta);}))
    .then(function (contents) {
      return contents.filter(function (content) {return content;}).join('\n');
    });
  }

  function grab(rule) {
    if (inProgress) return;
    var hint = window.showHint('正在抓取...');
    var meta = rule.meta;
    var data = rule.data;
    inProgress = true;
    var promises = Object.keys(data)
    .filter(function (key) {return key[0] !== '_';})
    .map(function (key) {
      return extract(data[key], meta)
      .then(function (data) {
        return [key, data];
      }, function (err) {
        console.warn(err);
      });
    });
    Promise.all(promises)
    .then(function (pairs) {
      return pairs.reduce(function (res, item) {
        res[item[0]] = item[1];
        return res;
      }, {});
    })
    .then(function (article) {
      if (meta.transform) article = meta.transform(article) || article;
      chrome.runtime.sendMessage({
        cmd: 'grabbed',
        data: {
          open: meta.open,
          article: article,
        },
      });
      inProgress = false;
      hint.removeLater(null, '抓取完成！');
    });
  }

  var inProgress;
  return grab;
}();
