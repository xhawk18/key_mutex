var $ = {};

var cluster = require('cluster');

var index = 0;

var mutexes = new Map();
var callback_message_inited = false;


(function init_msg_handler(){
    if(callback_message_inited) return;
    callback_message_inited = true;

    if(cluster.isMaster){
        cluster.on('fork', function(worker){
            worker.on('message', function(msg) {
                var mutex = mutexes.get(msg.m_index);
                if(mutex === undefined) return;
                
                if(msg.m_cmd === 'unlock')
                    mutex.unlock(msg.m_key);
                else if(msg.m_cmd === 'wlock')
                    mutex.wlock2(msg.m_key, worker);
                else if(msg.m_cmd === 'rlock')
                    mutex.rlock2(msg.m_key, worker);
            });
        });
    }
    else{
        process.on('message', function(msg) {
            var mutex = mutexes.get(msg.m_index);
            if(mutex === undefined) return;
            
            if(msg.m_cmd === 'wlock')
                mutex.on_wlock(msg.m_key);
            else if(msg.m_cmd === 'rlock')
                mutex.on_rlock(msg.m_key);
        });
    }
})();


function Master(index){
    var thiz = this;
    thiz.index = index;

    var map = new Map();
    var mutex_no_key = {
        ref_count: 0,
        wait_writer: [],
        wait_reader: [],
        status: 0,    //0, no action, 1, reading, 2, writing
        reading_peers: 0
    };

    //Add myself to mutexes
    mutexes.set(thiz.index, thiz);
    thiz.destroy = function(){
        mutexes.delete(thiz.index);
    }

    var obtainKey = function(key) {
        var value;
        if(key === undefined)
            value = mutex_no_key;
        else{
            value = map.get(key);
            //console.log(value);
            if(value === undefined){
                value = {
                    ref_count: 0,
                    wait_writer: [],
                    wait_reader: [],
                    status: 0,    //0, no action, 1, reading, 2, writing
                    reading_peers: 0
                };
                map.set(key, value);
            }
        }

        value.ref_count++;
        return value;
    }
    var releaseKey = function(key, value) {
        value.ref_count--;
        if(value.ref_count == 0 && key !== undefined)
            map.delete(key);
    }
    var getKey = function(key){
        if(key === undefined) return mutex_no_key;
        return map.get(key);
    }

    var next2 = function(mutex, key) {
        //console.log('status ', mutex.status);
        setImmediate(function(){
            if(mutex.status == 0
                && mutex.wait_writer.length > 0){
                var op = mutex.wait_writer.shift();
                mutex.status = 2;
                if(op.worker !== undefined)
                    op.worker.send({'m_cmd': 'wlock', 'm_index': thiz.index, 'm_type': thiz.type, 'm_key': key});
                else
                    op.func(function(){
                        unlock2(mutex, key);
                    });
            }

            while((mutex.status == 0 || mutex.status == 1)
                && mutex.wait_reader.length > 0){
                var op = mutex.wait_reader.shift();
                mutex.status = 1;
                mutex.reading_peers++;
                if(op.worker !== undefined)
                    op.worker.send({'m_cmd': 'rlock', 'm_index': thiz.index, 'm_type': thiz.type, 'm_key': key});
                else
                    op.func(function(){
                        unlock2(mutex, key);
                    });
            }
        });
    }
    
    var next = function(key) {
        var mutex = getKey(key);
        if(mutex === undefined) return;
        next2(mutex, key);
    }

    
    var unlock2 = function(mutex, key){
        if(mutex.status == 2)
            mutex.status = 0;
        else if(mutex.status == 1){
            if(mutex.reading_peers > 0){
                mutex.reading_peers--;
                if(mutex.reading_peers == 0)
                    mutex.status = 0;
            }
        }
        var ref_count = mutex.ref_count;
        releaseKey(key, mutex);
        if(ref_count > 1)
            next2(mutex, key);
    }
    
    thiz.unlock = function(key){
        var mutex = getKey(key);
        if(mutex === undefined) return;
        unlock2(mutex, key);
    }

    thiz.wlock2 = function(key, worker){
        var mutex = obtainKey(key);
        mutex.wait_writer.push({worker: worker});
        next2(mutex, key);
    }

    thiz.rlock2 = function(key, worker){
        var mutex = obtainKey(key);
        mutex.wait_reader.push({worker: worker});
        next2(mutex, key);
    }

    thiz.wlock = function(key, func){
        var mutex = obtainKey(key);
        mutex.wait_writer.push({func: func});
        next2(mutex, key);
    }
    
    thiz.rlock = function(key, func){
        var mutex = obtainKey(key);
        mutex.wait_reader.push({func: func});
        next2(mutex, key);
    }
    
    thiz.size = function(){
        return map.size;
    }
}


