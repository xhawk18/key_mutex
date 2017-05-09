var mutex = require('./index');

async function delay(ms){
    return await new Promise(function(resolve){
        setTimeout(resolve, ms);
    });
}

async function test(){

    var lock = mutex.mutex();
    
    lock.rlock(async()=>{
        console.log('A: read step 0');
        await delay(50);
        console.log('A: read step 1');
        await delay(50);
        console.log('A: read step 2');
        await delay(50);
    });

    lock.rlock(async()=>{
        console.log('B: read step 0');
        await delay(50);
        console.log('B: read step 1');
        await delay(50);
        console.log('B: read step 2');
        await delay(50);
    });     

    (async()=> {
        try{
            await lock.wlock(async()=>{
                console.log('C: write step 0');
                await delay(50);
                console.log('C: write step 1');
                throw new Error('I throw an error here!');
                await delay(50);
                console.log('C: write step 2');
                await delay(50);
            });
        }catch(err){
            console.log(err);
        }
    })();

    /* await */ lock.wlock(async()=>{
        console.log('D: write step 0');
        await delay(50);
        console.log('D: write step 1');
        await delay(50);
        console.log('D: write step 2');
        await delay(50);
    });



    lock.rlock(async()=>{
        console.log('E: read step 0');
        await delay(50);
        console.log('E: read step 1');
        await delay(50);
        console.log('E: read step 2');
        await delay(50);
    });

    lock.rlock(async()=>{
        console.log('F: read step 0');
        await delay(50);
        console.log('F: read step 1');
        await delay(50);
        console.log('F: read step 2');
        await delay(50);
    });
}

test();

