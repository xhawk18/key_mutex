const $ = {};

function Mutex(){
    const thiz = this;
    thiz.wait_write = [];
    thiz.wait_read = [];
    thiz.status = 0;    //0, no action, 1, reading, 2, writing
    thiz.reading = 0;

    thiz.next = () => {
        //console.log('thiz.status ', thiz.status);
        if(thiz.status == 0
            && thiz.wait_write.length > 0){
            const op = thiz.wait_write.shift();
            thiz.status = 2;
            op(thiz.write_release);
        }

        while((thiz.status == 0 || thiz.status == 1)
            && thiz.wait_read.length > 0){
            const op = thiz.wait_read.shift();
            thiz.status = 1;
            thiz.reading++;
            op(thiz.read_release);
        }
    }

    thiz.read_release = () => {
        setImmediate(function(){
            thiz.reading--;
            if(thiz.reading == 0)
                thiz.status = 0;
            thiz.next();
        });
    }

    thiz.write_release = () => {
        setImmediate(function(){
            thiz.status = 0;
            thiz.next();
        });
    }
    
    thiz.rlock = (func) => {
        thiz.wait_read.push(func);
        thiz.next();
    }
    
    thiz.wlock = (func) => {
        thiz.wait_write.push(func);
        thiz.next();
    }
}

function AsyncMutex() {
    const thiz = this;
    thiz.mutex = new Mutex();
    
    thiz.lock_ = async (func, lock_func) => {
        return await new Promise(function(resolve, reject){
            lock_func(async function(release){
                let ret;
                let error = false;
                try{
                    ret = await func();
                }catch(err){
                    ret = err;
                    error = true;
                }
                release();
                
                if(error)
                    reject(ret);
                else
                    resolve(ret);
            });
        });
    }
    
    thiz.rlock = async (func) => {
        return await thiz.lock_(func, thiz.mutex.rlock);
    }
    
    thiz.wlock = async (func) => {
        return await thiz.lock_(func, thiz.mutex.wlock);
    }
}

$.mutex = () => {
    return new Mutex();
}

$.asyncMutex = () => {
    return new AsyncMutex();
}


async function test(){
    async function delay(ms){
        return await new Promise(function(resolve){
            setTimeout(resolve, ms);
        });
    }


    const l0 = $.asyncMutex();
    
    l0.rlock(async()=>{
        console.log('rr1');
        await delay(50);
        console.log('rr2');
        await delay(50);
        console.log('rr3');
        await delay(50);
    });

    l0.rlock(async()=>{
        console.log('rr4');
        await delay(50);
        console.log('rr5');
        await delay(50);
        console.log('rr6');
        await delay(50);
    });     

    (async()=> {
        try{
            await l0.wlock(async()=>{
                console.log('w1');
                await delay(50);
                console.log('w2');
                throw 333;
                await delay(50);
                console.log('w3');
                await delay(50);
            });
        }catch(err){
            console.log(err);
        }
    })();

    l0.wlock(async()=>{
        console.log('w4');
        await delay(50);
        console.log('w5');
        await delay(50);
        console.log('w6');
        await delay(50);
    });



    l0.rlock(async()=>{
        console.log('rr1');
        await delay(50);
        console.log('rr2');
        await delay(50);
        console.log('rr3');
        await delay(50);
    });

    l0.rlock(async()=>{
        console.log('rr4');
        await delay(50);
        console.log('rr5');
        await delay(50);
        console.log('rr6');
        await delay(50);
    });
}

//test();
//test();
module.exports = $;