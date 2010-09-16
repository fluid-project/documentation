/*
Copyright 2009-2010 University of Toronto

Licensed under the Educational Community License (ECL), Version 2.0. 
ou may not use this file except in compliance with this License.

You may obtain a copy of the ECL 2.0 License at
https://source.collectionspace.org/collection-space/LICENSE.txt
*/

/*global jQuery, fluid, cspace*/
"use strict";

(function ($, fluid) {
    fluid.log("AutocompleteTesting.js loaded");

    
    
    /**** Definitions for testing environment - TODO: move to separate file somewhere ****/    
    fluid.defaults("cspace.autocomplete.testAuthoritiesDataSource", {
        url: "%webapp/../../test/data/authorities.json"
        }
    );
    cspace.autocomplete.testAuthoritiesDataSource = cspace.URLDataSource;
   
    fluid.demands("cspace.autocomplete.authoritiesDataSource",  ["cspace.localData", "cspace.autocomplete"],
        {funcName: "cspace.autocomplete.testAuthoritiesDataSource"});


    cspace.autocomplete.testMatchesParser = function(data, directModel) {
        var togo = [];
        var lowterm = directModel.term.toLowerCase();
        fluid.each(data, function(item) {
            if (item.label.toLowerCase().indexOf(lowterm) !== -1) {
                togo.push(item);
            }
        });
        return togo;
    };


    fluid.defaults("cspace.autocomplete.testMatchesDataSource", {
        url: "%webapp/../../test/data/matches.json",
        responseParser: cspace.autocomplete.testMatchesParser,
        delay: 1
        }
    );
    cspace.autocomplete.testMatchesDataSource = cspace.URLDataSource;
        
    fluid.demands("cspace.autocomplete.matchesDataSource", ["cspace.localData", "cspace.autocomplete"],
        {funcName: "cspace.autocomplete.testMatchesDataSource"});
    
    fluid.demands("cspace.autocomplete.newTermDataSource",  ["cspace.localData", "cspace.autocomplete"],
        {funcName: "cspace.autocomplete.testNewTermDataSource"});
    
    cspace.autocomplete.testNewTermDataSource = function(options) {
        return {
            put: function(model, directModel, callback) {
                fluid.log("Post of new term record " + JSON.stringify(model) + " to URL " + directModel.termURL);
                callback({ urn: "urn:"+fluid.allocateGuid(), label: model.fields.displayName});
            }
        };
    };
    
 })(jQuery, fluid);
    /**** End testing definitions ****/
    