Utils = {};
Utils.stackCounterLimit = 1000;
Utils.stackCounter = 0;

Utils.recur = function(c){
    if(Utils.stackCounter === Utils.stackCounterLimit) {
        Utils.stackCounter = 0;
        setTimeout(c, 0);
    } else {
        Utils.stackCounter++;
        c();
    } 
};

Utils.repeat = function(c,max,floop,fend,env) {
    if(arguments.length===4) { env = {}; }
    if(c<max) {
        env._i = c;
        floop(function(floop,env){
            // avoid stack overflow
            // deadly hack
            Utils.recur(function(){ Utils.repeat(c+1, max, floop, fend, env); });
        },env);
    } else {
        fend(env);
    }
};

SemanticKnockOut = {};
window['sko'] = SemanticKnockOut;

/**
 * Starts the library. Call this before anything else.
 */
sko.init = function()  {
    var cb = null;
    if(arguments.length === 2) {
        sko.store = arguments[0];
        cb = arguments[1];

        cb(true);
    } else {
        cb = arguments[0];
        rdfstore.create(function(store) {
            sko.store = store;
            cb(true);
        });
    }
};

// Collection of observable resources
sko.aboutResourceMap = {};

sko.aboutCounter = 0;

sko.about = function(aboutValue, viewModel, cb) {
    var currentValue = sko.about[aboutValue];
    if(currentValue != null) {
        // returning an observable that was already registered for this node
        cb(aboutValue);
    } else {
        // the about value hasn't been registered yet

        // identifier
        var nextId = ''+sko.aboutCounter;
        sko.aboutCounter++;

        if(typeof(aboutValue) === 'string') {
        // the value is aconstant URI

            var uri = aboutValue;
            if(uri[0] === "<" && uri[uri.length-1] == ">") {
                uri = uri.slice(1,uri.length-1);
            }

            // register the new observer and resource
            sko.store.node(uri, function(success, resource) {
                if(success) {
                    // id -> Resource
                    sko.aboutResourceMap[nextId] = new sko.Resource(resource);
                    // id -> observer
                    sko.about[nextId] = ko.observable(uri);
     
                    // we observe changes in the about resource
                    sko.about[nextId].subscribe(function(nextUri) {
                        sko.store.node(nextUri, function(success, nextResource) {
                            if(success) {
                                var newUri = nextResource.toArray()[0].subject.valueOf();
                                sko.aboutResourceMap[nextId].about(newUri);
                            } else {
                                console.log("Error updating resource for URI:"+nextUri+" in SKO about node observer");
                            }
                        });
                    });
                } else {
                    // what here?
                }

                cb(nextId);
            });
        } else {
        // The value is a function (maybe an observer)
            sko.about[nextId] = ko.dependentObservable({
                read: function(){
                    var uri = aboutValue();
                    if(uri[0] === "<" && uri[uri.length-1] == ">") {
                        uri = uri.slice(1,uri.length-1);
                    }
                    return uri;
                },
                write: function(value) {
                    aboutValue(value);
                },
                owner: viewModel 
            });

            // register the new observer and resource
            sko.store.node(sko.about[nextId](), function(success, resource) {
                if(success) {
                    // id -> Resource
                    sko.aboutResourceMap[nextId] = new sko.Resource(resource);
     
                    // we observe changes in the about resource
                    sko.about[nextId].subscribe(function(nextUri) {
                        sko.store.node(nextUri, function(success, nextResource) {
                            if(success) {
                                if(nextResource.toArray().length>0) {
                                    var newUri = nextResource.toArray()[0].subject.valueOf();
                                    sko.aboutResourceMap[nextId].about(newUri);
                                } else {
                                    // reset resource?
                                }
                            } else {
                                console.log("Error updating resource for URI:"+nextUri+" in SKO about node observer");
                            }
                        });
                    });
                } else {
                    // what here?
                }
                cb(nextId);
            });
        }
    }
};

