// Copyright 2012 Mark Cavage, Inc.  All rights reserved.

'use strict';

let crypto = require('crypto');
let zlib = require('zlib');

let assert = require('assert-plus');
let errors = require('restify-errors');


///--- Globals

let BadDigestError = errors.BadDigestError;
let RequestEntityTooLargeError = errors.RequestEntityTooLargeError;
let PayloadTooLargeError = errors.PayloadTooLargeError;

let MD5_MSG = 'Content-MD5 \'%s\' didn\'t match \'%s\'';


///--- Helpers

function createBodyWriter(req) {
    let buffers = [];

    let contentType = req.contentType();
    let isText = false;

    if (!contentType ||
        contentType === 'application/json' ||
        contentType === 'application/x-www-form-urlencoded' ||
        contentType === 'multipart/form-data' ||
        contentType.substr(0, 5) === 'text/') {
        isText = true;
    }

    req.body = new Buffer(0);
    return {
        write: function (chunk) {
            buffers.push(chunk);
        },
        end: function () {
            req.body = Buffer.concat(buffers);

            if (isText) {
                req.body = req.body.toString('utf8');
            }
        }
    };
}


///--- API

/**
 * reads the body of the request.
 * @public
 * @function bodyReader
 * @throws   {BadDigestError | PayloadTooLargeError}
 * @param    {Object} options an options object
 * @returns  {Function}
 */
function bodyReader(options) {
    options = options || {};
    assert.object(options, 'options');

    let maxBodySize = options.maxBodySize || 0;

    function readBody(req, res, next) {
        if ((req.getContentLength() === 0 && !req.isChunked()) ||
            req.contentType() === 'multipart/form-data' ||
            req.contentType() === 'application/octet-stream') {
            next();
            return;
        }
        let bodyWriter = createBodyWriter(req);

        let bytesReceived = 0;
        let digest;
        let gz;
        let hash;
        let md5;

        if ((md5 = req.headers['content-md5'])) {
            hash = crypto.createHash('md5');
        }

        function done() {
            let errorMessage;
            bodyWriter.end();

            if (maxBodySize && bytesReceived > maxBodySize) {
                let msg = 'Request body size exceeds ' +
                    maxBodySize;

                // Between Node 0.12 and 4 http status code messages changed
                // RequestEntityTooLarge was changed to PayloadTooLarge
                // this check is to maintain backwards compatibility
                if (PayloadTooLargeError !== undefined) {
                    errorMessage = new PayloadTooLargeError(msg);
                } else {
                    errorMessage = new RequestEntityTooLargeError(msg);
                }

                next(errorMessage);
                return;
            }

            if (!req.body.length) {
                next();
                return;
            }

            if (hash && md5 !== (digest = hash.digest('base64'))) {
                errorMessage = new BadDigestError(MD5_MSG, md5, digest);
                next(errorMessage);
                return;
            }

            next();
        }

        if (req.headers['content-encoding'] === 'gzip') {
            gz = zlib.createGunzip();
            gz.on('data', bodyWriter.write);
            gz.once('end', done);
            req.once('end', gz.end.bind(gz));
        } else {
            req.once('end', done);
        }

        req.on('data', function onRequestData(chunk) {
            if (maxBodySize) {
                bytesReceived += chunk.length;

                if (bytesReceived > maxBodySize) {
                    return;
                }
            }

            if (hash) {
                hash.update(chunk, 'binary');
            }

            if (gz) {
                gz.write(chunk);
            } else {
                bodyWriter.write(chunk);
            }
        });

        req.once('error', next);
        req.resume();
    }

    return (readBody);
}

module.exports = bodyReader;
