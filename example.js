var key_mutex = require('./index');
//var key_mutex = require('key_mutex');

var mutex = key_mutex.mutex();

function delay(ms){
    return new Promise(function(resolve){
        setTimeout(resolve, ms);
    });
}

/* Example 0 - 
   Two async tasks without mutex locked, will output
    ex0_task_a, step 1
    ex0_task_b, step 1
    ex0_task_a, step 2, =======
    ex0_task_b, step 2, =======
 */
async function ex0_task_a(){
    console.log('ex0_task_a, step 1');
    await delay(500);
    console.log('ex0_task_a, step 2, =======');
}

async function ex0_task_b(){
    console.log('ex0_task_b, step 1');
    await delay(500);
    console.log('ex0_task_b, step 2, =======');
}

async function example0(){
    ex0_task_a();
    ex0_task_b();
}


/* Example 1 -
   Two async tasks with mutex locked, will output
    ex1_task_a, step 1
    ex1_task_a, step 2, =======
    ex1_task_b, step 1
    ex1_task_b, step 2, =======
 */
async function ex1_task_a(){
    mutex.lock(async function(){
        console.log('ex1_task_a, step 1');
        await delay(500);
        console.log('ex1_task_a, step 2, =======');
    });
}

async function ex1_task_b(){
    mutex.lock(async function(){
        console.log('ex1_task_b, step 1');
        await delay(500);
        console.log('ex1_task_b, step 2, =======');
    });
}

async function example1(){
    ex1_task_a();
    ex1_task_b();
}


/* Example 2 -
   "key_mutex" can await the return value of internal function. This
   example will output 
    ex2_task, step 1
    ex2_task, step 2, =======
    returns from ex2_task
 */
async function example2(){
    var ret = await mutex.lock(async function(){
        console.log('ex2_task, step 1');
        await delay(500);
        console.log('ex2_task, step 2, =======');
        await delay(500);
        return 'returns from ex2_task';
    });
    console.log(ret);   //output 'returns from ex2_task_a'
}


/* Example 3 -
   "key_mutex" supports exceptions. This example will output 
    ex3_task, step 1
    throw my error
 */
async function example3(){
    try{
        var ret = await mutex.lock(async function(){
            console.log('ex3_task, step 1');
            await delay(500);
            throw new Error('throw my error');
            console.log('ex3_task, step 2, =======');
            await delay(500);
            return 'returns from ex2_task';
        });
        console.log(ret);
    }catch(err){
        console.log(err.message);
    }
}


/* Example 4 -
   Bind "key_mutex" with a named key, only the same key can lock with
   each other, which is useful especially when we need to lock the
   very record line in database. This example will output
    ex4_task_a, key = 1234, step 1
    ex4_task_b, key = abcd, step 1
    ex4_task_a, key = 1234, step 2, =======
    ex4_task_b, key = abcd, step 2, =======
    ex4_task_b, key = 1234, step 1
    ex4_task_a, key = abcd, step 1
    ex4_task_b, key = 1234, step 2, =======
    ex4_task_a, key = abcd, step 2, =======
 */
async function ex4_task_a(key){
    mutex.lock(key, async function(){
        console.log(`ex4_task_a, key = ${key}, step 1`);
        await delay(500);
        console.log(`ex4_task_a, key = ${key}, step 2, =======`);
    });
}

async function ex4_task_b(key){
    mutex.lock(key, async function(){
        console.log(`ex4_task_b, key = ${key}, step 1`);
        await delay(500);
        console.log(`ex4_task_b, key = ${key}, step 2, =======`);
    });
}

async function example4(){
    ex4_task_a(1234);    //use mutex with named key 1234
    ex4_task_b("abcd");  //use mutex with named key "abcd"

    ex4_task_a("abcd");  //use mutex with named key "abcd"
    ex4_task_b(1234);    //use mutex with named key 1234
}


/* Example 5 -
   "key_mutex" supports reader-writer mutex,
       https://en.wikipedia.org/wiki/Readers%E2%80%93writer_lock
   This example will output
    ex5_task_a, reader step 1
    ex5_task_c, reader step 1
    ex5_task_a, reader step 2, =======
    ex5_task_c, reader step 2, =======
    ex5_task_b, writer step 1
    ex1_task_b, writer step 2, =======
 */
async function ex5_task_a(){
    mutex.rlock(async function(){
        console.log('ex5_task_a, reader step 1');
        await delay(500);
        console.log('ex5_task_a, reader step 2, =======');
    });
}

async function ex5_task_b(){
    mutex.wlock(async function(){
        console.log('ex5_task_b, writer step 1');
        await delay(500);
        console.log('ex5_task_b, writer step 2, =======');
    });
}

async function ex5_task_c(){
    mutex.rlock(async function(){
        console.log('ex5_task_c, reader step 1');
        await delay(500);
        console.log('ex5_task_c, reader step 2, =======');
    });
}

async function example5(){
    ex5_task_a();
    ex5_task_b();
    ex5_task_c();
}


/* Example 6 -
   Bind "reader-writer" mutex with a nemed key. This example will output
    ex6_task_a, key = 1234, reader step 1
    ex6_task_b, key = 5678, writer step 1
    ex6_task_c, key = 1234, reader step 1
    ex6_task_a, key = 1234, reader step 2, =======
    ex6_task_b, key = 5678, writer step 2, =======
    ex6_task_c, key = 1234, reader step 2, =======
    ex6_task_d, key = 5678, reader step 1
    ex6_task_d, key = 5678, reader step 2, =======
 */
async function ex6_task_a(key){
    mutex.rlock(key, async function(){
        console.log(`ex6_task_a, key = ${key}, reader step 1`);
        await delay(500);
        console.log(`ex6_task_a, key = ${key}, reader step 2, =======`);
    });
}

async function ex6_task_b(key){
    mutex.wlock(key, async function(){
        console.log(`ex6_task_b, key = ${key}, writer step 1`);
        await delay(500);
        console.log(`ex6_task_b, key = ${key}, writer step 2, =======`);
    });
}

async function ex6_task_c(key){
    mutex.rlock(key, async function(){
        console.log(`ex6_task_c, key = ${key}, reader step 1`);
        await delay(500);
        console.log(`ex6_task_c, key = ${key}, reader step 2, =======`);
    });
}

async function ex6_task_d(key){
    mutex.rlock(key, async function(){
        console.log(`ex6_task_d, key = ${key}, reader step 1`);
        await delay(500);
        console.log(`ex6_task_d, key = ${key}, reader step 2, =======`);
    });
}

async function example6(){
    ex6_task_a(1234);
    ex6_task_b(5678);
    ex6_task_c(1234);
    ex6_task_d(5678);
}


(async function main(){
    console.log('\n=== run example0 ===');
    example0();
    await delay(2000);

    console.log('\n=== run example1 ===');
    example1();
    await delay(2000);

    console.log('\n=== run example2 ===');
    example2();
    await delay(2000);

    console.log('\n=== run example3 ===');
    example3();
    await delay(2000);

    console.log('\n=== run example4 ===');
    example4();
    await delay(2000);

    console.log('\n=== run example5 ===');
    example5();
    await delay(2000);

    console.log('\n=== run example6 ===');
    example6();
    await delay(2000);
})();