sko.rel = function(relValue, node, viewModel, cb) {
    var nextId = ''+sko.aboutCounter;
    var relValueUri = null;
    sko.aboutCounter++;

    if(typeof(relValue) === 'string') {
        var uri = relValue;
        if(uri[0] === "<" && uri[uri.length-1] == ">") {
            uri = uri.slice(1,uri.length-1);
        }
        relValueUri = uri;
        
        sko.about[nextId] = ko.dependentObservable({
            read: function(){
                var resource  = sko.currentResource(jQuery(node).parent().toArray()[0]);
                if(resource != null) {
                    console.log("*** Found parent resource: "+resource.about());
                    if(resource[uri]) {
                        var relResourceUri = resource[uri]();
                        
                        console.log("*** found related resource: "+relResourceUri);
                        // register the new observer and resource
                        sko.store.node(relResourceUri, function(success, resource) {
                            sko.aboutResourceMap[nextId] = new sko.Resource(resource);
                        });
                        
                        return relResourceUri;
                    } else {
                        console.log("!!! parent resource doest not link to the related resource");                    
                    }
                } else {
                    console.log("!!! impossible to find parent resource");
                }},

            // we setup the related object of the parent resource
            // this will trigger the observer that will update this model proxy
            write: function(uri) {
                if(uri[0] === "<" && uri[uri.length-1] == ">") {
                    uri = uri.slice(1,uri.length-1);
                }
                var resource  = sko.currentResource(jQuery(node).parent().toArray()[0]);

                if(resource != null) {
                    console.log("*** Found parent resource: "+resource.about());
                    if(resource[relValueUri]) {
                        console.log("*** Setting new related resource in parent resource found: "+uri);                    
                        resource[relValueUri](uri);
                    } else {
                        console.log("!!! parent resource doest not link to the related resource");                    
                    }
                } else {
                    console.log("!!! impossible to find parent resource");
                }                
            },

            owner: viewModel
        });

        sko.about[nextId].subscribe(function(nextUri) {
            console.log("!!! change in related resource URI");
            sko.store.node(nextUri, function(success, nextResource) {
                if(success) {
                    var newUri = nextResource.toArray()[0].subject.valueOf();
                    sko.aboutResourceMap[nextId].about(newUri);
                } else {
                    console.log("Error updating resource for URI:"+nextUri+" in SKO about related node observer");
                }
            });
        });

    } else {
        sko.about[nextId] = ko.dependentObservable({
            read: function(){
                var uri = relValue();
                
                var resource  = sko.currentResource(jQuery(node).parent().toArray()[0]);
                if(resource != null) {
                    console.log("*** Found parent resource: "+resource.about());
                    if(resource[uri]) {
                        var relResourceUri = resource[uri]();
                    
                        console.log("*** found related resource: "+relResourceUri);
                        // register the new observer and resource
                        sko.store.node(relResourceUri, function(success, resource) {
                            sko.aboutResourceMap[nextId] = new sko.Resource(resource);
                        });

                        return relResourceUri;
                    } else {
                        console.log("!!! parent resource doest not link to the related resource");                    
                    }
                } else {
                    console.log("!!! impossible to find parent resource");
                }
            },

            // we setup the related object of the parent resource
            // this will trigger the observer that will update this model proxy
            write: function(uri) {
                if(uri[0] === "<" && uri[uri.length-1] == ">") {
                    uri = uri.slice(1,uri.length-1);
                }
                var resource  = sko.currentResource(jQuery(node).parent().toArray()[0]);

                if(resource != null) {
                    console.log("*** Found parent resource: "+resource.about());
                    if(resource[relValue()]) {
                        console.log("*** Setting new related resource in parent resource found: "+uri);                    
                        resource[relValue()](uri);
                        relValue(uri);
                    } else {
                        console.log("!!! parent resource doest not link to the related resource");                    
                    }
                } else {
                    console.log("!!! impossible to find parent resource");
                }                
            },

            owner: viewModel
        });

        sko.about[nextId].subscribe(function(nextUri) {
            console.log("!!! change in related resource URI");
            sko.store.node(nextUri, function(success, nextResource) {
                if(success) {
                    var newUri = nextResource.toArray()[0].subject.valueOf();
                    sko.aboutResourceMap[nextId].about(newUri);
                } else {
                    console.log("Error updating resource for URI:"+nextUri+" in SKO about related node observer");
                }
            });
        });
    }

    cb(nextId);
};

