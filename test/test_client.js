var cluster = require('cluster');
var key_mutex = require('../index');
//var key_mutex = require('key_mutex');

var mutex = key_mutex.mutex("abcd", "127.0.0.1:9994");//, 3000);

var DELAY_MS = 1000;
var CLUSTER_NUM = 2;
var TASKS_PER_PROCESS = 3;

function delay(ms){
    return new Promise(function(resolve){
        if(ms == 0) setImmediate(resolve);
        else setTimeout(resolve, ms);
    });
}

function worker_id(){
    return 'worker ' + (cluster.isMaster ? 0 : cluster.worker.id);
}


/* Test 1 - "reader-writer" mutex without nemed key.  */
var ex1_call_count = 0;

async function ex1_task_a(){
    return await mutex.rlock(async function(){
        console.log(`${process.pid}, ${worker_id()}, ex1_task_a, reader step 1`);
        await delay(DELAY_MS);
        console.log(`${process.pid}, ${worker_id()}, ex1_task_a, reader step 2`);
    });
}

async function ex1_task_b(){
    return await mutex.wlock(async function(){
        console.log(`${process.pid}, ${worker_id()}, ex1_task_a, writer step 1`);
        await delay(DELAY_MS);
        console.log(`${process.pid}, ${worker_id()}, ex1_task_a, writer step 2`);
    });
}

async function test1(){
    var ret = [];
    var tasks = [ex1_task_a, ex1_task_b];

    var total_tasks = Math.floor(Math.random() * TASKS_PER_PROCESS);
    for(var i = 0; i < total_tasks; ++i){
        var n = Math.floor(Math.random() * tasks.length);
        ret.push(tasks[n]());
    }
    await Promise.all(ret);
}


if (cluster.isMaster) {
    for(var i = 0; i < CLUSTER_NUM; ++i){
        var worker = cluster.fork();
        
        worker.on('error', function(err){
            console.log('========================== got an error ==============');
            console.log(err);
            throw err;
        })
    }
}

async function main(){  
    var i = 0;
    while(true){
        try{
            await test1();
            console.log('test ok', i++);
        }catch(err){
            console.log(err);
            break;
        }
    }
    console.log('process exit');
}

main();

