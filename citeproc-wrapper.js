/**
 * Created by Nils Weiher on 14.06.16.
 *
 * Copyright (c) 2016 Heidelberg University Library
 * Distributed under the GNU GPL v3. For full terms see the file
 * LICENSE.md
 */

(function (window, document, $, CSL) {
    if (typeof CSL === "undefined") {
        console.log('CSL object not defined. Has citeproc.js been loaded?')
    }
    var citeprocSys = {
        citationData: {},
        locales: {},
        addCitationItem: function(item) {
            "use strict";
            this.citationData[item.id] = item;
        },
        addCitationItems: function(citationData) {
            "use strict";
            this.citationData = $.extend({}, this.citationData, citationData);
        },
        hasLocale: function (lang) {
            return lang in this.locales;
        },
        addLocale: function (lang, localeText) {
            if (! (lang in this.locales)) {
                this.locales[lang] = localeText;
            }
        },
        retrieveLocale: function (lang) {
            return this.locales[lang]
        },
        retrieveItem: function (id) {
            id = "" + id;
            if (id in this.citationData) {
                return this.citationData[id];
            }
            else {
                console.log('Unknown id ' + id);
            }
        }
    };

    function initCiteprocDeferred(opts, processorReady) {
        var lang = CSL.localeResolve(opts.lang, $.fn.citeRender.defaults.lang).best;
        var loadLocaleDeferred = {};
        if (lang != 'en-US' && !citeprocSys.hasLocale(lang)) {
            // Get the locales
            loadLocaleDeferred = $.get(opts.baseUrl + '/locales/locales-' + lang + '.xml', null, null, 'text');
        }
        var defaultLocalePromise = {};
        // Check if default locale has already been loaded
        if (!citeprocSys.hasLocale('en-US')) {
            defaultLocalePromise = $.get(opts.baseUrl + '/locales/locales-en-US.xml', null, null, 'text');
        }
        // Return a promise that will be resolved with the citeprocSys containing an initialised CSL.Engine
        return $.when(
            // Get the CSL style
            $.get(opts.baseUrl + '/styles/' + opts.style + '.csl'),
            // Get the default locale
            defaultLocalePromise,
            loadLocaleDeferred
        ).then(function (styleResult, defaultLocaleResult, localeResult) {
            citeprocSys.addLocale('en-US', defaultLocaleResult[0]);
            citeprocSys.addLocale(lang, localeResult[0]);
            // Everything has been loaded, styleResult is an array with the following structure:
            // [ data, statusText, jqXHR ]
            var engine = new CSL.Engine(citeprocSys, styleResult[0], lang, true);
            // Return simple object enacapsulating the engine
            var renderer = {
                engine: engine,
                renderCitation: function (book_id) {
                    this.engine.updateItems([book_id]);
                    // Function returns an array, the first element of the second entry will be returned
                    return this.engine.makeBibliography()[1][0];
                }
            };
            // Run callback if given
            if (processorReady) {
                processorReady(renderer);
            }
            return renderer;
        });
    }

    $.fn.citeRender = function (bookId, options) {
        // Extend our default options with those provided.
        // Note that the first argument to extend is an empty
        // object – this is to keep from overriding our "defaults" object.
        var opts = $.extend({}, $.fn.citeRender.defaults, options);
        var elements = this;
        $.when($.get(opts.dataUrl + '/' + bookId), initCiteprocDeferred(opts))
            .then(function (result, renderer) {
                citeprocSys.addCitationItem(result[0]);
                elements.html(renderer.renderCitation(bookId));
            });
        return this;
    };

    var createCitationPanel = function (bookId, style, opts) {
        var panel = document.createElement('div');
        panel.setAttribute('class', 'panel  panel-default');
        var headingId = "heading_" + style.id;
        var bodyId = "body_" + style.id;
        var panelHeading = document.createElement('div');
        $(panelHeading).attr({
            "style": "padding: 5px 10px; cursor: pointer",
            "class": "panel-heading collapsed",
            "role": "tab",
            "id": headingId,
            "data-toggle": "collapse",
            "data-parent": "#" + opts.accordionID,
            "data-target": "#" + bodyId
        });
        var headingTitleLink = document.createElement('a');
        var headingTitle = document.createElement('h5');
        headingTitle.setAttribute('class', 'panel-title');
        headingTitle.innerText = style.displayname;
        headingTitleLink.appendChild(headingTitle);
        panelHeading.appendChild(headingTitleLink);
        panel.appendChild(panelHeading);
        var panelBody = document.createElement('div');
        $(panelBody).attr({
            "class": "panel-collapse collapse",
            "role": "tabpanel",
            "id": bodyId,
            "aria-labelledby": headingId
        });
        var panelBodyDiv = document.createElement('div');
        panelBodyDiv.setAttribute('class', 'panel-body');
        panelBody.appendChild(panelBodyDiv);
        var showHandler = function () {
            $(panelBodyDiv).citeRender(bookId, {'style': style.id});
            // Remove the event handler, so that the citation will only be rendered once
            $(panelBody).off('show.bs.collapse', showHandler);
        };
        // Attach event handler to panel body to display citation
        $(panelBody).on('show.bs.collapse', showHandler);

        panel.appendChild(panelBody);
        return panel;
    };

    $.fn.citationDisplay = function (bookId, options) {
        "use strict";
        var opts = $.extend({}, $.fn.citeRender.defaults, options);
        var accordion = document.createElement('div');
        $(accordion).attr({
            "class": "panel-group",
            "id": opts.accordionId,
            "role": "tablist",
            "aria-multiselectable": "true"
        });
        opts.styles.forEach(function (style) {
            accordion.appendChild(createCitationPanel(bookId, style, opts));
        });
        this.append(accordion);
        return this;
    };
    
    // List of configured styles for the citation popup.
    // id is the filename of the .csl file
    var styles = [
        {
            "id": "chicago-fullnote-bibliography",
            "displayname": "CMOS 16"
        },
        {
            "id": "apa",
            "displayname": "APA"
        },
        {
            "id": "emerald-harvard",
            "displayname": "Harvard"
        },
        {
            "id": "modern-language-association-8th-edition",
            "displayname": "MLA"
        }
    ];

    // Plugin defaults – added as a property on our plugin function.
    $.fn.citeRender.defaults = {
        styles: styles,
        style: "chicago-fullnote-bibliography",
        lang: "de-DE",
        baseUrl: "/static/citeproc",
        dataUrl: "/api/csl",
        accordionID: "citationAccordion"
    };
})(window, document, jQuery, CSL);
