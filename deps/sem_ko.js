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

// blank IDs counter
sko._blankCounter = 0;
sko.nextBlankLabel = function(){
    var blankLabel = "_:sko_"+sko._blankCounter;
    sko._blankCounter++;
    return blankLabel;
}

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

        // this is a blank node
        if(aboutValue == null) {
            aboutValue = sko.nextBlankLabel();
        }

        if(typeof(aboutValue) === 'string') {
        // the value is aconstant URI

            var uri = aboutValue;

            // register the new observer and resource
            sko.store.node(sko.plainUri(uri), function(success, resource) {
                if(success) {
                    // id -> Resource
                    sko.aboutResourceMap[nextId] = new sko.Resource(uri,resource);
                    // id -> observer
                    sko.about[nextId] = ko.observable(uri);
     
                    // we observe changes in the about resource
                    sko.about[nextId].subscribe(function(nextUri) {
                        console.log("*** OBSERVING NODE ABOT ID:"+nextId+" new value -> "+nextUri);

                        if(nextUri == null) {
                            console.log(" ** NEXT URI IS NULL, GEN BLANK LABEL");
                            nextUri = sko.nextBlankLabel();
                        }

                        sko.store.node(sko.plainUri(nextUri), function(success, nextResource) {
                            if(success) {
                                var newUri = nextResource.toArray()[0].subject.valueOf();
                                sko.aboutResourceMap[nextId].about(newUri);
                            } else {
                                // reset resource?
                                console.log("*** NO RESOURCE FOR URI:"+nextUri);
                                sko.aboutResourceMap[nextId].about(nextUri);
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
                    console.log("*** OBSERVABLE READING DEPENDING NODE ABOT ID:"+nextId+" new value -> "+uri);

                    if(uri == null) {
                        console.log(" ** URI IS BLANK -> GEN BLANK LABEL");
                        uri = sko.nextBlankLabel();
                    }

                    return uri;
                },
                write: function(value) {
                    console.log("*** OBSERVABLE WRITING DEPENDING NODE ABOT ID:"+nextId+" new value -> "+value);
                    if(value == null) {
                        console.log(" ** URI IS BLANK -> GEN BLANK LABEL");
                        value = sko.nextBlankLabel();
                    }

                    aboutValue(value);
                },
                owner: viewModel 
            });

            // register the new observer and resource
            sko.store.node(sko.plainUri(sko.about[nextId]()), function(success, resource) {
                if(success) {
                    // id -> Resource
                    sko.aboutResourceMap[nextId] = new sko.Resource(sko.about[nextId](), resource);
     
                    // we observe changes in the about resource
                    sko.about[nextId].subscribe(function(nextUri) {
                        console.log("*** OBSERVING NODE ABOT ID:"+nextId+" new value -> "+nextUri);
                        if(nextUri != null) {
                            sko.store.node(sko.plainUri(nextUri), function(success, nextResource) {
                                if(success) {
                                    if(nextResource.toArray().length>0) {
                                        var newUri = nextResource.toArray()[0].subject.toNT();
                                        sko.aboutResourceMap[nextId].about(newUri);
                                    } else {
                                        // reset resource?
                                        console.log("*** NO RESOURCE FOR URI:"+nextUri);
                                        sko.aboutResourceMap[nextId].about(nextUri);
                                    }
                                } else {
                                    console.log("Error updating 3 resource for URI:"+nextUri+" in SKO about node observer");
                                    console.log("*** NO RESOURCE FOR URI:"+nextUri + " NEXT ID:"+nextId);
                                    sko.aboutResourceMap[nextId].about(nextUri);
                                }
                            });
                        } else {
                            console.log("*** NO RESOURCE FOR URI:"+nextUri);
                            sko.aboutResourceMap[nextId].about(sko.nextBlankLabel());
                        }
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
        relValueUri = uri;
        
        sko.about[nextId] = ko.dependentObservable({
            read: function(){
                console.log("*** OBSERVABLE READING RELATED  DEPENDING NODE ABOT ID:"+nextId);
                var resource  = sko.currentResource(jQuery(node).parent().toArray()[0]);
                console.log(" ** about:"+resource.about());
                console.log(resource);                
                if(resource != null) {
                    console.log("*** Found parent resource: "+resource.about());

                    if(resource[uri]) {
                        var relResourceUri = resource[uri]();
                        if(relResourceUri != null && !sko.isSKOBlankNode(resource[uri]())) {
                            console.log("*** found related resource: "+relResourceUri);
                            // register the new observer and resource
                            sko.store.node(sko.plainUri(relResourceUri), function(success, resource) {
                                console.log("CREATED NODE FOR ID "+nextId+" AND URI: "+sko.plainUri(relResourceUri));
                                console.log(resource);
                                sko.aboutResourceMap[nextId] = new sko.Resource(relResourceUri, resource);
                            });
                            
                            return relResourceUri;
                        } else {
                            if(relResourceUri == null) {
                                console.log("*** related resource is null");

                                console.log(" ** NEXT URI IS NULL, GEN BLANK LABEL");
                                var nextUri = sko.nextBlankLabel();
                                
                                console.log(" ** setting parent node related resource to "+nextUri);
                                resource[uri](nextUri);
                            } else {
                                if(sko.aboutResourceMap[nextId]) {
                                    // @todo here
                                    console.log("*** setting new value for related resource "+nextUri);
                                    sko.aboutResourceMap[nextId].about(nextUri);
                                } else {
                                    // what here?
                                    console.log("!! Should I create the new blank node?");
                                }
                            }
                            return nextUri;
                        }
                    } else {
                        console.log("!!! parent resource doest not link to the related resource");                    
                    }
                } else {
                    console.log("!!! impossible to find parent resource");
                }},

            // we setup the related object of the parent resource
            // this will trigger the observer that will update this model proxy
            write: function(uri) {

                if(uri == null) {
                    console.log(" ** NEXT URI IS NULL, GEN BLANK LABEL");
                    uri = sko.nextBlankLabel();
                }

                console.log("*** OBSERVABLE WRITING RELATED DEPENDING NODE ABOT ID:"+nextId+" URI -> "+uri);
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
            console.log("*** OBSERVING RELATED NODE ABOT ID:"+nextId+" new value -> "+nextUri);
            if(nextUri == null) {
                console.log(" ** NEXT URI IS NULL, GEN BLANK LABEL");
                nextUri = sko.nextBlankLabel();
            }

            if(sko.plainUri(nextUri) !== sko.plainUri(sko.about[nextId]())) {
                sko.store.node(sko.plainUri(nextUri), function(success, nextResource) {
                    if(success) {
                        var newUri = nextResource.toArray()[0].subject.valueOf();
                        sko.aboutResourceMap[nextId].about(newUri);
                    } else {
                        console.log("Error updating 1 resource for URI:"+nextUri+" in SKO about related node observer");
                    }
                });
            }
        });

    } else {
        sko.about[nextId] = ko.dependentObservable({
            read: function(){
                var uri = relValue();
                console.log("*** OBSERVABLE READING RELATED DEPENDING NODE ABOT ID:"+nextId+" URI -> "+uri);

                if(uri == null) {
                    console.log(" ** NEXT URI IS NULL, GEN BLANK LABEL");
                    uri = sko.nextBlankLabel();
                }
                
                var resource  = sko.currentResource(jQuery(node).parent().toArray()[0]);
                if(resource != null) {
                    console.log("*** Found parent resource: "+resource.about());
                    if(resource[uri]) {
                        var relResourceUri = resource[uri]();
                    
                        console.log("*** found related resource: "+relResourceUri);
                        // register the new observer and resource
                        sko.store.node(sko.plainUri(relResourceUri), function(success, resource) {
                            sko.aboutResourceMap[nextId] = new sko.Resource(relResourceUri, resource);
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
                var resource  = sko.currentResource(jQuery(node).parent().toArray()[0]);

                console.log("*** OBSERVABLE WRITING RELATED DEPENDING NODE ABOT ID:"+nextId+" URI -> "+uri);

                if(uri == null) {
                    console.log(" ** NEXT URI IS NULL, GEN BLANK LABEL");
                    uri = sko.nextBlankLabel();
                }

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
            console.log("*** OBSERVING RELATED NODE ABOT ID:"+nextId+" new value -> "+nextUri);

            if(nextUri == null) {
                console.log(" ** NEXT URI IS NULL, GEN BLANK LABEL");
                nextUri = sko.nextBlankLabel();
            }

            if(sko.plainUri(nextUri) !== sko.plainUri(sko.about[nextId]())) {
                sko.store.node(sko.plainUri(nextUri), function(success, nextResource) {
                    if(success) {
                        var newUri = nextResource.toArray()[0].subject.valueOf();
                        sko.aboutResourceMap[nextId].about(newUri);
                    } else {
                        console.log("Error updating  2 resource for URI:"+nextUri+" in SKO about related node observer");
                    }
                });
            }
        });
    }

    cb(nextId);
};

sko.plainUri = function(uri) {
    if(uri[0] === "<" && uri[uri.length-1] == ">") {
        return uri.slice(1,uri.length-1);
    } else {
        return uri;
    }
};

sko.effectiveValue = function(term) {
    if(term == null) {
        return null;
    } else {
        if(term.interfaceName && term.interfaceName === 'Literal') {
          if(term.datatype == "http://www.w3.org/2001/XMLSchema#integer" ||
             term.datatype == "http://www.w3.org/2001/XMLSchema#decimal" ||
             term.datatype == "http://www.w3.org/2001/XMLSchema#double" ||
             term.datatype == "http://www.w3.org/2001/XMLSchema#nonPositiveInteger" ||
             term.datatype == "http://www.w3.org/2001/XMLSchema#negativeInteger" ||
             term.datatype == "http://www.w3.org/2001/XMLSchema#long" ||
             term.datatype == "http://www.w3.org/2001/XMLSchema#int" ||
             term.datatype == "http://www.w3.org/2001/XMLSchema#short" ||
             term.datatype == "http://www.w3.org/2001/XMLSchema#byte" ||
             term.datatype == "http://www.w3.org/2001/XMLSchema#nonNegativeInteger" ||
             term.datatype == "http://www.w3.org/2001/XMLSchema#unsignedLong" ||
             term.datatype == "http://www.w3.org/2001/XMLSchema#unsignedInt" ||
             term.datatype == "http://www.w3.org/2001/XMLSchema#unsignedShort" ||
             term.datatype == "http://www.w3.org/2001/XMLSchema#unsignedByte" ||
             term.datatype == "http://www.w3.org/2001/XMLSchema#positiveInteger" ) {
              return parseFloat(term.valueOf());
          } else if(term.type === "http://www.w3.org/2001/XMLSchema#boolean"){
              return (term.valueOf() === 'true' || term.valueOf() === true || term.valueOf() === 'True');
          } else if(term.type === "http://www.w3.org/2001/XMLSchema#string"){
              return term.valueOf();
          } else if(term.type === "http://www.w3.org/2001/XMLSchema#dateTime"){
              return new Date(term.valueOf());
          } else if(term.type == null) {
              return term.valueOf();
          }
        } else {
            return term.valueOf();
        }
    }
};

sko.Resource = function(subject, node) {
    this.valuesMap = {};
    var that = this;
    node.forEach(function(triple){
        console.log(triple);
        if(triple.object.interfaceName === 'NamedNode') {
            that.valuesMap[triple.predicate.toNT()] = triple.object.toNT();
            that[triple.predicate.toNT()] = ko.observable(triple.object.toNT());
        } else if(triple.object.interfaceName === 'Literal') {
            var effectiveValue = sko.effectiveValue(triple.object.valueOf());
            that.valuesMap[triple.predicate.toNT()] = effectiveValue;
            that[triple.predicate.toNT()] = ko.observable(effectiveValue);
        } else {
            that.valuesMap[triple.predicate.toNT()] = triple.object.valueOf();
            that[triple.predicate.toNT()] = ko.observable(triple.object.valueOf());
        }
    });
    this.about = ko.observable(subject);
    this.storeObserverFn = sko.Resource.storeObserver(this);

    // observe changes in the subject of this resource
    var that = this;
    this.about.subscribe(function(newUri){
        console.log("SKO Resource new resource:"+newUri);

        console.log("*** STOP OBSERVING NODE STORE FOR "+that.about());
        sko.store.stopObservingNode(that.storeObserverFn);

        if(newUri != null && newUri.indexOf("_:sko")!=0) {
            sko.store.startObservingNode(sko.plainUri(newUri), that.storeObserverFn);
        } else {
            console.log("*** nullifying resources");

            // set properties to null
            for(var p in that.valuesMap) {
                that.valuesMap[p] = null;
            }
            for(var p in that.valuesMap) {
                that[p](null);
            }
        }
    });
    
    // observe notifications from KO and the RDF store
    sko.Resource.koObserver(this);
    sko.store.startObservingNode(sko.plainUri(this.about()), that.storeObserverFn);
};
 
/**
 * Must update the value in the RDFstore
 */
sko.Resource.prototype.notifyPropertyChange = function(property, newValue) {
    console.log("*** received KO notification for property "+property+" -> "+newValue);
    if(this.valuesMap[property] == null) {
        // property is not defined -> create
        // @todo
        // if it is a blank ID don't do anything
    } else {
        if(this.valuesMap[property] !== newValue && !sko.isSKOBlankNode(newValue)) {
            // property is already present and the value has changed -> update
            
            //@todo something must be done with datatypes and literals
            var query = "DELETE { "+this.about()+" "+property+" \""+this.valuesMap[property]+"\" }";
            query = query + " INSERT { "+this.about()+" "+property+" \""+newValue+"\" }";
            query = query + " WHERE { "+this.about()+" "+property+" \""+this.valuesMap[property]+"\" }"; 

            query = query.replace(/"</g,"<").replace(/>"/g,">");

            this.valuesMap[property] = newValue;
            console.log("*** updating STORE: \n  "+query);
            sko.store.execute(query);
        }
    }
};

sko.isSKOBlankNode = function(term) {
    return term.indexOf("_:sko") === 0;
}

///**
// * This resource is referencing a non existent graph node
// */
//sko.Resource.nullify = function(){
// 
//};

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
        if(skoResource.about()==="_:sko_10") {
            return;
        }
        var newValues = {};

        console.log("*** triples in STORE resource -> "+node.toArray().length);

        node.forEach(function(triple){
            if(triple.object.interfaceName === 'NamedNode') {
                console.log(" "+triple.predicate.toNT()+" -> "+triple.object.toNT());
                newValues[triple.predicate.toNT()] = triple.object.toNT();
            } else {
                console.log(" "+triple.predicate.toNT()+" -> "+triple.object.valueOf());
                newValues[triple.predicate.toNT()] = triple.object.valueOf();
            }
        });

        var newValueMap = {};
        var toNullify = [];
        var toUpdate = [];
        var toCreate = [];

        // what has changed?, what need to be removed?
        for(var p in skoResource.valuesMap) {
            if(newValues[p] != null) {
                newValueMap[p] = newValues[p];
                if(skoResource.valuesMap[p] !== newValues[p]) {
                    toUpdate.push(p);
                }
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
            console.log("*** setting value to null "+toNullify[i]+" -> NULL");
            skoResource[toNullify[i]](null);
        }

        for(var i=0; i<toUpdate.length; i++) {
            console.log("*** updating value "+toUpdate[i]+" -> "+skoResource.valuesMap[toUpdate[i]]);
            skoResource[toUpdate[i]](skoResource.valuesMap[toUpdate[i]]);
        }

        for(var i=0; i<toCreate.length; i++) {
            console.log("*** new value "+toCreate[i]+" -> "+skoResource.valuesMap[toCreate[i]]);
            skoResource[toCreate[i]] =  ko.observable(skoResource.valuesMap[toCreate[i]]);
        }

        console.log("*** END MODIFICATION");
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
        } else {
            k(registerFn, env);
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
        } else {
            k(registerFn, env);
        }

        
    };

    Utils.repeat(0,nodes.length, registerFn, function(env) {
        cb();
    });
};
