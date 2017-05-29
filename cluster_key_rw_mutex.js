var $ = {};

var cluster_rw_mutex = require('./cluster_rw_mutex');
var cluster = require('cluster');

var index = 0;

function Master(){
    var thiz = this;
    thiz.type = 1;
    thiz.index = index++;
    
    if (!cluster.isMaster) return;

    var map = new Map();

    var getMutex = function(key) {
        var value = map.get(key);
        //console.log(value);
        if(value === undefined){
            value = {
                ref_count: 1,
                wait_writer: [],
                wait_reader: [],
                status: 0,    //0, no action, 1, reading, 2, writing
                reading_peers: 0
            };
            map.set(key, value);
        }
        else
            value.ref_count++;
        return value;
    }
    var putMutex = function(key, value) {
        value.ref_count--;
        if(value.ref_count == 0)
            map.delete(key);
    }
    var hasMutex = function(key){
        return map.get(key);
    }

    var next2 = function(mutex, key) {
        //console.log('status ', mutex.status);
        if(mutex.status == 0
            && mutex.wait_writer.length > 0){
            var op = mutex.wait_writer.shift();
            mutex.status = 2;
            if(op.worker !== undefined)
                op.worker.send({'m_cmd': 'wunlock', 'm_index': thiz.index, 'm_type': thiz.type, 'm_key': key});
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
                op.worker.send({'m_cmd': 'runlock', 'm_index': thiz.index, 'm_type': thiz.type, 'm_key': key});
            else
                op.func(function(){
                    unlock2(mutex, key);
                });
        }
    }
    
    var next = function(key) {
        var mutex = hasMutex(key);
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
        putMutex(key, mutex);
        if(ref_count > 1)
            next2(mutex, key);
    }
    
    var unlock = function(key){
        var mutex = hasMutex(key);
        if(mutex === undefined) return;
        unlock2(mutex, key);
    }

    cluster.on('online', function(worker){
        worker.on('message', function(msg) {
            if(msg.m_index !== thiz.index || msg.m_type !== thiz.type) return;
            else if(msg.m_cmd === 'next'){
                unlock(msg.m_key);
            }
            else if(msg.m_cmd === 'rlock'){
                var mutex = getMutex(msg.m_key);
                mutex.wait_reader.push({worker: worker});
                next2(mutex, msg.m_key);
            }
            else if(msg.m_cmd === 'wlock'){
                var mutex = getMutex(msg.m_key);
                mutex.wait_writer.push({worker: worker});
                next2(mutex, msg.m_key);
            }
        });
    });
    
    thiz.rlock = function(key, func){
        var mutex = getMutex(key);
        mutex.wait_reader.push({func: func});
        next2(mutex, key);
    }
    
    thiz.wlock = function(key, func){
        var mutex = getMutex(key);
        mutex.wait_writer.push({func: func});
        next2(mutex, key);
    }
    
    thiz.size = function(){
        return map.size;
    }
}


function CallbackMutex(){
    var master = new Master();
    var thiz = this;
    var wait_writer = new Map();
    var wait_reader = new Map();
    
    function get_wait_writer(key){
        var value = wait_writer.get(key);
        if(value === undefined){
            value = [];
            wait_writer.set(key, value);
        }
        return value;
    }
    function get_wait_reader(key){
        var value = wait_reader.get(key);
        if(value === undefined){
            value = [];
            wait_reader.set(key, value);
        }
        return value;
    }

    process.on('message', (msg) => {
        if(msg.m_index !== master.index || msg.m_type !== master.type) return;
        else if(msg.m_cmd === 'wunlock'){
            var values = get_wait_writer(msg.m_key);
            var op = values.shift();
            if(values.length === 0)
                wait_writer.delete(msg.m_key);
            op(function(){
                unlock(msg.m_key);
            });
        }
        else if(msg.m_cmd === 'runlock'){
            var values = get_wait_reader(msg.m_key);
            var op = values.shift();
            if(values.length === 0)
                wait_reader.delete(msg.m_key);
            op(function(){
                unlock(msg.m_key);
            });
        }
    });

    var unlock = function(key) {
        setImmediate(function(){
            if(cluster.isMaster)
                master.next(key);
            else
                process.send({'m_cmd': 'next', 'm_index': master.index, 'm_type': master.type, 'm_key': key});
        });
    }

    thiz.rlock = function(key, func) {
        if(cluster.isMaster)
            master.rlock(key, func);
        else{
            get_wait_reader(key).push(func);
            process.send({'m_cmd': 'rlock', 'm_index': master.index, 'm_type': master.type, 'm_key': key});
        }
    }
    
    thiz.wlock = function(key, func) {
        if(cluster.isMaster)
            master.wlock(key, func);
        else{
            get_wait_writer(key).push(func);
            process.send({'m_cmd': 'wlock', 'm_index': master.index, 'm_type': master.type, 'm_key': key});
        }
    }

    thiz.lock = thiz.wlock;
    
    thiz.size = function() {
        if(cluster.isMaster)
            return master.size();
        else
            return wait_writer.size + wait_reader.size;
    }
}


function Mutex() {
    var thiz = this;
    var mutex = new CallbackMutex();
    var simple_mutex = cluster_rw_mutex.mutex();
    
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
            return simple_mutex.rlock(func);
        }

        return lock_(key, func, mutex.rlock);
    }
    
    thiz.wlock = function(key, func) {
        if(func === undefined){
            func = key;
            return simple_mutex.wlock(func);
        }

        return lock_(key, func, mutex.wlock);
    }

    thiz.lock = thiz.wlock;
    
    thiz.size = function() {
        return mutex.size();
    }
}


$.mutex = function() {
    return new Mutex();
}

module.exports = $;
