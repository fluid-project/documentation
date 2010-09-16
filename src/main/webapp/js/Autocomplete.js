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
    fluid.log("Autocomplete.js loaded");

    cspace.autocomplete = function() {
        return cspace.autocompleteImpl.apply(null, arguments);
    };

    // TODO: temporary conversion function whilst we ensure that all records are transmitted faithfully
    // from application layer with a reliable encoding (probably JSON itself)
    cspace.autocomplete.urnToRecord = function (string) {
        if (!string) {
            return {
                urn: "",
                label: ""
            };
        }
        else if (string.substring(0, 4) === "urn:") {
            return {
                urn: string,
                label: string.slice(string.indexOf("'") + 1, string.length - 1).replace(/\+/g, " ")
            };
        }
        else {
            return {
                urn: "urn:error:in:application:layer:every:autocomplete:field:must:have:an:urn",
                label: string
            };
        }
    };
    
    // Inspiration from http://stackoverflow.com/questions/158070/jquery-how-to-position-one-element-relative-to-another
    cspace.internalPositioner = function(jTarget, jToPosition, adjustX, adjustY) {
        var pos = jTarget.position();
        var target = fluid.unwrap(jTarget); var toPosition = fluid.unwrap(jToPosition);
        var left = pos.left + target.offsetWidth - toPosition.offsetWidth + adjustX;
        var top = pos.top + (target.offsetHeight - toPosition.offsetHeight) / 2 + adjustY;
        jToPosition.css({
            position: "absolute",
            zIndex: 5000,
            left: left + "px",
            top: top + "px"
        });
    };
    
    cspace.autocomplete.longest = function(list) {
        var length = 0;
        var longest = "";
        fluid.each(list, function(item) {
            var label = item.label;
            if (label.length > length) {
                length = label.length;
                longest = label;
            }    
        });
        return longest;
    };
    
    /** A vestigial "autocomplete component" which does nothing other than track keystrokes
     * and fire events. It also deals with styling of a progress indicator attached to the
     * managed element, probably an <input>. */ 

    fluid.registerNamespace("fluid.autocomplete");

    fluid.defaults("fluid.autocomplete.autocompleteView", {
        events: {
            onSearch: null,
            onSearchDone: null
        },
        styles: {
            baseStyle: "cs-autocomplete-input",
            loadingStyle: "cs-autocomplete-loading"
        }
    });

    fluid.autocomplete.bindListener = function(container, options, onSearch) {
        var outFirer;
        var oldValue = container.val();
        container.keydown(function() {
            clearTimeout(outFirer);
            outFirer = setTimeout(function() {
                var newValue = container.val();
                if (newValue !== oldValue) {
                    oldValue = newValue;
                    onSearch.fire(newValue, newValue.length >= options.minChars);
                }
            }, options.delay);
        });
        container.change(function() {
            oldValue = container.val();
        });
    };


    fluid.autocomplete.autocompleteView = function(container, options) {
        var that = fluid.initView("fluid.autocomplete.autocompleteView", container, options);
        that.container.addClass(that.options.styles.baseStyle);
        
        fluid.autocomplete.bindListener(container, that.options, that.events.onSearch);
        
        that.events.onSearch.addListener(function(term, permitted) {
            if (permitted) {
                container.addClass(that.options.styles.loadingStyle);
            }
        });
        
        that.events.onSearchDone.addListener(function() {
            container.removeClass(that.options.styles.loadingStyle);
        });
        
        return that;
    };
     
    fluid.demands("cspace.autocomplete.authoritiesDataSource", 
                  "cspace.autocomplete", {
        funcName: "cspace.URLDataSource",
        args: {url: "{autocomplete}options.vocabUrl"}
    });
    
    fluid.demands("cspace.autocomplete.matchesDataSource", 
                  "cspace.autocomplete", {
        funcName: "cspace.URLDataSource", 
        args: {
            url: "%queryUrl?q=%term",
            termMap: {
                queryUrl: "{autocomplete}options.queryUrl",
                term: "encodeURIComponent:%term"
            }
        }
    });

    fluid.demands("cspace.autocomplete.newTermDataSource", 
                  "cspace.autocomplete", {
        funcName: "cspace.URLDataSource",
        args: { 
            url: "../../chain%termUrl",
            termMap: {
                termUrl: "%termUrl"
            },
            writeable: true  
        }
    });


    
    fluid.defaults("cspace.autocomplete.closeButton", {
        styles: {
            button: "cs-autocomplete-closebutton"
        },
        buttonImageUrl: "../images/icnDelete.png",
        markup: "<a href=\"#\"><img /></a>",
        positionAdjustment: {
           x: -1,
           y: 1
        }
    });
    
    cspace.autocomplete.closeButton = function(container, options) {
        var that = fluid.initView("cspace.autocomplete.closeButton", container, options);
        var button = $(that.options.markup);
        $("img", button).attr("src", that.options.buttonImageUrl);
        button.addClass(that.options.styles.button);
        button.insertAfter(that.container);
        button.hide();
        that.show = function() {
            button.show();
            cspace.internalPositioner(that.container, button, that.options.positionAdjustment.x, that.options.positionAdjustment.y);
        }
        that.hide = function() {
            button.hide();
        }
        that.button = button;
        return that;
    };
    
    cspace.autocomplete.makeSelectionTree = function(model, listPath, fieldName) {
        var list = fluid.model.getBeanValue(model, listPath);
        return { // TODO: This could *really* be done by an expander but it looks like right now the API is not suitable
            children: 
                fluid.transform(list, function(value, key) {
                    return {
                        valuebinding: fluid.model.composeSegments(listPath, key, fieldName)
                    };
                }
            )
        };
    };
    
    cspace.autocomplete.matchTerm = function(label, term) {
        return label.toLowerCase() === term.toLowerCase();
    };
    
    cspace.autocomplete.modelToTree = function(model, events) {
        var tree = {};
        var index = fluid.find(model.matches, function(match, index) {
            if (cspace.autocomplete.matchTerm(match.label, model.term)) {
                return index;
            }
        });
        if (index === undefined) {
            tree.addToPanel = {};
            tree.addTermTo = {
                messagekey: "addTermTo",
                args: {term: "${term}"}
            };
            tree.authorityItem = cspace.autocomplete.makeSelectionTree(model, "authorities", "fullName");
        }
        if (model.matches.length === 0) {
            tree.noMatches = {};
        }
        else {
            tree.matches = {};
            tree.longestMatch = cspace.autocomplete.longest(model.matches);
            tree.matchItem = cspace.autocomplete.makeSelectionTree(model, "matches", "label");
        }
        return tree;
    };
    
    cspace.autocomplete.popup = function(container, options) {
        var that = fluid.initRendererComponent("cspace.autocomplete.popup", container, options);
        that.events = that.options.events;
        var input = fluid.unwrap(that.options.inputField);
        var union = $(container).add(input);
        
        var decodeItem = function(item) { // TODO: make a generic utility for this (integrate with ViewParameters for URLs)
            var togo = {
                EL: that.renderer.boundPathForNode(item) 
            };
            togo.parsed = fluid.model.parseEL(togo.EL);
            if (togo.parsed.length === 3) {
                togo.type = togo.parsed[0];
                togo.index = togo.parsed[1];
            }
            return togo;
        };
        
        var activateFunction = function(item) {
            var decoded = decodeItem(item.target);
            if (decoded.type) {
                that.events[decoded.type === "authorities"? "selectAuthority" : "selectMatch"].fire(decoded.index);
            }
        };
        that.container.click(activateFunction);
        
        that.open = function() {
            var tree = that.treeBuilder();
            that.render(tree);
            
            var activatables = that.locate("authorityItem").add(that.locate("matchItem"));
            fluid.activatable(activatables, activateFunction);
            
            var selectables = $(activatables).add(input);
            that.selectable.selectables = selectables;
            that.selectable.selectablesUpdated();
            that.container.show();
            
            that.container.dialog("open");
            cspace.util.globalDismissal(union, function() {
                that.close();
            });
        };
        
        that.close = function() {
            cspace.util.globalDismissal(union);
            that.container.dialog("close");
            that.container.html("");
            that.options.inputField.focus();
        };
        

        function makeHighlighter(funcName) {
            return function(item) {
                var decoded = decodeItem(item); 
                if (decoded.type) {
                    $(item)[funcName] (that.options.styles[decoded.type + "Select"]);
                }
            };
        }
        // TODO: sloppy use of "parent" here is necessary to prevent removal of tabindex order
        that.selectable = fluid.selectable(that.container.parent(), {
            selectableElements: that.options.inputField,
            noBubbleListeners: true,
            onSelect: makeHighlighter("addClass"),
            onUnselect: makeHighlighter("removeClass")
            });
            
        that.escapeHandler = function(event) { // TODO: too annoying to use plugin because of FLUID-1313
            if (event.keyCode === $.ui.keyCode.ESCAPE) {
                that.events.revertState.fire();
                return false;
            }
        };
        // ALL THREE of these are necessary in order to defeat pernicious default effect on all browsers
        union.keypress(that.escapeHandler);
        union.keydown(that.escapeHandler);
        union.keyup(that.escapeHandler); 
        
        that.events.selectAuthority.addListener(that.close);
        that.events.selectMatch.addListener(that.close);
        
        fluid.initDependents(that);
        
        return that;
    };
    
    fluid.defaults("cspace.autocomplete.popup", {
        mergePolicy: {
            model: "preserve"
        },
        selectors: {
            addToPanel: ".csc-autocomplete-addToPanel",
            authorityItem: ".csc-autocomplete-authorityItem",
            noMatches: ".csc-autocomplete-noMatches",
            matches: ".csc-autocomplete-matches",
            matchItem: ".csc-autocomplete-matchItem",
            longestMatch: ".csc-autocomplete-longestMatch",
            addTermTo: ".csc-autocomplete-addTermTo"
            },
        styles: {
            authoritiesSelect: "cs-autocomplete-authorityItem-select",
            matchesSelect: "cs-autocomplete-matchItem-select"
        },
        repeatingSelectors: ["matchItem", "authorityItem"],
        invokers: {
            treeBuilder: {
                funcName: "cspace.autocomplete.modelToTree",
                args: ["{popup}.model", "{popup}.events"]
            }  
        },
        resources: {
            template: {
                expander: {
                    type: "fluid.deferredInvokeCall",
                    func: "cspace.specBuilder",
                    args: {
                        forceCache: true,
                        url: "%webapp/html/AutocompleteAddPopup.html"
                    }
                }
            }
        }
    });

    fluid.primeCacheFromResources("cspace.autocomplete.popup");

    function updateAuthoritatively(that, termRecord) {
        that.hiddenInput.val(termRecord.urn);
        that.hiddenInput.change();
        that.autocompleteInput.val(termRecord.label);
        that.model.baseRecord = fluid.copy(termRecord);
        that.model.term = termRecord.label;
    }

    var setupAutocomplete = function (that) {
        that.hiddenInput = that.container.is("input") ? that.container : $("input", that.container.parent());
        that.hiddenInput.hide();
        that.parent = that.hiddenInput.parent();
        var autocompleteInput = $("<input/>");
        autocompleteInput.insertAfter(that.hiddenInput);
        that.autocompleteInput = autocompleteInput;
        
        var popup = $("<div></div>");
        popup.insertAfter(autocompleteInput);
        that.popupElement = popup;

        var initialRec = cspace.autocomplete.urnToRecord(that.hiddenInput.val());
        updateAuthoritatively(that, initialRec);
    };
    
    var makeButtonAdjustor = function(closeButton, model) {
        return function(hide) {
            closeButton[model.term === model.baseRecord.label || hide? "hide": "show"] ();
        };
    };

    cspace.autocompleteImpl = function (container, options) {
        var that = fluid.initView("cspace.autocomplete", container, options);
        that.model = {
            authorities: [],
            matches: []
        };

        setupAutocomplete(that);
        fluid.initDependents(that);
       
        that.closeButton.button.attr("title", that.options.strings.closeButton);
        var buttonAdjustor = makeButtonAdjustor(that.closeButton, that.model);
       
        that.autocomplete.events.onSearch.addListener(
            function(newValue, permitted) {
                that.model.term = newValue; // TODO: use applier and use "double wait" in "flapjax style"
                if (permitted) {
                    buttonAdjustor(true); // hide the button to show the "loading indicator"
                    that.matchesSource.get(that.model, function(matches) {
                        that.model.matches = matches;
                        buttonAdjustor();
                        that.popup.open();
                        that.autocomplete.events.onSearchDone.fire(newValue);
                        });
                }
                else {
                   if (newValue === "") { // CSPACE-1651
                       var blankRec = cspace.autocomplete.urnToRecord("");
                       updateAuthoritatively(that, blankRec);
                   }
                   buttonAdjustor();
                   that.popup.close();
                }
            });
        
        that.events.selectMatch.addListener(
            function(key) {
                var match = that.model.matches[key];
                updateAuthoritatively(that, match);
                buttonAdjustor();
            });
            
        that.events.selectAuthority.addListener(
            function(key) {
                var authority = that.model.authorities[key];
                that.newTermSource.put({fields: {displayName: that.model.term}}, {termUrl: authority.url}, 
                    function(response) {
                        updateAuthoritatively(that, response);
                        buttonAdjustor();
                    });
            });
        that.events.revertState.addListener(
            function() {
                updateAuthoritatively(that, that.model.baseRecord);
                buttonAdjustor();
                that.popup.close();              
            });

        // TODO: risk of asynchrony
        that.authoritiesSource.get(null, function(authorities) {
            that.model.authorities = authorities;
        });

        that.closeButton.button.click(function() {
            that.events.revertState.fire();
            return false;
        });

        return that;
    };
    


    fluid.demands("fluid.autocomplete.autocompleteView", "cspace.autocomplete", 
      ["{autocomplete}.autocompleteInput", fluid.COMPONENT_OPTIONS]);
      
          
    fluid.demands("cspace.autocomplete.popup", "cspace.autocomplete", 
      ["{autocomplete}.popupElement", fluid.COMPONENT_OPTIONS]);
      
    fluid.demands("cspace.autocomplete.closeButton", "cspace.autocomplete", 
      ["{autocomplete}.autocompleteInput", fluid.COMPONENT_OPTIONS]);
    
    fluid.defaults("cspace.autocomplete", {
        termSaverFn: cspace.autocomplete.ajaxTermSaver,
        minChars: 3,
        delay: 500,
        components: {
            autocomplete: {
                type: "fluid.autocomplete.autocompleteView",
                options: {
                    minChars: "{autocomplete}.options.minChars",
                    delay: "{autocomplete}.options.delay"
                }
            },
            popup: {
                type: "cspace.autocomplete.popup",
                options: {
                    model: "{autocomplete}.model",
                    events: "{autocomplete}.events",
                    inputField: "{autocomplete}.autocompleteInput",
                    strings: "{autocomplete}.options.strings"
                }
            },
            authoritiesSource: {
                type: "cspace.autocomplete.authoritiesDataSource"
            },
            matchesSource: {
                type: "cspace.autocomplete.matchesDataSource"
            },
            newTermSource: {
                type: "cspace.autocomplete.newTermDataSource"
            },
            closeButton: {
                type: "cspace.autocomplete.closeButton"
            }
        },
        strings: {
            noMatches:    "- No matches -",
            addTermTo:   "Add \"%term\" to:",
            closeButton: "Cancel edit, and return this field to the most recent authority value"
        },
        events: {
            revertState: null,
            selectAuthority: null,
            selectMatch: null
        }
    });
})(jQuery, fluid);