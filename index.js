var rw_mutex = require('./rw_mutex');
var key_rw_mutex = require('./key_rw_mutex');
var cluster_rw_mutex = require('./cluster_rw_mutex');
var cluster_key_rw_mutex = require('./cluster_key_rw_mutex');

var $ = {}

$.mutex = function() {
    return key_rw_mutex.mutex();
}

$.simple_mutex = function(){
    return rw_mutex.mutex();
}

$.cluster_mutex = function(name){
    return cluster_key_rw_mutex.mutex(name);
}

$.simple_cluster_mutex = function(name){
    return cluster_rw_mutex.mutex(name);
}


module.exports = $;
