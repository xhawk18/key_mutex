var $ = {}
module.exports = $;


//var rw_mutex = require('./rw_mutex');
//var key_rw_mutex = require('./key_rw_mutex');
//var cluster_rw_mutex = require('./cluster_rw_mutex');
//var cluster_key_rw_mutex = require('./cluster_key_rw_mutex');
var msg_key_rw_mutex = require('./msg_key_rw_mutex');


$.mutex = function(name, host, timeout_ms){
    return msg_key_rw_mutex.mutex(name, host, timeout_ms);
}

$.server = function(port, timeout_ms){
    return msg_key_rw_mutex.server(port, timeout_ms);
}

$.cluster_mutex = $.mutex;  //for compatibility

