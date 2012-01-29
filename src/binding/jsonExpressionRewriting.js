
ko.jsonExpressionRewriting = (function () {
    var restoreCapturedTokensRegex = /\[ko_token_(\d+)\]/g;
    var javaScriptAssignmentTarget = /^[\_$a-z][\_$a-z0-9]*(\[.*?\])*(\.[\_$a-z][\_$a-z0-9]*(\[.*?\])*)*$/i;
    var javaScriptReservedWords = ["true", "false"];

    function restoreTokens(string, tokens) {
        return string.replace(restoreCapturedTokensRegex, function (match, tokenIndex) {
            return tokens[tokenIndex];
        });
    }

    function isWriteableValue(expression) {
        if (ko.utils.arrayIndexOf(javaScriptReservedWords, ko.utils.stringTrim(expression).toLowerCase()) >= 0)
            return false;
        if(expression[0]=="<" && expression[expression.length-1]==">")
            return true;
        return expression.match(javaScriptAssignmentTarget) !== null;
    }

    return {
        parseJson: function (jsonString) {
            jsonString = ko.utils.stringTrim(jsonString);
            if (jsonString.length < 3)
                return {};

            //@modified
            // added counter of nested curly braces

            // We're going to split on commas, so first extract any blocks that may contain commas other than those at the top level
            var tokens = [];
            var tokenStart = null, tokenEndChar, tokenCounter;
            for (var position = jsonString.charAt(0) == "{" ? 1 : 0; position < jsonString.length; position++) {
                var c = jsonString.charAt(position);
                if (tokenStart === null) {
                    switch (c) {
                        case '"':
                        case "'":
                        case "/":
                            tokenStart = position;
                            tokenEndChar = c;
                            break;
                        case "<":
                            tokenStart = position;
                            tokenEndChar = ">";
                            break;
                        case "{":
                            tokenStart = position;
                            tokenCounter = 1;
                            tokenEndChar = "}";
                            break;
                        case "[":
                            tokenStart = position;
                            tokenEndChar = "]";
                            break;
                    }
                } else if(tokenEndChar == "}" && c == "{") {
                    tokenCounter++;
                } else if(tokenEndChar == "}" && c == "}" && tokenCounter>1) {
                    tokenCounter--;
                } else if (c == tokenEndChar) {
                    var token = jsonString.substring(tokenStart, position + 1);
                    tokens.push(token);
                    var replacement = "[ko_token_" + (tokens.length - 1) + "]";
                    jsonString = jsonString.substring(0, tokenStart) + replacement + jsonString.substring(position + 1);
                    position -= (token.length - replacement.length);
                    tokenStart = null;
                }
            }

            // Now we can safely split on commas to get the key/value pairs
            var result = {};
            var keyValuePairs = jsonString.split(",");
            for (var i = 0, j = keyValuePairs.length; i < j; i++) {
                var pair = keyValuePairs[i];
                var colonPos = pair.indexOf(":");
                if ((colonPos > 0) && (colonPos < pair.length - 1)) {
                    var key = ko.utils.stringTrim(pair.substring(0, colonPos));
                    var value = ko.utils.stringTrim(pair.substring(colonPos + 1));
                    if (key.charAt(0) == "{")
                        key = key.substring(1);
                    if (value.charAt(value.length - 1) == "}")
                        value = value.substring(0, value.length - 1);
                    key = ko.utils.stringTrim(restoreTokens(key, tokens));
                    value = ko.utils.stringTrim(restoreTokens(value, tokens));
                    result[key] = value;
                }
            }
            return result;
        },

        insertPropertyAccessorsIntoJson: function (jsonString) {
            var parsed = ko.jsonExpressionRewriting.parseJson(jsonString);
            var propertyAccessorTokens = [];
            for (var key in parsed) {
                var value = parsed[key];
                if (isWriteableValue(value)) {
                    if (propertyAccessorTokens.length > 0)
                        propertyAccessorTokens.push(", ");
                    propertyAccessorTokens.push(key + " : function(__ko_value) { " + value + " = __ko_value; }");
                }
            }

            if (propertyAccessorTokens.length > 0) {
                var allPropertyAccessors = propertyAccessorTokens.join("");
                jsonString = jsonString + ", '_ko_property_writers' : { " + allPropertyAccessors + " } ";
            }

            return jsonString;
        },

	//@modified
	parseURIsInJSONString: function(jsonString) {
	    var re = /["']?(<|\[)[a-z:\/.#?&%]+(\]|>)['"]?/g;
	    var acum = "";
	    var found = re.exec(jsonString);
	    while(found != null) {
		if((found[0][0] === "'" || found[0][0] === '"') &&
		   (found[0][found[0].length-1] === "'" || found[0][found[0].length-1] === '"')) {
		    var parts = jsonString.split(found[0]);
		    acum = acum + parts[0] + found[0];
		    jsonString = parts[1];
		} else {
		    var w = found[0];
		    var index = found.index;
		    var pref = jsonString.substring(0,index);
		    acum = pref+"sko.current().tryProperty('"+w+"')";
		    jsonString= jsonString.substring(index+w.length);
		}
		found = re.exec(jsonString);
	    }

	    return acum+jsonString;
	},

        insertPropertyReaderWritersIntoJson: function (jsonString) {
            var parsed = ko.jsonExpressionRewriting.parseJson(jsonString);
            var propertyAccessorTokens = [];
            var readers = "";
            var isFirst = true;
            for (var key in parsed) {
                var value = parsed[key];

		value = this.parseURIsInJSONString(value);
                if (isWriteableValue(value)) {
                    if (propertyAccessorTokens.length > 0)
                        propertyAccessorTokens.push(", ");
                    if(value[0]==="<" && value[value.length-1]===">" && key !== 'about' && key !== 'rel') {
                        propertyAccessorTokens.push(key + " : function(__ko_value) { sko.current = function() { return sko.currentResource(innerNode); }; sko.current().tryProperty('" + value + "') = __ko_value; }");
                    } else if(value.match(/^\[[^,;"\]\}\{\[\.:]+:[^,;"\}\]\{\[\.:]+\]$/) != null && key !== 'about' && key !== 'rel') {
                        propertyAccessorTokens.push(key + " : function(__ko_value) { sko.current = function() { return sko.currentResource(innerNode); }; sko.current().tryProperty('" + value + "') = __ko_value; }");
                    } else if(value[0]==="<" && value[value.length-1]===">" && (key === 'about' || key === 'rel')) {
                        // nothing here
                    } else if(value[0]==="[" && value[value.length-1]==="]" && (key === 'about' || key === 'rel')) {
                        // nothing here
                    } else {
                        if(/tryProperty\([^)]+\)$/.test(value) || /prop\([^)]+\)$/.test(value)) {
                            propertyAccessorTokens.push(key + " : function(__ko_value) { sko.current = function() { return sko.currentResource(innerNode); }; " + value + "(__ko_value); }");
                        } else {
                            propertyAccessorTokens.push(key + " : function(__ko_value) { sko.current = function() { return sko.currentResource(innerNode); }; " + value + " = __ko_value; }");
                        }
                    }
                }
                if(!isFirst)  {
                    readers = readers+", ";
                } else {
                    isFirst = false;
                }
                if(value[0]==='<' && value[value.length-1]==='>' && key !== 'about' && key !== 'rel') {
                    readers = readers+key+": (function(){ sko.current = function() { return sko.currentResource(innerNode); }; return sko.current().tryProperty('"+value+"') })()";
                } else if(value.match(/^\[[^,;"\]\}\{\[\.:]+:[^,;"\}\]\{\[\.:]+\]$/) != null && key !== 'about' && key !== 'rel') {
                    readers = readers+key+": (function(){ sko.current = function() { return sko.currentResource(innerNode); }; return sko.current().tryProperty('"+value+"') })()";
                } else if(value[0]==="<" && value[value.length-1]===">" && (key === 'about' || key === 'rel')) {
                    readers = readers+key+": '"+value.slice(1,value.length-1)+"'";
                } else if(value.match(/^\[[^,;"\]\}\{\[\.:]+:[^,;"\}\]\{\[\.:]+\]$/) != null && (key === 'about' || key === 'rel')) {
                    readers = readers+key+": sko.rdf.prefixes.resolve('"+value.slice(1,value.length-1)+"')";
                } else {
                    readers = readers+key+": (function(){ sko.current = function() { return sko.currentResource(innerNode); }; return "+value+" })()";
                }
            }

            jsonString = readers;

            if (propertyAccessorTokens.length > 0) {
                var allPropertyAccessors = propertyAccessorTokens.join("");
                jsonString = jsonString + ", '_ko_property_writers' : { " + allPropertyAccessors + " } ";
            }

            return jsonString;
        }

    };
})();

ko.exportSymbol('ko.jsonExpressionRewriting', ko.jsonExpressionRewriting);
ko.exportSymbol('ko.jsonExpressionRewriting.parseJson', ko.jsonExpressionRewriting.parseJson);
ko.exportSymbol('ko.jsonExpressionRewriting.insertPropertyAccessorsIntoJson', ko.jsonExpressionRewriting.insertPropertyAccessorsIntoJson);
ko.exportSymbol('ko.jsonExpressionRewriting.insertPropertyReaderWritersIntoJson', ko.jsonExpressionRewriting.insertPropertyReaderWritersIntoJson);
