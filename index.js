var rw_mutex = require('./rw_mutex');
var key_mutex = require('./key_mutex');

var $ = {}

$.key_mutex = function() {
    return key_mutex.mutex();
}

$.mutex = function(){
    return rw_mutex.mutex();
}

module.exports = $;
