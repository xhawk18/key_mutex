# Usage & Examples

key_mutex is a nodejs module that supports key-mapped reader-writer mutex.

## Example 1 - usage of simple mutex
For example, two asynchronized tasks without mutex locked, will output
<pre>
ex0_task_a, step 1
ex0_task_b, step 1
ex0_task_a, step 2, =======
ex0_task_b, step 2, =======
</pre>
#### (Source code)
<pre>
function delay(ms){
    return new Promise(function(resolve){
        setTimeout(resolve, ms);
    });
}

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
example0();
</pre>

If we use mutex to lock the asynchronized tasks, will output
<pre>
ex1_task_a, step 1
ex1_task_a, step 2, =======
ex1_task_b, step 1
ex1_task_b, step 2, =======
</pre>
#### (Source code)
<pre>
var key_mutex = require('key_mutex');
var mutex = key_mutex.mutex();

function delay(ms){
    return new Promise(function(resolve){
        setTimeout(resolve, ms);
    });
}

async function ex1_task_a(){
    mutex.<strong>lock</strong>(async function(){
        console.log('ex1_task_a, step 1');
        await delay(500);
        console.log('ex1_task_a, step 2, =======');
    });
}

async function ex1_task_b(){
    mutex.<strong>lock</strong>(async function(){
        console.log('ex1_task_b, step 1');
        await delay(500);
        console.log('ex1_task_b, step 2, =======');
    });
}

async function example1(){
    ex1_task_a();
    ex1_task_b();
}
</pre>

## Example 2 - await the return value
"key_mutex" can await the return value of internal function. This example will output 
<pre>
ex2_task, step 1
ex2_task, step 2, =======
returns from ex2_task
</pre>
#### (Source code)
<pre>
async function example2(){
    var ret = <strong>await</strong> mutex.lock(async function(){
        console.log('ex2_task, step 1');
        await delay(500);
        console.log('ex2_task, step 2, =======');
        await delay(500);
        return 'returns from ex2_task';
    });
    console.log(ret);   <strong>//output 'returns from ex2_task_a'</strong>
}
</pre>

## Example 3 - Supports exceptions
"key_mutex" supports exceptions. This example will output 
</pre>
ex3_task, step 1
throw my error
</pre>
#### (Source code)
<pre>
async function example3(){
    <strong>try</strong>{
        var ret = await mutex.lock(async function(){
            console.log('ex3_task, step 1');
            await delay(500);
            <strong>throw new Error('throw my error');</strong>
            console.log('ex3_task, step 2, =======');
            await delay(500);
            return 'returns from ex2_task';
        });
        console.log(ret);
    }<strong>catch(err)</strong>{
        console.log(err.message);
    }
}
</pre>

## Example 4 - mutex with named key
Bind "key_mutex" with a named key, only the same key can lock with each other, which is useful especially when we need to lock the very record line in database. This example will output
<pre>
ex4_task_a, key = 1234, step 1
ex4_task_b, key = abcd, step 1
ex4_task_a, key = 1234, step 2, =======
ex4_task_b, key = abcd, step 2, =======
ex4_task_b, key = 1234, step 1
ex4_task_a, key = abcd, step 1
ex4_task_b, key = 1234, step 2, =======
ex4_task_a, key = abcd, step 2, =======
</pre>
#### (Source code)
<pre>
async function ex4_task_a(key){
    mutex.lock(<strong>key</strong>, async function(){
        console.log(`ex4_task_a, key = ${key}, step 1`);
        await delay(500);
        console.log(`ex4_task_a, key = ${key}, step 2, =======`);
    });
}

async function ex4_task_b(key){
    mutex.lock(<strong>key</strong>, async function(){
        console.log(`ex4_task_b, key = ${key}, step 1`);
        await delay(500);
        console.log(`ex4_task_b, key = ${key}, step 2, =======`);
    });
}

async function example4(){
    ex4_task_a(<strong>1234</strong>);    //use mutex with named key 1234
    ex4_task_b(<strong>"abcd"</strong>);  //use mutex with named key "abcd"

    ex4_task_a(<strong>"abcd"</strong>);  //use mutex with named key "abcd"
    ex4_task_b(<strong>1234</strong>);    //use mutex with named key 1234
}
</pre>

## Example 5 - Reader-writer mutex
"key_mutex" supports [reader-writer mutex](https://en.wikipedia.org/wiki/Readers%E2%80%93writer_lock). This example will output
<pre>
ex5_task_a, reader step 1
ex5_task_c, reader step 1
ex5_task_a, reader step 2, =======
ex5_task_c, reader step 2, =======
ex5_task_b, writer step 1
ex1_task_b, writer step 2, =======
</pre>
#### (Source code)
<pre>
async function ex5_task_a(){
    mutex.<strong>rlock</strong>(async function(){
        console.log('ex5_task_a, reader step 1');
        await delay(500);
        console.log('ex5_task_a, reader step 2, =======');
    });
}

async function ex5_task_b(){
    mutex.<strong>wlock</strong>(async function(){
        console.log('ex5_task_b, writer step 1');
        await delay(500);
        console.log('ex5_task_b, write step 2, =======');
    });
}

async function ex5_task_c(){
    mutex.<strong>rlock</strong>(async function(){
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
</pre>

## Example 6 - Reader-writer mutex with named key
Bind "reader-writer" mutex with a nemed key. This example will output
<pre>
ex6_task_a, key = 1234, reader step 1
ex6_task_b, key = 5678, writer step 1
ex6_task_c, key = 1234, reader step 1
ex6_task_a, key = 1234, reader step 2, =======
ex6_task_b, key = 5678, writer step 2, =======
ex6_task_c, key = 1234, reader step 2, =======
ex6_task_d, key = 5678, reader step 1
ex6_task_d, key = 5678, reader step 2, =======
</pre>
#### (Source code)
<pre>
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
</pre>

# APIs
## Module
```javascript
var key_mutex = require('key_mutex');
```

## Create a mutex
```javascript
var mutex = key_mutex.mutex();
```

## Simple lock
```javascript
mutex.lock(async function(){
    ...
});
```

## Simple lock with key
```javascript
mutex.lock(key, async function(){
    ...
});
```

## Reader lock
```javascript
mutex.rlock(async function(){
    ...
});
```

## Reader lock with named key
```javascript
mutex.rlock(key, async function(){
    ...
});
```

## Writer lock
```javascript
mutex.wlock(async function(){
    ...
});
```

## Writer lock with named key
```javascript
mutex.wlock(key, async function(){
    ...
});
```



