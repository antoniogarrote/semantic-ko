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


asyncTest('simple related',function(){
    var testData = "INSERT DATA { <http://test.com/about1> <http://test.com/title> 'a resource' . \
                                  <http://test.com/about1> <http://test.com/related> <http://test.com/about2> .\
                                  <http://test.com/about2> <http://test.com/title> 'related resource' }";
    var viewModel = {};

    jQuery(document).ready(function(){
        sko.ready(function(){
            sko.store.execute(testData, function(success, result){
                ok(success);
                sko.applyBindings('#test8', viewModel, function(){
                    ok(jQuery("#parent-text").text() === 'a resource');
                    ok(jQuery("#related-text").text() ==="related resource");
                    jQuery("#test8").remove();
                    start();
                });
            });
        });
    });
});

asyncTest('related binding with model',function(){
    var testData = "INSERT DATA { <http://test.com/about1> <http://test.com/title> 'a resource' . \
                                  <http://test.com/about1> <http://test.com/related> <http://test.com/about2> .\
                                  <http://test.com/about2> <http://test.com/title> 'related resource' }";

    var viewModel = {'currentResource': ko.observable('<http://test.com/about1>'),
                     'relatedToShow': ko.observable('<http://test.com/related>')};

    jQuery(document).ready(function(){
        sko.ready(function(){
            sko.store.execute(testData, function(success, result){
                ok(success);
                sko.applyBindings('#test9', viewModel, function(){
                    ok(jQuery("#parent-text9").text() === 'a resource');
                    ok(jQuery("#related-text9").text() ==="related resource");

                    jQuery("#test9").remove();
                    start();
                });
            });
        });
    });
});

asyncTest('changing subject of related',function(){
    var testData = "INSERT DATA { <http://test.com/about1> <http://test.com/title> 'a resource' . \
                                  <http://test.com/about1> <http://test.com/related> <http://test.com/about2> .\
                                  <http://test.com/about2> <http://test.com/title> 'related resource'. \
                                  <http://test.com/about3> <http://test.com/title> 'a resource 3' . \
                                  <http://test.com/about3> <http://test.com/related> <http://test.com/about4> .\
                                  <http://test.com/about4> <http://test.com/title> 'related resource 4' }";

    var viewModel = {'currentResource': ko.observable('<http://test.com/about1>'),
                     'relatedToShow': ko.observable('<http://test.com/related>')};

    jQuery(document).ready(function(){
        sko.ready(function(){
            sko.store.execute(testData, function(success, result){
                ok(success);
                sko.applyBindings('#test10', viewModel, function(){

                    ok(jQuery("#parent-text-10").text() === 'a resource');
                    ok(jQuery("#related-text-10").text() ==="related resource");

                    viewModel.currentResource("<http://test.com/about3>");

                    ok(jQuery("#parent-text-10").text() === 'a resource 3');
                    ok(jQuery("#related-text-10").text() ==="related resource 4");

                    jQuery("#test10").remove();
                    start();
                });
            });
        });
    });
});

asyncTest('changing related of related',function(){
    var testData = "INSERT DATA { <http://test.com/about1> <http://test.com/title> 'a resource' . \
                                  <http://test.com/about1> <http://test.com/related> <http://test.com/about2> .\
                                  <http://test.com/about2> <http://test.com/title> 'related resource'. \
                                  <http://test.com/about4> <http://test.com/title> 'related resource 4' }";

    var viewModel = {'currentResource': ko.observable('<http://test.com/about1>'),
                     'relatedToShow': ko.observable('<http://test.com/related>')};

    jQuery(document).ready(function(){
        sko.ready(function(){
            sko.store.execute(testData, function(success, result){
                ok(success);
                sko.applyBindings('#test11', viewModel, function(){

                    ok(jQuery("#parent-text-11").text() === 'a resource');
                    ok(jQuery("#related-text-11").text() ==="related resource");

                    sko.resource("#the-resource-11")['<http://test.com/related>']('<http://test.com/about4>');

                    ok(jQuery("#parent-text-11").text() === 'a resource');
                    ok(jQuery("#related-text-11").text() ==="related resource 4");

                    sko.store.execute("SELECT ?o WHERE { <http://test.com/about1> <http://test.com/related> ?o}", 
                                      function(success, results){
                                          ok(results.length===1);
                                          ok(results[0].o.value === "http://test.com/about4");
                                          jQuery("#test11").remove();
                                          start();
                                      });
                });
            });
        });
    });
});


