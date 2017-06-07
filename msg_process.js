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
        mutex.unlock_worker(msg.m_key, client);
    else if(msg.m_cmd === 'wlock')
        mutex.wlock_worker(msg.m_key, client);
    else if(msg.m_cmd === 'rlock')
        mutex.rlock_worker(msg.m_key, client);
}

$.force_unlock = function(client, name, key){
    //console.log('force_unlock', name, key);
    var mutex = mutexes.get(name);
    if(mutex === undefined)
        return;
    mutex.unlock_worker(key, client); 
}

$.send = function(waiter, msg){
    process.send(msg);
}

$.lock_client = function(client, msg){
    return client.lock(msg);
}


;(function init_msg_handler(){
    if(callback_message_inited) return;
    callback_message_inited = true;

    if(cluster.isMaster){
        cluster.on('fork', function(worker){
            var client = {
                lock: function(msg){
                    worker.send(msg);
                }
            };
            worker.on('message', function(msg) {
                $.on_message(msg, client);
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