function CallbackMutex(index){
    var thiz = this;
    thiz.index = index;

    var wait_writer = new Map();
    var wait_reader = new Map();
    var wait_writer_no_key = [];
    var wait_reader_no_key = [];

    //Add myself to mutexes
    mutexes.set(thiz.index, thiz);
    thiz.destroy = function(){
        mutexes.delete(thiz.index);
    }

    function get_wait_writer(key){
        if(key === undefined) return wait_writer_no_key;
        var value = wait_writer.get(key);
        if(value === undefined){
            value = [];
            wait_writer.set(key, value);
        }
        return value;
    }
    function get_wait_reader(key){
        if(key === undefined) return wait_reader_no_key;
        var value = wait_reader.get(key);
        if(value === undefined){
            value = [];
            wait_reader.set(key, value);
        }
        return value;
    }

    var unlock = function(key) {
        process.send({'m_cmd': 'unlock', 'm_index': thiz.index, 'm_type': thiz.type, 'm_key': key});
    }
    
    thiz.on_wlock = function(key){
        var values = get_wait_writer(key);
        var op = values.shift();
        if(values.length === 0)
            wait_writer.delete(key);
        op(function(){
            unlock(key);
        });
    }
    
    thiz.on_rlock = function(key){
        var values = get_wait_reader(key);
        var op = values.shift();
        if(values.length === 0)
            wait_reader.delete(key);
        op(function(){
            unlock(key);
        });
    }

    thiz.wlock = function(key, func) {
        get_wait_writer(key).push(func);
        process.send({'m_cmd': 'wlock', 'm_index': thiz.index, 'm_type': thiz.type, 'm_key': key});
    }

    thiz.rlock = function(key, func) {
        get_wait_reader(key).push(func);
        process.send({'m_cmd': 'rlock', 'm_index': thiz.index, 'm_type': thiz.type, 'm_key': key});
    }

    thiz.lock = thiz.wlock;
    
    thiz.size = function() {
        return wait_writer.size + wait_reader.size;
    }
}


function Mutex(name) {
    var thiz = this;
    var mutex = $.callbackMutex(name);
    
    var lock_ = function(key, func, lock_func) {
        return new Promise(function(resolve, reject){
            lock_func(key, function(unlock){
                Promise.resolve().then(function(){
                    return func();
                }).then(function(ret){
                    unlock();
                    resolve(ret);
                }, function(err){
                    unlock();
                    reject(err);
                });
            });
        });
    }
    
    thiz.rlock = function(key, func) {
        if(func === undefined){
            func = key;
            key = undefined;
        }

        return lock_(key, func, mutex.rlock);
    }
    
    thiz.wlock = function(key, func) {
        if(func === undefined){
            func = key;
            key = undefined;
        }

        return lock_(key, func, mutex.wlock);
    }

    thiz.lock = thiz.wlock;
    
    thiz.size = function() {
        return mutex.size();
    }
    
    thiz.destroy = function(){
        return mutex.destroy();
    }
}

$.callbackMutex = function(name) {
    var new_index = (name === undefined ? index++ : name);
    return (cluster.isMaster ? new Master(new_index) : new CallbackMutex(new_index));
}


$.mutex = function(name) {
    return new Mutex(name);
}

module.exports = $;