asyncTest('Anonymous graph bound to node',function(){
    var testData = "INSERT DATA { <http://test.com/about1> <http://test.com/title> 'a resource'  }";

    var viewModel = {'currentResource': ko.observable(null)};

    jQuery(document).ready(function(){
        sko.ready(function(){
            sko.store.execute(testData, function(success, result){
                ok(success);
                sko.applyBindings('#test12', viewModel, function(){

                    ok(jQuery("#text-input-12").val() === '');
                    ok(sko.resource("#the-resource-12").about().indexOf("_:sko")==0);
                    ok(sko.resource("#the-resource-12")['<http://test.com/title>']()==null);

                    jQuery("#text-input-12").val("changed in view");
                    jQuery("#text-input-12").trigger('change');

                    ok(sko.resource("#the-resource-12")['<http://test.com/title>']()=='changed in view');
                    jQuery("#test12").remove();
                    start();
                });
            });
        });
    });
});

asyncTest('Simple curies bindings',function(){
    var testData = "INSERT DATA { <http://test.com/about1> <http://test.com/title> 'a resource'  }";

    var viewModel = {};

    jQuery(document).ready(function(){
        sko.ready(function(){

            sko.rdf.prefixes.set("test", "http://test.com/");

            sko.store.execute(testData, function(success, result){
                ok(success);
                sko.applyBindings('#test13', viewModel, function(){
                    ok(jQuery("#test13 p").text() === 'a resource');
                    jQuery("#test13").remove();
                    start();
                });
            });
        });
    });
});

asyncTest('Complex curies bindings',function(){
    var testData = "INSERT DATA { <http://test.com/about1> <http://test.com/title> 'a resource' . \
                                  <http://test.com/about1> <http://test.com/related> <http://test.com/about2> .\
                                  <http://test.com/about2> <http://test.com/title> 'related resource' }";

    var viewModel = {'currentResource': ko.observable('[test:about1]'),
                     'relatedToShow': ko.observable('[test:related]')};

    jQuery(document).ready(function(){
        sko.ready(function(){
            sko.rdf.prefixes.set("test", "http://test.com/");
            sko.store.execute(testData, function(success, result){
                ok(success);
                sko.applyBindings('#test14', viewModel, function(){
                    ok(jQuery("#parent-text14").text() === 'a resource');
                    ok(jQuery("#related-text14").text() ==="related resource");

                    jQuery("#test14").remove();
                    start();
                });
            });
        });
    });
});


asyncTest('rendering template',function(){
    var testData = "INSERT DATA { <http://test.com/about1> <http://test.com/title> 'a resource' . \
                                  <http://test.com/about1> <http://test.com/related1> <http://test.com/about2> .\
                                  <http://test.com/about2> <http://test.com/title> 'related resource 1'.\
                                  <http://test.com/about1> <http://test.com/related2> <http://test.com/about3> .\
                                  <http://test.com/about3> <http://test.com/title> 'related resource 2' }";

    var viewModel = {'currentResource': ko.observable('[test:about1]'),
                     'selectedTemplate': ko.observable('1')};

    jQuery(document).ready(function(){
        sko.ready(function(){
            //sko.activeDebug = true;
            sko.rdf.prefixes.set("test", "http://test.com/");
            sko.store.execute(testData, function(success, result){
                ok(success);
                sko.applyBindings('#test15', viewModel, function(){

                    ok(jQuery("#the-related-thing-15 p").text() === 'related resource 1');

                    viewModel.selectedTemplate('2')

                    ok(jQuery("#the-related-thing-15 p").text() === 'related resource 2');

                    jQuery("#test15").remove();
                    start();
                });
            });
        });
    });
});

