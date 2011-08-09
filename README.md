#SemanticKO

##About

**Semantic KO** is a JavaScript library to build declarative web user interfaces using semantic metadata.

The library is just an extension to [**Knockout**](http://knockoutjs.com/) JS library that makes possible to bind portions of the DOM to nodes in the RDF graph stored in an instance of [**rdfstore-js**](https://github.com/antoniogarrote/rdfstore-js).

This library is still under development.


##A simple example

- HTML markup:

    <div id="my-ui" about="currentResource">
      <p data-bind="text: <http://test.com/title>"></p>
      <span rel='<http://test.com/related>'>
        <p data-bind="text: <http://test.com/count>"></p>      
      </span>
    </div>

- View model:

    window['viewModel'] = {'currentResource': ko.observable("<http://test.com/a>")};

- Loading data in the store;

    sko.ready(function(){
        var testData = "INSERT DATA { <http://test.com/a> <http://test.com/title> 'test resource a' ;\
                                                          <http://test.com/related> <http://test.com/b>.\
                                      <http://test.com/b> <http://test.com/count> '2' . }";
        sko.store.execute(testData, function() {
           doApplyBindings();
        });
    });

- Applying bindings:

    window['doApplyBindings'] = function(){
       ko.applyBindings("#myui", viewModel);
    };

- Output:

    <div id="my-ui" about="currentResource">
      <p>test resource a</p>
      <span rel='<http://test.com/related>'>
        <p>2</p>      
      </span>
    </div>


Bound nodes just behave like any other Knockout observable.
After applying the bindings, DOM and RDF graph are linked, changes in the store (e.g. with a modify SPARQL query) are immediately reflected in the view, and modifications in the view (e.g. a user changing the value of an input field) modified the values and the structure of the RDF graph.

##License

Licensed under the  [MIT License](http://www.opensource.org/licenses/mit-license.php) the same as Knockout JS.

Antonio Garrote (c) 2011.
