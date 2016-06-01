/**
 * Dependencies
 */

'use strict';

let csv = require('csv');
let assert = require('assert-plus');

///--- API

/**
 * Returns a plugin that will parse the HTTP request body if the
 * contentType is `text/csv` or `text/tsv`
 * @public
 * @function fieldedTextParser
 * @param    {Object}    options an options object
 * @returns  {Function}
 */
function fieldedTextParser(options) {

    assert.optionalObject(options, 'options');
    options = options || {};

    function parseFieldedText(req, res, next) {

        let contentType = req.getContentType();

        if (contentType !== 'text/csv' &&
            contentType !== 'text/tsv' &&
            contentType !== 'text/tab-separated-values' || !req.body) {
            next();
            return;
        }


        let hDelimiter = req.headers['x-content-delimiter'];
        let hEscape = req.headers['x-content-escape'];
        let hQuote = req.headers['x-content-quote'];
        let hColumns = req.headers['x-content-columns'];


        let delimiter = (contentType === 'text/tsv') ? '\t' : ',';
        delimiter = (hDelimiter) ? hDelimiter : delimiter;
        let escape = (hEscape) ? hEscape : '\\';
        let quote = (hQuote) ? hQuote : '"';
        let columns = (hColumns) ? hColumns : true;

        let parserOptions = {
            delimiter: delimiter,
            quote: quote,
            escape: escape,
            columns: columns
        };

        csv.parse(req.body, parserOptions, function (err, parsedBody) {
            if (err) {
                return (next(err));
            }

            // Add an "index" property to every row
            parsedBody.forEach(function (row, index) {
                row.index = index;
            });
            req.body = parsedBody;
            return (next());
        });

    }

    return (parseFieldedText);

}

module.exports = fieldedTextParser;
