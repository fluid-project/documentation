/*global jQuery*/

var demo = demo || {};

(function ($) {
    
    var findTabForTarget = function (that, target) {
        if (target.is(that.options.selectors.tabs)) {
            return target;
        } else {
            return target.parents(that.options.selectors.tabs).eq(0);
        }
    };
    
    var showPanelForTab = function (that, tab) {
        // Hide any showing panels.
        that.panels.hide();
        
        // Find the panel that is labelled by this tab.
        var panel = that.panels.eq(that.tabs.index(tab));
        
        // Set it as the active descendent of the tab list.
        that.tabContainer.attr("aria-activedescendant", tab.id);
        
        // Show the panel.
        panel.show();
    };
    
    var createActivateHandler = function (that) {
        return function (evt) {
            var toSelect = findTabForTarget(that, $(evt.target));
            
            // Deselect any previously activated tabs.
            that.tabs.removeClass(that.options.styles.selected);
            
            // Select the new one.
            toSelect.addClass(that.options.styles.selected);
            
            // And show its associated panel.
            showPanelForTab(that, toSelect); 
            
            return false; 
        };
    };
    
    var addKeyNav = function (that, activateHandler) {
        // Make the tablist accessible with the Tab key.
        that.tabContainer.attr("tabindex", "0");

        // Make each tab accessible with the left and right arrow keys.
        that.tabContainer.fluid("selectable", {
            selectableSelector: that.options.selectors.tabs,
            direction: fluid.a11y.orientation.HORIZONTAL,
            onSelect: function (tab) {
                $(tab).addClass(that.options.styles.highlighted);
            },
            
            onUnselect: function (tab) {
                $(tab).removeClass(that.options.styles.highlighted);
            }
        });
        
        // Remove each tab's inner link from the tab order, since they're now focusable with the arrows.
        that.tabs.children("a").attr("tabindex", -1);
        
        // Make each tab activatable with Spacebar and Enter.
        that.tabs.fluid("activatable", activateHandler);
    };
    
    var addAria = function (that) {
        // Give the page an application role to denote desktop-style keyboard navigation.
        $("body").attr("role", "application");
        
        // Identify the container as a list of tabs.
        that.tabContainer.attr("role", "tablist");
        
        // Give each tab the "tab" role.
        that.tabs.attr("role", "tab");
        
        // Give each panel the appropriate role.
        that.panels.attr("role", "tabpanel");
        that.panels.each(function (idx, panel) {
            var tabForPanel = that.tabs.eq(idx);
            // Relate the panel to the tab that labels it.
            $(panel).attr("aria-labelledby", tabForPanel[0].id);
        });
    };
    
    var setup = function (that, options) {  
        // Merge defaults with user options.
        that.options = $.extend({}, demo.a11yTabs.defaults, options);
        
        // Grab stuff from the DOM.
        that.tabContainer = $(that.options.selectors.tabContainer, that.container);
        that.tabs = $(that.options.selectors.tabs, that.tabContainer);
        that.panels = $(that.options.selectors.panels, that.container);

        addAria(that);
        
        // Add keyboard & mouse events. We can reuse the same handler for both click and keyboard activate
        var activateHandler = createActivateHandler(that);
        addKeyNav(that, activateHandler);
        that.tabs.click(activateHandler);
        
        // Hide all the panels to start, then select the first tab.
        that.panels.hide();
        that.tabs.eq(0).fluid("activate");
        
        return that;
    };
    
    // Creator function.
    demo.a11yTabs = function (container, options) {
        // Stable pointer to the current instance.
        var that = {
            container: $(container)
        };
    
        // Public methods.
        that.select = function (tabToSelect) {
            tabToSelect.click();
        };
        
        return setup(that, options);
    };
    
    demo.a11yTabs.defaults = {
        selectors: {
            tabContainer: "#tabs",
            tabs: "li", 
            panels: "#panels > div"
        },
        
        styles: {
            selected: "selected",
            highlighted: "highlighted"
        }
    };
}(jQuery));
