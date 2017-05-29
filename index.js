var rw_mutex = require('./rw_mutex');
var key_rw_mutex = require('./key_rw_mutex');

var $ = {}

$.mutex = function() {
    return key_rw_mutex.mutex();
}

$.simple_mutex = function(){
    return rw_mutex.mutex();
}

module.exports = $;
