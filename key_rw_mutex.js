var rw_mutex = require('./rw_mutex');

var $ = {};


function Mutex(){
    var thiz = this;
    var map = new Map();
    
    var getMutex = function(key) {
        var value = map.get(key);
        //console.log(value);
        if(value === undefined){
            value = {ref_count: 1, mutex: rw_mutex.mutex()};
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

    thiz.rlock = function(key, func) {
        if(func === undefined){
            func = key;
            return thiz.rlock(getMutex, key);    //Use getMutex as unique/dummy key
        }

        var value = getMutex(key);
        return value.mutex.rlock(func).then(function(ret){
            putMutex(key, value);
            return ret;
        }, function(err){
            putMutex(key, value);
            throw err;
        });
    }

    thiz.wlock = function(key, func) {
        if(func === undefined){
            func = key;
            return thiz.wlock(getMutex, key);    //Use getMutex as unique/dummy key
        }

        var value = getMutex(key);
        return value.mutex.wlock(func).then(function(ret){
            putMutex(key, value);
            return ret;
        }, function(err){
            putMutex(key, value);
            throw err;
        });
    }

    thiz.lock = thiz.wlock;

    thiz.size = function(){
        return map.size;
    }
}


/*
//alternative implement
function CallbackMutex(){
    var thiz = this;
    var map = new Map();
    
    var getMutex = function(key) {
        var value = map.get(key);
        //console.log(value);
        if(value === undefined){
            value = {ref_count: 1, mutex: rw_mutex.callbackMutex()};
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

    thiz.rlock = function(key, func) {
        var value = getMutex(key);
        value.mutex.rlock(function(unlock){
            function my_unlock(){
                putMutex(key, value);
                unlock();
            }
            func(my_unlock);
        });
    }

    thiz.wlock = function(key, func) {
        var value = getMutex(key);
        value.mutex.wlock(function(unlock){
            function my_unlock(){
                putMutex(key, value);
                unlock();
            }
            func(my_unlock);
        });
    }

    thiz.size = function(){
        return map.size;
    }
}

function Mutex2() {
    var thiz = this;
    var simple_mutex = rw_mutex.mutex();
    var mutex = new CallbackMutex();
    
    var lock_ = function(lock_func, key, func) {
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

        return lock_(mutex.rlock, key, func);
    }
    
    thiz.wlock = function(key, func) {
        if(func === undefined){
            func = key;
            return simple_mutex.wlock(func);
        }

        return lock_(mutex.wlock, key, func);
    }

    thiz.lock = thiz.wlock;    

    thiz.size = function(){
        return mutex.size();
    }
}
/**/


$.mutex = function() {
    return new Mutex();
}

module.exports = $;
