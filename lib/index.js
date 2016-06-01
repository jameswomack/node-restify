// Copyright 2012 Mark Cavage, Inc.  All rights reserved.

'use strict';

let errors = require('restify-errors');

let bunyan = require('./bunyan_helper');
let Router = require('./router');
let Server = require('./server');
let shallowCopy = require('./utils').shallowCopy;

let InternalError = errors.InternalError;

/**
 * creates a server.
 * @public
 * @function createServer
 * @param    {Object} options an options object
 * @returns  {Server}
 */
function createServer(options) {

    let opts = shallowCopy(options || {});
    let server;

    opts.name = opts.name || 'restify';
    opts.log = opts.log || bunyan.createLogger(opts.name);
    opts.router = opts.router || new Router(opts);

    server = new Server(opts);
    server.on('uncaughtException', function (req, res, route, e) {
        if (this.listeners('uncaughtException').length > 1 ||
            res.headersSent) {
            return (false);
        }

        res.send(new InternalError(e, e.message || 'unexpected error'));
        return (true);
    });

    return (server);
}


/**
 * Returns a string representation of a URL pattern , with its
 * parameters filled in by the passed hash.
 *
 * If a key is not found in the hash for a param, it is left alone.
 * @public
 * @function realizeUrl
 * @param   {String} pattern a url string
 * @param   {Object} params  a hash of parameter names to values for
 *                           substitution
 * @returns {String}
 */
function realizeUrl(pattern, params) {
    let p = pattern.replace(/\/:([^/]+)/g, function (match, k) {
        return (params.hasOwnProperty(k) ? '/' + params[k] : match);
    });


    return (require('./utils').sanitizePath(p));
}


///--- Exports

module.exports = {
    // Miscellaneous API
    get bunyan() {
        return (require('./bunyan_helper'));
    },

    errors: {}

};

if (!process.env.RESTIFY_CLIENT_ONLY) {

    module.exports.createServer = createServer;
    module.exports.httpDate = require('./http_date');
    module.exports.realizeUrl = realizeUrl;
    module.exports.formatters = require('./formatters');
    module.exports.plugins = {};
    let plugins = require('./plugins');
    Object.keys(plugins).forEach(function (k) {
        module.exports.plugins[k] = plugins[k];
        module.exports[k] = plugins[k];
    });
}
