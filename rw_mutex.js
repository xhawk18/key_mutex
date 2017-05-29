var $ = {};

function CallbackMutex(){
    var thiz = this;
    var wait_write = [];
    var wait_read = [];
    var status = 0;    //0, no action, 1, reading, 2, writing
    var reading_peers = 0;

    var next = function() {
        //console.log('status ', status);
        if(status == 0
            && wait_write.length > 0){
            var op = wait_write.shift();
            status = 2;
            op(unlock);
        }

        while((status == 0 || status == 1)
            && wait_read.length > 0){
            var op = wait_read.shift();
            status = 1;
            reading_peers++;
            op(unlock);
        }
    }

    var unlock = function() {
        setImmediate(function(){
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
        });
    }

    thiz.rlock = function(func) {
        wait_read.push(func);
        next();
    }
    
    thiz.wlock = function(func) {
        wait_write.push(func);
        next();
    }
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
}

$.callbackMutex = function() {
    return new CallbackMutex();
}

$.mutex = function() {
    return new Mutex();
}


module.exports = $;

