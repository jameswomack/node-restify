// Copyright 2012 Mark Cavage, Inc.  All rights reserved.

'use strict';

let assert = require('assert-plus');
let errors = require('restify-errors');

let bodyReader = require('./body_reader');
let jsonParser = require('./json_body_parser');
let formParser = require('./form_body_parser');
let multipartParser = require('./multipart_body_parser');
let fieldedTextParser = require('./fielded_text_body_parser.js');


///--- Globals

let UnsupportedMediaTypeError = errors.UnsupportedMediaTypeError;


///--- API

/**
 * parse the body of an incoming request.
 * @public
 * @function bodyParser
 * @throws   {UnsupportedMediaTypeError}
 * @param    {Object} options an option object
 * @returns  {Array}
 */
function bodyParser(options) {
    assert.optionalObject(options, 'options');
    options = options || {};
    options.bodyReader = true;

    let read = bodyReader(options);
    let parseForm = formParser(options);
    let parseJson = jsonParser(options);
    let parseMultipart = multipartParser(options);
    let parseFieldedText = fieldedTextParser(options);

    function parseBody(req, res, next) {
        // Allow use of 'requestBodyOnGet' flag to allow for merging of
        // the request body of a GET request into req.params
        if (req.method === 'HEAD') {
            next();
            return;
        }

        if (req.method === 'GET') {
            if (!options.requestBodyOnGet) {
                next();
                return;
            }
        }

        if (req.contentLength() === 0 && !req.isChunked()) {
            next();
            return;
        }

        let parser;
        let type = req.contentType().toLowerCase();

        switch (type) {
            case 'application/json':
                parser = parseJson[0];
                break;
            case 'application/x-www-form-urlencoded':
                parser = parseForm[0];
                break;
            case 'multipart/form-data':
                parser = parseMultipart;
                break;
            case 'text/tsv':
                parser = parseFieldedText;
                break;
            case 'text/tab-separated-values':
                parser = parseFieldedText;
                break;
            case 'text/csv':
                parser = parseFieldedText;
                break;

            default:
                break;
        }

        if (parser) {
            parser(req, res, next);
        } else if (options && options.rejectUnknown) {
            next(new UnsupportedMediaTypeError(type));
        } else {
            next();
        }
    }

    return ([read, parseBody]);
}

module.exports = bodyParser;
