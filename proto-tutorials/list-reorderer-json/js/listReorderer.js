/*
Copyright 2007-2009 University of Cambridge
Copyright 2007-2009 University of Toronto
Copyright 2007-2009 University of California, Berkeley

Licensed under the Educational Community License (ECL), Version 2.0 or the New
BSD license. You may not use this file except in compliance with one these
Licenses.

You may obtain a copy of the ECL 2.0 License and BSD License at
https://source.fluidproject.org/svn/LICENSE.txt
*/

/*global jQuery*/
/*global fluid*/
/*global demo*/

var demo = demo || {};
(function ($, fluid) {
    
    var sendOrderToServer = function (itemMoved, position, allItems) {
        // Loop through all items, accumulating a list of all their IDs in the correct order.
        var itemIDs = fluid.transform(allItems, function (item) {
            return $(item).attr("id");
        });

        // Send the item order back to the server.
        $.ajax({
            url: "http://myserver.org/listOrder",
            data: itemIDs,
            dataType: "json",
            success: function () {
                alert("Successfully sent the item order to the server!");
            },
            error: function () {
                alert("There was an error sending the item order to the server.");
            }
        });
    };
    
    demo.initListReorderer = function () {
        return fluid.reorderList(".todo-list", {
            selectors: {
                movables: ".movable"
            },
            
            // Register an event listener for the Reorderer's afterMove event,
            // which fires every time an item has been moved by the user.
            listeners: {
                afterMove: sendOrderToServer
            }
        });
    };
})(jQuery, fluid);