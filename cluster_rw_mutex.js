var $ = {};
var cluster = require('cluster');

var index = 0;
var TYPE = 0;

var mutexes = new Map();
var callback_message_inited = false;


(function init_msg_handler(){
    if(callback_message_inited) return;
    callback_message_inited = true;

    if(cluster.isMaster){
        cluster.on('fork', function(worker){
            worker.on('message', function(msg) {
                if(msg.m_type !== TYPE) return;
                
                var mutex = mutexes.get(msg.m_index);
                if(mutex === undefined) return;
            
                if(msg.m_cmd === 'next')
                    mutex.unlock();
                else if(msg.m_cmd === 'rlock')
                    mutex.rlock2(worker);
                else if(msg.m_cmd === 'wlock')
                    mutex.wlock2(worker);
            });
        });
    }
    else{
        process.on('message', (msg) => {
            if(msg.m_type !== TYPE) return;

            var mutex = mutexes.get(msg.m_index);
            if(mutex === undefined) return;

            if(msg.m_cmd === 'wunlock')
                mutex.on_wunlock();
            else if(msg.m_cmd === 'runlock')
                mutex.on_runlock();
        });
    }
})();


function Master(index){
    var thiz = this;
    thiz.type = TYPE;
    thiz.index = index;
    
    var wait_writer = [];
    var wait_reader = [];
    var status = 0;    //0, no action, 1, reading, 2, writing
    var reading_peers = 0;

    //Add myself to mutexes
    mutexes.set(thiz.index, thiz);
    thiz.destroy = function(){
        mutexes.delete(thiz.index);
    }

    var next = function() {
        setImmediate(function(){
            //console.log('status ', status);
            if(status == 0
                && wait_writer.length > 0){
                var op = wait_writer.shift();
                status = 2;
                if(op.worker !== undefined)
                    op.worker.send({'m_cmd': 'wunlock', 'm_index': thiz.index, 'm_type': thiz.type});
                else
                    op.func(thiz.unlock);
            }

            while((status == 0 || status == 1)
                && wait_reader.length > 0){
                var op = wait_reader.shift();
                status = 1;
                reading_peers++;
                if(op.worker !== undefined)
                    op.worker.send({'m_cmd': 'runlock', 'm_index': thiz.index, 'm_type': thiz.type});
                else
                    op.func(thiz.unlock);
            }
        });
    }
    
    thiz.unlock = function(){
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

    thiz.wlock2 = function(worker){
        wait_writer.push({worker: worker});
        next();
    }
    
    thiz.rlock2 = function(worker){
        wait_reader.push({worker: worker});
        next();
    }
    
    thiz.wlock = function(func){
        wait_writer.push({func: func});
        next();
    }

    thiz.rlock = function(func){
        wait_reader.push({func: func});
        next();
    }
    
    thiz.lock = thiz.wlock;
}


function CallbackMutex(index){
    var thiz = this;
    thiz.type = TYPE;
    thiz.index = index;
    
    var wait_writer = [];
    var wait_reader = [];

    //Add myself to mutexes
    mutexes.set(thiz.index, thiz);
    thiz.destroy = function(){
        mutexes.delete(thiz.index);
    }    

    var unlock = function() {
        process.send({'m_cmd': 'next', 'm_index': thiz.index, 'm_type': thiz.type});
    }

    thiz.on_wunlock = function(){
        var op = wait_writer.shift();
        op(unlock);
    }

    thiz.on_runlock = function(){
        var op = wait_reader.shift();
        op(unlock);
    }
    
    thiz.wlock = function(func) {
        wait_writer.push(func);
        process.send({'m_cmd': 'wlock', 'm_index': thiz.index, 'm_type': thiz.type});
    }

    thiz.rlock = function(func) {
        wait_reader.push(func);
        process.send({'m_cmd': 'rlock', 'm_index': thiz.index, 'm_type': thiz.type});
    }
    
    thiz.lock = thiz.wlock;
}


function Mutex() {
    var thiz = this;
    var mutex = $.callbackMutex();
    
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
    
    thiz.destroy = function(){
        return mutex.destroy();
    }
}

$.callbackMutex = function() {
    var new_index = index++;
    return (cluster.isMaster ? new Master(new_index) : new CallbackMutex(new_index));
}

$.mutex = function() {
    return new Mutex();
}

module.exports = $;
