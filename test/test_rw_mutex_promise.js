var key_mutex = require('../index');

function delay(ms){
    return new Promise(function(resolve){
        setTimeout(resolve, ms);
    });
}

function test(){

    var mutex = key_mutex.mutex();
    
    mutex.rlock(function(){
        console.log('A: read step 0');
        return delay(50).then(function(){
            console.log('A: read step 1');
            return delay(50);
        }).then(function(){
            console.log('A: read step 2');
            return delay(50);
        });
    });

    mutex.rlock(function(){
        console.log('B: read step 0');
        return delay(50).then(function(){
            console.log('B: read step 1');
            return delay(50);
        }).then(function(){
            console.log('B: read step 2');
            return delay(50);
        });
    });

    mutex.wlock(function(){
        console.log('C: write step 0');
        return delay(50).then(function(){
            console.log('C: write step 1');
            throw new Error('I throw an error here!');
            return delay(50);
        }).then(function(){
            console.log('C: write step 2');
            return delay(50);
        })['catch'](function(err){
            console.log(err);
        });
    });

    mutex.wlock(function(){
        console.log('D: write step 0');
        return delay(50).then(function(){
            console.log('D: write step 1');
            return delay(50);
        }).then(function(){
            console.log('D: write step 2');
            return delay(50);
        });
    });



    mutex.rlock(function(){
        console.log('E: read step 0');
        return delay(50).then(function(){
            console.log('E: read step 1');
            return delay(50);
        }).then(function(){
            console.log('E: read step 2');
            return delay(50);
        });
    });

    mutex.rlock(function(){
        console.log('F: read step 0');
        return delay(50).then(function(){
            console.log('F: read step 1');
            return delay(50);
        }).then(function(){
            console.log('F: read step 2');
            return delay(50);
        });
    });
}

test();

