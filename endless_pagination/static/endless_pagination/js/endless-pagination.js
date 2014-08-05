(function ($) {
    'use strict';

    var defaults = {
        // Twitter-style pagination container selector.
        containerSelector: '.endless_container',
        // Twitter-style pagination loading selector.
        loadingSelector: '.endless_loading',
        // Twitter-style pagination link selector.
        moreSelector: 'a.endless_more',
        // Digg-style pagination page template selector.
        pageSelector: '.endless_page_template',
        // Digg-style pagination link selector.
        pagesSelector: 'a.endless_page_link',
        // The page wrapper
        pageContainer: 'table tbody',
        // Callback called when the user clicks to get another page.
        onClick: function() {},
        // Callback called when the data fetch begins
        onBefore: function() {},
        // Callback called when the new page is correctly displayed.
        onCompleted: function() {},
        // Set this to true to use the paginate-on-scroll feature.
        paginateOnScroll: false,
        // If paginate-on-scroll is on, this margin will be used.
        paginateOnScrollMargin : 1,
        // If paginate-on-scroll is on, it is possible to define chunks.
        paginateOnScrollChunkSize: 0,
        // End Point to fetch data
        endPoint: location.pathname,
        // Form to get filters from
        formSelector: null,
        // Custom filters that can be passed
        customFilters: {},
        // Enable sorting
        enableSorting: true,
        // Sorter 
        sorterTriggerSelector: 'table th',
        // Column to sort by
        sortColumn: {},
        // CSS class to header when sorting ASC
        cssSortingClassAsc: 'headerSortUp',
        // CSS class to header when sorting DESC
        cssSortingClassDesc: 'headerSortDown',
        // Save the initial context
        initialContext: {},
        // Initial amount of loaded pages
        loadedPages: 1,
        // Set request method to fetch data
        requestMethod: 'GET'
    };

    var settings = null;

    var methods = {
        init : function(options) {

            settings = $.extend(defaults, options);

            var getContext = function( link ) {
                return settings.initialContext = {
                    key: link.attr('rel').split(' ')[0],
                    url: link.attr('href')
                };
            };

            return this.each(function() 
            {
                var element = $(this);

                // Configure to check if there is form to filter
                methods.configFormFilter( element );
                // Configure sorting feature
                methods.configSorting( element );

                // Twitter-style pagination.
                element.on('click', settings.moreSelector, function() {

                    var link = $(this),
                        html_link = link.get(0),
                        container = link.closest(settings.containerSelector),
                        loading = container.find(settings.loadingSelector);

                    // Avoid multiple Ajax calls.
                    if ( loading.is(':visible') ) {
                        return false;
                    }

                    link.hide();
                    loading.show();
                    var context = getContext( link );

                    // Fire onClick callback.
                    if ( settings.onClick.apply( html_link, [context] ) !== false ) {

                        var params = {
                            url: context.url,
                            data: methods.getData(),
                            complete: function( fragment )
                            {
                                container.before( fragment );
                                container.remove();
                                
                                // Increase the number of loaded pages.
                                settings.loadedPages += 1;

                                // Fire onCompleted callback.
                                settings.onCompleted.apply( html_link, [context, fragment] );
                            }
                        };

                        methods.fetchPage( params );
                    }

                    return false;
                });

                // On scroll pagination.
                if ( settings.paginateOnScroll ) {

                    var win = $(window),
                        doc = $(document);
                    win.scroll(
                        function()
                        {
                            if ( doc.height() - win.height() -
                                win.scrollTop() <= settings.paginateOnScrollMargin )
                                 {
                                // Do not paginate on scroll if chunks are used and
                                // the current chunk is complete.
                                var chunckSize = settings.paginateOnScrollChunkSize;

                                if ( !chunckSize || settings.loadedPages % chunckSize ) {
                                    element.find( settings.moreSelector ).click();
                                }
                            }
                        }
                    );
                }

                // Digg-style pagination.
                element.on( 'click', settings.pagesSelector, function() {
                    var link = $(this),
                        html_link = link.get(0),
                        context = getContext(link);
                    // Fire onClick callback.
                    if ( settings.onClick.apply(html_link, [context]) !== false ) {

                        var page_template = link.closest(settings.pageSelector),
                            data = 'querystring_key=' + context.key;

                        // Send the Ajax request.
                        page_template.load(context.url, data, function(fragment) {
                            // Fire onCompleted callback.
                            settings.onCompleted.apply( html_link, [context, fragment.trim()] );
                        });
                    }
                    return false;
                });
            });
        },
        fetchPage: function( param )
        {
            // Send the Ajax request.
            $.ajax(
                {
                    url: param.url,
                    dataType: 'html',
                    method: settings.requestMethod,
                    data: param.data,
                    beforeSend: function()
                    {
                        // Fire onCompleted callback.
                        settings.onBefore.apply( null, [settings.initialContext] );
                    },
                    success: param.complete
                }
            );  
        },

        getUrlParameters: function()
        {
            var sPageURL = window.location.search.substring(1);
            var sURLVariables = sPageURL.split('&');
            var parameters = {};
            for (var i = 0; i < sURLVariables.length; i++) 
            {
                var sParameterName = sURLVariables[i].split('=');
                parameters[sParameterName[0]] = sParameterName[1];
            }
          
            return parameters;
        },

        // Get the data to submit to server and fetch the page
        getData: function()
        {
            var data = this.getUrlParameters();

            // If there is a form defined, grab the data
            if ( settings.formSelector && $( settings.formSelector ).length ) {

                $.each( $( settings.formSelector ).serializeArray(),
                    function(i, v) 
                    {
                        data[v.name] = v.value;
                    }
                );
            }

            // If there is custom data set to the server
            if ( settings.customFilters )
                data = $.extend( data, settings.customFilters );

            // Some column sorting
            if ( settings.sortColumn ) {

                data.sort_column = settings.sortColumn.column;
                data.sort_order = settings.sortColumn.order;
            }

            data.querystring_key = settings.initialContext.key;
            return data;
        },

        configFormFilter: function( element )
        {
            if ( settings.formSelector && $( settings.formSelector ).length ) {
                $( settings.formSelector ).on( 'submit',
                    function( e )
                    {
                        e.stopPropagation();

                        var params = {
                            url: settings.endPoint,
                            data: methods.getData(),
                            complete: function( fragment )
                            {
                                $( settings.pageContainer ).empty().append( fragment );
                                
                                // Set the number of loaded pages.
                                settings.loadedPages = 1;

                                // Fire onCompleted callback.
                                settings.onCompleted.apply( null, [settings.initialContext, fragment] );
                            }
                        };

                        methods.fetchPage( params );
                        return false;
                    }
                );
            }
        },
        configSorting: function( element )
        {
            if ( !settings.enableSorting )
                return false;

            $( element ).find( settings.sorterTriggerSelector ).on( 'click',
                function()
                {
                    if ( $( this ).data( 'column' ) == undefined )
                        return false;

                    var order = 0;
                    var sortCss = [settings.cssSortingClassAsc, settings.cssSortingClassDesc];

                    if ( $( this ).data( 'sort' ) != undefined )
                        order = ~~!parseInt( $( this ).data( 'sort' ) );

                    $( this ).data( 'sort', order );

                    settings.sortColumn = {
                        column: $( this ).data( 'column' ),
                        order: order
                    };

                    $( element ).find( settings.sorterTriggerSelector )
                            .removeClass( sortCss[0] )
                            .removeClass( sortCss[1] );
                    
                    $( this ).addClass( sortCss[order] );

                    var params = {
                        url: settings.endPoint,
                        data: methods.getData(),
                        complete: function( fragment )
                        {
                            $( settings.pageContainer ).empty().append( fragment );
                            
                            // Set the number of loaded pages.
                            settings.loadedPages = 1;

                            // Fire onCompleted callback.
                            settings.onCompleted.apply( null, [settings.initialContext, fragment] );
                        }
                    };

                    methods.fetchPage( params );
                }
            );
        }
    };

    $.fn.endlessPaginate = function(options) 
    {
        if ( methods[options] ) {
            return methods[ options ].apply( this, Array.prototype.slice.call( arguments, 1 ));
        } else if ( typeof options === 'object' || !options ) {
            // Default to "init"
            return methods.init.apply( this, arguments );
        } else {
            $.error( 'Method ' +  methodOrOptions + ' does not exist on jQuery.tooltip' );
        }
    };

    $.endlessPaginate = function(options) {
        return $('body').endlessPaginate(options);
    };

})(jQuery);
