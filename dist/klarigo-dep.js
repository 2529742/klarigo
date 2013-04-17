// Domain Public by Eric Wendelin http://eriwen.com/ (2008)
//                  Luke Smith http://lucassmith.name/ (2008)
//                  Loic Dachary <loic@dachary.org> (2008)
//                  Johan Euphrosine <proppy@aminche.com> (2008)
//                  Oyvind Sean Kinsey http://kinsey.no/blog (2010)
//                  Victor Homyakov <victor-homyakov@users.sourceforge.net> (2010)

/**
 * Main function giving a function stack trace with a forced or passed in Error
 *
 * @cfg {Error} e The error to create a stacktrace from (optional)
 * @cfg {Boolean} guess If we should try to resolve the names of anonymous functions
 * @return {Array} of Strings with functions, lines, files, and arguments where possible
 */
function printStackTrace(options) {
    options = options || {guess: true};
    var ex = options.e || null, guess = !!options.guess;
    var p = new printStackTrace.implementation(), result = p.run(ex);
    return (guess) ? p.guessAnonymousFunctions(result) : result;
}

printStackTrace.implementation = function() {
};

printStackTrace.implementation.prototype = {
    /**
     * @param {Error} ex The error to create a stacktrace from (optional)
     * @param {String} mode Forced mode (optional, mostly for unit tests)
     */
    run: function(ex, mode) {
        ex = ex || this.createException();
        // examine exception properties w/o debugger
        //for (var prop in ex) {alert("Ex['" + prop + "']=" + ex[prop]);}
        mode = mode || this.mode(ex);
        if (mode === 'other') {
            return this.other(arguments.callee);
        } else {
            return this[mode](ex);
        }
    },

    createException: function() {
        try {
            this.undef();
        } catch (e) {
            return e;
        }
    },

    /**
     * Mode could differ for different exception, e.g.
     * exceptions in Chrome may or may not have arguments or stack.
     *
     * @return {String} mode of operation for the exception
     */
    mode: function(e) {
        if (e['arguments'] && e.stack) {
            return 'chrome';
        } else if (e.stack && e.sourceURL) {
            return 'safari';
        } else if (typeof e.message === 'string' && typeof window !== 'undefined' && window.opera) {
            // e.message.indexOf("Backtrace:") > -1 -> opera
            // !e.stacktrace -> opera
            if (!e.stacktrace) {
                return 'opera9'; // use e.message
            }
            // 'opera#sourceloc' in e -> opera9, opera10a
            if (e.message.indexOf('\n') > -1 && e.message.split('\n').length > e.stacktrace.split('\n').length) {
                return 'opera9'; // use e.message
            }
            // e.stacktrace && !e.stack -> opera10a
            if (!e.stack) {
                return 'opera10a'; // use e.stacktrace
            }
            // e.stacktrace && e.stack -> opera10b
            if (e.stacktrace.indexOf("called from line") < 0) {
                return 'opera10b'; // use e.stacktrace, format differs from 'opera10a'
            }
            // e.stacktrace && e.stack -> opera11
            return 'opera11'; // use e.stacktrace, format differs from 'opera10a', 'opera10b'
        } else if (e.stack) {
            return 'firefox';
        }
        return 'other';
    },

    /**
     * Given a context, function name, and callback function, overwrite it so that it calls
     * printStackTrace() first with a callback and then runs the rest of the body.
     *
     * @param {Object} context of execution (e.g. window)
     * @param {String} functionName to instrument
     * @param {Function} function to call with a stack trace on invocation
     */
    instrumentFunction: function(context, functionName, callback) {
        context = context || window;
        var original = context[functionName];
        context[functionName] = function instrumented() {
            callback.call(this, printStackTrace().slice(4));
            return context[functionName]._instrumented.apply(this, arguments);
        };
        context[functionName]._instrumented = original;
    },

    /**
     * Given a context and function name of a function that has been
     * instrumented, revert the function to it's original (non-instrumented)
     * state.
     *
     * @param {Object} context of execution (e.g. window)
     * @param {String} functionName to de-instrument
     */
    deinstrumentFunction: function(context, functionName) {
        if (context[functionName].constructor === Function &&
                context[functionName]._instrumented &&
                context[functionName]._instrumented.constructor === Function) {
            context[functionName] = context[functionName]._instrumented;
        }
    },

    /**
     * Given an Error object, return a formatted Array based on Chrome's stack string.
     *
     * @param e - Error object to inspect
     * @return Array<String> of function calls, files and line numbers
     */
    chrome: function(e) {
        var stack = (e.stack + '\n').replace(/^\S[^\(]+?[\n$]/gm, '').
          replace(/^\s+(at eval )?at\s+/gm, '').
          replace(/^([^\(]+?)([\n$])/gm, '{anonymous}()@$1$2').
          replace(/^Object.<anonymous>\s*\(([^\)]+)\)/gm, '{anonymous}()@$1').split('\n');
        stack.pop();
        return stack;
    },

    /**
     * Given an Error object, return a formatted Array based on Safari's stack string.
     *
     * @param e - Error object to inspect
     * @return Array<String> of function calls, files and line numbers
     */
    safari: function(e) {
        return e.stack.replace(/\[native code\]\n/m, '').replace(/^@/gm, '{anonymous}()@').split('\n');
    },

    /**
     * Given an Error object, return a formatted Array based on Firefox's stack string.
     *
     * @param e - Error object to inspect
     * @return Array<String> of function calls, files and line numbers
     */
    firefox: function(e) {
        return e.stack.replace(/(?:\n@:0)?\s+$/m, '').replace(/^[\(@]/gm, '{anonymous}()@').split('\n');
    },

    opera11: function(e) {
        var ANON = '{anonymous}', lineRE = /^.*line (\d+), column (\d+)(?: in (.+))? in (\S+):$/;
        var lines = e.stacktrace.split('\n'), result = [];

        for (var i = 0, len = lines.length; i < len; i += 2) {
            var match = lineRE.exec(lines[i]);
            if (match) {
                var location = match[4] + ':' + match[1] + ':' + match[2];
                var fnName = match[3] || "global code";
                fnName = fnName.replace(/<anonymous function: (\S+)>/, "$1").replace(/<anonymous function>/, ANON);
                result.push(fnName + '@' + location + ' -- ' + lines[i + 1].replace(/^\s+/, ''));
            }
        }

        return result;
    },

    opera10b: function(e) {
        // "<anonymous function: run>([arguments not available])@file://localhost/G:/js/stacktrace.js:27\n" +
        // "printStackTrace([arguments not available])@file://localhost/G:/js/stacktrace.js:18\n" +
        // "@file://localhost/G:/js/test/functional/testcase1.html:15"
        var lineRE = /^(.*)@(.+):(\d+)$/;
        var lines = e.stacktrace.split('\n'), result = [];

        for (var i = 0, len = lines.length; i < len; i++) {
            var match = lineRE.exec(lines[i]);
            if (match) {
                var fnName = match[1]? (match[1] + '()') : "global code";
                result.push(fnName + '@' + match[2] + ':' + match[3]);
            }
        }

        return result;
    },

    /**
     * Given an Error object, return a formatted Array based on Opera 10's stacktrace string.
     *
     * @param e - Error object to inspect
     * @return Array<String> of function calls, files and line numbers
     */
    opera10a: function(e) {
        // "  Line 27 of linked script file://localhost/G:/js/stacktrace.js\n"
        // "  Line 11 of inline#1 script in file://localhost/G:/js/test/functional/testcase1.html: In function foo\n"
        var ANON = '{anonymous}', lineRE = /Line (\d+).*script (?:in )?(\S+)(?:: In function (\S+))?$/i;
        var lines = e.stacktrace.split('\n'), result = [];

        for (var i = 0, len = lines.length; i < len; i += 2) {
            var match = lineRE.exec(lines[i]);
            if (match) {
                var fnName = match[3] || ANON;
                result.push(fnName + '()@' + match[2] + ':' + match[1] + ' -- ' + lines[i + 1].replace(/^\s+/, ''));
            }
        }

        return result;
    },

    // Opera 7.x-9.2x only!
    opera9: function(e) {
        // "  Line 43 of linked script file://localhost/G:/js/stacktrace.js\n"
        // "  Line 7 of inline#1 script in file://localhost/G:/js/test/functional/testcase1.html\n"
        var ANON = '{anonymous}', lineRE = /Line (\d+).*script (?:in )?(\S+)/i;
        var lines = e.message.split('\n'), result = [];

        for (var i = 2, len = lines.length; i < len; i += 2) {
            var match = lineRE.exec(lines[i]);
            if (match) {
                result.push(ANON + '()@' + match[2] + ':' + match[1] + ' -- ' + lines[i + 1].replace(/^\s+/, ''));
            }
        }

        return result;
    },

    // Safari 5-, IE 9-, and others
    other: function(curr) {
        var ANON = '{anonymous}', fnRE = /function\s*([\w\-$]+)?\s*\(/i, stack = [], fn, args, maxStackSize = 10;
        while (curr && curr['arguments'] && stack.length < maxStackSize) {
            fn = fnRE.test(curr.toString()) ? RegExp.$1 || ANON : ANON;
            args = Array.prototype.slice.call(curr['arguments'] || []);
            stack[stack.length] = fn + '(' + this.stringifyArguments(args) + ')';
            curr = curr.caller;
        }
        return stack;
    },

    /**
     * Given arguments array as a String, subsituting type names for non-string types.
     *
     * @param {Arguments} args
     * @return {Array} of Strings with stringified arguments
     */
    stringifyArguments: function(args) {
        var result = [];
        var slice = Array.prototype.slice;
        for (var i = 0; i < args.length; ++i) {
            var arg = args[i];
            if (arg === undefined) {
                result[i] = 'undefined';
            } else if (arg === null) {
                result[i] = 'null';
            } else if (arg.constructor) {
                if (arg.constructor === Array) {
                    if (arg.length < 3) {
                        result[i] = '[' + this.stringifyArguments(arg) + ']';
                    } else {
                        result[i] = '[' + this.stringifyArguments(slice.call(arg, 0, 1)) + '...' + this.stringifyArguments(slice.call(arg, -1)) + ']';
                    }
                } else if (arg.constructor === Object) {
                    result[i] = '#object';
                } else if (arg.constructor === Function) {
                    result[i] = '#function';
                } else if (arg.constructor === String) {
                    result[i] = '"' + arg + '"';
                } else if (arg.constructor === Number) {
                    result[i] = arg;
                }
            }
        }
        return result.join(',');
    },

    sourceCache: {},

    /**
     * @return the text from a given URL
     */
    ajax: function(url) {
        var req = this.createXMLHTTPObject();
        if (req) {
            try {
                req.open('GET', url, false);
                //req.overrideMimeType('text/plain');
                //req.overrideMimeType('text/javascript');
                req.send(null);
                //return req.status == 200 ? req.responseText : '';
                return req.responseText;
            } catch (e) {
            }
        }
        return '';
    },

    /**
     * Try XHR methods in order and store XHR factory.
     *
     * @return <Function> XHR function or equivalent
     */
    createXMLHTTPObject: function() {
        var xmlhttp, XMLHttpFactories = [
            function() {
                return new XMLHttpRequest();
            }, function() {
                return new ActiveXObject('Msxml2.XMLHTTP');
            }, function() {
                return new ActiveXObject('Msxml3.XMLHTTP');
            }, function() {
                return new ActiveXObject('Microsoft.XMLHTTP');
            }
        ];
        for (var i = 0; i < XMLHttpFactories.length; i++) {
            try {
                xmlhttp = XMLHttpFactories[i]();
                // Use memoization to cache the factory
                this.createXMLHTTPObject = XMLHttpFactories[i];
                return xmlhttp;
            } catch (e) {
            }
        }
    },

    /**
     * Given a URL, check if it is in the same domain (so we can get the source
     * via Ajax).
     *
     * @param url <String> source url
     * @return False if we need a cross-domain request
     */
    isSameDomain: function(url) {
        return typeof location !== "undefined" && url.indexOf(location.hostname) !== -1; // location may not be defined, e.g. when running from nodejs.
    },

    /**
     * Get source code from given URL if in the same domain.
     *
     * @param url <String> JS source URL
     * @return <Array> Array of source code lines
     */
    getSource: function(url) {
        // TODO reuse source from script tags?
        if (!(url in this.sourceCache)) {
            this.sourceCache[url] = this.ajax(url).split('\n');
        }
        return this.sourceCache[url];
    },

    guessAnonymousFunctions: function(stack) {
        for (var i = 0; i < stack.length; ++i) {
            var reStack = /\{anonymous\}\(.*\)@(.*)/,
                reRef = /^(.*?)(?::(\d+))(?::(\d+))?(?: -- .+)?$/,
                frame = stack[i], ref = reStack.exec(frame);

            if (ref) {
                var m = reRef.exec(ref[1]);
                if (m) { // If falsey, we did not get any file/line information
                    var file = m[1], lineno = m[2], charno = m[3] || 0;
                    if (file && this.isSameDomain(file) && lineno) {
                        var functionName = this.guessAnonymousFunction(file, lineno, charno);
                        stack[i] = frame.replace('{anonymous}', functionName);
                    }
                }
            }
        }
        return stack;
    },

    guessAnonymousFunction: function(url, lineNo, charNo) {
        var ret;
        try {
            ret = this.findFunctionName(this.getSource(url), lineNo);
        } catch (e) {
            ret = 'getSource failed with url: ' + url + ', exception: ' + e.toString();
        }
        return ret;
    },

    findFunctionName: function(source, lineNo) {
        // FIXME findFunctionName fails for compressed source
        // (more than one function on the same line)
        // TODO use captured args
        // function {name}({args}) m[1]=name m[2]=args
        var reFunctionDeclaration = /function\s+([^(]*?)\s*\(([^)]*)\)/;
        // {name} = function ({args}) TODO args capture
        // /['"]?([0-9A-Za-z_]+)['"]?\s*[:=]\s*function(?:[^(]*)/
        var reFunctionExpression = /['"]?([0-9A-Za-z_]+)['"]?\s*[:=]\s*function\b/;
        // {name} = eval()
        var reFunctionEvaluation = /['"]?([0-9A-Za-z_]+)['"]?\s*[:=]\s*(?:eval|new Function)\b/;
        // Walk backwards in the source lines until we find
        // the line which matches one of the patterns above
        var code = "", line, maxLines = Math.min(lineNo, 20), m, commentPos;
        for (var i = 0; i < maxLines; ++i) {
            // lineNo is 1-based, source[] is 0-based
            line = source[lineNo - i - 1];
            commentPos = line.indexOf('//');
            if (commentPos >= 0) {
                line = line.substr(0, commentPos);
            }
            // TODO check other types of comments? Commented code may lead to false positive
            if (line) {
                code = line + code;
                m = reFunctionExpression.exec(code);
                if (m && m[1]) {
                    return m[1];
                }
                m = reFunctionDeclaration.exec(code);
                if (m && m[1]) {
                    //return m[1] + "(" + (m[2] || "") + ")";
                    return m[1];
                }
                m = reFunctionEvaluation.exec(code);
                if (m && m[1]) {
                    return m[1];
                }
            }
        }
        return '(?)';
    }
};
/*! Copyright (c) 2010 Brandon Aaron (http://brandonaaron.net)
 * Dual licensed under the MIT (MIT_LICENSE.txt)
 * and GPL Version 2 (GPL_LICENSE.txt) licenses.
 *
 * Version: 1.1.1
 * Requires jQuery 1.3+
 * Docs: http://docs.jquery.com/Plugins/livequery
 */

(function($) {

$.extend($.fn, {
	livequery: function(type, fn, fn2) {
		var self = this, q;

		// Handle different call patterns
		if ($.isFunction(type))
			fn2 = fn, fn = type, type = undefined;

		// See if Live Query already exists
		$.each( $.livequery.queries, function(i, query) {
			if ( self.selector == query.selector && self.context == query.context &&
				type == query.type && (!fn || fn.$lqguid == query.fn.$lqguid) && (!fn2 || fn2.$lqguid == query.fn2.$lqguid) )
					// Found the query, exit the each loop
					return (q = query) && false;
		});

		// Create new Live Query if it wasn't found
		q = q || new $.livequery(this.selector, this.context, type, fn, fn2);

		// Make sure it is running
		q.stopped = false;

		// Run it immediately for the first time
		q.run();

		// Contnue the chain
		return this;
	},

	expire: function(type, fn, fn2) {
		var self = this;

		// Handle different call patterns
		if ($.isFunction(type))
			fn2 = fn, fn = type, type = undefined;

		// Find the Live Query based on arguments and stop it
		$.each( $.livequery.queries, function(i, query) {
			if ( self.selector == query.selector && self.context == query.context &&
				(!type || type == query.type) && (!fn || fn.$lqguid == query.fn.$lqguid) && (!fn2 || fn2.$lqguid == query.fn2.$lqguid) && !this.stopped )
					$.livequery.stop(query.id);
		});

		// Continue the chain
		return this;
	}
});

$.livequery = function(selector, context, type, fn, fn2) {
	this.selector = selector;
	this.context  = context;
	this.type     = type;
	this.fn       = fn;
	this.fn2      = fn2;
	this.elements = [];
	this.stopped  = false;

	// The id is the index of the Live Query in $.livequery.queries
	this.id = $.livequery.queries.push(this)-1;

	// Mark the functions for matching later on
	fn.$lqguid = fn.$lqguid || $.livequery.guid++;
	if (fn2) fn2.$lqguid = fn2.$lqguid || $.livequery.guid++;

	// Return the Live Query
	return this;
};

$.livequery.prototype = {
	stop: function() {
		var query = this;

		if ( this.type )
			// Unbind all bound events
			this.elements.unbind(this.type, this.fn);
		else if (this.fn2)
			// Call the second function for all matched elements
			this.elements.each(function(i, el) {
				query.fn2.apply(el);
			});

		// Clear out matched elements
		this.elements = [];

		// Stop the Live Query from running until restarted
		this.stopped = true;
	},

	run: function() {
		// Short-circuit if stopped
		if ( this.stopped ) return;
		var query = this;

		var oEls = this.elements,
			els  = $(this.selector, this.context),
			nEls = els.not(oEls);

		// Set elements to the latest set of matched elements
		this.elements = els;

		if (this.type) {
			// Bind events to newly matched elements
			nEls.bind(this.type, this.fn);

			// Unbind events to elements no longer matched
			if (oEls.length > 0)
				$.each(oEls, function(i, el) {
					if ( $.inArray(el, els) < 0 )
						$.event.remove(el, query.type, query.fn);
				});
		}
		else {
			// Call the first function for newly matched elements
			nEls.each(function() {
				query.fn.apply(this);
			});

			// Call the second function for elements no longer matched
			if ( this.fn2 && oEls.length > 0 )
				$.each(oEls, function(i, el) {
					if ( $.inArray(el, els) < 0 )
						query.fn2.apply(el);
				});
		}
	}
};

$.extend($.livequery, {
	guid: 0,
	queries: [],
	queue: [],
	running: false,
	timeout: null,

	checkQueue: function() {
		if ( $.livequery.running && $.livequery.queue.length ) {
			var length = $.livequery.queue.length;
			// Run each Live Query currently in the queue
			while ( length-- )
				$.livequery.queries[ $.livequery.queue.shift() ].run();
		}
	},

	pause: function() {
		// Don't run anymore Live Queries until restarted
		$.livequery.running = false;
	},

	play: function() {
		// Restart Live Queries
		$.livequery.running = true;
		// Request a run of the Live Queries
		$.livequery.run();
	},

	registerPlugin: function() {
		$.each( arguments, function(i,n) {
			// Short-circuit if the method doesn't exist
			if (!$.fn[n]) return;

			// Save a reference to the original method
			var old = $.fn[n];

			// Create a new method
			$.fn[n] = function() {
				// Call the original method
				var r = old.apply(this, arguments);

				// Request a run of the Live Queries
				$.livequery.run();

				// Return the original methods result
				return r;
			}
		});
	},

	run: function(id) {
		if (id != undefined) {
			// Put the particular Live Query in the queue if it doesn't already exist
			if ( $.inArray(id, $.livequery.queue) < 0 )
				$.livequery.queue.push( id );
		}
		else
			// Put each Live Query in the queue if it doesn't already exist
			$.each( $.livequery.queries, function(id) {
				if ( $.inArray(id, $.livequery.queue) < 0 )
					$.livequery.queue.push( id );
			});

		// Clear timeout if it already exists
		if ($.livequery.timeout) clearTimeout($.livequery.timeout);
		// Create a timeout to check the queue and actually run the Live Queries
		$.livequery.timeout = setTimeout($.livequery.checkQueue, 20);
	},

	stop: function(id) {
		if (id != undefined)
			// Stop are particular Live Query
			$.livequery.queries[ id ].stop();
		else
			// Stop all Live Queries
			$.each( $.livequery.queries, function(id) {
				$.livequery.queries[ id ].stop();
			});
	}
});

// Register core DOM manipulation methods
$.livequery.registerPlugin('append', 'prepend', 'after', 'before', 'wrap', 'attr', 'removeAttr', 'addClass', 'removeClass', 'toggleClass', 'empty', 'remove', 'html');

// Run Live Queries when the Document is ready
$(function() { $.livequery.play(); });

})(jQuery);/*
 * $ URIs @VERSION
 * 
 * Copyright (c) 2008,2009 Jeni Tennison
 * Licensed under the MIT (MIT-LICENSE.txt)
 *
 */
/**
 * @fileOverview $ URIs
 * @author <a href="mailto:jeni@jenitennison.com">Jeni Tennison</a>
 * @copyright (c) 2008,2009 Jeni Tennison
 * @license MIT license (MIT-LICENSE.txt)
 * @version 1.0
 */
/**
 * @class
 * @name jQuery
 * @exports $ as jQuery
 * @description rdfQuery is a <a href="http://jquery.com/">jQuery</a> plugin. The only fields and methods listed here are those that come as part of the rdfQuery library.
 */
(function ($) {

  var
    mem = {},
    uriRegex = /^(([a-z][\-a-z0-9+\.]*):)?(\/\/([^\/?#]+))?([^?#]*)?(\?([^#]*))?(#(.*))?$/i,
    docURI,

    parseURI = function (u) {
      var m = u.match(uriRegex);
      if (m === null) {
        throw "Malformed URI: " + u;
      }
      return {
        scheme: m[1] ? m[2].toLowerCase() : undefined,
        authority: m[3] ? m[4] : undefined,
        path: m[5] || '',
        query: m[6] ? m[7] : undefined,
        fragment: m[8] ? m[9] : undefined
      };
    },

    removeDotSegments = function (u) {
      var r = '', m = [];
      if (/\./.test(u)) {
        while (u !== undefined && u !== '') {
          if (u === '.' || u === '..') {
            u = '';
          } else if (/^\.\.\//.test(u)) { // starts with ../
            u = u.substring(3);
          } else if (/^\.\//.test(u)) { // starts with ./
            u = u.substring(2);
          } else if (/^\/\.(\/|$)/.test(u)) { // starts with /./ or consists of /.
            u = '/' + u.substring(3);
          } else if (/^\/\.\.(\/|$)/.test(u)) { // starts with /../ or consists of /..
            u = '/' + u.substring(4);
            r = r.replace(/\/?[^\/]+$/, '');
          } else {
            m = u.match(/^(\/?[^\/]*)(\/.*)?$/);
            u = m[2];
            r = r + m[1];
          }
        }
        return r;
      } else {
        return u;
      }
    },

    merge = function (b, r) {
      if (b.authority !== '' && (b.path === undefined || b.path === '')) {
        return '/' + r;
      } else {
        return b.path.replace(/[^\/]+$/, '') + r;
      }
    };

  /**
   * Creates a new jQuery.uri object. This should be invoked as a method rather than constructed using new.
   * @class Represents a URI
   * @param {String} [relative='']
   * @param {String|jQuery.uri} [base] Defaults to the base URI of the page
   * @returns {jQuery.uri} The new jQuery.uri object.
   * @example uri = jQuery.uri('/my/file.html');
   */
  $.uri = function (relative, base) {
    var uri;
    relative = relative || '';
    if (mem[relative]) {
      return mem[relative];
    }
    base = base || $.uri.base();
    if (typeof base === 'string') {
      base = $.uri.absolute(base);
    }
    uri = new $.uri.fn.init(relative, base);
    if (mem[uri]) {
      return mem[uri];
    } else {
      mem[uri] = uri;
      return uri;
    }
  };

  $.uri.fn = $.uri.prototype = {
    /**
     * The scheme used in the URI
     * @type String
     */
    scheme: undefined,
    /**
     * The authority used in the URI
     * @type String
     */
    authority: undefined,
    /**
     * The path used in the URI
     * @type String
     */
    path: undefined,
    /**
     * The query part of the URI
     * @type String
     */
    query: undefined,
    /**
     * The fragment part of the URI
     * @type String
     */
    fragment: undefined,
    
    init: function (relative, base) {
      var r = {};
      base = base || {};
      $.extend(this, parseURI(relative));
      if (this.scheme === undefined) {
        this.scheme = base.scheme;
        if (this.authority !== undefined) {
          this.path = removeDotSegments(this.path);
        } else {
          this.authority = base.authority;
          if (this.path === '') {
            this.path = base.path;
            if (this.query === undefined) {
              this.query = base.query;
            }
          } else {
            if (!/^\//.test(this.path)) {
              this.path = merge(base, this.path);
            }
            this.path = removeDotSegments(this.path);
          }
        }
      }
      if (this.scheme === undefined) {
        throw "Malformed URI: URI is not an absolute URI and no base supplied: " + relative;
      }
      return this;
    },
  
    /**
     * Resolves a relative URI relative to this URI
     * @param {String} relative
     * @returns jQuery.uri
     */
    resolve: function (relative) {
      return $.uri(relative, this);
    },
    
    /**
     * Creates a relative URI giving the path from this URI to the absolute URI passed as a parameter
     * @param {String|jQuery.uri} absolute
     * @returns String
     */
    relative: function (absolute) {
      var aPath, bPath, i = 0, j, resultPath = [], result = '';
      if (typeof absolute === 'string') {
        absolute = $.uri(absolute, {});
      }
      if (absolute.scheme !== this.scheme || 
          absolute.authority !== this.authority) {
        return absolute.toString();
      }
      if (absolute.path !== this.path) {
        aPath = absolute.path.split('/');
        bPath = this.path.split('/');
        if (aPath[1] !== bPath[1]) {
          result = absolute.path;
        } else {
          while (aPath[i] === bPath[i]) {
            i += 1;
          }
          j = i;
          for (; i < bPath.length - 1; i += 1) {
            resultPath.push('..');
          }
          for (; j < aPath.length; j += 1) {
            resultPath.push(aPath[j]);
          }
          result = resultPath.join('/');
        }
        result = absolute.query === undefined ? result : result + '?' + absolute.query;
        result = absolute.fragment === undefined ? result : result + '#' + absolute.fragment;
        return result;
      }
      if (absolute.query !== undefined && absolute.query !== this.query) {
        return '?' + absolute.query + (absolute.fragment === undefined ? '' : '#' + absolute.fragment);
      }
      if (absolute.fragment !== undefined && absolute.fragment !== this.fragment) {
        return '#' + absolute.fragment;
      }
      return '';
    },
  
    /**
     * Returns the URI as an absolute string
     * @returns String
     */
    toString: function () {
      var result = '';
      if (this._string) {
        return this._string;
      } else {
        result = this.scheme === undefined ? result : (result + this.scheme + ':');
        result = this.authority === undefined ? result : (result + '//' + this.authority);
        result = result + this.path;
        result = this.query === undefined ? result : (result + '?' + this.query);
        result = this.fragment === undefined ? result : (result + '#' + this.fragment);
        this._string = result;
        return result;
      }
    }
  
  };

  $.uri.fn.init.prototype = $.uri.fn;

  /**
   * Creates a {@link jQuery.uri} from a known-to-be-absolute URI
   * @param {String}
   * @returns {jQuery.uri}
   */
  $.uri.absolute = function (uri) {
    return $.uri(uri, {});
  };

  /**
   * Creates a {@link jQuery.uri} from a relative URI and an optional base URI
   * @returns {jQuery.uri}
   * @see jQuery.uri
   */
  $.uri.resolve = function (relative, base) {
    return $.uri(relative, base);
  };
  
  /**
   * Creates a string giving the relative path from a base URI to an absolute URI
   * @param {String} absolute
   * @param {String} base
   * @returns {String}
   */
  $.uri.relative = function (absolute, base) {
    return $.uri(base, {}).relative(absolute);
  };
  
  /**
   * Returns the base URI of the page
   * @returns {jQuery.uri}
   */
  $.uri.base = function () {
    return $(document).base();
  };
  
  /**
   * Returns the base URI in scope for the first selected element
   * @methodOf jQuery#
   * @name jQuery#base
   * @returns {jQuery.uri}
   * @example baseURI = $('img').base();
   */
  $.fn.base = function () {
    var base = $(this).parents().andSelf().find('base').attr('href'),
      doc = $(this)[0].ownerDocument || document,
      docURI = $.uri.absolute(doc.location === null ? document.location.href : doc.location.href);
    return base === undefined ? docURI : $.uri(base, docURI);
  };

})(jQuery);
/*
 * jQuery CURIE @VERSION
 * 
 * Copyright (c) 2008,2009 Jeni Tennison
 * Licensed under the MIT (MIT-LICENSE.txt)
 *
 * Depends:
 *  jquery.uri.js
 */
/**
 * @fileOverview XML Namespace processing
 * @author <a href="mailto:jeni@jenitennison.com">Jeni Tennison</a>
 * @copyright (c) 2008,2009 Jeni Tennison
 * @license MIT license (MIT-LICENSE.txt)
 * @version 1.0
 * @requires jquery.uri.js
 */

/*global jQuery */
(function ($) {

  var 
    xmlNs = 'http://www.w3.org/XML/1998/namespace',
    xmlnsNs = 'http://www.w3.org/2000/xmlns/',
    
    xmlnsRegex = /\sxmlns(?::([^ =]+))?\s*=\s*(?:"([^"]*)"|'([^']*)')/g,
    
    ncNameChar = '[-A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\u10000-\uEFFFF\.0-9\u00B7\u0300-\u036F\u203F-\u2040]',
    ncNameStartChar = '[\u0041-\u005A\u0061-\u007A\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u00FF\u0100-\u0131\u0134-\u013E\u0141-\u0148\u014A-\u017E\u0180-\u01C3\u01CD-\u01F0\u01F4-\u01F5\u01FA-\u0217\u0250-\u02A8\u02BB-\u02C1\u0386\u0388-\u038A\u038C\u038E-\u03A1\u03A3-\u03CE\u03D0-\u03D6\u03DA\u03DC\u03DE\u03E0\u03E2-\u03F3\u0401-\u040C\u040E-\u044F\u0451-\u045C\u045E-\u0481\u0490-\u04C4\u04C7-\u04C8\u04CB-\u04CC\u04D0-\u04EB\u04EE-\u04F5\u04F8-\u04F9\u0531-\u0556\u0559\u0561-\u0586\u05D0-\u05EA\u05F0-\u05F2\u0621-\u063A\u0641-\u064A\u0671-\u06B7\u06BA-\u06BE\u06C0-\u06CE\u06D0-\u06D3\u06D5\u06E5-\u06E6\u0905-\u0939\u093D\u0958-\u0961\u0985-\u098C\u098F-\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09DC-\u09DD\u09DF-\u09E1\u09F0-\u09F1\u0A05-\u0A0A\u0A0F-\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32-\u0A33\u0A35-\u0A36\u0A38-\u0A39\u0A59-\u0A5C\u0A5E\u0A72-\u0A74\u0A85-\u0A8B\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2-\u0AB3\u0AB5-\u0AB9\u0ABD\u0AE0\u0B05-\u0B0C\u0B0F-\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32-\u0B33\u0B36-\u0B39\u0B3D\u0B5C-\u0B5D\u0B5F-\u0B61\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99-\u0B9A\u0B9C\u0B9E-\u0B9F\u0BA3-\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB5\u0BB7-\u0BB9\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C33\u0C35-\u0C39\u0C60-\u0C61\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CDE\u0CE0-\u0CE1\u0D05-\u0D0C\u0D0E-\u0D10\u0D12-\u0D28\u0D2A-\u0D39\u0D60-\u0D61\u0E01-\u0E2E\u0E30\u0E32-\u0E33\u0E40-\u0E45\u0E81-\u0E82\u0E84\u0E87-\u0E88\u0E8A\u0E8D\u0E94-\u0E97\u0E99-\u0E9F\u0EA1-\u0EA3\u0EA5\u0EA7\u0EAA-\u0EAB\u0EAD-\u0EAE\u0EB0\u0EB2-\u0EB3\u0EBD\u0EC0-\u0EC4\u0F40-\u0F47\u0F49-\u0F69\u10A0-\u10C5\u10D0-\u10F6\u1100\u1102-\u1103\u1105-\u1107\u1109\u110B-\u110C\u110E-\u1112\u113C\u113E\u1140\u114C\u114E\u1150\u1154-\u1155\u1159\u115F-\u1161\u1163\u1165\u1167\u1169\u116D-\u116E\u1172-\u1173\u1175\u119E\u11A8\u11AB\u11AE-\u11AF\u11B7-\u11B8\u11BA\u11BC-\u11C2\u11EB\u11F0\u11F9\u1E00-\u1E9B\u1EA0-\u1EF9\u1F00-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u2126\u212A-\u212B\u212E\u2180-\u2182\u3041-\u3094\u30A1-\u30FA\u3105-\u312C\uAC00-\uD7A3\u4E00-\u9FA5\u3007\u3021-\u3029_]',
    ncNameRegex = new RegExp('^' + ncNameStartChar + ncNameChar + '*$');
    

/**
 * Returns the namespaces declared in the scope of the first selected element, or
 * adds a namespace declaration to all selected elements. Pass in no parameters
 * to return all namespaces bindings on the first selected element. If only 
 * the prefix parameter is specified, this method will return the namespace
 * URI that is bound to the specified prefix on the first element in the selection
 * If the prefix and uri parameters are both specified, this method will
 * add the binding of the specified prefix and namespace URI to all elements
 * in the selection.
 * @methodOf jQuery#
 * @name jQuery#xmlns
 * @param {String} [prefix] Restricts the namespaces returned to only the namespace with the specified namespace prefix.
 * @param {String|jQuery.uri} [uri] Adds a namespace declaration to the selected elements that maps the specified prefix to the specified namespace.
 * @param {Object} [inherited] A map of inherited namespace bindings.
 * @returns {Object|jQuery.uri|jQuery}
 * @example 
 * // Retrieve all of the namespace bindings on the HTML document element
 * var nsMap = $('html').xmlns();
 * @example
 * // Retrieve the namespace URI mapped to the 'dc' prefix on the HTML document element
 * var dcNamespace = $('html').xmlns('dc');
 * @example
 * // Create a namespace declaration that binds the 'dc' prefix to the URI 'http://purl.org/dc/elements/1.1/'
 * $('html').xmlns('dc', 'http://purl.org/dc/elements/1.1/');
 */
  $.fn.xmlns = function (prefix, uri, inherited) {
    var 
      elem = this.eq(0),
      ns = elem.data('xmlns'),
      e = elem[0], a, p, i,
      decl = prefix ? 'xmlns:' + prefix : 'xmlns',
      value,
      tag, found = false;
    if (uri === undefined) {
      if (prefix === undefined) { // get the in-scope declarations on the first element
        if (ns === undefined) {
          ns = {
//            xml: $.uri(xmlNs)
          };
          if (e.attributes && e.attributes.getNamedItemNS) {
            for (i = 0; i < e.attributes.length; i += 1) {
              a = e.attributes[i];
              if (/^xmlns(:(.+))?$/.test(a.nodeName)) {
                prefix = /^xmlns(:(.+))?$/.exec(a.nodeName)[2] || '';
                value = a.nodeValue;
                if (prefix === '' || (value !== '' && value !== xmlNs && value !== xmlnsNs && ncNameRegex.test(prefix) && prefix !== 'xml' && prefix !== 'xmlns')) {
                  ns[prefix] = $.uri(a.nodeValue);
                  found = true;
                }
              }
            }
          } else {
            tag = /<[^>]+>/.exec(e.outerHTML);
            a = xmlnsRegex.exec(tag);
            while (a !== null) {
              prefix = a[1] || '';
              value = a[2] || a[3];
              if (prefix === '' || (value !== '' && value !== xmlNs && value !== xmlnsNs && ncNameRegex.test(prefix) && prefix !== 'xml' && prefix !== 'xmlns')) {
                ns[prefix] = $.uri(a[2] || a[3]);
                found = true;
              }
              a = xmlnsRegex.exec(tag);
            }
            xmlnsRegex.lastIndex = 0;
          }
          inherited = inherited || (e.parentNode.nodeType === 1 ? elem.parent().xmlns() : {});
          ns = found ? $.extend({}, inherited, ns) : inherited;
          elem.data('xmlns', ns);
        }
        return ns;
      } else if (typeof prefix === 'object') { // set the prefix mappings defined in the object
        for (p in prefix) {
          if (typeof prefix[p] === 'string' && ncNameRegex.test(p)) {
            this.xmlns(p, prefix[p]);
          }
        }
        this.find('*').andSelf().removeData('xmlns');
        return this;
      } else { // get the in-scope declaration associated with this prefix on the first element
        if (ns === undefined) {
          ns = elem.xmlns();
        }
        return ns[prefix];
      }
    } else { // set
      this.find('*').andSelf().removeData('xmlns');
      return this.attr(decl, uri);
    }
  };

/**
 * Removes one or more XML namespace bindings from the selected elements.
 * @methodOf jQuery#
 * @name jQuery#removeXmlns
 * @param {String|Object|String[]} prefix The prefix(es) of the XML namespace bindings that are to be removed from the selected elements.
 * @returns {jQuery} The original jQuery object.
 * @example
 * // Remove the foaf namespace declaration from the body element:
 * $('body').removeXmlns('foaf');
 * @example
 * // Remove the foo and bar namespace declarations from all h2 elements
 * $('h2').removeXmlns(['foo', 'bar']);
 * @example
 * // Remove the foo and bar namespace declarations from all h2 elements
 * var namespaces = { foo : 'http://www.example.org/foo', bar : 'http://www.example.org/bar' };
 * $('h2').removeXmlns(namespaces);
 */
  $.fn.removeXmlns = function (prefix) {
    var decl, p, i;
    if (typeof prefix === 'object') {
      if (prefix.length === undefined) { // assume an object representing namespaces
        for (p in prefix) {
          if (typeof prefix[p] === 'string') {
            this.removeXmlns(p);
          }
        }
      } else { // it's an array
        for (i = 0; i < prefix.length; i += 1) {
          this.removeXmlns(prefix[i]);
        }
      }
    } else {
      decl = prefix ? 'xmlns:' + prefix : 'xmlns';
      this.removeAttr(decl);
    }
    this.find('*').andSelf().removeData('xmlns');
    return this;
  };

  $.fn.qname = function (name) {
    var m, prefix, namespace;
    if (name === undefined) {
      if (this[0].outerHTML === undefined) {
        name = this[0].nodeName.toLowerCase();
      } else {
        name = /<([^ >]+)/.exec(this[0].outerHTML)[1].toLowerCase();
      }
    }
    if (name === '?xml:namespace') {
      // there's a prefix on the name, but we can't get at it
      throw "XMLinHTML: Unable to get the prefix to resolve the name of this element";
    }
    m = /^(([^:]+):)?([^:]+)$/.exec(name);
    prefix = m[2] || '';
    namespace = this.xmlns(prefix);
    if (namespace === undefined && prefix !== '') {
      throw "MalformedQName: The prefix " + prefix + " is not declared";
    }
    return {
      namespace: namespace,
      localPart: m[3],
      prefix: prefix,
      name: name
    };
  };

})(jQuery);
/*
 * jQuery CURIE @VERSION
 *
 * Copyright (c) 2008,2009 Jeni Tennison
 * Licensed under the MIT (MIT-LICENSE.txt)
 *
 * Depends:
 *  jquery.uri.js
 */
/**
 * @fileOverview XML Schema datatype handling
 * @author <a href="mailto:jeni@jenitennison.com">Jeni Tennison</a>
 * @copyright (c) 2008,2009 Jeni Tennison
 * @license MIT license (MIT-LICENSE.txt)
 * @version 1.0
 * @requires jquery.uri.js
 */

(function ($) {

  var strip = function (value) {
    return value.replace(/[ \t\n\r]+/, ' ').replace(/^ +/, '').replace(/ +$/, '');
  };

  /**
   * Creates a new jQuery.typedValue object. This should be invoked as a method
   * rather than constructed using new.
   * @class Represents a value with an XML Schema datatype
   * @param {String} value The string representation of the value
   * @param {String} datatype The XML Schema datatype URI
   * @returns {jQuery.typedValue}
   * @example intValue = jQuery.typedValue('42', 'http://www.w3.org/2001/XMLSchema#integer');
   */
  $.typedValue = function (value, datatype) {
    return $.typedValue.fn.init(value, datatype);
  };

  $.typedValue.fn = $.typedValue.prototype = {
    /**
     * The string representation of the value
     * @memberOf jQuery.typedValue#
     */
    representation: undefined,
    /**
     * The value as an object. The type of the object will
     * depend on the XML Schema datatype URI specified
     * in the constructor. The following table lists the mappings
     * currently supported:
     * <table>
     *   <tr>
     *   <th>XML Schema Datatype</th>
     *   <th>Value type</th>
     *   </tr>
     *   <tr>
     *     <td>http://www.w3.org/2001/XMLSchema#string</td>
     *     <td>string</td>
     *   </tr>
     *   <tr>
     *     <td>http://www.w3.org/2001/XMLSchema#token</td>
     *     <td>string</td>
     *   </tr>
     *   <tr>
     *     <td>http://www.w3.org/2001/XMLSchema#NCName</td>
     *     <td>string</td>
     *   </tr>
     *   <tr>
     *     <td>http://www.w3.org/2001/XMLSchema#boolean</td>
     *     <td>bool</td>
     *   </tr>
     *   <tr>
     *     <td>http://www.w3.org/2001/XMLSchema#decimal</td>
     *     <td>string</td>
     *   </tr>
     *   <tr>
     *     <td>http://www.w3.org/2001/XMLSchema#integer</td>
     *     <td>int</td>
     *   </tr>
     *   <tr>
     *     <td>http://www.w3.org/2001/XMLSchema#int</td>
     *     <td>int</td>
     *   </tr>
     *   <tr>
     *     <td>http://www.w3.org/2001/XMLSchema#float</td>
     *     <td>float</td>
     *   </tr>
     *   <tr>
     *     <td>http://www.w3.org/2001/XMLSchema#double</td>
     *     <td>float</td>
     *   </tr>
     *   <tr>
     *     <td>http://www.w3.org/2001/XMLSchema#dateTime</td>
     *     <td>string</td>
     *   </tr>
     *   <tr>
     *     <td>http://www.w3.org/2001/XMLSchema#date</td>
     *     <td>string</td>
     *   </tr>
     *   <tr>
     *     <td>http://www.w3.org/2001/XMLSchema#gYear</td>
     *     <td>int</td>
     *   </tr>
     *   <tr>
     *     <td>http://www.w3.org/2001/XMLSchema#gMonthDay</td>
     *     <td>string</td>
     *   </tr>
     *   <tr>
     *     <td>http://www.w3.org/2001/XMLSchema#anyURI</td>
     *     <td>{@link jQuery.uri}</td>
     *   </tr>
     * </table>
     * @memberOf jQuery.typedValue#
     */
    value: undefined,
    /**
     * The XML Schema datatype URI for the value's datatype
     * @memberOf jQuery.typedValue#
     */
    datatype: undefined,

    init: function (value, datatype) {
      var d = $.typedValue.types[datatype];
      if (true) {//TODO: SEBASTIAN $.typedValue.valid(value, datatype)) {
        this.representation = value;
        this.datatype = datatype;
        this.value = d === undefined ? strip(value) : d.value(d.strip ? strip(value) : value);
        return this;
      } else {
        throw {
          name: 'InvalidValue',
          message: value + ' is not a valid ' + datatype + ' value'
        };
      }
    }
  };

  $.typedValue.fn.init.prototype = $.typedValue.fn;

  /**
   * An object that holds the datatypes supported by the script. The properties of this object are the URIs of the datatypes, and each datatype has four properties:
   * <dl>
   *   <dt>strip</dt>
   *   <dd>A boolean value that indicates whether whitespace should be stripped from the value prior to testing against the regular expression or passing to the value function.</dd>
   *   <dt>regex</dt>
   *   <dd>A regular expression that valid values of the type must match.</dd>
   *   <dt>validate</dt>
   *   <dd>Optional. A function that performs further testing on the value.</dd>
   *   <dt>value</dt>
   *   <dd>A function that returns a Javascript object equivalent for the value.</dd>
   * </dl>
   * You can add to this object as necessary for your own datatypes, and {@link jQuery.typedValue} and {@link jQuery.typedValue.valid} will work with them.
   * @see jQuery.typedValue
   * @see jQuery.typedValue.valid
   */
  $.typedValue.types = {};

  $.typedValue.types['http://www.w3.org/2001/XMLSchema#string'] = {
    regex: /^.*$/,
    strip: false,
    /** @ignore */
    value: function (v) {
      return v;
    }
  };

  $.typedValue.types['http://www.w3.org/2001/XMLSchema#token'] = {
    regex: /^.*$/,
    strip: true,
    /** @ignore */
    value: function (v) {
      return strip(v);
    }
  };

  $.typedValue.types['http://www.w3.org/2001/XMLSchema#NCName'] = {
    regex: /^[a-z_][-\.a-z0-9]+$/i,
    strip: true,
    /** @ignore */
    value: function (v) {
      return strip(v);
    }
  };

  $.typedValue.types['http://www.w3.org/2001/XMLSchema#boolean'] = {
    regex: /^(?:true|false|1|0)$/,
    strip: true,
    /** @ignore */
    value: function (v) {
      return v === 'true' || v === '1';
    }
  };

  $.typedValue.types['http://www.w3.org/2001/XMLSchema#decimal'] = {
    regex: /^[\-\+]?(?:[0-9]+\.[0-9]*|\.[0-9]+|[0-9]+)$/,
    strip: true,
    /** @ignore */
    value: function (v) {
      v = v.replace(/^0+/, '')
        .replace(/0+$/, '');
      if (v === '') {
        v = '0.0';
      }
      if (v.substring(0, 1) === '.') {
        v = '0' + v;
      }
      if (/\.$/.test(v)) {
        v = v + '0';
      } else if (!/\./.test(v)) {
        v = v + '.0';
      }
      return v;
    }
  };

  $.typedValue.types['http://www.w3.org/2001/XMLSchema#integer'] = {
    regex: /^[\-\+]?[0-9]+$/,
    strip: true,
    /** @ignore */
    value: function (v) {
      return parseInt(v, 10);
    }
  };

  $.typedValue.types['http://www.w3.org/2001/XMLSchema#int'] = {
    regex: /^[\-\+]?[0-9]+$/,
    strip: true,
    /** @ignore */
    value: function (v) {
      return parseInt(v, 10);
    }
  };

  $.typedValue.types['http://www.w3.org/2001/XMLSchema#float'] = {
    regex: /^(?:[\-\+]?(?:[0-9]+\.[0-9]*|\.[0-9]+|[0-9]+)(?:[eE][\-\+]?[0-9]+)?|[\-\+]?INF|NaN)$/,
    strip: true,
    /** @ignore */
    value: function (v) {
      if (v === '-INF') {
        return -1 / 0;
      } else if (v === 'INF' || v === '+INF') {
        return 1 / 0;
      } else {
        return parseFloat(v);
      }
    }
  };

  $.typedValue.types['http://www.w3.org/2001/XMLSchema#double'] = {
    regex: $.typedValue.types['http://www.w3.org/2001/XMLSchema#float'].regex,
    strip: true,
    value: $.typedValue.types['http://www.w3.org/2001/XMLSchema#float'].value
  };

  $.typedValue.types['http://www.w3.org/2001/XMLSchema#duration'] = {
    regex: /^([\-\+])?P(?:([0-9]+)Y)?(?:([0-9]+)M)?(?:([0-9]+)D)?(?:T(?:([0-9]+)H)?(?:([0-9]+)M)?(?:([0-9]+(?:\.[0-9]+))?S)?)$/,
    /** @ignore */
    validate: function (v) {
      var m = this.regex.exec(v);
      return m[2] || m[3] || m[4] || m[5] || m[6] || m[7];
    },
    strip: true,
    /** @ignore */
    value: function (v) {
      return v;
    }
  };

  $.typedValue.types['http://www.w3.org/2001/XMLSchema#yearMonthDuration'] = {
    regex: /^([\-\+])?P(?:([0-9]+)Y)?(?:([0-9]+)M)?$/,
    /** @ignore */
    validate: function (v) {
      var m = this.regex.exec(v);
      return m[2] || m[3];
    },
    strip: true,
    /** @ignore */
    value: function (v) {
      var m = this.regex.exec(v),
        years = m[2] || 0,
        months = m[3] || 0;
      months += years * 12;
      return m[1] === '-' ? -1 * months : months;
    }
  };

  $.typedValue.types['http://www.w3.org/2001/XMLSchema#dateTime'] = {
    regex: /^(-?[0-9]{4,})-([0-9]{2})-([0-9]{2})T([0-9]{2}):([0-9]{2}):(([0-9]{2})(\.([0-9]+))?)((?:[\-\+]([0-9]{2}):([0-9]{2}))|Z)?$/,
    /** @ignore */
    validate: function (v) {
      var
        m = this.regex.exec(v),
        year = parseInt(m[1], 10),
        tz = m[10] === undefined || m[10] === 'Z' ? '+0000' : m[10].replace(/:/, ''),
        date;
      if (year === 0 ||
          parseInt(tz, 10) < -1400 || parseInt(tz, 10) > 1400) {
        return false;
      }
      try {
        year = year < 100 ? Math.abs(year) + 1000 : year;
        month = parseInt(m[2], 10);
        day = parseInt(m[3], 10);
        if (day > 31) {
          return false;
        } else if (day > 30 && !(month === 1 || month === 3 || month === 5 || month === 7 || month === 8 || month === 10 || month === 12)) {
          return false;
        } else if (month === 2) {
          if (day > 29) {
            return false;
          } else if (day === 29 && (year % 4 !== 0 || (year % 100 === 0 && year % 400 !== 0))) {
            return false;
          }
        }
        date = '' + year + '/' + m[2] + '/' + m[3] + ' ' + m[4] + ':' + m[5] + ':' + m[7] + ' ' + tz;
        date = new Date(date);
        return true;
      } catch (e) {
        return false;
      }
    },
    strip: true,
    /** @ignore */
    value: function (v) {
      return v;
    }
  };

  $.typedValue.types['http://www.w3.org/2001/XMLSchema#date'] = {
    regex: /^(-?[0-9]{4,})-([0-9]{2})-([0-9]{2})((?:[\-\+]([0-9]{2}):([0-9]{2}))|Z)?$/,
    /** @ignore */
    validate: function (v) {
      var
        m = this.regex.exec(v),
        year = parseInt(m[1], 10),
        month = parseInt(m[2], 10),
        day = parseInt(m[3], 10),
        tz = m[10] === undefined || m[10] === 'Z' ? '+0000' : m[10].replace(/:/, '');
      if (year === 0 ||
          month > 12 ||
          day > 31 ||
          parseInt(tz, 10) < -1400 || parseInt(tz, 10) > 1400) {
        return false;
      } else {
        return true;
      }
    },
    strip: true,
    /** @ignore */
    value: function (v) {
      return v;
    }
  };

  $.typedValue.types['http://www.w3.org/2001/XMLSchema#gYear'] = {
    regex: /^-?([0-9]{4,})$/,
    /** @ignore */
    validate: function (v) {
      var i = parseInt(v, 10);
      return i !== 0;
    },
    strip: true,
    /** @ignore */
    value: function (v) {
      return parseInt(v, 10);
    }
  };

  $.typedValue.types['http://www.w3.org/2001/XMLSchema#gMonthDay'] = {
    regex: /^--([0-9]{2})-([0-9]{2})((?:[\-\+]([0-9]{2}):([0-9]{2}))|Z)?$/,
    /** @ignore */
    validate: function (v) {
      var
        m = this.regex.exec(v),
        month = parseInt(m[1], 10),
        day = parseInt(m[2], 10),
        tz = m[3] === undefined || m[3] === 'Z' ? '+0000' : m[3].replace(/:/, '');
      if (month > 12 ||
          day > 31 ||
          parseInt(tz, 10) < -1400 || parseInt(tz, 10) > 1400) {
        return false;
      } else if (month === 2 && day > 29) {
        return false;
      } else if ((month === 4 || month === 6 || month === 9 || month === 11) && day > 30) {
        return false;
      } else {
        return true;
      }
    },
    strip: true,
    /** @ignore */
    value: function (v) {
      return v;
    }
  };

  $.typedValue.types['http://www.w3.org/2001/XMLSchema#anyURI'] = {
    regex: /^.*$/,
    strip: true,
    /** @ignore */
    value: function (v, options) {
      var opts = $.extend({}, $.typedValue.defaults, options);
      return $.uri.resolve(v, opts.base);
    }
  };

  $.typedValue.defaults = {
    base: $.uri.base(),
    namespaces: {}
  };

  /**
   * Checks whether a value is valid according to a given datatype. The datatype must be held in the {@link jQuery.typedValue.types} object.
   * @param {String} value The value to validate.
   * @param {String} datatype The URI for the datatype against which the value will be validated.
   * @returns {boolean} True if the value is valid or the datatype is not recognised.
   * @example validDate = $.typedValue.valid(date, 'http://www.w3.org/2001/XMLSchema#date');
   */
  $.typedValue.valid = function (value, datatype) {
    var d = $.typedValue.types[datatype];
    if (d === undefined) {
      return true;
    } else {
      value = d.strip ? strip(value) : value;
      if (d.regex.test(value)) {
        return d.validate === undefined ? true : d.validate(value);
      } else {
        return false;
      }
    }
  };

})(jQuery);
/*
 * jQuery CURIE @VERSION
 *
 * Copyright (c) 2008,2009 Jeni Tennison
 * Licensed under the MIT (MIT-LICENSE.txt)
 *
 * Depends:
 *  jquery.uri.js
 *  jquery.xmlns.js
 */

/**
 * @fileOverview jQuery CURIE handling
 * @author <a href="mailto:jeni@jenitennison.com">Jeni Tennison</a>
 * @copyright (c) 2008,2009 Jeni Tennison
 * @license MIT license (MIT-LICENSE.txt)
 * @version 1.0
 * @requires jquery.uri.js
 * @requires jquery.xmlns.js
 */
(function ($) {

   /**
    * Creates a {@link jQuery.uri} object by parsing a CURIE.
    * @methodOf jQuery
    * @param {String} curie The CURIE to be parsed
    * @param {String} uri The URI string to be converted to a CURIE.
    * @param {Object} [options] CURIE parsing options
    * @param {string} [options.reservedNamespace='http://www.w3.org/1999/xhtml/vocab#'] The namespace to apply to a CURIE that has no prefix and either starts with a colon or is in the list of reserved local names
    * @param {string} [options.defaultNamespace]  The namespace to apply to a CURIE with no prefix which is not mapped to the reserved namespace by the rules given above.
    * @param {Object} [options.namespaces] A map of namespace bindings used to map CURIE prefixes to URIs.
    * @param {string[]} [options.reserved=['alternate', 'appendix', 'bookmark', 'cite', 'chapter', 'contents', 'copyright', 'first', 'glossary', 'help', 'icon', 'index', 'last', 'license', 'meta', 'next', 'p3pv1', 'prev', 'role', 'section', 'stylesheet', 'subsection', 'start', 'top', 'up']] A list of local names that will always be mapped to the URI specified by reservedNamespace.
    * @param {string} [options.charcase='lower'] Specifies whether the curie's case is altered before it's interpreted. Acceptable values are:
    * <dl>
    * <dt>lower</dt><dd>Force the CURIE string to lower case.</dd>
    * <dt>upper</dt><dd>Force the CURIE string to upper case.</dd>
    * <dt>preserve</dt><dd>Preserve the original case of the CURIE. Note that this might not be possible if the CURIE has been taken from an HTML attribute value because of the case conversions performed automatically by browsers. For this reason, it's a good idea to avoid mixed-case CURIEs within RDFa.</dd>
    * </dl>
    * @returns {jQuery.uri} A new {@link jQuery.uri} object representing the full absolute URI specified by the CURIE.
    */
  $.curie = function (curie, options) {
    var
      opts = $.extend({}, $.curie.defaults, options || {}),
      m = /^(([^:]*):)?(.+)$/.exec(curie),
      prefix = m[2],
      local = m[3],
      ns = opts.namespaces[prefix];
    if (/^:.+/.test(curie)) { // This is the case of a CURIE like ":test"
      if (opts.reservedNamespace === undefined || opts.reservedNamespace === null) {
        throw "Malformed CURIE: No prefix and no default namespace for unprefixed CURIE " + curie;
      } else {
        ns = opts.reservedNamespace;
      }
    } else if (prefix) {
      if (ns === undefined) {
        throw "Malformed CURIE: No namespace binding for " + prefix + " in CURIE " + curie;
      }
    } else {
      if (opts.charcase === 'lower') {
        curie = curie.toLowerCase();
      } else if (opts.charcase === 'upper') {
        curie = curie.toUpperCase();
      }
      if (opts.reserved.length && $.inArray(curie, opts.reserved) >= 0) {
        ns = opts.reservedNamespace;
        local = curie;
      } else if (opts.defaultNamespace === undefined || opts.defaultNamespace === null) {
        // the default namespace is provided by the application; it's not clear whether
        // the default XML namespace should be used if there's a colon but no prefix
        throw "Malformed CURIE: No prefix and no default namespace for unprefixed CURIE " + curie;
      } else {
        ns = opts.defaultNamespace;
      }
    }
    return $.uri(ns + local);
  };

  $.curie.defaults = {
    namespaces: {},
    reserved: [],
    reservedNamespace: undefined,
    defaultNamespace: undefined,
    charcase: 'preserve'
  };

   /**
    * Creates a {@link jQuery.uri} object by parsing a safe CURIE string (a CURIE
    * contained within square brackets). If the input safeCurie string does not
    * start with '[' and end with ']', the entire string content will be interpreted
    * as a URI string.
    * @methodOf jQuery
    * @param {String} safeCurie The safe CURIE string to be parsed.
    * @param {Object} [options] CURIE parsing options
    * @param {string} [options.reservedNamespace='http://www.w3.org/1999/xhtml/vocab#'] The namespace to apply to a CURIE that has no prefix and either starts with a colon or is in the list of reserved local names
    * @param {string} [options.defaultNamespace]  The namespace to apply to a CURIE with no prefix which is not mapped to the reserved namespace by the rules given above.
    * @param {Object} [options.namespaces] A map of namespace bindings used to map CURIE prefixes to URIs.
    * @param {string[]} [options.reserved=['alternate', 'appendix', 'bookmark', 'cite', 'chapter', 'contents', 'copyright',
      'first', 'glossary', 'help', 'icon', 'index', 'last', 'license', 'meta', 'next',
      'p3pv1', 'prev', 'role', 'section', 'stylesheet', 'subsection', 'start', 'top', 'up']]
                        A list of local names that will always be mapped to the URI specified by reservedNamespace.
    * @param {string} [options.charcase='lower'] Specifies whether the curie's case is altered before it's interpreted. Acceptable values are:
    * <dl>
    * <dt>lower</dt><dd>Force the CURIE string to lower case.</dd>
    * <dt>upper</dt><dd>Force the CURIE string to upper case.</dd>
    * <dt>preserve</dt><dd>Preserve the original case of the CURIE. Note that this might not be possible if the CURIE has been taken from an HTML attribute value because of the case conversions performed automatically by browsers. For this reason, it's a good idea to avoid mixed-case CURIEs within RDFa.</dd>
    * </dl>
    * @returns {jQuery.uri} A new {@link jQuery.uri} object representing the full absolute URI specified by the CURIE.
    */
  $.safeCurie = function (safeCurie, options) {
    var m = /^\[([^\]]+)\]$/.exec(safeCurie);
    return m ? $.curie(m[1], options) : $.uri(safeCurie);
  };

   /**
    * Creates a CURIE string from a URI string.
    * @methodOf jQuery
    * @param {String} uri The URI string to be converted to a CURIE.
    * @param {Object} [options] CURIE parsing options
    * @param {string} [options.reservedNamespace='http://www.w3.org/1999/xhtml/vocab#']
    *        If the input URI starts with this value, the generated CURIE will
    *        have no namespace prefix and will start with a colon character (:),
    *        unless the local part of the CURIE is one of the reserved names specified
    *        by the reservedNames option (see below), in which case the generated
    *        CURIE will have no namespace prefix and will not start with a colon
    *        character.
    * @param {string} [options.defaultNamespace]  If the input URI starts with this value, the generated CURIE will have no namespace prefix and will not start with a colon.
    * @param {Object} [options.namespaces] A map of namespace bindings used to map CURIE prefixes to URIs.
    * @param {string[]} [options.reserved=['alternate', 'appendix', 'bookmark', 'cite', 'chapter', 'contents', 'copyright',
      'first', 'glossary', 'help', 'icon', 'index', 'last', 'license', 'meta', 'next',
      'p3pv1', 'prev', 'role', 'section', 'stylesheet', 'subsection', 'start', 'top', 'up']]
                        A list of local names that will always be mapped to the URI specified by reservedNamespace.
    * @param {string} [options.charcase='lower'] Specifies the case normalisation done to the CURIE. Acceptable values are:
    * <dl>
    * <dt>lower</dt><dd>Normalise the CURIE to lower case.</dd>
    * <dt>upper</dt><dd>Normalise the CURIE to upper case.</dd>
    * <dt>preserve</dt><dd>Preserve the original case of the CURIE. Note that this might not be possible if the CURIE has been taken from an HTML attribute value because of the case conversions performed automatically by browsers. For this reason, it's a good idea to avoid mixed-case CURIEs within RDFa.</dd>
    * </dl>
    * @returns {jQuery.uri} A new {@link jQuery.uri} object representing the full absolute URI specified by the CURIE.
    */
  $.createCurie = function (uri, options) {
    var opts = $.extend({}, $.curie.defaults, options || {}),
      ns = opts.namespaces,
      curie;
    uri = $.uri(uri).toString();
    if (opts.reservedNamespace !== undefined && 
        uri.substring(0, opts.reservedNamespace.toString().length) === opts.reservedNamespace.toString()) {
      curie = uri.substring(opts.reservedNamespace.toString().length);
      if ($.inArray(curie, opts.reserved) === -1) {
        curie = ':' + curie;
      }
    } else {
      $.each(ns, function (prefix, namespace) {
        if (uri.substring(0, namespace.toString().length) === namespace.toString()) {
          curie = prefix + ':' + uri.substring(namespace.toString().length);
          return null;
        }
      });
    }
    if (curie === undefined) {
      throw "No Namespace Binding: There's no appropriate namespace binding for generating a CURIE from " + uri;
    } else {
      return curie;
    }
  };

   /**
    * Creates a {@link jQuery.uri} object by parsing the specified
    * CURIE string in the context of the namespaces defined by the
    * jQuery selection.
    * @methodOf jQuery#
    * @name jQuery#curie
    * @param {String} curie The CURIE string to be parsed
    * @param {Object} options The CURIE parsing options.
    *        See {@link jQuery.curie} for details of the supported options.
    *        The namespace declarations declared on the current jQuery
    *        selection (and inherited from any ancestor elements) will automatically
    *        be included in the options.namespaces property.
    * @returns {jQuery.uri}
    * @see jQuery.curie
    */
  $.fn.curie = function (curie, options) {
    var opts = $.extend({}, $.fn.curie.defaults, { namespaces: this.xmlns() }, options || {});
    return $.curie(curie, opts);
  };

   /**
    * Creates a {@link jQuery.uri} object by parsing the specified
    * safe CURIE string in the context of the namespaces defined by
    * the jQuery selection.
    *
    * @methodOf jQuery#
    * @name jQuery#safeCurie
    * @param {String} safeCurie The safe CURIE string to be parsed. See {@link jQuery.safeCurie} for details on how safe CURIE strings are processed.
    * @param {Object} options   The CURIE parsing options.
    *        See {@link jQuery.safeCurie} for details of the supported options.
    *        The namespace declarations declared on the current jQuery
    *        selection (and inherited from any ancestor elements) will automatically
    *        be included in the options.namespaces property.
    * @returns {jQuery.uri}
    * @see jQuery.safeCurie
    */
  $.fn.safeCurie = function (safeCurie, options) {
    var opts = $.extend({}, $.fn.curie.defaults, { namespaces: this.xmlns() }, options || {});
    return $.safeCurie(safeCurie, opts);
  };

   /**
    * Creates a CURIE string from a URI string using the namespace
    * bindings in the context of the current jQuery selection.
    *
    * @methodOf jQuery#
    * @name jQuery#createCurie
    * @param {String|jQuery.uri} uri The URI string to be converted to a CURIE
    * @param {Object} options the CURIE parsing options.
    *        See {@link jQuery.createCurie} for details of the supported options.
    *        The namespace declarations declared on the current jQuery
    *        selection (and inherited from any ancestor elements) will automatically
    *        be included in the options.namespaces property.
    * @returns {String}
    * @see jQuery.createCurie
    */
  $.fn.createCurie = function (uri, options) {
    var opts = $.extend({}, $.fn.curie.defaults, { namespaces: this.xmlns() }, options || {});
    return $.createCurie(uri, opts);
  };

  $.fn.curie.defaults = {
    reserved: [
      'alternate', 'appendix', 'bookmark', 'cite', 'chapter', 'contents', 'copyright',
      'first', 'glossary', 'help', 'icon', 'index', 'last', 'license', 'meta', 'next',
      'p3pv1', 'prev', 'role', 'section', 'stylesheet', 'subsection', 'start', 'top', 'up'
    ],
    reservedNamespace: 'http://www.w3.org/1999/xhtml/vocab#',
    defaultNamespace: undefined,
    charcase: 'lower'
  };

})(jQuery);
/*
 * jQuery RDF @VERSION
 *
 * Copyright (c) 2008,2009 Jeni Tennison
 * Licensed under the MIT (MIT-LICENSE.txt)
 *
 * Depends:
 *  jquery.uri.js
 *  jquery.xmlns.js
 *  jquery.datatype.js
 *  jquery.curie.js
 *  jquery.json.js
 */
/**
 * @fileOverview jQuery RDF
 * @author <a href="mailto:jeni@jenitennison.com">Jeni Tennison</a>
 * @copyright (c) 2008,2009 Jeni Tennison
 * @license MIT license (MIT-LICENSE.txt)
 * @version 1.0
 */
/**
 * @exports $ as jQuery
 */
/**
 * @ignore
 */
(function ($) {
  var
    memResource = {},
    memBlank = {},
    memLiteral = {},
    memTriple = {},
    memPattern = {},
    
    xsdNs = "http://www.w3.org/2001/XMLSchema#",
    rdfNs = "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
    rdfsNs = "http://www.w3.org/2000/01/rdf-schema#",
    
    uriRegex = /^<(([^>]|\\>)*)>$/,
    literalRegex = /^("""((\\"|[^"])*)"""|"((\\"|[^"])*)")(@([a-z]+(-[a-z0-9]+)*)|\^\^(.+))?$/,
    tripleRegex = /(("""((\\"|[^"])*)""")|("(\\"|[^"]|)*")|(<(\\>|[^>])*>)|\S)+/g,

    blankNodeSeed = databankSeed = new Date().getTime() % 1000,
    blankNodeID = function () {
      blankNodeSeed += 1;
      return 'b' + blankNodeSeed.toString(16);
    },

    databankID = function () {
      databankSeed += 1;
      return 'data' + databankSeed.toString(16);
    },
    databanks = {},

    documentQueue = {},

    subject = function (subject, opts) {
      if (typeof subject === 'string') {
        try {
          return $.rdf.resource(subject, opts);
        } catch (e) {
          try {
            return $.rdf.blank(subject, opts);
          } catch (f) {
            throw "Bad Triple: Subject " + subject + " is not a resource: " + f;
          }
        }
      } else {
        return subject;
      }
    },

    property = function (property, opts) {
      if (property === 'a') {
        return $.rdf.type;
      } else if (typeof property === 'string') {
        try {
          return $.rdf.resource(property, opts);
        } catch (e) {
          throw "Bad Triple: Property " + property + " is not a resource: " + e;
        }
      } else {
        return property;
      }
    },

    object = function (object, opts) {
      if (typeof object === 'string') {
        try {
          return $.rdf.resource(object, opts);
        } catch (e) {
          try {
            return $.rdf.blank(object, opts);
          } catch (f) {
            try {
              return $.rdf.literal(object, opts);
            } catch (g) {
              throw "Bad Triple: Object " + object + " is not a resource or a literal " + g;
            }
          }
        }
      } else {
        return object;
      }
    },

    testResource = function (resource, filter, existing) {
      var variable;
      if (typeof filter === 'string') {
        variable = filter.substring(1);
        if (existing[variable] && existing[variable] !== resource) {
          return null;
        } else {
          existing[variable] = resource;
          return existing;
        }
      } else if (filter === resource) {
        return existing;
      } else {
        return null;
      }
    },

    findMatches = function (databank, pattern) {
      if (databank.union === undefined) {
        if (pattern.subject.type !== undefined) {
          if (databank.subjectIndex[pattern.subject] === undefined) {
            return [];
          }
          return $.map(databank.subjectIndex[pattern.subject], function (triple) {
            var bindings = pattern.exec(triple);
            return bindings === null ? null : { bindings: bindings, triples: [triple] };
          });
        } else if (pattern.object.type === 'uri' || pattern.object.type === 'bnode') {
          if (databank.objectIndex[pattern.object] === undefined) {
            return [];
          }
          return $.map(databank.objectIndex[pattern.object], function (triple) {
            var bindings = pattern.exec(triple);
            return bindings === null ? null : { bindings: bindings, triples: [triple] };
          });
        } else if (pattern.property.type !== undefined) {
          if (databank.propertyIndex[pattern.property] === undefined) {
            return [];
          }
          return $.map(databank.propertyIndex[pattern.property], function (triple) {
            var bindings = pattern.exec(triple);
            return bindings === null ? null : { bindings: bindings, triples: [triple] };
          });
        }
      }
      return $.map(databank.triples(), function (triple) {
        var bindings = pattern.exec(triple);
        return bindings === null ? null : { bindings: bindings, triples: [triple] };
      });
    },

    mergeMatches = function (existingMs, newMs, optional) {
      return $.map(existingMs, function (existingM, i) {
        var compatibleMs = $.map(newMs, function (newM) {
          // For newM to be compatible with existingM, all the bindings
          // in newM must either be the same as in existingM, or not
          // exist in existingM
          var k, b, isCompatible = true;
          for (k in newM.bindings) {
            b = newM.bindings[k];
            if (!(existingM.bindings[k] === undefined ||
                  existingM.bindings[k] === b)) {
              isCompatible = false;
              break;
            }
          }
          return isCompatible ? newM : null;
        });
        if (compatibleMs.length > 0) {
          return $.map(compatibleMs, function (compatibleM) {
            return {
              bindings: $.extend({}, existingM.bindings, compatibleM.bindings),
              triples: $.unique(existingM.triples.concat(compatibleM.triples))
            };
          });
        } else {
          return optional ? existingM : null;
        }
      });
    },

    registerQuery = function (databank, query) {
      var s, p, o;
      if (query.filterExp !== undefined && !$.isFunction(query.filterExp)) {
        if (databank.union === undefined) {
          s = typeof query.filterExp.subject === 'string' ? '' : query.filterExp.subject;
          p = typeof query.filterExp.property === 'string' ? '' : query.filterExp.property;
          o = typeof query.filterExp.object === 'string' ? '' : query.filterExp.object;
          if (databank.queries[s] === undefined) {
            databank.queries[s] = {};
          }
          if (databank.queries[s][p] === undefined) {
            databank.queries[s][p] = {};
          }
          if (databank.queries[s][p][o] === undefined) {
            databank.queries[s][p][o] = [];
          }
          databank.queries[s][p][o].push(query);
        } else {
          $.each(databank.union, function (i, databank) {
            registerQuery(databank, query);
          });
        }
      }
    },

    resetQuery = function (query) {
      query.length = 0;
      query.matches = [];
      $.each(query.children, function (i, child) {
        resetQuery(child);
      });
      $.each(query.partOf, function (i, union) {
        resetQuery(union);
      });
    },

    updateQuery = function (query, matches) {
      if (matches.length > 0) {
        $.each(query.children, function (i, child) {
          leftActivate(child, matches);
        });
        $.each(query.partOf, function (i, union) {
          updateQuery(union, matches);
        });
        $.each(matches, function (i, match) {
          query.matches.push(match);
          Array.prototype.push.call(query, match.bindings);
        });
      }
    },

    filterMatches = function (matches, variables) {
      var i, bindings, triples, j, k, variable, value, nvariables = variables.length,
        newbindings, match = {}, keyobject = {}, keys = {}, filtered = [];
      for (i = 0; i < matches.length; i += 1) {
        bindings = matches[i].bindings;
        triples = matches[i].triples;
        keyobject = keys;
        for (j = 0; j < nvariables; j += 1) {
          variable = variables[j];
          value = bindings[variable];
          if (j === nvariables - 1) {
            if (keyobject[value] === undefined) {
              match = { bindings: {}, triples: triples };
              for (k = 0; k < nvariables; k += 1) {
                match.bindings[variables[k]] = bindings[variables[k]];
              }
              keyobject[value] = match;
              filtered.push(match);
            } else {
              match = keyobject[value];
              match.triples = match.triples.concat(triples);
            }
          } else {
            if (keyobject[value] === undefined) {
              keyobject[value] = {};
            }
            keyobject = keyobject[value];
          }
        }
      }
      return filtered;
    },

    renameMatches = function (matches, old) {
      var i, match, newMatch, keys = {}, renamed = [];
      for (i = 0; i < matches.length; i += 1) {
        match = matches[i];
        if (keys[match.bindings[old]] === undefined) {
          newMatch = {
            bindings: { node: match.bindings[old] },
            triples: match.triples
          };
          renamed.push(newMatch);
          keys[match.bindings[old]] = newMatch;
        } else {
          newMatch = keys[match.bindings[old]];
          newMatch.triples = newMatch.triples.concat(match.triples);
        }
      }
      return renamed;
    },

    leftActivate = function (query, matches) {
      var newMatches;
      if (query.union === undefined) {
        if (query.top || query.parent.top) {
          newMatches = query.alphaMemory;
        } else {
          matches = matches || query.parent.matches;
          if ($.isFunction(query.filterExp)) {
            newMatches = $.map(matches, function (match, i) {
              return query.filterExp.call(match.bindings, i, match.bindings, match.triples) ? match : null;
            });
          } else if (query.filterExp !== undefined) {
            newMatches = mergeMatches(matches, query.alphaMemory, query.filterExp.optional);
          } else {
            newMatches = matches;
          }
        }
      } else {
        newMatches = $.map(query.union, function (q) {
          return q.matches;
        });
      }
      if (query.selections !== undefined) {
        newMatches = filterMatches(newMatches, query.selections);
      } else if (query.navigate !== undefined) {
        newMatches = renameMatches(newMatches, query.navigate);
      }
      updateQuery(query, newMatches);
    },

    rightActivate = function (query, match) {
      var newMatches;
      if (query.filterExp.optional) {
        resetQuery(query);
        leftActivate(query);
      } else {
        if (query.top || query.parent.top) {
          newMatches = [match];
        } else {
          newMatches = mergeMatches(query.parent.matches, [match], false);
        }
        updateQuery(query, newMatches);
      }
    },

    addToQuery = function (query, triple) {
      var match,
        bindings = query.filterExp.exec(triple);
      if (bindings !== null) {
        match = { triples: [triple], bindings: bindings };
        query.alphaMemory.push(match);
        rightActivate(query, match);
      }
    },

    removeFromQuery = function (query, triple) {
      query.alphaMemory.splice($.inArray(triple, query.alphaMemory), 1);
      resetQuery(query);
      leftActivate(query);
    },

    addToQueries = function (queries, triple) {
      $.each(queries, function (i, query) {
        addToQuery(query, triple);
      });
    },

    removeFromQueries = function (queries, triple) {
      $.each(queries, function (i, query) {
        removeFromQuery(query, triple);
      });
    },

    addToDatabankQueries = function (databank, triple) {
      var s = triple.subject,
        p = triple.property,
        o = triple.object;
      if (databank.union === undefined) {
        if (databank.queries[s] !== undefined) {
          if (databank.queries[s][p] !== undefined) {
            if (databank.queries[s][p][o] !== undefined) {
              addToQueries(databank.queries[s][p][o], triple);
            }
            if (databank.queries[s][p][''] !== undefined) {
              addToQueries(databank.queries[s][p][''], triple);
            }
          }
          if (databank.queries[s][''] !== undefined) {
            if (databank.queries[s][''][o] !== undefined) {
              addToQueries(databank.queries[s][''][o], triple);
            }
            if (databank.queries[s][''][''] !== undefined) {
              addToQueries(databank.queries[s][''][''], triple);
            }
          }
        }
        if (databank.queries[''] !== undefined) {
          if (databank.queries[''][p] !== undefined) {
            if (databank.queries[''][p][o] !== undefined) {
              addToQueries(databank.queries[''][p][o], triple);
            }
            if (databank.queries[''][p][''] !== undefined) {
              addToQueries(databank.queries[''][p][''], triple);
            }
          }
          if (databank.queries[''][''] !== undefined) {
            if (databank.queries[''][''][o] !== undefined) {
              addToQueries(databank.queries[''][''][o], triple);
            }
            if (databank.queries[''][''][''] !== undefined) {
              addToQueries(databank.queries[''][''][''], triple);
            }
          }
        }
      } else {
        $.each(databank.union, function (i, databank) {
          addToDatabankQueries(databank, triple);
        });
      }
    },

    removeFromDatabankQueries = function (databank, triple) {
      var s = triple.subject,
        p = triple.property,
        o = triple.object;
      if (databank.union === undefined) {
        if (databank.queries[s] !== undefined) {
          if (databank.queries[s][p] !== undefined) {
            if (databank.queries[s][p][o] !== undefined) {
              removeFromQueries(databank.queries[s][p][o], triple);
            }
            if (databank.queries[s][p][''] !== undefined) {
              removeFromQueries(databank.queries[s][p][''], triple);
            }
          }
          if (databank.queries[s][''] !== undefined) {
            if (databank.queries[s][''][o] !== undefined) {
              removeFromQueries(databank.queries[s][''][o], triple);
            }
            if (databank.queries[s][''][''] !== undefined) {
              removeFromQueries(databank.queries[s][''][''], triple);
            }
          }
        }
        if (databank.queries[''] !== undefined) {
          if (databank.queries[''][p] !== undefined) {
            if (databank.queries[''][p][o] !== undefined) {
              removeFromQueries(databank.queries[''][p][o], triple);
            }
            if (databank.queries[''][p][''] !== undefined) {
              removeFromQueries(databank.queries[''][p][''], triple);
            }
          }
          if (databank.queries[''][''] !== undefined) {
            if (databank.queries[''][''][o] !== undefined) {
              removeFromQueries(databank.queries[''][''][o], triple);
            }
            if (databank.queries[''][''][''] !== undefined) {
              removeFromQueries(databank.queries[''][''][''], triple);
            }
          }
        }
      } else {
        $.each(databank.union, function (i, databank) {
          removeFromDatabankQueries(databank, triple);
        });
      }
    },
    
    group = function (bindings, variables, base) {
      var variable = variables[0], grouped = {}, results = [], i, newbase;
      base = base || {};
      if (variables.length === 0) {
        for (i = 0; i < bindings.length; i += 1) {
          for (v in bindings[i]) {
            if (base[v] === undefined) {
              base[v] = [];
            }
            if ($.isArray(base[v])) {
              base[v].push(bindings[i][v]);
            }
          }
        }
        return [base];
      }
      // collect together the grouped results
      for (i = 0; i < bindings.length; i += 1) {
        key = bindings[i][variable];
        if (grouped[key] === undefined) {
          grouped[key] = [];
        }
        grouped[key].push(bindings[i]);
      }
      // call recursively on each group
      variables = variables.splice(1, 1);
      for (v in grouped) {
        newbase = $.extend({}, base);
        newbase[variable] = grouped[v][0][variable];
        results = results.concat(group(grouped[v], variables, newbase));
      }
      return results;
    },
    
    queue = function (databank, url, callbacks) {
      if (documentQueue[databank.id] === undefined) {
        documentQueue[databank.id] = {};
      }
      if (documentQueue[databank.id][url] === undefined) {
        documentQueue[databank.id][url] = callbacks;
        return false;
      }
      return true;
    }
    
    dequeue = function (databank, url, result, args) {
      var callbacks = documentQueue[databank.id][url];
      if ($.isFunction(callbacks[result])) {
        callbacks[result].call(databank, args);
      }
      documentQueue[databank.id][url] = undefined;
    };

  $.typedValue.types['http://www.w3.org/1999/02/22-rdf-syntax-ns#XMLLiteral'] = {
    regex: /^.*$/m,
    strip: false,
    value: function (v) {
      return v;
    }
  };

  /**
   * <p>Creates a new jQuery.rdf object. This should be invoked as a method rather than constructed using new; indeed you will usually want to generate these objects using a method such as {@link jQuery#rdf} or {@link jQuery.rdf#where}.</p>
   * @class <p>A jQuery.rdf object represents the results of a query over its {@link jQuery.rdf#databank}. The results of a query are a sequence of objects which represent the bindings of values to the variables used in filter expressions specified using {@link jQuery.rdf#where} or {@link jQuery.rdf#optional}. Each of the objects in this sequence has associated with it a set of triples that are the sources for the variable bindings, which you can get at using {@link jQuery.rdf#sources}.</p>
    * <p>The {@link jQuery.rdf} object itself is a lot like a {@link jQuery} object. It has a {@link jQuery.rdf#length} and the individual matches can be accessed using <code>[<var>n</var>]</code>, but you can also iterate through the matches using {@link jQuery.rdf#map} or {@link jQuery.rdf#each}.</p>
    * <p>{@link jQuery.rdf} is designed to mirror the functionality of <a href="http://www.w3.org/TR/rdf-sparql-query/">SPARQL</a> while providing an interface that's familiar and easy to use for jQuery programmers.</p>
   * @param {Object} [options]
   * @param {jQuery.rdf.databank} [options.databank] The databank that this query should operate over.
   * @param {jQuery.rdf.triple[]} [options.triples] A set of triples over which the query operates; this is only used if options.databank isn't specified, in which case a new databank with these triples is generated.
   * @param {Object} [options.namespaces] An object representing a set of namespace bindings. Rather than passing this in when you construct the {@link jQuery.rdf} instance, you will usually want to use the {@link jQuery.rdf#prefix} method.
   * @param {String|jQuery.uri} [options.base] The base URI used to interpret any relative URIs used within the query.
   * @returns {jQuery.rdf}
   * @example rdf = jQuery.rdf();
   * @see jQuery#rdf
   */
  $.rdf = function (options) {
    return new $.rdf.fn.init(options);
  };

  $.rdf.fn = $.rdf.prototype = {
    /**
     * The version of rdfQuery.
     * @type String
     */
    rdfquery: '1.1',

    init: function (options) {
      var databanks, i;
      options = options || {};
      /* must specify either a parent or a union, otherwise it's the top */
      this.parent = options.parent;
      this.union = options.union;
      this.top = this.parent === undefined && this.union === undefined;
      if (this.union === undefined) {
        if (options.databank === undefined) {
          /**
           * The databank over which this query operates.
           * @type jQuery.rdf.databank
           */
          this.databank = this.parent === undefined ? $.rdf.databank(options.triples, options) : this.parent.databank;
        } else {
          this.databank = options.databank;
        }
      } else {
        databanks = $.map(this.union, function (query) {
          return query.databank;
        });
        databanks = $.unique(databanks);
        if (databanks[1] !== undefined) {
          this.databank = $.rdf.databank(undefined, { union: databanks });
        } else {
          this.databank = databanks[0];
        }
      }
      this.children = [];
      this.partOf = [];
      this.filterExp = options.filter;
      this.selections = options.distinct;
      this.navigate = options.navigate;
      this.alphaMemory = [];
      this.matches = [];
      /**
       * The number of matches represented by the {@link jQuery.rdf} object.
       * @type Integer
       */
      this.length = 0;
      if (this.filterExp !== undefined) {
        if (!$.isFunction(this.filterExp)) {
          registerQuery(this.databank, this);
          this.alphaMemory = findMatches(this.databank, this.filterExp);
        }
      } else if (options.nodes !== undefined) {
        this.alphaMemory = [];
        for (i = 0; i < options.nodes.length; i += 1) {
          this.alphaMemory.push({
            bindings: { node: options.nodes[i] },
            triples: []
          });
        }
      }
      leftActivate(this);
      return this;
    },

    /**
     * Sets or returns the base URI of the {@link jQuery.rdf#databank}.
     * @param {String|jQuery.uri} [base]
     * @returns A {@link jQuery.uri} if no base URI is specified, otherwise returns this {@link jQuery.rdf} object.
     * @example baseURI = jQuery('html').rdf().base();
     * @example jQuery('html').rdf().base('http://www.example.org/');
     * @see jQuery.rdf.databank#base
     */
    base: function (base) {
      if (base === undefined) {
        return this.databank.base();
      } else {
        this.databank.base(base);
        return this;
      }
    },

    /**
     * Sets or returns a namespace binding on the {@link jQuery.rdf#databank}.
     * @param {String} [prefix]
     * @param {String} [namespace]
     * @returns {Object|jQuery.uri|jQuery.rdf} If no prefix or namespace is specified, returns an object providing all namespace bindings on the {@link jQuery.rdf.databank}. If a prefix is specified without a namespace, returns the {@link jQuery.uri} associated with that prefix. Otherwise returns this {@link jQuery.rdf} object after setting the namespace binding.
     * @example namespace = jQuery('html').rdf().prefix('foaf');
     * @example jQuery('html').rdf().prefix('foaf', 'http://xmlns.com/foaf/0.1/');
     * @see jQuery.rdf.databank#prefix
     */
    prefix: function (prefix, namespace) {
      if (namespace === undefined) {
        return this.databank.prefix(prefix);
      } else {
        this.databank.prefix(prefix, namespace);
        return this;
      }
    },

    /**
     * Adds a triple to the {@link jQuery.rdf#databank} or another {@link jQuery.rdf} object to create a union.
     * @param {String|jQuery.rdf.triple|jQuery.rdf.pattern|jQuery.rdf} triple The triple, {@link jQuery.rdf.pattern} or {@link jQuery.rdf} object to be added to this one. If the triple is a {@link jQuery.rdf} object, the two queries are unioned together. If the triple is a string, it's parsed as a {@link jQuery.rdf.pattern}. The pattern will be completed using the current matches on the {@link jQuery.rdf} object to create multiple triples, one for each set of bindings.
     * @param {Object} [options]
     * @param {Object} [options.namespaces] An object representing a set of namespace bindings used to interpret CURIEs within the triple. Defaults to the namespace bindings defined on the {@link jQuery.rdf#databank}.
     * @param {String|jQuery.uri} [options.base] The base URI used to interpret any relative URIs used within the triple. Defaults to the base URI defined on the {@link jQuery.rdf#databank}.
     * @returns {jQuery.rdf} This {@link jQuery.rdf} object.
     * @example
     * var rdf = $.rdf()
     *   .prefix('dc', ns.dc)
     *   .prefix('foaf', ns.foaf)
     *   .add('&lt;photo1.jpg> dc:creator &lt;http://www.blogger.com/profile/1109404> .')
     *   .add('&lt;http://www.blogger.com/profile/1109404> foaf:img &lt;photo1.jpg> .');
     * @example
     * var rdfA = $.rdf()
     *   .prefix('dc', ns.dc)
     *   .add('&lt;photo1.jpg> dc:creator "Jane"');
     * var rdfB = $.rdf()
     *   .prefix('foaf', ns.foaf)
     *   .add('&lt;photo1.jpg> foaf:depicts "Jane"');
     * var rdf = rdfA.add(rdfB);
     * @see jQuery.rdf.databank#add
     */
    add: function (triple, options) {
      var query, databank;
      if (triple.rdfquery !== undefined) {
        if (triple.top) {
          databank = this.databank.add(triple.databank);
          query = $.rdf({ parent: this.parent, databank: databank });
          return query;
        } else if (this.top) {
          databank = triple.databank.add(this.databank);
          query = $.rdf({ parent: triple.parent, databank: databank });
          return query;
        } else if (this.union === undefined) {
          query = $.rdf({ union: [this, triple] });
          this.partOf.push(query);
          triple.partOf.push(query);
          return query;
        } else {
          this.union.push(triple);
          triple.partOf.push(this);
        }
      } else {
        if (typeof triple === 'string') {
          options = $.extend({}, { base: this.base(), namespaces: this.prefix(), source: triple }, options);
          triple = $.rdf.pattern(triple, options);
        }
        if (triple.isFixed()) {
          this.databank.add(triple.triple(), options);
        } else {
          query = this;
          this.each(function (i, data) {
            var t = triple.triple(data);
            if (t !== null) {
              query.databank.add(t, options);
            }
          });
        }
      }
      return this;
    },

    /**
     * Removes a triple or several triples from the {@link jQuery.rdf#databank}.
     * @param {String|jQuery.rdf.triple|jQuery.rdf.pattern} triple The triple to be removed, or a {@link jQuery.rdf.pattern} that matches the triples that should be removed.
     * @param {Object} [options]
     * @param {Object} [options.namespaces] An object representing a set of namespace bindings used to interpret any CURIEs within the triple or pattern. Defaults to the namespace bindings defined on the {@link jQuery.rdf#databank}.
     * @param {String|jQuery.uri} [options.base] The base URI used to interpret any relative URIs used within the triple or pattern. Defaults to the base URI defined on the {@link jQuery.rdf#databank}.
     * @returns {jQuery.rdf} The {@link jQuery.rdf} object itself.
     * @example
     * var rdf = $('html').rdf()
     *   .prefix('foaf', ns.foaf)
     *   .where('?person foaf:givenname ?gname')
     *   .where('?person foaf:family_name ?fname')
     *   .remove('?person foaf:family_name ?fname');
     * @see jQuery.rdf.databank#remove
     */
    remove: function (triple, options) {
      if (typeof triple === 'string') {
        options = $.extend({}, { base: this.base(), namespaces: this.prefix() }, options);
        triple = $.rdf.pattern(triple, options);
      }
      if (triple.isFixed()) {
        this.databank.remove(triple.triple(), options);
      } else {
        query = this;
        this.each(function (i, data) {
          var t = triple.triple(data);
          if (t !== null) {
            query.databank.remove(t, options);
          }
        });
      }
      return this;
    },

    /**
     * Loads some data into the {@link jQuery.rdf#databank}
     * @param data
     * @param {Object} [options]
     * @see jQuery.rdf.databank#load
     */
    load: function (data, options) {
      var rdf = this,
        options = options || {},
        success = options.success;
      if (success !== undefined) {
        options.success = function () {
          success.call(rdf);
        }
      }
      this.databank.load(data, options);
      return this;
    },

    /**
     * Creates a new {@link jQuery.rdf} object whose databank contains all the triples in this object's databank except for those in the argument's databank.
     * @param {jQuery.rdf} query
     * @see jQuery.rdf.databank#except
     */
    except: function (query) {
      return $.rdf({ databank: this.databank.except(query.databank) });
    },

    /**
     * Creates a new {@link jQuery.rdf} object that is the result of filtering the matches on this {@link jQuery.rdf} object based on the filter that's passed into it.
     * @param {String|jQuery.rdf.pattern} filter An expression that filters the triples in the {@link jQuery.rdf#databank} to locate matches based on the matches on this {@link jQuery.rdf} object. If it's a string, the filter is parsed as a {@link jQuery.rdf.pattern}.
     * @param {Object} [options]
     * @param {Object} [options.namespaces] An object representing a set of namespace bindings used to interpret any CURIEs within the pattern. Defaults to the namespace bindings defined on the {@link jQuery.rdf#databank}.
     * @param {String|jQuery.uri} [options.base] The base URI used to interpret any relative URIs used within the pattern. Defaults to the base URI defined on the {@link jQuery.rdf#databank}.
     * @param {boolean} [options.optional] Not usually used (use {@link jQuery.rdf#optional} instead).
     * @returns {jQuery.rdf} A new {@link jQuery.rdf} object whose {@link jQuery.rdf#parent} is this {@link jQuery.rdf}.
     * @see jQuery.rdf#optional
     * @see jQuery.rdf#filter
     * @see jQuery.rdf#about
     * @example
     * var rdf = $.rdf()
     *   .prefix('foaf', ns.foaf)
     *   .add('_:a foaf:givenname   "Alice" .')
     *   .add('_:a foaf:family_name "Hacker" .')
     *   .add('_:b foaf:givenname   "Bob" .')
     *   .add('_:b foaf:family_name "Hacker" .')
     *   .where('?person foaf:family_name "Hacker"')
     *   .where('?person foaf:givenname "Bob");
     */ 
    where: function (filter, options) {
      var query, base, namespaces, optional;
      options = options || {};
      if (typeof filter === 'string') {
        base = options.base || this.base();
        namespaces = $.extend({}, this.prefix(), options.namespaces || {});
        optional = options.optional || false;
        filter = $.rdf.pattern(filter, { namespaces: namespaces, base: base, optional: optional });
      }
      query = $.rdf($.extend({}, options, { parent: this, filter: filter }));
      this.children.push(query);
      return query;
    },

    /**
     * Creates a new {@link jQuery.rdf} object whose set of bindings might optionally include those based on the filter pattern.
     * @param {String|jQuery.rdf.pattern} filter An pattern for a set of bindings that might be added to those in this {@link jQuery.rdf} object.
     * @param {Object} [options]
     * @param {Object} [options.namespaces] An object representing a set of namespace bindings used to interpret any CURIEs within the pattern. Defaults to the namespace bindings defined on the {@link jQuery.rdf#databank}.
     * @param {String|jQuery.uri} [options.base] The base URI used to interpret any relative URIs used within the pattern. Defaults to the base URI defined on the {@link jQuery.rdf#databank}.
     * @returns {jQuery.rdf} A new {@link jQuery.rdf} object whose {@link jQuery.rdf#parent} is this {@link jQuery.rdf}.
     * @see jQuery.rdf#where
     * @see jQuery.rdf#filter
     * @see jQuery.rdf#about
     * @example
     * var rdf = $.rdf()
     *   .prefix('foaf', 'http://xmlns.com/foaf/0.1/')
     *   .prefix('rdf', 'http://www.w3.org/1999/02/22-rdf-syntax-ns#')
     *   .add('_:a  rdf:type        foaf:Person .')
     *   .add('_:a  foaf:name       "Alice" .')
     *   .add('_:a  foaf:mbox       &lt;mailto:alice@example.com> .')
     *   .add('_:a  foaf:mbox       &lt;mailto:alice@work.example> .')
     *   .add('_:b  rdf:type        foaf:Person .')
     *   .add('_:b  foaf:name       "Bob" .')
     *   .where('?x foaf:name ?name')
     *   .optional('?x foaf:mbox ?mbox');
     */
    optional: function (filter, options) {
      return this.where(filter, $.extend({}, options || {}, { optional: true }));
    },

    /**
     * Creates a new {@link jQuery.rdf} object whose set of bindings include <code>property</code> and <code>value</code> for every triple that is about the specified resource.
     * @param {String|jQuery.rdf.resource} resource The subject of the matching triples.
     * @param {Object} [options]
     * @param {Object} [options.namespaces] An object representing a set of namespace bindings used to interpret the resource if it's a CURIE. Defaults to the namespace bindings defined on the {@link jQuery.rdf#databank}.
     * @param {String|jQuery.uri} [options.base] The base URI used to interpret the resource if it's a relative URI (wrapped in <code>&lt;</code> and <code>&gt;</code>). Defaults to the base URI defined on the {@link jQuery.rdf#databank}.
     * @returns {jQuery.rdf} A new {@link jQuery.rdf} object whose {@link jQuery.rdf#parent} is this {@link jQuery.rdf}.
     * @see jQuery.rdf#where
     * @see jQuery.rdf#optional
     * @see jQuery.rdf#filter
     * @example
     * var rdf = $.rdf()
     *   .prefix('dc', ns.dc)
     *   .prefix('foaf', ns.foaf)
     *   .add('&lt;photo1.jpg> dc:creator &lt;http://www.blogger.com/profile/1109404> .')
     *   .add('&lt;http://www.blogger.com/profile/1109404> foaf:img &lt;photo1.jpg> .')
     *   .add('&lt;photo2.jpg> dc:creator &lt;http://www.blogger.com/profile/1109404> .')
     *   .add('&lt;http://www.blogger.com/profile/1109404> foaf:img &lt;photo2.jpg> .')
     *   .about('&lt;http://www.blogger.com/profile/1109404>');
     */
    about: function (resource, options) {
      return this.where(resource + ' ?property ?value', options);
    },

    /**
     * Creates a new {@link jQuery.rdf} object whose set of bindings include only those that satisfy some arbitrary condition. There are two main ways to call this method: with two arguments in which case the first is a binding to be tested and the second represents a condition on the test, or with one argument which is a function that should return true for acceptable bindings.
     * @param {Function|String} property <p>In the two-argument version, this is the name of a property to be tested against the condition specified in the second argument. In the one-argument version, this is a function in which <code>this</code> is an object whose properties are a set of {@link jQuery.rdf.resource}, {@link jQuery.rdf.literal} or {@link jQuery.rdf.blank} objects and whose arguments are:</p>
     * <dl>
     *   <dt>i</dt>
     *   <dd>The index of the set of bindings amongst the other matches</dd>
     *   <dt>bindings</dt>
     *   <dd>An object representing the bindings (the same as <code>this</code>)</dd>
     *   <dt>triples</dt>
     *   <dd>The {@link jQuery.rdf.triple}s that underly this set of bindings</dd>
     * </dl>
     * @param {RegExp|String} condition In the two-argument version of this function, the condition that the property's must match. If it is a regular expression, the value must match the regular expression. If it is a {@link jQuery.rdf.literal}, the value of the literal must match the property's value. Otherwise, they must be the same resource.
     * @returns {jQuery.rdf} A new {@link jQuery.rdf} object whose {@link jQuery.rdf#parent} is this {@link jQuery.rdf}.
     * @see jQuery.rdf#where
     * @see jQuery.rdf#optional
     * @see jQuery.rdf#about
     * @example
     * var rdf = $.rdf()
     *   .prefix('foaf', 'http://xmlns.com/foaf/0.1/')
     *   .add('_:a foaf:surname "Jones" .')
     *   .add('_:b foaf:surname "Macnamara" .')
     *   .add('_:c foaf:surname "O\'Malley"')
     *   .add('_:d foaf:surname "MacFee"')
     *   .where('?person foaf:surname ?surname')
     *     .filter('surname', /^Ma?c/)
     *       .each(function () { scottish.push(this.surname.value); })
     *     .end()
     *     .filter('surname', /^O'/)
     *       .each(function () { irish.push(this.surname.value); })
     *     .end();
     * @example
     * var rdf = $.rdf()
     *   .prefix('foaf', 'http://xmlns.com/foaf/0.1/')
     *   .add('_:a foaf:surname "Jones" .')
     *   .add('_:b foaf:surname "Macnamara" .')
     *   .add('_:c foaf:surname "O\'Malley"')
     *   .add('_:d foaf:surname "MacFee"')
     *   .where('?person foaf:surname ?surname')
     *   .filter(function () { return this.surname !== "Jones"; })
     */
    filter: function (property, condition) {
      var func, query;
      if (typeof property === 'string') {
        if (condition.constructor === RegExp) {
          /** @ignore func */
          func = function () {
            return condition.test(this[property].value);
          };
        } else {
          func = function () {
            return this[property].type === 'literal' ? this[property].value === condition : this[property] === condition;
          };
        }
      } else {
        func = property;
      }
      query = $.rdf({ parent: this, filter: func });
      this.children.push(query);
      return query;
    },

    /**
     * Creates a new {@link jQuery.rdf} object containing one binding for each selected resource.
     * @param {String|Object} node The node to be selected. If this is a string beginning with a question mark the resources are those identified by the bindings of that value in the currently selected bindings. Otherwise, only the named resource is selected as the node.
     * @returns {jQuery.rdf} A new {@link jQuery.rdf} object.
     * @see jQuery.rdf#find
     * @see jQuery.rdf#back
     * @example
     * // returns an rdfQuery object with a pointer to <http://example.com/aReallyGreatBook>
     * var rdf = $('html').rdf()
     *   .node('<http://example.com/aReallyGreatBook>');
     */
    node: function (resource) {
      var variable, query;
      if (resource.toString().substring(0, 1) === '?') {
        variable = resource.toString().substring(1);
        query = $.rdf({ parent: this, navigate: variable });
      } else {
        if (typeof resource === 'string') {
          resource = object(resource, { namespaces: this.prefix(), base: this.base() });
        }
        query = $.rdf({ parent: this, nodes: [resource] });
      }
      this.children.push(query);
      return query;
    },
    
    /**
     * Navigates from the resource identified by the 'node' binding to another node through the property passed as the argument.
     * @param {String|Object} property The property whose value will be the new node.
     * @returns {jQuery.rdf} A new {@link jQuery.rdf} object whose {@link jQuery.rdf#parent} is this {@link jQuery.rdf}.
     * @see jQuery.rdf#back
     * @see jQuery.rdf#node
     * @example
     * var creators = $('html').rdf()
     *   .node('<>')
     *   .find('dc:creator');
     */
    find: function (property) {
      return this.where('?node ' + property + ' ?object', { navigate: 'object' });
    },
    
    /**
     * Navigates from the resource identified by the 'node' binding to another node through the property passed as the argument, like {jQuery.rdf#find}, but backwards.
     * @param {String|Object} property The property whose value will be the new node.
     * @returns {jQuery.rdf} A new {@link jQuery.rdf} object whose {@link jQuery.rdf#parent} is this {@link jQuery.rdf}.
     * @see jQuery.rdf#find
     * @see jQuery.rdf#node
     * @example
     * var people = $('html').rdf()
     *   .node('foaf:Person')
     *   .back('rdf:type');
     */
    back: function (property) {
      return this.where('?subject ' + property + ' ?node', { navigate: 'subject' });
    },

    /**
     * Groups the bindings held by this {@link jQuery.rdf} object based on the values of the variables passed as the parameter.
     * @param {String[]} [bindings] The variables to group by. The returned objects will contain all their current properties, but those aside from the specified variables will be arrays listing the relevant values.
     * @returns {jQuery} A jQuery object containing objects representing the grouped bindings.
     * @example
     * // returns one object per person and groups all the names and all the emails together in arrays
     * var grouped = rdf
     *   .where('?person foaf:name ?name')
     *   .where('?person foaf:email ?email')
     *   .group('person');
     * @example
     * // returns one object per surname/firstname pair, with the person property being an array in the resulting objects
     * var grouped = rdf
     *   .where('?person foaf:first_name ?forename')
     *   .where('?person foaf:givenname ?surname')
     *   .group(['surname', 'forename']);
     */
    group: function (bindings) {
      var grouped = {}, results = [], i, key, v;
      if (!$.isArray(bindings)) {
        bindings = [bindings];
      }
      return $(group(this, bindings));
    },

    /**
     * Filters the variable bindings held by this {@link jQuery.rdf} object down to those listed in the bindings parameter. This mirrors the <a href="http://www.w3.org/TR/rdf-sparql-query/#select">SELECT</a> form in SPARQL.
     * @param {String[]} [bindings] The variables that you're interested in. The returned objects will only contain those variables. If bindings is undefined, you will get all the variable bindings in the returned objects.
     * @returns {Object[]} An array of objects with the properties named by the bindings parameter.
     * @example
     * var filtered = rdf
     *   .where('?photo dc:creator ?creator')
     *   .where('?creator foaf:img ?photo');
     * var selected = rdf.select(['creator']);
     */
    select: function (bindings) {
      var s = [], i, j;
      for (i = 0; i < this.length; i += 1) {
        if (bindings === undefined) {
          s[i] = this[i];
        } else {
          s[i] = {};
          for (j = 0; j < bindings.length; j += 1) {
            s[i][bindings[j]] = this[i][bindings[j]];
          }
        }
      }
      return s;
    },

    /**
     * Provides <a href="http://n2.talis.com/wiki/Bounded_Descriptions_in_RDF#Simple_Concise_Bounded_Description">simple concise bounded descriptions</a> of the resources or bindings that are passed in the argument. This mirrors the <a href="http://www.w3.org/TR/rdf-sparql-query/#describe">DESCRIBE</a> form in SPARQL.
     * @param {(String|jQuery.rdf.resource)[]} bindings An array that can contain strings, {@link jQuery.rdf.resource}s or a mixture of the two. Any strings that begin with a question mark (<code>?</code>) are taken as variable names; each matching resource is described by the function.
     * @returns {jQuery} A {@link jQuery} object that contains {@link jQuery.rdf.triple}s that describe the listed resources.
     * @see jQuery.rdf.databank#describe
     * @example
     * $.rdf.dump($('html').rdf().describe(['<photo1.jpg>']));
     * @example
     * $('html').rdf()
     *   .where('?person foaf:img ?picture')
     *   .describe(['?photo'])
     */
    describe: function (bindings) {
      var i, j, binding, resources = [];
      for (i = 0; i < bindings.length; i += 1) {
        binding = bindings[i];
        if (binding.substring(0, 1) === '?') {
          binding = binding.substring(1);
          for (j = 0; j < this.length; j += 1) {
            resources.push(this[j][binding]);
          }
        } else {
          resources.push(binding);
        }
      }
      return this.databank.describe(resources);
    },

    /**
     * Returns a new {@link jQuery.rdf} object that contains only one set of variable bindings. This is designed to mirror the <a href="http://docs.jquery.com/Traversing/eq#index">jQuery#eq</a> method.
     * @param {Integer} n The index number of the match that should be selected.
     * @returns {jQuery.rdf} A new {@link jQuery.rdf} object with just that match.
     * @example
     * var rdf = $.rdf()
     *   .prefix('foaf', 'http://xmlns.com/foaf/0.1/')
     *   .add('_:a  foaf:name       "Alice" .')
     *   .add('_:a  foaf:homepage   <http://work.example.org/alice/> .')
     *   .add('_:b  foaf:name       "Bob" .')
     *   .add('_:b  foaf:mbox       <mailto:bob@work.example> .')
     *   .where('?x foaf:name ?name')
     *   .eq(1);
     */
    eq: function (n) {
      return this.filter(function (i) {
        return i === n;
      });
    },

    /**
     * Returns a {@link jQuery.rdf} object that includes no filtering (and therefore has no matches) over the {@link jQuery.rdf#databank}.
     * @returns {jQuery.rdf} An empty {@link jQuery.rdf} object.
     * @example
     * $('html').rdf()
     *   .where('?person foaf:family_name "Hacker"')
     *   .where('?person foaf:givenname "Alice"')
     *   .each(...do something with Alice Hacker...)
     *   .reset()
     *   .where('?person foaf:family_name "Jones"')
     *   .where('?person foaf:givenname "Bob"')
     *   .each(...do something with Bob Jones...);
     */
    reset: function () {
      var query = this;
      while (query.parent !== undefined) {
        query = query.parent;
      }
      return query;
    },

    /**
     * Returns the parent {@link jQuery.rdf} object, which is equivalent to undoing the most recent filtering operation (such as {@link jQuery.rdf#where} or {@link jQuery.rdf#filter}). This is designed to mirror the <a href="http://docs.jquery.com/Traversing/end">jQuery#end</a> method.
     * @returns {jQuery.rdf}
     * @example
     * $('html').rdf()
     *   .where('?person foaf:family_name "Hacker"')
     *   .where('?person foaf:givenname "Alice"')
     *   .each(...do something with Alice Hacker...)
     *   .end()
     *   .where('?person foaf:givenname "Bob"')
     *   .each(...do something with Bob Hacker...);
     */
    end: function () {
      return this.parent;
    },

    /**
     * Returns the number of matches in this {@link jQuery.rdf} object (equivalent to {@link jQuery.rdf#length}).
     * @returns {Integer} The number of matches in this {@link jQuery.rdf} object.
     * @see jQuery.rdf#length
     */
    size: function () {
      return this.length;
    },

    /**
     * Gets the triples that form the basis of the variable bindings that are the primary product of {@link jQuery.rdf}. Getting hold of the triples can be useful for understanding the facts that form the basis of the variable bindings.
     * @returns {jQuery} A {@link jQuery} object containing arrays of {@link jQuery.rdf.triple} objects. A {@link jQuery} object is returned so that you can easily iterate over the contents.
     * @example
     * $('html').rdf()
     *   .where('?thing a foaf:Person')
     *   .sources()
     *   .each(function () {
     *     ...do something with the array of triples... 
     *   });
     */
    sources: function () {
      return $($.map(this.matches, function (match) {
        // return an array-of-an-array because arrays automatically get expanded by $.map()
        return [match.triples];
      }));
    },

    /**
     * Dumps the triples that form the basis of the variable bindings that are the primary product of {@link jQuery.rdf} into a format that can be shown to the user or sent to a server.
     * @param {Object} [options] Options that control the formatting of the triples. See {@link jQuery.rdf.dump} for details.
     * @see jQuery.rdf.dump
     */
    dump: function (options) {
      var triples = $.map(this.matches, function (match) {
        return match.triples;
      });
      options = $.extend({ namespaces: this.databank.namespaces, base: this.databank.base }, options || {});
      return $.rdf.dump(triples, options);
    },

    /**
     * Either returns the item specified by the argument or turns the {@link jQuery.rdf} object into an array. This mirrors the <a href="http://docs.jquery.com/Core/get">jQuery#get</a> method.
     * @param {Integer} [num] The number of the item to be returned.
     * @returns {Object[]|Object} Returns either a single Object representing variable bindings or an array of such.
     * @example
     * $('html').rdf()
     *   .where('?person a foaf:Person')
     *   .get(0)
     *   .subject
     *   .value;
     */
    get: function (num) {
      return (num === undefined) ? $.makeArray(this) : this[num];
    },

    /**
     * Iterates over the matches held by the {@link jQuery.rdf} object and performs a function on each of them. This mirrors the <a href="http://docs.jquery.com/Core/each">jQuery#each</a> method.
     * @param {Function} callback A function that is called for each match on the {@link jQuery.rdf} object. Within the function, <code>this</code> is set to the object representing the variable bindings. The function can take up to three parameters:
     * <dl>
     *   <dt>i</dt><dd>The index of the match amongst the other matches.</dd>
     *   <dt>bindings</dt><dd>An object representing the variable bindings for the match, the same as <code>this</code>.</dd>
     *   <dt>triples</dt><dd>An array of {@link jQuery.rdf.triple}s associated with the particular match.</dd>
     * </dl>
     * @returns {jQuery.rdf} The {@link jQuery.rdf} object.
     * @see jQuery.rdf#map
     * @example
     * var rdf = $('html').rdf()
     *   .where('?photo dc:creator ?creator')
     *   .where('?creator foaf:img ?photo')
     *   .each(function () {
     *     photos.push(this.photo.value);
     *   });
     */
    each: function (callback) {
      $.each(this.matches, function (i, match) {
        callback.call(match.bindings, i, match.bindings, match.triples);
      });
      return this;
    },

    /**
     * Iterates over the matches held by the {@link jQuery.rdf} object and creates a new {@link jQuery} object that holds the result of applying the passed function to each one. This mirrors the <a href="http://docs.jquery.com/Traversing/map">jQuery#map</a> method.
     * @param {Function} callback A function that is called for each match on the {@link jQuery.rdf} object. Within the function, <code>this</code> is set to the object representing the variable bindings. The function can take up to three parameters and should return some kind of value:
     * <dl>
     *   <dt>i</dt><dd>The index of the match amongst the other matches.</dd>
     *   <dt>bindings</dt><dd>An object representing the variable bindings for the match, the same as <code>this</code>.</dd>
     *   <dt>triples</dt><dd>An array of {@link jQuery.rdf.triple}s associated with the particular match.</dd>
     * </dl>
     * @returns {jQuery} A jQuery object holding the results of the function for each of the matches on the original {@link jQuery.rdf} object.
     * @example
     * var photos = $('html').rdf()
     *   .where('?photo dc:creator ?creator')
     *   .where('?creator foaf:img ?photo')
     *   .map(function () {
     *     return this.photo.value;
     *   });
     */
    map: function (callback) {
      return $($.map(this.matches, function (match, i) {
        // in the callback, "this" is the bindings, and the arguments are swapped from $.map()
        return callback.call(match.bindings, i, match.bindings, match.triples);
      }));
    },

    /**
     * Returns a {@link jQuery} object that wraps this {@link jQuery.rdf} object.
     * @returns {jQuery}
     */
    jquery: function () {
      return $(this);
    }
  };

  $.rdf.fn.init.prototype = $.rdf.fn;

  $.rdf.gleaners = [];
  $.rdf.parsers = {};

  /**
   * Dumps the triples passed as the first argument into a format that can be shown to the user or sent to a server.
   * @param {jQuery.rdf.triple[]} triples An array (or {@link jQuery} object) of {@link jQuery.rdf.triple}s.
   * @param {Object} [options] Options that control the format of the dump.
   * @param {String} [options.format='application/json'] The mime type of the format of the dump. The supported formats are:
   * <table>
   *   <tr><th>mime type</th><th>description</th></tr>
   *   <tr>
   *     <td><code>application/json</code></td>
   *     <td>An <a href="http://n2.talis.com/wiki/RDF_JSON_Specification">RDF/JSON</a> object</td>
   *   </tr>
   *   <tr>
   *     <td><code>application/rdf+xml</code></td>
   *     <td>An DOMDocument node holding XML in <a href="http://www.w3.org/TR/rdf-syntax-grammar/">RDF/XML syntax</a></td>
   *   </tr>
   *   <tr>
   *     <td><code>text/turtle</code></td>
   *     <td>A String holding a representation of the RDF in <a href="http://www.w3.org/TeamSubmission/turtle/">Turtle syntax</a></td>
   *   </tr>
   * </table>
   * @param {Object} [options.namespaces={}] A set of namespace bindings used when mapping resource URIs to CURIEs or QNames (particularly in a RDF/XML serialisation).
   * @param {boolean} [options.serialize=false] If true, rather than creating an Object, the function will return a string which is ready to display or send to a server.
   * @param {boolean} [options.indent=false] If true, the serialised (RDF/XML) output has indentation added to it to make it more readable.
   * @returns {Object|String} The alternative representation of the triples.
   */
  $.rdf.dump = function (triples, options) {
    var opts = $.extend({}, $.rdf.dump.defaults, options || {}),
      format = opts.format,
      serialize = opts.serialize,
      dump, parser, parsers;
    parser = $.rdf.parsers[format];
    if (parser === undefined) {
      parsers = [];
      for (p in $.rdf.parsers) {
        parsers.push(p);
      }
      throw "Unrecognised dump format: " + format + ". Expected one of " + parsers.join(", ");
    }
    dump = parser.dump(triples, opts);
    return serialize ? parser.serialize(dump) : dump;
  };

  $.rdf.dump.defaults = {
    format: 'application/json',
    serialize: false,
    indent: false,
    namespaces: {}
  }

  /**
   * Gleans RDF triples from the nodes held by the {@link jQuery} object, puts them into a {@link jQuery.rdf.databank} and returns a {@link jQuery.rdf} object that allows you to query and otherwise manipulate them. The mechanism for gleaning RDF triples from the web page depends on the rdfQuery modules that have been included. The core version of rdfQuery doesn't support any gleaners; other versions support a RDFa gleaner, and there are some modules available for common microformats.
   * @methodOf jQuery#
   * @name jQuery#rdf
   * @param {Function} [callback] A callback function that is called every time a triple is gleaned from the page. Within the function, <code>this</code> is set to the triple that has been located. The function can take up to two parameters:
   * <dl>
   *   <dt>node</dt><dd>The node on which the triple has been found; should be the same as <code>this.source</code>.</dd>
   *   <dt>triple</dt><dd>The triple that's been found; the same as <code>this</code>.</dd>
   * </dl>
   * The callback should return the triple or triples that should be added to the databank. This enables you to filter, extend or modify the contents of the databank itself, should you wish to.
   * @returns {jQuery.rdf} An empty query over the triples stored within the page.
   * @example $('#content').rdf().databank.dump();
   */
  $.fn.rdf = function (callback) {
    var triples = [],
      callback = callback || function () { return this; };
    if ($(this)[0] && $(this)[0].nodeType === 9) {
      return $(this).children('*').rdf(callback);
    } else if ($(this).length > 0) {
      triples = $(this).map(function (i, elem) {
        return $.map($.rdf.gleaners, function (gleaner) {
          return gleaner.call($(elem), { callback: callback });
        });
      });
      return $.rdf({ triples: triples, namespaces: $(this).xmlns() });
    } else {
      return $.rdf();
    }
  };

  $.extend($.expr[':'], {

    about: function (a, i, m) {
      var j = $(a),
        resource = m[3] ? j.safeCurie(m[3]) : null,
        isAbout = false;
      $.each($.rdf.gleaners, function (i, gleaner) {
        isAbout = gleaner.call(j, { about: resource });
        if (isAbout) {
          return null;
        }
      });
      return isAbout;
    },

    type: function (a, i, m) {
      var j = $(a),
        type = m[3] ? j.curie(m[3]) : null,
        isType = false;
      $.each($.rdf.gleaners, function (i, gleaner) {
        if (gleaner.call(j, { type: type })) {
          isType = true;
          return null;
        }
      });
      return isType;
    }

  });

  /**
   * <p>Creates a new jQuery.rdf.databank object. This should be invoked as a method rather than constructed using new; indeed you will not usually want to generate these objects directly, but manipulate them through a {@link jQuery.rdf} object.</p>
   * @class Represents a triplestore, holding a bunch of {@link jQuery.rdf.triple}s.
   * @param {(String|jQuery.rdf.triple)[]} [triples=[]] An array of triples to store in the databank.
   * @param {Object} [options] Initialisation of the databank.
   * @param {Object} [options.namespaces] An object representing a set of namespace bindings used when interpreting the CURIEs in strings representing triples. Rather than passing this in when you construct the {@link jQuery.rdf.databank} instance, you will usually want to use the {@link jQuery.rdf.databank#prefix} method.
   * @param {String|jQuery.uri} [options.base] The base URI used to interpret any relative URIs used within the strings representing triples.
   * @returns {jQuery.rdf.databank} The newly-created databank.
   * @see jQuery.rdf
   */
  $.rdf.databank = function (triples, options) {
    return new $.rdf.databank.fn.init(triples, options);
  };

  $.rdf.databank.fn = $.rdf.databank.prototype = {
    init: function (triples, options) {
      var i;
      triples = triples || [];
      options = options || {};
      this.id = databankID();
      databanks[this.id] = this;
      if (options.union === undefined) {
        this.queries = {};
        this.tripleStore = [];
        this.subjectIndex = {};
        this.propertyIndex = {};
        this.objectIndex = {};
        this.baseURI = options.base || $.uri.base();
        this.namespaces = $.extend({}, options.namespaces || {});
        for (i = 0; i < triples.length; i += 1) {
          this.add(triples[i]);
        }
      } else {
        this.union = options.union;
      }
      return this;
    },
    
    /**
     * Sets or returns the base URI of the {@link jQuery.rdf.databank}.
     * @param {String|jQuery.uri} [base]
     * @returns A {@link jQuery.uri} if no base URI is specified, otherwise returns this {@link jQuery.rdf.databank} object.
     * @see jQuery.rdf#base
     */
    base: function (base) {
      if (this.union === undefined) {
        if (base === undefined) {
          return this.baseURI;
        } else {
          this.baseURI = base;
          return this;
        }
      } else if (base === undefined) {
        return this.union[0].base();
      } else {
        $.each(this.union, function (i, databank) {
          databank.base(base);
        });
        return this;
      }
    },

    /**
     * Sets or returns a namespace binding on the {@link jQuery.rdf.databank}.
     * @param {String} [prefix]
     * @param {String} [namespace]
     * @returns {Object|jQuery.uri|jQuery.rdf} If no prefix or namespace is specified, returns an object providing all namespace bindings on the {@link jQuery.rdf#databank}. If a prefix is specified without a namespace, returns the {@link jQuery.uri} associated with that prefix. Otherwise returns this {@link jQuery.rdf} object after setting the namespace binding.
     * @see jQuery.rdf#prefix
     */
    prefix: function (prefix, uri) {
      var namespaces = {};
      if (this.union === undefined) {
        if (prefix === undefined) {
          return this.namespaces;
        } else if (uri === undefined) {
          return this.namespaces[prefix];
        } else {
          this.namespaces[prefix] = uri;
          return this;
        }
      } else if (uri === undefined) {
        $.each(this.union, function (i, databank) {
          $.extend(namespaces, databank.prefix());
        });
        if (prefix === undefined) {
          return namespaces;
        } else {
          return namespaces[prefix];
        }
      } else {
        $.each(this.union, function (i, databank) {
          databank.prefix(prefix, uri);
        });
        return this;
      }
    },

    /**
     * Adds a triple to the {@link jQuery.rdf.databank} or another {@link jQuery.rdf.databank} object to create a union.
     * @param {String|jQuery.rdf.triple|jQuery.rdf.databank} triple The triple or {@link jQuery.rdf.databank} object to be added to this one. If the triple is a {@link jQuery.rdf.databank} object, the two databanks are unioned together. If the triple is a string, it's parsed as a {@link jQuery.rdf.triple}.
     * @param {Object} [options]
     * @param {Object} [options.namespaces] An object representing a set of namespace bindings used to interpret CURIEs within the triple. Defaults to the namespace bindings defined on the {@link jQuery.rdf.databank}.
     * @param {String|jQuery.uri} [options.base] The base URI used to interpret any relative URIs used within the triple. Defaults to the base URI defined on the {@link jQuery.rdf.databank}.
     * @param {Integer} [options.depth] The number of links to traverse to gather more information about the subject, property and object of the triple.
     * @returns {jQuery.rdf.databank} This {@link jQuery.rdf.databank} object.
     * @see jQuery.rdf#add
     */
    add: function (triple, options) {
      var base = (options && options.base) || this.base(),
        namespaces = $.extend({}, this.prefix(), (options && options.namespaces) || {}),
        depth = (options && options.depth) || $.rdf.databank.defaults.depth,
        proxy = (options && options.proxy) || $.rdf.databank.defaults.proxy,
        databank;
      if (triple === this) {
        return this;
      } else if (triple.subjectIndex !== undefined) {
        // merging two databanks
        if (this.union === undefined) {
          databank = $.rdf.databank(undefined, { union: [this, triple] });
          return databank;
        } else {
          this.union.push(triple);
          return this;
        }
      } else {
        if (typeof triple === 'string') {
          triple = $.rdf.triple(triple, { namespaces: namespaces, base: base, source: triple });
        }
        if (this.union === undefined) {
          if (this.subjectIndex[triple.subject] === undefined) {
            this.subjectIndex[triple.subject] = [];
            if (depth > 0 && triple.subject.type === 'uri') {
              this.load(triple.subject.value, { depth: depth - 1, proxy: proxy });
            }
          }
          if (this.propertyIndex[triple.property] === undefined) {
            this.propertyIndex[triple.property] = [];
            if (depth > 0) {
              this.load(triple.property.value, { depth: depth - 1, proxy: proxy });
            }
          }
          if ($.inArray(triple, this.subjectIndex[triple.subject]) === -1) {
            this.tripleStore.push(triple);
            this.subjectIndex[triple.subject].push(triple);
            this.propertyIndex[triple.property].push(triple);
            if (triple.object.type === 'uri' || triple.object.type === 'bnode') {
              if (this.objectIndex[triple.object] === undefined) {
                this.objectIndex[triple.object] = [];
                if (depth > 0 && triple.object.type === 'uri') {
                  this.load(triple.object.value, { depth: depth - 1, proxy: proxy });
                }
              }
              this.objectIndex[triple.object].push(triple);
            }
            addToDatabankQueries(this, triple);
          }
        } else {
          $.each(this.union, function (i, databank) {
            databank.add(triple);
          });
        }
        return this;
      }
    },

    /**
     * Removes a triple from the {@link jQuery.rdf.databank}.
     * @param {String|jQuery.rdf.triple} triple The triple to be removed.
     * @param {Object} [options]
     * @param {Object} [options.namespaces] An object representing a set of namespace bindings used to interpret any CURIEs within the triple. Defaults to the namespace bindings defined on the {@link jQuery.rdf.databank}.
     * @param {String|jQuery.uri} [options.base] The base URI used to interpret any relative URIs used within the triple. Defaults to the base URI defined on the {@link jQuery.rdf.databank}.
     * @returns {jQuery.rdf.databank} The {@link jQuery.rdf.databank} object itself.
     * @see jQuery.rdf#remove
     */
    remove: function (triple, options) {
      var base = (options && options.base) || this.base(),
        namespaces = $.extend({}, this.prefix(), (options && options.namespaces) || {}),
        striples, ptriples, otriples,
        databank;
      if (typeof triple === 'string') {
        triple = $.rdf.triple(triple, { namespaces: namespaces, base: base, source: triple });
      }
      this.tripleStore.splice($.inArray(triple, this.tripleStore), 1);
      striples = this.subjectIndex[triple.subject];
      if (striples !== undefined) {
        striples.splice($.inArray(triple, striples), 1);
        if($(striples).size() === 0) {
            delete this.subjectIndex[triple.subject];
        }
      }
      ptriples = this.propertyIndex[triple.property];
      if (ptriples !== undefined) {
        ptriples.splice($.inArray(triple, ptriples), 1);
        if($(ptriples).size() === 0) {
            delete this.propertyIndex[triple.property];
        }
      }
      if (triple.object.type === 'uri' || triple.object.type === 'bnode') {
        otriples = this.objectIndex[triple.object];
        if (otriples !== undefined) {
          otriples.splice($.inArray(triple, otriples), 1);
          if($(otriples).size() === 0) {
              delete this.objectIndex[triple.object];
          }
        }
      }
      removeFromDatabankQueries(this, triple);
      return this;
    },

    /**
     * Creates a new databank containing all the triples in this {@link jQuery.rdf.databank} except those in the {@link jQuery.rdf.databank} passed as the argument.
     * @param {jQuery.rdf.databank} data The other {@link jQuery.rdf.databank}
     * @returns {jQuery.rdf.databank} A new {@link jQuery.rdf.databank} containing the triples in this {@link jQuery.rdf.databank} except for those in the data parameter.
     * @example
     * var old = $('html').rdf().databank;
     * ...some processing occurs...
     * var new = $('html').rdf().databank;
     * var added = new.except(old);
     * var removed = old.except(new);
     */
    except: function (data) {
      var store = data.subjectIndex,
        diff = [];
      $.each(this.subjectIndex, function (s, ts) {
        var ots = store[s];
        if (ots === undefined) {
          diff = diff.concat(ts);
        } else {
          $.each(ts, function (i, t) {
            if ($.inArray(t, ots) === -1) {
              diff.push(t);
            }
          });
        }
      });
      return $.rdf.databank(diff);
    },

    /**
     * Provides a {@link jQuery} object containing the triples held in this {@link jQuery.rdf.databank}.
     * @returns {jQuery} A {@link jQuery} object containing {@link jQuery.rdf.triple} objects.
     */
    triples: function () {
      var s, triples = [];
      if (this.union === undefined) {
        triples = this.tripleStore;
      } else {
        $.each(this.union, function (i, databank) {
          triples = triples.concat(databank.triples().get());
        });
        triples = $.unique(triples);
      }
      return $(triples);
    },

    /**
     * Tells you how many triples the databank contains.
     * @returns {Integer} The number of triples in the {@link jQuery.rdf.databank}.
     * @example $('html').rdf().databank.size();
     */
    size: function () {
      return this.triples().length;
    },

    /**
     * Provides <a href="http://n2.talis.com/wiki/Bounded_Descriptions_in_RDF#Simple_Concise_Bounded_Description">simple concise bounded descriptions</a> of the resources that are passed in the argument. This mirrors the <a href="http://www.w3.org/TR/rdf-sparql-query/#describe">DESCRIBE</a> form in SPARQL.
     * @param {(String|jQuery.rdf.resource)[]} resources An array that can contain strings, {@link jQuery.rdf.resource}s or a mixture of the two.
     * @returns {jQuery} A {@link jQuery} object holding the {@link jQuery.rdf.triple}s that describe the listed resources.
     * @see jQuery.rdf#describe
     */
    describe: function (resources) {
      var i, r, t, rhash = {}, triples = [];
      while (resources.length > 0) {
        r = resources.pop();
        if (rhash[r] === undefined) {
          if (r.value === undefined) {
            r = $.rdf.resource(r);
          }
          if (this.subjectIndex[r] !== undefined) {
            for (i = 0; i < this.subjectIndex[r].length; i += 1) {
              t = this.subjectIndex[r][i];
              triples.push(t);
              if (t.object.type === 'bnode') {
                resources.push(t.object);
              }
            }
          }
          if (this.objectIndex[r] !== undefined) {
            for (i = 0; i < this.objectIndex[r].length; i += 1) {
              t = this.objectIndex[r][i];
              triples.push(t);
              if (t.subject.type === 'bnode') {
                resources.push(t.subject);
              }
            }
          }
          rhash[r] = true;
        }
      }
      return $.unique(triples);
    },

    /**
     * Dumps the triples in the databank into a format that can be shown to the user or sent to a server.
     * @param {Object} [options] Options that control the formatting of the triples. See {@link jQuery.rdf.dump} for details.
     * @returns {Object|Node|String}
     * @see jQuery.rdf.dump
     */
    dump: function (options) {
      options = $.extend({ namespaces: this.namespaces, base: this.base }, options || {});
      return $.rdf.dump(this.triples(), options);
    },

    /**
     * Loads some data into the databank.
     * @param {Node|Object|String} data If the data is a string and starts with 'http://' then it's taken to be a URI and data is loaded from that URI via the proxy specified in the options. If it doesn't start with 'http://' then it's taken to be a serialized version of some format capable of representing RDF, parsed and interpreted. If the data is a node, it's interpreted to be an <a href="http://www.w3.org/TR/rdf-syntax-grammar/">RDF/XML syntax</a> document and will be parsed as such. Otherwise, it's taken to be a <a href="http://n2.talis.com/wiki/RDF_JSON_Specification">RDF/JSON</a> object.
     * @param {Object} opts Options governing the loading of the data.
     * @param {String} [opts.format] The mime type of the format the data is in, particularly useful if you're supplying the data as a string. If unspecified, the data will be sniffed to see if it might be HTML, RDF/XML, RDF/JSON or Turtle.
     * @param {boolean} [opts.async=true] When loading data from a URI, this determines whether it will be done synchronously or asynchronously.
     * @param {Function} [opts.success] When loading data from a URI, a function that will be called after the data is successfully loaded.
     * @param {Function} [opts.error] When loading data from a URI, a function that will be called if there's an error when accessing the URI.
     * @param {String} [opts.proxy='http://www.jenitennison.com/rdfquery/proxy.php'] The URI for a server-side proxy through which the data can be accessed. This does not have to be hosted on the same server as this Javascript, the HTML page or the remote data. The proxy must accept id, url and depth parameters and respond with some Javascript that will invoke the {@link jQuery.rdf.databank.load} function. <a href="http://code.google.com/p/rdfquery/source/browse/#svn/trunk/proxies">Example proxies</a> that do the right thing are available. If you are intending to use this facility a lot, please do not use the default proxy.
     * @param {integer} [opts.depth=0] Triggers recursive loading of located resources, to the depth specified. This is useful for automatically populating a databank with linked data.
     * @returns {jQuery.rdf.databank} The {@link jQuery.rdf.databank} itself.
     * @see jQuery.rdf#load
     */
    load: function (data, opts) {
      var i, triples, url, script, parser, docElem,
        format = (opts && opts.format),
        async = (opts && opts.async) || $.rdf.databank.defaults.async,
        success = (opts && opts.success) || $.rdf.databank.defaults.success,
        error = (opts && opts.error) || $.rdf.databank.defaults.error,
        proxy = (opts && opts.proxy) || $.rdf.databank.defaults.proxy,
        depth = (opts && opts.depth) || $.rdf.databank.defaults.depth;
      url = (typeof data === 'string' && data.substring(1, 7) === 'http://') ? $.uri(data) : data;
      if (url.scheme) {
        if (!queue(this, url, { success: success, error: error })) {
          script = '<script type="text/javascript" src="' + proxy + '?id=' + this.id + '&amp;depth=' + depth + '&amp;url=' + encodeURIComponent(url.resolve('').toString()) + '"></script>';
          if (async) {
            setTimeout("$('head').append('" + script + "')", 0);
          } else {
            $('head').append(script);
          }
        }
        return this;
      } else {
        if (format === undefined) {
          if (typeof data === 'string') {
            if (data.substring(0, 1) === '{') {
              format = 'application/json';
            } else if (data.substring(0, 14) === '<!DOCTYPE html' || data.substring(0, 5) === '<html') {
              format = 'application/xhtml+xml';
            } else if (data.substring(0, 5) === '<?xml' || data.substring(0, 8) === '<rdf:RDF') {
              format = 'application/rdf+xml';
            } else {
              format = 'text/turtle';
            }
          } else if (data.documentElement || data.ownerDocument) {
            docElem = data.documentElement ? data.documentElement : data.ownerDocument.documentElement;
            if (docElem.nodeName === 'html') {
              format = 'application/xhtml+xml';
            } else {
              format = 'application/rdf+xml';
            }
          } else {
            format = 'application/json';
          }
        }
        parser = $.rdf.parsers[format];
        if (typeof data === 'string') {
          data = parser.parse(data);
        }
        triples = parser.triples(data);
        for (i = 0; i < triples.length; i += 1) {
          this.add(triples[i], opts);
        }
        return this;
      }
    },

    /**
     * Provides a string representation of the databank which simply specifies how many triples it contains.
     * @returns {String}
     */
    toString: function () {
      return '[Databank with ' + this.size() + ' triples]';
    }
  };

  $.rdf.databank.fn.init.prototype = $.rdf.databank.fn;
  
  $.rdf.databank.defaults = {
    parse: false,
    async: true,
    success: null,
    error: null,
    depth: 0,
    proxy: 'http://www.jenitennison.com/rdfquery/proxy.php'
  };
  
  $.rdf.databank.load = function (id, url, doc, opts) {
    if (doc !== undefined) {
      databanks[id].load(doc, opts);
    }
    dequeue(databanks[id], url, (doc === undefined) ? 'error' : 'success', opts);
  };

  /**
   * <p>Creates a new jQuery.rdf.pattern object. This should be invoked as a method rather than constructed using new; indeed you will not usually want to generate these objects directly, since they are automatically created from strings where necessary, such as by {@link jQuery.rdf#where}.</p>
   * @class Represents a pattern that may or may not match a given {@link jQuery.rdf.triple}.
   * @param {String|jQuery.rdf.resource|jQuery.rdf.blank} subject The subject pattern, or a single string that defines the entire pattern. If the subject is specified as a string, it can be a fixed resource (<code>&lt;<var>uri</var>&gt;</code> or <code><var>curie</var></code>), a blank node (<code>_:<var>id</var></code>) or a variable placeholder (<code>?<var>name</var></code>).
   * @param {String|jQuery.rdf.resource} [property] The property pattern. If the property is specified as a string, it can be a fixed resource (<code>&lt;<var>uri</var>&gt;</code> or <code><var>curie</var></code>) or a variable placeholder (<code>?<var>name</var></code>).
   * @param {String|jQuery.rdf.resource|jQuery.rdf.blank|jQuery.rdf.literal} [value] The value pattern. If the property is specified as a string, it can be a fixed resource (<code>&lt;<var>uri</var>&gt;</code> or <code><var>curie</var></code>), a blank node (<code>_:<var>id</var></code>), a literal (<code>"<var>value</var>"</code>) or a variable placeholder (<code>?<var>name</var></code>).
   * @param {Object} [options] Initialisation of the pattern.
   * @param {Object} [options.namespaces] An object representing a set of namespace bindings used when interpreting the CURIEs in the subject, property and object.
   * @param {String|jQuery.uri} [options.base] The base URI used to interpret any relative URIs used within the subject, property and object.
   * @param {boolean} [options.optional]
   * @returns {jQuery.rdf.pattern} The newly-created pattern.
   * @throws {String} Errors if any of the strings are not in a recognised format.
   * @example pattern = $.rdf.pattern('?person', $.rdf.type, 'foaf:Person', { namespaces: { foaf: "http://xmlns.com/foaf/0.1/" }});
   * @example 
   * pattern = $.rdf.pattern('?person a foaf:Person', { 
   *   namespaces: { foaf: "http://xmlns.com/foaf/0.1/" }, 
   *   optional: true 
   * });
   * @see jQuery.rdf#where
   * @see jQuery.rdf.resource
   * @see jQuery.rdf.blank
   * @see jQuery.rdf.literal
   */
  $.rdf.pattern = function (subject, property, object, options) {
    var pattern, m, optional;
    // using a two-argument version; first argument is a Turtle statement string
    if (object === undefined) {
      options = property || {};
      m = $.trim(subject).match(tripleRegex);
      if (m.length === 3 || (m.length === 4 && m[3] === '.')) {
        subject = m[0];
        property = m[1];
        object = m[2];
      } else {
        throw "Bad Pattern: Couldn't parse string " + subject;
      }
      optional = (options.optional === undefined) ? $.rdf.pattern.defaults.optional : options.optional;
    }
    if (memPattern[subject] && 
        memPattern[subject][property] && 
        memPattern[subject][property][object] && 
        memPattern[subject][property][object][optional]) {
      return memPattern[subject][property][object][optional];
    }
    pattern = new $.rdf.pattern.fn.init(subject, property, object, options);
    if (memPattern[pattern.subject] &&
        memPattern[pattern.subject][pattern.property] &&
        memPattern[pattern.subject][pattern.property][pattern.object] &&
        memPattern[pattern.subject][pattern.property][pattern.object][pattern.optional]) {
      return memPattern[pattern.subject][pattern.property][pattern.object][pattern.optional];
    } else {
      if (memPattern[pattern.subject] === undefined) {
        memPattern[pattern.subject] = {};
      }
      if (memPattern[pattern.subject][pattern.property] === undefined) {
        memPattern[pattern.subject][pattern.property] = {};
      }
      if (memPattern[pattern.subject][pattern.property][pattern.object] === undefined) {
        memPattern[pattern.subject][pattern.property][pattern.object] = {};
      }
      memPattern[pattern.subject][pattern.property][pattern.object][pattern.optional] = pattern;
      return pattern;
    }
  };

  $.rdf.pattern.fn = $.rdf.pattern.prototype = {
    init: function (s, p, o, options) {
      var opts = $.extend({}, $.rdf.pattern.defaults, options);
      /**
       * The placeholder for the subject of triples matching against this pattern.
       * @type String|jQuery.rdf.resource|jQuery.rdf.blank
       */
      this.subject = s.toString().substring(0, 1) === '?' ? s : subject(s, opts);
      /**
       * The placeholder for the property of triples matching against this pattern.
       * @type String|jQuery.rdf.resource
       */
      this.property = p.toString().substring(0, 1) === '?' ? p : property(p, opts);
      /**
       * The placeholder for the object of triples matching against this pattern.
       * @type String|jQuery.rdf.resource|jQuery.rdf.blank|jQuery.rdf.literal
       */
      this.object = o.toString().substring(0, 1) === '?' ? o : object(o, opts);
      /**
       * Whether the pattern should only optionally match against the triple
       * @type boolean
       */
      this.optional = opts.optional;
      return this;
    },

    /**
     * Creates a new {@link jQuery.rdf.pattern} with any variable placeholders within this one's subject, property or object filled in with values from the bindings passed as the argument.
     * @param {Object} bindings An object holding the variable bindings to be used to replace any placeholders in the pattern. These bindings are of the type held by the {@link jQuery.rdf} object.
     * @returns {jQuery.rdf.pattern} A new {@link jQuery.rdf.pattern} object.
     * @example
     * pattern = $.rdf.pattern('?thing a ?class');
     * // pattern2 matches all triples that indicate the classes of this page. 
     * pattern2 = pattern.fill({ thing: $.rdf.resource('<>') });
     */
    fill: function (bindings) {
      var s = this.subject,
        p = this.property,
        o = this.object;
      if (typeof s === 'string' && bindings[s.substring(1)]) {
        s = bindings[s.substring(1)];
      }
      if (typeof p === 'string' && bindings[p.substring(1)]) {
        p = bindings[p.substring(1)];
      }
      if (typeof o === 'string' && bindings[o.substring(1)]) {
        o = bindings[o.substring(1)];
      }
      return $.rdf.pattern(s, p, o, { optional: this.optional });
    },

    /**
     * Creates a new Object holding variable bindings by matching the passed triple against this pattern.
     * @param {jQuery.rdf.triple} triple A {@link jQuery.rdf.triple} for this pattern to match against.
     * @returns {null|Object} An object containing the bindings of variables (as specified in this pattern) to values (as specified in the triple), or <code>null</code> if the triple doesn't match the pattern.
     * pattern = $.rdf.pattern('?thing a ?class');
     * bindings = pattern.exec($.rdf.triple('<> a foaf:Person', { namespaces: ns }));
     * thing = bindings.thing; // the resource for this page
     * class = bindings.class; // a resource for foaf:Person
     */
    exec: function (triple) {
      var binding = {};
      binding = testResource(triple.subject, this.subject, binding);
      if (binding === null) {
        return null;
      }
      binding = testResource(triple.property, this.property, binding);
      if (binding === null) {
        return null;
      }
      binding = testResource(triple.object, this.object, binding);
      return binding;
    },

    /**
     * Tests whether this pattern has any variable placeholders in it or not.
     * @returns {boolean} True if the pattern doesn't contain any variable placeholders.
     * @example
     * $.rdf.pattern('?thing a ?class').isFixed(); // false
     * $.rdf.pattern('<> a foaf:Person', { namespaces: ns }).isFixed(); // true
     */
    isFixed: function () {
      return typeof this.subject !== 'string' &&
        typeof this.property !== 'string' &&
        typeof this.object !== 'string';
    },

    /**
     * Creates a new triple based on the bindings passed to the pattern, if possible.
     * @param {Object} bindings An object holding the variable bindings to be used to replace any placeholders in the pattern. These bindings are of the type held by the {@link jQuery.rdf} object.
     * @returns {null|jQuery.rdf.triple} A new {@link jQuery.rdf.triple} object, or null if not all the variable placeholders in the pattern are specified in the bindings. The {@link jQuery.rdf.triple#source} of the generated triple is set to the string value of this pattern.
     * @example
     * pattern = $.rdf.pattern('?thing a ?class');
     * // triple is a new triple '<> a foaf:Person'
     * triple = pattern.triple({ 
     *   thing: $.rdf.resource('<>'),
     *   class: $.rdf.resource('foaf:Person', { namespaces: ns }) 
     * });
     */
    triple: function (bindings) {
      var t = this;
      if (!this.isFixed()) {
        t = this.fill(bindings);
      }
      if (t.isFixed()) {
        return $.rdf.triple(t.subject, t.property, t.object, { source: this.toString() });
      } else {
        return null;
      }
    },

    /**
     * Returns a string representation of the pattern by concatenating the subject, property and object.
     * @returns {String}
     */
    toString: function () {
      return this.subject + ' ' + this.property + ' ' + this.object;
    }
  };

  $.rdf.pattern.fn.init.prototype = $.rdf.pattern.fn;

  $.rdf.pattern.defaults = {
    base: $.uri.base(),
    namespaces: {},
    optional: false
  };

  /**
   * <p>Creates a new jQuery.rdf.triple object. This should be invoked as a method rather than constructed using new; indeed you will not usually want to generate these objects directly, since they are automatically created from strings where necessary, such as by {@link jQuery.rdf#add}.</p>
   * @class Represents an RDF triple.
   * @param {String|jQuery.rdf.resource|jQuery.rdf.blank} subject The subject of the triple, or a single string that defines the entire triple. If the subject is specified as a string, it can be a fixed resource (<code>&lt;<var>uri</var>&gt;</code> or <code><var>curie</var></code>) or a blank node (<code>_:<var>id</var></code>).
   * @param {String|jQuery.rdf.resource} [property] The property pattern. If the property is specified as a string, it must be a fixed resource (<code>&lt;<var>uri</var>&gt;</code> or <code><var>curie</var></code>).
   * @param {String|jQuery.rdf.resource|jQuery.rdf.blank|jQuery.rdf.literal} [value] The value pattern. If the property is specified as a string, it can be a fixed resource (<code>&lt;<var>uri</var>&gt;</code> or <code><var>curie</var></code>), a blank node (<code>_:<var>id</var></code>), or a literal (<code>"<var>value</var>"</code>).
   * @param {Object} [options] Initialisation of the triple.
   * @param {Object} [options.namespaces] An object representing a set of namespace bindings used when interpreting the CURIEs in the subject, property and object.
   * @param {String|jQuery.uri} [options.base] The base URI used to interpret any relative URIs used within the subject, property and object.
   * @returns {jQuery.rdf.triple} The newly-created triple.
   * @throws {String} Errors if any of the strings are not in a recognised format.
   * @example pattern = $.rdf.triple('<>', $.rdf.type, 'foaf:Person', { namespaces: { foaf: "http://xmlns.com/foaf/0.1/" }});
   * @example 
   * pattern = $.rdf.triple('<> a foaf:Person', { 
   *   namespaces: { foaf: "http://xmlns.com/foaf/0.1/" }
   * });
   * @see jQuery.rdf#add
   * @see jQuery.rdf.resource
   * @see jQuery.rdf.blank
   * @see jQuery.rdf.literal
   */
  $.rdf.triple = function (subject, property, object, options) {
    var triple, graph, m;
    // using a two-argument version; first argument is a Turtle statement string
    if (object === undefined) {
      options = property;
      m = $.trim(subject).match(tripleRegex);
      if (m.length === 3 || (m.length === 4 && m[3] === '.')) {
        subject = m[0];
        property = m[1];
        object = m[2];
      } else {
        throw "Bad Triple: Couldn't parse string " + subject;
      }
    }
    graph = (options && options.graph) || '';
    if (memTriple[graph] &&
        memTriple[graph][subject] &&
        memTriple[graph][subject][property] &&
        memTriple[graph][subject][property][object]) {
      return memTriple[graph][subject][property][object];
    }
    triple = new $.rdf.triple.fn.init(subject, property, object, options);
    graph = triple.graph || '';
    if (memTriple[graph] &&
        memTriple[graph][triple.subject] &&
        memTriple[graph][triple.subject][triple.property] &&
        memTriple[graph][triple.subject][triple.property][triple.object]) {
      return memTriple[graph][triple.subject][triple.property][triple.object];
    } else {
      if (memTriple[graph] === undefined) {
        memTriple[graph] = {};
      }
      if (memTriple[graph][triple.subject] === undefined) {
        memTriple[graph][triple.subject] = {};
      }
      if (memTriple[graph][triple.subject][triple.property] === undefined) {
        memTriple[graph][triple.subject][triple.property] = {};
      }
      memTriple[graph][triple.subject][triple.property][triple.object] = triple;
      return triple;
    }
  };

  $.rdf.triple.fn = $.rdf.triple.prototype = {
    init: function (s, p, o, options) {
      var opts;
      opts = $.extend({}, $.rdf.triple.defaults, options);
      /**
       * The subject of the triple.
       * @type jQuery.rdf.resource|jQuery.rdf.blank
       */
      this.subject = subject(s, opts);
      /**
       * The property of the triple.
       * @type jQuery.rdf.resource
       */
      this.property = property(p, opts);
      /**
       * The object of the triple.
       * @type jQuery.rdf.resource|jQuery.rdf.blank|jQuery.rdf.literal
       */
      this.object = object(o, opts);
      /**
       * (Experimental) The named graph the triple belongs to.
       * @type jQuery.rdf.resource|jQuery.rdf.blank
       */
      this.graph = opts.graph === undefined ? undefined : subject(opts.graph, opts);
      /**
       * The source of the triple, which might be a node within the page (if the RDF is generated from the page) or a string holding the pattern that generated the triple.
       */
      this.source = opts.source;
      return this;
    },

    /**
     * Always returns true for triples.
     * @see jQuery.rdf.pattern#isFixed
     */
    isFixed: function () {
      return true;
    },

    /**
     * Always returns this triple.
     * @see jQuery.rdf.pattern#triple
     */
    triple: function (bindings) {
      return this;
    },

    /**
     * Returns a <a href="http://n2.talis.com/wiki/RDF_JSON_Specification">RDF/JSON</a> representation of this triple.
     * @returns {Object}
     */
    dump: function () {
      var e = {},
        s = this.subject.value.toString(),
        p = this.property.value.toString();
      e[s] = {};
      e[s][p] = this.object.dump();
      return e;
    },

    /**
     * Returns a string representing this triple in Turtle format.
     * @returns {String}
     */
    toString: function () {
      return this.subject + ' ' + this.property + ' ' + this.object + ' .';
    }
  };

  $.rdf.triple.fn.init.prototype = $.rdf.triple.fn;

  $.rdf.triple.defaults = {
    base: $.uri.base(),
    source: [document],
    namespaces: {}
  };

  /**
   * <p>Creates a new jQuery.rdf.resource object. This should be invoked as a method rather than constructed using new; indeed you will not usually want to generate these objects directly, since they are automatically created from strings where necessary, such as by {@link jQuery.rdf#add}.</p>
   * @class Represents an RDF resource.
   * @param {String|jQuery.uri} value The value of the resource. If it's a string it must be in the format <code>&lt;<var>uri</var>&gt;</code> or <code><var>curie</var></code>.
   * @param {Object} [options] Initialisation of the resource.
   * @param {Object} [options.namespaces] An object representing a set of namespace bindings used when interpreting the CURIE specifying the resource.
   * @param {String|jQuery.uri} [options.base] The base URI used to interpret any relative URIs used within the URI specifying the resource.
   * @returns {jQuery.rdf.resource} The newly-created resource.
   * @throws {String} Errors if the string is not in a recognised format.
   * @example thisPage = $.rdf.resource('<>');
   * @example foaf.Person = $.rdf.resource('foaf:Person', { namespaces: ns });
   * @see jQuery.rdf.pattern
   * @see jQuery.rdf.triple
   * @see jQuery.rdf.blank
   * @see jQuery.rdf.literal
   */
  $.rdf.resource = function (value, options) {
    var resource;
    if (memResource[value]) {
      return memResource[value];
    }
    resource = new $.rdf.resource.fn.init(value, options);
    if (memResource[resource]) {
      return memResource[resource];
    } else {
      memResource[resource] = resource;
      return resource;
    }
  };

  $.rdf.resource.fn = $.rdf.resource.prototype = {
    /**
     * Always fixed to 'uri' for resources.
     * @type String
     */
    type: 'uri',
    /**
     * The URI for the resource.
     * @type jQuery.rdf.uri
     */
    value: undefined,

    init: function (value, options) {
      var m, prefix, uri, opts;
      if (typeof value === 'string') {
        m = uriRegex.exec(value);
        opts = $.extend({}, $.rdf.resource.defaults, options);
        if (m !== null) {
          this.value = $.uri.resolve(m[1].replace(/\\>/g, '>'), opts.base);
        } else if (value.substring(0, 1) === ':') {
          uri = opts.namespaces[''];
          if (uri === undefined) {
            throw "Malformed Resource: No namespace binding for default namespace in " + value;
          } else {
            this.value = $.uri.resolve(uri + value.substring(1));
          }
        } else if (value.substring(value.length - 1) === ':') {
          prefix = value.substring(0, value.length - 1);
          uri = opts.namespaces[prefix];
          if (uri === undefined) {
            throw "Malformed Resource: No namespace binding for prefix " + prefix + " in " + value;
          } else {
            this.value = $.uri.resolve(uri);
          }
        } else {
          try {
            this.value = $.curie(value, { namespaces: opts.namespaces });
          } catch (e) {
            throw "Malformed Resource: Bad format for resource " + e;
          }
        }
      } else {
        this.value = value;
      }
      return this;
    }, // end init

    /**
     * Returns a <a href="http://n2.talis.com/wiki/RDF_JSON_Specification">RDF/JSON</a> representation of this triple.
     * @returns {Object}
     */
    dump: function () {
      return {
        type: 'uri',
        value: this.value.toString()
      };
    },

    /**
     * Returns a string representing this resource in Turtle format.
     * @returns {String}
     */
    toString: function () {
      return '<' + this.value + '>';
    }
  };

  $.rdf.resource.fn.init.prototype = $.rdf.resource.fn;

  $.rdf.resource.defaults = {
    base: $.uri.base(),
    namespaces: {}
  };

  /**
   * A {@link jQuery.rdf.resource} for rdf:type
   * @constant
   * @type jQuery.rdf.resource
   */
  $.rdf.type = $.rdf.resource('<' + rdfNs + 'type>');
  /**
   * A {@link jQuery.rdf.resource} for rdfs:label
   * @constant
   * @type jQuery.rdf.resource
   */
  $.rdf.label = $.rdf.resource('<' + rdfsNs + 'label>');
  /**
   * A {@link jQuery.rdf.resource} for rdf:first
   * @constant
   * @type jQuery.rdf.resource
   */
  $.rdf.first = $.rdf.resource('<' + rdfNs + 'first>');
  /**
   * A {@link jQuery.rdf.resource} for rdf:rest
   * @constant
   * @type jQuery.rdf.resource
   */
  $.rdf.rest = $.rdf.resource('<' + rdfNs + 'rest>');
  /**
   * A {@link jQuery.rdf.resource} for rdf:nil
   * @constant
   * @type jQuery.rdf.resource
   */
  $.rdf.nil = $.rdf.resource('<' + rdfNs + 'nil>');
  /**
   * A {@link jQuery.rdf.resource} for rdf:subject
   * @constant
   * @type jQuery.rdf.resource
   */
  $.rdf.subject = $.rdf.resource('<' + rdfNs + 'subject>');
  /**
   * A {@link jQuery.rdf.resource} for rdf:property
   * @constant
   * @type jQuery.rdf.resource
   */
  $.rdf.property = $.rdf.resource('<' + rdfNs + 'property>');
  /**
   * A {@link jQuery.rdf.resource} for rdf:object
   * @constant
   * @type jQuery.rdf.resource
   */
  $.rdf.object = $.rdf.resource('<' + rdfNs + 'object>');

  /**
   * <p>Creates a new jQuery.rdf.blank object. This should be invoked as a method rather than constructed using new; indeed you will not usually want to generate these objects directly, since they are automatically created from strings where necessary, such as by {@link jQuery.rdf#add}.</p>
   * @class Represents an RDF blank node.
   * @param {String} value A representation of the blank node in the format <code>_:<var>id</var></code> or <code>[]</code> (which automatically creates a new blank node with a unique ID).
   * @returns {jQuery.rdf.blank} The newly-created blank node.
   * @throws {String} Errors if the string is not in a recognised format.
   * @example newBlank = $.rdf.blank('[]');
   * @example identifiedBlank = $.rdf.blank('_:fred');
   * @see jQuery.rdf.pattern
   * @see jQuery.rdf.triple
   * @see jQuery.rdf.resource
   * @see jQuery.rdf.literal
   */
  $.rdf.blank = function (value) {
    var blank;
    if (memBlank[value]) {
      return memBlank[value];
    }
    blank = new $.rdf.blank.fn.init(value);
    if (memBlank[blank]) {
      return memBlank[blank];
    } else {
      memBlank[blank] = blank;
      return blank;
    }
  };

  $.rdf.blank.fn = $.rdf.blank.prototype = {
    /**
     * Always fixed to 'bnode' for blank nodes.
     * @type String
     */
    type: 'bnode',
    /**
     * The value of the blank node in the format <code>_:<var>id</var></code>
     * @type String
     */
    value: undefined,
    /**
     * The id of the blank node.
     * @type String
     */
    id: undefined,

    init: function (value) {
      if (value === '[]') {
        this.id = blankNodeID();
        this.value = '_:' + this.id;
      } else if (value.substring(0, 2) === '_:') {
        this.id = value.substring(2);
        this.value = value;
      } else {
        throw "Malformed Blank Node: " + value + " is not a legal format for a blank node";
      }
      return this;
    },

    /**
     * Returns a <a href="http://n2.talis.com/wiki/RDF_JSON_Specification">RDF/JSON</a> representation of this blank node.
     * @returns {Object}
     */
    dump: function () {
      return {
        type: 'bnode',
        value: this.value
      };
    },

    /**
     * Returns the value this blank node.
     * @returns {String}
     */
    toString: function () {
      return this.value;
    }
  };

  $.rdf.blank.fn.init.prototype = $.rdf.blank.fn;

  /**
   * <p>Creates a new jQuery.rdf.literal object. This should be invoked as a method rather than constructed using new; indeed you will not usually want to generate these objects directly, since they are automatically created from strings where necessary, such as by {@link jQuery.rdf#add}.</p>
   * @class Represents an RDF literal.
   * @param {String|boolean|Number} value Either the value of the literal or a string representation of it. If the datatype or lang options are specified, the value is taken as given. Otherwise, if it's a Javascript boolean or numeric value, it is interpreted as a value with a xsd:boolean or xsd:double datatype. In all other cases it's interpreted as a literal as defined in <a href="http://www.w3.org/TeamSubmission/turtle/#literal">Turtle syntax</a>.
   * @param {Object} [options] Initialisation options for the literal.
   * @param {String} [options.datatype] The datatype for the literal. This should be a safe CURIE; in other words, it can be in the format <code><var>uri</var></code> or <code>[<var>curie</var>]</code>. Must not be specified if options.lang is also specified.
   * @param {String} [options.lang] The language for the literal. Must not be specified if options.datatype is also specified.
   * @param {Object} [options.namespaces] An object representing a set of namespace bindings used when interpreting a CURIE in the datatype.
   * @param {String|jQuery.uri} [options.base] The base URI used to interpret a relative URI in the datatype.
   * @returns {jQuery.rdf.literal} The newly-created literal.
   * @throws {String} Errors if the string is not in a recognised format or if both options.datatype and options.lang are specified.
   * @example trueLiteral = $.rdf.literal(true);
   * @example numericLiteral = $.rdf.literal(5);
   * @example dateLiteral = $.rdf.literal('"2009-07-13"^^xsd:date', { namespaces: ns });
   * @see jQuery.rdf.pattern
   * @see jQuery.rdf.triple
   * @see jQuery.rdf.resource
   * @see jQuery.rdf.blank
   */
  $.rdf.literal = function (value, options) {
    var literal;
    if (memLiteral[value]) {
      return memLiteral[value];
    }
    literal = new $.rdf.literal.fn.init(value, options);
    if (memLiteral[literal]) {
      return memLiteral[literal];
    } else {
      memLiteral[literal] = literal;
      return literal;
    }
  };

  $.rdf.literal.fn = $.rdf.literal.prototype = {
    /**
     * Always fixed to 'literal' for literals.
     * @type String
     */
    type: 'literal',
    /**
     * The value of the literal as a string.
     * @type String
     */
    value: undefined,
    /**
     * The language of the literal, if it has one; otherwise undefined.
     * @type String
     */
    lang: undefined,
    /**
     * The datatype of the literal, if it has one; otherwise undefined.
     * @type jQuery.uri
     */
    datatype: undefined,

    init: function (value, options) {
      var
        m, datatype,
        opts = $.extend({}, $.rdf.literal.defaults, options);
      datatype = $.safeCurie(opts.datatype, { namespaces: opts.namespaces });
      if (opts.lang !== undefined && opts.datatype !== undefined && datatype.toString() !== (rdfNs + 'XMLLiteral')) {
        throw "Malformed Literal: Cannot define both a language and a datatype for a literal (" + value + ")";
      }
      if (opts.datatype !== undefined) {
        datatype = $.safeCurie(opts.datatype, { namespaces: opts.namespaces });
        $.extend(this, $.typedValue(value.toString(), datatype));
        if (datatype.toString() === rdfNs + 'XMLLiteral') {
          this.lang = opts.lang;
        }
      } else if (opts.lang !== undefined) {
        this.value = value.toString();
        this.lang = opts.lang;
      } else if (typeof value === 'boolean') {
        $.extend(this, $.typedValue(value.toString(), xsdNs + 'boolean'));
      } else if (typeof value === 'number') {
        $.extend(this, $.typedValue(value.toString(), xsdNs + 'double'));
      } else if (value === 'true' || value === 'false') {
        $.extend(this, $.typedValue(value, xsdNs + 'boolean'));
      } else if ($.typedValue.valid(value, xsdNs + 'integer')) {
        $.extend(this, $.typedValue(value, xsdNs + 'integer'));
      } else if ($.typedValue.valid(value, xsdNs + 'decimal')) {
        $.extend(this, $.typedValue(value, xsdNs + 'decimal'));
      } else if ($.typedValue.valid(value, xsdNs + 'double') &&
                 !/^\s*([\-\+]?INF|NaN)\s*$/.test(value)) {  // INF, -INF and NaN aren't valid literals in Turtle
        $.extend(this, $.typedValue(value, xsdNs + 'double'));
      } else {
        m = literalRegex.exec(value);
        if (m !== null) {
          this.value = (m[2] || m[4]).replace(/\\"/g, '"').replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\r/g, '\r');
          if (m[9]) {
            datatype = $.rdf.resource(m[9], opts);
            $.extend(this, $.typedValue(this.value, datatype.value));
          } else if (m[7]) {
            this.lang = m[7];
          }
        } else {
          throw "Malformed Literal: Couldn't recognise the value " + value;
        }
      }
      return this;
    }, // end init

    /**
     * Returns a <a href="http://n2.talis.com/wiki/RDF_JSON_Specification">RDF/JSON</a> representation of this blank node.
     * @returns {Object}
     */
    dump: function () {
      var e = {
        type: 'literal',
        value: this.value.toString()
      };
      if (this.lang !== undefined) {
        e.lang = this.lang;
      } else if (this.datatype !== undefined) {
        e.datatype = this.datatype.toString();
      }
      return e;
    },
    
    /**
     * Returns a string representing this resource in <a href="http://www.w3.org/TeamSubmission/turtle/#literal">Turtle format</a>.
     * @returns {String}
     */
    toString: function () {
      var val = '"' + this.value + '"';
      if (this.lang !== undefined) {
        val += '@' + this.lang;
      } else if (this.datatype !== undefined) {
        val += '^^<' + this.datatype + '>';
      }
      return val;
    }
  };

  $.rdf.literal.fn.init.prototype = $.rdf.literal.fn;

  $.rdf.literal.defaults = {
    base: $.uri.base(),
    namespaces: {},
    datatype: undefined,
    lang: undefined
  };

})(jQuery);
/*
 * jQuery RDF @VERSION
 *
 * Copyright (c) 2008,2009 Jeni Tennison
 * Licensed under the MIT (MIT-LICENSE.txt)
 *
 * Depends:
 *  jquery.uri.js
 *  jquery.xmlns.js
 *  jquery.datatype.js
 *  jquery.curie.js
 *  jquery.rdf.js
 *  jquery.json.js
 */
/**
 * @fileOverview jQuery RDF/JSON parser
 * @author <a href="mailto:jeni@jenitennison.com">Jeni Tennison</a>
 * @copyright (c) 2008,2009 Jeni Tennison
 * @license MIT license (MIT-LICENSE.txt)
 * @version 1.0
 */
/**
 * @exports $ as jQuery
 */
/**
 * @ignore
 */
(function ($) {

  $.rdf.parsers['application/json'] = {
    parse: $.secureEvalJSON,
    serialize: $.toJSON,
    triples: function (data) {
      var s, subject, p, property, o, object, i, opts, triples = [];
      for (s in data) {
        subject = (s.substring(0, 2) === '_:') ? $.rdf.blank(s) : $.rdf.resource('<' + s + '>');
        for (p in data[s]) {
          property = $.rdf.resource('<' + p + '>');
          for (i = 0; i < data[s][p].length; i += 1) {
            o = data[s][p][i];
            if (o.type === 'uri') {
              object = $.rdf.resource('<' + o.value + '>');
            } else if (o.type === 'bnode') {
              object = $.rdf.blank(o.value);
            } else {
              // o.type === 'literal'
              if (o.datatype !== undefined) {
                object = $.rdf.literal(o.value, { datatype: o.datatype });
              } else {
                opts = {};
                if (o.lang !== undefined) {
                  opts.lang = o.lang;
                }
                var escapedValue = typeof o.value === "string" ? o.value.replace(/\"/g,'\\"') : o.value;
                object = $.rdf.literal('"' + escapedValue + '"', opts);
              }
            }
            triples.push($.rdf.triple(subject, property, object));
          }
        }
      }
      return triples;
    },
    dump: function (triples) {
      var e = {},
        i, t, s, p;
      for (i = 0; i < triples.length; i += 1) {
        t = triples[i];
        s = t.subject.value.toString();
        p = t.property.value.toString();
        if (e[s] === undefined) {
          e[s] = {};
        }
        if (e[s][p] === undefined) {
          e[s][p] = [];
        }
        e[s][p].push(t.object.dump());
      }
      return e;
    }
  };

})(jQuery);
/*
 * jQuery RDF @VERSION
 *
 * Copyright (c) 2008,2009 Jeni Tennison
 * Licensed under the MIT (MIT-LICENSE.txt)
 *
 * Depends:
 *  jquery.uri.js
 *  jquery.xmlns.js
 *  jquery.datatype.js
 *  jquery.curie.js
 *  jquery.rdf.js
 *  jquery.rdf.json.js
 *  jquery.rdf.xml.js
 */
/**
 * @fileOverview jQuery RDF/XML parser
 * @author <a href="mailto:jeni@jenitennison.com">Jeni Tennison</a>
 * @copyright (c) 2008,2009 Jeni Tennison
 * @license MIT license (MIT-LICENSE.txt)
 * @version 1.0
 */
/**
 * @exports $ as jQuery
 */
/**
 * @ignore
 */
(function ($) {
  var
    rdfNs = "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
  
    addAttribute = function (parent, namespace, name, value) {
      var doc = parent.ownerDocument,
        a;
      if (namespace !== undefined && namespace !== null) {
        if (doc.createAttributeNS) {
          a = doc.createAttributeNS(namespace, name);
          a.nodeValue = value;
          parent.attributes.setNamedItemNS(a);
        } else {
          a = doc.createNode(2, name, namespace);
          a.nodeValue = value;
          parent.attributes.setNamedItem(a);
        }
      } else {
        a = doc.createAttribute(name);
        a.nodeValue = value;
        parent.attributes.setNamedItem(a);
      }
      return parent;
    },

    createXmlnsAtt = function (parent, namespace, prefix) {
      if (namespace === 'http://www.w3.org/XML/1998/namespace' || namespace === 'http://www.w3.org/2000/xmlns/') {
      } else if (prefix) {
        addAttribute(parent, 'http://www.w3.org/2000/xmlns/', 'xmlns:' + prefix, namespace);
      } else {
        addAttribute(parent, undefined, 'xmlns', namespace);
      }
      return parent;
    },

    createDocument = function (namespace, name) {
      var doc, xmlns = '', prefix, addAttribute = false;
      if (namespace !== undefined && namespace !== null) {
        if (/:/.test(name)) {
          prefix = /([^:]+):/.exec(name)[1];
        }
        addAttribute = true;
      }
      if (document.implementation &&
          document.implementation.createDocument) {
        doc = document.implementation.createDocument(namespace, name, null);
        if (addAttribute) {
          createXmlnsAtt(doc.documentElement, namespace, prefix);
        }
        return doc;
      } else {
        doc = new ActiveXObject("Microsoft.XMLDOM");
        doc.async = "false";
        if (prefix === undefined) {
          xmlns = ' xmlns="' + namespace + '"';
        } else {
          xmlns = ' xmlns:' + prefix + '="' + namespace + '"';
        }
        doc.loadXML('<' + name + xmlns + '/>');
        return doc;
      }
    },

    appendElement = function (parent, namespace, name, indent) {
      var doc = parent.ownerDocument,
        e;
      if (namespace !== undefined && namespace !== null) {
        e = doc.createElementNS ? doc.createElementNS(namespace, name) : doc.createNode(1, name, namespace);
      } else {
        e = doc.createElement(name);
      }
      if (indent !== -1) {
        appendText(parent, '\n');
        if (indent === 0) {
          appendText(parent, '\n');
        } else {
          appendText(parent, '  ');
        }
      }
      parent.appendChild(e);
      return e;
    },

    appendText = function (parent, text) {
      var doc = parent.ownerDocument,
        t;
      t = doc.createTextNode(text);
      parent.appendChild(t);
      return parent;
    },

    appendXML = function (parent, xml) {
      var parser, doc, i, child;
      try {
        doc = new ActiveXObject('Microsoft.XMLDOM');
        doc.async = "false";
        doc.loadXML('<temp>' + xml + '</temp>');
      } catch(e) {
        parser = new DOMParser();
        doc = parser.parseFromString('<temp>' + xml + '</temp>', 'text/xml');
      }
      for (i = 0; i < doc.documentElement.childNodes.length; i += 1) {
        parent.appendChild(doc.documentElement.childNodes[i].cloneNode(true));
      }
      return parent;
    },

    createRdfXml = function (triples, options) {
      var doc = createDocument(rdfNs, 'rdf:RDF'),
        dump = $.rdf.parsers['application/json'].dump(triples),
        namespaces = options.namespaces || {},
        indent = options.indent || false,
        n, s, se, p, pe, i, v,
        m, local, ns, prefix;
      for (n in namespaces) {
        createXmlnsAtt(doc.documentElement, namespaces[n], n);
      }
      for (s in dump) {
        if (dump[s][$.rdf.type.value] !== undefined) {
          m = /(.+[#\/])([^#\/]+)/.exec(dump[s][$.rdf.type.value][0].value);
          ns = m[1];
          local = m[2];
          for (n in namespaces) {
            if (namespaces[n].toString() === ns) {
              prefix = n;
              break;
            }
          }
          se = appendElement(doc.documentElement, ns, prefix + ':' + local, indent ? 0 : -1);
        } else {
          se = appendElement(doc.documentElement, rdfNs, 'rdf:Description', indent ? 0 : -1);
        }
        if (/^_:/.test(s)) {
          addAttribute(se, rdfNs, 'rdf:nodeID', s.substring(2));
        } else {
          addAttribute(se, rdfNs, 'rdf:about', s);
        }
        for (p in dump[s]) {
          if (p !== $.rdf.type.value.toString() || dump[s][p].length > 1) {
            m = /(.+[#\/])([^#\/]+)/.exec(p);
            ns = m[1];
            local = m[2];
            for (n in namespaces) {
              if (namespaces[n].toString() === ns) {
                prefix = n;
                break;
              }
            }
            for (i = (p === $.rdf.type.value.toString() ? 1 : 0); i < dump[s][p].length; i += 1) {
              v = dump[s][p][i];
              pe = appendElement(se, ns, prefix + ':' + local, indent ? 1 : -1);
              if (v.type === 'uri') {
                addAttribute(pe, rdfNs, 'rdf:resource', v.value);
              } else if (v.type === 'literal') {
                if (v.datatype !== undefined) {
                  if (v.datatype === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#XMLLiteral') {
                    addAttribute(pe, rdfNs, 'rdf:parseType', 'Literal');
                    if (indent) {
                      appendText(pe, '\n    ');
                    }
                    appendXML(pe, v.value);
                    if (indent) {
                      appendText(pe, '\n  ');
                    }
                  } else {
                    addAttribute(pe, rdfNs, 'rdf:datatype', v.datatype);
                    appendText(pe, v.value);
                  }
                } else if (v.lang !== undefined) {
                  addAttribute(pe, 'http://www.w3.org/XML/1998/namespace', 'xml:lang', v.lang);
                  appendText(pe, v.value);
                } else {
                  appendText(pe, v.value);
                }
              } else {
                // blank node
                addAttribute(pe, rdfNs, 'rdf:nodeID', v.value.substring(2));
              }
            }
            if (indent) {
              appendText(se, '\n');
            }
          }
        }
      }
      if (indent) {
        appendText(doc.documentElement, '\n\n');
      }
      return doc;
    },

    getDefaultNamespacePrefix = function (namespaceUri) {
      switch (namespaceUri) {
        case 'http://www.w3.org/1999/02/22-rdf-syntax-ns':
          return 'rdf';
        case 'http://www.w3.org/XML/1998/namespace':
          return 'xml';
        case 'http://www.w3.org/2000/xmlns/':
          return 'xmlns';
        default:
          throw ('No default prefix mapped for namespace ' + namespaceUri);
      }
    },

    hasAttributeNS  = function(elem, namespace, name){
      var basename;
      if (elem.hasAttributeNS) {
        return elem.hasAttributeNS(namespace, name);
      } else {
        try {
          basename = /:/.test(name) ? /:(.+)$/.exec(name)[1] : name;
          return elem.attributes.getQualifiedItem(basename, namespace) !== null;
        } catch (e) {
          return elem.getAttribute(getDefaultNamespacePrefix(namespace) + ':' + name) !== null;
        }
      }
    },

    getAttributeNS = function(elem, namespace, name){
      var basename;
      if (elem.getAttributeNS) {
        return elem.getAttributeNS(namespace, name);
      } else {
        try {
          basename = /:/.test(name) ? /:(.+)$/.exec(name)[1] : name;
          return elem.attributes.getQualifiedItem(basename, namespace).nodeValue;
        } catch (e) {
          return elem.getAttribute(getDefaultNamespacePrefix(namespace) + ':' + name);
        }
      }
    },

    getLocalName = function(elem){
      return elem.localName || elem.baseName;
    },

    parseRdfXmlSubject = function (elem, base) {
      var s, subject;
      if (hasAttributeNS(elem, rdfNs, 'about')) {
        s = getAttributeNS(elem, rdfNs, 'about');
        subject = $.rdf.resource('<' + s + '>', { base: base });
      } else if (hasAttributeNS(elem, rdfNs, 'ID')) {
        s = getAttributeNS(elem, rdfNs, 'ID');
        subject = $.rdf.resource('<#' + s + '>', { base: base });
      } else if (hasAttributeNS(elem, rdfNs, 'nodeID')) {
        s = getAttributeNS(elem, rdfNs, 'nodeID');
        subject = $.rdf.blank('_:' + s);
      } else {
        subject = $.rdf.blank('[]');
      }
      return subject;
    },

    parseRdfXmlDescription = function (elem, isDescription, base, lang) {
      var subject, p, property, o, object, reified, lang, i, j, li = 1,
        collection1, collection2, collectionItem, collectionItems = [],
        parseType, serializer, literalOpts = {}, oTriples, triples = [];
      lang = getAttributeNS(elem, 'http://www.w3.org/XML/1998/namespace', 'lang') || lang;
      base = getAttributeNS(elem, 'http://www.w3.org/XML/1998/namespace', 'base') || base;
      if (lang !== null && lang !== undefined && lang !== '') {
        literalOpts = { lang: lang };
      }
      subject = parseRdfXmlSubject(elem, base);
      if (isDescription && (elem.namespaceURI !== rdfNs || getLocalName(elem) !== 'Description')) {
        property = $.rdf.type;
        object = $.rdf.resource('<' + elem.namespaceURI + getLocalName(elem) + '>');
        triples.push($.rdf.triple(subject, property, object));
      }
      for (i = 0; i < elem.attributes.length; i += 1) {
        p = elem.attributes.item(i);
        if (p.namespaceURI !== undefined &&
            p.namespaceURI !== 'http://www.w3.org/2000/xmlns/' &&
            p.namespaceURI !== 'http://www.w3.org/XML/1998/namespace' &&
            p.prefix !== 'xmlns' &&
            p.prefix !== 'xml') {
          if (p.namespaceURI !== rdfNs) {
            property = $.rdf.resource('<' + p.namespaceURI + getLocalName(p) + '>');
            object = $.rdf.literal(literalOpts.lang ? p.nodeValue : '"' + p.nodeValue + '"', literalOpts);
            triples.push($.rdf.triple(subject, property, object));
          } else if (getLocalName(p) === 'type') {
            property = $.rdf.type;
            object = $.rdf.resource('<' + p.nodeValue + '>', { base: base });
            triples.push($.rdf.triple(subject, property, object));
          }
        }
      }
      for (i = 0; i < elem.childNodes.length; i += 1) {
        p = elem.childNodes[i];
        if (p.nodeType === 1) {
          if (p.namespaceURI === rdfNs && getLocalName(p) === 'li') {
            property = $.rdf.resource('<' + rdfNs + '_' + li + '>');
            li += 1;
          } else {
            property = $.rdf.resource('<' + p.namespaceURI + getLocalName(p) + '>');
          }
          lang = getAttributeNS(p, 'http://www.w3.org/XML/1998/namespace', 'lang') || lang;
          if (lang !== null && lang !== undefined && lang !== '') {
            literalOpts = { lang: lang };
          }
          if (hasAttributeNS(p, rdfNs, 'resource')) {
            o = getAttributeNS(p, rdfNs, 'resource');
            object = $.rdf.resource('<' + o + '>', { base: base });
          } else if (hasAttributeNS(p, rdfNs, 'nodeID')) {
            o = getAttributeNS(p, rdfNs, 'nodeID');
            object = $.rdf.blank('_:' + o);
          } else if (hasAttributeNS(p, rdfNs, 'parseType')) {
            parseType = getAttributeNS(p, rdfNs, 'parseType');
            if (parseType === 'Literal') {
              try {
                serializer = new XMLSerializer();
                o = serializer.serializeToString(p.getElementsByTagName('*')[0]);
              } catch (e) {
                o = "";
                for (j = 0; j < p.childNodes.length; j += 1) {
                  o += p.childNodes[j].xml;
                }
              }
              object = $.rdf.literal(o, { datatype: rdfNs + 'XMLLiteral' });
            } else if (parseType === 'Resource') {
              oTriples = parseRdfXmlDescription(p, false, base, lang);
              if (oTriples.length > 0) {
                object = oTriples[oTriples.length - 1].subject;
                triples = triples.concat(oTriples);
              } else {
                object = $.rdf.blank('[]');
              }
            } else if (parseType === 'Collection') {
              if (p.getElementsByTagName('*').length > 0) {
                for (j = 0; j < p.childNodes.length; j += 1) {
                  o = p.childNodes[j];
                  if (o.nodeType === 1) {
                    collectionItems.push(o);
                  }
                }
                collection1 = $.rdf.blank('[]');
                object = collection1;
                for (j = 0; j < collectionItems.length; j += 1) {
                  o = collectionItems[j];
                  oTriples = parseRdfXmlDescription(o, true, base, lang);
                  if (oTriples.length > 0) {
                    collectionItem = oTriples[oTriples.length - 1].subject;
                    triples = triples.concat(oTriples);
                  } else {
                    collectionItem = parseRdfXmlSubject(o);
                  }
                  triples.push($.rdf.triple(collection1, $.rdf.first, collectionItem));
                  if (j === collectionItems.length - 1) {
                    triples.push($.rdf.triple(collection1, $.rdf.rest, $.rdf.nil));
                  } else {
                    collection2 = $.rdf.blank('[]');
                    triples.push($.rdf.triple(collection1, $.rdf.rest, collection2));
                    collection1 = collection2;
                  }
                }
              } else {
                object = $.rdf.nil;
              }
            }
          } else if (hasAttributeNS(p, rdfNs, 'datatype')) {
            o = p.childNodes[0].nodeValue;
            object = $.rdf.literal(o, { datatype: getAttributeNS(p, rdfNs, 'datatype') });
          } else if (p.getElementsByTagName('*').length > 0) {
            for (j = 0; j < p.childNodes.length; j += 1) {
              o = p.childNodes[j];
              if (o.nodeType === 1) {
                oTriples = parseRdfXmlDescription(o, true, base, lang);
                if (oTriples.length > 0) {
                  object = oTriples[oTriples.length - 1].subject;
                  triples = triples.concat(oTriples);
                } else {
                  object = parseRdfXmlSubject(o);
                }
              }
            }
          } else if (p.childNodes.length > 0) {
            o = p.childNodes[0].nodeValue;
            object = $.rdf.literal(literalOpts.lang ? o : '"' + o + '"', literalOpts);
          } else {
            oTriples = parseRdfXmlDescription(p, false, base, lang);
            if (oTriples.length > 0) {
              object = oTriples[oTriples.length - 1].subject;
              triples = triples.concat(oTriples);
            } else {
              object = $.rdf.blank('[]');
            }
          }
          triples.push($.rdf.triple(subject, property, object));
          if (hasAttributeNS(p, rdfNs, 'ID')) {
            reified = $.rdf.resource('<#' + getAttributeNS(p, rdfNs, 'ID') + '>', { base: base });
            triples.push($.rdf.triple(reified, $.rdf.subject, subject));
            triples.push($.rdf.triple(reified, $.rdf.property, property));
            triples.push($.rdf.triple(reified, $.rdf.object, object));
          }
        }
      }
      return triples;
    },

    parseRdfXml = function (doc) {
      var i, lang, d, triples = [];
      if (doc.documentElement.namespaceURI === rdfNs && getLocalName(doc.documentElement) === 'RDF') {
        lang = getAttributeNS(doc.documentElement, 'http://www.w3.org/XML/1998/namespace', 'lang');
        base = getAttributeNS(doc.documentElement, 'http://www.w3.org/XML/1998/namespace', 'base') || $.uri.base();
        triples = $.map(doc.documentElement.childNodes, function (d) {
          if (d.nodeType === 1) {
            return parseRdfXmlDescription(d, true, base, lang);
          } else {
            return null;
          }
        });
        /*
        for (i = 0; i < doc.documentElement.childNodes.length; i += 1) {
          d = doc.documentElement.childNodes[i];
          if (d.nodeType === 1) {
            triples = triples.concat(parseRdfXmlDescription(d, true, base, lang));
          }
        }
        */
      } else {
        triples = parseRdfXmlDescription(doc.documentElement, true);
      }
      return triples;
    };

  $.rdf.parsers['application/rdf+xml'] = {
    parse: function (data) {
      var doc;
      try {
        doc = new ActiveXObject("Microsoft.XMLDOM");
        doc.async = "false";
        doc.loadXML(data);
      } catch(e) {
        var parser = new DOMParser();
        doc = parser.parseFromString(data, 'text/xml');
      }
      return doc;
    },
    serialize: function (data) {
      if (data.xml) {
        return data.xml.replace(/\s+$/,'');
      } else {
        serializer = new XMLSerializer();
        return serializer.serializeToString(data);
      }
    },
    triples: parseRdfXml,
    dump: createRdfXml
  };

})(jQuery);
/*
 * jQuery RDFa @VERSION
 *
 * Copyright (c) 2008,2009 Jeni Tennison
 * Licensed under the MIT (MIT-LICENSE.txt)
 *
 * Depends:
 *  jquery.uri.js
 *  jquery.xmlns.js
 *  jquery.curie.js
 *  jquery.datatype.js
 *  jquery.rdf.js
 */
/**
 * @fileOverview jQuery RDFa processing
 * @author <a href="mailto:jeni@jenitennison.com">Jeni Tennison</a>
 * @copyright (c) 2008,2009 Jeni Tennison
 * @license MIT license (MIT-LICENSE.txt)
 * @version 1.0
 * @requires jquery.uri.js
 * @requires jquery.xmlns.js
 * @requires jquery.curie.js
 * @requires jquery.datatype.js
 * @requires jquery.rdf.js
 */
(function ($) {

  var
    ns = {
      rdf: "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
      xsd: "http://www.w3.org/2001/XMLSchema#",
      xml: 'http://www.w3.org/XML/1998/namespace',
      xmlns: 'http://www.w3.org/2000/xmlns/'
    },

    rdfXMLLiteral = ns.rdf + 'XMLLiteral',

    rdfaCurieDefaults = $.fn.curie.defaults,
    relReserved = [
      'alternate', 'appendix', 'bookmark', 'cite', 'chapter', 'contents', 'copyright',
      'first', 'glossary', 'help', 'icon', 'index', 'last', 'license', 'meta', 'next',
      'p3pv1', 'prev', 'role', 'section', 'stylesheet', 'subsection', 'start', 'top', 'up'
    ],

    attRegex = /\s([^ =]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^ >]+))/g,
    
    ncNameChar = '[-A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\u10000-\uEFFFF\.0-9\u00B7\u0300-\u036F\u203F-\u2040]',
    ncNameStartChar = '[\u0041-\u005A\u0061-\u007A\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u00FF\u0100-\u0131\u0134-\u013E\u0141-\u0148\u014A-\u017E\u0180-\u01C3\u01CD-\u01F0\u01F4-\u01F5\u01FA-\u0217\u0250-\u02A8\u02BB-\u02C1\u0386\u0388-\u038A\u038C\u038E-\u03A1\u03A3-\u03CE\u03D0-\u03D6\u03DA\u03DC\u03DE\u03E0\u03E2-\u03F3\u0401-\u040C\u040E-\u044F\u0451-\u045C\u045E-\u0481\u0490-\u04C4\u04C7-\u04C8\u04CB-\u04CC\u04D0-\u04EB\u04EE-\u04F5\u04F8-\u04F9\u0531-\u0556\u0559\u0561-\u0586\u05D0-\u05EA\u05F0-\u05F2\u0621-\u063A\u0641-\u064A\u0671-\u06B7\u06BA-\u06BE\u06C0-\u06CE\u06D0-\u06D3\u06D5\u06E5-\u06E6\u0905-\u0939\u093D\u0958-\u0961\u0985-\u098C\u098F-\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09DC-\u09DD\u09DF-\u09E1\u09F0-\u09F1\u0A05-\u0A0A\u0A0F-\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32-\u0A33\u0A35-\u0A36\u0A38-\u0A39\u0A59-\u0A5C\u0A5E\u0A72-\u0A74\u0A85-\u0A8B\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2-\u0AB3\u0AB5-\u0AB9\u0ABD\u0AE0\u0B05-\u0B0C\u0B0F-\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32-\u0B33\u0B36-\u0B39\u0B3D\u0B5C-\u0B5D\u0B5F-\u0B61\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99-\u0B9A\u0B9C\u0B9E-\u0B9F\u0BA3-\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB5\u0BB7-\u0BB9\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C33\u0C35-\u0C39\u0C60-\u0C61\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CDE\u0CE0-\u0CE1\u0D05-\u0D0C\u0D0E-\u0D10\u0D12-\u0D28\u0D2A-\u0D39\u0D60-\u0D61\u0E01-\u0E2E\u0E30\u0E32-\u0E33\u0E40-\u0E45\u0E81-\u0E82\u0E84\u0E87-\u0E88\u0E8A\u0E8D\u0E94-\u0E97\u0E99-\u0E9F\u0EA1-\u0EA3\u0EA5\u0EA7\u0EAA-\u0EAB\u0EAD-\u0EAE\u0EB0\u0EB2-\u0EB3\u0EBD\u0EC0-\u0EC4\u0F40-\u0F47\u0F49-\u0F69\u10A0-\u10C5\u10D0-\u10F6\u1100\u1102-\u1103\u1105-\u1107\u1109\u110B-\u110C\u110E-\u1112\u113C\u113E\u1140\u114C\u114E\u1150\u1154-\u1155\u1159\u115F-\u1161\u1163\u1165\u1167\u1169\u116D-\u116E\u1172-\u1173\u1175\u119E\u11A8\u11AB\u11AE-\u11AF\u11B7-\u11B8\u11BA\u11BC-\u11C2\u11EB\u11F0\u11F9\u1E00-\u1E9B\u1EA0-\u1EF9\u1F00-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u2126\u212A-\u212B\u212E\u2180-\u2182\u3041-\u3094\u30A1-\u30FA\u3105-\u312C\uAC00-\uD7A3\u4E00-\u9FA5\u3007\u3021-\u3029_]',
    ncNameRegex = new RegExp('^' + ncNameStartChar + ncNameChar + '*$'),

    docResource = $.rdf.resource('<>'),

    parseEntities = function (string) {
      var result = "", m, entity;
      if (!/&/.test(string)) {
         return string;
      }
      while (string.length > 0) {
        m = /([^&]*)(&([^;]+);)(.*)/g.exec(string);
        if (m === null) {
          result += string;
          break;
        }
        result += m[1];
        entity = m[3];
        string = m[4];
        if (entity.charAt(0) === '#') {
          if (entity.charAt(1) === 'x') {
              result += String.fromCharCode(parseInt(entity.substring(2), 16));
          } else {
              result += String.fromCharCode(parseInt(entity.substring(1), 10));
          }
        } else {
          switch(entity) {
            case 'amp':
              result += '&';
              break;
            case 'nbsp':
              result += String.fromCharCode(160);
              break;
            case 'quot':
              result += '"';
              break;
            case 'apos':
              result += "'";
              break;
            default:
              result += '&' + entity + ';';
          }
        }
      }
      return result;
    },

    getAttributes = function (elem) {
      var i, e, a, tag, name, value, attMap, prefix,
        atts = {},
        nsMap = {};
      e = elem[0];
      nsMap[':length'] = 0;
      if (e.attributes && e.attributes.getNamedItemNS) {
        attMap = e.attributes;
        for (i = 0; i < attMap.length; i += 1) {
          a = attMap[i];
          if (/^xmlns(:(.+))?$/.test(a.nodeName) && a.nodeValue !== '') {
            prefix = /^xmlns(:(.+))?$/.exec(a.nodeName)[2] || '';
            if (ncNameRegex.test(prefix) && (prefix !== 'xml' || a.nodeValue === ns.xml) && (a.nodeValue !== ns.xml || prefix === 'xml') && prefix !== 'xmlns' && a.nodeValue !== ns.xmlns) {
              nsMap[prefix] = $.uri(a.nodeValue);
              nsMap[':length'] += 1;
            }
//          } else if (/rel|rev|lang|xml:lang/.test(a.nodeName)) {
//            atts[a.nodeName] = a.nodeValue === '' ? undefined : a.nodeValue;
          } else if (/rel|rev|lang|xml:lang|about|href|src|resource|property|typeof|content|datatype/.test(a.nodeName)) {
            atts[a.nodeName] = a.nodeValue === null ? undefined : a.nodeValue;
          }
        }
      } else {
        tag = /<[^>]+>/.exec(e.outerHTML);
        a = attRegex.exec(tag);
        while (a !== null) {
          name = a[1];
          value = a[2] || a[3] || a[4];
          if (/^xmlns/.test(name) && name !== 'xmlns:' && value !== '') {
            prefix = /^xmlns(:(.+))?$/.exec(name)[2] || '';
            if (ncNameRegex.test(prefix) && (prefix !== 'xml' || a.nodeValue === ns.xml) && (a.nodeValue !== ns.xml || prefix === 'xml') && prefix !== 'xmlns' && a.nodeValue !== ns.xmlns) {
              nsMap[prefix] = $.uri(value);
              nsMap[':length'] += 1;
            }
          } else if (/about|href|src|resource|property|typeof|content|datatype|rel|rev|lang|xml:lang/.test(name)) {
            atts[name] = parseEntities(value);
          }
          a = attRegex.exec(tag);
        }
        attRegex.lastIndex = 0;
      }
      return { atts: atts, namespaces: nsMap };
    },

    getAttribute = function (elem, attr) {
      var val = elem[0].getAttribute(attr);
//      if (attr === 'rev' || attr === 'rel' || attr === 'lang' || attr === 'xml:lang') {
//        val = val === '' ? undefined : val;
//      }
      return val === null ? undefined : val;
    },

    resourceFromUri = function (uri) {
      return $.rdf.resource(uri);
    },

    resourceFromCurie = function (curie, elem, noblanks, options) {
      if (curie.substring(0, 2) === '_:') {
        if (noblanks) {
          return undefined;
        }
        return $.rdf.blank(curie);
      } else {
        try {
          return resourceFromUri($.curie(curie, options));
        } catch (e) {
          return undefined;
        }
      }
    },

    resourceFromSafeCurie = function (safeCurie, elem, options) {
      var m = /^\[(.*)\]$/.exec(safeCurie),
        base = options.base || elem.base();
      return m ? resourceFromCurie(m[1], elem, false, options) : resourceFromUri($.uri(safeCurie, base));
    },

    resourcesFromCuries = function (curies, elem, noblanks, options) {
      var i, resource, resources = [];
      curies = curies && curies.split ? curies.split(/[ \t\n\r\x0C]+/g) : [];
      for (i = 0; i < curies.length; i += 1) {
        if (curies[i] !== '') {
          resource = resourceFromCurie(curies[i], elem, noblanks, options);
          if (resource !== undefined) {
            resources.push(resource);
          }
        }
      }
      return resources;
    },

    removeCurie = function (curies, resource, options) {
      var i, r, newCuries = [];
      resource = resource.type === 'uri' ? resource : $.rdf.resource(resource, options);
      curies = curies && curies.split ? curies.split(/\s+/) : [];
      for (i = 0; i < curies.length; i += 1) {
        if (curies[i] !== '') {
          r = resourceFromCurie(curies[i], null, false, options);
          if (r !== resource) {
            newCuries.push(curies[i]);
          }
        }
      }
      return newCuries.reverse().join(' ');
    },

    getObjectResource = function (elem, context, relation) {
      var r, resource, atts, curieOptions;
      context = context || {};
      atts = context.atts || getAttributes(elem).atts;
      r = relation === undefined ? atts.rel !== undefined || atts.rev !== undefined : relation;
      resource = atts.resource;
      resource = resource === undefined ? atts.href : resource;
      if (resource === undefined) {
        resource = r ? $.rdf.blank('[]') : resource;
      } else {
        curieOptions = context.curieOptions || $.extend({}, rdfaCurieDefaults, { namespaces: elem.xmlns() });
        resource = resourceFromSafeCurie(resource, elem, curieOptions);
      }
      return resource;
    },

    getSubject = function (elem, context, relation) {
      var r, atts, curieOptions, subject, skip = false;
      context = context || {};
      atts = context.atts || getAttributes(elem).atts;
      curieOptions = context.curieOptions || $.extend({}, rdfaCurieDefaults, { namespaces: elem.xmlns(), base: elem.base() });
      r = relation === undefined ? atts.rel !== undefined || atts.rev !== undefined : relation;
      if (atts.about !== undefined) {
        subject = resourceFromSafeCurie(atts.about, elem, curieOptions);
      }
      if (subject === undefined && atts.src !== undefined) {
        subject = resourceFromSafeCurie(atts.src, elem, curieOptions);
      }
      if (!r && subject === undefined && atts.resource !== undefined) {
        subject = resourceFromSafeCurie(atts.resource, elem, curieOptions);
      }
      if (!r && subject === undefined && atts.href !== undefined) {
        subject = resourceFromSafeCurie(atts.href, elem, curieOptions);
      }
      if (subject === undefined) {
        if (/^(head|body)$/i.test(elem[0].nodeName)) {
          subject = docResource;
        } else if (atts['typeof'] !== undefined) {
          subject = $.rdf.blank('[]');
        } else if (elem[0].parentNode.nodeType === 1) {
          subject = context.object || getObjectResource(elem.parent()) || getSubject(elem.parent()).subject;
          skip = !r && atts.property === undefined;
        } else {
          subject = docResource;
        }
      }
      return { subject: subject, skip: skip };
    },

    getLang = function (elem, context) {
      var lang;
      context = context || {};
      if (context.atts) {
        lang = context.atts.lang;
        lang = lang || context.atts['xml:lang'];
      } else {
        lang = elem[0].getAttribute('lang');
        try {
          lang = (lang === null || lang === '') ? elem[0].getAttribute('xml:lang') : lang;
        } catch (e) {
        }
        lang = (lang === null || lang === '') ? undefined : lang;
      }
      if (lang === undefined) {
        if (context.lang) {
          lang = context.lang;
        } else {
          if (elem[0].parentNode.nodeType === 1) {
            lang = getLang(elem.parent());
          }
        }
      }
      return lang;
    },

    entity = function (c) {
      switch (c) {
      case '<':
        return '&lt;';
      case '"':
        return '&quot;';
      case '&':
        return '&amp;';
      }
    },

    serialize = function (elem, ignoreNs) {
      var i, string = '', atts, a, name, ns, tag;
      elem.contents().each(function () {
        var j = $(this),
          e = j[0];
        if (e.nodeType === 1) { // tests whether the node is an element
          name = e.nodeName.toLowerCase();
          string += '<' + name;
          if (e.outerHTML) {
            tag = /<[^>]+>/.exec(e.outerHTML);
            a = attRegex.exec(tag);
            while (a !== null) {
              if (!/^jQuery/.test(a[1])) {
                string += ' ' + a[1] + '=';
                string += a[2] ? a[3] : '"' + a[1] + '"';
              }
              a = attRegex.exec(tag);
            }
            attRegex.lastIndex = 0;
          } else {
            atts = e.attributes;
            for (i = 0; i < atts.length; i += 1) {
              a = atts.item(i);
              string += ' ' + a.nodeName + '="';
              string += a.nodeValue.replace(/[<"&]/g, entity);
              string += '"';
            }
          }
          if (!ignoreNs) {
            ns = j.xmlns('');
            if (ns !== undefined && j.attr('xmlns') === undefined) {
              string += ' xmlns="' + ns + '"';
            }
          }
          string += '>';
          string += serialize(j, true);
          string += '</' + name + '>';
        } else if (e.nodeType === 8) { // tests whether the node is a comment
          string += '<!--';
          string += e.nodeValue;
          string += '-->';
        } else {
          string += e.nodeValue;
        }
      });
      return string;
    },

    rdfa = function (context) {
      var i, subject, resource, lang, datatype, content, text,
        types, object, triple, parent,
        properties, rels, revs,
        forward, backward,
        triples = [],
        callback, relCurieOptions,
        attsAndNs, atts, namespaces, ns,
        children = this.children();
      context = context || {};
      forward = context.forward || [];
      backward = context.backward || [];
      callback = context.callback || function () { return this; };
      attsAndNs = getAttributes(this);
      atts = attsAndNs.atts;
      context.atts = atts;
      namespaces = context.namespaces || this.xmlns();
      if (attsAndNs.namespaces[':length'] > 0) {
        namespaces = $.extend({}, namespaces);
        for (ns in attsAndNs.namespaces) {
          if (ns !== ':length') {
            namespaces[ns] = attsAndNs.namespaces[ns];
          }
        }
      }
      context.curieOptions = $.extend({}, rdfaCurieDefaults, { reserved: [], namespaces: namespaces, base: this.base() });
      relCurieOptions = $.extend({}, context.curieOptions, { reserved: relReserved });
      subject = getSubject(this, context);
      lang = getLang(this, context);
      if (subject.skip) {
        rels = context.forward;
        revs = context.backward;
        subject = context.subject;
        resource = context.object;
      } else {
        subject = subject.subject;
        if (forward.length > 0 || backward.length > 0) {
          parent = context.subject || getSubject(this.parent()).subject;
          for (i = 0; i < forward.length; i += 1) {
            triple = $.rdf.triple(parent, forward[i], subject, { source: this[0] });
            triple = callback.call(triple, this.get(0), triple);
            if (triple !== undefined && triple !== null) {
              triples = triples.concat(triple);
            }
          }
          for (i = 0; i < backward.length; i += 1) {
            triple = $.rdf.triple(subject, backward[i], parent, { source: this[0] });
            triple = callback.call(triple, this.get(0), triple);
            if (triple !== undefined && triple !== null) {
              triples = triples.concat(triple);
            }
          }
        }
        resource = getObjectResource(this, context);
        types = resourcesFromCuries(atts['typeof'], this, false, context.curieOptions);
        for (i = 0; i < types.length; i += 1) {
          triple = $.rdf.triple(subject, $.rdf.type, types[i], { source: this[0] });
          triple = callback.call(triple, this.get(0), triple);
          if (triple !== undefined && triple !== null) {
            triples = triples.concat(triple);
          }
        }
        properties = resourcesFromCuries(atts.property, this, true, context.curieOptions);
        if (properties.length > 0) {
          datatype = atts.datatype;
          content = atts.content;
          text = this.text().replace(/"/g, '\\"');
          if (datatype !== undefined && datatype !== '') {
            datatype = $.curie(datatype, context.curieOptions);
            if (datatype.toString() === rdfXMLLiteral) {
              object = $.rdf.literal(serialize(this), { datatype: rdfXMLLiteral });
            } else if (content !== undefined) {
              object = $.rdf.literal(content, { datatype: datatype });
            } else {
              object = $.rdf.literal(text, { datatype: datatype });
            }
          } else if (content !== undefined) {
            if (lang === undefined) {
              object = $.rdf.literal('"' + content + '"');
            } else {
              object = $.rdf.literal(content, { lang: lang });
            }
          } else if (children.length === 0 ||
                     datatype === '') {
            lang = getLang(this, context);
            if (lang === undefined) {
              object = $.rdf.literal('"' + text + '"');
            } else {
              object = $.rdf.literal(text, { lang: lang });
            }
          } else {
            object = $.rdf.literal(serialize(this), { datatype: rdfXMLLiteral });
          }
          for (i = 0; i < properties.length; i += 1) {
            triple = $.rdf.triple(subject, properties[i], object, { source: this[0] });
            triple = callback.call(triple, this.get(0), triple);
            if (triple !== undefined && triple !== null) {
              triples = triples.concat(triple);
            }
          }
        }
        rels = resourcesFromCuries(atts.rel, this, true, relCurieOptions);
        revs = resourcesFromCuries(atts.rev, this, true, relCurieOptions);
        if (atts.resource !== undefined || atts.href !== undefined) {
          // make the triples immediately
          if (rels !== undefined) {
            for (i = 0; i < rels.length; i += 1) {
              triple = $.rdf.triple(subject, rels[i], resource, { source: this[0] });
              triple = callback.call(triple, this.get(0), triple);
              if (triple !== undefined && triple !== null) {
                triples = triples.concat(triple);
              }
            }
          }
          rels = [];
          if (revs !== undefined) {
            for (i = 0; i < revs.length; i += 1) {
              triple = $.rdf.triple(resource, revs[i], subject, { source: this[0] });
              triple = callback.call(triple, this.get(0), triple);
              if (triple !== undefined && triple !== null) {
                triples = triples.concat(triple);
              }
            }
          }
          revs = [];
        }
      }
      children.each(function () {
        triples = triples.concat(rdfa.call($(this), { forward: rels, backward: revs, subject: subject, object: resource || subject, lang: lang, namespaces: namespaces, callback: callback }));
      });
      return triples;
    },

    gleaner = function (options) {
      var type, atts;
      if (options && options.about !== undefined) {
        atts = getAttributes(this).atts;
        if (options.about === null) {
          return atts.property !== undefined ||
                 atts.rel !== undefined ||
                 atts.rev !== undefined ||
                 atts['typeof'] !== undefined;
        } else {
          return getSubject(this, {atts: atts}).subject.value === options.about;
        }
      } else if (options && options.type !== undefined) {
        type = getAttribute(this, 'typeof');
        if (type !== undefined) {
          return options.type === null ? true : this.curie(type) === options.type;
        }
        return false;
      } else {
        return rdfa.call(this, options);
      }
    },

    nsCounter = 1,

    createCurieAttr = function (elem, attr, uri) {
      var m, curie, value;
      try {
        curie = elem.createCurie(uri);
      } catch (e) {
        if (uri.toString() === rdfXMLLiteral) {
          elem.attr('xmlns:rdf', ns.rdf);
          curie = 'rdf:XMLLiteral';
        } else {
          m = /^(.+[\/#])([^#]+)$/.exec(uri);
          elem.attr('xmlns:ns' + nsCounter, m[1]);
          curie = 'ns' + nsCounter + ':' + m[2];
          nsCounter += 1;
        }
      }
      value = getAttribute(elem, attr);
      if (value !== undefined) {
        if ($.inArray(curie, value.split(/\s+/)) === -1) {
          elem.attr(attr, value + ' ' + curie);
        }
      } else {
        elem.attr(attr, curie);
      }
    },

    createResourceAttr = function (elem, attr, resource) {
      var ref;
      if (resource.type === 'bnode') {
        ref = '[_:' + resource.id + ']';
      } else {
        ref = $(elem).base().relative(resource.value);
      }
      elem.attr(attr, ref);
    },

    createSubjectAttr = function (elem, subject) {
      var s = getSubject(elem).subject;
      if (subject !== s) {
        createResourceAttr(elem, 'about', subject);
      }
      elem.removeData('rdfa.subject');
    },

    createObjectAttr = function (elem, object) {
      var o = getObjectResource(elem);
      if (object !== o) {
        createResourceAttr(elem, 'resource', object);
      }
      elem.removeData('rdfa.objectResource');
    },

    resetLang = function (elem, lang) {
      elem.wrapInner('<span></span>')
        .children('span')
        .attr('lang', lang);
      return elem;
    },

    addRDFa = function (triple) {
      var hasContent, hasRelation, hasRDFa, overridableObject, span,
        subject, sameSubject,
        object, sameObject,
        lang, content,
        i, atts,
        ns = this.xmlns();
      span = this;
      atts = getAttributes(this).atts;
      if (typeof triple === 'string') {
        triple = $.rdf.triple(triple, { namespaces: ns, base: this.base() });
      } else if (triple.rdfquery) {
        addRDFa.call(this, triple.sources().get(0));
        return this;
      } else if (triple.length) {
        for (i = 0; i < triple.length; i += 1) {
          addRDFa.call(this, triple[i]);
        }
        return this;
      }
      hasRelation = atts.rel !== undefined || atts.rev !== undefined;
      hasRDFa = hasRelation || atts.property !== undefined || atts['typeof'] !== undefined;
      if (triple.object.type !== 'literal') {
        subject = getSubject(this, {atts: atts}, true).subject;
        object = getObjectResource(this, {atts: atts}, true);
        overridableObject = !hasRDFa && atts.resource === undefined;
        sameSubject = subject === triple.subject;
        sameObject = object === triple.object;
        if (triple.property === $.rdf.type) {
          if (sameSubject) {
            createCurieAttr(this, 'typeof', triple.object.value);
          } else if (hasRDFa) {
            span = this.wrapInner('<span />').children('span');
            createCurieAttr(span, 'typeof', triple.object.value);
            if (object !== triple.subject) {
              createSubjectAttr(span, triple.subject);
            }
          } else {
            createCurieAttr(this, 'typeof', triple.object.value);
            createSubjectAttr(this, triple.subject);
          }
        } else if (sameSubject) {
          // use a rel
          if (sameObject) {
            createCurieAttr(this, 'rel', triple.property.value);
          } else if (overridableObject || !hasRDFa) {
            createCurieAttr(this, 'rel', triple.property.value);
            createObjectAttr(this, triple.object);
          } else {
            span = this.wrap('<span />').parent();
            createCurieAttr(span, 'rev', triple.property.value);
            createSubjectAttr(span, triple.object);
          }
        } else if (subject === triple.object) {
          if (object === triple.subject) {
            // use a rev
            createCurieAttr(this, 'rev', triple.property.value);
          } else if (overridableObject || !hasRDFa) {
            createCurieAttr(this, 'rev', triple.property.value);
            createObjectAttr(this, triple.subject);
          } else {
            // wrap in a span with a rel
            span = this.wrap('<span />').parent();
            createCurieAttr(span, 'rel', triple.property.value);
            createSubjectAttr(span, triple.subject);
          }
        } else if (sameObject) {
          if (hasRDFa) {
            // use a rev on a nested span
            span = this.wrapInner('<span />').children('span');
            createCurieAttr(span, 'rev', triple.property.value);
            createObjectAttr(span, triple.subject);
            span = span.wrapInner('<span />').children('span');
            createSubjectAttr(span, triple.object);
            span = this;
          } else {
            createSubjectAttr(this, triple.subject);
            createCurieAttr(this, 'rel', triple.property.value);
          }
        } else if (object === triple.subject) {
          if (hasRDFa) {
            // wrap the contents in a span and use a rel
            span = this.wrapInner('<span />').children('span');
            createCurieAttr(span, 'rel', this.property.value);
            createObjectAttr(span, triple.object);
            span = span.wrapInner('<span />').children('span');
            createSubjectAttr(span, object);
            span = this;
          } else {
            // use a rev on this element
            createSubjectAttr(this, triple.object);
            createCurieAttr(this, 'rev', triple.property.value);
          }
        } else if (hasRDFa) {
          span = this.wrapInner('<span />').children('span');
          createCurieAttr(span, 'rel', triple.property.value);
          createSubjectAttr(span, triple.subject);
          createObjectAttr(span, triple.object);
          if (span.children('*').length > 0) {
            span = this.wrapInner('<span />').children('span');
            createSubjectAttr(span, subject);
          }
          span = this;
        } else {
          createCurieAttr(span, 'rel', triple.property.value);
          createSubjectAttr(this, triple.subject);
          createObjectAttr(this, triple.object);
          if (this.children('*').length > 0) {
            span = this.wrapInner('<span />').children('span');
            createSubjectAttr(span, subject);
            span = this;
          }
        }
      } else {
        subject = getSubject(this, {atts: atts}).subject;
        object = getObjectResource(this, {atts: atts});
        sameSubject = subject === triple.subject;
        hasContent = this.text() !== triple.object.value;
        if (atts.property !== undefined) {
          content = atts.content;
          sameObject = content !== undefined ? content === triple.object.value : !hasContent;
          if (sameSubject && sameObject) {
            createCurieAttr(this, 'property', triple.property.value);
          } else {
            span = this.wrapInner('<span />').children('span');
            return addRDFa.call(span, triple);
          }
        } else {
          if (object === triple.subject) {
            span = this.wrapInner('<span />').children('span');
            return addRDFa.call(span, triple);
          }
          createCurieAttr(this, 'property', triple.property.value);
          createSubjectAttr(this, triple.subject);
          if (hasContent) {
            if (triple.object.datatype && triple.object.datatype.toString() === rdfXMLLiteral) {
              this.html(triple.object.value);
            } else {
              this.attr('content', triple.object.value);
            }
          }
          lang = getLang(this);
          if (triple.object.lang) {
            if (lang !== triple.object.lang) {
              this.attr('lang', triple.object.lang);
              if (hasContent) {
                resetLang(this, lang);
              }
            }
          } else if (triple.object.datatype) {
            createCurieAttr(this, 'datatype', triple.object.datatype);
          } else {
            // the empty datatype ensures that any child elements that might be added won't mess up this triple
            if (!hasContent) {
              this.attr('datatype', '');
            }
            // the empty lang ensures that a language won't be assigned to the literal
            if (lang !== undefined) {
              this.attr('lang', '');
              if (hasContent) {
                resetLang(this, lang);
              }
            }
          }
        }
      }
      this.parents().andSelf().trigger("rdfChange");
      return span;
    },

    removeRDFa = function (what) {
      var span, atts, property, rel, rev, type,
        ns = this.xmlns();
      atts = getAttributes(this).atts;
      if (what.length) {
        for (i = 0; i < what.length; i += 1) {
          removeRDFa.call(this, what[i]);
        }
        return this;
      }
      hasRelation = atts.rel !== undefined || atts.rev !== undefined;
      hasRDFa = hasRelation || atts.property !== undefined || atts['typeof'] !== undefined;
      if (hasRDFa) {
        if (what.property !== undefined) {
          if (atts.property !== undefined) {
            property = removeCurie(atts.property, what.property, { namespaces: ns });
            if (property === '') {
              this.removeAttr('property');
            } else {
              this.attr('property', property);
            }
          }
          if (atts.rel !== undefined) {
            rel = removeCurie(atts.rel, what.property, { namespaces: ns });
            if (rel === '') {
              this.removeAttr('rel');
            } else {
              this.attr('rel', rel);
            }
          }
          if (atts.rev !== undefined) {
            rev = removeCurie(atts.rev, what.property, { namespaces: ns });
            if (rev === '') {
              this.removeAttr('rev');
            } else {
              this.attr('rev', rev);
            }
          }
        }
        if (what.type !== undefined) {
          if (atts['typeof'] !== undefined) {
            type = removeCurie(atts['typeof'], what.type, { namespaces: ns });
            if (type === '') {
              this.removeAttr('typeof');
            } else {
              this.attr('typeof', type);
            }
          }
        }
        if (atts.property === this.attr('property') && atts.rel === this.attr('rel') && atts.rev === this.attr('rev') && atts['typeof'] === this.attr('typeof')) {
          return removeRDFa.call(this.parent(), what);
        }
      }
      this.parents().andSelf().trigger("rdfChange");
      return this;
    };

  /**
   * Creates a {@link jQuery.rdf} object containing the RDF triples parsed from the RDFa found in the current jQuery selection or adds the specified triple as RDFa markup on each member of the current jQuery selection. To create an {@link jQuery.rdf} object, you will usually want to use {@link jQuery#rdf} instead, as this may perform other useful processing (such as of microformats used within the page).
   * @methodOf jQuery#
   * @name jQuery#rdfa
   * @param {jQuery.rdf.triple} [triple] The RDF triple to be added to each item in the jQuery selection.
   * @returns {jQuery.rdf}
   * @example
   * // Extract RDFa markup from all span elements contained inside #main
   * rdf = $('#main > span').rdfa();
   * @example
   * // Add RDFa markup to a particular element
   *  var span = $('#main > p > span');
   *  span.rdfa('&lt;> dc:date "2008-10-19"^^xsd:date .');
   */
  $.fn.rdfa = function (triple) {
    if (triple === undefined) {
      var triples = $.map($(this), function (elem) {
        return rdfa.call($(elem));
      });
      return $.rdf({ triples: triples });
    } else {
      $(this).each(function () {
        addRDFa.call($(this), triple);
      });
      return this;
    }
  };

  /**
   * Removes the specified RDFa markup from each of the items in the current jQuery selection. The input parameter can be either an object or an array of objects. The objects can either have a <code>type</code> property, in which case the specified type is removed from the RDFa provided on the selected elements, or a <code>property</code> property, in which case the specified property is removed from the RDFa provided on the selected elements.
   * @methodOf jQuery#
   * @name jQuery#removeRdfa
   * @param {Object|Object[]} triple The RDFa markup items to be removed
   * from the items in the jQuery selection.
   * @returns {jQuery} The original jQuery object.
   * @example 
   * // To remove a property resource or relation from an element 
   * $('#main > p > a').removeRdfa({ property: "dc:creator" });
   * @example
   * // To remove a type from an element
   * $('#main >p > a').removeRdfa({ type: "foaf:Person" });
   * @example
   * // To remove multiple triples from an element
   * $('#main > p > a').removeRdfa([{ property: "foaf:depicts" }, { property: "dc:creator" }]);
   */
  $.fn.removeRdfa = function (triple) {
    $(this).each(function () {
      removeRDFa.call($(this), triple);
    });
    return this;
  };

  $.rdf.gleaners.push(gleaner);

})(jQuery);
/*
 * jQuery RDF Rules @VERSION
 * 
 * Copyright (c) 2008 Jeni Tennison
 * Licensed under the MIT (MIT-LICENSE.txt)
 *
 * Depends:
 *  jquery.uri.js
 *  jquery.xmlns.js
 *  jquery.datatype.js
 *  jquery.curie.js
 *  jquery.rdf.js
 */
/**
 * @fileOverview jQuery RDF Rules
 * @author <a href="mailto:jeni@jenitennison.com">Jeni Tennison</a>
 * @copyright (c) 2008,2009 Jeni Tennison
 * @license MIT license (MIT-LICENSE.txt)
 * @version 1.0
 */
/**
 * @exports $ as jQuery
 */
/**
 * @ignore
 */
(function ($) {

  var
    blankNodeNum = 1;

  /**
   * <p>Creates a new jQuery.rdf.ruleset object. This should be invoked as a method rather than constructed using new.</p>
   * @class A jQuery.rdf.ruleset object represents a set of {@link jQuery.rdf.rule}s that can be run over a databank.
   * @param {jQuery.rdf.rule[]} [rules=[]] An array of rules with which the ruleset is initialised.
   * @param {Object} [options] Initialisation options for the ruleset.
   * @param {Object} [options.namespaces] An object representing a set of namespace bindings which are stored and used whenever a CURIE is used within a rule.
   * @param {String|jQuery.uri} [options.base] The base URI used to interpret any relative URIs used within the rules.
   * @returns {jQuery.rdf.ruleset}
   * @example rules = jQuery.rdf.ruleset();
   * @see jQuery.rdf.rule
   */
  $.rdf.ruleset = function (rules, options) {
    return new $.rdf.ruleset.fn.init(rules, options);
  };

  $.rdf.ruleset.fn = $.rdf.ruleset.prototype = {
    init: function (rules, options) {
      var i,
        opts = $.extend({}, $.rdf.ruleset.defaults, options);
      rules = rules || [];
      this.baseURI = opts.base;
      this.namespaces = $.extend({}, opts.namespaces);
      this.rules = [];
      for (i = 0; i < rules.length; i += 1) {
        this.add.apply(this, rules[i]);
      }
      return this;
    },
    
    /**
     * Sets or returns the base URI of the {@link jQuery.rdf.ruleset}.
     * @param {String|jQuery.uri} [base]
     * @returns A {@link jQuery.uri} if no base URI is specified, otherwise returns this {@link jQuery.rdf.ruleset} object.
     * @example 
     * rules = $.rdf.ruleset()
     *   .base('http://www.example.org/');
     */
    base: function (uri) {
      if (uri === undefined) {
        return this.baseURI;
      } else {
        this.baseURI = uri;
        return this;
      }
    },
    
    /**
     * Sets or returns a namespace binding on the {@link jQuery.rdf.ruleset}.
     * @param {String} [prefix]
     * @param {String} [namespace]
     * @returns {Object|jQuery.uri|jQuery.rdf} If no prefix or namespace is specified, returns an object providing all namespace bindings on the {@link jQuery.rdf.ruleset}. If a prefix is specified without a namespace, returns the {@link jQuery.uri} associated with that prefix. Otherwise returns this {@link jQuery.rdf} object after setting the namespace binding.
     */
    prefix: function (prefix, uri) {
      if (prefix === undefined) {
        return this.namespaces;
      } else if (uri === undefined) {
        return this.namespaces[prefix];
      } else {
        this.namespaces[prefix] = uri;
        return this;
      }
    },
    
    /**
     * Returns the number of rules in this ruleset.
     * @returns {Integer}
     */
    size: function () {
      return this.rules.length;
    },
    
    /**
     * Adds a rule or set of rules to this ruleset.
     * @param {String|Array|Function|jQuery.rdf.pattern|jQuery.rdf.rule|jQuery.rdf.ruleset} lhs A {@link jQuery.rdf.rule} will be added directly. If a {@link jQuery.rdf.ruleset} is provided then all its rules will be added to this one. Otherwise, specifies the left hand side of the rule to be added, as in {@link jQuery.rdf.rule}.
     * @param {String|Function|jQuery.rdf.pattern} rhs The right hand side of the rule to be added.
     * @returns {jQuery.rdf.ruleset} Returns this {@link jQuery.rdf.ruleset}
     * @see jQuery.rdf.rule
     * @example
     * rules = $.rdf.ruleset()
     *   .prefix('foaf', ns.foaf)
     *   .add('?person a foaf:Person', '?person a foaf:Agent');
     */
    add: function (lhs, rhs) {
      var rule;
      if (rhs === undefined && lhs.rules) {
        this.rules = this.rules.concat(lhs.rules);
      } else {
        if (rhs === undefined && lhs.lhs) {
          rule = lhs;
        } else {
          rule = $.rdf.rule(lhs, rhs, { namespaces: this.prefix(), base: this.base() });
        }
        if ($.inArray(rule, this.rules) === -1) {
          this.rules.push(rule);
        }
      }
      return this;
    },
    
    /**
     * Runs the rules held in this ruleset on the data passed as the first argument.
     * @param {jQuery.rdf.databank} data A databank containing data to be reasoned over and added to.
     * @param {Object} [options]
     * @param {Integer} [options.limit=50] The rules in this ruleset are generally run over the {@link jQuery.rdf.databank} until it stops growing. In some situations, notably when creating blank nodes, this can lead to an infinite loop. The limit option indicates the maximum number of times the ruleset will be run before halting.
     * @returns {jQuery.rdf.ruleset} Returns this ruleset.
     * @example
     * rules = $.rdf.ruleset()
     *   .prefix('foaf', ns.foaf)
     *   .add('?person a foaf:Person', '?person a foaf:Agent')
     *   .run(data);
     * @see jQuery.rdf#reason
     * @see jQuery.rdf.databank#reason
     */
    run: function (data, options) {
      var i, r, ntriples,
        opts = $.extend({ limit: 50 }, options),
        limit = opts.limit;
      do {
        ntriples = data.size();
        for (i = 0; i < this.rules.length; i += 1) {
          r = this.rules[i];
          r.run(data);
        }
        limit -= 1;
      } while (data.size() > ntriples && limit > 0);
      return this;
    }
  };
  
  $.rdf.ruleset.fn.init.prototype = $.rdf.ruleset.fn;
  
  $.rdf.ruleset.defaults = {
    base: $.uri.base(),
    namespaces: {}
  };

/* Rules */

  /**
   * <p>Creates a new jQuery.rdf.rule object. This should be invoked as a method rather than constructed using new.</p>
   * @class A jQuery.rdf.rule object represents a rule that can be run over a {@link jQuery.rdf.databank}.
   * @param {Object[]} lhs The left-hand side of the rule. This can be an array containing multiple conditions, or a single condition on its own. Each condition is one of:
   * <ul>
   *   <li>A {@link jQuery.rdf.pattern} or a string which is interpreted as a {@link jQuery.rdf.pattern}, which is used to match triples as with the {@link jQuery.rdf#where} method.</li>
   *   <li>A function which must return true for the rule to be satisfied. The arguments for the function are as described in the documentation for {@link jQuery.rdf#filter}.</li>
   *   <li>An array of two items: a variable name and either a regular expression or a value that it matches against (as used in the two arguments to {@link jQuery.rdf#filter}).</li>
   * </ul>
   * @param {Function|String[]} rhs The right-hand side of the rule. This can be an array of strings which are interpreted as patterns and used to create new triples when the rule is fired. If the patterns contain references to blank nodes, new blank nodes are created each time the rule is fired. Alternatively, it can be a function which is executed when the rule is fired. The function needs to have the same signature as that used for {@link jQuery.rdf#map}.
   * @param {Object} [options] Initialisation options for the rules.
   * @param {Object} [options.namespaces] An object representing a set of namespace bindings which are stored and used whenever a CURIE is used within the left or right-hand sides of the rule.
   * @param {String|jQuery.uri} [options.base] The base URI used to interpret any relative URIs used within the rule.
   * @returns {jQuery.rdf.rule}
   * @example $.rdf.rule('?person a foaf:Person', '?person a foaf:Agent', { namespaces: ns });
   * @example
   * var rule = $.rdf.rule(
   *   ['?person a vcard:VCard',
   *    '?person vcard:fn ?name'],
   *   ['?person a foaf:Person',
   *    '?person foaf:name ?name'],
   *   { namespaces: ns }
   * );
   * @example
   * var rule = $.rdf.rule(
   *   ['?person a foaf:Person',
   *    '?person foaf:firstName ?fn'],
   *   ['?person a vcard:VCard',
   *    '?person vcard:n _:name',
   *    '_:name a vcard:Name', 
   *    '_:name vcard:given-name ?fn'],
   *   { namespaces: ns }
   * );
   * @example
   * var rule = $.rdf.rule(
   *   ['?person foaf:name ?name', 
   *    ['name', /^J.+/]], 
   *  function () { name = this.name }, 
   *  { namespaces: ns });
   * @see jQuery.rdf.rule
   */
  $.rdf.rule = function (lhs, rhs, options) {
    return new $.rdf.rule.fn.init(lhs, rhs, options);
  };

  $.rdf.rule.fn = $.rdf.rule.prototype = {
    init: function (lhs, rhs, options) {
      var opts = $.extend({}, $.rdf.rule.defaults, options),
        lhsWildcards = [], rhsBlanks = false;
      if (typeof lhs === 'string') {
        lhs = [lhs];
      }
      if (typeof rhs === 'string') {
        rhs = [rhs];
      }
      this.lhs = $.map(lhs, function (p) {
        if ($.isArray(p)) {
          return [p];
        } else if ($.isFunction(p)) {
          return p;
        } else {
          p = $.rdf.pattern(p, opts);
          if (typeof p.subject === 'string') {
            lhsWildcards.push(p.subject);
          }
          if (typeof p.property === 'string') {
            lhsWildcards.push(p.property);
          }
          if (typeof p.object === 'string') {
            lhsWildcards.push(p.object);
          }
          return p;
        }
      });
      lhsWildcards = $.unique(lhsWildcards);
      if ($.isFunction(rhs)) {
        this.rhs = rhs;
      } else {
        this.rhs = $.map(rhs, function (p) {
          p = $.rdf.pattern(p, opts);
          if ((typeof p.subject === 'string' && $.inArray(p.subject, lhsWildcards) === -1) ||
              (typeof p.property === 'string' && $.inArray(p.property, lhsWildcards) === -1) ||
              (typeof p.object === 'string' && $.inArray(p.object, lhsWildcards) === -1)) {
            throw "Bad Rule: Right-hand side of the rule contains a reference to an unbound wildcard";
          } else if (p.subject.type === 'bnode' || p.property.type === 'bnode' || p.object.type === 'bnode') {
            rhsBlanks = true;
          }
          return p;
        });
      }
      this.rhsBlanks = rhsBlanks;
      this.cache = {};
      return this;
    },
    
    /**
     * Runs the rule on the data passed as the first argument.
     * @param {jQuery.rdf.databank} data A databank containing data to be reasoned over and added to.
     * @param {Object} [options]
     * @param {Integer} [options.limit=50] The rule isArray generally run over the {@link jQuery.rdf.databank} until it stops growing. In some situations, notably when creating blank nodes, this can lead to an infinite loop. The limit option indicates the maximum number of times the rule will be run before halting.
     * @returns {jQuery.rdf.rule} Returns this rule.
     * @example
     * $.rdf.rule('?person a foaf:Person', '?person a foaf:Agent', { namespaces: ns })
     *   .run(data);
     * @see jQuery.rdf.ruleset#run
     * @see jQuery.rdf#reason
     * @see jQuery.rdf.databank#reason
     */
    run: function (data, options) {
      var query = $.rdf({ databank: data }), 
        condition,
        opts = $.extend({ limit: 50 }, options), limit = opts.limit,
        ntriples,
        i, j, pattern, s, p, o, q,
        blanks = this.rhsBlanks,
        cache, sources, triples, add;
      if (this.cache[data.id] === undefined) {
        this.cache[data.id] = {};
      }
      for (i = 0; i < this.lhs.length; i += 1) {
        condition = this.lhs[i];
        if ($.isArray(condition)) {
          query = query.filter.apply(query, condition);
        } else if ($.isFunction(condition)) {
          query = query.filter.call(query, condition);
        } else {
          query = query.where(this.lhs[i]);
        }
      }
      do {
        ntriples = query.length;
        sources = query.sources();
        for (i = 0; i < ntriples; i += 1) {
          triples = sources[i];
          add = true;
          cache = this.cache[data.id];
          for (j = 0; j < triples.length; j += 1) {
            if (cache[triples[j]] === undefined) {
              cache[triples[j]] = {};
            } else if (j === triples.length - 1) {
              add = false;
            }
            cache = cache[triples[j]];
          }
          if (add) {
            q = query.eq(i);
            if (blanks) {
              for (j = 0; j < this.rhs.length; j += 1) {
                pattern = this.rhs[j];
                s = pattern.subject;
                p = pattern.property;
                o = pattern.object;
                if (s.type === 'bnode') {
                  s = $.rdf.blank('' + s + blankNodeNum);
                }
                if (p.type === 'bnode') {
                  p = $.rdf.blank('' + p + blankNodeNum);
                }
                if (o.type === 'bnode') {
                  o = $.rdf.blank('' + o + blankNodeNum);
                }
                pattern = $.rdf.pattern(s, p, o);
                q.add(pattern);
              }
              blankNodeNum += 1;
            } else if ($.isFunction(this.rhs)) {
                var results = q.map(this.rhs);
                for (var t = 0; t < results.length; t++) {
                    if ((results[t]) instanceof $.rdf.triple) {
                        query.add(results[t]);
                    }
                }
            } else {
              for (j = 0; j < this.rhs.length; j += 1) {
                q.add(this.rhs[j]);
              }
            }
          }
        }
        limit -= 1;
      } while (query.length > ntriples && limit > 0);
      return this;
    }
  };

  $.rdf.rule.fn.init.prototype = $.rdf.rule.fn;

  $.rdf.rule.defaults = {
    base: $.uri.base(),
    namespaces: {}
  };

  $.extend($.rdf.databank.fn, {
    /**
     * @methodOf jQuery.rdf.databank#
     * @name jQuery.rdf.databank#reason
     * @description Reasons over this databank using the {@link jQuery.rdf.rule} or {@link jQuery.rdf.ruleset} given as the first argument.
     * @param {jQuery.rdf.rule|jQuery.rdf.ruleset} rules The rules to run over the databank.
     * @param {Object} [options]
     * @param {Integer} [options.limit=50] The rules in this ruleset are generally run over the {@link jQuery.rdf.databank} until it stops growing. In some situations, notably when creating blank nodes, this can lead to an infinite loop. The limit option indicates the maximum number of times the ruleset will be run before halting.
     * @returns {jQuery.rdf.databank} The original {@link jQuery.rdf.databank}, although it may now contain more triples.
     * @see jQuery.rdf.ruleset#run
     * @see jQuery.rdf.rule#run
     */
    reason: function (rule, options) {
      rule.run(this, options);
      return this;
    }
  });
  
  $.extend($.rdf.fn, {
    /**
     * @methodOf jQuery.rdf#
     * @name jQuery.rdf#reason
     * @description Reasons over the {@link jQuery.rdf#databank} associated with this {@link jQuery.rdf} object using the {@link jQuery.rdf.rule} or {@link jQuery.rdf.ruleset} given as the first argument.
     * @param {jQuery.rdf.rule|jQuery.rdf.ruleset} rules The rules to run over the databank.
     * @param {Object} [options]
     * @param {Integer} [options.limit=50] The rules in this ruleset are generally run over the {@link jQuery.rdf.databank} until it stops growing. In some situations, notably when creating blank nodes, this can lead to an infinite loop. The limit option indicates the maximum number of times the ruleset will be run before halting.
     * @returns {jQuery.rdf} The original {@link jQuery.rdf} object, although it may now contain more matches because of the new triples added to its underlying databank.
     * @see jQuery.rdf.ruleset#run
     * @see jQuery.rdf.rule#run
     */
    reason: function (rule, options) {
      rule.run(this.databank, options);
      return this;
    }
  });

})(jQuery);
//     Underscore.js 1.3.1
//     (c) 2009-2012 Jeremy Ashkenas, DocumentCloud Inc.
//     Underscore is freely distributable under the MIT license.
//     Portions of Underscore are inspired or borrowed from Prototype,
//     Oliver Steele's Functional, and John Resig's Micro-Templating.
//     For all details and documentation:
//     http://documentcloud.github.com/underscore

(function() {

  // Baseline setup
  // --------------

  // Establish the root object, `window` in the browser, or `global` on the server.
  var root = this;

  // Save the previous value of the `_` variable.
  var previousUnderscore = root._;

  // Establish the object that gets returned to break out of a loop iteration.
  var breaker = {};

  // Save bytes in the minified (but not gzipped) version:
  var ArrayProto = Array.prototype, ObjProto = Object.prototype, FuncProto = Function.prototype;

  // Create quick reference variables for speed access to core prototypes.
  var slice            = ArrayProto.slice,
      unshift          = ArrayProto.unshift,
      toString         = ObjProto.toString,
      hasOwnProperty   = ObjProto.hasOwnProperty;

  // All **ECMAScript 5** native function implementations that we hope to use
  // are declared here.
  var
    nativeForEach      = ArrayProto.forEach,
    nativeMap          = ArrayProto.map,
    nativeReduce       = ArrayProto.reduce,
    nativeReduceRight  = ArrayProto.reduceRight,
    nativeFilter       = ArrayProto.filter,
    nativeEvery        = ArrayProto.every,
    nativeSome         = ArrayProto.some,
    nativeIndexOf      = ArrayProto.indexOf,
    nativeLastIndexOf  = ArrayProto.lastIndexOf,
    nativeIsArray      = Array.isArray,
    nativeKeys         = Object.keys,
    nativeBind         = FuncProto.bind;

  // Create a safe reference to the Underscore object for use below.
  var _ = function(obj) { return new wrapper(obj); };

  // Export the Underscore object for **Node.js**, with
  // backwards-compatibility for the old `require()` API. If we're in
  // the browser, add `_` as a global object via a string identifier,
  // for Closure Compiler "advanced" mode.
  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports = _;
    }
    exports._ = _;
  } else {
    root['_'] = _;
  }

  // Current version.
  _.VERSION = '1.3.1';

  // Collection Functions
  // --------------------

  // The cornerstone, an `each` implementation, aka `forEach`.
  // Handles objects with the built-in `forEach`, arrays, and raw objects.
  // Delegates to **ECMAScript 5**'s native `forEach` if available.
  var each = _.each = _.forEach = function(obj, iterator, context) {
    if (obj == null) return;
    if (nativeForEach && obj.forEach === nativeForEach) {
      obj.forEach(iterator, context);
    } else if (obj.length === +obj.length) {
      for (var i = 0, l = obj.length; i < l; i++) {
        if (i in obj && iterator.call(context, obj[i], i, obj) === breaker) return;
      }
    } else {
      for (var key in obj) {
        if (_.has(obj, key)) {
          if (iterator.call(context, obj[key], key, obj) === breaker) return;
        }
      }
    }
  };

  // Return the results of applying the iterator to each element.
  // Delegates to **ECMAScript 5**'s native `map` if available.
  _.map = _.collect = function(obj, iterator, context) {
    var results = [];
    if (obj == null) return results;
    if (nativeMap && obj.map === nativeMap) return obj.map(iterator, context);
    each(obj, function(value, index, list) {
      results[results.length] = iterator.call(context, value, index, list);
    });
    if (obj.length === +obj.length) results.length = obj.length;
    return results;
  };

  // **Reduce** builds up a single result from a list of values, aka `inject`,
  // or `foldl`. Delegates to **ECMAScript 5**'s native `reduce` if available.
  _.reduce = _.foldl = _.inject = function(obj, iterator, memo, context) {
    var initial = arguments.length > 2;
    if (obj == null) obj = [];
    if (nativeReduce && obj.reduce === nativeReduce) {
      if (context) iterator = _.bind(iterator, context);
      return initial ? obj.reduce(iterator, memo) : obj.reduce(iterator);
    }
    each(obj, function(value, index, list) {
      if (!initial) {
        memo = value;
        initial = true;
      } else {
        memo = iterator.call(context, memo, value, index, list);
      }
    });
    if (!initial) throw new TypeError('Reduce of empty array with no initial value');
    return memo;
  };

  // The right-associative version of reduce, also known as `foldr`.
  // Delegates to **ECMAScript 5**'s native `reduceRight` if available.
  _.reduceRight = _.foldr = function(obj, iterator, memo, context) {
    var initial = arguments.length > 2;
    if (obj == null) obj = [];
    if (nativeReduceRight && obj.reduceRight === nativeReduceRight) {
      if (context) iterator = _.bind(iterator, context);
      return initial ? obj.reduceRight(iterator, memo) : obj.reduceRight(iterator);
    }
    var reversed = _.toArray(obj).reverse();
    if (context && !initial) iterator = _.bind(iterator, context);
    return initial ? _.reduce(reversed, iterator, memo, context) : _.reduce(reversed, iterator);
  };

  // Return the first value which passes a truth test. Aliased as `detect`.
  _.find = _.detect = function(obj, iterator, context) {
    var result;
    any(obj, function(value, index, list) {
      if (iterator.call(context, value, index, list)) {
        result = value;
        return true;
      }
    });
    return result;
  };

  // Return all the elements that pass a truth test.
  // Delegates to **ECMAScript 5**'s native `filter` if available.
  // Aliased as `select`.
  _.filter = _.select = function(obj, iterator, context) {
    var results = [];
    if (obj == null) return results;
    if (nativeFilter && obj.filter === nativeFilter) return obj.filter(iterator, context);
    each(obj, function(value, index, list) {
      if (iterator.call(context, value, index, list)) results[results.length] = value;
    });
    return results;
  };

  // Return all the elements for which a truth test fails.
  _.reject = function(obj, iterator, context) {
    var results = [];
    if (obj == null) return results;
    each(obj, function(value, index, list) {
      if (!iterator.call(context, value, index, list)) results[results.length] = value;
    });
    return results;
  };

  // Determine whether all of the elements match a truth test.
  // Delegates to **ECMAScript 5**'s native `every` if available.
  // Aliased as `all`.
  _.every = _.all = function(obj, iterator, context) {
    var result = true;
    if (obj == null) return result;
    if (nativeEvery && obj.every === nativeEvery) return obj.every(iterator, context);
    each(obj, function(value, index, list) {
      if (!(result = result && iterator.call(context, value, index, list))) return breaker;
    });
    return result;
  };

  // Determine if at least one element in the object matches a truth test.
  // Delegates to **ECMAScript 5**'s native `some` if available.
  // Aliased as `any`.
  var any = _.some = _.any = function(obj, iterator, context) {
    iterator || (iterator = _.identity);
    var result = false;
    if (obj == null) return result;
    if (nativeSome && obj.some === nativeSome) return obj.some(iterator, context);
    each(obj, function(value, index, list) {
      if (result || (result = iterator.call(context, value, index, list))) return breaker;
    });
    return !!result;
  };

  // Determine if a given value is included in the array or object using `===`.
  // Aliased as `contains`.
  _.include = _.contains = function(obj, target) {
    var found = false;
    if (obj == null) return found;
    if (nativeIndexOf && obj.indexOf === nativeIndexOf) return obj.indexOf(target) != -1;
    found = any(obj, function(value) {
      return value === target;
    });
    return found;
  };

  // Invoke a method (with arguments) on every item in a collection.
  _.invoke = function(obj, method) {
    var args = slice.call(arguments, 2);
    return _.map(obj, function(value) {
      return (_.isFunction(method) ? method || value : value[method]).apply(value, args);
    });
  };

  // Convenience version of a common use case of `map`: fetching a property.
  _.pluck = function(obj, key) {
    return _.map(obj, function(value){ return value[key]; });
  };

  // Return the maximum element or (element-based computation).
  _.max = function(obj, iterator, context) {
    if (!iterator && _.isArray(obj)) return Math.max.apply(Math, obj);
    if (!iterator && _.isEmpty(obj)) return -Infinity;
    var result = {computed : -Infinity};
    each(obj, function(value, index, list) {
      var computed = iterator ? iterator.call(context, value, index, list) : value;
      computed >= result.computed && (result = {value : value, computed : computed});
    });
    return result.value;
  };

  // Return the minimum element (or element-based computation).
  _.min = function(obj, iterator, context) {
    if (!iterator && _.isArray(obj)) return Math.min.apply(Math, obj);
    if (!iterator && _.isEmpty(obj)) return Infinity;
    var result = {computed : Infinity};
    each(obj, function(value, index, list) {
      var computed = iterator ? iterator.call(context, value, index, list) : value;
      computed < result.computed && (result = {value : value, computed : computed});
    });
    return result.value;
  };

  // Shuffle an array.
  _.shuffle = function(obj) {
    var shuffled = [], rand;
    each(obj, function(value, index, list) {
      if (index == 0) {
        shuffled[0] = value;
      } else {
        rand = Math.floor(Math.random() * (index + 1));
        shuffled[index] = shuffled[rand];
        shuffled[rand] = value;
      }
    });
    return shuffled;
  };

  // Sort the object's values by a criterion produced by an iterator.
  _.sortBy = function(obj, iterator, context) {
    return _.pluck(_.map(obj, function(value, index, list) {
      return {
        value : value,
        criteria : iterator.call(context, value, index, list)
      };
    }).sort(function(left, right) {
      var a = left.criteria, b = right.criteria;
      return a < b ? -1 : a > b ? 1 : 0;
    }), 'value');
  };

  // Groups the object's values by a criterion. Pass either a string attribute
  // to group by, or a function that returns the criterion.
  _.groupBy = function(obj, val) {
    var result = {};
    var iterator = _.isFunction(val) ? val : function(obj) { return obj[val]; };
    each(obj, function(value, index) {
      var key = iterator(value, index);
      (result[key] || (result[key] = [])).push(value);
    });
    return result;
  };

  // Use a comparator function to figure out at what index an object should
  // be inserted so as to maintain order. Uses binary search.
  _.sortedIndex = function(array, obj, iterator) {
    iterator || (iterator = _.identity);
    var low = 0, high = array.length;
    while (low < high) {
      var mid = (low + high) >> 1;
      iterator(array[mid]) < iterator(obj) ? low = mid + 1 : high = mid;
    }
    return low;
  };

  // Safely convert anything iterable into a real, live array.
  _.toArray = function(iterable) {
    if (!iterable)                return [];
    if (iterable.toArray)         return iterable.toArray();
    if (_.isArray(iterable))      return slice.call(iterable);
    if (_.isArguments(iterable))  return slice.call(iterable);
    return _.values(iterable);
  };

  // Return the number of elements in an object.
  _.size = function(obj) {
    return _.toArray(obj).length;
  };

  // Array Functions
  // ---------------

  // Get the first element of an array. Passing **n** will return the first N
  // values in the array. Aliased as `head`. The **guard** check allows it to work
  // with `_.map`.
  _.first = _.head = function(array, n, guard) {
    return (n != null) && !guard ? slice.call(array, 0, n) : array[0];
  };

  // Returns everything but the last entry of the array. Especcialy useful on
  // the arguments object. Passing **n** will return all the values in
  // the array, excluding the last N. The **guard** check allows it to work with
  // `_.map`.
  _.initial = function(array, n, guard) {
    return slice.call(array, 0, array.length - ((n == null) || guard ? 1 : n));
  };

  // Get the last element of an array. Passing **n** will return the last N
  // values in the array. The **guard** check allows it to work with `_.map`.
  _.last = function(array, n, guard) {
    if ((n != null) && !guard) {
      return slice.call(array, Math.max(array.length - n, 0));
    } else {
      return array[array.length - 1];
    }
  };

  // Returns everything but the first entry of the array. Aliased as `tail`.
  // Especially useful on the arguments object. Passing an **index** will return
  // the rest of the values in the array from that index onward. The **guard**
  // check allows it to work with `_.map`.
  _.rest = _.tail = function(array, index, guard) {
    return slice.call(array, (index == null) || guard ? 1 : index);
  };

  // Trim out all falsy values from an array.
  _.compact = function(array) {
    return _.filter(array, function(value){ return !!value; });
  };

  // Return a completely flattened version of an array.
  _.flatten = function(array, shallow) {
    return _.reduce(array, function(memo, value) {
      if (_.isArray(value)) return memo.concat(shallow ? value : _.flatten(value));
      memo[memo.length] = value;
      return memo;
    }, []);
  };

  // Return a version of the array that does not contain the specified value(s).
  _.without = function(array) {
    return _.difference(array, slice.call(arguments, 1));
  };

  // Produce a duplicate-free version of the array. If the array has already
  // been sorted, you have the option of using a faster algorithm.
  // Aliased as `unique`.
  _.uniq = _.unique = function(array, isSorted, iterator) {
    var initial = iterator ? _.map(array, iterator) : array;
    var result = [];
    _.reduce(initial, function(memo, el, i) {
      if (0 == i || (isSorted === true ? _.last(memo) != el : !_.include(memo, el))) {
        memo[memo.length] = el;
        result[result.length] = array[i];
      }
      return memo;
    }, []);
    return result;
  };

  // Produce an array that contains the union: each distinct element from all of
  // the passed-in arrays.
  _.union = function() {
    return _.uniq(_.flatten(arguments, true));
  };

  // Produce an array that contains every item shared between all the
  // passed-in arrays. (Aliased as "intersect" for back-compat.)
  _.intersection = _.intersect = function(array) {
    var rest = slice.call(arguments, 1);
    return _.filter(_.uniq(array), function(item) {
      return _.every(rest, function(other) {
        return _.indexOf(other, item) >= 0;
      });
    });
  };

  // Take the difference between one array and a number of other arrays.
  // Only the elements present in just the first array will remain.
  _.difference = function(array) {
    var rest = _.flatten(slice.call(arguments, 1));
    return _.filter(array, function(value){ return !_.include(rest, value); });
  };

  // Zip together multiple lists into a single array -- elements that share
  // an index go together.
  _.zip = function() {
    var args = slice.call(arguments);
    var length = _.max(_.pluck(args, 'length'));
    var results = new Array(length);
    for (var i = 0; i < length; i++) results[i] = _.pluck(args, "" + i);
    return results;
  };

  // If the browser doesn't supply us with indexOf (I'm looking at you, **MSIE**),
  // we need this function. Return the position of the first occurrence of an
  // item in an array, or -1 if the item is not included in the array.
  // Delegates to **ECMAScript 5**'s native `indexOf` if available.
  // If the array is large and already in sort order, pass `true`
  // for **isSorted** to use binary search.
  _.indexOf = function(array, item, isSorted) {
    if (array == null) return -1;
    var i, l;
    if (isSorted) {
      i = _.sortedIndex(array, item);
      return array[i] === item ? i : -1;
    }
    if (nativeIndexOf && array.indexOf === nativeIndexOf) return array.indexOf(item);
    for (i = 0, l = array.length; i < l; i++) if (i in array && array[i] === item) return i;
    return -1;
  };

  // Delegates to **ECMAScript 5**'s native `lastIndexOf` if available.
  _.lastIndexOf = function(array, item) {
    if (array == null) return -1;
    if (nativeLastIndexOf && array.lastIndexOf === nativeLastIndexOf) return array.lastIndexOf(item);
    var i = array.length;
    while (i--) if (i in array && array[i] === item) return i;
    return -1;
  };

  // Generate an integer Array containing an arithmetic progression. A port of
  // the native Python `range()` function. See
  // [the Python documentation](http://docs.python.org/library/functions.html#range).
  _.range = function(start, stop, step) {
    if (arguments.length <= 1) {
      stop = start || 0;
      start = 0;
    }
    step = arguments[2] || 1;

    var len = Math.max(Math.ceil((stop - start) / step), 0);
    var idx = 0;
    var range = new Array(len);

    while(idx < len) {
      range[idx++] = start;
      start += step;
    }

    return range;
  };

  // Function (ahem) Functions
  // ------------------

  // Reusable constructor function for prototype setting.
  var ctor = function(){};

  // Create a function bound to a given object (assigning `this`, and arguments,
  // optionally). Binding with arguments is also known as `curry`.
  // Delegates to **ECMAScript 5**'s native `Function.bind` if available.
  // We check for `func.bind` first, to fail fast when `func` is undefined.
  _.bind = function bind(func, context) {
    var bound, args;
    if (func.bind === nativeBind && nativeBind) return nativeBind.apply(func, slice.call(arguments, 1));
    if (!_.isFunction(func)) throw new TypeError;
    args = slice.call(arguments, 2);
    return bound = function() {
      if (!(this instanceof bound)) return func.apply(context, args.concat(slice.call(arguments)));
      ctor.prototype = func.prototype;
      var self = new ctor;
      var result = func.apply(self, args.concat(slice.call(arguments)));
      if (Object(result) === result) return result;
      return self;
    };
  };

  // Bind all of an object's methods to that object. Useful for ensuring that
  // all callbacks defined on an object belong to it.
  _.bindAll = function(obj) {
    var funcs = slice.call(arguments, 1);
    if (funcs.length == 0) funcs = _.functions(obj);
    each(funcs, function(f) { obj[f] = _.bind(obj[f], obj); });
    return obj;
  };

  // Memoize an expensive function by storing its results.
  _.memoize = function(func, hasher) {
    var memo = {};
    hasher || (hasher = _.identity);
    return function() {
      var key = hasher.apply(this, arguments);
      return _.has(memo, key) ? memo[key] : (memo[key] = func.apply(this, arguments));
    };
  };

  // Delays a function for the given number of milliseconds, and then calls
  // it with the arguments supplied.
  _.delay = function(func, wait) {
    var args = slice.call(arguments, 2);
    return setTimeout(function(){ return func.apply(func, args); }, wait);
  };

  // Defers a function, scheduling it to run after the current call stack has
  // cleared.
  _.defer = function(func) {
    return _.delay.apply(_, [func, 1].concat(slice.call(arguments, 1)));
  };

  // Returns a function, that, when invoked, will only be triggered at most once
  // during a given window of time.
  _.throttle = function(func, wait) {
    var context, args, timeout, throttling, more;
    var whenDone = _.debounce(function(){ more = throttling = false; }, wait);
    return function() {
      context = this; args = arguments;
      var later = function() {
        timeout = null;
        if (more) func.apply(context, args);
        whenDone();
      };
      if (!timeout) timeout = setTimeout(later, wait);
      if (throttling) {
        more = true;
      } else {
        func.apply(context, args);
      }
      whenDone();
      throttling = true;
    };
  };

  // Returns a function, that, as long as it continues to be invoked, will not
  // be triggered. The function will be called after it stops being called for
  // N milliseconds.
  _.debounce = function(func, wait) {
    var timeout;
    return function() {
      var context = this, args = arguments;
      var later = function() {
        timeout = null;
        func.apply(context, args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  };

  // Returns a function that will be executed at most one time, no matter how
  // often you call it. Useful for lazy initialization.
  _.once = function(func) {
    var ran = false, memo;
    return function() {
      if (ran) return memo;
      ran = true;
      return memo = func.apply(this, arguments);
    };
  };

  // Returns the first function passed as an argument to the second,
  // allowing you to adjust arguments, run code before and after, and
  // conditionally execute the original function.
  _.wrap = function(func, wrapper) {
    return function() {
      var args = [func].concat(slice.call(arguments, 0));
      return wrapper.apply(this, args);
    };
  };

  // Returns a function that is the composition of a list of functions, each
  // consuming the return value of the function that follows.
  _.compose = function() {
    var funcs = arguments;
    return function() {
      var args = arguments;
      for (var i = funcs.length - 1; i >= 0; i--) {
        args = [funcs[i].apply(this, args)];
      }
      return args[0];
    };
  };

  // Returns a function that will only be executed after being called N times.
  _.after = function(times, func) {
    if (times <= 0) return func();
    return function() {
      if (--times < 1) { return func.apply(this, arguments); }
    };
  };

  // Object Functions
  // ----------------

  // Retrieve the names of an object's properties.
  // Delegates to **ECMAScript 5**'s native `Object.keys`
  _.keys = nativeKeys || function(obj) {
    if (obj !== Object(obj)) throw new TypeError('Invalid object');
    var keys = [];
    for (var key in obj) if (_.has(obj, key)) keys[keys.length] = key;
    return keys;
  };

  // Retrieve the values of an object's properties.
  _.values = function(obj) {
    return _.map(obj, _.identity);
  };

  // Return a sorted list of the function names available on the object.
  // Aliased as `methods`
  _.functions = _.methods = function(obj) {
    var names = [];
    for (var key in obj) {
      if (_.isFunction(obj[key])) names.push(key);
    }
    return names.sort();
  };

  // Extend a given object with all the properties in passed-in object(s).
  _.extend = function(obj) {
    each(slice.call(arguments, 1), function(source) {
      for (var prop in source) {
        obj[prop] = source[prop];
      }
    });
    return obj;
  };

  // Fill in a given object with default properties.
  _.defaults = function(obj) {
    each(slice.call(arguments, 1), function(source) {
      for (var prop in source) {
        if (obj[prop] == null) obj[prop] = source[prop];
      }
    });
    return obj;
  };

  // Create a (shallow-cloned) duplicate of an object.
  _.clone = function(obj) {
    if (!_.isObject(obj)) return obj;
    return _.isArray(obj) ? obj.slice() : _.extend({}, obj);
  };

  // Invokes interceptor with the obj, and then returns obj.
  // The primary purpose of this method is to "tap into" a method chain, in
  // order to perform operations on intermediate results within the chain.
  _.tap = function(obj, interceptor) {
    interceptor(obj);
    return obj;
  };

  // Internal recursive comparison function.
  function eq(a, b, stack) {
    // Identical objects are equal. `0 === -0`, but they aren't identical.
    // See the Harmony `egal` proposal: http://wiki.ecmascript.org/doku.php?id=harmony:egal.
    if (a === b) return a !== 0 || 1 / a == 1 / b;
    // A strict comparison is necessary because `null == undefined`.
    if (a == null || b == null) return a === b;
    // Unwrap any wrapped objects.
    if (a._chain) a = a._wrapped;
    if (b._chain) b = b._wrapped;
    // Invoke a custom `isEqual` method if one is provided.
    if (a.isEqual && _.isFunction(a.isEqual)) return a.isEqual(b);
    if (b.isEqual && _.isFunction(b.isEqual)) return b.isEqual(a);
    // Compare `[[Class]]` names.
    var className = toString.call(a);
    if (className != toString.call(b)) return false;
    switch (className) {
      // Strings, numbers, dates, and booleans are compared by value.
      case '[object String]':
        // Primitives and their corresponding object wrappers are equivalent; thus, `"5"` is
        // equivalent to `new String("5")`.
        return a == String(b);
      case '[object Number]':
        // `NaN`s are equivalent, but non-reflexive. An `egal` comparison is performed for
        // other numeric values.
        return a != +a ? b != +b : (a == 0 ? 1 / a == 1 / b : a == +b);
      case '[object Date]':
      case '[object Boolean]':
        // Coerce dates and booleans to numeric primitive values. Dates are compared by their
        // millisecond representations. Note that invalid dates with millisecond representations
        // of `NaN` are not equivalent.
        return +a == +b;
      // RegExps are compared by their source patterns and flags.
      case '[object RegExp]':
        return a.source == b.source &&
               a.global == b.global &&
               a.multiline == b.multiline &&
               a.ignoreCase == b.ignoreCase;
    }
    if (typeof a != 'object' || typeof b != 'object') return false;
    // Assume equality for cyclic structures. The algorithm for detecting cyclic
    // structures is adapted from ES 5.1 section 15.12.3, abstract operation `JO`.
    var length = stack.length;
    while (length--) {
      // Linear search. Performance is inversely proportional to the number of
      // unique nested structures.
      if (stack[length] == a) return true;
    }
    // Add the first object to the stack of traversed objects.
    stack.push(a);
    var size = 0, result = true;
    // Recursively compare objects and arrays.
    if (className == '[object Array]') {
      // Compare array lengths to determine if a deep comparison is necessary.
      size = a.length;
      result = size == b.length;
      if (result) {
        // Deep compare the contents, ignoring non-numeric properties.
        while (size--) {
          // Ensure commutative equality for sparse arrays.
          if (!(result = size in a == size in b && eq(a[size], b[size], stack))) break;
        }
      }
    } else {
      // Objects with different constructors are not equivalent.
      if ('constructor' in a != 'constructor' in b || a.constructor != b.constructor) return false;
      // Deep compare objects.
      for (var key in a) {
        if (_.has(a, key)) {
          // Count the expected number of properties.
          size++;
          // Deep compare each member.
          if (!(result = _.has(b, key) && eq(a[key], b[key], stack))) break;
        }
      }
      // Ensure that both objects contain the same number of properties.
      if (result) {
        for (key in b) {
          if (_.has(b, key) && !(size--)) break;
        }
        result = !size;
      }
    }
    // Remove the first object from the stack of traversed objects.
    stack.pop();
    return result;
  }

  // Perform a deep comparison to check if two objects are equal.
  _.isEqual = function(a, b) {
    return eq(a, b, []);
  };

  // Is a given array, string, or object empty?
  // An "empty" object has no enumerable own-properties.
  _.isEmpty = function(obj) {
    if (_.isArray(obj) || _.isString(obj)) return obj.length === 0;
    for (var key in obj) if (_.has(obj, key)) return false;
    return true;
  };

  // Is a given value a DOM element?
  _.isElement = function(obj) {
    return !!(obj && obj.nodeType == 1);
  };

  // Is a given value an array?
  // Delegates to ECMA5's native Array.isArray
  _.isArray = nativeIsArray || function(obj) {
    return toString.call(obj) == '[object Array]';
  };

  // Is a given variable an object?
  _.isObject = function(obj) {
    return obj === Object(obj);
  };

  // Is a given variable an arguments object?
  _.isArguments = function(obj) {
    return toString.call(obj) == '[object Arguments]';
  };
  if (!_.isArguments(arguments)) {
    _.isArguments = function(obj) {
      return !!(obj && _.has(obj, 'callee'));
    };
  }

  // Is a given value a function?
  _.isFunction = function(obj) {
    return toString.call(obj) == '[object Function]';
  };

  // Is a given value a string?
  _.isString = function(obj) {
    return toString.call(obj) == '[object String]';
  };

  // Is a given value a number?
  _.isNumber = function(obj) {
    return toString.call(obj) == '[object Number]';
  };

  // Is the given value `NaN`?
  _.isNaN = function(obj) {
    // `NaN` is the only value for which `===` is not reflexive.
    return obj !== obj;
  };

  // Is a given value a boolean?
  _.isBoolean = function(obj) {
    return obj === true || obj === false || toString.call(obj) == '[object Boolean]';
  };

  // Is a given value a date?
  _.isDate = function(obj) {
    return toString.call(obj) == '[object Date]';
  };

  // Is the given value a regular expression?
  _.isRegExp = function(obj) {
    return toString.call(obj) == '[object RegExp]';
  };

  // Is a given value equal to null?
  _.isNull = function(obj) {
    return obj === null;
  };

  // Is a given variable undefined?
  _.isUndefined = function(obj) {
    return obj === void 0;
  };

  // Has own property?
  _.has = function(obj, key) {
    return hasOwnProperty.call(obj, key);
  };

  // Utility Functions
  // -----------------

  // Run Underscore.js in *noConflict* mode, returning the `_` variable to its
  // previous owner. Returns a reference to the Underscore object.
  _.noConflict = function() {
    root._ = previousUnderscore;
    return this;
  };

  // Keep the identity function around for default iterators.
  _.identity = function(value) {
    return value;
  };

  // Run a function **n** times.
  _.times = function (n, iterator, context) {
    for (var i = 0; i < n; i++) iterator.call(context, i);
  };

  // Escape a string for HTML interpolation.
  _.escape = function(string) {
    return (''+string).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;').replace(/\//g,'&#x2F;');
  };

  // Add your own custom functions to the Underscore object, ensuring that
  // they're correctly added to the OOP wrapper as well.
  _.mixin = function(obj) {
    each(_.functions(obj), function(name){
      addToWrapper(name, _[name] = obj[name]);
    });
  };

  // Generate a unique integer id (unique within the entire client session).
  // Useful for temporary DOM ids.
  var idCounter = 0;
  _.uniqueId = function(prefix) {
    var id = idCounter++;
    return prefix ? prefix + id : id;
  };

  // By default, Underscore uses ERB-style template delimiters, change the
  // following template settings to use alternative delimiters.
  _.templateSettings = {
    evaluate    : /<%([\s\S]+?)%>/g,
    interpolate : /<%=([\s\S]+?)%>/g,
    escape      : /<%-([\s\S]+?)%>/g
  };

  // When customizing `templateSettings`, if you don't want to define an
  // interpolation, evaluation or escaping regex, we need one that is
  // guaranteed not to match.
  var noMatch = /.^/;

  // Within an interpolation, evaluation, or escaping, remove HTML escaping
  // that had been previously added.
  var unescape = function(code) {
    return code.replace(/\\\\/g, '\\').replace(/\\'/g, "'");
  };

  // JavaScript micro-templating, similar to John Resig's implementation.
  // Underscore templating handles arbitrary delimiters, preserves whitespace,
  // and correctly escapes quotes within interpolated code.
  _.template = function(str, data) {
    var c  = _.templateSettings;
    var tmpl = 'var __p=[],print=function(){__p.push.apply(__p,arguments);};' +
      'with(obj||{}){__p.push(\'' +
      str.replace(/\\/g, '\\\\')
         .replace(/'/g, "\\'")
         .replace(c.escape || noMatch, function(match, code) {
           return "',_.escape(" + unescape(code) + "),'";
         })
         .replace(c.interpolate || noMatch, function(match, code) {
           return "'," + unescape(code) + ",'";
         })
         .replace(c.evaluate || noMatch, function(match, code) {
           return "');" + unescape(code).replace(/[\r\n\t]/g, ' ') + ";__p.push('";
         })
         .replace(/\r/g, '\\r')
         .replace(/\n/g, '\\n')
         .replace(/\t/g, '\\t')
         + "');}return __p.join('');";
    var func = new Function('obj', '_', tmpl);
    if (data) return func(data, _);
    return function(data) {
      return func.call(this, data, _);
    };
  };

  // Add a "chain" function, which will delegate to the wrapper.
  _.chain = function(obj) {
    return _(obj).chain();
  };

  // The OOP Wrapper
  // ---------------

  // If Underscore is called as a function, it returns a wrapped object that
  // can be used OO-style. This wrapper holds altered versions of all the
  // underscore functions. Wrapped objects may be chained.
  var wrapper = function(obj) { this._wrapped = obj; };

  // Expose `wrapper.prototype` as `_.prototype`
  _.prototype = wrapper.prototype;

  // Helper function to continue chaining intermediate results.
  var result = function(obj, chain) {
    return chain ? _(obj).chain() : obj;
  };

  // A method to easily add functions to the OOP wrapper.
  var addToWrapper = function(name, func) {
    wrapper.prototype[name] = function() {
      var args = slice.call(arguments);
      unshift.call(args, this._wrapped);
      return result(func.apply(_, args), this._chain);
    };
  };

  // Add all of the Underscore functions to the wrapper object.
  _.mixin(_);

  // Add all mutator Array functions to the wrapper.
  each(['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'], function(name) {
    var method = ArrayProto[name];
    wrapper.prototype[name] = function() {
      var wrapped = this._wrapped;
      method.apply(wrapped, arguments);
      var length = wrapped.length;
      if ((name == 'shift' || name == 'splice') && length === 0) delete wrapped[0];
      return result(wrapped, this._chain);
    };
  });

  // Add all accessor Array functions to the wrapper.
  each(['concat', 'join', 'slice'], function(name) {
    var method = ArrayProto[name];
    wrapper.prototype[name] = function() {
      return result(method.apply(this._wrapped, arguments), this._chain);
    };
  });

  // Start chaining a wrapped Underscore object.
  wrapper.prototype.chain = function() {
    this._chain = true;
    return this;
  };

  // Extracts the result from a wrapped and chained object.
  wrapper.prototype.value = function() {
    return this._wrapped;
  };

}).call(this);
//     Backbone.js 0.9.2

//     (c) 2010-2012 Jeremy Ashkenas, DocumentCloud Inc.
//     Backbone may be freely distributed under the MIT license.
//     For all details and documentation:
//     http://backbonejs.org

(function(){

  // Initial Setup
  // -------------

  // Save a reference to the global object (`window` in the browser, `global`
  // on the server).
  var root = this;

  // Save the previous value of the `Backbone` variable, so that it can be
  // restored later on, if `noConflict` is used.
  var previousBackbone = root.Backbone;

  // Create a local reference to slice/splice.
  var slice = Array.prototype.slice;
  var splice = Array.prototype.splice;

  // The top-level namespace. All public Backbone classes and modules will
  // be attached to this. Exported for both CommonJS and the browser.
  var Backbone;
  if (typeof exports !== 'undefined') {
    Backbone = exports;
  } else {
    Backbone = root.Backbone = {};
  }

  // Current version of the library. Keep in sync with `package.json`.
  Backbone.VERSION = '0.9.2';

  // Require Underscore, if we're on the server, and it's not already present.
  var _ = root._;
  if (!_ && (typeof require !== 'undefined')) _ = require('underscore');

  // For Backbone's purposes, jQuery, Zepto, or Ender owns the `$` variable.
  var $ = root.jQuery || root.Zepto || root.ender;

  // Set the JavaScript library that will be used for DOM manipulation and
  // Ajax calls (a.k.a. the `$` variable). By default Backbone will use: jQuery,
  // Zepto, or Ender; but the `setDomLibrary()` method lets you inject an
  // alternate JavaScript library (or a mock library for testing your views
  // outside of a browser).
  Backbone.setDomLibrary = function(lib) {
    $ = lib;
  };

  // Runs Backbone.js in *noConflict* mode, returning the `Backbone` variable
  // to its previous owner. Returns a reference to this Backbone object.
  Backbone.noConflict = function() {
    root.Backbone = previousBackbone;
    return this;
  };

  // Turn on `emulateHTTP` to support legacy HTTP servers. Setting this option
  // will fake `"PUT"` and `"DELETE"` requests via the `_method` parameter and
  // set a `X-Http-Method-Override` header.
  Backbone.emulateHTTP = false;

  // Turn on `emulateJSON` to support legacy servers that can't deal with direct
  // `application/json` requests ... will encode the body as
  // `application/x-www-form-urlencoded` instead and will send the model in a
  // form param named `model`.
  Backbone.emulateJSON = false;

  // Backbone.Events
  // -----------------

  // Regular expression used to split event strings
  var eventSplitter = /\s+/;

  // A module that can be mixed in to *any object* in order to provide it with
  // custom events. You may bind with `on` or remove with `off` callback functions
  // to an event; trigger`-ing an event fires all callbacks in succession.
  //
  //     var object = {};
  //     _.extend(object, Backbone.Events);
  //     object.on('expand', function(){ alert('expanded'); });
  //     object.trigger('expand');
  //
  var Events = Backbone.Events = {

    // Bind one or more space separated events, `events`, to a `callback`
    // function. Passing `"all"` will bind the callback to all events fired.
    on: function(events, callback, context) {

      var calls, event, node, tail, list;
      if (!callback) return this;
      events = events.split(eventSplitter);
      calls = this._callbacks || (this._callbacks = {});

      // Create an immutable callback list, allowing traversal during
      // modification.  The tail is an empty object that will always be used
      // as the next node.
      while (event = events.shift()) {
        list = calls[event];
        node = list ? list.tail : {};
        node.next = tail = {};
        node.context = context;
        node.callback = callback;
        calls[event] = {tail: tail, next: list ? list.next : node};
      }

      return this;
    },

    // Remove one or many callbacks. If `context` is null, removes all callbacks
    // with that function. If `callback` is null, removes all callbacks for the
    // event. If `events` is null, removes all bound callbacks for all events.
    off: function(events, callback, context) {
      var event, calls, node, tail, cb, ctx;

      // No events, or removing *all* events.
      if (!(calls = this._callbacks)) return;
      if (!(events || callback || context)) {
        delete this._callbacks;
        return this;
      }

      // Loop through the listed events and contexts, splicing them out of the
      // linked list of callbacks if appropriate.
      events = events ? events.split(eventSplitter) : _.keys(calls);
      while (event = events.shift()) {
        node = calls[event];
        delete calls[event];
        if (!node || !(callback || context)) continue;
        // Create a new list, omitting the indicated callbacks.
        tail = node.tail;
        while ((node = node.next) !== tail) {
          cb = node.callback;
          ctx = node.context;
          if ((callback && cb !== callback) || (context && ctx !== context)) {
            this.on(event, cb, ctx);
          }
        }
      }

      return this;
    },

    // Trigger one or many events, firing all bound callbacks. Callbacks are
    // passed the same arguments as `trigger` is, apart from the event name
    // (unless you're listening on `"all"`, which will cause your callback to
    // receive the true name of the event as the first argument).
    trigger: function(events) {
      var event, node, calls, tail, args, all, rest;
      if (!(calls = this._callbacks)) return this;
      all = calls.all;
      events = events.split(eventSplitter);
      rest = slice.call(arguments, 1);

      // For each event, walk through the linked list of callbacks twice,
      // first to trigger the event, then to trigger any `"all"` callbacks.
      while (event = events.shift()) {
        if (node = calls[event]) {
          tail = node.tail;
          while ((node = node.next) !== tail) {
            node.callback.apply(node.context || this, rest);
          }
        }
        if (node = all) {
          tail = node.tail;
          args = [event].concat(rest);
          while ((node = node.next) !== tail) {
            node.callback.apply(node.context || this, args);
          }
        }
      }

      return this;
    }

  };

  // Aliases for backwards compatibility.
  Events.bind   = Events.on;
  Events.unbind = Events.off;

  // Backbone.Model
  // --------------

  // Create a new model, with defined attributes. A client id (`cid`)
  // is automatically generated and assigned for you.
  var Model = Backbone.Model = function(attributes, options) {
    var defaults;
    attributes || (attributes = {});
    if (options && options.parse) attributes = this.parse(attributes);
    if (defaults = getValue(this, 'defaults')) {
      attributes = _.extend({}, defaults, attributes);
    }
    if (options && options.collection) this.collection = options.collection;
    this.attributes = {};
    this._escapedAttributes = {};
    this.cid = _.uniqueId('c');
    this.changed = {};
    this._silent = {};
    this._pending = {};
    this.set(attributes, {silent: true});
    // Reset change tracking.
    this.changed = {};
    this._silent = {};
    this._pending = {};
    this._previousAttributes = _.clone(this.attributes);
    this.initialize.apply(this, arguments);
  };

  // Attach all inheritable methods to the Model prototype.
  _.extend(Model.prototype, Events, {

    // A hash of attributes whose current and previous value differ.
    changed: null,

    // A hash of attributes that have silently changed since the last time
    // `change` was called.  Will become pending attributes on the next call.
    _silent: null,

    // A hash of attributes that have changed since the last `'change'` event
    // began.
    _pending: null,

    // The default name for the JSON `id` attribute is `"id"`. MongoDB and
    // CouchDB users may want to set this to `"_id"`.
    idAttribute: 'id',

    // Initialize is an empty function by default. Override it with your own
    // initialization logic.
    initialize: function(){},

    // Return a copy of the model's `attributes` object.
    toJSON: function(options) {
      return _.clone(this.attributes);
    },

    // Get the value of an attribute.
    get: function(attr) {
      return this.attributes[attr];
    },

    // Get the HTML-escaped value of an attribute.
    escape: function(attr) {
      var html;
      if (html = this._escapedAttributes[attr]) return html;
      var val = this.get(attr);
      return this._escapedAttributes[attr] = _.escape(val == null ? '' : '' + val);
    },

    // Returns `true` if the attribute contains a value that is not null
    // or undefined.
    has: function(attr) {
      return this.get(attr) != null;
    },

    // Set a hash of model attributes on the object, firing `"change"` unless
    // you choose to silence it.
    set: function(key, value, options) {
      var attrs, attr, val;

      // Handle both `"key", value` and `{key: value}` -style arguments.
      if (_.isObject(key) || key == null) {
        attrs = key;
        options = value;
      } else {
        attrs = {};
        attrs[key] = value;
      }

      // Extract attributes and options.
      options || (options = {});
      if (!attrs) return this;
      if (attrs instanceof Model) attrs = attrs.attributes;
      if (options.unset) for (attr in attrs) attrs[attr] = void 0;

      // Run validation.
      if (!this._validate(attrs, options)) return false;

      // Check for changes of `id`.
      if (this.idAttribute in attrs) this.id = attrs[this.idAttribute];

      var changes = options.changes = {};
      var now = this.attributes;
      var escaped = this._escapedAttributes;
      var prev = this._previousAttributes || {};

      // For each `set` attribute...
      for (attr in attrs) {
        val = attrs[attr];

        // If the new and current value differ, record the change.
        if (!_.isEqual(now[attr], val) || (options.unset && _.has(now, attr))) {
          delete escaped[attr];
          (options.silent ? this._silent : changes)[attr] = true;
        }

        // Update or delete the current value.
        options.unset ? delete now[attr] : now[attr] = val;

        // If the new and previous value differ, record the change.  If not,
        // then remove changes for this attribute.
        if (!_.isEqual(prev[attr], val) || (_.has(now, attr) != _.has(prev, attr))) {
          this.changed[attr] = val;
          if (!options.silent) this._pending[attr] = true;
        } else {
          delete this.changed[attr];
          delete this._pending[attr];
        }
      }

      // Fire the `"change"` events.
      if (!options.silent) this.change(options);
      return this;
    },

    // Remove an attribute from the model, firing `"change"` unless you choose
    // to silence it. `unset` is a noop if the attribute doesn't exist.
    unset: function(attr, options) {
      (options || (options = {})).unset = true;
      return this.set(attr, null, options);
    },

    // Clear all attributes on the model, firing `"change"` unless you choose
    // to silence it.
    clear: function(options) {
      (options || (options = {})).unset = true;
      return this.set(_.clone(this.attributes), options);
    },

    // Fetch the model from the server. If the server's representation of the
    // model differs from its current attributes, they will be overriden,
    // triggering a `"change"` event.
    fetch: function(options) {
      options = options ? _.clone(options) : {};
      var model = this;
      var success = options.success;
      options.success = function(resp, status, xhr) {
        if (!model.set(model.parse(resp, xhr), options)) return false;
        if (success) success(model, resp);
      };
      options.error = Backbone.wrapError(options.error, model, options);
      return (this.sync || Backbone.sync).call(this, 'read', this, options);
    },

    // Set a hash of model attributes, and sync the model to the server.
    // If the server returns an attributes hash that differs, the model's
    // state will be `set` again.
    save: function(key, value, options) {
      var attrs, current;

      // Handle both `("key", value)` and `({key: value})` -style calls.
      if (_.isObject(key) || key == null) {
        attrs = key;
        options = value;
      } else {
        attrs = {};
        attrs[key] = value;
      }
      options = options ? _.clone(options) : {};

      // If we're "wait"-ing to set changed attributes, validate early.
      if (options.wait) {
        if (!this._validate(attrs, options)) return false;
        current = _.clone(this.attributes);
      }

      // Regular saves `set` attributes before persisting to the server.
      var silentOptions = _.extend({}, options, {silent: true});
      if (attrs && !this.set(attrs, options.wait ? silentOptions : options)) {
        return false;
      }

      // After a successful server-side save, the client is (optionally)
      // updated with the server-side state.
      var model = this;
      var success = options.success;
      options.success = function(resp, status, xhr) {
        var serverAttrs = model.parse(resp, xhr);
        if (options.wait) {
          delete options.wait;
          serverAttrs = _.extend(attrs || {}, serverAttrs);
        }
        if (!model.set(serverAttrs, options)) return false;
        if (success) {
          success(model, resp);
        } else {
          model.trigger('sync', model, resp, options);
        }
      };

      // Finish configuring and sending the Ajax request.
      options.error = Backbone.wrapError(options.error, model, options);
      var method = this.isNew() ? 'create' : 'update';
      var xhr = (this.sync || Backbone.sync).call(this, method, this, options);
      if (options.wait) this.set(current, silentOptions);
      return xhr;
    },

    // Destroy this model on the server if it was already persisted.
    // Optimistically removes the model from its collection, if it has one.
    // If `wait: true` is passed, waits for the server to respond before removal.
    destroy: function(options) {
      options = options ? _.clone(options) : {};
      var model = this;
      var success = options.success;

      var triggerDestroy = function() {
        model.trigger('destroy', model, model.collection, options);
      };

      if (this.isNew()) {
        triggerDestroy();
        return false;
      }

      options.success = function(resp) {
        if (options.wait) triggerDestroy();
        if (success) {
          success(model, resp);
        } else {
          model.trigger('sync', model, resp, options);
        }
      };

      options.error = Backbone.wrapError(options.error, model, options);
      var xhr = (this.sync || Backbone.sync).call(this, 'delete', this, options);
      if (!options.wait) triggerDestroy();
      return xhr;
    },

    // Default URL for the model's representation on the server -- if you're
    // using Backbone's restful methods, override this to change the endpoint
    // that will be called.
    url: function() {
      var base = getValue(this, 'urlRoot') || getValue(this.collection, 'url') || urlError();
      if (this.isNew()) return base;
      return base + (base.charAt(base.length - 1) == '/' ? '' : '/') + encodeURIComponent(this.id);
    },

    // **parse** converts a response into the hash of attributes to be `set` on
    // the model. The default implementation is just to pass the response along.
    parse: function(resp, xhr) {
      return resp;
    },

    // Create a new model with identical attributes to this one.
    clone: function() {
      return new this.constructor(this.attributes);
    },

    // A model is new if it has never been saved to the server, and lacks an id.
    isNew: function() {
      return this.id == null;
    },

    // Call this method to manually fire a `"change"` event for this model and
    // a `"change:attribute"` event for each changed attribute.
    // Calling this will cause all objects observing the model to update.
    change: function(options) {
      options || (options = {});
      var changing = this._changing;
      this._changing = true;

      // Silent changes become pending changes.
      for (var attr in this._silent) this._pending[attr] = true;

      // Silent changes are triggered.
      var changes = _.extend({}, options.changes, this._silent);
      this._silent = {};
      for (var attr in changes) {
        this.trigger('change:' + attr, this, this.get(attr), options);
      }
      if (changing) return this;

      // Continue firing `"change"` events while there are pending changes.
      while (!_.isEmpty(this._pending)) {
        this._pending = {};
        this.trigger('change', this, options);
        // Pending and silent changes still remain.
        for (var attr in this.changed) {
          if (this._pending[attr] || this._silent[attr]) continue;
          delete this.changed[attr];
        }
        this._previousAttributes = _.clone(this.attributes);
      }

      this._changing = false;
      return this;
    },

    // Determine if the model has changed since the last `"change"` event.
    // If you specify an attribute name, determine if that attribute has changed.
    hasChanged: function(attr) {
      if (!arguments.length) return !_.isEmpty(this.changed);
      return _.has(this.changed, attr);
    },

    // Return an object containing all the attributes that have changed, or
    // false if there are no changed attributes. Useful for determining what
    // parts of a view need to be updated and/or what attributes need to be
    // persisted to the server. Unset attributes will be set to undefined.
    // You can also pass an attributes object to diff against the model,
    // determining if there *would be* a change.
    changedAttributes: function(diff) {
      if (!diff) return this.hasChanged() ? _.clone(this.changed) : false;
      var val, changed = false, old = this._previousAttributes;
      for (var attr in diff) {
        if (_.isEqual(old[attr], (val = diff[attr]))) continue;
        (changed || (changed = {}))[attr] = val;
      }
      return changed;
    },

    // Get the previous value of an attribute, recorded at the time the last
    // `"change"` event was fired.
    previous: function(attr) {
      if (!arguments.length || !this._previousAttributes) return null;
      return this._previousAttributes[attr];
    },

    // Get all of the attributes of the model at the time of the previous
    // `"change"` event.
    previousAttributes: function() {
      return _.clone(this._previousAttributes);
    },

    // Check if the model is currently in a valid state. It's only possible to
    // get into an *invalid* state if you're using silent changes.
    isValid: function() {
      return !this.validate(this.attributes);
    },

    // Run validation against the next complete set of model attributes,
    // returning `true` if all is well. If a specific `error` callback has
    // been passed, call that instead of firing the general `"error"` event.
    _validate: function(attrs, options) {
      if (options.silent || !this.validate) return true;
      attrs = _.extend({}, this.attributes, attrs);
      var error = this.validate(attrs, options);
      if (!error) return true;
      if (options && options.error) {
        options.error(this, error, options);
      } else {
        this.trigger('error', this, error, options);
      }
      return false;
    }

  });

  // Backbone.Collection
  // -------------------

  // Provides a standard collection class for our sets of models, ordered
  // or unordered. If a `comparator` is specified, the Collection will maintain
  // its models in sort order, as they're added and removed.
  var Collection = Backbone.Collection = function(models, options) {
    options || (options = {});
    if (options.model) this.model = options.model;
    if (options.comparator) this.comparator = options.comparator;
    this._reset();
    this.initialize.apply(this, arguments);
    if (models) this.reset(models, {silent: true, parse: options.parse});
  };

  // Define the Collection's inheritable methods.
  _.extend(Collection.prototype, Events, {

    // The default model for a collection is just a **Backbone.Model**.
    // This should be overridden in most cases.
    model: Model,

    // Initialize is an empty function by default. Override it with your own
    // initialization logic.
    initialize: function(){},

    // The JSON representation of a Collection is an array of the
    // models' attributes.
    toJSON: function(options) {
      return this.map(function(model){ return model.toJSON(options); });
    },

    // Add a model, or list of models to the set. Pass **silent** to avoid
    // firing the `add` event for every new model.
    add: function(models, options) {
      var i, index, length, model, cid, id, cids = {}, ids = {}, dups = [];
      options || (options = {});
      models = _.isArray(models) ? models.slice() : [models];

      // Begin by turning bare objects into model references, and preventing
      // invalid models or duplicate models from being added.
      for (i = 0, length = models.length; i < length; i++) {
        if (!(model = models[i] = this._prepareModel(models[i], options))) {
          throw new Error("Can't add an invalid model to a collection");
        }
        cid = model.cid;
        id = model.id;
        if (cids[cid] || this._byCid[cid] || ((id != null) && (ids[id] || this._byId[id]))) {
          dups.push(i);
          continue;
        }
        cids[cid] = ids[id] = model;
      }

      // Remove duplicates.
      i = dups.length;
      while (i--) {
        models.splice(dups[i], 1);
      }

      // Listen to added models' events, and index models for lookup by
      // `id` and by `cid`.
      for (i = 0, length = models.length; i < length; i++) {
        (model = models[i]).on('all', this._onModelEvent, this);
        this._byCid[model.cid] = model;
        if (model.id != null) this._byId[model.id] = model;
      }

      // Insert models into the collection, re-sorting if needed, and triggering
      // `add` events unless silenced.
      this.length += length;
      index = options.at != null ? options.at : this.models.length;
      splice.apply(this.models, [index, 0].concat(models));
      if (this.comparator) this.sort({silent: true});
      if (options.silent) return this;
      for (i = 0, length = this.models.length; i < length; i++) {
        if (!cids[(model = this.models[i]).cid]) continue;
        options.index = i;
        model.trigger('add', model, this, options);
      }
      return this;
    },

    // Remove a model, or a list of models from the set. Pass silent to avoid
    // firing the `remove` event for every model removed.
    remove: function(models, options) {
      var i, l, index, model;
      options || (options = {});
      models = _.isArray(models) ? models.slice() : [models];
      for (i = 0, l = models.length; i < l; i++) {
        model = this.getByCid(models[i]) || this.get(models[i]);
        if (!model) continue;
        delete this._byId[model.id];
        delete this._byCid[model.cid];
        index = this.indexOf(model);
        this.models.splice(index, 1);
        this.length--;
        if (!options.silent) {
          options.index = index;
          model.trigger('remove', model, this, options);
        }
        this._removeReference(model);
      }
      return this;
    },

    // Add a model to the end of the collection.
    push: function(model, options) {
      model = this._prepareModel(model, options);
      this.add(model, options);
      return model;
    },

    // Remove a model from the end of the collection.
    pop: function(options) {
      var model = this.at(this.length - 1);
      this.remove(model, options);
      return model;
    },

    // Add a model to the beginning of the collection.
    unshift: function(model, options) {
      model = this._prepareModel(model, options);
      this.add(model, _.extend({at: 0}, options));
      return model;
    },

    // Remove a model from the beginning of the collection.
    shift: function(options) {
      var model = this.at(0);
      this.remove(model, options);
      return model;
    },

    // Get a model from the set by id.
    get: function(id) {
      if (id == null) return void 0;
      return this._byId[id.id != null ? id.id : id];
    },

    // Get a model from the set by client id.
    getByCid: function(cid) {
      return cid && this._byCid[cid.cid || cid];
    },

    // Get the model at the given index.
    at: function(index) {
      return this.models[index];
    },

    // Return models with matching attributes. Useful for simple cases of `filter`.
    where: function(attrs) {
      if (_.isEmpty(attrs)) return [];
      return this.filter(function(model) {
        for (var key in attrs) {
          if (attrs[key] !== model.get(key)) return false;
        }
        return true;
      });
    },

    // Force the collection to re-sort itself. You don't need to call this under
    // normal circumstances, as the set will maintain sort order as each item
    // is added.
    sort: function(options) {
      options || (options = {});
      if (!this.comparator) throw new Error('Cannot sort a set without a comparator');
      var boundComparator = _.bind(this.comparator, this);
      if (this.comparator.length == 1) {
        this.models = this.sortBy(boundComparator);
      } else {
        this.models.sort(boundComparator);
      }
      if (!options.silent) this.trigger('reset', this, options);
      return this;
    },

    // Pluck an attribute from each model in the collection.
    pluck: function(attr) {
      return _.map(this.models, function(model){ return model.get(attr); });
    },

    // When you have more items than you want to add or remove individually,
    // you can reset the entire set with a new list of models, without firing
    // any `add` or `remove` events. Fires `reset` when finished.
    reset: function(models, options) {
      models  || (models = []);
      options || (options = {});
      for (var i = 0, l = this.models.length; i < l; i++) {
        this._removeReference(this.models[i]);
      }
      this._reset();
      this.add(models, _.extend({silent: true}, options));
      if (!options.silent) this.trigger('reset', this, options);
      return this;
    },

    // Fetch the default set of models for this collection, resetting the
    // collection when they arrive. If `add: true` is passed, appends the
    // models to the collection instead of resetting.
    fetch: function(options) {
      options = options ? _.clone(options) : {};
      if (options.parse === undefined) options.parse = true;
      var collection = this;
      var success = options.success;
      options.success = function(resp, status, xhr) {
        collection[options.add ? 'add' : 'reset'](collection.parse(resp, xhr), options);
        if (success) success(collection, resp);
      };
      options.error = Backbone.wrapError(options.error, collection, options);
      return (this.sync || Backbone.sync).call(this, 'read', this, options);
    },

    // Create a new instance of a model in this collection. Add the model to the
    // collection immediately, unless `wait: true` is passed, in which case we
    // wait for the server to agree.
    create: function(model, options) {
      var coll = this;
      options = options ? _.clone(options) : {};
      model = this._prepareModel(model, options);
      if (!model) return false;
      if (!options.wait) coll.add(model, options);
      var success = options.success;
      options.success = function(nextModel, resp, xhr) {
        if (options.wait) coll.add(nextModel, options);
        if (success) {
          success(nextModel, resp);
        } else {
          nextModel.trigger('sync', model, resp, options);
        }
      };
      model.save(null, options);
      return model;
    },

    // **parse** converts a response into a list of models to be added to the
    // collection. The default implementation is just to pass it through.
    parse: function(resp, xhr) {
      return resp;
    },

    // Proxy to _'s chain. Can't be proxied the same way the rest of the
    // underscore methods are proxied because it relies on the underscore
    // constructor.
    chain: function () {
      return _(this.models).chain();
    },

    // Reset all internal state. Called when the collection is reset.
    _reset: function(options) {
      this.length = 0;
      this.models = [];
      this._byId  = {};
      this._byCid = {};
    },

    // Prepare a model or hash of attributes to be added to this collection.
    _prepareModel: function(model, options) {
      options || (options = {});
      if (!(model instanceof Model)) {
        var attrs = model;
        options.collection = this;
        model = new this.model(attrs, options);
        if (!model._validate(model.attributes, options)) model = false;
      } else if (!model.collection) {
        model.collection = this;
      }
      return model;
    },

    // Internal method to remove a model's ties to a collection.
    _removeReference: function(model) {
      if (this == model.collection) {
        delete model.collection;
      }
      model.off('all', this._onModelEvent, this);
    },

    // Internal method called every time a model in the set fires an event.
    // Sets need to update their indexes when models change ids. All other
    // events simply proxy through. "add" and "remove" events that originate
    // in other collections are ignored.
    _onModelEvent: function(event, model, collection, options) {
      if ((event == 'add' || event == 'remove') && collection != this) return;
      if (event == 'destroy') {
        this.remove(model, options);
      }
      if (model && event === 'change:' + model.idAttribute) {
        delete this._byId[model.previous(model.idAttribute)];
        this._byId[model.id] = model;
      }
      this.trigger.apply(this, arguments);
    }

  });

  // Underscore methods that we want to implement on the Collection.
  var methods = ['forEach', 'each', 'map', 'reduce', 'reduceRight', 'find',
    'detect', 'filter', 'select', 'reject', 'every', 'all', 'some', 'any',
    'include', 'contains', 'invoke', 'max', 'min', 'sortBy', 'sortedIndex',
    'toArray', 'size', 'first', 'initial', 'rest', 'last', 'without', 'indexOf',
    'shuffle', 'lastIndexOf', 'isEmpty', 'groupBy'];

  // Mix in each Underscore method as a proxy to `Collection#models`.
  _.each(methods, function(method) {
    Collection.prototype[method] = function() {
      return _[method].apply(_, [this.models].concat(_.toArray(arguments)));
    };
  });

  // Backbone.Router
  // -------------------

  // Routers map faux-URLs to actions, and fire events when routes are
  // matched. Creating a new one sets its `routes` hash, if not set statically.
  var Router = Backbone.Router = function(options) {
    options || (options = {});
    if (options.routes) this.routes = options.routes;
    this._bindRoutes();
    this.initialize.apply(this, arguments);
  };

  // Cached regular expressions for matching named param parts and splatted
  // parts of route strings.
  var namedParam    = /:\w+/g;
  var splatParam    = /\*\w+/g;
  var escapeRegExp  = /[-[\]{}()+?.,\\^$|#\s]/g;

  // Set up all inheritable **Backbone.Router** properties and methods.
  _.extend(Router.prototype, Events, {

    // Initialize is an empty function by default. Override it with your own
    // initialization logic.
    initialize: function(){},

    // Manually bind a single named route to a callback. For example:
    //
    //     this.route('search/:query/p:num', 'search', function(query, num) {
    //       ...
    //     });
    //
    route: function(route, name, callback) {
      Backbone.history || (Backbone.history = new History);
      if (!_.isRegExp(route)) route = this._routeToRegExp(route);
      if (!callback) callback = this[name];
      Backbone.history.route(route, _.bind(function(fragment) {
        var args = this._extractParameters(route, fragment);
        callback && callback.apply(this, args);
        this.trigger.apply(this, ['route:' + name].concat(args));
        Backbone.history.trigger('route', this, name, args);
      }, this));
      return this;
    },

    // Simple proxy to `Backbone.history` to save a fragment into the history.
    navigate: function(fragment, options) {
      Backbone.history.navigate(fragment, options);
    },

    // Bind all defined routes to `Backbone.history`. We have to reverse the
    // order of the routes here to support behavior where the most general
    // routes can be defined at the bottom of the route map.
    _bindRoutes: function() {
      if (!this.routes) return;
      var routes = [];
      for (var route in this.routes) {
        routes.unshift([route, this.routes[route]]);
      }
      for (var i = 0, l = routes.length; i < l; i++) {
        this.route(routes[i][0], routes[i][1], this[routes[i][1]]);
      }
    },

    // Convert a route string into a regular expression, suitable for matching
    // against the current location hash.
    _routeToRegExp: function(route) {
      route = route.replace(escapeRegExp, '\\$&')
                   .replace(namedParam, '([^\/]+)')
                   .replace(splatParam, '(.*?)');
      return new RegExp('^' + route + '$');
    },

    // Given a route, and a URL fragment that it matches, return the array of
    // extracted parameters.
    _extractParameters: function(route, fragment) {
      return route.exec(fragment).slice(1);
    }

  });

  // Backbone.History
  // ----------------

  // Handles cross-browser history management, based on URL fragments. If the
  // browser does not support `onhashchange`, falls back to polling.
  var History = Backbone.History = function() {
    this.handlers = [];
    _.bindAll(this, 'checkUrl');
  };

  // Cached regex for cleaning leading hashes and slashes .
  var routeStripper = /^[#\/]/;

  // Cached regex for detecting MSIE.
  var isExplorer = /msie [\w.]+/;

  // Has the history handling already been started?
  History.started = false;

  // Set up all inheritable **Backbone.History** properties and methods.
  _.extend(History.prototype, Events, {

    // The default interval to poll for hash changes, if necessary, is
    // twenty times a second.
    interval: 50,

    // Gets the true hash value. Cannot use location.hash directly due to bug
    // in Firefox where location.hash will always be decoded.
    getHash: function(windowOverride) {
      var loc = windowOverride ? windowOverride.location : window.location;
      var match = loc.href.match(/#(.*)$/);
      return match ? match[1] : '';
    },

    // Get the cross-browser normalized URL fragment, either from the URL,
    // the hash, or the override.
    getFragment: function(fragment, forcePushState) {
      if (fragment == null) {
        if (this._hasPushState || forcePushState) {
          fragment = window.location.pathname;
          var search = window.location.search;
          if (search) fragment += search;
        } else {
          fragment = this.getHash();
        }
      }
      if (!fragment.indexOf(this.options.root)) fragment = fragment.substr(this.options.root.length);
      return fragment.replace(routeStripper, '');
    },

    // Start the hash change handling, returning `true` if the current URL matches
    // an existing route, and `false` otherwise.
    start: function(options) {
      if (History.started) throw new Error("Backbone.history has already been started");
      History.started = true;

      // Figure out the initial configuration. Do we need an iframe?
      // Is pushState desired ... is it available?
      this.options          = _.extend({}, {root: '/'}, this.options, options);
      this._wantsHashChange = this.options.hashChange !== false;
      this._wantsPushState  = !!this.options.pushState;
      this._hasPushState    = !!(this.options.pushState && window.history && window.history.pushState);
      var fragment          = this.getFragment();
      var docMode           = document.documentMode;
      var oldIE             = (isExplorer.exec(navigator.userAgent.toLowerCase()) && (!docMode || docMode <= 7));

      if (oldIE) {
        this.iframe = $('<iframe src="javascript:0" tabindex="-1" />').hide().appendTo('body')[0].contentWindow;
        this.navigate(fragment);
      }

      // Depending on whether we're using pushState or hashes, and whether
      // 'onhashchange' is supported, determine how we check the URL state.
      if (this._hasPushState) {
        $(window).bind('popstate', this.checkUrl);
      } else if (this._wantsHashChange && ('onhashchange' in window) && !oldIE) {
        $(window).bind('hashchange', this.checkUrl);
      } else if (this._wantsHashChange) {
        this._checkUrlInterval = setInterval(this.checkUrl, this.interval);
      }

      // Determine if we need to change the base url, for a pushState link
      // opened by a non-pushState browser.
      this.fragment = fragment;
      var loc = window.location;
      var atRoot  = loc.pathname == this.options.root;

      // If we've started off with a route from a `pushState`-enabled browser,
      // but we're currently in a browser that doesn't support it...
      if (this._wantsHashChange && this._wantsPushState && !this._hasPushState && !atRoot) {
        this.fragment = this.getFragment(null, true);
        window.location.replace(this.options.root + '#' + this.fragment);
        // Return immediately as browser will do redirect to new url
        return true;

      // Or if we've started out with a hash-based route, but we're currently
      // in a browser where it could be `pushState`-based instead...
      } else if (this._wantsPushState && this._hasPushState && atRoot && loc.hash) {
        this.fragment = this.getHash().replace(routeStripper, '');
        window.history.replaceState({}, document.title, loc.protocol + '//' + loc.host + this.options.root + this.fragment);
      }

      if (!this.options.silent) {
        return this.loadUrl();
      }
    },

    // Disable Backbone.history, perhaps temporarily. Not useful in a real app,
    // but possibly useful for unit testing Routers.
    stop: function() {
      $(window).unbind('popstate', this.checkUrl).unbind('hashchange', this.checkUrl);
      clearInterval(this._checkUrlInterval);
      History.started = false;
    },

    // Add a route to be tested when the fragment changes. Routes added later
    // may override previous routes.
    route: function(route, callback) {
      this.handlers.unshift({route: route, callback: callback});
    },

    // Checks the current URL to see if it has changed, and if it has,
    // calls `loadUrl`, normalizing across the hidden iframe.
    checkUrl: function(e) {
      var current = this.getFragment();
      if (current == this.fragment && this.iframe) current = this.getFragment(this.getHash(this.iframe));
      if (current == this.fragment) return false;
      if (this.iframe) this.navigate(current);
      this.loadUrl() || this.loadUrl(this.getHash());
    },

    // Attempt to load the current URL fragment. If a route succeeds with a
    // match, returns `true`. If no defined routes matches the fragment,
    // returns `false`.
    loadUrl: function(fragmentOverride) {
      var fragment = this.fragment = this.getFragment(fragmentOverride);
      var matched = _.any(this.handlers, function(handler) {
        if (handler.route.test(fragment)) {
          handler.callback(fragment);
          return true;
        }
      });
      return matched;
    },

    // Save a fragment into the hash history, or replace the URL state if the
    // 'replace' option is passed. You are responsible for properly URL-encoding
    // the fragment in advance.
    //
    // The options object can contain `trigger: true` if you wish to have the
    // route callback be fired (not usually desirable), or `replace: true`, if
    // you wish to modify the current URL without adding an entry to the history.
    navigate: function(fragment, options) {
      if (!History.started) return false;
      if (!options || options === true) options = {trigger: options};
      var frag = (fragment || '').replace(routeStripper, '');
      if (this.fragment == frag) return;

      // If pushState is available, we use it to set the fragment as a real URL.
      if (this._hasPushState) {
        if (frag.indexOf(this.options.root) != 0) frag = this.options.root + frag;
        this.fragment = frag;
        window.history[options.replace ? 'replaceState' : 'pushState']({}, document.title, frag);

      // If hash changes haven't been explicitly disabled, update the hash
      // fragment to store history.
      } else if (this._wantsHashChange) {
        this.fragment = frag;
        this._updateHash(window.location, frag, options.replace);
        if (this.iframe && (frag != this.getFragment(this.getHash(this.iframe)))) {
          // Opening and closing the iframe tricks IE7 and earlier to push a history entry on hash-tag change.
          // When replace is true, we don't want this.
          if(!options.replace) this.iframe.document.open().close();
          this._updateHash(this.iframe.location, frag, options.replace);
        }

      // If you've told us that you explicitly don't want fallback hashchange-
      // based history, then `navigate` becomes a page refresh.
      } else {
        window.location.assign(this.options.root + fragment);
      }
      if (options.trigger) this.loadUrl(fragment);
    },

    // Update the hash location, either replacing the current entry, or adding
    // a new one to the browser history.
    _updateHash: function(location, fragment, replace) {
      if (replace) {
        location.replace(location.toString().replace(/(javascript:|#).*$/, '') + '#' + fragment);
      } else {
        location.hash = fragment;
      }
    }
  });

  // Backbone.View
  // -------------

  // Creating a Backbone.View creates its initial element outside of the DOM,
  // if an existing element is not provided...
  var View = Backbone.View = function(options) {
    this.cid = _.uniqueId('view');
    this._configure(options || {});
    this._ensureElement();
    this.initialize.apply(this, arguments);
    this.delegateEvents();
  };

  // Cached regex to split keys for `delegate`.
  var delegateEventSplitter = /^(\S+)\s*(.*)$/;

  // List of view options to be merged as properties.
  var viewOptions = ['model', 'collection', 'el', 'id', 'attributes', 'className', 'tagName'];

  // Set up all inheritable **Backbone.View** properties and methods.
  _.extend(View.prototype, Events, {

    // The default `tagName` of a View's element is `"div"`.
    tagName: 'div',

    // jQuery delegate for element lookup, scoped to DOM elements within the
    // current view. This should be prefered to global lookups where possible.
    $: function(selector) {
      return this.$el.find(selector);
    },

    // Initialize is an empty function by default. Override it with your own
    // initialization logic.
    initialize: function(){},

    // **render** is the core function that your view should override, in order
    // to populate its element (`this.el`), with the appropriate HTML. The
    // convention is for **render** to always return `this`.
    render: function() {
      return this;
    },

    // Remove this view from the DOM. Note that the view isn't present in the
    // DOM by default, so calling this method may be a no-op.
    remove: function() {
      this.$el.remove();
      return this;
    },

    // For small amounts of DOM Elements, where a full-blown template isn't
    // needed, use **make** to manufacture elements, one at a time.
    //
    //     var el = this.make('li', {'class': 'row'}, this.model.escape('title'));
    //
    make: function(tagName, attributes, content) {
      var el = document.createElement(tagName);
      if (attributes) $(el).attr(attributes);
      if (content) $(el).html(content);
      return el;
    },

    // Change the view's element (`this.el` property), including event
    // re-delegation.
    setElement: function(element, delegate) {
      if (this.$el) this.undelegateEvents();
      this.$el = (element instanceof $) ? element : $(element);
      this.el = this.$el[0];
      if (delegate !== false) this.delegateEvents();
      return this;
    },

    // Set callbacks, where `this.events` is a hash of
    //
    // *{"event selector": "callback"}*
    //
    //     {
    //       'mousedown .title':  'edit',
    //       'click .button':     'save'
    //       'click .open':       function(e) { ... }
    //     }
    //
    // pairs. Callbacks will be bound to the view, with `this` set properly.
    // Uses event delegation for efficiency.
    // Omitting the selector binds the event to `this.el`.
    // This only works for delegate-able events: not `focus`, `blur`, and
    // not `change`, `submit`, and `reset` in Internet Explorer.
    delegateEvents: function(events) {
      if (!(events || (events = getValue(this, 'events')))) return;
      this.undelegateEvents();
      for (var key in events) {
        var method = events[key];
        if (!_.isFunction(method)) method = this[events[key]];
        if (!method) throw new Error('Method "' + events[key] + '" does not exist');
        var match = key.match(delegateEventSplitter);
        var eventName = match[1], selector = match[2];
        method = _.bind(method, this);
        eventName += '.delegateEvents' + this.cid;
        if (selector === '') {
          this.$el.bind(eventName, method);
        } else {
          this.$el.delegate(selector, eventName, method);
        }
      }
    },

    // Clears all callbacks previously bound to the view with `delegateEvents`.
    // You usually don't need to use this, but may wish to if you have multiple
    // Backbone views attached to the same DOM element.
    undelegateEvents: function() {
      this.$el.unbind('.delegateEvents' + this.cid);
    },

    // Performs the initial configuration of a View with a set of options.
    // Keys with special meaning *(model, collection, id, className)*, are
    // attached directly to the view.
    _configure: function(options) {
      if (this.options) options = _.extend({}, this.options, options);
      for (var i = 0, l = viewOptions.length; i < l; i++) {
        var attr = viewOptions[i];
        if (options[attr]) this[attr] = options[attr];
      }
      this.options = options;
    },

    // Ensure that the View has a DOM element to render into.
    // If `this.el` is a string, pass it through `$()`, take the first
    // matching element, and re-assign it to `el`. Otherwise, create
    // an element from the `id`, `className` and `tagName` properties.
    _ensureElement: function() {
      if (!this.el) {
        var attrs = getValue(this, 'attributes') || {};
        if (this.id) attrs.id = this.id;
        if (this.className) attrs['class'] = this.className;
        this.setElement(this.make(this.tagName, attrs), false);
      } else {
        this.setElement(this.el, false);
      }
    }

  });

  // The self-propagating extend function that Backbone classes use.
  var extend = function (protoProps, classProps) {
    var child = inherits(this, protoProps, classProps);
    child.extend = this.extend;
    return child;
  };

  // Set up inheritance for the model, collection, and view.
  Model.extend = Collection.extend = Router.extend = View.extend = extend;

  // Backbone.sync
  // -------------

  // Map from CRUD to HTTP for our default `Backbone.sync` implementation.
  var methodMap = {
    'create': 'POST',
    'update': 'PUT',
    'delete': 'DELETE',
    'read':   'GET'
  };

  // Override this function to change the manner in which Backbone persists
  // models to the server. You will be passed the type of request, and the
  // model in question. By default, makes a RESTful Ajax request
  // to the model's `url()`. Some possible customizations could be:
  //
  // * Use `setTimeout` to batch rapid-fire updates into a single request.
  // * Send up the models as XML instead of JSON.
  // * Persist models via WebSockets instead of Ajax.
  //
  // Turn on `Backbone.emulateHTTP` in order to send `PUT` and `DELETE` requests
  // as `POST`, with a `_method` parameter containing the true HTTP method,
  // as well as all requests with the body as `application/x-www-form-urlencoded`
  // instead of `application/json` with the model in a param named `model`.
  // Useful when interfacing with server-side languages like **PHP** that make
  // it difficult to read the body of `PUT` requests.
  Backbone.sync = function(method, model, options) {
    var type = methodMap[method];

    // Default options, unless specified.
    options || (options = {});

    // Default JSON-request options.
    var params = {type: type, dataType: 'json'};

    // Ensure that we have a URL.
    if (!options.url) {
      params.url = getValue(model, 'url') || urlError();
    }

    // Ensure that we have the appropriate request data.
    if (!options.data && model && (method == 'create' || method == 'update')) {
      params.contentType = 'application/json';
      params.data = JSON.stringify(model.toJSON());
    }

    // For older servers, emulate JSON by encoding the request into an HTML-form.
    if (Backbone.emulateJSON) {
      params.contentType = 'application/x-www-form-urlencoded';
      params.data = params.data ? {model: params.data} : {};
    }

    // For older servers, emulate HTTP by mimicking the HTTP method with `_method`
    // And an `X-HTTP-Method-Override` header.
    if (Backbone.emulateHTTP) {
      if (type === 'PUT' || type === 'DELETE') {
        if (Backbone.emulateJSON) params.data._method = type;
        params.type = 'POST';
        params.beforeSend = function(xhr) {
          xhr.setRequestHeader('X-HTTP-Method-Override', type);
        };
      }
    }

    // Don't process data on a non-GET request.
    if (params.type !== 'GET' && !Backbone.emulateJSON) {
      params.processData = false;
    }

    // Make the request, allowing the user to override any Ajax options.
    return $.ajax(_.extend(params, options));
  };

  // Wrap an optional error callback with a fallback error event.
  Backbone.wrapError = function(onError, originalModel, options) {
    return function(model, resp) {
      resp = model === originalModel ? resp : model;
      if (onError) {
        onError(originalModel, resp, options);
      } else {
        originalModel.trigger('error', originalModel, resp, options);
      }
    };
  };

  // Helpers
  // -------

  // Shared empty constructor function to aid in prototype-chain creation.
  var ctor = function(){};

  // Helper function to correctly set up the prototype chain, for subclasses.
  // Similar to `goog.inherits`, but uses a hash of prototype properties and
  // class properties to be extended.
  var inherits = function(parent, protoProps, staticProps) {
    var child;

    // The constructor function for the new subclass is either defined by you
    // (the "constructor" property in your `extend` definition), or defaulted
    // by us to simply call the parent's constructor.
    if (protoProps && protoProps.hasOwnProperty('constructor')) {
      child = protoProps.constructor;
    } else {
      child = function(){ parent.apply(this, arguments); };
    }

    // Inherit class (static) properties from parent.
    _.extend(child, parent);

    // Set the prototype chain to inherit from `parent`, without calling
    // `parent`'s constructor function.
    ctor.prototype = parent.prototype;
    child.prototype = new ctor();

    // Add prototype properties (instance properties) to the subclass,
    // if supplied.
    if (protoProps) _.extend(child.prototype, protoProps);

    // Add static properties to the constructor function, if supplied.
    if (staticProps) _.extend(child, staticProps);

    // Correctly set child's `prototype.constructor`.
    child.prototype.constructor = child;

    // Set a convenience property in case the parent's prototype is needed later.
    child.__super__ = parent.prototype;

    return child;
  };

  // Helper function to get a value from a Backbone object as a property
  // or as a function.
  var getValue = function(object, prop) {
    if (!(object && object[prop])) return null;
    return _.isFunction(object[prop]) ? object[prop]() : object[prop];
  };

  // Throw an error when a URL is needed, and none is supplied.
  var urlError = function() {
    throw new Error('A "url" property or function must be specified');
  };

}).call(this);
/*

Copyright (c) 2011 Henri Bergius, IKS Consortium
Copyright (c) 2011 Sebastian Germesin, IKS Consortium

Permission is hereby granted, free of charge, to any person
obtaining a copy of this software and associated documentation
files (the "Software"), to deal in the Software without
restriction, including without limitation the rights to use,
copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the
Software is furnished to do so, subject to the following
conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
OTHER DEALINGS IN THE SOFTWARE.
*/

(function(){
//     VIE - Vienna IKS Editables
//     (c) 2011 Henri Bergius, IKS Consortium
//     (c) 2011 Sebastian Germesin, IKS Consortium
//     (c) 2011 Szaby Grünwald, IKS Consortium
//     VIE may be freely distributed under the MIT license.
//     For all details and documentation:
//     http://viejs.org/

/*global console:false exports:false require:false */

var root = this,
    jQuery = root.jQuery,
    Backbone = root.Backbone,
    _ = root._;


// ## VIE constructor
//
// The VIE constructor is the way to initialize VIE for your
// application. The instance of VIE handles all management of
// semantic interaction, including keeping track of entities,
// changes to them, the possible RDFa views on the page where
// the entities are displayed, and connections to external
// services like Stanbol and DBPedia.
//
// To get a VIE instance, simply run:
//
//     var vie = new VIE();
//
// You can also pass configurations to the VIE instance through
// the constructor. For example, to set a different default
// namespace to be used for names that don't have a namespace
// specified, do:
//
//     var vie = new VIE({
//         baseNamespace: 'http://example.net'
//     });
//
// ### Differences with VIE 1.x
//
// VIE 1.x used singletons for managing entities and views loaded
// from a page. This has been changed with VIE 2.x, and now all
// data managed by VIE is tied to the instance of VIE being used.
//
// This means that VIE needs to be instantiated before using. So,
// when previously you could get entities from page with:
//
//     VIE.RDFaEntities.getInstances();
//
// Now you need to instantiate VIE first. This example uses the
// Classic API compatibility layer instead of the `load` method:
//
//     var vie = new VIE();
//     vie.RDFaEntities.getInstances();
//
// Currently the Classic API is enabled by default, but it is
// recommended to ensure it is enabled before using it. So:
//
//     var vie = new VIE({classic: true});
//     vie.RDFaEntities.getInstances();
var VIE = root.VIE = function(config) {
    this.config = (config) ? config : {};
    this.services = {};
    this.jQuery = jQuery;
    this.entities = new this.Collection([], {
        vie: this
    });

    this.Entity.prototype.entities = this.entities;
    this.Entity.prototype.entityCollection = this.Collection;
    this.Entity.prototype.vie = this;

    this.Namespaces.prototype.vie = this;
// ### Namespaces in VIE
// VIE supports different ontologies and an easy use of them.
// Namespace prefixes reduce the amount of code you have to
// write. In VIE, it does not matter if you access an entitie's
// property with
// `entity.get('<http://dbpedia.org/property/capitalOf>')` or
// `entity.get('dbprop:capitalOf')` or even
// `entity.get('capitalOf')` once the corresponding namespace
// is registered as *baseNamespace*.
// By default `"http://viejs.org/ns/"`is set as base namespace.
// For more information about how to set, get and list all
// registered namespaces, refer to the
// <a href="Namespace.html">Namespaces documentation</a>.
    this.namespaces = new this.Namespaces(
        (this.config.baseNamespace) ? this.config.baseNamespace : "http://viejs.org/ns/",

// By default, VIE is shipped with common namespace prefixes:

// +    owl    : "http://www.w3.org/2002/07/owl#"
// +    rdfs   : "http://www.w3.org/2000/01/rdf-schema#"
// +    rdf    : "http://www.w3.org/1999/02/22-rdf-syntax-ns#"
// +    schema : 'http://schema.org/'
// +    foaf   : 'http://xmlns.com/foaf/0.1/'
// +    geo    : 'http://www.w3.org/2003/01/geo/wgs84_pos#'
// +    dbpedia: "http://dbpedia.org/ontology/"
// +    dbprop : "http://dbpedia.org/property/"
// +    skos   : "http://www.w3.org/2004/02/skos/core#"
// +    xsd    : "http://www.w3.org/2001/XMLSchema#"
// +    sioc   : "http://rdfs.org/sioc/ns#"
// +    dcterms: "http://purl.org/dc/terms/"
        {
            owl    : "http://www.w3.org/2002/07/owl#",
            rdfs   : "http://www.w3.org/2000/01/rdf-schema#",
            rdf    : "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
            schema : 'http://schema.org/',
            foaf   : 'http://xmlns.com/foaf/0.1/',
            geo    : 'http://www.w3.org/2003/01/geo/wgs84_pos#',
            dbpedia: "http://dbpedia.org/ontology/",
            dbprop : "http://dbpedia.org/property/",
            skos   : "http://www.w3.org/2004/02/skos/core#",
            xsd    : "http://www.w3.org/2001/XMLSchema#",
            sioc   : "http://rdfs.org/sioc/ns#",
            dcterms: "http://purl.org/dc/terms/"
        }
    );


    this.Type.prototype.vie = this;
    this.Types.prototype.vie = this;
    this.Attribute.prototype.vie = this;
    this.Attributes.prototype.vie = this;
// ### Type hierarchy in VIE
// VIE takes care about type hierarchy of entities
// (aka. *schema* or *ontology*).
// Once a type hierarchy is known to VIE, we can leverage
// this information, to easily ask, whether an entity
// is of type, e.g., *foaf:Person* or *schema:Place*.
// For more information about how to generate such a type
// hierarchy, refer to the
// <a href="Type.html">Types documentation</a>.
    this.types = new this.Types();
// By default, there is a parent type in VIE, called
// *owl:Thing*. All types automatically inherit from this
// type and all registered entities, are of this type.
    this.types.add("owl:Thing");

// As described above, the Classic API of VIE 1.x is loaded
// by default. As this might change in the future, it is
// recommended to ensure it is enabled before using it. So:
//
//     var vie = new VIE({classic: true});
//     vie.RDFaEntities.getInstances();
    if (this.config.classic === true) {
        /* Load Classic API as well */
        this.RDFa = new this.ClassicRDFa(this);
        this.RDFaEntities = new this.ClassicRDFaEntities(this);
        this.EntityManager = new this.ClassicEntityManager(this);

        this.cleanup = function() {
            this.entities.reset();
        };
    }
};

// ### use(service, name)
// This method registers services within VIE.
// **Parameters**:
// *{string|object}* **service** The service to be registered.
// *{string}* **name** An optional name to register the service with. If this
// is not set, the default name that comes with the service is taken.
// **Throws**:
// *nothing*
// **Returns**:
// *{VIE}* : The current VIE instance.
// **Example usage**:
//
//     var vie = new VIE();
//     var conf1 = {...};
//     var conf2 = {...};
//     vie.use(new vie.StanbolService());
//     vie.use(new vie.StanbolService(conf1), "stanbol_1");
//     vie.use(new vie.StanbolService(conf2), "stanbol_2");
//     // <-- this means that there are now 3 services registered!
VIE.prototype.use = function(service, name) {
  if (!name && !service.name) {
    throw new Error("Please provide a name for the service!");
  }
  service.vie = this;
  service.name = (name)? name : service.name;
  if (service.init) {
      service.init();
  }
  this.services[service.name] = service;

  return this;
};

// ### service(name)
// This method returns the service object that is
// registered under the given name.
// **Parameters**:
// *{string}* **name** ...
// **Throws**:
// *{Error}* if no service could be found.
// **Returns**:
// *{object}* : The service to be queried.
// **Example usage**:
//
//     var vie = new VIE();
//     vie.use(new vie.StanbolService(), "stanbol");
//     var service = vie.service("stanbol");
VIE.prototype.service = function(name) {
  if (!this.hasService(name)) {
    throw "Undefined service " + name;
  }
  return this.services[name];
};

// ### hasService(name)
// This method returns a boolean telling whether VIE has a particular
// service loaded.
// **Parameters**:
// *{string}* **name**
// **Returns**:
// *{boolean}* whether service is available
VIE.prototype.hasService = function(name) {
  if (!this.services[name]) {
    return false;
  }
  return true;
};

// ### getServicesArray()
// This method returns an array of all registered services.
// **Parameters**:
// *nothing*
// **Throws**:
// *nothing*
// **Returns**:
// *{array}* : An array of service instances.
// **Example usage**:
//
//     var vie = new VIE();
//     vie.use(new vie.StanbolService(), "stanbol");
//     var services = vie.getServicesArray();
//     services.length; // <-- 1
VIE.prototype.getServicesArray = function() {
  return _.map(this.services, function (v) {return v;});
};

// ### load(options)
// This method instantiates a new VIE.Loadable in order to
// perform queries on the services.
// **Parameters**:
// *{object}* **options** Options to be set.
// **Throws**:
// *nothing*
// **Returns**:
// *{VIE.Loadable}* : A new instance of VIE.Loadable.
// **Example usage**:
//
//     var vie = new VIE();
//     vie.use(new vie.StanbolService(), "stanbol");
//     var loader = vie.load({...});
VIE.prototype.load = function(options) {
  if (!options) { options = {}; }
  options.vie = this;
  return new this.Loadable(options);
};

// ### save(options)
// This method instantiates a new VIE.Savable in order to
// perform queries on the services.
// **Parameters**:
// *{object}* **options** Options to be set.
// **Throws**:
// *nothing*
// **Returns**:
// *{VIE.Savable}* : A new instance of VIE.Savable.
// **Example usage**:
//
//     var vie = new VIE();
//     vie.use(new vie.StanbolService(), "stanbol");
//     var saver = vie.save({...});
VIE.prototype.save = function(options) {
  if (!options) { options = {}; }
  options.vie = this;
  return new this.Savable(options);
};

// ### remove(options)
// This method instantiates a new VIE.Removable in order to
// perform queries on the services.
// **Parameters**:
// *{object}* **options** Options to be set.
// **Throws**:
// *nothing*
// **Returns**:
// *{VIE.Removable}* : A new instance of VIE.Removable.
// **Example usage**:
//
//     var vie = new VIE();
//     vie.use(new vie.StanbolService(), "stanbol");
//     var remover = vie.remove({...});
VIE.prototype.remove = function(options) {
  if (!options) { options = {}; }
  options.vie = this;
  return new this.Removable(options);
};

// ### analyze(options)
// This method instantiates a new VIE.Analyzable in order to
// perform queries on the services.
// **Parameters**:
// *{object}* **options** Options to be set.
// **Throws**:
// *nothing*
// **Returns**:
// *{VIE.Analyzable}* : A new instance of VIE.Analyzable.
// **Example usage**:
//
//     var vie = new VIE();
//     vie.use(new vie.StanbolService(), "stanbol");
//     var analyzer = vie.analyze({...});
VIE.prototype.analyze = function(options) {
  if (!options) { options = {}; }
  options.vie = this;
  return new this.Analyzable(options);
};

// ### find(options)
// This method instantiates a new VIE.Findable in order to
// perform queries on the services.
// **Parameters**:
// *{object}* **options** Options to be set.
// **Throws**:
// *nothing*
// **Returns**:
// *{VIE.Findable}* : A new instance of VIE.Findable.
// **Example usage**:
//
//     var vie = new VIE();
//     vie.use(new vie.StanbolService(), "stanbol");
//     var finder = vie.find({...});
VIE.prototype.find = function(options) {
  if (!options) { options = {}; }
  options.vie = this;
  return new this.Findable(options);
};

// ### loadSchema(url, options)
// VIE only knows the *owl:Thing* type by default.
// You can use this method to import another
// schema (ontology) from an external resource.
// (Currently, this supports only the JSON format!!)
// As this method works asynchronously, you might want
// to register `success` and `error` callbacks via the
// options.
// **Parameters**:
// *{string}* **url** The url, pointing to the schema to import.
// *{object}* **options** Options to be set.
// (Set ```success``` and ```error``` as callbacks.).
// **Throws**:
// *{Error}* if the url is not set.
// **Returns**:
// *{VIE}* : The VIE instance itself.
// **Example usage**:
//
//     var vie = new VIE();
//     vie.loadSchema("http://schema.rdfs.org/all.json",
//        {
//          baseNS : "http://schema.org/",
//          success : function () {console.log("success");},
//          error  : function (msg) {console.warn(msg);}
//        });
VIE.prototype.loadSchema = function(url, options) {
    options = (!options)? {} : options;

    if (!url) {
        throw new Error("Please provide a proper URL");
    }
    else {
        var vie = this;
        jQuery.getJSON(url)
        .success(function(data) {
            try {
                VIE.Util.loadSchemaOrg(vie, data, options.baseNS);
                if (options.success) {
                    options.success.call(vie);
                }
            } catch (e) {
                options.error.call(vie, e);
                return;
            }
         })
        .error(function(data, textStatus, jqXHR) {
            if (options.error) {
                console.warn(data, textStatus, jqXHR);
                options.error.call(vie, "Could not load schema from URL (" + url + ")");
            }
         });
    }

    return this;
};

// ### getTypedEntityClass(type)
// This method generates a special type of `Entity` based on the given type.
// **Parameters**:
// *{string}* **type** The type.
// **Throws**:
// *{Error}* if the type is unknown to VIE.
// **Returns**:
// *{VIE.Entity}* : A subclass of `VIE.Entity`.
// **Example usage**:
//
//     var vie = new VIE();
//     vie.types.add("Person");
//     var PersonClass = vie.getTypedEntityClass("Person");
//     var Person = new PersonClass({"name", "Sebastian"});
VIE.prototype.getTypedEntityClass = function (type) {
  var typeType = this.types.get(type);
  if (!typeType) {
    throw new Error("Unknown type " + type);
  }
  var TypedEntityClass = function (attrs, opts) {
    if (!attrs) {
      attrs = {};
    }
    attrs["@type"] = type;
    this.set(attrs, opts);
  };
  TypedEntityClass.prototype = new this.Entity();
  TypedEntityClass.prototype.schema = function () {
    return VIE.Util.getFormSchemaForType(typeType);
  };
  return TypedEntityClass;
};

// ## Running VIE on Node.js
//
// When VIE is running under Node.js we can use the CommonJS
// require interface to load our dependencies automatically.
//
// This means Node.js users don't need to care about dependencies
// and can just run VIE with:
//
//     var VIE = require('vie');
//
// In browser environments the dependencies have to be included
// before including VIE itself.
if (typeof exports === 'object') {
    exports.VIE = VIE;

    if (!jQuery) {
        jQuery = require('jquery');
    }
    if (!Backbone) {
        Backbone = require('backbone');
        Backbone.setDomLibrary(jQuery);
    }
    if (!_) {
        _ = require('underscore')._;
    }
}
//     VIE - Vienna IKS Editables
//     (c) 2011 Henri Bergius, IKS Consortium
//     (c) 2011 Sebastian Germesin, IKS Consortium
//     (c) 2011 Szaby Grünwald, IKS Consortium
//     VIE may be freely distributed under the MIT license.
//     For all details and documentation:
//     http://viejs.org/

// ## VIE.Able
// VIE implements asynchronius service methods through
// [jQuery.Deferred](http://api.jquery.com/category/deferred-object/) objects.
// Loadable, Analysable, Savable, etc. are part of the VIE service API and
// are implemented with the generic VIE.Able class.
// Example:
//
//      VIE.prototype.Loadable = function (options) {
//          this.init(options,"load");
//      };
//      VIE.prototype.Loadable.prototype = new VIE.prototype.Able();
//
// This defines
//
//     someVIEService.load(options)
//     .using(...)
//     .execute()
//     .success(...)
//     .fail(...)
// which will run the asynchronius `load` function of the service with the created Loadable
// object.

// ### VIE.Able()
// This is the constructor of a VIE.Able. This should not be called
// globally but using the inherited classes below.
// **Parameters**:
// *nothing*
// **Throws**:
// *nothing*
// **Returns**:
// *{VIE.Able}* : A **new** VIE.Able object.
// Example:
//
//      VIE.prototype.Loadable = function (options) {
//          this.init(options,"load");
//      };
//      VIE.prototype.Loadable.prototype = new VIE.prototype.Able();
VIE.prototype.Able = function(){

// ### init(options, methodName)
// Internal method, called during initialization.
// **Parameters**:
// *{object}* **options** the *able* options coming from the API call
// *{string}* **methodName** the service method called on `.execute`.
// **Throws**:
// *nothing*
// **Returns**:
// *{VIE.Able}* : The current instance.
// **Example usage**:
//
//      VIE.prototype.Loadable = function (options) {
//          this.init(options,"load");
//      };
//      VIE.prototype.Loadable.prototype = new VIE.prototype.Able();
    this.init = function(options, methodName) {
        this.options = options;
        this.services = options.from || options.using || options.to || [];
        this.vie = options.vie;

        this.methodName = methodName;

        // Instantiate the deferred object
        this.deferred = jQuery.Deferred();

// In order to get more information and documentation about the passed-through
// deferred methods and their synonyms, please see the documentation of
// the [jQuery.Deferred object](http://api.jquery.com/category/deferred-object/)
        /* Public deferred-methods */
        this.resolve = this.deferred.resolve;
        this.resolveWith = this.deferred.resolveWith;
        this.reject = this.deferred.reject;
        this.rejectWith = this.deferred.rejectWith;
        this.success = this.done = this.deferred.done;
        this.fail = this.deferred.fail;
        this.then = this.deferred.then;
        this.always = this.deferred.always;
        this.from = this.using;
        this.to = this.using;

        return this;
    };


// ### using(services)
// This method registers services with the current able instance.
// **Parameters**:
// *{string|array}* **services** An id of a service or an array of strings.
// **Throws**:
// *nothing*
// **Returns**:
// *{VIE.Able}* : The current instance.
// **Example usage**:
//
//     var loadable = vie.load({id: "http://example.com/entity/1234"});
//     able.using("myService");
    this.using = function(services) {
        var self = this;
        services = (_.isArray(services))? services : [ services ];
        _.each (services, function (s) {
            var obj = (typeof s === "string")? self.vie.service(s) : s;
            self.services.push(obj);
        });
        return this;
    };

// ### execute()
// This method runs the actual method on all registered services.
// **Parameters**:
// *nothing*
// **Throws**:
// *nothing* ...
// **Returns**:
// *{VIE.Able}* : The current instance.
// **Example usage**:
//
//     var able = new vie.Able().init();
//     able.using("stanbol")
//     .done(function () {alert("finished");})
//     .execute();
    this.execute = function() {
        /* call service[methodName] */
        var able = this;
        _(this.services).each(function(service){
            service[able.methodName](able);
        });
        return this;
    };
};

// ## VIE.Loadable
// A ```VIE.Loadable``` is a wrapper around the deferred object
// to **load** semantic data from a semantic web service.
VIE.prototype.Loadable = function (options) {
    this.init(options,"load");
};
VIE.prototype.Loadable.prototype = new VIE.prototype.Able();

// ## VIE.Savable
// A ```VIE.Savable``` is a wrapper around the deferred object
// to **save** entities by a VIE service. The RDFaService would write the data
// in the HTML as RDFa, the StanbolService stores the data in its Entityhub, etc.
VIE.prototype.Savable = function(options){
    this.init(options, "save");
};
VIE.prototype.Savable.prototype = new VIE.prototype.Able();

// ## VIE.Removable
// A ```VIE.Removable``` is a wrapper around the deferred object
// to **remove** semantic data from a semantic web service.
VIE.prototype.Removable = function(options){
    this.init(options, "remove");
};
VIE.prototype.Removable.prototype = new VIE.prototype.Able();

// ## VIE.Analyzable
// A ```VIE.Analyzable``` is a wrapper around the deferred object
// to **analyze** data and extract semantic information with the
// help of a semantic web service.
VIE.prototype.Analyzable = function (options) {
    this.init(options, "analyze");
};
VIE.prototype.Analyzable.prototype = new VIE.prototype.Able();

// ## VIE.Findable
// A ```VIE.Findable``` is a wrapper around the deferred object
// to **find** semantic data on a semantic storage.
VIE.prototype.Findable = function (options) {
    this.init(options, "find");
};
VIE.prototype.Findable.prototype = new VIE.prototype.Able();

//     VIE - Vienna IKS Editables
//     (c) 2011 Henri Bergius, IKS Consortium
//     (c) 2011 Sebastian Germesin, IKS Consortium
//     (c) 2011 Szaby Grünwald, IKS Consortium
//     VIE may be freely distributed under the MIT license.
//     For all details and documentation:
//     http://viejs.org/

// ## VIE Utils
//
// The here-listed methods are utility methods for the day-to-day
// VIE.js usage. All methods are within the static namespace ```VIE.Util```.
VIE.Util = {

// ### VIE.Util.toCurie(uri, safe, namespaces)
// This method converts a given
// URI into a CURIE (or SCURIE), based on the given ```VIE.Namespaces``` object.
// If the given uri is already a URI, it is left untouched and directly returned.
// If no prefix could be found, an ```Error``` is thrown.
// **Parameters**:
// *{string}* **uri** The URI to be transformed.
// *{boolean}* **safe** A flag whether to generate CURIEs or SCURIEs.
// *{VIE.Namespaces}* **namespaces** The namespaces to be used for the prefixes.
// **Throws**:
// *{Error}* If no prefix could be found in the passed namespaces.
// **Returns**:
// *{string}* The CURIE or SCURIE.
// **Example usage**:
//
//     var ns = new myVIE.Namespaces(
//           "http://viejs.org/ns/",
//           { "dbp": "http://dbpedia.org/ontology/" }
//     );
//     var uri = "<http://dbpedia.org/ontology/Person>";
//     VIE.Util.toCurie(uri, false, ns); // --> dbp:Person
//     VIE.Util.toCurie(uri, true, ns); // --> [dbp:Person]
    toCurie : function (uri, safe, namespaces) {
        if (VIE.Util.isCurie(uri, namespaces)) {
            return uri;
        }
        var delim = ":";
        for (var k in namespaces.toObj()) {
            if (uri.indexOf(namespaces.get(k)) === 1) {
                var pattern = new RegExp("^" + "<?" + namespaces.get(k));
                if (k === '') {
                    delim = '';
                }
                return ((safe)? "[" : "") +
                        uri.replace(pattern, k + delim).replace(/>$/, '') +
                        ((safe)? "]" : "");
            }
        }
        throw new Error("No prefix found for URI '" + uri + "'!");
    },

// ### VIE.Util.isCurie(curie, namespaces)
// This method checks, whether
// the given string is a CURIE and returns ```true``` if so and ```false```otherwise.
// **Parameters**:
// *{string}* **curie** The CURIE (or SCURIE) to be checked.
// *{VIE.Namespaces}* **namespaces** The namespaces to be used for the prefixes.
// **Throws**:
// *nothing*
// **Returns**:
// *{boolean}* ```true``` if the given curie is a CURIE or SCURIE and ```false``` otherwise.
// **Example usage**:
//
//     var ns = new myVIE.Namespaces(
//           "http://viejs.org/ns/",
//           { "dbp": "http://dbpedia.org/ontology/" }
//     );
//     var uri = "<http://dbpedia.org/ontology/Person>";
//     var curie = "dbp:Person";
//     var scurie = "[dbp:Person]";
//     var text = "This is some text.";
//     VIE.Util.isCurie(uri, ns);    // --> false
//     VIE.Util.isCurie(curie, ns);  // --> true
//     VIE.Util.isCurie(scurie, ns); // --> true
//     VIE.Util.isCurie(text, ns);   // --> false
    isCurie : function (curie, namespaces) {
        if (VIE.Util.isUri(curie)) {
            return false;
        } else {
            try {
                VIE.Util.toUri(curie, namespaces);
                return true;
            } catch (e) {
                return false;
            }
        }
    },

// ### VIE.Util.toUri(curie, namespaces)
// This method converts a
// given CURIE (or save CURIE) into a URI, based on the given ```VIE.Namespaces``` object.
// **Parameters**:
// *{string}* **curie** The CURIE to be transformed.
// *{VIE.Namespaces}* **namespaces** The namespaces object
// **Throws**:
// *{Error}* If no URI could be assembled.
// **Returns**:
// *{string}* : A string, representing the URI.
// **Example usage**:
//
//     var ns = new myVIE.Namespaces(
//           "http://viejs.org/ns/",
//           { "dbp": "http://dbpedia.org/ontology/" }
//     );
//     var curie = "dbp:Person";
//     var scurie = "[dbp:Person]";
//     VIE.Util.toUri(curie, ns);
//          --> <http://dbpedia.org/ontology/Person>
//     VIE.Util.toUri(scurie, ns);
//          --> <http://dbpedia.org/ontology/Person>
    toUri : function (curie, namespaces) {
        if (VIE.Util.isUri(curie)) {
            return curie;
        }
        var delim = ":";
        for (var prefix in namespaces.toObj()) {
            if (prefix !== "" && (curie.indexOf(prefix + ":") === 0 || curie.indexOf("[" + prefix + ":") === 0)) {
                var pattern = new RegExp("^" + "\\[{0,1}" + prefix + delim);
                return "<" + curie.replace(pattern, namespaces.get(prefix)).replace(/\]{0,1}$/, '') + ">";
            }
        }
        /* check for the default namespace */
        if (curie.indexOf(delim) === -1) {
            return "<" + namespaces.base() + curie + ">";
        }
        throw new Error("No prefix found for CURIE '" + curie + "'!");
    },

// ### VIE.Util.isUri(something)
// This method checks, whether the given string is a URI.
// **Parameters**:
// *{string}* **something** : The string to be checked.
// **Throws**:
// *nothing*
// **Returns**:
// *{boolean}* : ```true``` if the string is a URI, ```false``` otherwise.
// **Example usage**:
//
//     var uri = "<http://dbpedia.org/ontology/Person>";
//     var curie = "dbp:Person";
//     VIE.Util.isUri(uri);   // --> true
//     VIE.Util.isUri(curie); // --> false
    isUri : function (something) {
        return (typeof something === "string" && something.search(/^<.+>$/) === 0);
    },

// ### VIE.Util.mapAttributeNS(attr, ns)
// This method maps an attribute of an entity into namespaces if they have CURIEs.
// **Parameters**:
// *{string}* **attr** : The attribute to be transformed.
// *{VIE.Namespaces}* **ns** : The namespaces.
// **Throws**:
// *nothing*
// **Returns**:
// *{string}* : The transformed attribute's name.
// **Example usage**:
//
//      var attr = "name";
//      var ns = myVIE.namespaces;
//      VIE.Util.mapAttributeNS(attr, ns); // '<' + ns.base() + attr + '>';
    mapAttributeNS : function (attr, ns) {
        var a = attr;
        if (ns.isUri (attr) || attr.indexOf('@') === 0) {
            //ignore
        } else if (ns.isCurie(attr)) {
            a = ns.uri(attr);
        } else if (!ns.isUri(attr)) {
            if (attr.indexOf(":") === -1) {
                a = '<' + ns.base() + attr + '>';
            } else {
                a = '<' + attr + '>';
            }
        }
        return a;
    },

// ### VIE.Util.rdf2Entities(service, results)
// This method converts *rdf/json* data from an external service
// into VIE.Entities.
// **Parameters**:
// *{object}* **service** The service that retrieved the data.
// *{object}* **results** The data to be transformed.
// **Throws**:
// *nothing*
// **Returns**:
// *{[VIE.Entity]}* : An array, containing VIE.Entity instances which have been transformed from the given data.
    rdf2Entities: function (service, results) {
        if (typeof jQuery.rdf !== 'function') {
            /* fallback if no rdfQuery has been loaded */
            return VIE.Util._rdf2EntitiesNoRdfQuery(service, results);
        }
        try {
            var rdf = (results instanceof jQuery.rdf)?
                    results.base(service.vie.namespaces.base()) :
                        jQuery.rdf().base(service.vie.namespaces.base()).load(results, {});

            /* if the service contains rules to apply special transformation, they are executed here.*/
            if (service.rules) {
                var rules = jQuery.rdf.ruleset();
                for (var prefix in service.vie.namespaces.toObj()) {
                    if (prefix !== "") {
                        rules.prefix(prefix, service.vie.namespaces.get(prefix));
                    }
                }
                for (var i = 0; i < service.rules.length; i++)if(service.rules.hasOwnProperty(i)) {
                    var rule = service.rules[i];
                    rules.add(rule.left, rule.right);
                }
                rdf = rdf.reason(rules, 10); /* execute the rules only 10 times to avoid looping */
            }
            var entities = {};
            rdf.where('?subject ?property ?object').each(function() {
                var subject = this.subject.toString();
                if (!entities[subject]) {
                    entities[subject] = {
                        '@subject': subject,
                        '@context': service.vie.namespaces.toObj(true),
                        '@type': []
                    };
                }
                var propertyUri = this.property.toString();
                var propertyCurie;

                try {
                    propertyCurie = service.vie.namespaces.curie(propertyUri);
                    //jQuery.createCurie(propertyUri, {namespaces: service.vie.namespaces.toObj(true)});
                } catch (e) {
                    propertyCurie = propertyUri;
                    // console.warn(propertyUri + " doesn't have a namespace definition in '", service.vie.namespaces.toObj());
                }
                entities[subject][propertyCurie] = entities[subject][propertyCurie] || [];

                function getValue(rdfQueryLiteral){
                    if(typeof rdfQueryLiteral.value === "string"){
                        if (rdfQueryLiteral.lang){
                            var literal = {
                                toString: function(){
                                    return this["@value"];
                                },
                                "@value": rdfQueryLiteral.value.replace(/^"|"$/g, ''),
                                "@language": rdfQueryLiteral.lang
                            };
                            return literal;
                        }
                        else
                            return rdfQueryLiteral.value;
                        return rdfQueryLiteral.value.toString();
                    } else if (rdfQueryLiteral.type === "uri"){
                        return rdfQueryLiteral.toString();
                    } else {
                        return rdfQueryLiteral.value;
                    }
                }
                entities[subject][propertyCurie].push(getValue(this.object));
            });

            _(entities).each(function(ent){
                ent["@type"] = ent["@type"].concat(ent["rdf:type"]);
                delete ent["rdf:type"];
                _(ent).each(function(value, property){
                    if(value.length === 1){
                        ent[property] = value[0];
                    }
                });
            });

            var vieEntities = [];
            jQuery.each(entities, function() {
                var entityInstance = new service.vie.Entity(this);
                entityInstance = service.vie.entities.addOrUpdate(entityInstance);
                vieEntities.push(entityInstance);
            });
            return vieEntities;
        } catch (e) {
            console.warn("Something went wrong while parsing the returned results!", e);
            return [];
        }
    },

    /*
    VIE.Util.getPreferredLangForPreferredProperty(entity, preferredFields, preferredLanguages)
    looks for specific ranking fields and languages. It calculates all possibilities and gives them
    a score. It returns the value with the best score.
    */
    getPreferredLangForPreferredProperty: function(entity, preferredFields, preferredLanguages) {
      var l, labelArr, lang, p, property, resArr, valueArr, _len, _len2,
        _this = this;
      resArr = [];
      /* Try to find a label in the preferred language
      */
      _.each(preferredLanguages, function (lang) {
        _.each(preferredFields, function (property) {
          labelArr = null;
          /* property can be a string e.g. "skos:prefLabel"
          */
          if (typeof property === "string" && entity.get(property)) {
            labelArr = _.flatten([entity.get(property)]);
            _(labelArr).each(function(label) {
              /*
              The score is a natural number with 0 for the
              best candidate with the first preferred language
              and first preferred property
              */
              var labelLang, score, value;
              score = p;
              labelLang = label["@language"];
              /*
                                      legacy code for compatibility with uotdated stanbol,
                                      to be removed after may 2012
              */
              if (typeof label === "string" && (label.indexOf("@") === label.length - 3 || label.indexOf("@") === label.length - 5)) {
                labelLang = label.replace(/(^\"*|\"*@)..(..)?$/g, "");
              }
              /* end of legacy code
              */
              if (labelLang) {
                if (labelLang === lang) {
                  score += l;
                } else {
                  score += 20;
                }
              } else {
                score += 10;
              }
              value = label.toString();
              /* legacy code for compatibility with uotdated stanbol, to be removed after may 2012
              */
              value = value.replace(/(^\"*|\"*@..$)/g, "");
              /* end of legacy code
              */
              return resArr.push({
                score: score,
                value: value
              });
            });
            /*
            property can be an object like
            {
              property: "skos:broader",
              makeLabel: function(propertyValueArr) { return "..."; }
            }
            */
          } else if (typeof property === "object" && entity.get(property.property)) {
            valueArr = _.flatten([entity.get(property.property)]);
            valueArr = _(valueArr).map(function(termUri) {
              if (termUri.isEntity) {
                return termUri.getSubject();
              } else {
                return termUri;
              }
            });
            resArr.push({
              score: p,
              value: property.makeLabel(valueArr)
            });
          }
        });
      });
      /*
              take the result with the best score
      */
      resArr = _(resArr).sortBy(function(a) {
        return a.score;
      });
      if(resArr.length) {
        return resArr[0].value;
      } else {
        return "n/a";
      }
    },


// ### VIE.Util._rdf2EntitiesNoRdfQuery(service, results)
// This is a **private** method which should
// only be accessed through ```VIE.Util._rdf2Entities()``` and is a helper method in case there is no
// rdfQuery loaded (*not recommended*).
// **Parameters**:
// *{object}* **service** The service that retrieved the data.
// *{object}* **results** The data to be transformed.
// **Throws**:
// *nothing*
// **Returns**:
// *{[VIE.Entity]}* : An array, containing VIE.Entity instances which have been transformed from the given data.
    _rdf2EntitiesNoRdfQuery: function (service, results) {
        var jsonLD = [];
        _.forEach(results, function(value, key) {
            var entity = {};
            entity['@subject'] = '<' + key + '>';
            _.forEach(value, function(triples, predicate) {
                predicate = '<' + predicate + '>';
                _.forEach(triples, function(triple) {
                    if (triple.type === 'uri') {
                        triple.value = '<' + triple.value + '>';
                    }

                    if (entity[predicate] && !_.isArray(entity[predicate])) {
                        entity[predicate] = [entity[predicate]];
                    }

                    if (_.isArray(entity[predicate])) {
                        entity[predicate].push(triple.value);
                        return;
                    }
                    entity[predicate] = triple.value;
                });
            });
            jsonLD.push(entity);
        });
        return jsonLD;
    },

// ### VIE.Util.loadSchemaOrg(vie, SchemaOrg, baseNS)
// This method is a wrapper around
// the <a href="http://schema.org/">schema.org</a> ontology. It adds all the
// given types and properties as ```VIE.Type``` instances to the given VIE instance.
// If the paramenter **baseNS** is set, the method automatically sets the namespace
// to the provided one. If it is not set, it will keep the base namespace of VIE untouched.
// **Parameters**:
// *{VIE}* **vie** The instance of ```VIE```.
// *{object}* **SchemaOrg** The data imported from schema.org.
// *{string|undefined}* **baseNS** If set, this will become the new baseNamespace within the given ```VIE``` instance.
// **Throws**:
// *{Error}* If the parameter was not given.
// **Returns**:
// *nothing*
    loadSchemaOrg : function (vie, SchemaOrg, baseNS) {

        if (!SchemaOrg) {
            throw new Error("Please load the schema.json file.");
        }
        vie.types.remove("<http://schema.org/Thing>");

        var baseNSBefore = (baseNS)? baseNS : vie.namespaces.base();
        vie.namespaces.base(baseNS);

        var datatypeMapping = {
            'DataType': 'xsd:anyType',
            'Boolean' : 'xsd:boolean',
            'Date'    : 'xsd:date',
            'DateTime': 'xsd:dateTime',
            'Time'    : 'xsd:time',
            'Float'   : 'xsd:float',
            'Integer' : 'xsd:integer',
            'Number'  : 'xsd:anySimpleType',
            'Text'    : 'xsd:string',
            'URL'     : 'xsd:anyURI'
        };

        var dataTypeHelper = function (ancestors, id) {
            var type = vie.types.add(id, [{'id' : 'value', 'range' : datatypeMapping[id]}]);

            for (var i = 0; i < ancestors.length; i++) {
                var supertype = (vie.types.get(ancestors[i]))? vie.types.get(ancestors[i]) :
                    dataTypeHelper.call(vie, SchemaOrg.datatypes[ancestors[i]].supertypes, ancestors[i]);
                type.inherit(supertype);
            }
            return type;
        };

        for (var dt in SchemaOrg.datatypes) {
            if (!vie.types.get(dt)) {
                var ancestors = SchemaOrg.datatypes[dt].supertypes;
                dataTypeHelper.call(vie, ancestors, dt);
            }
        }

        var metadataHelper = function (definition) {
            var metadata = {};

            if (definition.label) {
              metadata.label = definition.label;
            }

            if (definition.url) {
              metadata.url = definition.url;
            }

            if (definition.comment) {
              metadata.comment = definition.comment;
            }

            if (definition.metadata) {
              metadata = _.extend(metadata, definition.metadata);
            }
            return metadata;
        };

        var typeProps = function (id) {
            var props = [];
            _.each(SchemaOrg.types[id].specific_properties, function (pId) {
                var property = SchemaOrg.properties[pId];
                props.push({
                    'id'    : property.id,
                    'range' : property.ranges,
                    'min'   : property.min,
                    'max'   : property.max,
                    'metadata': metadataHelper(property)
                });
            });
            return props;
        };

        var typeHelper = function (ancestors, id, props, metadata) {
            var type = vie.types.add(id, props, metadata);

            for (var i = 0; i < ancestors.length; i++) {
                var supertype = (vie.types.get(ancestors[i]))? vie.types.get(ancestors[i]) :
                    typeHelper.call(vie, SchemaOrg.types[ancestors[i]].supertypes, ancestors[i], typeProps.call(vie, ancestors[i]), metadataHelper(SchemaOrg.types[ancestors[i]]));
                type.inherit(supertype);
            }
            if (id === "Thing" && !type.isof("owl:Thing")) {
                type.inherit("owl:Thing");
            }
            return type;
        };

        _.each(SchemaOrg.types, function (typeDef) {
            if (vie.types.get(typeDef.id)) {
                return;
            }
            var ancestors = typeDef.supertypes;
            var metadata = metadataHelper(typeDef);
            typeHelper.call(vie, ancestors, typeDef.id, typeProps.call(vie, typeDef.id), metadata);
        });

        /* set the namespace to either the old value or the provided baseNS value */
        vie.namespaces.base(baseNSBefore);
    },

// ### VIE.Util.getEntityTypeUnion(entity)
// This generates a entity-specific VIE type that is a subtype of all the
// types of the entity. This makes it easier to deal with attribute definitions
// specific to an entity because they're merged to a single list. This custom
// type is transient, meaning that it won't be automatilly added to the entity
// or the VIE type registry.
    getEntityTypeUnion : function(entity) {
      var vie = entity.vie;
      return new vie.Type('Union').inherit(entity.get('@type'));
    },

// ### VIE.Util.getFormSchemaForType(type)
// This creates a [Backbone Forms](https://github.com/powmedia/backbone-forms)
// -compatible form schema for any VIE Type.
    getFormSchemaForType : function(type, allowNested) {
      var schema = {};

      // Generate a schema
      _.each(type.attributes.toArray(), function (attribute) {
        var key = VIE.Util.toCurie(attribute.id, false, attribute.vie.namespaces);
        schema[key] = VIE.Util.getFormSchemaForAttribute(attribute);
      });

      // Clean up unknown attribute types
      _.each(schema, function (field, id) {
        if (!field.type) {
          delete schema[id];
        }

        if (field.type === 'URL') {
          field.type = 'Text';
          field.dataType = 'url';
        }

        if (field.type === 'List' && !field.listType) {
          delete schema[id];
        }

        if (!allowNested) {
          if (field.type === 'NestedModel' || field.listType === 'NestedModel') {
            delete schema[id];
          }
        }
      });

      return schema;
    },

/// ### VIE.Util.getFormSchemaForAttribute(attribute)
    getFormSchemaForAttribute : function(attribute) {
      var primaryType = attribute.range[0];
      var schema = {};

      var getWidgetForType = function (type) {
        switch (type) {
          case 'xsd:anySimpleType':
          case 'xsd:float':
          case 'xsd:integer':
            return 'Number';
          case 'xsd:string':
            return 'Text';
          case 'xsd:date':
            return 'Date';
          case 'xsd:dateTime':
            return 'DateTime';
          case 'xsd:boolean':
            return 'Checkbox';
          case 'xsd:anyURI':
            return 'URL';
          default:
            var typeType = attribute.vie.types.get(type);
            if (!typeType) {
              return null;
            }
            if (typeType.attributes.get('value')) {
              // Convert to proper xsd type
              return getWidgetForType(typeType.attributes.get('value').range[0]);
            }
            return 'NestedModel';
        }
      };

      // TODO: Generate a nicer label
      schema.title = VIE.Util.toCurie(attribute.id, false, attribute.vie.namespaces);

      // TODO: Handle attributes linking to other VIE entities

      if (attribute.min > 0) {
        schema.validators = ['required'];
      }

      if (attribute.max > 1) {
        schema.type = 'List';
        schema.listType = getWidgetForType(primaryType);
        if (schema.listType === 'NestedModel') {
          schema.nestedModelType = primaryType;
        }
        return schema;
      }

      schema.type = getWidgetForType(primaryType);
      if (schema.type === 'NestedModel') {
        schema.nestedModelType = primaryType;
      }
      return schema;
    },

// ### VIE.Util.getFormSchema(entity)
// This creates a [Backbone Forms](https://github.com/powmedia/backbone-forms)
// -compatible form schema for any VIE Entity. The form schema creation
// utilizes type information attached to the entity.
// **Parameters**:
// *{```Entity```}* **entity** An instance of VIE ```Entity```.
// **Throws**:
// *nothing*..
// **Returns**:
// *{object}* a JavaScript object representation of the form schema
    getFormSchema : function(entity) {
      if (!entity || !entity.isEntity) {
        return {};
      }

      var unionType = VIE.Util.getEntityTypeUnion(entity);
      var schema = VIE.Util.getFormSchemaForType(unionType, true);

      // Handle nested models
      _.each(schema, function (property, id) {
        if (property.type !== 'NestedModel' && property.listType !== 'NestedModel') {
          return;
        }
        schema[id].model = entity.vie.getTypedEntityClass(property.nestedModelType);
      });

      return schema;
    },

// ### VIE.Util.xsdDateTime(date)
// This transforms a ```Date``` instance into an xsd:DateTime format.
// **Parameters**:
// *{```Date```}* **date** An instance of a javascript ```Date```.
// **Throws**:
// *nothing*..
// **Returns**:
// *{string}* A string representation of the dateTime in the xsd:dateTime format.
    xsdDateTime : function(date) {
        function pad(n) {
            var s = n.toString();
            return s.length < 2 ? '0'+s : s;
        }

        var yyyy = date.getFullYear();
        var mm1  = pad(date.getMonth()+1);
        var dd   = pad(date.getDate());
        var hh   = pad(date.getHours());
        var mm2  = pad(date.getMinutes());
        var ss   = pad(date.getSeconds());

        return yyyy +'-' +mm1 +'-' +dd +'T' +hh +':' +mm2 +':' +ss;
    },

// ### VIE.Util.extractLanguageString(entity, attrs, langs)
// This method extracts a literal string from an entity, searching through the given attributes and languages.
// **Parameters**:
// *{```VIE.Entity```}* **entity** An instance of a VIE.Entity.
// *{```array|string```}* **attrs** Either a string or an array of possible attributes.
// *{```array|string```}* **langs** Either a string or an array of possible languages.
// **Throws**:
// *nothing*..
// **Returns**:
// *{string|undefined}* The string that was found at the attribute with the wanted language, undefined if nothing could be found.
// **Example usage**:
//
//          var attrs = ["name", "rdfs:label"];
//          var langs = ["en", "de"];
//          VIE.Util.extractLanguageString(someEntity, attrs, langs); // "Barack Obama";
    extractLanguageString : function(entity, attrs, langs) {
        var p, attr, name, i, n;
        if (entity && typeof entity !== "string") {
            attrs = (_.isArray(attrs))? attrs : [ attrs ];
            langs = (_.isArray(langs))? langs : [ langs ];
            for (p = 0; p < attrs.length; p++) {
                for (var l = 0; l < langs.length; l++) {
                    var lang = langs[l];
                    attr = attrs[p];
                    if (entity.has(attr)) {
                        name = entity.get(attr);
                        name = (_.isArray(name))? name : [ name ];
                        for (i = 0; i < name.length; i++) {
                            n = name[i];
                            if (n.isEntity) {
                                n = VIE.Util.extractLanguageString(n, attrs, lang);
                            } else if (typeof n === "string") {
                                n = n;
                            } else {
                                n = "";
                            }
                            if (n && n.indexOf('@' + lang) > -1) {
                                return n.replace(/"/g, "").replace(/@[a-z]+/, '').trim();
                            }
                        }
                    }
                }
            }
            /* let's do this again in case we haven't found a name but are dealing with
            broken data where no language is given */
            for (p = 0; p < attrs.length; p++) {
                attr = attrs[p];
                if (entity.has(attr)) {
                    name = entity.get(attr);
                    name = (_.isArray(name))? name : [ name ];
                    for (i = 0; i < name.length; i++) {
                        n = name[i];
                        if (n.isEntity) {
                            n = VIE.Util.extractLanguageString(n, attrs, []);
                        }
                        if (n && (typeof n === "string") && n.indexOf('@') === -1) {
                            return n.replace(/"/g, "").replace(/@[a-z]+/, '').trim();
                        }
                    }
                }
            }
        }
        return undefined;
    },

// ### VIE.Util.transformationRules(service)
// This returns a default set of rdfQuery rules that transform semantic data into the
// VIE entity types.
// **Parameters**:
// *{object}* **service** An instance of a vie.service.
// **Throws**:
// *nothing*..
// **Returns**:
// *{array}* An array of rules with 'left' and 'right' side.
    transformationRules : function (service) {
        var res = [
            // rule(s) to transform a dbpedia:Person into a VIE:Person
             {
                'left' : [
                    '?subject a dbpedia:Person',
                    '?subject rdfs:label ?label'
                 ],
                 'right': function(ns){
                     return function(){
                         return [
                             jQuery.rdf.triple(this.subject.toString(),
                                 'a',
                                 '<' + ns.base() + 'Person>', {
                                     namespaces: ns.toObj()
                                 }),
                             jQuery.rdf.triple(this.subject.toString(),
                                 '<' + ns.base() + 'name>',
                                 this.label, {
                                     namespaces: ns.toObj()
                                 })
                             ];
                     };
                 }(service.vie.namespaces)
             },
             // rule(s) to transform a foaf:Person into a VIE:Person
             {
             'left' : [
                     '?subject a foaf:Person',
                     '?subject rdfs:label ?label'
                  ],
                  'right': function(ns){
                      return function(){
                          return [
                              jQuery.rdf.triple(this.subject.toString(),
                                  'a',
                                  '<' + ns.base() + 'Person>', {
                                      namespaces: ns.toObj()
                                  }),
                              jQuery.rdf.triple(this.subject.toString(),
                                  '<' + ns.base() + 'name>',
                                  this.label, {
                                      namespaces: ns.toObj()
                                  })
                              ];
                      };
                  }(service.vie.namespaces)
              },
             // rule(s) to transform a dbpedia:Place into a VIE:Place
             {
                 'left' : [
                     '?subject a dbpedia:Place',
                     '?subject rdfs:label ?label'
                  ],
                  'right': function(ns) {
                      return function() {
                          return [
                          jQuery.rdf.triple(this.subject.toString(),
                              'a',
                              '<' + ns.base() + 'Place>', {
                                  namespaces: ns.toObj()
                              }),
                          jQuery.rdf.triple(this.subject.toString(),
                                  '<' + ns.base() + 'name>',
                              this.label.toString(), {
                                  namespaces: ns.toObj()
                              })
                          ];
                      };
                  }(service.vie.namespaces)
              },
             // rule(s) to transform a dbpedia:City into a VIE:City
              {
                 'left' : [
                     '?subject a dbpedia:City',
                     '?subject rdfs:label ?label',
                     '?subject dbpedia:abstract ?abs',
                     '?subject dbpedia:country ?country'
                  ],
                  'right': function(ns) {
                      return function() {
                          return [
                          jQuery.rdf.triple(this.subject.toString(),
                              'a',
                              '<' + ns.base() + 'City>', {
                                  namespaces: ns.toObj()
                              }),
                          jQuery.rdf.triple(this.subject.toString(),
                                  '<' + ns.base() + 'name>',
                              this.label.toString(), {
                                  namespaces: ns.toObj()
                              }),
                          jQuery.rdf.triple(this.subject.toString(),
                                  '<' + ns.base() + 'description>',
                              this.abs.toString(), {
                                  namespaces: ns.toObj()
                              }),
                          jQuery.rdf.triple(this.subject.toString(),
                                  '<' + ns.base() + 'containedIn>',
                              this.country.toString(), {
                                  namespaces: ns.toObj()
                              })
                          ];
                      };
                  }(service.vie.namespaces)
              }
        ];
        return res;
    },

    getAdditionalRules : function (service) {

        var mapping = {
            Work : "CreativeWork",
            Film : "Movie",
            TelevisionEpisode : "TVEpisode",
            TelevisionShow : "TVSeries", // not listed as equivalent class on dbpedia.org
            Website : "WebPage",
            Painting : "Painting",
            Sculpture : "Sculpture",

            Event : "Event",
            SportsEvent : "SportsEvent",
            MusicFestival : "Festival",
            FilmFestival : "Festival",

            Place : "Place",
            Continent : "Continent",
            Country : "Country",
            City : "City",
            Airport : "Airport",
            Station : "TrainStation", // not listed as equivalent class on dbpedia.org
            Hospital : "GovernmentBuilding",
            Mountain : "Mountain",
            BodyOfWater : "BodyOfWater",

            Company : "Organization",
            Person : "Person"
        };

        var additionalRules = [];
        _.each(mapping, function (map, key) {
            var tripple = {
                'left' : [ '?subject a dbpedia:' + key, '?subject rdfs:label ?label' ],
                'right' : function(ns) {
                    return function() {
                        return [ jQuery.rdf.triple(this.subject.toString(), 'a', '<' + ns.base() + map + '>', {
                            namespaces : ns.toObj()
                        }), jQuery.rdf.triple(this.subject.toString(), '<' + ns.base() + 'name>', this.label.toString(), {
                            namespaces : ns.toObj()
                        }) ];
                    };
                }(service.vie.namespaces)
            };
            additionalRules.push(tripple);
        });
        return additionalRules;
    }
};
//     VIE - Vienna IKS Editables
//     (c) 2011 Henri Bergius, IKS Consortium
//     (c) 2011 Sebastian Germesin, IKS Consortium
//     (c) 2011 Szaby Grünwald, IKS Consortium
//     VIE may be freely distributed under the MIT license.
//     For all details and documentation:
//     http://viejs.org/

// ## VIE Entities
//
// In VIE there are two low-level model types for storing data.
// **Collections** and **Entities**. Considering `var v = new VIE();` a VIE instance,
// `v.entities` is a Collection with `VIE Entity` objects in it.
// VIE internally uses JSON-LD to store entities.
//
// Each Entity has a few special attributes starting with an `@`. VIE has an API
// for correctly using these attributes, so in order to stay compatible with later
// versions of the library, possibly using a later version of JSON-LD, use the API
// to interact with your entities.
//
// * `@subject` stands for the identifier of the entity. Use `e.getSubject()`
// * `@type` stores the explicit entity types. VIE internally handles Type hierarchy,
// which basically enables to define subtypes and supertypes. Every entity has
// the type 'owl:Thing'. Read more about Types in <a href="Type.html">VIE.Type</a>.
// * `@context` stores namespace definitions used in the entity. Read more about
// Namespaces in <a href="Namespace.html">VIE Namespaces</a>.
VIE.prototype.Entity = function(attrs, opts) {

    attrs = (attrs)? attrs : {};
    opts = (opts)? opts : {};

    var self = this;

    if (attrs['@type'] !== undefined) {
        attrs['@type'] = (_.isArray(attrs['@type']))? attrs['@type'] : [ attrs['@type'] ];
        attrs['@type'] = _.map(attrs['@type'], function(val){
            if (!self.vie.types.get(val)) {
                //if there is no such type -> add it and let it inherit from "owl:Thing"
                self.vie.types.add(val).inherit("owl:Thing");
            }
            return self.vie.types.get(val).id;
        });
        attrs['@type'] = (attrs['@type'].length === 1)? attrs['@type'][0] : attrs['@type'];
    } else {
        // provide "owl:Thing" as the default type if none was given
        attrs['@type'] = self.vie.types.get("owl:Thing").id;
    }

    //the following provides full seamless namespace support
    //for attributes. It should not matter, if you
    //query for `model.get('name')` or `model.get('foaf:name')`
    //or even `model.get('http://xmlns.com/foaf/0.1/name');`
    //However, if we just overwrite `set()` and `get()`, this
    //raises a lot of side effects, so we need to expand
    //the attributes before we create the model.
    _.each (attrs, function (value, key) {
        var newKey = VIE.Util.mapAttributeNS(key, this.namespaces);
        if (key !== newKey) {
            delete attrs[key];
            attrs[newKey] = value;
        }
    }, self.vie);

    var Model = Backbone.Model.extend({
        idAttribute: '@subject',

        initialize: function(attributes, options) {
            if (attributes['@subject']) {
                this.id = this['@subject'] = this.toReference(attributes['@subject']);
            } else {
                this.id = this['@subject'] = attributes['@subject'] = this.cid.replace('c', '_:bnode');
            }
            return this;
        },

        schema: function() {
          return VIE.Util.getFormSchema(this);
        },

        // ### Getter, Has, Setter
        // #### `.get(attr)`
        // To be able to communicate to a VIE Entity you can use a simple get(property)
        // command as in `entity.get('rdfs:label')` which will give you one or more literals.
        // If the property points to a collection, its entities can be browsed further.
        get: function (attr) {
            attr = VIE.Util.mapAttributeNS(attr, self.vie.namespaces);
            var value = Backbone.Model.prototype.get.call(this, attr);
            value = (_.isArray(value))? value : [ value ];

            value = _.map(value, function(v) {
                if (v !== undefined && attr === '@type' && self.vie.types.get(v)) {
                    return self.vie.types.get(v);
                } else if (v !== undefined && self.vie.entities.get(v)) {
                    return self.vie.entities.get(v);
                } else {
                    return v;
                }
            }, this);
            if(value.length === 0) {
                return undefined;
            }
            // if there is only one element, just return that one
            value = (value.length === 1)? value[0] : value;
            return value;
        },

        // #### `.has(attr)`
        // Sometimes you'd like to determine if a specific attribute is set
        // in an entity. For this reason you can call for example `person.has('friend')`
        // to determine if a person entity has friends.
        has: function(attr) {
            attr = VIE.Util.mapAttributeNS(attr, self.vie.namespaces);
            return Backbone.Model.prototype.has.call(this, attr);
        },

        hasRelations: function() {
            var found = false;
            _.each(this.attributes, function (value) {
                if (value && value.isCollection) {
                    found = true;
                }
            });
            return found;
        },

        // #### `.set(attrName, value, opts)`,
        // The `options` parameter always refers to a `Backbone.Model.set` `options` object.
        //
        // **`.set(attributes, options)`** is the most universal way of calling the
        // `.set` method. In this case the `attributes` object is a map of all
        // attributes to be changed.
        set : function(attrs, options, opts) {
            if (!attrs) {
                return this;
            }

            if (attrs['@subject']) {
                attrs['@subject'] = this.toReference(attrs['@subject']);
            }

            // Use **`.set(attrName, value, options)`** for setting or changing exactly one
            // entity attribute.
            if (typeof attrs === "string") {
                var obj = {};
                obj[attrs] = options;
                return this.set(obj, opts);
            }
            // **`.set(entity)`**: In case you'd pass a VIE entity,
            // the passed entities attributes are being set for the entity.
            if (attrs.attributes) {
                attrs = attrs.attributes;
            }
            var self = this;
            var coll;
            // resolve shortened URIs like rdfs:label..
            _.each (attrs, function (value, key) {
                var newKey = VIE.Util.mapAttributeNS(key, self.vie.namespaces);
                if (key !== newKey) {
                    delete attrs[key];
                    attrs[newKey] = value;
                }
            }, this);
            // Finally iterate through the *attributes* to be set and prepare
            // them for the Backbone.Model.set method.
            _.each (attrs, function (value, key) {
               if (!value) { return; }
               if (key.indexOf('@') === -1) {
                   if (value.isCollection) {
                       // ignore
                       value.each(function (child) {
                           self.vie.entities.addOrUpdate(child);
                       });
                   } else if (value.isEntity) {
                       self.vie.entities.addOrUpdate(value);
                       coll = new self.vie.Collection(value, {
                         vie: self.vie,
                         predicate: key
                       });
                       attrs[key] = coll;
                   } else if (_.isArray(value)) {
                       if (this.attributes[key] && this.attributes[key].isCollection) {
                         var newEntities = this.attributes[key].addOrUpdate(value);
                         attrs[key] = this.attributes[key];
                         attrs[key].reset(newEntities);
                       }
                   } else if (value["@value"]) {
                       // The value is a literal object, ignore
                   } else if (_.isObject(value) && !_.isDate(value)) {
                       // The value is another VIE Entity
                       var child = new self.vie.Entity(value, options);
                       // which is being stored in `v.entities`
                       self.vie.entities.addOrUpdate(child);
                       // and set as VIE Collection attribute on the original entity
                       coll = new self.vie.Collection(value, {
                         vie: self.vie,
                         predicate: key
                       });
                       attrs[key] = coll;
                   } else {
                       // ignore
                   }
               }
            }, this);
            var ret = Backbone.Model.prototype.set.call(this, attrs, options);
            if (options && options.ignoreChanges) {
                // TODO: This will need to be changed to reflect now change tracking mechanisms
                // in Backbone.js 1.0.0
                this.changed = {};
                this._previousAttributes = _.clone(this.attributes);
            }
            return ret;
        },

        // **`.unset(attr, opts)` ** removes an attribute from the entity.
        unset: function (attr, opts) {
            attr = VIE.Util.mapAttributeNS(attr, self.vie.namespaces);
            return Backbone.Model.prototype.unset.call(this, attr, opts);
        },

        // Validation based on type rules.
        //
        // There are two ways to skip validation for entity operations:
        //
        // * `options.silent = true`
        // * `options.validate = false`
        validate: function (attrs, opts) {
            if (opts && opts.validate === false) {
                return;
            }
            var types = this.get('@type');
            if (_.isArray(types)) {
                var results = [];
                _.each(types, function (type) {
                    var res = this.validateByType(type, attrs, opts);
                    if (res) {
                        results.push(res);
                    }
                }, this);
                if (_.isEmpty(results)) {
                  return;
                }
                return _.flatten(results);
            }

            return this.validateByType(types, attrs, opts);
        },

        validateByType: function (type, attrs, opts) {
            var messages = {
              max: '<%= property %> cannot contain more than <%= num %> items',
              min: '<%= property %> must contain at least <%= num %> items',
              required: '<%= property %> is required'
            };

            if (!type.attributes) {
                return;
            }

            var toError = function (definition, constraint, messageValues) {
                return {
                    property: definition.id,
                    constraint: constraint,
                    message: _.template(messages[constraint], _.extend({
                        property: definition.id
                    }, messageValues))
                };
            };

            var checkMin = function (definition, attrs) {
                if (!attrs[definition.id] || _.isEmpty(attrs[definition.id])) {
                    return toError(definition, 'required', {});
                }
            };

            // Check the number of items in attr against max
            var checkMax = function (definition, attrs) {
                if (!attrs[definition.id]) {
                    return;
                }

                if (!attrs[definition.id].isCollection && !_.isArray(attrs[definition.id])) {
                    return;
                }

                if (attrs[definition.id].length > definition.max) {
                    return toError(definition, 'max', {
                        num: definition.max
                    });
                }
            };

            var results = [];
            _.each(type.attributes.list(), function (definition) {
                var res;
                if (definition.max && definition.max != -1) {
                    res = checkMax(definition, attrs);
                    if (res) {
                        results.push(res);
                    }
                }

                if (definition.min && definition.min > 0) {
                    res = checkMin(definition, attrs);
                    if (res) {
                        results.push(res);
                    }
                }
            });

            if (_.isEmpty(results)) {
              return;
            }
            return results;
        },

        isNew: function() {
            if (this.getSubjectUri().substr(0, 7) === '_:bnode') {
                return true;
            }
            return false;
        },

        hasChanged: function(attr) {
            if (this.markedChanged) {
                return true;
            }

            return Backbone.Model.prototype.hasChanged.call(this, attr);
        },

        // Force hasChanged to return true
        forceChanged: function(changed) {
            this.markedChanged = changed ? true : false;
        },

        // **`getSubject()`** is the getter for the entity identifier.
        getSubject: function(){
            if (typeof this.id === "undefined") {
                this.id = this.attributes[this.idAttribute];
            }
            if (typeof this.id === 'string') {
                if (this.id.substr(0, 7) === 'http://' || this.id.substr(0, 4) === 'urn:') {
                    return this.toReference(this.id);
                }
                return this.id;
            }
            return this.cid.replace('c', '_:bnode');
        },

        // TODO describe
        getSubjectUri: function(){
            return this.fromReference(this.getSubject());
        },

        isReference: function(uri){
            var matcher = new RegExp("^\\<([^\\>]*)\\>$");
            if (matcher.exec(uri)) {
                return true;
            }
            return false;
        },

        toReference: function(uri){
            if (_.isArray(uri)) {
              var self = this;
              return _.map(uri, function(part) {
                 return self.toReference(part);
              });
            }
            var ns = this.vie.namespaces;
            var ret = uri;
            if (uri.substring(0, 2) === "_:") {
                ret = uri;
            }
            else if (ns.isCurie(uri)) {
                ret = ns.uri(uri);
                if (ret === "<" + ns.base() + uri + ">") {
                    /* no base namespace extension with IDs */
                    ret = '<' + uri + '>';
                }
            } else if (!ns.isUri(uri)) {
                ret = '<' + uri + '>';
            }
            return ret;
        },

        fromReference: function(uri){
            var ns = this.vie.namespaces;
            if (!ns.isUri(uri)) {
                return uri;
            }
            return uri.substring(1, uri.length - 1);
        },

        as: function(encoding){
            if (encoding === "JSON") {
                return this.toJSON();
            }
            if (encoding === "JSONLD") {
                return this.toJSONLD();
            }
            throw new Error("Unknown encoding " + encoding);
        },

        toJSONLD: function(){
            var instanceLD = {};
            var instance = this;
            _.each(instance.attributes, function(value, name){
                var entityValue = value; //instance.get(name);

                if (value instanceof instance.vie.Collection) {
                    entityValue = value.map(function(instance) {
                        return instance.getSubject();
                    });
                }

                // TODO: Handle collections separately
                instanceLD[name] = entityValue;
            });

            instanceLD['@subject'] = instance.getSubject();

            return instanceLD;
        },

        // **`.setOrAdd(arg1, arg2)`** similar to `.set(..)`, `.setOrAdd(..)` can
        // be used for setting one or more attributes of an entity, but in
        // this case it's a collection of values, not just one. That means, if the
        // entity already has the attribute set, make the value to a VIE Collection
        // and use the collection as value. The collection can contain entities
        // or literals, but not both at the same time.
        setOrAdd: function (arg1, arg2, option) {
            var entity = this;
            if (typeof arg1 === "string" && arg2) {
                // calling entity.setOrAdd("rdfs:type", "example:Musician")
                entity._setOrAddOne(arg1, arg2, option);
            }
            else
                if (typeof arg1 === "object") {
                    // calling entity.setOrAdd({"rdfs:type": "example:Musician", ...})
                    _(arg1).each(function(val, key){
                        entity._setOrAddOne(key, val, arg2);
                    });
                }
            return this;
        },


        /* attr is always of type string */
        /* value can be of type: string,int,double,object,VIE.Entity,VIE.Collection */
       /*  val can be of type: undefined,string,int,double,array,VIE.Collection */

        /* depending on the type of value and the type of val, different actions need to be made */
        _setOrAddOne: function (attr, value, options) {
            if (!attr || !value)
                return;
            options = (options)? options : {};
            var v;

            attr = VIE.Util.mapAttributeNS(attr, self.vie.namespaces);

            if (_.isArray(value)) {
                for (v = 0; v < value.length; v++) {
                    this._setOrAddOne(attr, value[v], options);
                }
                return;
            }

            if (attr === "@type" && value instanceof self.vie.Type) {
                value = value.id;
            }

            var obj = {};
            var existing = Backbone.Model.prototype.get.call(this, attr);

            if (!existing) {
                obj[attr] = value;
                this.set(obj, options);
            } else if (existing.isCollection) {
                if (value.isCollection) {
                    value.each(function (model) {
                        existing.add(model);
                    });
                } else if (value.isEntity) {
                    existing.add(value);
                } else if (typeof value === "object") {
                    value = new this.vie.Entity(value);
                    existing.add(value);
                } else {
                    throw new Error("you cannot add a literal to a collection of entities!");
                }
                this.trigger('change:' + attr, this, value, {});
                this.change({});
            } else if (_.isArray(existing)) {
                if (value.isCollection) {
                    for (v = 0; v < value.size(); v++) {
                        this._setOrAddOne(attr, value.at(v).getSubject(), options);
                    }
                } else if (value.isEntity) {
                    this._setOrAddOne(attr, value.getSubject(), options);
                } else if (typeof value === "object") {
                    value = new this.vie.Entity(value);
                    this._setOrAddOne(attr, value, options);
                } else {
                    /* yes, we (have to) allow multiple equal values */
                    existing.push(value);
                    obj[attr] = existing;
                    this.set(obj);
                }
            } else {
                var arr = [ existing ];
                arr.push(value);
                obj[attr] = arr;
                return this.set(obj, options);
            }
        },

        // **`.hasType(type)`** determines if the entity has the explicit `type` set.
        hasType: function(type){
            type = self.vie.types.get(type);
            return this.hasPropertyValue("@type", type);
        },

        // TODO describe
        hasPropertyValue: function(property, value) {
            var t = this.get(property);
            if (!(value instanceof Object)) {
                value = self.vie.entities.get(value);
            }
            if (t instanceof Array) {
                return t.indexOf(value) !== -1;
            }
            else {
                return t === value;
            }
        },

        // **`.isof(type)`** determines if the entity is of `type` by explicit or implicit
        // declaration. E.g. if Employee is a subtype of Person and e Entity has
        // explicitly set type Employee, e.isof(Person) will evaluate to true.
        isof: function (type) {
            var types = this.get('@type');

            if (types === undefined) {
                return false;
            }
            types = (_.isArray(types))? types : [ types ];

            type = (self.vie.types.get(type))? self.vie.types.get(type) : new self.vie.Type(type);
            for (var t = 0; t < types.length; t++) {
                if (self.vie.types.get(types[t])) {
                    if (self.vie.types.get(types[t]).isof(type)) {
                        return true;
                    }
                } else {
                    var typeTmp = new self.vie.Type(types[t]);
                    if (typeTmp.id === type.id) {
                        return true;
                    }
                }
            }
            return false;
        },
        // TODO describe
        addTo : function (collection, update) {
            var self = this;
            if (collection instanceof self.vie.Collection) {
                if (update) {
                    collection.addOrUpdate(self);
                } else {
                    collection.add(self);
                }
                return this;
            }
            throw new Error("Please provide a proper collection of type VIE.Collection as argument!");
        },

        isEntity: true,

        vie: self.vie
    });

    return new Model(attrs, opts);
};
//     VIE - Vienna IKS Editables
//     (c) 2011 Henri Bergius, IKS Consortium
//     (c) 2011 Sebastian Germesin, IKS Consortium
//     (c) 2011 Szaby Grünwald, IKS Consortium
//     VIE may be freely distributed under the MIT license.
//     For all details and documentation:
//     http://viejs.org/
VIE.prototype.Collection = Backbone.Collection.extend({
    model: VIE.prototype.Entity,

    initialize: function (models, options) {
      if (!options || !options.vie) {
        throw new Error('Each collection needs a VIE reference');
      }
      this.vie = options.vie;
      this.predicate = options.predicate;
    },

    canAdd: function (type) {
      return true;
    },

    get: function(id) {
        if (id === null) {
            return null;
        }

        id = (id.getSubject)? id.getSubject() : id;
        if (typeof id === "string" && id.indexOf("_:") === 0) {
            if (id.indexOf("bnode") === 2) {
                //bnode!
                id = id.replace("_:bnode", 'c');
                return this._byCid[id];
            } else {
                return this._byId["<" + id + ">"];
            }
        } else {
            id = this.toReference(id);
            return this._byId[id];
        }
    },

    addOrUpdate: function(model, options) {
        options = options || {};

        var collection = this;
        var existing;
        if (_.isArray(model)) {
            var entities = [];
            _.each(model, function(item) {
                entities.push(collection.addOrUpdate(item, options));
            });
            return entities;
        }

        if (model === undefined) {
            throw new Error("No model given");
        }

        if (_.isString(model)) {
          model = {
            '@subject': model,
            id: model
          };
        }

        if (!model.isEntity) {
            model = new this.model(model);
        }

        if (model.id && this.get(model.id)) {
            existing = this.get(model.id);
        }
        if (this.getByCid(model.cid)) {
            existing = this.getByCid(model.cid);
        }
        if (existing) {
            var newAttribs = {};
            _.each(model.attributes, function(value, attribute) {
                if (!existing.has(attribute)) {
                    newAttribs[attribute] = value;
                    return true;
                }

                if (attribute === '@subject') {
                    if (model.isNew() && !existing.isNew()) {
                        // Save order issue, skip
                        return true;
                    }
                }

                if (existing.get(attribute) === value) {
                    return true;
                }
                //merge existing attribute values with new ones!
                //not just overwrite 'em!!
                var oldVals = existing.attributes[attribute];
                var newVals = value;
                if (oldVals instanceof collection.vie.Collection) {
                    // TODO: Merge collections
                    return true;
                }
                if (options.overrideAttributes) {
                   newAttribs[attribute] = value;
                   return true;
                }
                if (attribute === '@context') {
                    newAttribs[attribute] = jQuery.extend(true, {}, oldVals, newVals);
                } else {
                    oldVals = (jQuery.isArray(oldVals))? oldVals : [ oldVals ];
                    newVals = (jQuery.isArray(newVals))? newVals : [ newVals ];
                    newAttribs[attribute] = _.uniq(oldVals.concat(newVals));
                    newAttribs[attribute] = (newAttribs[attribute].length === 1)? newAttribs[attribute][0] : newAttribs[attribute];
                }
            });

            if (!_.isEmpty(newAttribs)) {
                existing.set(newAttribs, options.updateOptions);
            }
            return existing;
        }
        this.add(model, options.addOptions);
        return model;
    },

    isReference: function(uri){
        var matcher = new RegExp("^\\<([^\\>]*)\\>$");
        if (matcher.exec(uri)) {
            return true;
        }
        return false;
    },

    toReference: function(uri){
        if (this.isReference(uri)) {
            return uri;
        }
        return '<' + uri + '>';
    },

    fromReference: function(uri){
        if (!this.isReference(uri)) {
            return uri;
        }
        return uri.substring(1, uri.length - 1);
    },

    isCollection: true
});
//     VIE - Vienna IKS Editables
//     (c) 2011 Henri Bergius, IKS Consortium
//     (c) 2011 Sebastian Germesin, IKS Consortium
//     (c) 2011 Szaby Grünwald, IKS Consortium
//     VIE may be freely distributed under the MIT license.
//     For all details and documentation:
//     http://viejs.org/
//

// ## VIE.Types
// Within VIE, we provide special capabilities of handling types of entites. This helps
// for example to query easily for certain entities (e.g., you only need to query for *Person*s
// and not for all subtypes).
if (VIE.prototype.Type) {
    throw new Error("ERROR: VIE.Type is already defined. Please check your installation!");
}
if (VIE.prototype.Types) {
    throw new Error("ERROR: VIE.Types is already defined. Please check your installation!");
}

// ### VIE.Type(id, attrs, metadata)
// This is the constructor of a VIE.Type.
// **Parameters**:
// *{string}* **id** The id of the type.
// *{string|array|VIE.Attribute}* **attrs** A string, proper ```VIE.Attribute``` or an array of these which
// *{object}* **metadata** Possible metadata about the type
// are the possible attributes of the type
// **Throws**:
// *{Error}* if one of the given paramenters is missing.
// **Returns**:
// *{VIE.Type}* : A **new** VIE.Type object.
// **Example usage**:
//
//     var person = new vie.Type("Person", ["name", "knows"]);
VIE.prototype.Type = function (id, attrs, metadata) {
    if (id === undefined || typeof id !== 'string') {
        throw "The type constructor needs an 'id' of type string! E.g., 'Person'";
    }

// ### id
// This field stores the id of the type's instance.
// **Parameters**:
// nothing
// **Throws**:
// nothing
// **Returns**:
// *{string}* : The id of the type as a URI.
// **Example usage**:
//
//     console.log(person.id);
//      // --> "<http://viejs.org/ns/Person>"
    this.id = this.vie.namespaces.isUri(id) ? id : this.vie.namespaces.uri(id);

    /* checks whether such a type is already defined. */
    if (this.vie.types.get(this.id)) {
        throw new Error("The type " + this.id + " is already defined!");
    }

// ### supertypes
// This field stores all parent types of the type's instance. This
// is set if the current type inherits from another type.
// **Parameters**:
// nothing
// **Throws**:
// nothing
// **Returns**:
// *{VIE.Types}* : The supertypes (parents) of the type.
// **Example usage**:
//
//     console.log(person.supertypes);
    this.supertypes = new this.vie.Types();

// ### subtypes
// This field stores all children types of the type's instance. This
// will be set if another type inherits from the current type.
// **Parameters**:
// nothing
// **Throws**:
// nothing
// **Returns**:
// *{VIE.Types}* : The subtypes (parents) of the type.
// **Example usage**:
//
//     console.log(person.subtypes);
    this.subtypes = new this.vie.Types();

// ### attributes
// This field stores all attributes of the type's instance as
// a proper ```VIE.Attributes``` class. (see also <a href="Attribute.html">VIE.Attributes</a>)
// **Parameters**:
// nothing
// **Throws**:
// nothing
// **Returns**:
// *{VIE.Attributes}* : The attributes of the type.
// **Example usage**:
//
//     console.log(person.attributes);
    this.attributes = new this.vie.Attributes(this, (attrs)? attrs : []);

// ### metadata
// This field stores possible additional information about the type, like
// a human-readable label.
    this.metadata = metadata ? metadata : {};

// ### isof(type)
// This method checks whether the current type is a child of the given type.
// **Parameters**:
// *{string|VIE.Type}* **type** The type (or the id of that type) to be checked.
// **Throws**:
// *{Error}* If the type is not valid.
// **Returns**:
// *{boolean}* : ```true``` if the current type inherits from the type, ```false``` otherwise.
// **Example usage**:
//
//     console.log(person.isof("owl:Thing"));
//     // <-- true
    this.isof = function (type) {
        type = this.vie.types.get(type);
        if (type) {
            return type.subsumes(this.id);
        } else {
            throw new Error("No valid type given");
        }
    };

// ### subsumes(type)
// This method checks whether the current type is a parent of the given type.
// **Parameters**:
// *{string|VIE.Type}* **type** The type (or the id of that type) to be checked.
// **Throws**:
// *{Error}* If the type is not valid.
// **Returns**:
// *{boolean}* : ```true``` if the current type is a parent of the type, ```false``` otherwise.
// **Example usage**:
//
//     var x = new vie.Type(...);
//     var y = new vie.Type(...).inherit(x);
//     y.isof(x) === x.subsumes(y);
    this.subsumes = function (type) {
        type = this.vie.types.get(type);
        if (type) {
            if (this.id === type.id) {
                return true;
            }
            var subtypes = this.subtypes.list();
            for (var c = 0; c < subtypes.length; c++) {
                var childObj = subtypes[c];
                if (childObj) {
                     if (childObj.id === type.id || childObj.subsumes(type)) {
                         return true;
                     }
                }
            }
            return false;
        } else {
            throw new Error("No valid type given");
        }
    };

// ### inherit(supertype)
// This method invokes inheritance throught the types. This adds the current type to the
// subtypes of the supertype and vice versa.
// **Parameters**:
// *{string|VIE.Type|array}* **supertype** The type to be inherited from. If this is an array
// the inherit method is called sequentially on all types.
// **Throws**:
// *{Error}* If the type is not valid.
// **Returns**:
// *{VIE.Type}* : The instance itself.
// **Example usage**:
//
//     var x = new vie.Type(...);
//     var y = new vie.Type(...).inherit(x);
//     y.isof(x) // <-- true
    this.inherit = function (supertype) {
        if (typeof supertype === "string") {
            this.inherit(this.vie.types.get(supertype));
        }
        else if (supertype instanceof this.vie.Type) {
            supertype.subtypes.addOrOverwrite(this);
            this.supertypes.addOrOverwrite(supertype);
            try {
                /* only for validation of attribute-inheritance!
                   if this throws an error (inheriting two attributes
                   that cannot be combined) we reverse all changes. */
                this.attributes.list();
            } catch (e) {
                supertype.subtypes.remove(this);
                this.supertypes.remove(supertype);
                throw e;
            }
        } else if (jQuery.isArray(supertype)) {
            for (var i = 0, slen = supertype.length; i < slen; i++) {
                this.inherit(supertype[i]);
            }
        } else {
            throw new Error("Wrong argument in VIE.Type.inherit()");
        }
        return this;
    };

// ### hierarchy()
// This method serializes the hierarchy of child types into an object.
// **Parameters**:
// *nothing*
// **Throws**:
// *nothing*
// **Returns**:
// *{object}* : The hierachy of child types as an object.
// **Example usage**:
//
//     var x = new vie.Type(...);
//     var y = new vie.Type(...).inherit(x);
//     x.hierarchy();
    this.hierarchy = function () {
        var obj = {id : this.id, subtypes: []};
        var list = this.subtypes.list();
        for (var c = 0, llen = list.length; c < llen; c++) {
            var childObj = this.vie.types.get(list[c]);
            obj.subtypes.push(childObj.hierarchy());
        }
        return obj;
    };

// ### instance()
// This method creates a ```VIE.Entity``` instance from this type.
// **Parameters**:
// *{object}* **attrs**  see <a href="Entity.html">constructor of VIE.Entity</a>
// *{object}* **opts**  see <a href="Entity.html">constructor of VIE.Entity</a>
// **Throws**:
// *{Error}* if the instance could not be built
// **Returns**:
// *{VIE.Entity}* : A **new** instance of a ```VIE.Entity``` with the current type.
// **Example usage**:
//
//     var person = new vie.Type("person");
//     var sebastian = person.instance(
//         {"@subject" : "#me",
//          "name" : "Sebastian"});
//     console.log(sebastian.get("name")); // <-- "Sebastian"
    this.instance = function (attrs, opts) {
        attrs = (attrs)? attrs : {};
        opts = (opts)? opts : {};

        /* turn type/attribute checking on by default! */
        if (opts.typeChecking !== false) {
            for (var a in attrs) {
                if (a.indexOf('@') !== 0 && !this.attributes.get(a)) {
                    throw new Error("Cannot create an instance of " + this.id + " as the type does not allow an attribute '" + a + "'!");
                }
            }
        }

        if (attrs['@type']) {
            attrs['@type'].push(this.id);
        } else {
            attrs['@type'] = this.id;
        }

        return new this.vie.Entity(attrs, opts);
    };

// ### toString()
// This method returns the id of the type.
// **Parameters**:
// *nothing*
// **Throws**:
// *nothing*
// **Returns**:
// *{string}* : The id of the type.
// **Example usage**:
//
//     var x = new vie.Type(...);
//     x.toString() === x.id;
    this.toString = function () {
        return this.id;
    };
};

// ### VIE.Types()
// This is the constructor of a VIE.Types. This is a convenience class
// to store ```VIE.Type``` instances properly.
// **Parameters**:
// *nothing*
// **Throws**:
// *nothing*
// **Returns**:
// *{VIE.Types}* : A **new** VIE.Types object.
// **Example usage**:
//
//     var types = new vie.Types();
VIE.prototype.Types = function () {

    this._types = {};

// ### add(id, attrs, metadata)
// This method adds a `VIE.Type` to the types.
// **Parameters**:
// *{string|VIE.Type}* **id** If this is a string, the type is created and directly added.
// *{string|object}* **attrs** Only used if ```id``` is a string.
// *{object}* **metadata** potential additional metadata about the type.
// **Throws**:
// *{Error}* if a type with the given id already exists a ```VIE.Entity``` instance from this type.
// **Returns**:
// *{VIE.Types}* : The instance itself.
// **Example usage**:
//
//     var types = new vie.Types();
//     types.add("Person", ["name", "knows"]);
    this.add = function (id, attrs, metadata) {
        if (_.isArray(id)) {
           _.each(id, function (type) {
             this.add(type);
           }, this);
           return this;
        }

        if (this.get(id)) {
            throw new Error("Type '" + id + "' already registered.");
        }  else {
            if (typeof id === "string") {
                var t = new this.vie.Type(id, attrs, metadata);
                this._types[t.id] = t;
                return t;
            } else if (id instanceof this.vie.Type) {
                this._types[id.id] = id;
                return id;
            } else {
                throw new Error("Wrong argument to VIE.Types.add()!");
            }
        }
        return this;
    };

// ### addOrOverwrite(id, attrs)
// This method adds or overwrites a `VIE.Type` to the types. This is the same as
// ``this.remove(id); this.add(id, attrs);``
// **Parameters**:
// *{string|VIE.Type}* **id** If this is a string, the type is created and directly added.
// *{string|object}* **attrs** Only used if ```id``` is a string.
// **Throws**:
// *nothing*
// **Returns**:
// *{VIE.Types}* : The instance itself.
// **Example usage**:
//
//     var types = new vie.Types();
//     types.addOrOverwrite("Person", ["name", "knows"]);
    this.addOrOverwrite = function(id, attrs){
        if (this.get(id)) {
            this.remove(id);
        }
        return this.add(id, attrs);
    };

// ### get(id)
// This method retrieves a `VIE.Type` from the types by it's id.
// **Parameters**:
// *{string|VIE.Type}* **id** The id or the type itself.
// **Throws**:
// *nothing*
// **Returns**:
// *{VIE.Type}* : The instance of the type or ```undefined```.
// **Example usage**:
//
//     var types = new vie.Types();
//     types.addOrOverwrite("Person", ["name", "knows"]);
//     types.get("Person");
    this.get = function (id) {
        if (!id) {
            return undefined;
        }
        if (typeof id === 'string') {
            var lid = this.vie.namespaces.isUri(id) ? id : this.vie.namespaces.uri(id);
            return this._types[lid];
        } else if (id instanceof this.vie.Type) {
            return this.get(id.id);
        }
        return undefined;
    };

// ### remove(id)
// This method removes a type of given id from the type. This also
// removes all children if their only parent were this
// type. Furthermore, this removes the link from the
// super- and subtypes.
// **Parameters**:
// *{string|VIE.Type}* **id** The id or the type itself.
// **Throws**:
// *nothing*
// **Returns**:
// *{VIE.Type}* : The removed type.
// **Example usage**:
//
//     var types = new vie.Types();
//     types.addOrOverwrite("Person", ["name", "knows"]);
//     types.remove("Person");
    this.remove = function (id) {
        var t = this.get(id);
        /* test whether the type actually exists in VIE
         * and prevents removing *owl:Thing*.
         */
        if (!t) {
            return this;
        }
        if (!t || t.subsumes("owl:Thing")) {
            console.warn("You are not allowed to remove 'owl:Thing'.");
            return this;
        }
        delete this._types[t.id];

        var subtypes = t.subtypes.list();
        for (var c = 0; c < subtypes.length; c++) {
            var childObj = subtypes[c];
            if (childObj.supertypes.list().length === 1) {
                /* recursively remove all children
                   that inherit only from this type */
                this.remove(childObj);
            } else {
                childObj.supertypes.remove(t.id);
            }
        }
        return t;
    };

// ### toArray() === list()
// This method returns an array of all types.
// **Parameters**:
// *nothing*
// **Throws**:
// *nothing*
// **Returns**:
// *{array}* : An array of ```VIE.Type``` instances.
// **Example usage**:
//
//     var types = new vie.Types();
//     types.addOrOverwrite("Person", ["name", "knows"]);
//     types.list();
    this.toArray = this.list = function () {
        var ret = [];
        for (var i in this._types) {
            ret.push(this._types[i]);
        }
        return ret;
    };

// ### sort(types, desc)
// This method sorts an array of types in their order, given by the
// inheritance. This returns a copy and leaves the original array untouched.
// **Parameters**:
// *{array|VIE.Type}* **types** The array of ```VIE.Type``` instances or ids of types to be sorted.
// *{boolean}* **desc** If 'desc' is given and 'true', the array will be sorted
// in descendant order.
// *nothing*
// **Throws**:
// *nothing*
// **Returns**:
// *{array}* : A sorted copy of the array.
// **Example usage**:
//
//     var types = new vie.Types();
//     types.addOrOverwrite("Person", ["name", "knows"]);
//     types.sort(types.list(), true);
    this.sort = function (types, desc) {
        var self = this;
        types = (jQuery.isArray(types))? types : [ types ];
        desc = (desc)? true : false;

        if (types.length === 0) return [];
        var copy = [ types[0] ];
        var x, tlen;
        for (x = 1, tlen = types.length; x < tlen; x++) {
            var insert = types[x];
            var insType = self.get(insert);
            if (insType) {
                for (var y = 0; y < copy.length; y++) {
                    if (insType.subsumes(copy[y])) {
                        copy.splice(y,0,insert);
                        break;
                    } else if (y === copy.length - 1) {
                        copy.push(insert);
                    }
                }
            }
        }

        //unduplicate
        for (x = 0; x < copy.length; x++) {
            if (copy.lastIndexOf(copy[x]) !== x) {
                copy.splice(x, 1);
                x--;
            }
        }

        if (!desc) {
            copy.reverse();
        }
        return copy;
    };
};
//     VIE - Vienna IKS Editables
//     (c) 2011 Henri Bergius, IKS Consortium
//     (c) 2011 Sebastian Germesin, IKS Consortium
//     (c) 2011 Szaby Grünwald, IKS Consortium
//     VIE may be freely distributed under the MIT license.
//     For all details and documentation:
//     http://viejs.org/
//

// ## VIE.Attributes
// Within VIE, we provide special capabilities of handling attributes of types of entites. This
// helps first of all to list all attributes of an entity type, but furthermore fully supports
// inheritance of attributes from the type-class to inherit from.
if (VIE.prototype.Attribute) {
	throw new Error("ERROR: VIE.Attribute is already defined. Please check your VIE installation!");
}
if (VIE.prototype.Attributes) {
	throw new Error("ERROR: VIE.Attributes is already defined. Please check your VIE installation!");
}

// ### VIE.Attribute(id, range, domain, minCount, maxCount, metadata)
// This is the constructor of a VIE.Attribute.
// **Parameters**:
// *{string}* **id** The id of the attribute.
// *{string|array}* **range** A string or an array of strings of the target range of
// the attribute.
// *{string}* **domain** The domain of the attribute.
// *{number}* **minCount** The minimal number this attribute can occur. (needs to be >= 0)
// *{number}* **maxCount** The maximal number this attribute can occur. (needs to be >= minCount, use `-1` for unlimited)
// *{object}* **metadata** Possible metadata about the attribute
// **Throws**:
// *{Error}* if one of the given paramenters is missing.
// **Returns**:
// *{VIE.Attribute}* : A **new** VIE.Attribute object.
// **Example usage**:
//
//     var knowsAttr = new vie.Attribute("knows", ["Person"], "Person", 0, 10);
//      // Creates an attribute to describe a *knows*-relationship
//      // between persons. Each person can only have
VIE.prototype.Attribute = function (id, range, domain, minCount, maxCount, metadata) {
    if (id === undefined || typeof id !== 'string') {
        throw new Error("The attribute constructor needs an 'id' of type string! E.g., 'Person'");
    }
    if (range === undefined) {
        throw new Error("The attribute constructor of " + id + " needs 'range'.");
    }
    if (domain === undefined) {
        throw new Error("The attribute constructor of " + id + " needs a 'domain'.");
    }

    this._domain = domain;

// ### id
// This field stores the id of the attribute's instance.
// **Parameters**:
// nothing
// **Throws**:
// nothing
// **Returns**:
// *{string}* : A URI, representing the id of the attribute.
// **Example usage**:
//
//     var knowsAttr = new vie.Attribute("knows", ["Person"], "Person");
//     console.log(knowsAttr.id);
//     // --> <http://viejs.org/ns/knows>
    this.id = this.vie.namespaces.isUri(id) ? id : this.vie.namespaces.uri(id);

// ### range
// This field stores the ranges of the attribute's instance.
// **Parameters**:
// nothing
// **Throws**:
// nothing
// **Returns**:
// *{array}* : An array of strings which represent the types.
// **Example usage**:
//
//     var knowsAttr = new vie.Attribute("knows", ["Person"], "Person");
//     console.log(knowsAttr.range);
//      // --> ["Person"]
    this.range = (_.isArray(range))? range : [ range ];

// ### min
// This field stores the minimal amount this attribute can occur in the type's instance. The number
// needs to be greater or equal to zero.
// **Parameters**:
// nothing
// **Throws**:
// nothing
// **Returns**:
// *{int}* : The minimal amount this attribute can occur.
// **Example usage**:
//
//     console.log(person.min);
//      // --> 0
    minCount = minCount ? minCount : 0;
    this.min = (minCount > 0) ? minCount : 0;

// ### max
// This field stores the maximal amount this attribute can occur in the type's instance.
// This number cannot be smaller than min
// **Parameters**:
// nothing
// **Throws**:
// nothing
// **Returns**:
// *{int}* : The maximal amount this attribute can occur.
// **Example usage**:
//
//     console.log(person.max);
//      // --> 1.7976931348623157e+308
    maxCount = maxCount ? maxCount : 1;
    if (maxCount === -1) {
      maxCount = Number.MAX_VALUE;
    }
    this.max = (maxCount >= this.min)? maxCount : this.min;

// ### metadata
// This field holds potential metadata about the attribute.
    this.metadata = metadata ? metadata : {};

// ### applies(range)
// This method checks, whether the current attribute applies in the given range.
// If ```range``` is a string and cannot be transformed into a ```VIE.Type```,
// this performs only string comparison, if it is a VIE.Type
// or an ID of a VIE.Type, then inheritance is checked as well.
// **Parameters**:
// *{string|VIE.Type}* **range** The ```VIE.Type``` (or it's string representation) to be checked.
// **Throws**:
// nothing
// **Returns**:
// *{boolean}* : ```true``` if the given type applies to this attribute and ```false``` otherwise.
// **Example usage**:
//
//     var knowsAttr = new vie.Attribute("knows", ["Person"], "Person");
//     console.log(knowsAttr.applies("Person")); // --> true
//     console.log(knowsAttr.applies("Place")); // --> false
    this.applies = function (range) {
        if (this.vie.types.get(range)) {
            range = this.vie.types.get(range);
        }
        for (var r = 0, len = this.range.length; r < len; r++) {
            var x = this.vie.types.get(this.range[r]);
            if (x === undefined && typeof range === "string") {
                if (range === this.range[r]) {
                    return true;
                }
            }
            else {
                if (range.isof(this.range[r])) {
                    return true;
                }
            }
        }
        return false;
    };

};

// ## VIE.Attributes(domain, attrs)
// This is the constructor of a VIE.Attributes. Basically a convenience class
// that represents a list of ```VIE.Attribute```. As attributes are part of a
// certain ```VIE.Type```, it needs to be passed for inheritance checks.
// **Parameters**:
// *{string}* **domain** The domain of the attributes (the type they will be part of).
// *{string|VIE.Attribute|array}* **attrs** Either a string representation of an attribute,
// a proper instance of ```VIE.Attribute``` or an array of both.
// *{string}* **domain** The domain of the attribute.
// **Throws**:
// *{Error}* if one of the given paramenters is missing.
// **Returns**:
// *{VIE.Attribute}* : A **new** VIE.Attribute instance.
// **Example usage**:
//
//     var knowsAttr = new vie.Attribute("knows", ["Person"], "Person");
//     var personAttrs = new vie.Attributes("Person", knowsAttr);
VIE.prototype.Attributes = function (domain, attrs) {

    this._local = {};
    this._attributes = {};

// ### domain
// This field stores the domain of the attributes' instance.
// **Parameters**:
// nothing
// **Throws**:
// nothing
// **Returns**:
// *{string}* : The string representation of the domain.
// **Example usage**:
//
//     console.log(personAttrs.domain);
//     // --> ["Person"]
    this.domain = domain;

// ### add(id, range, min, max, metadata)
// This method adds a ```VIE.Attribute``` to the attributes instance.
// **Parameters**:
// *{string|VIE.Attribute}* **id** The string representation of an attribute, or a proper
// instance of a ```VIE.Attribute```.
// *{string|array}* **range** An array representing the target range of the attribute.
// *{number}* **min** The minimal amount this attribute can appear.
// instance of a ```VIE.Attribute```.
// *{number}* **max** The maximal amount this attribute can appear.
// *{object}* **metadata** Additional metadata for the attribute.
// **Throws**:
// *{Error}* If an atribute with the given id is already registered.
// *{Error}* If the ```id``` parameter is not a string, nor a ```VIE.Type``` instance.
// **Returns**:
// *{VIE.Attribute}* : The generated or passed attribute.
// **Example usage**:
//
//     personAttrs.add("name", "Text", 0, 1);
    this.add = function (id, range, min, max, metadata) {
        if (_.isArray(id)) {
          _.each(id, function (attribute) {
            this.add(attribute);
          }, this);
          return this;
        }

        if (this.get(id)) {
            throw new Error("Attribute '" + id + "' already registered for domain " + this.domain.id + "!");
        } else {
            if (typeof id === "string") {
                var a = new this.vie.Attribute(id, range, this.domain, min, max, metadata);
                this._local[a.id] = a;
                return a;
            } else if (id instanceof this.vie.Attribute) {
                id.domain = this.domain;
                id.vie = this.vie;
                this._local[id.id] = id;
                return id;
            } else {
                throw new Error("Wrong argument to VIE.Types.add()!");
            }
        }
    };

// ### remove(id)
// This method removes a ```VIE.Attribute``` from the attributes instance.
// **Parameters**:
// *{string|VIE.Attribute}* **id** The string representation of an attribute, or a proper
// instance of a ```VIE.Attribute```.
// **Throws**:
// *{Error}* When the attribute is inherited from a parent ```VIE.Type``` and thus cannot be removed.
// **Returns**:
// *{VIE.Attribute}* : The removed attribute.
// **Example usage**:
//
//     personAttrs.remove("knows");
    this.remove = function (id) {
        var a = this.get(id);
        if (a.id in this._local) {
            delete this._local[a.id];
            return a;
        }
        throw new Error("The attribute " + id + " is inherited and cannot be removed from the domain " + this.domain.id + "!");
    };

// ### get(id)
// This method returns a ```VIE.Attribute``` from the attributes instance by it's id.
// **Parameters**:
// *{string|VIE.Attribute}* **id** The string representation of an attribute, or a proper
// instance of a ```VIE.Attribute```.
// **Throws**:
// *{Error}* When the method is called with an unknown datatype.
// **Returns**:
// *{VIE.Attribute}* : The attribute.
// **Example usage**:
//
//     personAttrs.get("knows");
    this.get = function (id) {
        if (typeof id === 'string') {
            var lid = this.vie.namespaces.isUri(id) ? id : this.vie.namespaces.uri(id);
            return this._inherit()._attributes[lid];
        } else if (id instanceof this.vie.Attribute) {
            return this.get(id.id);
        } else {
            throw new Error("Wrong argument in VIE.Attributes.get()");
        }
    };

// ### _inherit()
// The private method ```_inherit``` creates a full list of all attributes. This includes
// local attributes as well as inherited attributes from the parents. The ranges of attributes
// with the same id will be merged. This method is called everytime an attribute is requested or
// the list of all attributes. Usually this method should not be invoked outside of the class.
// **Parameters**:
// *nothing*
// instance of a ```VIE.Attribute```.
// **Throws**:
// *nothing*
// **Returns**:
// *nothing*
// **Example usage**:
//
//     personAttrs._inherit();
    this._inherit = function () {
        var a, x, id;
        var attributes = jQuery.extend(true, {}, this._local);

        var inherited = _.map(this.domain.supertypes.list(),
            function (x) {
               return x.attributes;
            }
        );

        var add = {};
        var merge = {};
        var ilen, alen;
        for (a = 0, ilen = inherited.length; a < ilen; a++) {
            var attrs = inherited[a].list();
            for (x = 0, alen = attrs.length; x < alen; x++) {
                id = attrs[x].id;
                if (!(id in attributes)) {
                    if (!(id in add) && !(id in merge)) {
                        add[id] = attrs[x];
                    }
                    else {
                        if (!merge[id]) {
                            merge[id] = {range : [], mins : [], maxs: [], metadatas: []};
                        }
                        if (id in add) {
                            merge[id].range = jQuery.merge(merge[id].range, add[id].range);
                            merge[id].mins = jQuery.merge(merge[id].mins, [ add[id].min ]);
                            merge[id].maxs = jQuery.merge(merge[id].maxs, [ add[id].max ]);
                            merge[id].metadatas = jQuery.merge(merge[id].metadatas, [ add[id].metadata ]);
                            delete add[id];
                        }
                        merge[id].range = jQuery.merge(merge[id].range, attrs[x].range);
                        merge[id].mins = jQuery.merge(merge[id].mins, [ attrs[x].min ]);
                        merge[id].maxs = jQuery.merge(merge[id].maxs, [ attrs[x].max ]);
                        merge[id].metadatas = jQuery.merge(merge[id].metadatas, [ attrs[x].metadata ]);
                        merge[id].range = _.uniq(merge[id].range);
                        merge[id].mins = _.uniq(merge[id].mins);
                        merge[id].maxs = _.uniq(merge[id].maxs);
                        merge[id].metadatas = _.uniq(merge[id].metadatas);
                    }
                }
            }
        }

        /* adds inherited attributes that do not need to be merged */
        jQuery.extend(attributes, add);

        /* merges inherited attributes */
        for (id in merge) {
            var mranges = merge[id].range;
            var mins = merge[id].mins;
            var maxs = merge[id].maxs;
            var metadatas = merge[id].metadatas;
            var ranges = [];
            //merging ranges
            for (var r = 0, mlen = mranges.length; r < mlen; r++) {
                var p = this.vie.types.get(mranges[r]);
                var isAncestorOf = false;
                if (p) {
                    for (x = 0; x < mlen; x++) {
                        if (x === r) {
                            continue;
                        }
                        var c = this.vie.types.get(mranges[x]);
                        if (c && c.isof(p)) {
                            isAncestorOf = true;
                            break;
                        }
                    }
                }
                if (!isAncestorOf) {
                    ranges.push(mranges[r]);
                }
            }

            var maxMin = _.max(mins);
            var minMax = _.min(maxs);
            if (maxMin <= minMax && minMax >= 0 && maxMin >= 0) {
                attributes[id] = new this.vie.Attribute(id, ranges, this, maxMin, minMax, metadatas[0]);
            } else {
                throw new Error("This inheritance is not allowed because of an invalid minCount/maxCount pair!");
            }
        }

        this._attributes = attributes;
        return this;
    };

// ### toArray() === list()
// This method return an array of ```VIE.Attribute```s from the attributes instance.
// **Parameters**:
// *nothing.
// **Throws**:
// *nothing*
// **Returns**:
// *{array}* : An array of ```VIE.Attribute```.
// **Example usage**:
//
//     personAttrs.list();
    this.toArray = this.list = function (range) {
        var ret = [];
        var attributes = this._inherit()._attributes;
        for (var a in attributes) {
            if (!range || attributes[a].applies(range)) {
                ret.push(attributes[a]);
            }
        }
        return ret;
    };

    attrs = _.isArray(attrs) ? attrs : [ attrs ];
    _.each(attrs, function (attr) {
        this.add(attr.id, attr.range, attr.min, attr.max, attr.metadata);
    }, this);
};
//     VIE - Vienna IKS Editables
//     (c) 2011 Henri Bergius, IKS Consortium
//     (c) 2011 Sebastian Germesin, IKS Consortium
//     (c) 2011 Szaby Grünwald, IKS Consortium
//     VIE may be freely distributed under the MIT license.
//     For all details and documentation:
//     http://viejs.org/
if (VIE.prototype.Namespaces) {
    throw new Error("ERROR: VIE.Namespaces is already defined. " +
        "Please check your VIE installation!");
}

// ## VIE Namespaces
//
// In general, a namespace is a container that provides context for the identifiers.
// Within VIE, namespaces are used to distinguish different ontolgies or vocabularies
// of identifiers, types and attributes. However, because of their verbosity, namespaces
// tend to make their usage pretty circuitous. The ``VIE.Namespaces(...)`` class provides VIE
// with methods to maintain abbreviations (akak **prefixes**) for namespaces in order to
// alleviate their usage. By default, every VIE instance is equipped with a main instance
// of the namespaces in ``myVIE.namespaces``. Furthermore, VIE uses a **base namespace**,
// which is used if no prefix is given (has an empty prefix).
// In the upcoming sections, we will explain the
// methods to add, access and remove prefixes.



// ## VIE.Namespaces(base, namespaces)
// This is the constructor of a VIE.Namespaces. The constructor initially
// needs a *base namespace* and can optionally be initialised with an
// associative array of prefixes and namespaces. The base namespace is used in a way
// that every non-prefixed, non-expanded attribute or type is assumed to be of that
// namespace. This helps, e.g., in an environment where only one namespace is given.
// **Parameters**:
// *{string}* **base** The base namespace.
// *{object}* **namespaces** Initial namespaces to bootstrap the namespaces. (optional)
// **Throws**:
// *{Error}* if the base namespace is missing.
// **Returns**:
// *{VIE.Attribute}* : A **new** VIE.Attribute object.
// **Example usage**:
//
//     var ns = new myVIE.Namespaces("http://viejs.org/ns/",
//           {
//            "foaf": "http://xmlns.com/foaf/0.1/"
//           });
VIE.prototype.Namespaces = function (base, namespaces) {

    if (!base) {
        throw new Error("Please provide a base namespace!");
    }
    this._base = base;

    this._namespaces = (namespaces)? namespaces : {};
    if (typeof this._namespaces !== "object" || _.isArray(this._namespaces)) {
        throw new Error("If you want to initialise VIE namespace prefixes, " +
            "please provide a proper object!");
    }
};


// ### base(ns)
// This is a **getter** and **setter** for the base
// namespace. If called like ``base();`` it
// returns the actual base namespace as a string. If provided
// with a string, e.g., ``base("http://viejs.org/ns/");``
// it sets the current base namespace and retuns the namespace object
// for the purpose of chaining. If provided with anything except a string,
// it throws an Error.
// **Parameters**:
// *{string}* **ns** The namespace to be set. (optional)
// **Throws**:
// *{Error}* if the namespace is not of type string.
// **Returns**:
// *{string}* : The current base namespace.
// **Example usage**:
//
//     var namespaces = new vie.Namespaces("http://base.ns/");
//     console.log(namespaces.base()); // <-- "http://base.ns/"
//     namespaces.base("http://viejs.org/ns/");
//     console.log(namespaces.base()); // <-- "http://viejs.org/ns/"
VIE.prototype.Namespaces.prototype.base = function (ns) {
    if (!ns) {
        return this._base;
    }
    else if (typeof ns === "string") {
        /* remove another mapping */
        this.removeNamespace(ns);
        this._base = ns;
        return this._base;
    } else {
        throw new Error("Please provide a valid namespace!");
    }
};

// ### add(prefix, namespace)
// This method adds new prefix mappings to the
// current instance. If a prefix or a namespace is already
// present (in order to avoid ambiguities), an Error is thrown.
// ``prefix`` can also be an object in which case, the method
// is called sequentially on all elements.
// **Parameters**:
// *{string|object}* **prefix** The prefix to be set. If it is an object, the
// method will be applied to all key,value pairs sequentially.
// *{string}* **namespace** The namespace to be set.
// **Throws**:
// *{Error}* If a prefix or a namespace is already
// present (in order to avoid ambiguities).
// **Returns**:
// *{VIE.Namespaces}* : The current namespaces instance.
// **Example usage**:
//
//     var namespaces = new vie.Namespaces("http://base.ns/");
//     namespaces.add("", "http://...");
//     // is always equal to
//     namespaces.base("http://..."); // <-- setter of base namespace
VIE.prototype.Namespaces.prototype.add = function (prefix, namespace) {
    if (typeof prefix === "object") {
        for (var k1 in prefix) {
            this.add(k1, prefix[k1]);
        }
        return this;
    }
    if (prefix === "") {
        this.base(namespace);
        return this;
    }
    /* checking if we overwrite existing mappings */
    else if (this.contains(prefix) && namespace !== this._namespaces[prefix]) {
        throw new Error("ERROR: Trying to register namespace prefix mapping (" + prefix + "," + namespace + ")!" +
              "There is already a mapping existing: '(" + prefix + "," + this.get(prefix) + ")'!");
    } else {
        jQuery.each(this._namespaces, function (k1,v1) {
            if (v1 === namespace && k1 !== prefix) {
                throw new Error("ERROR: Trying to register namespace prefix mapping (" + prefix + "," + namespace + ")!" +
                      "There is already a mapping existing: '(" + k1 + "," + namespace + ")'!");
            }
        });
    }
    /* if not, just add them */
    this._namespaces[prefix] = namespace;
    return this;
};

// ### addOrReplace(prefix, namespace)
// This method adds new prefix mappings to the
// current instance. This will overwrite existing mappings.
// **Parameters**:
// *{string|object}* **prefix** The prefix to be set. If it is an object, the
// method will be applied to all key,value pairs sequentially.
// *{string}* **namespace** The namespace to be set.
// **Throws**:
// *nothing*
// **Returns**:
// *{VIE.Namespaces}* : The current namespaces instance.
// **Example usage**:
//
//     var namespaces = new vie.Namespaces("http://base.ns/");
//     namespaces.addOrReplace("", "http://...");
//     // is always equal to
//     namespaces.base("http://..."); // <-- setter of base namespace
VIE.prototype.Namespaces.prototype.addOrReplace = function (prefix, namespace) {
    if (typeof prefix === "object") {
        for (var k1 in prefix) {
            this.addOrReplace(k1, prefix[k1]);
        }
        return this;
    }
    this.remove(prefix);
    this.removeNamespace(namespace);
    return this.add(prefix, namespace);
};

// ### get(prefix)
// This method retrieves a namespaces, given a prefix. If the
// prefix is the empty string, the base namespace is returned.
// **Parameters**:
// *{string}* **prefix** The prefix to be retrieved.
// **Throws**:
// *nothing*
// **Returns**:
// *{string|undefined}* : The namespace or ```undefined``` if no namespace could be found.
// **Example usage**:
//
//     var namespaces = new vie.Namespaces("http://base.ns/");
//     namespaces.addOrReplace("test", "http://test.ns");
//     console.log(namespaces.get("test")); // <-- "http://test.ns"
VIE.prototype.Namespaces.prototype.get = function (prefix) {
    if (prefix === "") {
        return this.base();
    }
    return this._namespaces[prefix];
};

// ### getPrefix(namespace)
// This method retrieves a prefix, given a namespace.
// **Parameters**:
// *{string}* **namespace** The namespace to be retrieved.
// **Throws**:
// *nothing*
// **Returns**:
// *{string|undefined}* : The prefix or ```undefined``` if no prefix could be found.
// **Example usage**:
//
//     var namespaces = new vie.Namespaces("http://base.ns/");
//     namespaces.addOrReplace("test", "http://test.ns");
//     console.log(namespaces.getPrefix("http://test.ns")); // <-- "test"
VIE.prototype.Namespaces.prototype.getPrefix = function (namespace) {
    var prefix;
    if (namespace.indexOf('<') === 0) {
        namespace = namespace.substring(1, namespace.length - 1);
    }
    jQuery.each(this._namespaces, function (k1,v1) {
        if (namespace.indexOf(v1) === 0) {
            prefix = k1;
        }

        if (namespace.indexOf(k1 + ':') === 0) {
            prefix = k1;
        }
    });
    return prefix;
};

// ### contains(prefix)
// This method checks, whether a prefix is stored in the instance.
// **Parameters**:
// *{string}* **prefix** The prefix to be checked.
// **Throws**:
// *nothing*
// **Returns**:
// *{boolean}* : ```true``` if the prefix could be found, ```false``` otherwise.
// **Example usage**:
//
//     var namespaces = new vie.Namespaces("http://base.ns/");
//     namespaces.addOrReplace("test", "http://test.ns");
//     console.log(namespaces.contains("test")); // <-- true
VIE.prototype.Namespaces.prototype.contains = function (prefix) {
    return (prefix in this._namespaces);
};

// ### containsNamespace(namespace)
// This method checks, whether a namespace is stored in the instance.
// **Parameters**:
// *{string}* **namespace** The namespace to be checked.
// **Throws**:
// *nothing*
// **Returns**:
// *{boolean}* : ```true``` if the namespace could be found, ```false``` otherwise.
// **Example usage**:
//
//     var namespaces = new vie.Namespaces("http://base.ns/");
//     namespaces.addOrReplace("test", "http://test.ns");
//     console.log(namespaces.containsNamespace("http://test.ns")); // <-- true
VIE.prototype.Namespaces.prototype.containsNamespace = function (namespace) {
    return this.getPrefix(namespace) !== undefined;
};

// ### update(prefix, namespace)
// This method overwrites the namespace that is stored under the
// prefix ``prefix`` with the new namespace ``namespace``.
// If a namespace is already bound to another prefix, an Error is thrown.
// **Parameters**:
// *{string}* **prefix** The prefix.
// *{string}* **namespace** The namespace.
// **Throws**:
// *{Error}* If a namespace is already bound to another prefix.
// **Returns**:
// *{VIE.Namespaces}* : The namespace instance.
// **Example usage**:
//
//     ...
VIE.prototype.Namespaces.prototype.update = function (prefix, namespace) {
    this.remove(prefix);
    return this.add(prefix, namespace);
};

// ### updateNamespace(prefix, namespace)
// This method overwrites the prefix that is bound to the
// namespace ``namespace`` with the new prefix ``prefix``. If another namespace is
// already registered with the given ``prefix``, an Error is thrown.
// **Parameters**:
// *{string}* **prefix** The prefix.
// *{string}* **namespace** The namespace.
// **Throws**:
// *nothing*
// **Returns**:
// *{VIE.Namespaces}* : The namespace instance.
// **Example usage**:
//
//     var namespaces = new vie.Namespaces("http://base.ns/");
//     namespaces.add("test", "http://test.ns");
//     namespaces.updateNamespace("test2", "http://test.ns");
//     namespaces.get("test2"); // <-- "http://test.ns"
VIE.prototype.Namespaces.prototype.updateNamespace = function (prefix, namespace) {
    this.removeNamespace(prefix);
    return this.add(prefix, namespace);
};

// ### remove(prefix)
// This method removes the namespace that is stored under the prefix ``prefix``.
// **Parameters**:
// *{string}* **prefix** The prefix to be removed.
// **Throws**:
// *nothing*
// **Returns**:
// *{VIE.Namespaces}* : The namespace instance.
// **Example usage**:
//
//     var namespaces = new vie.Namespaces("http://base.ns/");
//     namespaces.add("test", "http://test.ns");
//     namespaces.get("test"); // <-- "http://test.ns"
//     namespaces.remove("test");
//     namespaces.get("test"); // <-- undefined
VIE.prototype.Namespaces.prototype.remove = function (prefix) {
    if (prefix) {
        delete this._namespaces[prefix];
    }
    return this;
};

// ### removeNamespace(namespace)
// This method removes removes the namespace ``namespace`` from the instance.
// **Parameters**:
// *{string}* **namespace** The namespace to be removed.
// **Throws**:
// *nothing*
// **Returns**:
// *{VIE.Namespaces}* : The namespace instance.
// **Example usage**:
//
//     var namespaces = new vie.Namespaces("http://base.ns/");
//     namespaces.add("test", "http://test.ns");
//     namespaces.get("test"); // <-- "http://test.ns"
//     namespaces.removeNamespace("http://test.ns");
//     namespaces.get("test"); // <-- undefined
VIE.prototype.Namespaces.prototype.removeNamespace = function (namespace) {
    var prefix = this.getPrefix(namespace);
    if (prefix) {
        delete this._namespaces[prefix];
    }
    return this;
};

// ### toObj()
// This method serializes the namespace instance into an associative
// array representation. The base namespace is given an empty
// string as key.
// **Parameters**:
// *{boolean}* **omitBase** If set to ```true``` this omits the baseNamespace.
// **Throws**:
// *nothing*
// **Returns**:
// *{object}* : A serialization of the namespaces as an object.
// **Example usage**:
//
//     var namespaces = new vie.Namespaces("http://base.ns/");
//     namespaces.add("test", "http://test.ns");
//     console.log(namespaces.toObj());
//     // <-- {""    : "http://base.ns/",
//             "test": "http://test.ns"}
//     console.log(namespaces.toObj(true));
//     // <-- {"test": "http://test.ns"}
VIE.prototype.Namespaces.prototype.toObj = function (omitBase) {
    if (omitBase) {
        return jQuery.extend({}, this._namespaces);
    }
    return jQuery.extend({'' : this._base}, this._namespaces);
};

// ### curie(uri, safe)
// This method converts a given
// URI into a CURIE (or SCURIE), based on the given ```VIE.Namespaces``` object.
// If the given uri is already a URI, it is left untouched and directly returned.
// If no prefix could be found, an ```Error``` is thrown.
// **Parameters**:
// *{string}* **uri** The URI to be transformed.
// *{boolean}* **safe** A flag whether to generate CURIEs or SCURIEs.
// **Throws**:
// *{Error}* If no prefix could be found in the passed namespaces.
// **Returns**:
// *{string}* The CURIE or SCURIE.
// **Example usage**:
//
//     var ns = new myVIE.Namespaces(
//           "http://viejs.org/ns/",
//           { "dbp": "http://dbpedia.org/ontology/" }
//     );
//     var uri = "<http://dbpedia.org/ontology/Person>";
//     ns.curie(uri, false); // --> dbp:Person
//     ns.curie(uri, true); // --> [dbp:Person]
VIE.prototype.Namespaces.prototype.curie = function(uri, safe){
    return VIE.Util.toCurie(uri, safe, this);
};

// ### isCurie(curie)
// This method checks, whether
// the given string is a CURIE and returns ```true``` if so and ```false```otherwise.
// **Parameters**:
// *{string}* **curie** The CURIE (or SCURIE) to be checked.
// **Throws**:
// *nothing*
// **Returns**:
// *{boolean}* ```true``` if the given curie is a CURIE or SCURIE and ```false``` otherwise.
// **Example usage**:
//
//     var ns = new myVIE.Namespaces(
//           "http://viejs.org/ns/",
//           { "dbp": "http://dbpedia.org/ontology/" }
//     );
//     var uri = "<http://dbpedia.org/ontology/Person>";
//     var curie = "dbp:Person";
//     var scurie = "[dbp:Person]";
//     var text = "This is some text.";
//     ns.isCurie(uri);    // --> false
//     ns.isCurie(curie);  // --> true
//     ns.isCurie(scurie); // --> true
//     ns.isCurie(text);   // --> false
VIE.prototype.Namespaces.prototype.isCurie = function (something) {
    return VIE.Util.isCurie(something, this);
};

// ### uri(curie)
// This method converts a
// given CURIE (or save CURIE) into a URI, based on the given ```VIE.Namespaces``` object.
// **Parameters**:
// *{string}* **curie** The CURIE to be transformed.
// **Throws**:
// *{Error}* If no URI could be assembled.
// **Returns**:
// *{string}* : A string, representing the URI.
// **Example usage**:
//
//     var ns = new myVIE.Namespaces(
//           "http://viejs.org/ns/",
//           { "dbp": "http://dbpedia.org/ontology/" }
//     );
//     var curie = "dbp:Person";
//     var scurie = "[dbp:Person]";
//     ns.uri(curie);
//          --> <http://dbpedia.org/ontology/Person>
//     ns.uri(scurie);
//          --> <http://dbpedia.org/ontology/Person>
VIE.prototype.Namespaces.prototype.uri = function (curie) {
    return VIE.Util.toUri(curie, this);
};

// ### isUri(something)
// This method checks, whether the given string is a URI.
// **Parameters**:
// *{string}* **something** : The string to be checked.
// **Throws**:
// *nothing*
// **Returns**:
// *{boolean}* : ```true``` if the string is a URI, ```false``` otherwise.
// **Example usage**:
//
//     var namespaces = new vie.Namespaces("http://base.ns/");
//     namespaces.addOrReplace("test", "http://test.ns");
//     var uri = "<http://test.ns/Person>";
//     var curie = "test:Person";
//     namespaces.isUri(uri);   // --> true
//     namespaces.isUri(curie); // --> false
VIE.prototype.Namespaces.prototype.isUri = VIE.Util.isUri;
//     VIE - Vienna IKS Editables
//     (c) 2011 Henri Bergius, IKS Consortium
//     (c) 2011 Sebastian Germesin, IKS Consortium
//     (c) 2011 Szaby Grünwald, IKS Consortium
//     VIE may be freely distributed under the MIT license.
//     For all details and documentation:
//     http://viejs.org/

// Classic VIE API bindings to new VIE
VIE.prototype.ClassicRDFa = function(vie) {
    this.vie = vie;
};

VIE.prototype.ClassicRDFa.prototype = {
    readEntities: function(selector) {
        var jsonEntities = [];
        var entities = this.vie.RDFaEntities.getInstances(selector);
        _.each(entities, function(entity) {
            jsonEntities.push(entity.toJSONLD());
        });
        return jsonEntities;
    },

    findPredicateElements: function(subject, element, allowNestedPredicates) {
        return this.vie.services.rdfa.findPredicateElements(subject, element, allowNestedPredicates);
    },

    getPredicate: function(element) {
        return this.vie.services.rdfa.getElementPredicate(element);
    },

    getSubject: function(element) {
        return this.vie.services.rdfa.getElementSubject(element);
    }
};

VIE.prototype.ClassicRDFaEntities = function(vie) {
    this.vie = vie;
};

VIE.prototype.ClassicRDFaEntities.prototype = {
    getInstances: function(selector) {
        if (!this.vie.services.rdfa) {
            this.vie.use(new this.vie.RdfaService());
        }
        var foundEntities = null;
        var loaded = false;
        this.vie.load({element: selector}).from('rdfa').execute().done(function(entities) {
            foundEntities = entities;
            loaded = true;
        });

        while (!loaded) {
        }

        return foundEntities;
    },

    getInstance: function(selector) {
        var instances = this.getInstances(selector);
        if (instances && instances.length) {
            return instances.pop();
        }
        return null;
    }
};

VIE.prototype.ClassicEntityManager = function(vie) {
    this.vie = vie;
    this.entities = this.vie.entities;
};

VIE.prototype.ClassicEntityManager.prototype = {
    getBySubject: function(subject) {
        return this.vie.entities.get(subject);
    },

    getByJSONLD: function(json) {
        if (typeof json === 'string') {
            try {
                json = jQuery.parseJSON(json);
            } catch (e) {
                return null;
            }
        }
        return this.vie.entities.addOrUpdate(json);
    },

    initializeCollection: function() {
        return;
    }
};
//     VIE - Vienna IKS Editables
//     (c) 2011 Henri Bergius, IKS Consortium
//     (c) 2011 Sebastian Germesin, IKS Consortium
//     (c) 2011 Szaby Grünwald, IKS Consortium
//     VIE may be freely distributed under the MIT license.
//     For all details and documentation:
//     http://viejs.org/

// ## VIE - DBPedia service
// The DBPedia service allows a VIE developer to directly query
// the DBPedia database for entities and their properties. Obviously,
// the service does not allow for saving, removing or analyzing methods.
(function(){

// ## VIE.DBPediaService(options)
// This is the constructor to instantiate a new service to collect
// properties of an entity from <a href="http://dbpedia.org">DBPedia</a>.
// **Parameters**:
// *{object}* **options** Optional set of fields, ```namespaces```, ```rules```, or ```name```.
// **Throws**:
// *nothing*
// **Returns**:
// *{VIE.DBPediaService}* : A **new** VIE.DBPediaService instance.
// **Example usage**:
//
//     var dbpService = new vie.DBPediaService({<some-configuration>});
VIE.prototype.DBPediaService = function (options) {
    var defaults = {
        /* the default name of this service */
        name : 'dbpedia',
        /* default namespaces that are shipped with this service */
        namespaces : {
            owl    : "http://www.w3.org/2002/07/owl#",
            yago   : "http://dbpedia.org/class/yago/",
            foaf: 'http://xmlns.com/foaf/0.1/',
            georss: "http://www.georss.org/georss/",
            geo: 'http://www.w3.org/2003/01/geo/wgs84_pos#',
            rdfs: "http://www.w3.org/2000/01/rdf-schema#",
            rdf: "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
            dbpedia: "http://dbpedia.org/ontology/",
            dbprop : "http://dbpedia.org/property/",
            dcelements : "http://purl.org/dc/elements/1.1/"
        },
        /* default rules that are shipped with this service */
        rules : []
    };
    /* the options are merged with the default options */
    this.options = jQuery.extend(true, defaults, options ? options : {});

    this.vie = null; /* this.vie will be set via VIE.use(); */
    /* overwrite options.name if you want to set another name */
    this.name = this.options.name;

    /* basic setup for the ajax connection */
    jQuery.ajaxSetup({
        converters: {"text application/rdf+json": function(s){return JSON.parse(s);}},
        timeout: 60000 /* 60 seconds timeout */
    });
};

VIE.prototype.DBPediaService.prototype = {

// ### init()
// This method initializes certain properties of the service and is called
// via ```VIE.use()```.
// **Parameters**:
// *nothing*
// **Throws**:
// *nothing*
// **Returns**:
// *{VIE.DBPediaService}* : The VIE.DBPediaService instance itself.
// **Example usage**:
//
//     var dbpService = new vie.DBPediaService({<some-configuration>});
//     dbpService.init();
    init: function() {

        for (var key in this.options.namespaces) {
            var val = this.options.namespaces[key];
            this.vie.namespaces.add(key, val);
        }

        this.rules = jQuery.extend([], VIE.Util.transformationRules(this));
        this.rules = jQuery.merge(this.rules, (this.options.rules) ? this.options.rules : []);

        this.connector = new this.vie.DBPediaConnector(this.options);

        return this;
    },

// ### load(loadable)
// This method loads the entity that is stored within the loadable into VIE.
// You can also query for multiple queries by setting ```entities``` with
// an array of entities.
// **Parameters**:
// *{VIE.Loadable}* **lodable** The loadable.
// **Throws**:
// *{Error}* if an invalid VIE.Loadable is passed.
// **Returns**:
// *{VIE.DBPediaService}* : The VIE.DBPediaService instance itself.
// **Example usage**:
//
//  var dbpService = new vie.DBPediaService({<some-configuration>});
//  dbpService.load(new vie.Loadable({entity : "<http://...>"}));
//    OR
//  var dbpService = new vie.DBPediaService({<some-configuration>});
//  dbpService.load(new vie.Loadable({entities : ["<http://...>", "<http://...>"]}));
    load: function(loadable){
        var service = this;

        var correct = loadable instanceof this.vie.Loadable;
        if (!correct) {
            throw new Error("Invalid Loadable passed");
        }

        var success = function (results) {
            results = (typeof results === "string")? JSON.parse(results) : results;
            _.defer(function() {
                try {
                    var entities = VIE.Util.rdf2Entities(service, results);
                    entities = (_.isArray(entities))? entities : [ entities ];
                    _.each(entities, function (entity) {
                        entity.set("DBPediaServiceLoad", VIE.Util.xsdDateTime(new Date()));
                    });
                    entities = (entities.length === 1)? entities[0] : entities;
                    loadable.resolve(entities);
                } catch (e) {
                    loadable.reject(e);
                }
            });
        };

        var error = function (e) {
            loadable.reject(e);
        };

        var entities = (loadable.options.entity)? loadable.options.entity : loadable.options.entities;

        if (!entities) {
            loadable.reject([]);
        } else {
            entities = (_.isArray(entities))? entities : [ entities ];
            var tmpEntities = [];
            for (var e = 0; e < entities.length; e++) {
                var tmpEnt = (typeof entities[e] === "string")? entities[e] : entities[e].id;
                tmpEntities.push(tmpEnt);
            }

            this.connector.load(tmpEntities, success, error);
        }
        return this;
    }
};

// ## VIE.DBPediaConnector(options)
// The DBPediaConnector is the connection between the DBPedia service
// and the backend service.
// **Parameters**:
// *{object}* **options** The options.
// **Throws**:
// *nothing*
// **Returns**:
// *{VIE.DBPediaConnector}* : The **new** VIE.DBPediaConnector instance.
// **Example usage**:
//
//     var dbpConn = new vie.DBPediaConnector({<some-configuration>});
VIE.prototype.DBPediaConnector = function (options) {
    this.options = options;
    this.baseUrl = "http://dbpedia.org/sparql?default-graph-uri=http%3A%2F%2Fdbpedia.org&timeout=0";
};

VIE.prototype.DBPediaConnector.prototype = {

// ### load(uri, success, error, options)
// This method loads all properties from an entity and returns the result by the success callback.
// **Parameters**:
// *{string}* **uri** The URI of the entity to be loaded.
// *{function}* **success** The success callback.
// *{function}* **error** The error callback.
// *{object}* **options** Options, like the ```format```.
// **Throws**:
// *nothing*
// **Returns**:
// *{VIE.DBPediaConnector}* : The VIE.DBPediaConnector instance itself.
// **Example usage**:
//
//     var dbpConn = new vie.DBPediaConnector(opts);
//     dbpConn.load("<http://dbpedia.org/resource/Barack_Obama>",
//                 function (res) { ... },
//                 function (err) { ... });
    load: function (uri, success, error, options) {
        if (!options) { options = {}; }

        var url = this.baseUrl +
        "&format=" + encodeURIComponent("application/rdf+json") +
        "&query=";

        if (_.isArray(uri)) {
            var construct = "";
            var where = "";
            for (var u = 0; u < uri.length; u++) {
                var subject = (/^<.+>$/.test(uri[u]))? uri[u] : '<' + uri[u] + '>';
                if (u > 0) {
                    construct += " .";
                    where += " UNION ";
                }
                construct += " " + subject + " ?prop" + u + " ?val" + u;
                where     += " { " + subject + " ?prop" + u + " ?val" + u + " }";
            }
            url += encodeURIComponent("CONSTRUCT {" + construct + " } WHERE {" + where + " }");
        } else {
            uri = (/^<.+>$/.test(uri))? uri : '<' + uri + '>';
            url += encodeURIComponent("CONSTRUCT { " + uri + " ?prop ?val } WHERE { " + uri + " ?prop ?val }");
        }
        var format = options.format || "application/rdf+json";

        if (typeof exports !== "undefined" && typeof process !== "undefined") {
            /* We're on Node.js, don't use jQuery.ajax */
            return this._loadNode(url, success, error, options, format);
        }

        jQuery.ajax({
            success: function(response){
                success(response);
            },
            error: error,
            type: "GET",
            url: url,
            accepts: {"application/rdf+json": "application/rdf+json"}
        });

        return this;
    },

    _loadNode: function (uri, success, error, options, format) {
        var request = require('request');
        var r = request({
            method: "GET",
            uri: uri,
            headers: {
                Accept: format
            }
        }, function(err, response, body) {
            if (response.statusCode !== 200) {
              return error(body);
            }
            success(JSON.parse(body));
        });
        r.end();

        return this;
    }
};
})();

//     VIE - Vienna IKS Editables
//     (c) 2011 Henri Bergius, IKS Consortium
//     (c) 2011 Sebastian Germesin, IKS Consortium
//     (c) 2011 Szaby Grünwald, IKS Consortium
//     VIE may be freely distributed under the MIT license.
//     For all details and documentation:
//     http://viejs.org/

// ## VIE - OpenCalaisService service
// The OpenCalaisService ...
(function(){

// ## VIE.OpenCalaisService(options)
// This is the constructor to instantiate a new service to collect
// properties of an entity from OpenCalais.
// **Parameters**:
// *{object}* **options** Optional set of fields, ```namespaces```, ```rules```, ```url```, or ```name```.
// **Throws**:
// *nothing*
// **Returns**:
// *{VIE.OpenCalaisService}* : A **new** VIE.OpenCalaisService instance.
// **Example usage**:
//
//     var service = new vie.OpenCalaisService({<some-configuration>});
VIE.prototype.OpenCalaisService = function(options) {
    var defaults = {
        /* the default name of this service */
        name : 'opencalais',
        /* you can pass an array of URLs which are then tried sequentially */
        url: ["http://api.opencalais.com/enlighten/rest/"],
        timeout : 60000, /* 60 seconds timeout */
        namespaces : {
            opencalaisc:  "http://s.opencalais.com/1/pred/",
            opencalaiscr: "http://s.opencalais.com/1/type/er/",
            opencalaiscm: "http://s.opencalais.com/1/type/em/e/"
        },
        /* default rules that are shipped with this service */
        rules : []
    };
    /* the options are merged with the default options */
    this.options = jQuery.extend(true, defaults, options ? options : {});

    this.vie = null; /* will be set via VIE.use(); */
    /* overwrite options.name if you want to set another name */
    this.name = this.options.name;

    /* basic setup for the ajax connection */
    jQuery.ajaxSetup({
        converters: {"text application/rdf+json": function(s){return JSON.parse(s);}},
        timeout: this.options.timeout
    });
};

VIE.prototype.OpenCalaisService.prototype = {

// ### init()
// This method initializes certain properties of the service and is called
// via ```VIE.use()```.
// **Parameters**:
// *nothing*
// **Throws**:
// *nothing*
// **Returns**:
// *{VIE.StanbolService}* : The VIE.StanbolService instance itself.
// **Example usage**:
//
//     var service = new vie.OpenCalaisService({<some-configuration>});
//     service.init();
    init: function(){

        for (var key in this.options.namespaces) {
            var val = this.options.namespaces[key];
            this.vie.namespaces.add(key, val);
        }

        this.rules = jQuery.extend([], VIE.Util.transformationRules(this));
       /* this.rules = jQuery.extend(this.rules, [{
            'left' : [
                      '?subject a opencalaiscm:Person',
                      '?subject opencalaisc:name ?name'
                ],
                'right': function(ns) {
                    return function() {
                        return [
                            jQuery.rdf.triple(this.subject.toString(),
                                'a',
                                '<' + ns.base() + 'Person>', {
                                    namespaces: ns.toObj()
                                }),
                            jQuery.rdf.triple(this.subject.toString(),
                                '<' + ns.base() + 'name>',
                                this.label, {
                                    namespaces: ns.toObj()
                                })
                            ];
                    };
                }(this.vie.namespaces)
            }]);*/
        this.rules = jQuery.merge(this.rules, (this.options.rules) ? this.options.rules : []);
        //this.rules = [];
        this.connector = new this.vie.OpenCalaisConnector(this.options);
    },

// ### analyze(analyzable)
// This method extracts text from the jQuery element and sends it to OpenCalais for analysis.
// **Parameters**:
// *{VIE.Analyzable}* **analyzable** The analyzable.
// **Throws**:
// *{Error}* if an invalid VIE.Findable is passed.
// **Returns**:
// *{VIE.OpenCalaisService}* : The VIE.OpenCalaisService instance itself.
// **Example usage**:
//
//     var service = new vie.OpenCalaisService({<some-configuration>});
//     service.analyzable(
//         new vie.Analyzable({element : jQuery("#foo")})
//     );
    analyze: function(analyzable) {
        var service = this;

        var correct = analyzable instanceof this.vie.Analyzable;
        if (!correct) {throw "Invalid Analyzable passed";}

        var element = analyzable.options.element ? analyzable.options.element : jQuery('body');

        var text = service._extractText(element);

        if (text.length > 0) {
            /* query enhancer with extracted text */
            var success = function (results) {
                _.defer(function(){
                    var entities = VIE.Util.rdf2Entities(service, results);
                    analyzable.resolve(entities);
                });
            };
            var error = function (e) {
                analyzable.reject(e);
            };

            this.connector.analyze(text, success, error);

        } else {
            console.warn("No text found in element.");
            analyzable.resolve([]);
        }

    },

    // this private method extracts text from a jQuery element
    _extractText: function (element) {
        if (element.get(0) &&
            element.get(0).tagName &&
            (element.get(0).tagName == 'TEXTAREA' ||
            element.get(0).tagName == 'INPUT' && element.attr('type', 'text'))) {
            return element.get(0).val();
        }
        else {
            var res = element
                .text()    /* get the text of element */
                .replace(/\s+/g, ' ') /* collapse multiple whitespaces */
                .replace(/\0\b\n\r\f\t/g, ''); /* remove non-letter symbols */
            return jQuery.trim(res);
        }
    }
};

// ## VIE.OpenCalaisConnector(options)
// The OpenCalaisConnector is the connection between the VIE OpenCalais service
// and the actual ajax calls.
// **Parameters**:
// *{object}* **options** The options.
// **Throws**:
// *nothing*
// **Returns**:
// *{VIE.OpenCalaisService}* : The **new** VIE.OpenCalaisService instance.
// **Example usage**:
//
//     var conn = new vie.OpenCalaisConnector({<some-configuration>});
VIE.prototype.OpenCalaisConnector = function (options) {
    this.options = options;
    this.baseUrl = (_.isArray(options.url))? options.url : [ options.url ];
    this.enhancerUrlPrefix = "/";
};

VIE.prototype.OpenCalaisConnector.prototype = {

// ### analyze(text, success, error, options)
// This method sends the given text to OpenCalais returns the result by the success callback.
// **Parameters**:
// *{string}* **text** The text to be analyzed.
// *{function}* **success** The success callback.
// *{function}* **error** The error callback.
// *{object}* **options** Options, like the ```format```.
// **Throws**:
// *nothing*
// **Returns**:
// *{VIE.OpenCalaisConnector}* : The VIE.OpenCalaisConnector instance itself.
// **Example usage**:
//
//     var conn = new vie.OpenCalaisConnector(opts);
//     conn.analyze("This is some text.",
//                 function (res) { ... },
//                 function (err) { ... });
    analyze: function(text, success, error, options) {
        if (!options) { options = { urlIndex : 0}; }
        if (options.urlIndex >= this.baseUrl.length) {
            error("Could not connect to the given OpenCalais endpoints! Please check for their setup!");
            return;
        }

        var enhancerUrl = this.baseUrl[options.urlIndex].replace(/\/$/, '');
        enhancerUrl += this.enhancerUrlPrefix;

        var format = options.format || "application/rdf+json";

        var retryErrorCb = function (c, t, s, e, o) {
            /* in case a OpenCalais backend is not responding and
             * multiple URLs have been registered
             */
            return  function () {
                console.error("OpenCalais connection error", arguments);
                c.analyze(t, s, e, _.extend(o, {urlIndex : o.urlIndex+1}));
            };
        }(this, text, success, error, options);

        var data = this._prepareData(text);

        if (typeof exports !== "undefined" && typeof process !== "undefined") {
            /* We're on Node.js, don't use jQuery.ajax */
            return this._analyzeNode(enhancerUrl, data, success, retryErrorCb, options, format);
        }

        jQuery.ajax({
            success: function(a, b, c){
                var responseData = c.responseText.replace(/<!--[\s\S]*?-->/g, '');
                success(responseData);
            },
            error: retryErrorCb,
            type: "POST",
            url: enhancerUrl,
            data: data,
            accept: "text/plain"
        });
    },

    _analyzeNode: function(url, text, success, errorCB, options, format) {
        var request = require('request');
        var r = request({
            method: "POST",
            uri: url,
            body: text,
            headers: {
                Accept: format
            }
        }, function(error, response, body) {
            try {
                success({results: JSON.parse(body)});
            } catch (e) {
                errorCB(e);
            }
        });
        r.end();
    },

    _prepareData : function (text) {
        return {
            licenseID: this.options.api_key,
            calculareRelevanceScore: "true",
            enableMetadataType: "GenericRelations,SocialTags",
            contentType: "text/html",
            content: text
            // for more options check http://developer.opencalais.com/docs/suggest/
        };
    }
};
})();


(function(){

    VIE.prototype.RdfaRdfQueryService = function(options) {
        var defaults = {
            name : 'rdfardfquery',
            namespaces : {},
            rules : []
        };
        /* the options are merged with the default options */
        this.options = jQuery.extend(true, defaults, options ? options : {});

        this.views = [];

        this.vie = null; /* will be set via VIE.use(); */
        /* overwrite options.name if you want to set another name */
        this.name = this.options.name;
};

VIE.prototype.RdfaRdfQueryService.prototype = {

    init: function(){

        for (var key in this.options.namespaces) {
            var val = this.options.namespaces[key];
            this.vie.namespaces.add(key, val);
        }

        this.rules = jQuery.extend([], VIE.Util.transformationRules(this));
        this.rules = jQuery.merge(this.rules, (this.options.rules) ? this.options.rules : []);
    },

    analyze: function(analyzable) {
        // in a certain way, analyze is the same as load
        return this.load(analyzable);
    },

    load : function(loadable) {
        var service = this;
        var correct = loadable instanceof this.vie.Loadable || loadable instanceof this.vie.Analyzable;
        if (!correct) {
            throw new Error("Invalid Loadable/Analyzable passed");
        }

        var element = loadable.options.element ? loadable.options.element : jQuery(document);
        try {
            var rdf = jQuery(element).find("[about],[typeof]").rdfa();

            jQuery.each(jQuery(element).xmlns(), function(prefix, ns){
                service.vie.namespaces.addOrReplace(prefix, ns.toString());
            });

            var entities = VIE.Util.rdf2Entities(this, rdf);

            loadable.resolve(entities);
        } catch (e) {
            loadable.reject(e);
        }
    },

    save : function(savable) {
        var correct = savable instanceof this.vie.Savable;
        if (!correct) {
            savable.reject("Invalid Savable passed");
        }

        if (!savable.options.element) {
            savable.reject("Unable to write entity to RDFa, no element given");
        }

        if (!savable.options.entity) {
            savable.reject("Unable to write to RDFa, no entity given");
        }

        if (!jQuery.rdf) {
            savable.reject("No rdfQuery found.");
        }
        var entity = savable.options.entity;

        var triples = [];
        var type = entity.get('@type');
        type = (jQuery.isArray(type))? type[0] : type;
        type = type.id;
        triples.push(entity.getSubject() + " a " + type);
        //TODO: add all attributes!
        jQuery(savable.options.element).rdfa(triples);

        savable.resolve();
    }

};

})();
//     VIE - Vienna IKS Editables
//     (c) 2011 Henri Bergius, IKS Consortium
//     (c) 2011 Sebastian Germesin, IKS Consortium
//     (c) 2011 Szaby Grünwald, IKS Consortium
//     VIE may be freely distributed under the MIT license.
//     For all details and documentation:
//     http://viejs.org/

// ## VIE - RdfaService service
// The RdfaService service allows ...
/*global document:false */

(function(){

// ## VIE.RdfaService(options)
// This is the constructor to instantiate a new service.
// **Parameters**:
// *{object}* **options** Optional set of fields, ```namespaces```, ```rules```, ```url```, or ```name```.
// **Throws**:
// *nothing*
// **Returns**:
// *{VIE.RdfaService}* : A **new** VIE.RdfaService instance.
// **Example usage**:
//
//     var rdfaService = new vie.RdfaService({<some-configuration>});
VIE.prototype.RdfaService = function(options) {
    var defaults = {
        name : 'rdfa',
        namespaces : {},
        subjectSelector : "[about],[typeof],[src],html",
        predicateSelector : "[property],[rel]",
        /* default rules that are shipped with this service */
        rules : [],
        bnodePrefix: '_a'
    };
    /* the options are merged with the default options */
    this.options = jQuery.extend(true, defaults, options ? options : {});

    // Counter for bnodes created by this service instance
    this.bnodes = 0;

    this.views = [];
    this.templates = {};

    this.datatypeReaders = {
      '<http://www.w3.org/2001/XMLSchema#boolean>': function (value) {
        if (value === 'true' || value === 1 || value === true) {
          return true;
        }
        return false;
      },
      '<http://www.w3.org/2001/XMLSchema#dateTime>': function (value) {
        return new Date(value);
      },
      '<http://www.w3.org/2001/XMLSchema#integer>': function (value) {
        return parseInt(value, 10);
      }
    };

    this.datatypeWriters = {
      '<http://www.w3.org/2001/XMLSchema#dateTime>': function (value) {
        if (!_.isDate(value)) {
          return value;
        }
        return value.toISOString();
      }
    };

    this.vie = null; /* will be set via VIE.use(); */
    /* overwrite options.name if you want to set another name */
    this.name = this.options.name;
};

VIE.prototype.RdfaService.prototype = {

// ### init()
// This method initializes certain properties of the service and is called
// via ```VIE.use()```.
// **Parameters**:
// *nothing*
// **Throws**:
// *nothing*
// **Returns**:
// *{VIE.RdfaService}* : The VIE.RdfaService instance itself.
// **Example usage**:
//
//     var rdfaService = new vie.RdfaService({<some-configuration>});
//     rdfaService.init();
    init: function(){

        for (var key in this.options.namespaces) {
            var val = this.options.namespaces[key];
            this.vie.namespaces.add(key, val);
        }

        this.rules = jQuery.merge([], VIE.Util.transformationRules(this));
        this.rules = jQuery.merge(this.rules, (this.options.rules) ? this.options.rules : []);
    },

    analyze: function(analyzable) {
        // in a certain way, analyze is the same as load
        return this.load(analyzable);
    },

    load : function(loadable) {
        var service = this;
        var correct = loadable instanceof this.vie.Loadable || loadable instanceof this.vie.Analyzable;
        if (!correct) {
            throw new Error("Invalid Loadable/Analyzable passed");
        }

        var element;
        if (!loadable.options.element) {
            if (typeof document === 'undefined') {
                return loadable.resolve([]);
            }
            element = jQuery(document);
        } else {
            element = loadable.options.element;
        }

        var entities = this.readEntities(element);
        loadable.resolve(entities);
    },

    save : function(savable) {
        var correct = savable instanceof this.vie.Savable;
        if (!correct) {
            throw "Invalid Savable passed";
        }

        if (!savable.options.element) {
            // FIXME: we could find element based on subject
            throw "Unable to write entity to RDFa, no element given";
        }

        if (!savable.options.entity) {
            throw "Unable to write to RDFa, no entity given";
        }

        this._writeEntity(savable.options.entity, savable.options.element);
        savable.resolve();
    },

    readEntities : function (element) {
        var service = this;
        var ns = this.xmlns(element);
        for (var prefix in ns) {
            this.vie.namespaces.addOrReplace(prefix, ns[prefix]);
        }
        var entities = [];
        var entityElements = jQuery(this.options.subjectSelector, element).add(jQuery(element).filter(this.options.subjectSelector)).each(function() {
            var entity = service._readEntity(jQuery(this));
            if (entity) {
                entities.push(entity);
            }
        });
        return entities;
    },

    _readEntity : function(element) {
        var subject = this.getElementSubject(element);
        var type = this._getElementType(element);
        var entity = this._readEntityPredicates(subject, element, false);
        if (jQuery.isEmptyObject(entity)) {
            return null;
        }
        var vie = this.vie;
        _.each(entity, function (value, predicate) {
            if (!_.isArray(value)) {
                return;
            }
            var valueCollection = new this.vie.Collection([], {
              vie: vie,
              predicate: predicate
            });
            _.each(value, function (valueItem) {
                var linkedEntity = vie.entities.addOrUpdate({'@subject': valueItem});
                valueCollection.addOrUpdate(linkedEntity);
            });
            entity[predicate] = valueCollection;
        }, this);
        entity['@subject'] = subject;
        if (type) {
            entity['@type'] = type;
        }
        var entityInstance = new this.vie.Entity(entity);
        entityInstance = this.vie.entities.addOrUpdate(entityInstance, {
          updateOptions: {
            silent: true,
            ignoreChanges: true
          }
        });
        this._registerEntityView(entityInstance, element);
        return entityInstance;
    },

    _writeEntity : function(entity, element) {
        var service = this;
        this.findPredicateElements(this.getElementSubject(element), element, true).each(function() {
            var predicateElement = jQuery(this);
            var predicate = service.getElementPredicate(predicateElement);
            if (!entity.has(predicate)) {
                return true;
            }

            var value = entity.get(predicate);
            if (value && value.isCollection) {
                // Handled by CollectionViews separately
                return true;
            }
            if (value === service.readElementValue(predicate, predicateElement)) {
                return true;
            }
            service.writeElementValue(predicate, predicateElement, value);
        });
        return true;
    },

    _getViewForElement : function(element, collectionView) {
        var viewInstance;
        jQuery.each(this.views, function() {
            if (jQuery(this.el).get(0) === element.get(0)) {
                if (collectionView && !this.template) {
                    return true;
                }
                viewInstance = this;
                return false;
            }
        });
        return viewInstance;
    },

    _registerEntityView : function(entity, element, isNew) {
        if (!element.length) {
            return;
        }

        var service = this;
        var viewInstance = this._getViewForElement(element);
        if (viewInstance) {
            if (entity.hasRelations() && !viewInstance.collectionsChecked) {
                // Entity has collections but these haven't been registered
                // as views yet. This usually happens with deep relations.
                this._registerEntityCollectionViews(entity, element, viewInstance);
            }
            return viewInstance;
        }

        viewInstance = new this.vie.view.Entity({
            model: entity,
            el: element,
            tagName: element.get(0).nodeName,
            vie: this.vie,
            service: this.name
        });
        this.views.push(viewInstance);

        // For new elements, ensure their relations are read from DOM
        if (isNew) {
          jQuery(element).find(this.options.predicateSelector).add(jQuery(element).filter(this.options.predicateSelector)).each(function () {
            var predicate = jQuery(this).attr('rel');
            if (!predicate) {
              return;
            }
            entity.set(predicate, new service.vie.Collection([], {
              vie: service.vie,
              predicate: predicate
            }));
          });
        }

        this._registerEntityCollectionViews(entity, element, viewInstance);

        return viewInstance;
    },


    _registerEntityCollectionViews: function (entity, element, view) {
        var service = this;
        // Find collection elements and create collection views for them
        _.each(entity.attributes, function(value, predicate) {
            var attributeValue = entity.fromReference(entity.get(predicate));
            if (attributeValue && attributeValue.isCollection) {
                jQuery.each(service.getElementByPredicate(predicate, element), function() {
                    service._registerCollectionView(attributeValue, jQuery(this), entity);
                });
                // Collections of the entity have been checked and views
                // registered for them. This doesn't need to be done again.
                view.collectionsChecked = true;
            }
        });
    },

    setTemplate: function (type, predicate, template) {
      var templateFunc;

      if (!template) {
        template = predicate;
        predicate = 'default';
      }
      type = this.vie.namespaces.isUri(type) ? type : this.vie.namespaces.uri(type);

      if (_.isFunction(template)) {
        templateFunc = template;
      } else {
        templateFunc = this.getElementTemplate(template);
      }

      if (!this.templates[type]) {
        this.templates[type] = {};
      }

      this.templates[type][predicate] = templateFunc;

      // Update existing Collection Views where this template applies
      _.each(this.views, function (view) {
        if (!(view instanceof this.vie.view.Collection)) {
          return;
        }

        if (view.collection.predicate !== predicate) {
          return;
        }

        view.templates[type] = templateFunc;
      }, this);
    },

    getTemplate: function (type, predicate) {
      if (!predicate) {
        predicate = 'default';
      }
      type = this.vie.namespaces.isUri(type) ? type : this.vie.namespaces.uri(type);

      if (!this.templates[type]) {
        return;
      }

      return this.templates[type][predicate];
    },

    _getElementTemplates: function (element, entity, predicate) {
      var templates = {};

      var type = entity.get('@type');
      if (type && type.attributes && type.attributes.get(predicate)) {
        // Use type-specific templates, if any
        var attribute = type.attributes.get(predicate);
        _.each(attribute.range, function (childType) {
          var template = this.getTemplate(childType, predicate);
          if (template) {
            var vieChildType = this.vie.types.get(childType);
            templates[vieChildType.id] = template;
          }
        }, this);

        if (!_.isEmpty(templates)) {
          return templates;
        }
      }

      // Try finding templates that have types
      var self = this;
      jQuery('[typeof]', element).each(function () {
        var templateElement = jQuery(this);
        var childType = templateElement.attr('typeof');
        childType = self.vie.namespaces.isUri(childType) ? childType : self.vie.namespaces.uri(childType);
        if (templates[childType]) {
          return;
        }
        var templateFunc = self.getElementTemplate(templateElement);
        templates[childType] = templateFunc;
        templates['<http://www.w3.org/2002/07/owl#Thing>'] = templateFunc;
      });

      if (_.isEmpty(templates)) {
        var defaultTemplate = element.children(':first-child');
        if (defaultTemplate.length) {
          templates['<http://www.w3.org/2002/07/owl#Thing>'] = self.getElementTemplate(defaultTemplate);
        }
      }

      return templates;
    },

    // Return a template-generating function for given element
    getElementTemplate: function (element) {
        var service = this;
        return function (entity, callback) {
            var newElement = jQuery(element).clone(false);
            if (newElement.attr('about') !== undefined) {
                // Direct match with container element
                newElement.attr('about', '');
            }
            newElement.find('[about]').attr('about', '');
            var subject = service.findPredicateElements(subject, newElement, false).each(function () {
                var predicateElement = jQuery(this);
                var predicate = service.getElementPredicate(predicateElement);
                if (entity.has(predicate) && entity.get(predicate).isCollection) {
                    return true;
                }
                service.writeElementValue(null, predicateElement, '');
            });
            callback(newElement);
        };
    },

    _registerCollectionView : function(collection, element, entity) {
        var viewInstance = this._getViewForElement(element, true);
        if (viewInstance) {
            return viewInstance;
        }

        viewInstance = new this.vie.view.Collection({
            owner: entity,
            collection: collection,
            model: collection.model,
            el: element,
            templates: this._getElementTemplates(element, entity, collection.predicate),
            service: this
        });
        this.views.push(viewInstance);
        return viewInstance;
    },

    _getElementType : function (element) {
        var type;
        if (jQuery(element).attr('typeof') !== this.options.attributeExistenceComparator) {
            type = jQuery(element).attr('typeof');
            if (type.indexOf("://") !== -1) {
                return "<" + type + ">";
            } else {
                return type;
            }
        }
        return null;
    },

    _generatebnodeId: function () {
      var newId = this.options.bnodePrefix + ':' + this.bnodes;
      this.bnodes++;
      return newId;
    },

    getElementSubject : function(element, allowTypeOf) {
        var service = this;
        if (typeof document !== 'undefined') {
            if (element === document) {
                return document.baseURI;
            }
        }
        var subject;
        var matched = null;
        jQuery(element).closest(this.options.subjectSelector).each(function() {
            matched = this;
            if (jQuery(this).attr('about') !== service.options.attributeExistenceComparator) {
                subject = jQuery(this).attr('about');
                return true;
            }
            if (jQuery(this).attr('src') !== service.options.attributeExistenceComparator) {
                subject = jQuery(this).attr('src');
                return true;
            }
            if (jQuery(this).attr('typeof') !== service.options.attributeExistenceComparator) {
                var typeElement = jQuery(this);
                if (typeElement.data('vie-bnode')) {
                  subject = typeElement.data('vie-bnode');
                  return true;
                }
                subject = service._generatebnodeId();
                typeElement.data('vie-bnode', subject);
                return true;
            }
            // We also handle baseURL outside browser context by manually
            // looking for the `<base>` element inside HTML head.
            if (jQuery(this).get(0).nodeName === 'HTML') {
                jQuery('base', this).each(function() {
                    subject = jQuery(this).attr('href');
                });
            }
        });

        if (!subject) {
            if (matched === element) {
                // Workaround for https://github.com/assaf/zombie/issues/235
                return service.getElementSubject(jQuery(element).parent());
            }
            return undefined;
        }

        if (typeof subject === 'object') {
            return subject;
        }
        if (subject.indexOf('_:') === 0) {
            return subject;
        }
        if (subject.indexOf('<') === 0) {
            return subject;
        }
        return "<" + subject + ">";
    },

    setElementSubject : function(subject, element) {
        if (jQuery(element).attr('src')) {
            return jQuery(element).attr('src', subject);
        }
        return jQuery(element).attr('about', subject);
    },

    getElementPredicate : function(element) {
        var predicate;
        element = jQuery(element);
        predicate = element.attr('property');
        if (!predicate) {
            predicate = element.attr('rel');
        }
        return predicate;
    },

    getElementBySubject : function(subject, element) {
        var service = this;
        return jQuery(element).find(this.options.subjectSelector).add(jQuery(element).filter(this.options.subjectSelector)).filter(function() {
            if (service.getElementSubject(jQuery(this)) !== subject) {
                return false;
            }

            return true;
        });
    },

    getElementByPredicate : function(predicate, element) {
        var service = this;
        var subject = this.getElementSubject(element);
        return jQuery(element).find(this.options.predicateSelector).add(jQuery(element).filter(this.options.predicateSelector)).filter(function() {
            var foundPredicate = service.getElementPredicate(jQuery(this));
            if (service.vie.namespaces.curie(foundPredicate) !== service.vie.namespaces.curie(predicate)) {
                return false;
            }

            if (service.getElementSubject(this) !== subject) {
                return false;
            }

            return true;
        });
    },

    _readEntityPredicates : function(subject, element, emptyValues) {
        var service = this;
        var entityPredicates = {};

        this.findPredicateElements(subject, element, true).each(function() {
            var predicateElement = jQuery(this);
            var predicate = service.getElementPredicate(predicateElement);
            if (predicate === '') {
                return;
            }
            var value = service.readElementValue(predicate, predicateElement);
            if (value === null && !emptyValues) {
                return;
            }

            entityPredicates[predicate] = value;
        });

        if (jQuery(element).get(0).tagName !== 'HTML') {
            jQuery(element).parent('[rev]').each(function() {
                var relation = jQuery(this).attr('rev');
                if (!relation) {
                    return;
                }
                entityPredicates[jQuery(this).attr('rev')] = service.getElementSubject(this);
            });
        }
        return entityPredicates;
    },

    findSubjectElements: function (element) {
      return jQuery('[about]', element);
    },

    findPredicateElements : function(subject, element, allowNestedPredicates) {
        var service = this;
        return jQuery(element).find(this.options.predicateSelector).add(jQuery(element).filter(this.options.predicateSelector)).filter(function() {
            if (service.getElementSubject(this) !== subject) {
                return false;
            }
            if (!allowNestedPredicates) {
                if (!jQuery(this).parents('[property]').length) {
                    return true;
                }
                return false;
            }

            return true;
        });
    },

    parseElementValue: function (value, element) {
        if (!element.attr('datatype')) {
            return value;
        }
        var datatype = this.vie.namespaces.uri(element.attr('datatype'));
        if (!this.datatypeReaders[datatype]) {
            return value;
        }
        return this.datatypeReaders[datatype](value);
    },

    generateElementValue: function (value, element) {
        if (!element.attr('datatype')) {
            return value;
        }
        var datatype = this.vie.namespaces.uri(element.attr('datatype'));
        if (!this.datatypeWriters[datatype]) {
            return value;
        }
        return this.datatypeWriters[datatype](value);
    },

    readElementValue : function(predicate, element) {
        // The `content` attribute can be used for providing machine-readable
        // values for elements where the HTML presentation differs from the
        // actual value.
        var content = element.attr('content');
        if (content) {
            return this.parseElementValue(content, element);
        }

        // The `resource` attribute can be used to link a predicate to another
        // RDF resource.
        var resource = element.attr('resource');
        if (resource) {
            return ["<" + resource + ">"];
        }

        // `href` attribute also links to another RDF resource.
        var href = element.attr('href');
        if (href && element.attr('rel') === predicate) {
            return ["<" + href + ">"];
        }

        // If the predicate is a relation, we look for identified child objects
        // and provide their identifiers as the values. To protect from scope
        // creep, we only support direct descentants of the element where the
        // `rel` attribute was set.
        if (element.attr('rel')) {
            var value = [];
            var service = this;
            jQuery(element).children(this.options.subjectSelector).each(function() {
                value.push(service.getElementSubject(this, true));
            });
            return value;
        }

        // If none of the checks above matched we return the HTML contents of
        // the element as the literal value.
        return this.parseElementValue(element.html(), element);
    },

    writeElementValue : function(predicate, element, value) {
        value = this.generateElementValue(value, element);

        //TODO: this is a hack, please fix!
        if (_.isArray(value) && value.length > 0) {
            value = value[0];
        }

        // The `content` attribute can be used for providing machine-readable
        // values for elements where the HTML presentation differs from the
        // actual value.
        var content = element.attr('content');
        if (content) {
            element.attr('content', value);
            return;
        }

        // The `resource` attribute can be used to link a predicate to another
        // RDF resource.
        var resource = element.attr('resource');
        if (resource) {
            element.attr('resource', value);
        }

        // Property has inline value. Change the HTML contents of the property
        // element to match the new value.
        element.html(value);
    },

    // mostyl copied from http://code.google.com/p/rdfquery/source/browse/trunk/jquery.xmlns.js
    xmlns : function (elem) {
        var $elem;
        if (!elem) {
            if (typeof document === 'undefined') {
                return {};
            }
            $elem = jQuery(document);
        } else {
            $elem = jQuery(elem);
        }
        // Collect namespace definitions from the element and its parents
        $elem = $elem.add($elem.parents());
        var obj = {};

        $elem.each(function (i, e) {
            if (e.attributes) {
                for (i = 0; i < e.attributes.length; i += 1) {
                    var attr = e.attributes[i];
                    if (/^xmlns(:(.+))?$/.test(attr.nodeName)) {
                        var prefix = /^xmlns(:(.+))?$/.exec(attr.nodeName)[2] || '';
                        var value = attr.nodeValue;
                        if (prefix === '' || value !== '') {
                            obj[prefix] = attr.nodeValue;
                        }
                    }
                }
            }
        });

        return obj;
    }

};

})();
//     VIE - Vienna IKS Editables
//     (c) 2011 Henri Bergius, IKS Consortium
//     (c) 2011 Sebastian Germesin, IKS Consortium
//     (c) 2011 Szaby Grünwald, IKS Consortium
//     VIE may be freely distributed under the MIT license.
//     For all details and documentation:
//     http://viejs.org/
/*global escape:false */

// ## VIE - StanbolService service
// The StanbolService service allows a VIE developer to directly query
// the <a href="http://incubator.apache.org/stanbol/">Apache Stanbol</a> entityhub for entities and their properties.
// Furthermore, it gives access to the enhance facilities of
// Stanbol to analyze content and semantically enrich it.
(function(){

// ## VIE.StanbolService(options)
// This is the constructor to instantiate a new service to collect
// properties of an entity from <a href="http://incubator.apache.org/stanbol/">Apache Stanbol</a>.
// **Parameters**:
// *{object}* **options** Optional set of fields, ```namespaces```, ```rules```, ```url```, or ```name```.
// **Throws**:
// *nothing*
// **Returns**:
// *{VIE.StanbolService}* : A **new** VIE.StanbolService instance.
// **Example usage**:
//
//     var stnblService = new vie.StanbolService({<some-configuration>});
VIE.prototype.StanbolService = function(options) {
    var defaults = {
        /* the default name of this service */
        name : 'stanbol',
        /* you can pass an array of URLs which are then tried sequentially */
        url: ["http://dev.iks-project.eu/stanbolfull"],
        timeout : 20000, /* 20 seconds timeout */
        namespaces : {
            semdeski : "http://www.semanticdesktop.org/ontologies/2007/01/19/nie#",
            semdeskf : "http://www.semanticdesktop.org/ontologies/2007/03/22/nfo#",
            skos: "http://www.w3.org/2004/02/skos/core#",
            foaf: "http://xmlns.com/foaf/0.1/",
            opengis: "http://www.opengis.net/gml/",
            dbpedia: "http://dbpedia.org/ontology/",
            dbprop: "http://dbpedia.org/property/",
            owl : "http://www.w3.org/2002/07/owl#",
            geonames : "http://www.geonames.org/ontology#",
            enhancer : "http://fise.iks-project.eu/ontology/",
            entityhub: "http://www.iks-project.eu/ontology/rick/model/",
            entityhub2: "http://www.iks-project.eu/ontology/rick/query/",
            rdf: "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
            rdfs: "http://www.w3.org/2000/01/rdf-schema#",
            dcterms  : 'http://purl.org/dc/terms/',
            schema: 'http://schema.org/',
            geo: 'http://www.w3.org/2003/01/geo/wgs84_pos#'
        },
        /* default rules that are shipped with this service */
        rules : [
            /* rule to add backwards-relations to the triples
             * this makes querying for entities a lot easier!
             */
            {
                'left' : [
                    '?subject a <http://fise.iks-project.eu/ontology/EntityAnnotation>',
                    '?subject enhancer:entity-type ?type',
                    '?subject enhancer:confidence ?confidence',
                    '?subject enhancer:entity-reference ?entity',
                    '?subject dcterms:relation ?relation',
                    '?relation a <http://fise.iks-project.eu/ontology/TextAnnotation>',
                    '?relation enhancer:selected-text ?selected-text',
                    '?relation enhancer:selection-context ?selection-context',
                    '?relation enhancer:start ?start',
                    '?relation enhancer:end ?end'
                ],
                'right' : [
                    '?entity a ?type',
                    '?entity enhancer:hasTextAnnotation ?relation',
                    '?entity enhancer:hasEntityAnnotation ?subject'
                ]
            }
        ],
        enhancer : {
            chain : "default"
        },
        entityhub : {
            /* if set to undefined, the Referenced Site Manager @ /entityhub/sites is used. */
            /* if set to, e.g., dbpedia, eferenced Site @ /entityhub/site/dbpedia is used. */
            site : undefined
        }
    };
    /* the options are merged with the default options */
    this.options = jQuery.extend(true, defaults, options ? options : {});

    this.vie = null; /* will be set via VIE.use(); */
    /* overwrite options.name if you want to set another name */
    this.name = this.options.name;

};

VIE.prototype.StanbolService.prototype = {

// ### init()
// This internal method initializes certain properties of the service and is called
// via ```VIE.use()```.
// **Parameters**:
// *nothing*
// **Throws**:
// *nothing*
// **Returns**:
// *{VIE.StanbolService}* : The VIE.StanbolService instance itself.
    init: function(){

        for (var key in this.options.namespaces) {
            var val = this.options.namespaces[key];
            this.vie.namespaces.add(key, val);
        }

        this.rules = jQuery.extend([], VIE.Util.transformationRules(this));
        this.rules = jQuery.merge(this.rules, (this.options.rules) ? this.options.rules : []);

        this.connector = new this.vie.StanbolConnector(this.options);

        /* adding these entity types to VIE helps later the querying */
        this.vie.types.addOrOverwrite('enhancer:EntityAnnotation', [
            /*TODO: add attributes */
        ]).inherit("owl:Thing");
        this.vie.types.addOrOverwrite('enhancer:TextAnnotation', [
            /*TODO: add attributes */
        ]).inherit("owl:Thing");
        this.vie.types.addOrOverwrite('enhancer:Enhancement', [
            /*TODO: add attributes */
        ]).inherit("owl:Thing");
    },

// ### analyze(analyzable)
// This method extracts text from the jQuery element and sends it to Apache Stanbol for analysis.
// **Parameters**:
// *{VIE.Analyzable}* **analyzable** The analyzable.
// **Throws**:
// *{Error}* if an invalid VIE.Findable is passed.
// **Returns**:
// *{VIE.StanbolService}* : The VIE.StanbolService instance itself.
// **Example usage**:
//
//     vie.analyze({element : jQuery("#foo")})
//     .using(new vie.StanbolService({<some-configuration>}))
//     .execute().success(callback);
    analyze: function(analyzable) {
        var service = this;

        var correct = analyzable instanceof this.vie.Analyzable;
        if (!correct) {throw "Invalid Analyzable passed";}

        var element = analyzable.options.element ? analyzable.options.element : jQuery('body');

        var text = service._extractText(element);

        if (text.length > 0) {
            /* query enhancer with extracted text */
            var success = function (results) {
                _.defer(function(){
                    var entities = VIE.Util.rdf2Entities(service, results);
                    analyzable.resolve(entities);
                });
            };
            var error = function (e) {
                analyzable.reject(e);
            };

            var options = {
                chain : (analyzable.options.chain)? analyzable.options.chain : service.options.enhancer.chain
            };

            this.connector.analyze(text, success, error, options);

        } else {
            console.warn("No text found in element.");
            analyzable.resolve([]);
        }

    },

// ### find(findable)
// This method finds entities given the term from the entity hub.
// **Parameters**:
// *{VIE.Findable}* **findable** The findable.
// **Throws**:
// *{Error}* if an invalid VIE.Findable is passed.
// **Returns**:
// *{VIE.StanbolService}* : The VIE.StanbolService instance itself.
// **Example usage**:
//
//     vie.find({
//         term : "Bischofsh",
//         limit : 10,
//         offset: 0,
//         field: "skos:prefLabel", // used for the term lookup, default: "rdfs:label"
//         properties: ["skos:prefLabel", "rdfs:label"] // are going to be loaded with the result entities
//     })
//     .using(new vie.StanbolService({<some-configuration>}))
//     .execute()
//     .success(callback);
    find: function (findable) {
        var correct = findable instanceof this.vie.Findable;
        if (!correct) {throw "Invalid Findable passed";}
        var service = this;
        /* The term to find, * as wildcard allowed */
        if (!findable.options.term) {
            console.info("StanbolConnector: No term to look for!");
            findable.reject([]);
        }
        var term = escape(findable.options.term);
        var limit = (typeof findable.options.limit === "undefined") ? 20 : findable.options.limit;
        var offset = (typeof findable.options.offset === "undefined") ? 0 : findable.options.offset;
        var success = function (results) {
            _.defer(function(){
                var entities = VIE.Util.rdf2Entities(service, results);
                findable.resolve(entities);
            });
        };
        var error = function (e) {
            findable.reject(e);
        };

        findable.options.site = (findable.options.site)? findable.options.site : service.options.entityhub.site;

        var vie = this.vie;
        if(findable.options.properties){
            var properties = findable.options.properties;
            findable.options.ldPath = _(properties)
            .map(function(property){
                if (vie.namespaces.isCurie(property)){
                    return vie.namespaces.uri(property) + ";";
                } else {
                    return property;
                }
            })
            .join("");
        }
        if(findable.options.field && vie.namespaces.isCurie(field)){
            var field = findable.options.field;
                findable.options.field = vie.namespaces.uri(field);
        }
        this.connector.find(term, limit, offset, success, error, findable.options);
    },

// ### load(loadable)
// This method loads the entity that is stored within the loadable into VIE.
// **Parameters**:
// *{VIE.Loadable}* **lodable** The loadable.
// **Throws**:
// *{Error}* if an invalid VIE.Loadable is passed.
// **Returns**:
// *{VIE.StanbolService}* : The VIE.StanbolService instance itself.
// **Example usage**:
//     vie.load({
//         entity: "<http://...>"
//     })
//     .using(new vie.StanbolService({<some-configuration>}))
//     .execute()
//     .success(callback);
    load: function(loadable){
        var correct = loadable instanceof this.vie.Loadable;
        if (!correct) {throw "Invalid Loadable passed";}
        var service = this;

        var entity = loadable.options.entity;
        if (!entity){
            console.warn("StanbolConnector: No entity to look for!");
            loadable.resolve([]);
        }
        var success = function (results) {
            _.defer(function(){
                var entities = VIE.Util.rdf2Entities(service, results);
                loadable.resolve(entities);
            });
        };
        var error = function (e) {
            loadable.reject(e);
        };

        var options = {
            site : (loadable.options.site)? loadable.options.site : service.options.entityhub.site,
            local : loadable.options.local
        };

        this.connector.load(entity, success, error, options);
    },

 // ### save(savable)
 // This method saves the given entity to the Apache Stanbol installation.
 // **Parameters**:
 // *{VIE.Savable}* **savable** The savable.
 // **Throws**:
 // *{Error}* if an invalid VIE.Savable is passed.
 // **Returns**:
 // *{VIE.StanbolService}* : The VIE.StanbolService instance itself.
 // **Example usage**:
 //
 //      var entity = new vie.Entity({'name' : 'Test Entity'});
 //      var stnblService = new vie.StanbolService({<some-configuration>});
 //      stnblService.save(new vie.Savable(entity));
     save: function(savable){
         var correct = savable instanceof this.vie.Savable;
         if (!correct) {throw "Invalid Savable passed";}
         var service = this;

         var entity = savable.options.entity;
         if (!entity){
             console.warn("StanbolConnector: No entity to save!");
             savable.reject("StanbolConnector: No entity to save!");
         }
         var success = function (results) {
             _.defer(function() {
                 var entities = VIE.Util.rdf2Entities(service, results);
                 savable.resolve(entities);
             });
         };

         var error = function (e) {
             savable.reject(e);
         };

         var options = {
            site : (savable.options.site)? savable.options.site : service.options.entityhub.site,
            local : savable.options.local
         };

         this.connector.save(entity, success, error, options);
     },

    /* this private method extracts text from a jQuery element */
    _extractText: function (element) {
        if (element.get(0) &&
            element.get(0).tagName &&
            (element.get(0).tagName == 'TEXTAREA' ||
            element.get(0).tagName == 'INPUT' && element.attr('type', 'text'))) {
            return element.get(0).val();
        }
        else {
            var res = element
                .text()    /* get the text of element */
                .replace(/\s+/g, ' ') /* collapse multiple whitespaces */
                .replace(/\0\b\n\r\f\t/g, ''); /* remove non-letter symbols */
            return jQuery.trim(res);
        }
    }
};

// ## VIE.StanbolConnector(options)
// The StanbolConnector is the connection between the VIE Stanbol service
// and the actual ajax calls.
// **Parameters**:
// *{object}* **options** The options.
// **Throws**:
// *nothing*
// **Returns**:
// *{VIE.StanbolConnector}* : The **new** VIE.StanbolConnector instance.
// **Example usage**:
//
//     var stnblConn = new vie.StanbolConnector({<some-configuration>});
VIE.prototype.StanbolConnector = function (options) {

    var defaults =  {
        /* you can pass an array of URLs which are then tried sequentially */
        url: ["http://dev.iks-project.eu/stanbolfull"],
        timeout : 20000, /* 20 seconds timeout */
        enhancer : {
            urlPostfix : "/enhancer",
            chain : "default"
        },
        entityhub : {
            /* if set to undefined, the Referenced Site Manager @ /entityhub/sites is used. */
            /* if set to, e.g., dbpedia, referenced Site @ /entityhub/site/dbpedia is used. */
            site : undefined,
            urlPostfix : "/entityhub",
            local : false
        },
        sparql : {
            urlPostfix : "/sparql"
        },
        contenthub : {
            urlPostfix : "/contenthub",
            index : "contenthub"
        },
        ontonet : {
            urlPostfix : "/ontonet"
        },
        factstore : {
            urlPostfix : "/factstore"
        },
        rules : {
            urlPostfix : "/rules"
        },
        cmsadapter : {
            urlPostfix : "/cmsadapter"
        }
    };

    /* the options are merged with the default options */
    this.options = jQuery.extend(true, defaults, options ? options : {});
    this.options.url = (_.isArray(this.options.url))? this.options.url : [ this.options.url ];

    this._init();

    this.baseUrl = (_.isArray(options.url))? options.url : [ options.url ];
};

VIE.prototype.StanbolConnector.prototype = {

// ### _init()
// Basic setup of the stanbol connector.  This is called internally by the constructor!
// **Parameters**:
// *nothing*
// **Throws**:
// *nothing*
// **Returns**:
// *{VIE.StanbolConnector}* : The VIE.StanbolConnector instance itself.
    _init : function () {
        var connector = this;

        /* basic setup for the ajax connection */
        jQuery.ajaxSetup({
            converters: {"text application/rdf+json": function(s){return JSON.parse(s);}},
            timeout: connector.options.timeout
        });

        return this;
    },

    _iterate : function (params) {
        if (!params) { return; }

        if (params.urlIndex >= this.options.url.length) {
            params.error.call(this, "Could not connect to the given Stanbol endpoints! Please check for their setup!");
            return;
        }

        var retryErrorCb = function (c, p) {
            /* in case a Stanbol backend is not responding and
             * multiple URLs have been registered
             */
            return function () {
                console.log("Stanbol connection error", arguments);
                p.urlIndex = p.urlIndex+1;
                c._iterate(p);
            };
        }(this, params);

        if (typeof exports !== "undefined" && typeof process !== "undefined") {
            /* We're on Node.js, don't use jQuery.ajax */
            return params.methodNode.call(
                    this,
                    params.url.call(this, params.urlIndex, params.args.options),
                    params.args,
                    params.success,
                    retryErrorCb);
        }

        return params.method.call(
                this,
                params.url.call(this, params.urlIndex, params.args.options),
                params.args,
                params.success,
                retryErrorCb);
    },

// ### analyze(text, success, error, options)
// This method sends the given text to Apache Stanbol returns the result by the success callback.
// **Parameters**:
// *{string}* **text** The text to be analyzed.
// *{function}* **success** The success callback.
// *{function}* **error** The error callback.
// *{object}* **options** Options, like the ```format```, or the ```chain``` to be used.
// **Throws**:
// *nothing*
// **Returns**:
// *{VIE.StanbolConnector}* : The VIE.StanbolConnector instance itself.
// **Example usage**:
//
//     var stnblConn = new vie.StanbolConnector(opts);
//     stnblConn.analyze("This is some text.",
//                 function (res) { ... },
//                 function (err) { ... });
    analyze: function(text, success, error, options) {
        options = (options)? options :  {};
        var connector = this;

        connector._iterate({
            method : connector._analyze,
            methodNode : connector._analyzeNode,
            url : function (idx, opts) {
                var chain = (opts.chain)? opts.chain : this.options.enhancer.chain;

                var u = this.options.url[idx].replace(/\/$/, '');
                u += this.options.enhancer.urlPostfix + "/chain/" + chain.replace(/\/$/, '');
                return u;
            },
            args : {
                text : text,
                format : options.format || "application/rdf+json",
                options : options
            },
            success : success,
            error : error,
            urlIndex : 0
        });
    },

    _analyze : function (url, args, success, error) {
        jQuery.ajax({
            success: success,
            error: error,
            url: url,
            type: "POST",
            data: args.text,
            dataType: args.format,
            contentType: "text/plain",
            accepts: {"application/rdf+json": "application/rdf+json"}
        });
    },

    _analyzeNode: function(url, args, success, error) {
        var request = require('request');
        var r = request({
            method: "POST",
            uri: url,
            body: args.text,
            headers: {
                Accept: args.format,
                'Content-Type': 'text/plain'
            }
        }, function(err, response, body) {
            try {
                success({results: JSON.parse(body)});
            } catch (e) {
                error(e);
            }
        });
        r.end();
    },

// ### load(uri, success, error, options)
// This method loads all properties from an entity and returns the result by the success callback.
// **Parameters**:
// *{string}* **uri** The URI of the entity to be loaded.
// *{function}* **success** The success callback.
// *{function}* **error** The error callback.
// *{object}* **options** Options, like the ```format```, the ```site```. If ```local``` is set, only the local entities are accessed.
// **Throws**:
// *nothing*
// **Returns**:
// *{VIE.StanbolConnector}* : The VIE.StanbolConnector instance itself.
// **Example usage**:
//
//     var stnblConn = new vie.StanbolConnector(opts);
//     stnblConn.load("<http://dbpedia.org/resource/Barack_Obama>",
//                 function (res) { ... },
//                 function (err) { ... });

    load: function (uri, success, error, options) {
        var connector = this;
        options = (options)? options :  {};

        options.uri = uri.replace(/^</, '').replace(/>$/, '');

        connector._iterate({
            method : connector._load,
            methodNode : connector._loadNode,
            success : success,
            error : error,
            url : function (idx, opts) {
                var site = (opts.site)? opts.site : this.options.entityhub.site;
                site = (site)? "/" + site : "s";

                var isLocal = opts.local;

                var u = this.options.url[idx].replace(/\/$/, '') + this.options.entityhub.urlPostfix;
                if (isLocal) {
                    u += "/entity?id=" + escape(opts.uri);
                } else {
                    u += "/site" + site + "/entity?id=" + escape(opts.uri);
                }
                return u;
            },
            args : {
                format : options.format || "application/rdf+json",
                options : options
            },
            urlIndex : 0
        });
    },

    _load : function (url, args, success, error) {
        jQuery.ajax({
            success: success,
            error: error,
            url: url,
            type: "GET",
            dataType: args.format,
            contentType: "text/plain",
            accepts: {"application/rdf+json": "application/rdf+json"}
        });
    },

    _loadNode: function(url, args, success, error) {
        var request = require('request');
        var r = request({
            method: "GET",
            uri: url,
            body: args.text,
            headers: {
                Accept: args.format
            }
        }, function(err, response, body) {
            try {
                success({results: JSON.parse(body)});
            } catch (e) {
                error(e);
            }
        });
        r.end();
    },

// ### find(term, limit, offset, success, error, options)
// This method finds entities given the term from the entity hub and returns the result by the success callback.
// **Parameters**:
// *{string}* **term** The term to be searched for.
// *{int}* **limit** The limit of results to be returned.
// *{int}* **offset** The offset to be search for.
// *{function}* **success** The success callback.
// *{function}* **error** The error callback.
// *{object}* **options** Options, like the ```format```. If ```local``` is set, only the local entities are accessed.
// **Throws**:
// *nothing*
// **Returns**:
// *{VIE.StanbolConnector}* : The VIE.StanbolConnector instance itself.
// **Example usage**:
//
//     var stnblConn = new vie.StanbolConnector(opts);
//     stnblConn.find("Bishofsh", 10, 0,
//                 function (res) { ... },
//                 function (err) { ... });
    find: function(term, limit, offset, success, error, options) {
        options = (options)? options :  {};
        /* curl -X POST -d "name=Bishofsh&limit=10&offset=0" http://localhost:8080/entityhub/sites/find */

        var connector = this;

        if (!term || term === "") {
            error ("No term given!");
            return;
        }

        offset = (offset)? offset : 0;
        limit  = (limit)? limit : 10;

        connector._iterate({
            method : connector._find,
            methodNode : connector._findNode,
            success : success,
            error : error,
            url : function (idx, opts) {
                var site = (opts.site)? opts.site : this.options.entityhub.site;
                site = (site)? "/" + site : "s";

                var isLocal = opts.local;

                var u = this.options.url[idx].replace(/\/$/, '') + this.options.entityhub.urlPostfix;
                if (isLocal) {
                    u += "/sites/find";
                } else {
                    u += "/site" + site + "/find";
                }

                return u;
            },
            args : {
                term : term,
                offset : offset,
                limit : limit,
                format : options.format || "application/rdf+json",
                options : options
            },
            urlIndex : 0
        });
    },

    _find : function (url, args, success, error) {
        jQuery.ajax({
            success: success,
            error: error,
            url: url,
            type: "POST",
            data: "name=" + args.term + "&limit=" + args.limit + "&offset=" + args.offset,
            dataType: args.format,
            contentType : "application/x-www-form-urlencoded",
            accepts: {"application/rdf+json": "application/rdf+json"}
        });
    },

    _findNode: function(url, args, success, error) {
        var request = require('request');
        var r = request({
            method: "POST",
            uri: url,
            body : "name=" + args.term + "&limit=" + args.limit + "&offset=" + args.offset,
            headers: {
                Accept: args.format
            }
        }, function(err, response, body) {
            try {
                success({results: JSON.parse(body)});
            } catch (e) {
                error(e);
            }
        });
        r.end();
    },

// ### lookup(uri, success, error, options)
// TODO.
// **Parameters**:
// *{string}* **uri** The URI of the entity to be loaded.
// *{function}* **success** The success callback.
// *{function}* **error** The error callback.
// *{object}* **options** Options, ```create```.
//    If the parsed ID is a URI of a Symbol, than the stored information of the Symbol are returned in the requested media type ('accept' header field).
//    If the parsed ID is a URI of an already mapped entity, then the existing mapping is used to get the according Symbol.
//    If "create" is enabled, and the parsed URI is not already mapped to a Symbol, than all the currently active referenced sites are searched for an Entity with the parsed URI.
//    If the configuration of the referenced site allows to create new symbols, than a the entity is imported in the Entityhub, a new Symbol and EntityMapping is created and the newly created Symbol is returned.
//    In case the entity is not found (this also includes if the entity would be available via a referenced site, but create=false) a 404 "Not Found" is returned.
//    In case the entity is found on a referenced site, but the creation of a new Symbol is not allowed a 403 "Forbidden" is returned.
// **Throws**:
// *nothing*
// **Returns**:
// *{VIE.StanbolConnector}* : The VIE.StanbolConnector instance itself.
    lookup: function(uri, success, error, options) {
        options = (options)? options :  {};
        /*/lookup/?id=http://dbpedia.org/resource/Paris&create=false"*/
        var connector = this;

        uri = uri.replace(/^</, '').replace(/>$/, '');

        options.uri = uri;
        options.create = (options.create)? options.create : false;

        connector._iterate({
            method : connector._lookup,
            methodNode : connector._lookupNode,
            success : success,
            error : error,
            url : function (idx, opts) {

                 var u = this.options.url[idx].replace(/\/$/, '') + this.options.entityhub.urlPostfix;
                 u += "/lookup?id=" + escape(opts.uri) + "&create=" + opts.create;
                 return u;
            },
            args : {
                format : options.format || "application/rdf+json",
                options : options
            },
            urlIndex : 0
         });
     },

     _lookup : function (url, args, success, error) {
        jQuery.ajax({
             success: success,
             error: error,
             url: url,
             type: "GET",
             dataType: args.format,
             contentType: "text/plain",
             accepts: {"application/rdf+json": "application/rdf+json"}
         });
     },

     _lookupNode: function(url, args, success, error) {
         var request = require('request');
         var r = request({
             method: "GET",
             uri: url,
             body: args.text,
             headers: {
                 Accept: args.format
             }
         }, function(err, response, body) {
             try {
                 success({results: JSON.parse(body)});
             } catch (e) {
                 error(e);
             }
         });
         r.end();
     },

 // ### referenced(success, error, options)
 // This method returns a list of all referenced sites that the entityhub comprises.
 // **Parameters**:
 // *{function}* **success** The success callback.
 // *{function}* **error** The error callback.
 // *{object}* **options** Options, unused here.
 // **Throws**:
 // *nothing*
 // **Returns**:
 // *{VIE.StanbolConnector}* : The VIE.StanbolConnector instance itself.
 // **Example usage**:
 //
//      var stnblConn = new vie.StanbolConnector(opts);
//      stnblConn.referenced(
//                  function (res) { ... },
//                  function (err) { ... });
     referenced: function(success, error, options) {
        options = (options)? options :  {};
        var connector = this;

        var successCB = function (sites) {
          if (!_.isArray(sites)) {
            sites = JSON.parse(sites);
          }
          var sitesStripped = [];
          for (var s = 0, l = sites.length; s < l; s++) {
            sitesStripped.push(sites[s].replace(/.+\/(.+?)\/?$/, "$1"));
          }
          return success(sitesStripped);
        };

        connector._iterate({
            method : connector._referenced,
            methodNode : connector._referencedNode,
            success : successCB,
            error : error,
            url : function (idx, opts) {
                 var u = this.options.url[idx].replace(/\/$/, '');
                 u += this.options.entityhub.urlPostfix + "/sites/referenced";

                return u;
            },
            args : {
                options : options
            },
            urlIndex : 0
         });
     },

     _referenced : function (url, args, success, error) {
        jQuery.ajax({
             success: success,
             error: error,
             url: url,
             type: "GET",
             accepts: {"application/rdf+json": "application/rdf+json"}
         });
     },

     _referencedNode: function(url, args, success, error) {
         var request = require('request');
         var r = request({
             method: "GET",
             uri: url,
             headers: {
                 Accept: args.format
             }
         }, function(err, response, body) {
             try {
                 success({results: JSON.parse(body)});
             } catch (e) {
                 error(e);
             }
         });
         r.end();
     },

// ### sparql(query, success, error, options)
// TODO.
// **Parameters**:
// TODO
// *{function}* **success** The success callback.
// *{function}* **error** The error callback.
// *{object}* **options** Options, unused here.
// **Throws**:
// *nothing*
// **Returns**:
// *{VIE.StanbolConnector}* : The VIE.StanbolConnector instance itself.
     sparql: function(query, success, error, options) {
        options = (options)? options :  {};
         var connector = this;

        connector._iterate({
            method : connector._sparql,
            methodNode : connector._sparqlNode,
            success : success,
            error : error,
            url : function (idx, opts) {
                var u = this.options.url[idx].replace(/\/$/, '');
                u += this.options.sparql.urlPostfix.replace(/\/$/, '');

                return u;
            },
            args : {
                query : query,
                options : options
            },
            urlIndex : 0
          });
      },

      _sparql : function (url, args, success, error) {
        jQuery.ajax({
              success: success,
              error: error,
              url: url,
              type: "POST",
              data : "query=" + args.query,
              contentType : "application/x-www-form-urlencoded"
          });
      },

      _sparqlNode: function(url, args, success, error) {
          var request = require('request');
          var r = request({
              method: "POST",
              uri: url,
              body : JSON.stringify({query : args.query}),
              headers: {
                  Accept: args.format
              }
          }, function(err, response, body) {
              try {
                  success({results: JSON.parse(body)});
              } catch (e) {
                  error(e);
              }
          });
          r.end();
      },

// ### ldpath(query, success, error, options)
// TODO.
// **Parameters**:
// TODO
// *{function}* **success** The success callback.
// *{function}* **error** The error callback.
// *{object}* **options** Options, unused here.
// **Throws**:
// *nothing*
// **Returns**:
// *{VIE.StanbolConnector}* : The VIE.StanbolConnector instance itself.
    ldpath: function(ldpath, context, success, error, options) {
        options = (options)? options :  {};
        var connector = this;

        context = (_.isArray(context))? context : [ context ];

        var contextStr = "";
        for (var c = 0; c < context.length; c++) {
            contextStr += "&context=" + context[c];
        }

        connector._iterate({
            method : connector._ldpath,
            methodNode : connector._ldpathNode,
            success : success,
            error : error,
            url : function (idx, opts) {
                var site = (opts.site)? opts.site : this.options.entityhub.site;
                site = (site)? "/" + site : "s";

                var isLocal = opts.local;

                var u = this.options.url[idx].replace(/\/$/, '') + this.options.entityhub.urlPostfix;
                if (!isLocal)
                    u += "/site" + site;
                u += "/ldpath";

                return u;
            },
            args : {
                ldpath : ldpath,
                context : contextStr,
                format : options.format || "application/rdf+json",
                options : options
            },
            urlIndex : 0
         });
     },

     _ldpath : function (url, args, success, error) {
        jQuery.ajax({
             success: success,
             error: error,
             url: url,
             type: "POST",
             data : "ldpath=" + args.ldpath + args.context,
             contentType : "application/x-www-form-urlencoded",
             dataType: args.format,
             accepts: {"application/rdf+json": "application/rdf+json"}
         });
     },

     _ldpathNode: function(url, args, success, error) {
         var request = require('request');
         var r = request({
             method: "POST",
             uri: url,
             body : "ldpath=" + args.ldpath + args.context,
             headers: {
                 Accept: args.format
             }
         }, function(err, response, body) {
             try {
                 success({results: JSON.parse(body)});
             } catch (e) {
                 error(e);
             }
         });
         r.end();
     },

// ### uploadContent(content, success, error, options)
// TODO.
// **Parameters**:
// TODO
// *{function}* **success** The success callback.
// *{function}* **error** The error callback.
// *{object}* **options** Options, unused here.
// **Throws**:
// *nothing*
// **Returns**:
// *{VIE.StanbolConnector}* : The VIE.StanbolConnector instance itself.
      uploadContent: function(content, success, error, options) {
        options = (options)? options :  {};
        var connector = this;

        connector._iterate({
            method : connector._uploadContent,
            methodNode : connector._uploadContentNode,
            success : success,
            error : error,
            url : function (idx, opts) {
                 var u = this.options.url[idx].replace(/\/$/, '');
                 u += this.options.contenthub.urlPostfix.replace(/\/$/, '');

                 var index = (opts.index)? opts.index : this.options.contenthub.index;

                 u += "/" + index.replace(/\/$/, '');
                 u += "/store";

                 return u;
            },
            args : {
                content: content,
                options : options
            },
            urlIndex : 0
           });
       },

       _uploadContent : function (url, args, success, error) {
           jQuery.ajax({
               success: success,
               error: error,
               url: url,
               type: "POST",
               data : args.content,
               contentType : "text/plain"
           });
       },

       _uploadContentNode: function(url, args, success, error) {
           var request = require('request');
           var r = request({
               method: "POST",
               uri: url,
               body : args.content,
               headers: {
                   Accept: "application/rdf+xml",
                   "Content-Type" : "text/plain"
               }
           }, function(err, response, body) {
               try {
                   success({results: JSON.parse(body)});
               } catch (e) {
                   error(e);
               }
           });
           r.end();
       },

//### createFactSchema(url, schema, success, error, options)
//TODO.
//**Parameters**:
//TODO
//*{function}* **success** The success callback.
//*{function}* **error** The error callback.
//*{object}* **options** Options, unused here.
//**Throws**:
//*nothing*
//**Returns**:
//*{VIE.StanbolConnector}* : The VIE.StanbolConnector instance itself.
      createFactSchema: function(url, schema, success, error, options) {
             options = (options)? options :  {};
             var connector = this;

             options.url = url;

             connector._iterate({
                method : connector._createFactSchema,
                methodNode : connector._createFactSchemaNode,
                success : success,
                error : error,
                url : function (idx, opts) {
                  var u = this.options.url[idx].replace(/\/$/, '');
                  u += this.options.factstore.urlPostfix.replace(/\/$/, '');

                  u += "/facts/" + escape(opts.url);

                  return u;
                },
                args : {
                    url : url,
                    schema : schema,
                    options : options
                },
                urlIndex : 0
            });
        },

        _createFactSchema : function (url, args, success, error) {
               jQuery.ajax({
                success: success,
                error: error,
                url: url,
                type: "PUT",
                data : args.schema,
                contentType : "application/json",
                dataType: "application/json"
            });
        },

        _createFactSchemaNode: function(url, args, success, error) {
            var request = require('request');
            var r = request({
                method: "PUT",
                uri: url,
                body : args.schema,
                headers: {
                    Accept: "application/json",
                    "Content-Type" : "application/json"
                }
            }, function(err, response, body) {
                try {
                    success({results: JSON.parse(body)});
                } catch (e) {
                    error(e);
                }
            });
            r.end();
        },

        createFact: function(fact, success, error, options) {
             options = (options)? options :  {};
             var connector = this;

             connector._iterate({
                method : connector._createFact,
                methodNode : connector._createFactNode,
                success : success,
                error : error,
                url : function (idx, opts) {
                     var u = this.options.url[idx].replace(/\/$/, '');
                     u += this.options.factstore.urlPostfix.replace(/\/$/, '');

                     u += "/facts";

                  return u;
                },
                args : {
                    fact : fact,
                    options : options
                },
                urlIndex : 0
               });
       },

       _createFact : function (url, args, success, error) {
           jQuery.ajax({
               success: success,
               error: error,
               url: url,
               type: "POST",
               data : args.fact,
               contentType : "application/json",
               dataType: "application/json"
           });
       },

       _createFactNode: function(url, args, success, error) {
           var request = require('request');
           var r = request({
               method: "POST",
               uri: url,
               body : args.fact,
               headers: {
                   Accept: "application/json",
                   "Content-Type" : "application/json"
               }
           }, function(err, response, body) {
               try {
                   success({results: JSON.parse(body)});
               } catch (e) {
                   error(e);
               }
           });
           r.end();
       },

        queryFact: function(query, success, error, options) {
             options = (options)? options :  {};
             var connector = this;

             connector._iterate({
                method : connector._queryFact,
                methodNode : connector._queryFactNode,
                success : success,
                error : error,
                url : function (idx, opts) {
                     var u = this.options.url[idx].replace(/\/$/, '');
                     u += this.options.factstore.urlPostfix.replace(/\/$/, '');

                     u += "/query";

                  return u;
                },
                args : {
                    query : query,
                    options : options
                },
                urlIndex : 0
               });
       },

       _queryFact : function (url, args, success, error) {
           jQuery.ajax({
               success: success,
               error: error,
               url: url,
               type: "POST",
               data : args.query,
               contentType : "application/json",
               dataType: "application/json"
           });
       },

       _queryFactNode: function(url, args, success, error) {
           var request = require('request');
           var r = request({
               method: "POST",
               uri: url,
               body : args.query,
               headers: {
                   Accept: "application/json",
                   "Content-Type" : "application/json"
               }
           }, function(err, response, body) {
               try {
                   success({results: JSON.parse(body)});
               } catch (e) {
                   error(e);
               }
           });
           r.end();
       }
};
})();

//     VIE - Vienna IKS Editables
//     (c) 2011 Henri Bergius, IKS Consortium
//     (c) 2011 Sebastian Germesin, IKS Consortium
//     (c) 2011 Szaby Grünwald, IKS Consortium
//     VIE may be freely distributed under the MIT license.
//     For all details and documentation:
//     http://viejs.org/

// ## VIE - ZemantaService service
// The ZemantaService ...
(function(){

// ## VIE.ZemantaService(options)
// This is the constructor to instantiate a new service to collect
// properties of an entity from Zemanta.
// **Parameters**:
// *{object}* **options** Optional set of fields, ```namespaces```, ```rules```, ```url```, or ```name```.
// **Throws**:
// *nothing*
// **Returns**:
// *{VIE.ZemantaService}* : A **new** VIE.ZemantaService instance.
// **Example usage**:
//
//     var service = new vie.ZemantaService({<some-configuration>});
VIE.prototype.ZemantaService = function(options) {
    var defaults = {
        /* the default name of this service */
        name : 'zemanta',
        /* you can pass an array of URLs which are then tried sequentially */
        url: ["http://api.zemanta.com/services/rest/0.0/"],
        timeout : 20000, /* 20 seconds timeout */
        namespaces : {
            zemanta: "http://s.zemanta.com/ns#"
        },
        /* default rules that are shipped with this service */
        rules : [
                 {
                'left' : [
                    '?subject a zemanta:Recognition',
                    '?subject zemanta:object ?object',
                    '?object owl:sameAs ?entity'
                ],
                'right' : [
                    '?entity zemanta:hasEntityAnnotation ?subject'
                ]
            }
         ],
         "api_key" : undefined
    };
    /* the options are merged with the default options */
    this.options = jQuery.extend(true, defaults, options ? options : {});

    this.vie = null; /* will be set via VIE.use(); */
    /* overwrite options.name if you want to set another name */
    this.name = this.options.name;

    /* basic setup for the ajax connection */
    jQuery.ajaxSetup({
        converters: {"text application/rdf+json": function(s){return JSON.parse(s);}},
        timeout: this.options.timeout
    });
};

VIE.prototype.ZemantaService.prototype = {

// ### init()
// This method initializes certain properties of the service and is called
// via ```VIE.use()```.
// **Parameters**:
// *nothing*
// **Throws**:
// *nothing*
// **Returns**:
// *{VIE.ZemantaService}* : The VIE.ZemantaService instance itself.
// **Example usage**:
//
//     var service = new vie.ZemantaService({<some-configuration>});
//     service.init();
    init: function(){

        for (var key in this.options.namespaces) {
            var val = this.options.namespaces[key];
            this.vie.namespaces.add(key, val);
        }

        this.rules = jQuery.extend([], VIE.Util.transformationRules(this));
        this.rules = jQuery.merge(this.rules, (this.options.rules) ? this.options.rules : []);

        this.connector = new this.vie.ZemantaConnector(this.options);

        /* adding these entity types to VIE helps later the querying */
        this.vie.types.addOrOverwrite('zemanta:Recognition', [
            /*TODO: add attributes */
        ]).inherit("owl:Thing");
    },

// ### analyze(analyzable)
// This method extracts text from the jQuery element and sends it to Zemanta for analysis.
// **Parameters**:
// *{VIE.Analyzable}* **analyzable** The analyzable.
// **Throws**:
// *{Error}* if an invalid VIE.Findable is passed.
// **Returns**:
// *{VIE.StanbolService}* : The VIE.ZemantaService instance itself.
// **Example usage**:
//
//     var service = new vie.ZemantaService({<some-configuration>});
//     service.analyzable(
//         new vie.Analyzable({element : jQuery("#foo")})
//     );
    analyze: function(analyzable) {
        var service = this;

        var correct = analyzable instanceof this.vie.Analyzable;
        if (!correct) {throw "Invalid Analyzable passed";}

        var element = analyzable.options.element ? analyzable.options.element : jQuery('body');

        var text = service._extractText(element);

        if (text.length > 0) {
            var success = function (results) {
                _.defer(function(){
                    var entities = VIE.Util.rdf2Entities(service, results);
                    analyzable.resolve(entities);
                });
            };
            var error = function (e) {
                analyzable.reject(e);
            };

            var options = {};

            this.connector.analyze(text, success, error, options);

        } else {
            console.warn("No text found in element.");
            analyzable.resolve([]);
        }

    },

    /* this private method extracts the outerHTML from a jQuery element */
    _extractText: function (element) {
        return jQuery(element).wrap("<div>").parent().html();
    }
};

// ## VIE.ZemantaConnector(options)
// The ZemantaConnector is the connection between the VIE Zemanta service
// and the actual ajax calls.
// **Parameters**:
// *{object}* **options** The options.
// **Throws**:
// *nothing*
// **Returns**:
// *{VIE.ZemantaConnector}* : The **new** VIE.ZemantaConnector instance.
// **Example usage**:
//
//     var conn = new vie.ZemantaConnector({<some-configuration>});
VIE.prototype.ZemantaConnector = function (options) {

    var defaults =  {
        /* you can pass an array of URLs which are then tried sequentially */
        url: ["http://api.zemanta.com/services/rest/0.0/"],
        timeout : 20000, /* 20 seconds timeout */
        "api_key" : undefined
    };

    /* the options are merged with the default options */
    this.options = jQuery.extend(true, defaults, options ? options : {});
    this.options.url = (_.isArray(this.options.url))? this.options.url : [ this.options.url ];

    this._init();

    this.baseUrl = (_.isArray(options.url))? options.url : [ options.url ];
};

VIE.prototype.ZemantaConnector.prototype = {

// ### _init()
// Basic setup of the Zemanta connector.  This is called internally by the constructor!
// **Parameters**:
// *nothing*
// **Throws**:
// *nothing*
// **Returns**:
// *{VIE.ZemantaConnector}* : The VIE.ZemantaConnector instance itself.
    _init : function () {
        var connector = this;

        /* basic setup for the ajax connection */
        jQuery.ajaxSetup({
            converters: {"text application/rdf+json": function(s){return JSON.parse(s);}},
            timeout: connector.options.timeout
        });

        return this;
    },

    _iterate : function (params) {
        if (!params) { return; }

        if (params.urlIndex >= this.options.url.length) {
            params.error.call(this, "Could not connect to the given Zemanta endpoints! Please check for their setup!");
            return;
        }

        var retryErrorCb = function (c, p) {
            /* in case a Zemanta backend is not responding and
             * multiple URLs have been registered
             */
            return function () {
                console.log("Zemanta connection error", arguments);
                p.urlIndex = p.urlIndex+1;
                c._iterate(p);
            };
        }(this, params);

        if (typeof exports !== "undefined" && typeof process !== "undefined") {
            /* We're on Node.js, don't use jQuery.ajax */
            return params.methodNode.call(
                    this,
                    params.url.call(this, params.urlIndex, params.args.options),
                    params.args,
                    params.success,
                    retryErrorCb);
        }

        return params.method.call(
                this,
                params.url.call(this, params.urlIndex, params.args.options),
                params.args,
                params.success,
                retryErrorCb);
    },

// ### analyze(text, success, error, options)
// This method sends the given text to Zemanta returns the result by the success callback.
// **Parameters**:
// *{string}* **text** The text to be analyzed.
// *{function}* **success** The success callback.
// *{function}* **error** The error callback.
// *{object}* **options** Options, like the ```format```, or the ```chain``` to be used.
// **Throws**:
// *nothing*
// **Returns**:
// *{VIE.ZemantaConnector}* : The VIE.ZemantaConnector instance itself.
// **Example usage**:
//
//     var conn = new vie.ZemantaConnector(opts);
//     conn.analyze("<p>This is some HTML text.</p>",
//                 function (res) { ... },
//                 function (err) { ... });
    analyze: function(text, success, error, options) {
        options = (options)? options :  {};
        var connector = this;

        connector._iterate({
            method : connector._analyze,
            methodNode : connector._analyzeNode,
            success : success,
            error : error,
            url : function (idx, opts) {
                var u = this.options.url[idx].replace(/\/$/, '');
                return u;
            },
            args : {
                text : text,
                format : options.format || "rdfxml",
                options : options
            },
            urlIndex : 0
        });
    },

    _analyze : function (url, args, success, error) {
        jQuery.ajax({
            success: function(a, b, c){
                var responseData = c.responseText.replace(/<z:signature>.*?<\/z:signature>/, '');
                success(responseData);
            },
            error: error,
            url: url,
            type: "POST",
            dataType: "xml",
            data: {
                method : "zemanta.suggest",
                text : args.text,
                format : args.format,
                api_key : this.options.api_key,
                return_rdf_links : args.options.return_rdf_links
            },
            contentType: "text/plain",
            accepts: {"application/rdf+json": "application/rdf+json"}
        });
    },

    _analyzeNode: function(url, args, success, error) {
        var request = require('request');
        var r = request({
            method: "POST",
            uri: url,
            body: args.text,
            headers: {
                Accept: args.format,
                'Content-Type': 'text/plain'
            }
        }, function(err, response, body) {
            try {
                success({results: JSON.parse(body)});
            } catch (e) {
                error(e);
            }
        });
        r.end();
    }
};
})();

/*global VIE:false Backbone:false _:false jQuery:false */
if (!VIE.prototype.view) {
    VIE.prototype.view = {};
}

VIE.prototype.view.Collection = Backbone.View.extend({
    // Ensure the collection view gets updated when items get added or removed
    initialize: function() {
        this.templates = this.options.templates;
        this.service = this.options.service;
        if (!this.service) {
            throw "No RDFa service provided to the Collection View";
        }
        this.owner = this.options.owner;
        this.definition = this.options.definition;
        this.entityViews = {};

        _.bindAll(this, 'addItem', 'removeItem', 'refreshItems');

        this.collection.on('add', this.addItem);
        this.collection.on('remove', this.removeItem);
        this.collection.on('reset', this.refreshItems);

        // Make the view aware of existing entities in collection
        this.collection.each(function(entity) {
            this.registerItem(entity, this.collection);
        }, this);
    },

    /*
     * ## canAdd: check if the view can add an item
     *
     * The Collection View can add items to itself if two constraints
     * pass:
     *
     *  * Collection View has a template
     *  * The attribute definition for the collection allows adding a model
     *
     *  Optionally you can pass a type to this method to check per type.
     */
    canAdd: function (type) {
      if (_.isEmpty(this.templates)) {
        return false;
      }

      if (type && !this.templates[type]) {
        return false;
      }

      return this.collection.canAdd(type);
    },

    addItem: function(entity, collection) {
        if (collection !== this.collection) {
            return;
        }

        var childType = entity.get('@type');
        var childTypeName;
        if (_.isArray(childType)) {
          _.each(childType, function (type) {
            if (this.canAdd(type.id)) {
              childTypeName = type.id;
            }
          }, this);
        } else {
          if (this.canAdd(childType.id)) {
            childTypeName = childType.id;
          }
        }

        if (!childTypeName) {
            return;
        }

        var self = this;
        // Run the templating function
        this.templates[childTypeName](entity, function (template) {
            // Template has been generated, register a view
            var entityView = self.service._registerEntityView(entity, template, true);
            var entityElement = entityView.render().$el;
            if (entity.id) {
                self.service.setElementSubject(entity.getSubjectUri(), entityElement);
            }

            // Add the new view to DOM
            var entityIndex = collection.indexOf(entity);
            if (entityIndex === 0) {
                self.$el.prepend(entityElement);
            } else {
                var previousEntity = collection.at(entityIndex - 1);
                var previousView = self.entityViews[previousEntity.cid];
                if (previousView) {
                    previousView.$el.after(entityElement);
                } else {
                    self.$el.append(entityElement);
                }
            }

            // Update reverse relations, if any
            self.findReverseRelations(entity, entityElement);

            // Handle eventing
            self.trigger('add', entityView);
            self.entityViews[entity.cid] = entityView;
            entityElement.show();
        }, this);
    },

    findReverseRelations: function (entity, element) {
        // Ensure we catch all inferred predicates. We add these via JSONLD
        // so the references get properly Collectionized.
        var service = this.service;
        element.parent('[rev]').each(function() {
            var predicate = jQuery(this).attr('rev');
            var relations = {};
            relations[predicate] = new service.vie.Collection([], {
              vie: service.vie,
              predicate: predicate
            });
            var model = service.vie.entities.get(service.getElementSubject(this));
            if (model) {
                relations[predicate].addOrUpdate(model);
            }
            entity.set(relations);
        });
    },

    registerItem: function(entity, collection) {
        var element = this.service.getElementBySubject(entity.id, this.el);
        if (!element) {
            return;
        }
        var entityView = this.service._registerEntityView(entity, element);
        this.entityViews[entity.cid] = entityView;
    },

    removeItem: function(entity) {
        if (!this.entityViews[entity.cid]) {
            return;
        }

        this.trigger('remove', this.entityViews[entity.cid]);
        jQuery(this.entityViews[entity.cid].el).remove();
        delete(this.entityViews[entity.cid]);
    },

    refreshItems: function(collection) {
        _.each(this.entityViews, function(view, cid) {
          jQuery(view.el).remove();
        });
        this.entityViews = {};
        collection.forEach(function(entity) {
            this.addItem(entity, collection);
        }, this);
    }
});
/*global VIE:false Backbone:false _:false */
if (!VIE.prototype.view) {
    VIE.prototype.view = {};
}

VIE.prototype.view.Entity = Backbone.View.extend({
    initialize: function(options) {
        this.service = options.service ? options.service : 'rdfa';
        this.vie = options.vie;

        // Ensure view gets updated when properties of the Entity change.
        _.bindAll(this, 'render', 'renderAbout');
        this.model.on('change', this.render);
        this.model.on('change:@subject', this.renderAbout);
    },

    // Rendering a view means writing the properties of the Entity back to
    // the element containing our RDFa annotations.
    render: function() {
        this.vie.save({
                element: this.el,
                entity: this.model
            }).
            to(this.service).
            execute();
        return this;
    },

    renderAbout: function () {
        this.vie.service(this.service).setElementSubject(this.model.getSubjectUri(), this.el);
    }
});
// Based on [Julian Aubourg's xdr.js](https://github.com/jaubourg/ajaxHooks/blob/master/src/ajax/xdr.js)
// Internet Explorer 8 & 9 don't support the cross-domain request protocol known as CORS.
// Their solution we use is called XDomainRequest. This module is a wrapper for
// XDR using jQuery ajaxTransport, jQuery's way to support such cases.
// Author: Szaby Grünwald @ Salzburg Research, 2011
/*global XDomainRequest:false console:false jQuery:false */
var root = this;
(function( jQuery ) {

if ( root.XDomainRequest ) {
  jQuery.ajaxTransport(function( s ) {
    if ( s.crossDomain && s.async ) {
      if ( s.timeout ) {
        s.xdrTimeout = s.timeout;
        delete s.timeout;
      }
      var xdr;
      return {
        send: function( _, complete ) {
          function callback( status, statusText, responses, responseHeaders ) {
            xdr.onload = xdr.onerror = xdr.ontimeout = jQuery.noop;
            xdr = undefined;
            complete( status, statusText, responses, responseHeaders );
          }
          xdr = new XDomainRequest();
          // For backends supporting header_* in the URI instead of real header parameters,
          // use the dataType for setting the Accept request header. e.g. Stanbol supports this.
          if(s.dataType){
              var headerThroughUriParameters = "header_Accept=" + encodeURIComponent(s.dataType);
              s.url = s.url + (s.url.indexOf("?") === -1 ? "?" : "&" ) + headerThroughUriParameters;
          }
          xdr.open( s.type, s.url );
          xdr.onload = function(e1, e2) {
            callback( 200, "OK", { text: xdr.responseText }, "Content-Type: " + xdr.contentType );
          };
          // XDR cannot differentiate between errors,
          // we call every error 404. Could be changed to another one.
          xdr.onerror = function(e) {
              console.error(JSON.stringify(e));
            callback( 404, "Not Found" );
          };
          if ( s.xdrTimeout ) {
            xdr.ontimeout = function() {
              callback( 0, "timeout" );
            };
            xdr.timeout = s.xdrTimeout;
          }
          xdr.send( ( s.hasContent && s.data ) || null );
        },
        abort: function() {
          if ( xdr ) {
            xdr.onerror = jQuery.noop();
            xdr.abort();
          }
        }
      };
    }
  });
}
})( jQuery );

})();
/*
    tabSlideOUt v1.3
    
    By William Paoli: http://wpaoli.building58.com

    To use you must have an image ready to go as your tab
    Make sure to pass in at minimum the path to the image and its dimensions:
    
    example:
    
        $('.slide-out-div').tabSlideOut({
                tabHandle: '.handle',                         //class of the element that will be your tab -doesnt have to be an anchor
                pathToTabImage: 'images/contact_tab.gif',     //relative path to the image for the tab
                imageHeight: '133px',                         //height of tab image
                imageWidth: '44px',                           //width of tab image   
        });

    or you can leave out these options
    and set the image properties using css
    
*/


(function($){
    $.fn.tabSlideOut = function(callerSettings) {
        var settings = $.extend({
            tabHandle: '.handle',
            speed: 300, 
            action: 'click',
            tabLocation: 'left',
            topPos: '200px',
            leftPos: '20px',
            fixedPosition: false,
            positioning: 'absolute',
            pathToTabImage: null,
            imageHeight: null,
            imageWidth: null,
            onLoadSlideOut: false                       
        }, callerSettings||{});

        settings.tabHandle = $(settings.tabHandle);
        var obj = this;
        if (settings.fixedPosition === true) {
            settings.positioning = 'fixed';
        } else {
            settings.positioning = 'absolute';
        }
        
        //ie6 doesn't do well with the fixed option
        if (document.all && !window.opera && !window.XMLHttpRequest) {
            settings.positioning = 'absolute';
        }
        

        
        //set initial tabHandle css
        
        if (settings.pathToTabImage != null) {
            settings.tabHandle.css({
            'background' : 'url('+settings.pathToTabImage+') no-repeat',
            'width' : settings.imageWidth,
            'height': settings.imageHeight
            });
        }
        
        settings.tabHandle.css({ 
            'display': 'block',
            'textIndent' : '-99999px',
            'outline' : 'none',
            'position' : 'absolute'
        });
        
        obj.css({
            'line-height' : '1',
            'position' : settings.positioning
        });

        
        var properties = {
                    containerWidth: parseInt(obj.outerWidth(), 10) + 'px',
                    containerHeight: parseInt(obj.outerHeight(), 10) + 'px',
                    tabWidth: parseInt(settings.tabHandle.outerWidth(), 10) + 'px',
                    tabHeight: parseInt(settings.tabHandle.outerHeight(), 10) + 'px'
                };

        //set calculated css
        if(settings.tabLocation === 'top' || settings.tabLocation === 'bottom') {
            obj.css({'left' : settings.leftPos});
            settings.tabHandle.css({'right' : 0});
        }
        
        if(settings.tabLocation === 'top') {
            obj.css({'top' : '-' + properties.containerHeight});
            settings.tabHandle.css({'bottom' : '-' + properties.tabHeight});
        }

        if(settings.tabLocation === 'bottom') {
            obj.css({'bottom' : '-' + properties.containerHeight, 'position' : 'fixed'});
            settings.tabHandle.css({'top' : '-' + properties.tabHeight});
            
        }
        
        if(settings.tabLocation === 'left' || settings.tabLocation === 'right') {
            obj.css({
                'height' : properties.containerHeight,
                'top' : settings.topPos
            });
            
            settings.tabHandle.css({'top' : 0});
        }
        
        if(settings.tabLocation === 'left') {
            obj.css({ 'left': '-' + properties.containerWidth});
            settings.tabHandle.css({'right' : '-' + properties.tabWidth});
        }

        if(settings.tabLocation === 'right') {
            obj.css({ 'right': '-' + properties.containerWidth});
            settings.tabHandle.css({'left' : '-' + properties.tabWidth});
            
            $('html').css('overflow-x', 'hidden');
        }

        //functions for animation events
        
        settings.tabHandle.click(function(event){
            event.preventDefault();
        });
        
        var slideIn = function() {
            
            if (settings.tabLocation === 'top') {
                obj.animate({top:'-' + properties.containerHeight}, settings.speed).removeClass('open');
            } else if (settings.tabLocation === 'left') {
                obj.animate({left: '-' + properties.containerWidth}, settings.speed).removeClass('open');
            } else if (settings.tabLocation === 'right') {
                obj.animate({right: '-' + properties.containerWidth}, settings.speed).removeClass('open');
            } else if (settings.tabLocation === 'bottom') {
                obj.animate({bottom: '-' + properties.containerHeight}, settings.speed).removeClass('open');
            }    
            
        };
        
        var slideOut = function() {
            
            if (settings.tabLocation == 'top') {
                obj.animate({top:'-3px'},  settings.speed).addClass('open');
            } else if (settings.tabLocation == 'left') {
                obj.animate({left:'-3px'},  settings.speed).addClass('open');
            } else if (settings.tabLocation == 'right') {
                obj.animate({right:'-3px'},  settings.speed).addClass('open');
            } else if (settings.tabLocation == 'bottom') {
                obj.animate({bottom:'-3px'},  settings.speed).addClass('open');
            }
        };

        var clickScreenToClose = function() {
            obj.click(function(event){
                event.stopPropagation();
            });
            
          /*  $(document).click(function(){
                slideIn();
            });*/
        };
        
        var clickAction = function(){
            settings.tabHandle.click(function(event){
                if (obj.hasClass('open')) {
                    slideIn();
                } else {
                    slideOut();
                }
            });
            
            clickScreenToClose();
        };
        
        var hoverAction = function(){
            obj.hover(
                function(){
                    slideOut();
                },
                
                function(){
                    slideIn();
                });
                
                settings.tabHandle.click(function(event){
                    if (obj.hasClass('open')) {
                        slideIn();
                    }
                });
                clickScreenToClose();
                
        };
        
        var slideOutOnLoad = function(){
            slideIn();
            setTimeout(slideOut, 500);
        };
        
        //choose which type of action to bind
        if (settings.action === 'click') {
            clickAction();
        }
        
        if (settings.action === 'hover') {
            hoverAction();
        }
        
        if (settings.onLoadSlideOut) {
            slideOutOnLoad();
        };
        
    };
})(jQuery);
// jQuery Context Menu Plugin
//
// Version 1.01
//
// Cory S.N. LaViska
// A Beautiful Site (http://abeautifulsite.net/)
//
// More info: http://abeautifulsite.net/2008/09/jquery-context-menu-plugin/
//
// Terms of Use
//
// This plugin is dual-licensed under the GNU General Public License
//   and the MIT License and is copyright A Beautiful Site, LLC.
//
if(jQuery)( function() {
	$.extend($.fn, {
		
		contextMenu: function(o, callback) {
			// Defaults
			if( o.menu == undefined ) return false;
			if( o.inSpeed == undefined ) o.inSpeed = 150;
			if( o.outSpeed == undefined ) o.outSpeed = 75;
			// 0 needs to be -1 for expected results (no fade)
			if( o.inSpeed == 0 ) o.inSpeed = -1;
			if( o.outSpeed == 0 ) o.outSpeed = -1;
			// Loop each context menu
			$(this).each( function() {
				var el = $(this);
				var offset = $(el).offset();
				// Add contextMenu class
				$('#' + o.menu).addClass('contextMenu');
				// Simulate a true right click
				$(this).mousedown( function(e) {
					var evt = e;
					evt.stopPropagation();
					$(this).mouseup( function(e) {
						e.stopPropagation();
						var srcElement = $(this);
						$(this).unbind('mouseup');
						if( evt.button == 2 ) {
							// Hide context menus that may be showing
							$(".contextMenu").hide();
							// Get this context menu
							var menu = $('#' + o.menu);
							
							if( $(el).hasClass('disabled') ) return false;
							
							// Detect mouse position
							var d = {}, x, y;
							if( self.innerHeight ) {
								d.pageYOffset = self.pageYOffset;
								d.pageXOffset = self.pageXOffset;
								d.innerHeight = self.innerHeight;
								d.innerWidth = self.innerWidth;
							} else if( document.documentElement &&
								document.documentElement.clientHeight ) {
								d.pageYOffset = document.documentElement.scrollTop;
								d.pageXOffset = document.documentElement.scrollLeft;
								d.innerHeight = document.documentElement.clientHeight;
								d.innerWidth = document.documentElement.clientWidth;
							} else if( document.body ) {
								d.pageYOffset = document.body.scrollTop;
								d.pageXOffset = document.body.scrollLeft;
								d.innerHeight = document.body.clientHeight;
								d.innerWidth = document.body.clientWidth;
							}
							(e.pageX) ? x = e.pageX : x = e.clientX + d.scrollLeft;
							(e.pageY) ? y = e.pageY : y = e.clientY + d.scrollTop;
							
							// Show the menu
							$(document).unbind('click');
							$(menu).css({ top: y, left: x }).fadeIn(o.inSpeed);
							// Hover events
							$(menu).find('A').mouseover( function() {
								$(menu).find('LI.hover').removeClass('hover');
								$(this).parent().addClass('hover');
							}).mouseout( function() {
								$(menu).find('LI.hover').removeClass('hover');
							});
							
							// Keyboard
							$(document).keypress( function(e) {
								switch( e.keyCode ) {
									case 38: // up
										if( $(menu).find('LI.hover').size() == 0 ) {
											$(menu).find('LI:last').addClass('hover');
										} else {
											$(menu).find('LI.hover').removeClass('hover').prevAll('LI:not(.disabled)').eq(0).addClass('hover');
											if( $(menu).find('LI.hover').size() == 0 ) $(menu).find('LI:last').addClass('hover');
										}
									break;
									case 40: // down
										if( $(menu).find('LI.hover').size() == 0 ) {
											$(menu).find('LI:first').addClass('hover');
										} else {
											$(menu).find('LI.hover').removeClass('hover').nextAll('LI:not(.disabled)').eq(0).addClass('hover');
											if( $(menu).find('LI.hover').size() == 0 ) $(menu).find('LI:first').addClass('hover');
										}
									break;
									case 13: // enter
										$(menu).find('LI.hover A').trigger('click');
									break;
									case 27: // esc
										$(document).trigger('click');
									break
								}
							});
							
							// When items are selected
							$('#' + o.menu).find('A').unbind('click');
							$('#' + o.menu).find('LI:not(.disabled) A').click( function() {
								$(document).unbind('click').unbind('keypress');
								$(".contextMenu").hide();
								// Callback
								if( callback ) callback( $(this).attr('href').substr(1), $(srcElement), {x: x - offset.left, y: y - offset.top, docX: x, docY: y} );
								return false;
							});
							
							// Hide bindings
							setTimeout( function() { // Delay for Mozilla
								$(document).click( function() {
									$(document).unbind('click').unbind('keypress');
									$(menu).fadeOut(o.outSpeed);
									return false;
								});
							}, 0);
						}
					});
				});
				
				// Disable text selection
				if( $.browser.mozilla ) {
					$('#' + o.menu).each( function() { $(this).css({ 'MozUserSelect' : 'none' }); });
				} else if( $.browser.msie ) {
					$('#' + o.menu).each( function() { $(this).bind('selectstart.disableTextSelect', function() { return false; }); });
				} else {
					$('#' + o.menu).each(function() { $(this).bind('mousedown.disableTextSelect', function() { return false; }); });
				}
				// Disable browser context menu (requires both selectors to work in IE/Safari + FF/Chrome)
				$(el).add($('UL.contextMenu')).bind('contextmenu', function() { return false; });
				
			});
			return $(this);
		},
		
		// Disable context menu items on the fly
		disableContextMenuItems: function(o) {
			if( o == undefined ) {
				// Disable all
				$(this).find('LI').addClass('disabled');
				return( $(this) );
			}
			$(this).each( function() {
				if( o != undefined ) {
					var d = o.split(',');
					for( var i = 0; i < d.length; i++ ) {
						$(this).find('A[href="' + d[i] + '"]').parent().addClass('disabled');
						
					}
				}
			});
			return( $(this) );
		},
		
		// Enable context menu items on the fly
		enableContextMenuItems: function(o) {
			if( o == undefined ) {
				// Enable all
				$(this).find('LI.disabled').removeClass('disabled');
				return( $(this) );
			}
			$(this).each( function() {
				if( o != undefined ) {
					var d = o.split(',');
					for( var i = 0; i < d.length; i++ ) {
						$(this).find('A[href="' + d[i] + '"]').parent().removeClass('disabled');
						
					}
				}
			});
			return( $(this) );
		},
		
		// Disable context menu(s)
		disableContextMenu: function() {
			$(this).each( function() {
				$(this).addClass('disabled');
			});
			return( $(this) );
		},
		
		// Enable context menu(s)
		enableContextMenu: function() {
			$(this).each( function() {
				$(this).removeClass('disabled');
			});
			return( $(this) );
		},
		
		// Destroy context menu(s)
		destroyContextMenu: function() {
			// Destroy specified context menus
			$(this).each( function() {
				// Disable action
				$(this).unbind('mousedown').unbind('mouseup');
			});
			return( $(this) );
		}
		
	});
})(jQuery);