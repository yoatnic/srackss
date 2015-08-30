module.exports = function(url, cb) {
  $.ajax({
    dataType: 'xml',
    url: url,
    success: cb
  });
};
