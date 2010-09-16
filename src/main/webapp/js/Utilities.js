/*
Copyright 2009-2010 University of Toronto

Licensed under the Educational Community License (ECL), Version 2.0. 
You may not use this file except in compliance with this License.

You may obtain a copy of the ECL 2.0 License at
https://source.collectionspace.org/collection-space/LICENSE.txt
*/

/*global jQuery, fluid, cspace, window*/
"use strict";

fluid.registerNamespace("cspace.util");

(function ($, fluid) {
    fluid.log("Utilities.js loaded");

    
    fluid.defaults("cspace.specBuilderImpl", {
        urlRenderer: {
            expander: {
                type: "fluid.deferredInvokeCall",
                func: "cspace.urlExpander"
            }
        }  
    });
    
    cspace.specBuilderImpl = function(options) {
        // build a false "component" just to get easy access to options merging
        var that = fluid.initLittleComponent("cspace.specBuilderImpl", options);
        if (that.options.urlPrefix) {
            that.options.spec.url = that.options.urlPrefix + that.options.spec.url;
        }
        else if (that.options.urlRenderer) {
            that.options.spec.url = that.options.urlRenderer(that.options.spec.url);
        }
        return that.options.spec;
    };

    cspace.specBuilder = function(options) {
        return fluid.invoke("cspace.specBuilderImpl", {spec: options});
    }
    
    // a convenience wrapper for specBuilderImpl that lets us pass the URL as a simple string
    cspace.simpleSpecBuilder = function(urlStub) {
        return fluid.invoke("cspace.specBuilderImpl", {url: urlStub});
    };
    
    cspace.urlExpander = function(options) {
        var that = fluid.initLittleComponent("cspace.urlExpander", options);
        return function(url) {
            return fluid.stringTemplate(url, that.options.vars);
        };
    };
    
    fluid.defaults("cspace.urlExpander", {
        vars: {
            webapp: ".."
        }
    });

    cspace.util.useLocalData = function () {
        return cspace.util.isTest || document.location.protocol === "file:";
    };
    
    /** Convert the global state of using local data into an IoC "type tag" so that
     * decisions based on it can be performed out of line with application code.
     * By use of this "indirect dispatch" all test configuration code may now be
     * bundled in files that are not part of the production image */
    
    if (cspace.util.useLocalData()) {
        fluid.staticEnvironment.cspaceEnvironment = fluid.typeTag("cspace.localData");
    }
  
    var eUC = "encodeURIComponent:";
  
    /** A "Data Source" attached to a URL. Reduces HTTP transport to the simple 
     * "Data Source" API. This should become the only form of AJAX throughout CollectionSpace,
     * with the exception of calls routed through fluid.fetchResources (the two methods may
     * be combined by use of makeAjaxOpts and conversion into a resourceSpec) */   
    // TODO: integrate with Engage conception and knock the rough corners off
    cspace.URLDataSource = function(options) {
        var that = fluid.initLittleComponent(options.typeName, options);
        var wrapper = that.options.delay? function(func) {
            setTimeout(func, that.options.delay);} : function(func) {func()};

        function resolveUrl(directModel) {
            var expander = fluid.invoke("cspace.urlExpander");
            var map = fluid.copy(that.options.termMap) || {};
            map = fluid.transform(map, function(entry) {
                var encode = false;
                if (entry.indexOf(eUC) === 0) {
                    encode = true;
                    entry = entry.substring(eUC.length);
                }
                if (entry.charAt(0) === "%") {
                    entry = fluid.model.getBeanValue(directModel, entry.substring(1));
                }
                if (encode) {
                    entry = encodeURIComponent(entry);
                }
                return entry;
            } );
            var replaced = fluid.stringTemplate(that.options.url, map);
            replaced = expander(replaced);
            return replaced;
        }
        
        that.makeAjaxOpts = function(model, directModel, callback, type) {
            var togo = {
                type: type,
                url: resolveUrl(directModel),
                contentType: "application/json; charset=UTF-8",
                dataType: "json",
                success: function(data) {
                    if (that.options.responseParser) {
                        data = that.options.responseParser(data, directModel);
                    }
                    callback(data);
                },
                error: function(xhr, textStatus, errorThrown) {
                    fluid.log("Data fetch error for url " + togo.url + " - textStatus: " + textStatus);
                    fluid.log("ErrorThrown: " + errorThrown);
                }                
            };
            if (model) {
                togo.data = JSON.stringify(model);
            }
            return togo;
        };

        that.get = function(directModel, callback) {
            var ajaxOpts = that.makeAjaxOpts(null, directModel, callback, "GET");
            wrapper(function() {
                $.ajax(ajaxOpts);
            });
        };
        if (options.writeable) {
            that.put = function(model, directModel, callback) {
                var ajaxOpts = that.makeAjaxOpts(model, directModel, callback, "POST");
                $.ajax(ajaxOpts);
            }; 
        }
        return that;
    };
    
    /** "Global Dismissal Handler" for the entire page. Attaches a click handler to the
     *  document root that will cause dismissal of any elements (typically dialogs) which
     *  have registered themselves. Dismissal through this route will automatically clean up
     *  the record - however, the dismisser themselves must take care to deregister in the case
     *  dismissal is triggered through the dialog interface itself. */
    
    var dismissList = {};
    
    $(document).click(function(event) {
        var target = event.target;
        while(target) {
            if (dismissList[target.id]) {
                return;
            }
            target = target.parentNode;
        }
        fluid.each(dismissList, function(dismissFunc, key) {
            dismissFunc();
            delete dismissList[key];
        });
    });
    
    cspace.util.globalDismissal = function(nodes, dismissFunc) {
        nodes = $(nodes);
        fluid.each(nodes, function(node) {
        var id = fluid.allocateSimpleId(node);
            if (dismissFunc) {
                dismissList[id] = dismissFunc;
            }
            else {
                delete dismissList[id];
            }
        });
    };
       
})(jQuery, fluid);
    