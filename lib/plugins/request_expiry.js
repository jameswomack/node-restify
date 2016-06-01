'use strict';

let assert = require('assert-plus');
let GatewayTimeoutError = require('restify-errors').GatewayTimeoutError;

/**
 * A request expiry will use the headers to tell if the
 * incoming request has expired or not.  The header is
 * expected to be in absolute time since the epoch.
 * @public
 * @function requestExpiry
 * @param    {Object} options        an options object
 * @param    {String} options.header The header key to be used for
 *                                   the expiry time of each request.
 * @returns  {Function}
 */
function requestExpiry(options) {
    assert.object(options, 'options');
    assert.string(options.header, 'options.header');
    let headerKey = options.header;

    return function (req, res, next) {
        let expiry = req.headers[headerKey];

        if (expiry) {
            let expiryTime = Number(expiry);

            // The request has expired
            if (Date.now() > expiryTime) {
                return next(new GatewayTimeoutError('Request has expired'));
            }
        }

        // Happy case
        return next();
    };
}

module.exports = requestExpiry;
