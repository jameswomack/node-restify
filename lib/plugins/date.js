// Copyright 2012 Mark Cavage, Inc.  All rights reserved.

'use strict';

let assert = require('assert-plus');
let errors = require('restify-errors');


///--- Globals

let InvalidHeaderError = errors.InvalidHeaderError;
let RequestExpiredError = errors.RequestExpiredError;

let BAD_MSG = 'Date header is invalid';
let OLD_MSG = 'Date header %s is too old';


///--- API

/**
 * Returns a plugin that will parse the Date header (if present) and check for
 * an "expired" request, where expired means the request originated at a time
 * before ($now - $clockSkew). The default clockSkew allowance is 5m (thanks
 * Kerberos!)
 * @public
 * @function dateParser
 * @throws   {RequestExpiredError | InvalidHeaderError}
 * @param    {Number}    clockSkew optional age of time (in seconds).
 * @returns  {Function}            restify handler.
 */
function dateParser(clockSkew) {
    if (!clockSkew) {
        clockSkew = 300;
    }
    assert.number(clockSkew, 'clockSkew');

    clockSkew = clockSkew * 1000;

    function parseDate(req, res, next) {
        if (!req.headers.date) {
            return (next());
        }

        let e;
        let date = req.headers.date;
        let log = req.log;

        try {
            let now = Date.now();
            let sent = new Date(date).getTime();

            if (log.trace()) {
                log.trace({
                    allowedSkew: clockSkew,
                    now: now,
                    sent: sent
                }, 'Checking clock skew');
            }

            if ((now - sent) > clockSkew) {
                e = new RequestExpiredError(OLD_MSG, date);
                return (next(e));
            }


        } catch (err) {
            log.trace({
                err: err
            }, 'Bad Date header: %s', date);

            e = new InvalidHeaderError(BAD_MSG, date);
            return (next(e));
        }

        return (next());
    }

    return (parseDate);
}

module.exports = dateParser;
