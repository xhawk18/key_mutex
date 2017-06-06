var cluster = require('cluster');
var key_mutex = require('../index');
//var key_mutex = require('key_mutex');

key_mutex.server(9994);//, 5000);

