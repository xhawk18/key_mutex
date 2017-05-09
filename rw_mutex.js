var $ = {};

function CallbackMutex(){
    var thiz = this;
    thiz.wait_write = [];
    thiz.wait_read = [];
    thiz.status = 0;    //0, no action, 1, reading, 2, writing
    thiz.reading = 0;

    thiz.next = function() {
        //console.log('thiz.status ', thiz.status);
        if(thiz.status == 0
            && thiz.wait_write.length > 0){
            var op = thiz.wait_write.shift();
            thiz.status = 2;
            op(thiz.unlock);
        }

        while((thiz.status == 0 || thiz.status == 1)
            && thiz.wait_read.length > 0){
            var op = thiz.wait_read.shift();
            thiz.status = 1;
            thiz.reading++;
            op(thiz.unlock);
        }
    }

    thiz.unlock = function() {
        setImmediate(function(){
            if(thiz.status == 2)
                thiz.status = 0;
            else if(thiz.status == 1){
                if(thiz.reading > 0){
                    thiz.reading--;
                    if(thiz.reading == 0)
                        thiz.status = 0;
                }
            }
            thiz.next();
        });
    }

    thiz.rlock = function(func) {
        thiz.wait_read.push(func);
        thiz.next();
    }
    
    thiz.wlock = function(func) {
        thiz.wait_write.push(func);
        thiz.next();
    }
}

function Mutex() {
    var thiz = this;
    thiz.mutex = new CallbackMutex();
    
    thiz.lock_ = function(func, lock_func) {
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
        return thiz.lock_(func, thiz.mutex.rlock);
    }
    
    thiz.wlock = function(func) {
        return thiz.lock_(func, thiz.mutex.wlock);
    }
}

$.callbackMutex = function() {
    return new CallbackMutex();
}

$.mutex = function() {
    return new Mutex();
}


module.exports = $;