asyncTest('changing resource rendered with template',function(){
    var testData = "INSERT DATA { <http://test.com/about1> <http://test.com/title> 'a resource' . \
                                  <http://test.com/about1> <http://test.com/related1> <http://test.com/about2> .\
                                  <http://test.com/about2> <http://test.com/title> 'related resource 1'.\
                                  <http://test.com/about1> <http://test.com/related2> <http://test.com/about3> .\
                                  <http://test.com/about3> <http://test.com/title> 'related resource 2' .\
                                  <http://test.com/about4> <http://test.com/title> 'a resource' . \
                                  <http://test.com/about4> <http://test.com/related1> <http://test.com/about5> .\
                                  <http://test.com/about5> <http://test.com/title> 'related resource 3'.\
                                  <http://test.com/about4> <http://test.com/related2> <http://test.com/about6> .\
                                  <http://test.com/about6> <http://test.com/title> 'related resource 6'}";

    var viewModel = {'currentResource': ko.observable('[test:about1]'),
                     'selectedTemplate': ko.observable('1')};

    jQuery(document).ready(function(){
        sko.ready(function(){
            sko.rdf.prefixes.set("test", "http://test.com/");
            sko.store.execute(testData, function(success, result){
                ok(success);
                sko.applyBindings('#test16', viewModel, function(){

                    ok(jQuery("#the-related-thing-16 p").text() === 'related resource 1');

                    viewModel.currentResource("[test:about4]")

                    ok(jQuery("#the-related-thing-16 p").text() === 'related resource 3');

                    jQuery("#test16").remove();
                    start();
                });
            });
        });
    });
});

asyncTest('generator where',function(){
    var testData = "INSERT DATA { <http://test.com/items/wittgenstein> <http://test.com/named> 'Wittgenstein' .\
                                  <http://test.com/items/russell> <http://test.com/named> 'Russell' .\
                                  <http://test.com/items/adorno> <http://test.com/named> 'Adorno' .\
                                  <http://test.com/items/popper> <http://test.com/named> 'Popper'}";

    var viewModel = {};

    jQuery(document).ready(function(){
        sko.ready(function(){
            sko.rdf.prefixes.set("test", "http://test.com/");
            sko.store.execute(testData, function(success, result){
                ok(success);
                sko.applyBindings('#test17', viewModel, function(){

                    ok(jQuery("#test17 li").toArray().length===4)
                    jQuery("#test17 li[about]").map(function(i,e){ 
                        ok(jQuery(this).attr('about').indexOf(jQuery(this).text().toLowerCase()) != -1);
                    });


                    sko.store.execute("insert data { <http://test.com/items/hume> <http://test.com/named> 'Hume' }", function(success, results){
                        ok(success);

                        ok(jQuery("#test17 li").toArray().length===5)                        
                        
                        jQuery("#test17").remove();
                        start();
                    });
                });
            });
        });
    });
});

asyncTest('testing simple binding with model and language',function(){
    var testData = "INSERT DATA { <http://test.com/about1> <http://test.com/title> 'a resource'@en .\
                                 <http://test.com/about1> <http://test.com/title> 'un recurso'@es }";
    var viewModel = {'currentResource': '<http://test.com/about1>'};

    jQuery(document).ready(function(){
        sko.ready(function(){
            sko.defaultLanguage = ko.observable("es");
            sko.store.execute(testData, function(success, result){
                ok(success);
                sko.applyBindings('#test18', viewModel, function(){
                    ok(jQuery("#test18 p").text() === 'un recurso');
                    // clean up
                    jQuery("#test18").remove();
                    sko.defaultLanguage(null);
                    start();
                });
            });
        });
    });
});

asyncTest('testing simple binding with model and language 2',function(){
    var testData = "INSERT DATA { <http://test.com/about1> <http://test.com/title> 'a resource'@en .\
                                  <http://test.com/about1> <http://test.com/title> 'un recurso' }";
    var viewModel = {'currentResource': '<http://test.com/about1>'};

    jQuery(document).ready(function(){
        sko.ready(function(){
            sko.defaultLanguage = ko.observable(null);
            sko.store.execute(testData, function(success, result){
                ok(success);
                sko.applyBindings('#test19', viewModel, function(){
                    ok(jQuery("#test19 p").text() === 'un recurso');
                    // clean up
                    jQuery("#test19").remove();
                    sko.defaultLanguage(null);
                    start();
                });
            });
        });
    });
});

asyncTest('testing decorated property',function(){
    var testData = "INSERT DATA { <http://test.com/about1> <http://test.com/title> 'a resource' .\
                                  <http://test.com/about2> <http://test.com/title> 'another resource'}";
    var viewModel = {'currentResource': ko.observable('<http://test.com/about1>')};

    jQuery(document).ready(function(){
        sko.ready(function(){
            sko.rdf.prefixes.set("test", "http://test.com/");
            sko.defaultLanguage = ko.observable(null);
            sko.store.execute(testData, function(success, result){
                ok(success);
                sko.applyBindings('#test20', viewModel, function(){
                    ok(jQuery("#test20 p").text() === 'GOT:a resource');

                    viewModel.currentResource("<http://test.com/about2>");
                    ok(jQuery("#test20 p").text() === 'GOT:another resource');
                    // clean up
                    jQuery("#test20").remove();
                    sko.defaultLanguage(null);
                    start();
                });
            });
        });
    });
});


