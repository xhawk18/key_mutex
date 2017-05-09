var rw_mutex = require('./rw_mutex');

var $ = {};

function CallbackMutex(){
    var thiz = this;
    thiz.map = new Map();
    
    thiz.getMutex = function(key) {
        var value = thiz.map.get(key);
        //console.log(value);
        if(value === undefined){
            value = {ref_count: 1, mutex: rw_mutex.callbackMutex()};
            thiz.map.set(key, value);
        }
        else
            value.ref_count++;
        return value;
    }
    thiz.putMutex = function(key, value) {
        value.ref_count--;
        if(value.ref_count == 0)
            thiz.map.delete(key);
    }

    thiz.rlock = function(key, func) {
        var value = thiz.getMutex(key);
        value.mutex.rlock(function(unlock){
            function my_unlock(){
                thiz.putMutex(key, value);
                unlock();
            }
            func(my_unlock);
        });
    }

    thiz.wlock = function(key, func) {
        var value = thiz.getMutex(key);
        value.mutex.wlock(function(unlock){
            function my_unlock(){
                thiz.putMutex(key, value);
                unlock();
            }
            func(my_unlock);
        });
    }
}


function Mutex(){
    var thiz = this;
    thiz.map = new Map();
    
    thiz.getMutex = function(key) {
        var value = thiz.map.get(key);
        //console.log(value);
        if(value === undefined){
            value = {ref_count: 1, mutex: rw_mutex.mutex()};
            thiz.map.set(key, value);
        }
        else
            value.ref_count++;
        return value;
    }
    thiz.putMutex = function(key, value) {
        value.ref_count--;
        if(value.ref_count == 0)
            thiz.map.delete(key);
    }

    thiz.rlock = function(key, func) {
        var value = thiz.getMutex(key);
        return value.mutex.rlock(func).then(function(ret){
            thiz.putMutex(key, value);
            return ret;
        }, function(err){
            thiz.putMutex(key, value);
            throw err;
        });
    }

    thiz.wlock = function(key, func) {
        var value = thiz.getMutex(key);
        return value.mutex.wlock(func).then(function(ret){
            thiz.putMutex(key, value);
            return ret;
        }, function(err){
            thiz.putMutex(key, value);
            throw err;
        });
    }

    thiz.size = function(){
        return thiz.map.size;
    }
}


function Mutex2() {
    var thiz = this;
    thiz.mutex = new CallbackMutex();
    
    thiz.lock_ = function(key, func, lock_func) {
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
        return thiz.lock_(key, func, thiz.mutex.rlock);
    }
    
    thiz.wlock = function(key, func) {
        return thiz.lock_(key, func, thiz.mutex.wlock);
    }

    thiz.size = function(){
        return thiz.mutex.map.size;
    }
}

$.mutex = function() {
    return new Mutex2();
}

module.exports = $;