sko.Resource = function(node) {
    this.valuesMap = {};
    var that = this;
    node.forEach(function(triple){
        that.valuesMap[triple.predicate.valueOf()] = triple.object.valueOf();
        that[triple.predicate.valueOf()] = ko.observable(triple.object.valueOf());
    });
    this.about = ko.observable(node.toArray()[0]['subject'].valueOf());
    this.storeObserverFn = sko.Resource.storeObserver(this);

    // observe changes in the subject of this resource
    var that = this;
    this.about.subscribe(function(newUri){
        console.log("SKO Resource new resource:"+newUri);
        sko.store.stopObservingNode(that.storeObserverFn);
        sko.store.startObservingNode(newUri, that.storeObserverFn);
    });
    
    // observe notifications from KO and the RDF store
    sko.Resource.koObserver(this);
    sko.store.startObservingNode(this.about(), that.storeObserverFn);
};

/**
 * Must update the value in the RDFstore
 */
sko.Resource.prototype.notifyPropertyChange = function(property, newValue) {
    console.log("*** received KO notification for property "+property+" -> "+newValue);
    if(this.valuesMap[property] == null) {
        // property is not defined -> create
    } else {
        if(this.valuesMap[property] !== newValue) {
            // property is already present and the value has changed -> update

            var query = "DELETE { <"+this.about()+"> <"+property+"> \""+this.valuesMap[property]+"\" }";
            query = query + " INSERT { <"+this.about()+"> <"+property+"> \""+newValue+"\" }";
            query = query + " WHERE { <"+this.about()+"> <"+property+"> \""+this.valuesMap[property]+"\" }"; 

            this.valuesMap[property] = newValue;
            console.log("*** updating STORE: \n  "+query);
            sko.store.execute(query);
        }
    }
};

sko.Resource.koObserver = function(skoResource) {
    var makeResourceObserver = function(resource,property) {
        console.log("*** subcribing to property "+property);
        resource[property].subscribe(function(value){
            resource.notifyPropertyChange(property,value);
        });
    };

    for(var p in skoResource.valuesMap) {
        makeResourceObserver(skoResource,p);
    }
};

sko.Resource.storeObserver = function(skoResource) {
    return function(node)  {
        console.log("*** received notification change from STORE in resource "+skoResource.about());
        var newValues = {};

        node.forEach(function(triple){
            console.log(" "+triple.predicate.valueOf()+" -> "+triple.object.valueOf());
            newValues[triple.predicate.valueOf()]  = triple.object.valueOf();
        });

        var newValueMap = {};
        var toNullify = [];
        var toUpdate = [];
        var toCreate = [];

        // what has changed?, what need to be removed?
        for(var p in skoResource.valuesMap) {
            if(newValues[p] != null) {
                newValueMap[p] = newValues[p];
                toUpdate.push(p);
            } else {
                toNullify.push(p);
            }
        }

        // what is new?
        for(var p in newValues) {
            if(skoResource.valuesMap[p] == null) {
                toCreate.push(p);
                newValueMap[p] = newValues[p];
            }
        }

        // updateValues
        skoResource.valuesMap = newValueMap;

        for(var i=0; i<toNullify.length; i++) {
            skoResource[toNullify[i]](null);
        }

        for(var i=0; i<toUpdate.length; i++) {
            skoResource[toUpdate[i]](skoResource.valuesMap[toUpdate[i]]);
        }

        for(var i=0; i<toCreate.length; i++) {
            skoResource[toCreate[i]] =  ko.observable(skoResource.valuesMap[toCreate[i]]);
        }
    };    
};

// custom bindings

