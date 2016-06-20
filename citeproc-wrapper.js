/**
 * Created by Nils Weiher on 14.06.16.
 *
 * Copyright (c) 2016 Heidelberg University Library
 * Distributed under the GNU GPL v3. For full terms see the file
 * LICENSE.md
 */

(function( window, document, CSL ) {
  if (typeof CSL != "undefined") {
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

  // Plugin defaults – added as a property on our plugin function.
  $.fn.citeRender.defaults = {
    style: "chicago-fullnote-bibliography",
    lang: "de-DE",
    baseUrl: "/static/citeproc",
    dataUrl: "/api/csl_data"
  };
})( jQuery, CSL );

