var $ = {};
var cluster = require('cluster');

var index = 0;

function Master(){
    var thiz = this;
    thiz.type = 0;
    thiz.index = index++;
    
    if (!cluster.isMaster) return;

    var wait_writer = [];
    var wait_reader = [];
    var status = 0;    //0, no action, 1, reading, 2, writing
    var reading_peers = 0;

    var next = function() {
        //console.log('status ', status);
        if(status == 0
            && wait_writer.length > 0){
            var op = wait_writer.shift();
            status = 2;
            if(op.worker !== undefined)
                op.worker.send({'m_cmd': 'wunlock', 'm_index': thiz.index, 'm_type': thiz.type});
            else
                op.func(unlock);
        }

        while((status == 0 || status == 1)
            && wait_reader.length > 0){
            var op = wait_reader.shift();
            status = 1;
            reading_peers++;
            if(op.worker !== undefined)
                op.worker.send({'m_cmd': 'runlock', 'm_index': thiz.index, 'm_type': thiz.type});
            else
                op.func(unlock);
        }
    }
    
    var unlock = function(){
        if(status == 2)
            status = 0;
        else if(status == 1){
            if(reading_peers > 0){
                reading_peers--;
                if(reading_peers == 0)
                    status = 0;
            }
        }
        next();
    }

    cluster.on('online', function(worker){
        worker.on('message', function(msg) {
            if(msg.m_index !== thiz.index || msg.m_type !== thiz.type) return;
            else if(msg.m_cmd === 'next'){
                unlock();
            }
            else if(msg.m_cmd === 'rlock'){
                wait_reader.push({worker: worker});
                next();
            }
            else if(msg.m_cmd === 'wlock'){
                wait_writer.push({worker: worker});
                next();
            }
        });
    });
    
    thiz.rlock = function(func){
        wait_reader.push({func: func});
        next();
    }
    
    thiz.wlock = function(func){
        wait_writer.push({func: func});
        next();
    }
}


function CallbackMutex(){
    var master = new Master();
    var thiz = this;
    var wait_writer = [];
    var wait_reader = [];
    //var status = 0;    //0, no action, 1, reading, 2, writing
    //var reading_peers = 0;

    process.on('message', (msg) => {
        if(msg.m_index !== master.index || msg.m_type !== master.type) return;
        else if(msg.m_cmd === 'wunlock'){
            var op = wait_writer.shift();
            op(unlock);
        }
        else if(msg.m_cmd === 'runlock'){
            //console.log(wait_reader.length);
            var op = wait_reader.shift();
            //console.log(op);
            op(unlock);
        }
    });

    var unlock = function() {
        setImmediate(function(){
            if(cluster.isMaster)
                master.next();
            else
                process.send({'m_cmd': 'next', 'm_index': master.index, 'm_type': master.type});
        });
    }

    thiz.rlock = function(func) {
        if(cluster.isMaster)
            master.rlock(func);
        else{
            wait_reader.push(func);
            process.send({'m_cmd': 'rlock', 'm_index': master.index, 'm_type': master.type});
        }
    }
    
    thiz.wlock = function(func) {
        if(cluster.isMaster)
            master.wlock(func);
        else{
            wait_writer.push(func);
            process.send({'m_cmd': 'wlock', 'm_index': master.index, 'm_type': master.type});
        }
    }

    thiz.lock = thiz.wlock;
}


function Mutex() {
    var thiz = this;
    var mutex = new CallbackMutex();
    
    var lock_ = function(func, lock_func) {
        return new Promise(function(resolve, reject){
            lock_func(function(unlock){
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
    
    thiz.rlock = function(func) {
        return lock_(func, mutex.rlock);
    }
    
    thiz.wlock = function(func) {
        return lock_(func, mutex.wlock);
    }

    thiz.lock = thiz.wlock;
}

$.callbackMutex = function() {
    return new CallbackMutex();
}

$.mutex = function() {
    return new Mutex();
}

module.exports = $;
