// Copyright 2012 Mark Cavage, Inc.  All rights reserved.

'use strict';

let assert = require('assert-plus');
let mime = require('mime');

let NotAcceptableError = require('restify-errors').NotAcceptableError;


/**
 * Returns a plugin that will check the client's Accept header can be handled
 * by this server.
 *
 * Note you can get the set of types allowed from a restify server by doing
 * `server.acceptable`.
 *
 * @public
 * @function acceptParser
 * @throws   {NotAcceptableError}
 * @param    {String}    acceptable array of accept types.
 * @returns  {Function}             restify handler.
 */
function acceptParser(acceptable) {
    if (!Array.isArray(acceptable)) {
        acceptable = [acceptable];
    }
    assert.arrayOfString(acceptable, 'acceptable');

    acceptable = acceptable.filter(function (a) {
        return (a);
    }).map(function (a) {
            return ((a.indexOf('/') === -1) ? mime.lookup(a) : a);
        }).filter(function (a) {
            return (a);
        });

    let e = new NotAcceptableError('Server accepts: ' + acceptable.join());

    function parseAccept(req, res, next) {
        if (req.accepts(acceptable)) {
            next();
            return;
        }

        res.json(e);
        next(false);
    }

    return (parseAccept);
}

module.exports = acceptParser;
