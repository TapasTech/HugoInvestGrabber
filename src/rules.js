const rules = [{
  match: function (url) {
    return url.startsWith('http://mp.weixin.qq.com/');
  },
  data: {
    title: 'h2.rich_media_title',
    content: '#js_content',
    origin_website: '#post-user',
    author: '#post-date+.rich_media_meta_text',
    origin_date: '#post-date',
    _image: {
      els: 'img[data-src]',
      getSrc: img => img.dataset.src,
    },
  },
}];
