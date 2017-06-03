//var rw_mutex = require('./rw_mutex');
//var key_rw_mutex = require('./key_rw_mutex');
//var cluster_rw_mutex = require('./cluster_rw_mutex');
//var cluster_key_rw_mutex = require('./cluster_key_rw_mutex');
var msg_key_rw_mutex = require('./msg_key_rw_mutex');

var $ = {}

$.mutex = function(name, host){
    return msg_key_rw_mutex.mutex(name, host);
}

$.server = function(port){
    return msg_key_rw_mutex.server(port);
}

$.cluster_mutex = $.mutex;  //for compatibility

module.exports = $;
