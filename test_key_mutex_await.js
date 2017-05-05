var mutex = require('./index');

async function delay(ms){
    return await new Promise(function(resolve){
        setTimeout(resolve, ms);
    });
}

async function test(){

    var l0 = mutex.key_mutex();
    
    l0.rlock(4, async()=>{
        console.log('A: key = 4, read step 0');
        await delay(50);
        console.log('A: key = 4, read step 1');
        await delay(50);
        console.log('A: key = 4, read step 2');
        await delay(350);
    });

    l0.rlock(1, async()=>{
        console.log('B: key = 1, read step 0');
        await delay(50);
        console.log('B: key = 1, read step 1');
        await delay(50);
        console.log('B: key = 1, read step 2');
        await delay(50);
    });

    (async()=> {
        try{
            await l0.wlock(3, async()=>{
                console.log('C: key = 3, write step 0');
                await delay(1150);
                console.log('C: key = 3, write step 1');
                throw new Error('I throw an error here!');
                await delay(50);
                console.log('C: key = 3, write step 2');
                await delay(50);
            });
        }catch(err){
            console.log(err);
        }
    })();

    l0.wlock(3, async()=>{
        console.log('D: key = 3, write step 0');
        await delay(50);
        console.log('D: key = 3, write step 1');
        await delay(50);
        console.log('D: key = 3, write step 2');
        await delay(50);
        console.log('D: key = 3, write step 3');
    });

    l0.wlock(3, async()=>{
        console.log('E: key = 3, write step 0');
        await delay(50);
        console.log('E: key = 3, write step 1');
        await delay(50);
        console.log('E: key = 3, write step 2');
        await delay(50);
        console.log('E: key = 3, write step 3, map size = %d', l0.size());
    });
    l0.wlock(4, async()=>{
        console.log('F: key = 4, write step 0');
        await delay(50);
        console.log('F: key = 4, write step 1');
        await delay(50);
        console.log('F: key = 4, write step 2');
        await delay(50);
        console.log('F: key = 4, write step 3, map size = %d', l0.size());
    });
    l0.wlock(5, async()=>{
        console.log('G: key = 5, write step 0');
        await delay(50);
        console.log('G: key = 5, write step 1');
        await delay(50);
        console.log('G: key = 5, write step 2');
        await delay(50);
        console.log('G: key = 5, write step 3, map size = %d', l0.size());
    });


    l0.rlock(3, async()=>{
        console.log('H: key = 3, read step 0');
        await delay(50);
        console.log('H: key = 3, read step 1');
        await delay(50);
        console.log('H: key = 3, read step 2');
        await delay(50);
        console.log('H: key = 3, read step 3, map size = %d', l0.size());
    });

    l0.rlock(1, async()=>{
        console.log('I: key = 1, read step 0');
        await delay(50);
        console.log('I: key = 1, read step 1');
        await delay(50);
        console.log('I: key = 1, read step 2');
        await delay(50);
        console.log('I: key = 1, read step 3, map size = %d', l0.size());
    });
}

test();
