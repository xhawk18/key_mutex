var rw_mutex = require('./rw_mutex');

function delay(ms){
    return new Promise(function(resolve){
        setTimeout(resolve, ms);
    });
}

function test(){

    var l0 = rw_mutex.mutex();
    
    l0.rlock(function(){
        console.log('A: read step 0');
        return delay(50).then(function(){
            console.log('A: read step 1');
            return delay(50);
        }).then(function(){
            console.log('A: read step 2');
            return delay(50);
        });
    });

    l0.rlock(function(){
        console.log('B: read step 0');
        return delay(50).then(function(){
            console.log('B: read step 1');
            return delay(50);
        }).then(function(){
            console.log('B: read step 2');
            return delay(50);
        });
    });

    l0.wlock(function(){
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

    l0.wlock(function(){
        console.log('D: write step 0');
        return delay(50).then(function(){
            console.log('D: write step 1');
            return delay(50);
        }).then(function(){
            console.log('D: write step 2');
            return delay(50);
        });
    });



    l0.rlock(function(){
        console.log('E: read step 0');
        return delay(50).then(function(){
            console.log('E: read step 1');
            return delay(50);
        }).then(function(){
            console.log('E: read step 2');
            return delay(50);
        });
    });

    l0.rlock(function(){
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

