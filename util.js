var $ = {};
module.exports = $;


$.defer_list = function(){
    var thiz = this;
    var list = [];
    
    thiz.add = function(resolve, reject){
        list.push({resolve: resolve, reject: reject});
    }
    
    thiz.resolve = function(value){
        var the_list = list;
        list = [];
        for(var i = 0; i < the_list.length; ++i)
            the_list[i].resolve(value);
    }

    thiz.reject = function(value){
        var the_list = list;
        list = [];
        for(var i = 0; i < the_list.length; ++i)
            the_list[i].reject(value);
    }
}

$.hrtime = function(time){
    var diff = process.hrtime(time);
    var ms = diff[0] * 1e3 + diff[1] / 1e3;
    return ms;
}



