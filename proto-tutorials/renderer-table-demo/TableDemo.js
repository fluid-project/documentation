var demo = demo || {};
(function ($) {
    
    // This is the data model.
    var cats = [{
        name: "Clovis",
        colour: "Black and White"
    }, {
        name: "Sirius",
        colour: "Black"
    }, {
        name: "Pumpkin",
        colour: "Orange"
    }, {
        name: "Maya",
        colour: "Black"
    }];
    
    // These define named selectors, which are referred to in the component tree.
    var cutpoints = [{
        id: "cat-row:",
        selector: ".cat-row"
    }, {
        id: "cat-name",
        selector: ".cat-name"
    }, {
        id: "cat-colour",
        selector: ".cat-colour"
    }];
    
    // This function generates a component tree.
    var generateCatComponentTree = function (model) {
        return fluid.transform(model, function (cat) {
            return {
                ID: "cat-row:",
                children: [
                    {
                        ID: "cat-name",
                        value: cat.name
                    },
                    {
                        ID: "cat-colour",
                        value: cat.colour
                    }
                ]
            }
        });
    };
    
    demo.renderTable = function () {
        var table = $("table");
        var componentTree = generateCatComponentTree(cats);
        
        fluid.selfRender(table, componentTree, {
            cutpoints: cutpoints
        });
    };
    
})(jQuery);