asyncTest('testing decorated property 2',function(){
    var testData = "INSERT DATA { <http://test.com/about1> <http://test.com/title> 'a resource' .\
                                  <http://test.com/about2> <http://test.com/title> 'another resource'}";
    var viewModel = {'currentResource': ko.observable('<http://test.com/about1>'),
                     'computedTitle': function() { return sko.current().prop("[test:title]")() }};

    jQuery(document).ready(function(){
        sko.ready(function(){
            sko.rdf.prefixes.set("test", "http://test.com/");
            sko.defaultLanguage = ko.observable(null);
            sko.store.execute(testData, function(success, result){
                ok(success);
                sko.applyBindings('#test21', viewModel, function(){
                    ok(jQuery("#test21 p").text() === 'GOT:a resource');

                    viewModel.currentResource("<http://test.com/about2>");
                    ok(jQuery("#test21 p").text() === 'GOT:another resource');
                    // clean up
                    jQuery("#test21").remove();
                    sko.defaultLanguage(null);
                    start();
                });
            });
        });
    });
});


asyncTest('testing classes registry', function() {
    jQuery(document).ready(function(){
        sko.ready(function(){
            sko.Class.define("[foaf:Person]",
                             {'decoratedName': function(){ return 'testDecoratedName' },
                              'plainPersonProperty': 'testPerson',
                              'thisFunction':  function(){ return this.plainProperty  },
                              'extended'    :function() { this.extendedTest = true }  });

            var test = {'plainProperty': 'test',
                        'plainFunction': function() { return 'plainFunction' } };

            var instance = sko.Class.instance("[foaf:Person]", test);
            var instance2 = sko.Class.instance("[foaf:Person]", {});

            instance2.plainPersonProperty = 'test2';
            ok(instance.decoratedName() === 'testDecoratedName');
            ok(instance.plainFunction() === 'plainFunction');
            ok(instance.plainProperty === 'test');
            ok(instance2.plainProperty == null);
            ok(instance.thisFunction() === 'test');
            ok(instance2.thisFunction() == null);
            ok(instance.plainPersonProperty === 'testPerson');
            ok(instance2.plainPersonProperty === 'test2');
            ok(instance.extendedTest === true);
            ok(instance2.extendedTest === true);
            start();
        });
    });
});


asyncTest('testing classes registry 2', function() {
    var testData = "INSERT DATA { <http://test.com/about1> a <http://xmlns.com/foaf/0.1/Person> .\
                                  <http://test.com/about1> <http://xmlns.com/foaf/0.1/name> 'Juan'.\
                                  <http://test.com/about1> a <http://test.com/TestClass>.\
                                  <http://test.com/about1> <http://xmlns.com/foaf/0.1/primaryTopic> <http://en.wikipedia.org/wiki/Juan_Castillo>}";
    var viewModel = {'currentResource': ko.observable('<http://test.com/about1>')};

    jQuery(document).ready(function(){
        sko.ready(function(){
            sko.rdf.prefixes.set("test", "http://test.com/");
            sko.Class.define("ObjectIntersectionOf([foaf:Person],[test:TestClass])",
                             {'computedName': function(){ return 'mr. ' + this.getProp("[foaf:name]") } });

            sko.Class.define("ObjectSomeValuesFrom([foaf:primaryTopic])",
                             {'computedTopic': function(){ return sko.plainUri(this.getProp("[foaf:primaryTopic]")) } });

            sko.store.execute(testData, function(success, result){
                ok(success);
                sko.applyBindings('#test24', viewModel, function(){
                    ok(jQuery("#test24prop1").text() === 'mr. Juan');
                    ok(jQuery("#test24prop2").attr('href') === 'http://en.wikipedia.org/wiki/Juan_Castillo');
                    
                    // clean up
                    jQuery("#test24").remove();

                    start();
                });
            });
        });
    });
});