ko.bindingHandlers.about = {
    init: function(element, valueAccessor, allBindingsAccessor, viewModel) {
        // This will be called when the binding is first applied to an element
        // Set up any initial state, event handlers, etc. here

        var value = valueAccessor();
        $(element).attr("about", value);
    },
    
    update: function(element, valueAccessor, allBindingsAccessor, viewModel) {
        // This will be called once when the binding is first applied to an element,
        // and again whenever the associated observable changes value.
        // Update the DOM element based on the supplied values here.

        var value = valueAccessor();
        $(element).attr("about", value);
    }
};


// trace resources
sko.traceResources = function(rootNode, model, cb) {
    var nodes = [];
    if(jQuery(rootNode).attr("about") || jQuery(rootNode).attr("data-bind")) {
        nodes.push(rootNode);
    }
    var childNodes = jQuery(rootNode).find("*[about], *[data-bind]").toArray();
    nodes = nodes.concat(childNodes);
    var registerFn = function(k,env){
        node = nodes[env._i];
        var about = jQuery(node).attr("about");
        var databind;

        if(about == null) {
            dataBind = jQuery(node).attr("data-bind");
            if(dataBind != null) {
                if(dataBind.indexOf("about:") != -1) {
                    var re = new RegExp("\s*([^ ]+)\s*,?");
                    about = re.exec(dataBind.split("about:")[1])[0];
                    if(about[about.length-1] === ',') {
                        about = about.slice(0,about.length-1);
                    }
                }
            }
        }

        if(about != null) {
            if(typeof(about) === 'string' && about[0] !== '<' && about[about.length-1] !== '>') {
                about = model[about];
            }
   
            sko.about(about, model, function(aboutId) {
                jQuery(node).attr('aboutId',aboutId);
                k(registerFn,env);
            });
        }

        
    };

    Utils.repeat(0,nodes.length, registerFn, function(env) {
        cb();
    });
};

/**
 * This function must be called *after* traceResources has been
 * invoked.
 */
sko.currentResource = function(node) {
    console.log("in current resource");
    if(node == null) {
        console.log("!!! top of DOM tree, About node not found");
        return null;
    }
    var aboutId = jQuery(node).attr('aboutId');
    console.log("about id:"+aboutId);

    if(aboutId) {
        var uri = sko.about[aboutId]();
        console.log("uri:"+uri);
        if(uri != null) {
            return sko.aboutResourceMap[aboutId];
        } else {
            console.log("!!! current resource is null: "+aboutId);
        }
    } else {
        console.log("recurring");
        return sko.currentResource(jQuery(node).parent().toArray()[0]);
    }
};

sko.traceRelations = function(rootNode, model, cb) {
    var nodes = [];
    if(jQuery(rootNode).attr("rel") || jQuery(rootNode).attr("data-bind")) {
        nodes.push(rootNode);
    }
    var childNodes = jQuery(rootNode).find("*[rel], *[data-bind]").toArray();
    nodes = nodes.concat(childNodes);
    var registerFn = function(k,env){
        node = nodes[env._i];
        var rel = jQuery(node).attr("rel");
        var databind;

        if(rel == null) {
            dataBind = jQuery(node).attr("data-bind");
            if(dataBind != null) {
                if(dataBind.indexOf("rel:") != -1) {
                    var re = new RegExp("\s*([^ ]+)\s*,?");
                    rel = re.exec(dataBind.split("rel:")[1])[0];
                    if(rel[rel.length-1] === ',') {
                        rel = rel.slice(0,rel.length-1);
                    }
                }
            }
        }

        if(rel != null) {
            if(typeof(rel) === 'string' && rel[0] !== '<' && rel[rel.length-1] !== '>') {
                rel = model[rel];
            }
   
            sko.rel(rel, node, model, function(aboutId) {
                jQuery(node).attr('aboutId',aboutId);
                k(registerFn,env);
            });
        }

        
    };

    Utils.repeat(0,nodes.length, registerFn, function(env) {
        cb();
    });
};
