/**
 * Created by Nils Weiher on 14.06.16.
 *
 * Copyright (c) 2016 Heidelberg University Library
 * Distributed under the GNU GPL v3. For full terms see the file
 * LICENSE.md
 */

(function( window, document, $, CSL ) {
  if (typeof CSL === "undefined") {
    console.log('CSL object not defined. Has citeproc.js been loaded?')
  }
  function initCiteprocDeferred(opts, citationData, processorReady) {
    var citeprocSys = {
      citationData: $.extend({}, citationData),
      locales: {},
      retrieveLocale: function ( lang ){ return this.locales[lang] },
      retrieveItem: function( id ) {
        id = "" + id;
        if(id in this.citationData) {
          return this.citationData[id];
        }
        else {
          console.log('Unknown id ' + id);
        }
      },
      renderCitation: function ( book_id ) {
        this.engine.updateItems([book_id]);
        // Function returns an array, the first element of the second entry will be returned
        return this.engine.makeBibliography()[1][0];
      }
    };
    var lang = CSL.localeResolve(opts.lang, $.fn.citeRender.defaults.lang).best;
    var loadLocaleDeferred =  {};
    if(lang != 'en-US') {
      // Get the locales
      loadLocaleDeferred = $.get(opts.baseUrl + '/locales/locales-' + lang + '.xml', function(localeText) {
        citeprocSys.locales[lang] = localeText;
      }, 'text');
    }
    // Return a promise that will be resolved with the citeprocSys containing an initialised CSL.Engine
    return $.when(
      // Get the CSL style
      $.get(opts.baseUrl + '/styles/' + opts.style + '.csl', function(data ) {
        citeprocSys.style = data;
      }),
      // Get the default locale
      $.get(opts.baseUrl + '/locales/locales-en-US.xml', function(localeText) {
        citeprocSys.locales['en-US'] = localeText;
      }, 'text'),
      loadLocaleDeferred
    ).then(function() {
      citeprocSys.engine = new CSL.Engine(citeprocSys, citeprocSys.style, lang, true);
      // Run callback if given
      if ( processorReady ) { processorReady(citeprocSys) }
      return citeprocSys;
    });
  }

  $.fn.citeRender = function (bookId, options ) {
    // Extend our default options with those provided.
    // Note that the first argument to extend is an empty
    // object – this is to keep from overriding our "defaults" object.
    var opts = $.extend( {}, $.fn.citeRender.defaults, options );
    var elements = this;
    var citationData = {};
    $.when( $.get(opts.dataUrl + '/' + bookId), initCiteprocDeferred(opts, citationData))
      .then(function (result, citeproc) {
        citeproc.citationData[result[0].id] = result[0];
        elements.html(citeproc.renderCitation(bookId));
      });
    return this;
  };

  var createCitationPanel = function (bookId, style, opts) {
     var panel = document.createElement('div');
     panel.setAttribute('class', 'panel  panel-default');

     var panel_heading = document.createElement('div');

    var heading_id = "heading_" + style.id;
    var headings = {"class":"panel-heading", "role":"tab", "id": heading_id};
     $(panel_heading).attr(headings);

     var panel_heading_title = document.createElement('h4');
     panel_heading_title.setAttribute('class', 'panel-title');

     var body_id = "body_" + style.id;
     var heading_title_link_attributes = {"class":"collapsed", "role":"button", "data-toggle":"collapse","data-parent":"#" + opts.accordionID, "href": "#" + body_id ,"aria-controls": body_id, "aria-expanded": "false"};
     var  heading_title = document.createElement('a');
     heading_title.innerText = style.displayname;


     $(heading_title).attr(heading_title_link_attributes);
     panel_heading_title.appendChild(heading_title);
     panel_heading.appendChild(panel_heading_title);
     panel.appendChild(panel_heading);
    var panel_body = document.createElement('div');

     var body_attrs = {"class":"panel-collapse collapse", "role": "tabpanel", "id":body_id, "aria-labelledby": heading_id};
     $(panel_body).attr(body_attrs);
    var panel_body_div = document.createElement('div');
    panel_body_div.setAttribute('class', 'panel-body');
    panel_body.appendChild(panel_body_div);
    // Attach event listener to panel body to display citation
    $(panel_body).on('show.bs.collapse', function () {
      $(panel_body_div).citeRender(bookId, {'style': style.id});
      console.log("show " + style.id);
    });

    panel.appendChild(panel_body)
    return panel;
  };

  $.fn.citeRenderAll = function (bookId, options) {
    "use strict";
    var opts = $.extend( {}, $.fn.citeRender.defaults, options );
    var accordion = document.createElement('div');
    $(accordion).attr({ "class": "panel-group", "id": opts.accordionId, "role":"tablist", "aria-multiselectable":"true"});
    console.log("citeRenderAll");
    console.log(opts);
    opts.styles.forEach(function (style) {

      var panel = createCitationPanel(bookId, style, opts);
      console.log(panel);
      accordion.appendChild(panel);
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
    }
  ];

  // Plugin defaults – added as a property on our plugin function.
  $.fn.citeRender.defaults = {
    styles: styles,
    style: "chicago-fullnote-bibliography",
    lang: "de-DE",
    baseUrl: "/static/citeproc",
    dataUrl: "/api/csl",
    accordionID:"citationAccodion"
  };
})( window, document, jQuery, CSL );