asyncTest('testing additional properties', function() {
    var testData = "INSERT DATA { <http://test.com/about1> a <http://xmlns.com/foaf/0.1/Person> .\
                                  <http://test.com/about1> <http://xmlns.com/foaf/0.1/name> 'Juan' }";
    var viewModel = {'currentResource': ko.observable('<http://test.com/about1>')};

    jQuery(document).ready(function(){
        sko.ready(function(){
            sko.rdf.prefixes.set("test", "http://test.com/");

            sko.store.execute(testData, function(success, result){
                ok(success);
                sko.applyBindings('#test25', viewModel, function(){
                    setTimeout(function(){                    
                        jQuery("#test25prop2").val('new value');
                        jQuery("#test25prop2").trigger('change');
                        ok(jQuery("#test25prop2").val() === 'new value');
                        setTimeout(function(){                    
                            sko.store.execute("SELECT ?data { <http://test.com/about1> <http://test.com/value> ?data }", function(res, data) {
                                ok(data[0].data.value === 'new value');
                                // clean up
                                jQuery("#test25").remove();
                                start();
                            });
                        },200);
                    },200);
                });
            });
        });
    });
});

asyncTest('testing bindings inside templates', function() {
    var testData = "INSERT DATA { <http://test.com/about26> a <http://xmlns.com/foaf/0.1/Person> .\
                                  <http://test.com/about26> <http://xmlns.com/foaf/0.1/name> 'Juan' }";

    var viewModel = {'currentResource': ko.observable('<http://test.com/about>')};
    
    viewModel.webidProperties = ko.dependentObservable(function(){
        try {
            console.log("WEBID PROPS!");
                var acum = [];
                sko.store.execute("SELECT ?p ?o { "+viewModel.currentResource()+" ?p ?o }", function(succ, triples) {
                    for(var i=0; i<triples.length; i++) {
                        acum.push({prop:triples[i].p.value, val:triples[i].o.value});
                    }
                    console.log(acum);
                    console.log("returning "+acum.length+" props");
                });
                
                return acum;
        } catch(e) { 
            return [];
        }
    });

    jQuery(document).ready(function(){
        sko.ready(function(){
            sko.rdf.prefixes.set("test", "http://test.com/");

            sko.store.execute(testData, function(success, result){
                viewModel.currentResource("<http://test.com/about26>")
                ok(success);

                sko.applyBindings('#test26', viewModel, function(){
                    var vals = jQuery("#test26 td.bound-prop").contents();
                    ok(vals.length === 2);
                    ok(vals[0].nodeValue === "<http://xmlns.com/foaf/0.1/Person>");
                    ok(vals[1].nodeValue === "Juan");
                    start();

                    // clean up
                    jQuery("#test26").remove();
                });
            });
        });
    });

    asyncTest('test null values in properties',function(){
        var testData = "INSERT DATA { <http://test.com/about1> <http://test.com/title> 'a resource'}";
        var viewModel = {};

        jQuery(document).ready(function(){
            sko.ready(function(){
                sko.store.execute(testData, function(success, result){
                    ok(success);
                    sko.applyBindings('#test27', viewModel, function(){
                        ok(jQuery("#test27 p.present").text() === 'a resource');
                        ok(jQuery("#test27 p.nullified").text() === '');
                        sko.store.execute('INSERT DATA { <http://test.com/about1> <http://test.com/property> "property value" }',
                            function(success, results) {

                                ok(success);

                                ok(jQuery("#test27 p.present").text() === 'a resource');
                                ok(jQuery("#test27 p.nullified").text() === 'property value');

                                // clean up
                                jQuery("#test27").remove();
                                start();
                            });
                    });
                });
            });
        });
    });

    asyncTest('test URIs inside complex binding expressions',function(){
        var testData = "INSERT DATA { <http://test.com/about1> <http://test.com/title> 'a resource' ." +
                       "<http://test.com/about1> <http://test.com/dst> <http://destination.com> }";
        var viewModel = {};

        jQuery(document).ready(function(){
            sko.ready(function(){
                sko.rdf.prefixes.set("test", "http://test.com/");
                sko.store.execute(testData, function(success, result){
                    ok(success);
                    sko.applyBindings('#test28', viewModel, function(){
                        ok(jQuery("#test28 a.present").text() === 'a resource');
                        ok(jQuery("#test28 a.present").attr("href") === 'http://destination.com');
                        jQuery("#test28").remove();
                        start();
                    });
                });
            });
        });
    });
});