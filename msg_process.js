var $ = {};
module.exports = $;


var cluster = require('cluster');
var util = require('./util');
var msg_key_rw_mutex = require('./msg_key_rw_mutex');


var mutexes = new Map();
var callback_message_inited = false;

$.on_message = function(msg, client){
    var mutex = mutexes.get(msg.m_name);
    if(mutex === undefined){
        new msg_key_rw_mutex.MasterMutex(msg.m_name, $);
        var mutex = mutexes.get(msg.m_name);
        if(mutex === undefined)
            return;
    }
    

    if(msg.m_cmd === 'unlock')
        mutex.unlock_worker(msg.m_key);
    else if(msg.m_cmd === 'wlock')
        mutex.wlock_worker(msg.m_key, client);
    else if(msg.m_cmd === 'rlock')
        mutex.rlock_worker(msg.m_key, client);
}

$.send = function(msg){
    process.send(msg);
}

$.send_client = function(client, msg){
    client.send(msg);
}


;(function init_msg_handler(){
    if(callback_message_inited) return;
    callback_message_inited = true;

    if(cluster.isMaster){
        cluster.on('fork', function(worker){
            worker.on('message', function(msg) {
                $.on_message(msg, worker);
            });
        });
    }
    else{
        process.on('message', function(msg) {
            var mutex = mutexes.get(msg.m_name);
            if(mutex === undefined) return;
            
            if(msg.m_cmd === 'wlock')
                mutex.on_wlock(msg.m_key);
            else if(msg.m_cmd === 'rlock')
                mutex.on_rlock(msg.m_key);
        });
    }
})();


$.get = function(){
    return $;
}

$.add = function(name, mutex){
    mutexes.set(name, mutex);
}
$.del = function(name){
    mutexes.delete(name);
}

