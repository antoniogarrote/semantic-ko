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
sko.activeDebug = false;

sko.log = function(msg) {
    if(sko.activeDebug) {
        console.log(msg);
    }
};

/**
 * Starts the library. Call this before anything else.
 */
sko.ready = function()  {

    // reset state
    sko.aboutResourceMap = {};
    sko.aboutResourceSubscriptionMap = {};
    sko.aboutCounter = 0;
    sko.generatorId = 0;
    sko.generatorsMap = {};

    var cb = null;
    if(arguments.length === 2) {
        sko.store = arguments[0];
        cb = arguments[1];

        sko.rdf = sko.store.rdf;

        cb(true);
    } else {
        cb = arguments[0];
        rdfstore.create(function(store) {
            sko.store = store;

            sko.rdf = sko.store.rdf;

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
sko.aboutResourceSubscriptionMap = {};

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
                    sko.log("FOUND RESOURCE: "+uri);
                    sko.log(resource);
                    sko.log(" FOR "+sko.plainUri(uri));
                    // id -> Resource
                    sko.log(" ------------> "+nextId+" : "+uri);
                    sko.aboutResourceMap[nextId] = new sko.Resource(nextId, uri,resource);
                    // id -> observer
                    sko.about[nextId] = ko.observable(uri);
     
                    // we observe changes in the about resource
                    var subscription = sko.about[nextId].subscribe(function(nextUri) {
                        sko.log("*** OBSERVING NODE ABOT ID:"+nextId+" new value -> "+nextUri);

                        if(nextUri == null) {
                            sko.log(" ** NEXT URI IS NULL, GEN BLANK LABEL");
                            nextUri = sko.nextBlankLabel();
                        }

                        sko.store.node(sko.plainUri(nextUri), function(success, nextResource) {
                            if(success) {
                                var newUri = nextResource.toArray()[0].subject.valueOf();
                                sko.log(" ------------> "+nextId+" : "+newUri+" 2");
                                sko.aboutResourceMap[nextId].about(newUri);
                            } else {
                                // reset resource?
                                sko.log("*** NO RESOURCE FOR URI:"+nextUri);
                                sko.log(" ------------> "+nextId+" : "+nextUri+" 3");
                                sko.aboutResourceMap[nextId].about(nextUri);
                            }
                        });
                    });
                    sko.aboutResourceSubscriptionMap[nextId] = subscription;
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
                    sko.log("*** OBSERVABLE READING DEPENDING NODE ABOT ID:"+nextId+" new value -> "+uri);

                    if(uri == null) {
                        sko.log(" ** URI IS BLANK -> GEN BLANK LABEL");
                        uri = sko.nextBlankLabel();
                    }

                    return uri;
                },
                write: function(value) {
                    sko.log("*** OBSERVABLE WRITING DEPENDING NODE ABOT ID:"+nextId+" new value -> "+value);
                    if(value == null) {
                        sko.log(" ** URI IS BLANK -> GEN BLANK LABEL");
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
                    sko.log(" ------------> "+nextId+" : "+resource+" 4");
                    sko.aboutResourceMap[nextId] = new sko.Resource(nextId, sko.about[nextId](), resource);
     
                    // we observe changes in the about resource
                    var subscription = sko.about[nextId].subscribe(function(nextUri) {
                        sko.log("*** OBSERVING NODE ABOT ID:"+nextId+" new value -> "+nextUri);
                        if(nextUri != null) {
                            sko.store.node(sko.plainUri(nextUri), function(success, nextResource) {
                                if(success) {
                                    if(nextResource.toArray().length>0) {
                                        var newUri = nextResource.toArray()[0].subject.toNT();
                                        sko.log(" ------------> "+nextId+" : "+newUri+" 5");
                                        sko.aboutResourceMap[nextId].about(newUri);
                                    } else {
                                        // reset resource?
                                        sko.log("*** NO RESOURCE FOR URI:"+nextUri);
                                        sko.log(" ------------> "+nextId+" : "+nextUri+" 6");
                                        sko.aboutResourceMap[nextId].about(nextUri);
                                    }
                                } else {
                                    sko.log("Error updating 3 resource for URI:"+nextUri+" in SKO about node observer");
                                    sko.log("*** NO RESOURCE FOR URI:"+nextUri + " NEXT ID:"+nextId);
                                    sko.log(" ------------> "+nextId+" : "+nextUri+" 7");
                                    sko.aboutResourceMap[nextId].about(nextUri);
                                }
                            });
                        } else {
                            sko.log("*** NO RESOURCE FOR URI:"+nextUri);
                            sko.log(" ------------> "+nextId+" : NEW BLANK  8");
                            sko.aboutResourceMap[nextId].about(sko.nextBlankLabel());
                        }
                    });
                    sko.aboutResourceSubscriptionMap[nextId] = subscription;
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
        var uri = sko.NTUri(relValue);
        relValueUri = uri;
        
        sko.about[nextId] = ko.dependentObservable({
            read: function(){
                sko.log("*** OBSERVABLE READING RELATED  DEPENDING NODE ABOT ID:"+nextId);
                var resource  = sko.currentResource(jQuery(node).parent().toArray()[0]);
                sko.log(resource);                
                if(resource != null) {
                    sko.log(" ** about:"+resource.about());
                    sko.log("*** Found parent resource: "+resource.about());

                    if(resource[uri]) {
                        var relResourceUri = resource[uri]();
                        if(relResourceUri != null && !sko.isSKOBlankNode(resource[uri]())) {
                            relResourceUri = sko.NTUri(relResourceUri);
                            if(sko.aboutResourceMap[nextId] == null || sko.aboutResourceMap[nextId].about() != relResourceUri) {
                                sko.log("*** found related resource: "+relResourceUri);
                                // register the new observer and resource
                                sko.store.node(sko.plainUri(relResourceUri), function(success, resource) {
                                    sko.log("CREATED NODE FOR ID "+nextId+" AND URI: "+sko.plainUri(relResourceUri));
                                    sko.log(resource);
                                    sko.log(" ------------> "+nextId+" : "+relResourceUri+" 8b");
                                    sko.aboutResourceMap[nextId] = new sko.Resource(nextId, relResourceUri, resource);
                                });
                            } else {
                                sko.log("*** Related resource hasn't changed");
                            }
                            
                            return relResourceUri;
                        } else {
                            if(relResourceUri == null) {
                                sko.log("*** related resource is null");

                                sko.log(" ** NEXT URI IS NULL, GEN BLANK LABEL");
                                var nextUri = sko.nextBlankLabel();
                                
                                sko.log(" ** setting parent node related resource to "+nextUri);
                                resource[uri](nextUri);
                            } else {
                                if(sko.aboutResourceMap[nextId]) {
                                    // @todo here
                                    sko.log("*** setting new value for related resource "+nextUri);
                                    sko.log(" ------------> "+nextId+" : "+nextUri+" 9");
                                    sko.aboutResourceMap[nextId].about(nextUri);
                                } else {
                                    // what here?
                                    sko.log("!! Should I create the new blank node?");
                                }
                            }
                            return nextUri;
                        }
                    } else {
                        sko.log("!!! parent resource doest not link to the related resource");                    
                    }
                } else {
                    sko.log("!!! impossible to find parent resource");
                }},

            // we setup the related object of the parent resource
            // this will trigger the observer that will update this model proxy
            write: function(uri) {

                if(uri == null) {
                    sko.log(" ** NEXT URI IS NULL, GEN BLANK LABEL");
                    uri = sko.nextBlankLabel();
                }

                uri = sko.NTUri(uri);

                sko.log("*** OBSERVABLE WRITING RELATED DEPENDING NODE ABOT ID:"+nextId+" URI -> "+uri);
                var resource  = sko.currentResource(jQuery(node).parent().toArray()[0]);

                if(resource != null) {
                    sko.log("*** Found parent resource: "+resource.about());
                    if(resource[relValueUri]) {
                        sko.log("*** Setting new related resource in parent resource found: "+uri);                    
                        resource[relValueUri](uri);
                    } else {
                        sko.log("!!! parent resource doest not link to the related resource");                    
                    }
                } else {
                    sko.log("!!! impossible to find parent resource");
                }                
            },

            owner: viewModel
        });

        var subscription = sko.about[nextId].subscribe(function(nextUri) {
            sko.log("*** OBSERVING RELATED NODE ABOT ID:"+nextId+" new value -> "+nextUri);
            if(nextUri == null) {
                sko.log(" ** NEXT URI IS NULL, GEN BLANK LABEL");
                nextUri = sko.nextBlankLabel();
            }

            nextUri = sko.NTUri(nextUri);

            if(sko.about[nextId]() != null) {
                if(sko.plainUri(nextUri) !== sko.plainUri(sko.about[nextId]())) {
                    sko.store.node(sko.plainUri(nextUri), function(success, nextResource) {
                        if(success) {
                            var newUri = nextResource.toArray()[0].subject.valueOf();
                            sko.log(" ------------> "+nextId+" : "+uri+" 10");
                            sko.aboutResourceMap[nextId].about(uri);
                        } else {
                            sko.log("Error updating 1 resource for URI:"+nextUri+" in SKO about related node observer");
                        }
                    });
                }
            } else {
                // @todo
                sko.log("!! this resource is now null, should be removed from list of resources?");
            }
        });
        sko.aboutResourceSubscriptionMap[nextId] = subscription;
    } else {
        sko.about[nextId] = ko.dependentObservable({
            read: function(){
                var uri = relValue();
                uri = sko.NTUri(uri);

                sko.log("*** OBSERVABLE READING RELATED DEPENDING NODE ABOT ID:"+nextId+" URI -> "+uri);

                if(uri == null) {
                    sko.log(" ** NEXT URI IS NULL, GEN BLANK LABEL");
                    uri = sko.nextBlankLabel();
                }
                
                var resource  = sko.currentResource(jQuery(node).parent().toArray()[0]);
                if(resource != null) {
                    sko.log("*** Found parent resource: "+resource.about());
                    if(resource[uri]) {
                        var relResourceUri = resource[uri]();
                    
                        sko.log("*** found related resource: "+relResourceUri);
                        // register the new observer and resource
                        sko.store.node(sko.plainUri(relResourceUri), function(success, resource) {
                            sko.log(" ------------> "+nextId+" : "+relResourceUri+" 11");
                            sko.aboutResourceMap[nextId] = new sko.Resource(nextId, relResourceUri, resource);
                        });

                        return relResourceUri;
                    } else {
                        sko.log("!!! parent resource doest not link to the related resource");                    
                    }
                } else {
                    sko.log("!!! impossible to find parent resource");
                }
            },

            // we setup the related object of the parent resource
            // this will trigger the observer that will update this model proxy
            write: function(uri) {
                uri = sko.NTUri(uri);
                var resource  = sko.currentResource(jQuery(node).parent().toArray()[0]);

                sko.log("*** OBSERVABLE WRITING RELATED DEPENDING NODE ABOT ID:"+nextId+" URI -> "+uri);

                if(uri == null) {
                    sko.log(" ** NEXT URI IS NULL, GEN BLANK LABEL");
                    uri = sko.nextBlankLabel();
                }

                if(resource != null) {
                    sko.log("*** Found parent resource: "+resource.about());
                    if(resource[relValue()]) {
                        sko.log("*** Setting new related resource in parent resource found: "+uri);                    
                        resource[relValue()](uri);
                        relValue(uri);
                    } else {
                        sko.log("!!! parent resource doest not link to the related resource");                    
                    }
                } else {
                    sko.log("!!! impossible to find parent resource");
                }                
            },

            owner: viewModel
        });

        var subscription = sko.about[nextId].subscribe(function(nextUri) {
            nextUri = sko.NTUri(nextUri);
            sko.log("*** OBSERVING RELATED NODE (F) ABOT ID:"+nextId+" new value -> "+nextUri);

            if(nextUri == null) {
                sko.log(" ** NEXT URI IS NULL, GEN BLANK LABEL");
                nextUri = sko.nextBlankLabel();
            }

            if(sko.plainUri(nextUri) != sko.plainUri(sko.about[nextId]())) {
                sko.store.node(sko.plainUri(nextUri), function(success, nextResource) {
                    if(success) {
                        var newUri = nextResource.toArray()[0].subject.valueOf();
                        sko.log(" ------------> "+nextId+" : "+newUri+" 12");
                        sko.aboutResourceMap[nextId].about(newUri);
                    } else {
                        sko.log("Error updating  2 resource for URI:"+nextUri+" in SKO about related node observer");
                    }
                });
            } else {
                sko.log("*** Related about resource hasn't changed");
            }
        });
        sko.aboutResourceSubscriptionMap[nextId] = subscription;
    }

    cb(nextId);
};

sko.plainUri = function(uri) {
    if(uri[0] === "<" && uri[uri.length-1] == ">") {
        return uri.slice(1,uri.length-1);
    } else if(uri.match(/\[[^,;"\]\}\{\[\.:]+:[^,;"\}\]\{\[\.:]+\]/) != null) {
        uri = uri.slice(1, uri.length-1);
        resolved = sko.rdf.prefixes.resolve(uri);
        if(resolved == null) {
            throw("The CURIE "+uri+" cannot be resolved");
        } else {
            return resolved;
        }
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

sko.Resource = function(resourceId, subject, node) {
    this.resourceId = resourceId;
    this.valuesMap = {};
    this.subscriptions = [];
    var that = this;

    subject = sko.NTUri(subject);

    node.forEach(function(triple){
        sko.log(triple);
        if(triple.object.interfaceName === 'NamedNode') {
            that.valuesMap[triple.predicate.toNT()] = triple.object.toNT();
            that[triple.predicate.toNT()] = ko.observable(triple.object.toNT());
        } else if(triple.object.interfaceName === 'Literal') {
            var effectiveValue = sko.effectiveValue(triple.object.valueOf());
            that.valuesMap[triple.predicate.toNT()] = effectiveValue;
            that[triple.predicate.toNT()] = ko.observable(effectiveValue);
            that[sko.plainUri(triple.predicate.toNT())] = that[triple.predicate.toNT()];
        } else {
            that.valuesMap[triple.predicate.toNT()] = triple.object.valueOf();
            that[triple.predicate.toNT()] = ko.observable(triple.object.valueOf());
            that[sko.plainUri(triple.predicate.toNT())] = that[triple.predicate.toNT()];
        }
    });
    this.about = ko.observable(subject);
    this['@'] = this.about;
    this.storeObserverFn = sko.Resource.storeObserver(this);

    // observe changes in the subject of this resource
    var that = this;
    var subscription = this.about.subscribe(function(newUri){
        sko.log("SKO Resource new resource:"+newUri);

        sko.log("*** STOP OBSERVING NODE STORE");
        sko.store.stopObservingNode(that.storeObserverFn);

        if(newUri != null && newUri.indexOf("_:sko")!=0) {
            sko.log("*** START OBSERVING NODE STORE FOR "+that.about());
            sko.store.startObservingNode(sko.plainUri(newUri), that.storeObserverFn);
        } else {
            sko.log("*** nullifying resources");

            // set properties to null
            for(var p in that.valuesMap) {
                that.valuesMap[p] = null;                
            }
            for(var p in that.valuesMap) {
                that[p](null);
            }
        }
    });

    this.subscriptions.push(subscription);

    
    // observe notifications from KO and the RDF store
    sko.Resource.koObserver(this);
    sko.store.startObservingNode(sko.plainUri(this.about()), that.storeObserverFn);
};

sko.NTUri = function(uri) {
    if(uri[0]==="[" && uri[uri.length-1]==="]") {
        uri = uri.slice(1, uri.length-1);
        resolved = sko.rdf.prefixes.resolve(uri);
        if(uri == null) {
            throw("The CURIE "+uri+" cannot be resolved");
        } else {
            uri = "<"+resolved+">";
        }
    }

    return uri;
};

/**
 * helper method for bound accessors
 */
sko.Resource.prototype.tryProperty = function(property)  {

    property = sko.NTUri(property);

    if(this[property]!=null) {
        return this[property];
    } else {

        if(this.about().indexOf("_:sko") === 0) {
            this.valuesMap[property] = null;
            this[property] = ko.observable(null);
            var that = this;
            var observerFn = function(newValue){
                that.valuesMap[property] = newValue;
            };
            var subscription = this[property].subscribe(observerFn)
            this.subscriptions.push(subscription);
            return this[property];
        } else {
            return undefined;
        }
    }
};
 
/**
 * Must update the value in the RDFstore
 */
sko.Resource.prototype.notifyPropertyChange = function(property, newValue) {
    sko.log("*** received KO notification for property "+property+" -> "+newValue);
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
            sko.log("*** updating STORE: \n  "+query);
            sko.store.execute(query);
        }
    }
};

sko.isSKOBlankNode = function(term) {
    return term.indexOf("_:sko") === 0;
}

sko.Resource.prototype.disconnect = function() {
    sko.log(" ** DISCONNECTING");
    sko.store.stopObservingNode(this.storeObserverFn);
    sko.log(" ** disconnected STORE");
    for(var i=0; i<this.subscriptions.length; i++) {
        sko.log(" ** disconnecting subscription");
        this.subscriptions[i].dispose();
    }

    sko.log(" ** disconnecting resource map");
    sko.aboutResourceSubscriptionMap[this.resourceId].dispose();
    sko.log(" ** deleting");
    delete sko.aboutResourceMap[this.resourceId];
    delete sko.about[this.resourceId];
};

sko.cleanNode = function(node) {
    sko.log("*** CLEANING!");
    sko.log(node);
    var thisId = jQuery(node).attr("aboutId");
    var ids = [];
    if(thisId != null) {
        ids.push(thisId);
    }
    ids = ids.concat(sko.childrenResourceIds(node));
    for(var i=0; i<ids.length; i++) {
        if(sko.aboutResourceMap[ids[i]] != null) {
            sko.log("*** DISCONNECTING "+ids[i]);
            sko.log(sko.aboutResourceMap[ids[i]]);
            sko.aboutResourceMap[ids[i]].disconnect();
        }
    }
}

sko.Resource.koObserver = function(skoResource) {
    var that = this;
    var makeResourceObserver = function(resource,property) {
        sko.log("*** subcribing to property "+property);
        var subscription = resource[property].subscribe(function(value){
            resource.notifyPropertyChange(property,value);
        });
        resource.subscriptions.push(subscription);
    };

    for(var p in skoResource.valuesMap) {
        makeResourceObserver(skoResource,p);
    }
};

sko.Resource.storeObserver = function(skoResource) {
    return function(node)  {
        sko.log("*** received notification change from STORE in resource "+skoResource.about());
        if(skoResource.about().indexOf("_:sko")===0) {
            return;
        }
        var newValues = {};

        sko.log("*** triples in STORE resource -> "+node.toArray().length);

        node.forEach(function(triple){
            if(triple.object.interfaceName === 'NamedNode') {
                sko.log(" "+triple.predicate.toNT()+" -> "+triple.object.toNT());
                newValues[triple.predicate.toNT()] = triple.object.toNT();
            } else {
                sko.log(" "+triple.predicate.toNT()+" -> "+triple.object.valueOf());
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
            sko.log("*** setting value to null "+toNullify[i]+" -> NULL");
            skoResource[toNullify[i]](null);
        }

        for(var i=0; i<toUpdate.length; i++) {
            sko.log("*** updating value "+toUpdate[i]+" -> "+skoResource.valuesMap[toUpdate[i]]);
            skoResource[toUpdate[i]](skoResource.valuesMap[toUpdate[i]]);
        }

        for(var i=0; i<toCreate.length; i++) {
            sko.log("*** new value "+toCreate[i]+" -> "+skoResource.valuesMap[toCreate[i]]);
            skoResource[toCreate[i]] =  ko.observable(skoResource.valuesMap[toCreate[i]]);
            skoResource[sko.plainUri(toCreate[i])] = skoResource[toCreate[i]];
        }

        sko.log("*** END MODIFICATION");
    };    
};

// custom bindings

//ko.bindingHandlers.about = {
//    init: function(element, valueAccessor, allBindingsAccessor, viewModel) {
//        // This will be called when the binding is first applied to an element
//        // Set up any initial state, event handlers, etc. here
// 
//        var value = valueAccessor();
//        $(element).attr("about", value);
//    },
//    
//    update: function(element, valueAccessor, allBindingsAccessor, viewModel) {
//        // This will be called once when the binding is first applied to an element,
//        // and again whenever the associated observable changes value.
//        // Update the DOM element based on the supplied values here.
// 
//        var value = valueAccessor();
//        $(element).attr("about", value);
//    }
//};


// trace resources
sko.traceResources = function(rootNode, model, cb) {
    sko.log("** TRACING:");
    sko.log(rootNode);
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

        if(about != null && about != '') {
            if(typeof(about) === 'string' && about[0] !== '<' && about[about.length-1] !== '>' && about[0] !== '[' && about[about.length-1] !== ']') {
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
    sko.log("in current resource");
    sko.log(node);
    if(node == null) {
        sko.log("!!! top of DOM tree, About node not found");
        return null;
    }
    var aboutId = jQuery(node).attr('aboutId');
    sko.log("about id:"+aboutId);

    if(aboutId) {
        var uri = sko.about[aboutId]();
        sko.log("uri:"+uri);
        if(uri != null) {
            return sko.aboutResourceMap[aboutId];
        } else {
            sko.log("!!! current resource is null: "+aboutId);
        }
    } else {
        sko.log("recurring");
        return sko.currentResource(jQuery(node).parent().toArray()[0]);
    }
};

sko.currentResourceNode = function(node) {
    sko.log("in current resource node");
    sko.log(node);
    if(node == null) {
        sko.log("!!! top of DOM tree, About node not found");
        return null;
    }
    var aboutId = jQuery(node).attr('aboutId');
    sko.log("about id:"+aboutId);

    if(aboutId) {
        var uri = sko.about[aboutId]();
        sko.log("uri:"+uri);
        if(uri != null) {
            return node;
        } else {
            sko.log("!!! current resource is null: "+aboutId);
            return null;
        }
    } else {
        sko.log("recurring");
        return sko.currentResourceNode(jQuery(node).parent().toArray()[0]);
    }
};

sko.childrenResourceIds = function(node) {
    return jQuery(node).find("*[aboutId]").map(function(){ return jQuery(this).attr("aboutId") });
};

sko.traceRelations = function(rootNode, model, cb) {
    sko.log("*** TRACING RELATIONS:");
    rootNode = (sko.currentResourceNode(rootNode) || rootNode);
    sko.log("*** FOUND ROOT NODE TO LOOK FOR RELATIONS:");
    sko.log(rootNode);

    var nodes = [];
    if(jQuery(rootNode).attr("rel") || jQuery(rootNode).attr("data-bind")) {
        nodes.push(rootNode);
    }
    var childNodes = jQuery(rootNode).find("*[rel], *[data-bind]").toArray();
    nodes = nodes.concat(childNodes);
    sko.log(" ** NODES TO LOOK FOR RELATED RESOURCES");
    sko.log(nodes);

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

        if(rel != null && rel != '') {
            if(typeof(rel) === 'string' && rel[0] !== '<' && rel[rel.length-1] !== '>' && rel[0] !== '[' && rel[rel.length-1] !== ']') {
                rel = model[rel];
            }
   
            var nextId = jQuery(node).attr("aboutId");
            if(nextId == null) {
                sko.log("*** CREATING RELATED NODE");
                sko.rel(rel, node, model, function(aboutId) {
                    jQuery(node).attr('aboutId',aboutId);
                    k(registerFn,env);
                });
            } else {
                sko.log("*** NODE IS ALREADY TRACED");
                k(registerFn,env);
            }
        } else {
            k(registerFn, env);
        }

        
    };

    Utils.repeat(0,nodes.length, registerFn, function(env) {
        cb();
    });
};



sko.generatorId = 0;
sko.generatorsMap = {};

sko.where = function(query) {
    query = "select ?subject where "+query;
    var nextId = ''+sko.generatorId;
    sko.generatorId++;

    sko.generatorsMap[nextId] = ko.observable([]);

    sko.log("*** WHERE QUERY: " +query);
    sko.store.startObservingQuery(query, function(bindingsList){
        var acum = [];
        sko.log(" ** RESULTS!!!");

        for(var i=0; i<bindingsList.length; i++) {
            sko.log(" ** ADDING VALUE "+ bindingsList[i].subject.value);
            acum.push("<"+bindingsList[i].subject.value+">");
        }

        sko.log("** SETTING VALUE");
        sko.log(acum)
        sko.generatorsMap[nextId](acum)
    });

    return sko.generatorsMap[nextId];
}

/**
 * Applies bindings and RDF nodes to the DOM tree
 */
sko.applyBindings = function(node, viewModel, cb) {
    if(typeof(node) === 'string') {
        node = jQuery(node)[0];
    }
    
    sko.traceResources(node, viewModel, function(){
        sko.traceRelations(node, viewModel, function(){
            ko.applyBindings(viewModel, node);
            if(cb != null) {
                cb();
            }
        });
    });
};

/**
 * Retrieves the resource object active for a node
 */
sko.resource = function(jqueryPath) {
    return sko.currentResource(jQuery(jqueryPath).toArray()[0]);
}
