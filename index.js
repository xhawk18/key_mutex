var rw_mutex = require('./rw_mutex');
var key_mutex = require('./key_mutex');

var $ = {}

$.mutex = function() {
    return key_mutex.mutex();
}

$.simple_mutex = function(){
    return rw_mutex.mutex();
}

module.exports = $;
