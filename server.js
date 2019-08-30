'use strict';

var connect = require('connect');
var serveStatic = require('serve-static');

connect()
  .use(serveStatic(__dirname + '/build'))
  .listen(8000, function() {
    console.log('Server running on http://localhost:8000/ ...');
  });
