var _ = require('lodash');
var fs = require('fs');
var md5 = require('md5');

var rssGetter = require('./rss-getter');

var requestFeed = function() {
  fs.readFile('./config.json', 'utf8', function (err, config) {
    if (!err) {
      var list = JSON.parse(config);
      list.forEach(function(conf, index) {
        rssGetter(conf.url, function(feed) {
          var id = makeId(conf.url);
          var savedItems = readSavedItems(id);
          savedItems = JSON.parse(savedItems);
          var newItems = makeItemsFromXML(feed);
          var diff = diffFeed(newItems, savedItems);

          applyDOM(id, savedItems, diff);

          if (diff.length > 0) {
            sendNotification(conf, diff);
            updateFeedStorage(id, diff);
          }
        });
      });
    }
  });
};

var readSavedItems = function(id) {
  var path = './feed-items/' + id;
  if (!fs.existsSync(path))
    fs.writeFileSync(path, '[]', 'utf8');

  return fs.readFileSync(path, 'utf8');
};

var storeItemTable = function(id, data) {
  fs.writeFileSync('./feed-items/' + id, data, 'utf8');
};

var diffFeed = function(target, comp) {
  return target.filter(function(item) {
    return _.findIndex(comp, function(citem) {
      return item.pubDate === citem.pubDate;
    }) === -1;
  })
};

var makeId = function(src) {
  return md5(src);
};

var sendNotification = function(conf, diff) {
  var n = new Notification(
    conf.title,
    {body: diff.length >= 5 ? '5 more feeds' : diff}
  );
};

var updateFeedStorage = function(id, newItems) {
  var savedItems = readSavedItems(id);
  savedItems = JSON.parse(savedItems);
  Array.prototype.push.apply(savedItems, newItems);
  fs.writeFileSync('./feed-items/' + id, JSON.stringify(savedItems), 'utf8');
};

var htmlTemplate = _.template(
  '<div>' +
  '<a href="${link}"><h2>${title}</h2></a>' +
  '<p>${description}</p>' +
  '</div>'
);

var makeItemsFromXML = function(feedXML) {
  return $(feedXML).find('item').map(function(index, elem) {
    return {
      title: $(elem).find('title').text(),
      link:  $(elem).find('link').text(),
      description:  $(elem).find('description').text(),
      pubDate: Date.parse($(elem).find('pubDate').text())
    };
  }).get();
};

var applyDOM = function(id, savedItems, items) {
  var $target = $('#' + id);

  if ($target.length === 0) {
    $('#main').append('<div></div>').attr('id', id);
    $target = $('#' + id);
  }
  if (items.length === 0) $target.empty();

  savedItems.forEach(function(item) {
    $target.append(htmlTemplate(item));
  });

  items.forEach(function(item) {
    $target.append(htmlTemplate(item));
  });
};

module.exports = requestFeed;
