var express = require('express');
var api = require('./api.js');
var app = express();

app.get('/menu', api.getMenu);

var server = app.listen(3000, function () {
  var host = server.address().address;
  var port = server.address().port;

  console.log('CERN Restaurant API is listening at http://%s:%s', host, port);
});