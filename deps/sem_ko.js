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

sko.Resource = function(node) {
    this.valuesMap = {};
    var that = this;
    node.forEach(function(triple){
        that.valuesMap[triple.predicate.valueOf()] = triple.object.valueOf();
        that[triple.predicate.valueOf()] = ko.observable(triple.object.valueOf());
    });
    this.about = node.toArray()[0]['subject'].valueOf();
    
    // observe notifications from KO and the RDF store
    sko.Resource.koObserver(this);
    sko.store.startObservingNode(this.about, sko.Resource.storeObserver(this));
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

            var query = "DELETE { <"+this.about+"> <"+property+"> \""+this.valuesMap[property]+"\" }";
            query = query + " INSERT { <"+this.about+"> <"+property+"> \""+newValue+"\" }";
            query = query + " WHERE { <"+this.about+"> <"+property+"> \""+this.valuesMap[property]+"\" }"; 

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
        console.log("*** received notification change from STORE in resource "+skoResource.about);
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
        skoResource.valuesMap = newValueMap

        for(var i=0; i<toNullify.length; i++) {
            skoResource[toNullify[i]](null);
        }

        for(var i=0; i<toUpdate.length; i++) {
            skoResource[toUpdate[i]](skoResource.valuesMap[toUpdate[i]]);
        }

        for(var i=0; i<toCreate.length; i++) {
            skoResource[toCreate[i]] =  ko.observable(skoResource.valuesMap[toCreate[i]]);
        }
    }    
}
