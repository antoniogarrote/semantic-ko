asyncTest('testing simple binding',function(){
    var testData = "INSERT DATA { <http://test.com/about1> <http://test.com/title> 'a resource'}";
    var viewModel = {};

    jQuery(document).ready(function(){
        sko.ready(function(){
            sko.store.execute(testData, function(success, result){
                ok(success);
                sko.applyBindings('#test1', viewModel, function(){
                    ok(jQuery("#test1 p").text() === 'a resource');
                    // clean up
                    jQuery("#test1").remove();
                    start();
                });
            });
        });
    });
});


asyncTest('testing simple binding with model',function(){
    var testData = "INSERT DATA { <http://test.com/about1> <http://test.com/title> 'a resource'}";
    var viewModel = {'currentResource': '<http://test.com/about1>'};

    jQuery(document).ready(function(){
        sko.ready(function(){
            sko.store.execute(testData, function(success, result){
                ok(success);
                sko.applyBindings('#test2', viewModel, function(){
                    ok(jQuery("#test2 p").text() === 'a resource');
                    // clean up
                    jQuery("#test2").remove();
                    start();
                });
            });
        });
    });
});

asyncTest('testing simple binding with model observer',function(){
    var testData = "INSERT DATA { <http://test.com/about1> <http://test.com/title> 'a resource' .\
                                  <http://test.com/about2> <http://test.com/title> 'another value' }";
    var viewModel = {'currentResource': ko.observable('<http://test.com/about1>')};

    jQuery(document).ready(function(){
        sko.ready(function(){
            sko.store.execute(testData, function(success, result){
                ok(success);
                sko.applyBindings('#test3', viewModel, function(){
                    ok(jQuery("#test3 p").text() === 'a resource');
                    // clean up

                    viewModel.currentResource("<http://test.com/about2>");
                    ok(jQuery("#test3 p").text() === 'another value');
                    jQuery("#test3").remove();
                    start();
                });
            });
        });
        ok(true);    
    });
});

asyncTest('testing simple binding with model and property observer',function(){
    var testData = "INSERT DATA { <http://test.com/about1> <http://test.com/title1> 'a resource' ;\
                                                           <http://test.com/title2> 'another value' }";
    var viewModel = {'currentResource': ko.observable('<http://test.com/about1>'),
                     'propertyToShow': ko.observable('<http://test.com/title1>')};

    jQuery(document).ready(function(){
        sko.ready(function(){
            sko.store.execute(testData, function(success, result){
                ok(success);
                sko.applyBindings('#test4', viewModel, function(){
                    ok(jQuery("#test4 p").text() === 'a resource');
                    // clean up

                    viewModel.propertyToShow("<http://test.com/title2>");
                    ok(jQuery("#test4 p").text() === 'another value');
                    jQuery("#test4").remove();
                    start();
                });
            });
        });
    });
});


asyncTest('update store -> update view',function(){
    var testData = "INSERT DATA { <http://test.com/about1> <http://test.com/title> 'a resource'}";
    var viewModel = {};

    jQuery(document).ready(function(){
        sko.ready(function(){
            sko.store.execute(testData, function(success, result){
                ok(success);
                sko.applyBindings('#test5', viewModel, function(){
                    ok(jQuery("#test5 p").text() === 'a resource');
                    
                    sko.store.execute('DELETE { <http://test.com/about1> <http://test.com/title> ?title } \
                                       INSERT { <http://test.com/about1> <http://test.com/title> "changed in store" }\
                                       WHERE { <http://test.com/about1> <http://test.com/title> ?title }',
                                     function(success, results) {

                                         ok(success);

                                         ok(jQuery("#test5 p").text() === 'changed in store');

                                         // clean up
                                         jQuery("#test5").remove();
                                         start();
                                     });
                });
            });
        });
    });
});

asyncTest('update store -> update view (multi)',function(){
    var testData = "INSERT DATA { <http://test.com/about1> <http://test.com/title> 'a resource'}";
    var viewModel = {};

    jQuery(document).ready(function(){
        sko.ready(function(){
            sko.store.execute(testData, function(success, result){
                ok(success);
                sko.applyBindings('#test6', viewModel, function(){
                    ok(jQuery("#test6a p").text() === 'a resource');
                    ok(jQuery("#test6b p").text() === 'a resource');
                    
                    sko.store.execute('DELETE { <http://test.com/about1> <http://test.com/title> ?title } \
                                       INSERT { <http://test.com/about1> <http://test.com/title> "changed in store" }\
                                       WHERE { <http://test.com/about1> <http://test.com/title> ?title }',
                                     function(success, results) {

                                         ok(success);

                                         ok(jQuery("#test6a p").text() === 'changed in store');
                                         ok(jQuery("#test6b p").text() === 'changed in store');

                                         // clean up
                                         jQuery("#test6").remove();
                                         start();
                                     });
                });
            });
        });
    });
});

asyncTest('update view -> update store',function(){
    var testData = "INSERT DATA { <http://test.com/about1> <http://test.com/title> 'a resource'}";
    var viewModel = {};

    jQuery(document).ready(function(){
        sko.ready(function(){
            sko.store.execute(testData, function(success, result){
                ok(success);
                sko.applyBindings('#test7', viewModel, function(){
                    ok(jQuery("#test7 input").val() === 'a resource');
                    
                    jQuery("#test7 input").val("changed in view");
                    jQuery("#test7 input").trigger('change');

                    setTimeout(function(){
                        sko.store.execute("select ?o { <http://test.com/about1> <http://test.com/title> ?o }",function(success, results){
                            ok(success);
                            ok(results.length === 1);
                            ok(results[0].o.value === 'changed in view');
                       
                            jQuery("#test7").remove();
                            start();
                        });
                    },200)
                });
            });
        });
    });
});
