//var key_mutex = require('key_mutex');
var key_mutex = require('../index');

function simple_mutex(){
    var thiz = this;
    var mutex = key_mutex.mutex();
    var resolves = [];
    var locked = false;
    
    thiz.lock = function(){
        return mutex.lock(function(){
            return new Promise(function(resolve){
                if(!locked){
                    resolve();
                    locked = true;
                }
                else resolves.push(resolve);
            });
        });
    }
    
    thiz.unlock = function(){
        if(resolves.length > 0){
            var resolve = resolves.shift();
            resolve();
        }
        else locked = false;
    }    
}


function delay(ms){
    return new Promise(function(resolve){
        setTimeout(resolve, ms);
    });
}


var mutex = new simple_mutex();


async function task_a(){
    await mutex.lock();
    console.log('task_a, step 1');
    await delay(500);
    console.log('task_a, step 2, =======');
    mutex.unlock();
}

async function task_b(){
    await mutex.lock();
    console.log('task_b, step 1');
    await delay(500);
    console.log('task_b, step 2, =======');
    mutex.unlock();
}

(async function main(){
    task_a();
    task_b();
})();
