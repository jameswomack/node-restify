// Copyright 2012 Mark Cavage, Inc.  All rights reserved.

'use strict';

const errors = require('restify-errors');

const bodyReaderPlugin = require('./body_reader');


///--- API

/**
 * parses json body from the request.
 * @public
 * @function jsonBodyParser
 * @param    {Object}               options an options object
 * @throws   {InvalidContentError}          on bad input
 * @returns  {Function}
 */
function jsonBodyParser({
  overrideParams,
  reviver,
  mapParams,
  bodyReader
} = { }) {
    const override = overrideParams;

    function parseJson(req, res, next) {
        if (req.getContentType() !== 'application/json' || !req.body) {
            next();
            return;
        }

        let params;

        try {
            params = JSON.parse(req.body, reviver);
        } catch (e) {
            next(new errors.InvalidContentError('Invalid JSON: ' +
                e.message));
            return;
        }

        if (mapParams !== false) {
            if (Array.isArray(params)) {
                req.params = params;
            } else if (typeof (params) === 'object' && params !== null) {
                Object.keys(params).forEach((k) => {
                    const p = req.params[k];

                    if (p && !override) {
                        return (false);
                    }
                    req.params[k] = params[k];
                    return (true);
                });
            } else {
                req.params = params || req.params;
            }
        } else {
            req._body = req.body;
        }

        req.body = params;

        next();
    }

    const chain = [];

    if (!bodyReader) {
        chain.push(bodyReaderPlugin({
            overrideParams,
            reviver,
            mapParams,
            bodyReader
        }));
    }
    chain.push(parseJson);
    return (chain);
}

module.exports = jsonBodyParser;
