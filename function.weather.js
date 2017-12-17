/**
 * Created by dhkim2 on 2017-12-05.
 */

'use strict';

const async = require('async');
const request = require('request');

const GeoCode = require('./function.geocode');
const config = require('./config');

class Weather {
    constructor() {
        this.geoCode = new GeoCode();
        this.lang = 'en';
        this.url = config.serviceServer.url;
        this.version = config.serviceServer.version;
    }

    _request(url, callback) {
        console.info({_request:{url:url}});
        let options = {json: true, timeout: 3000, headers: {'Accept-Language' : this.lang}};
        request(url, options, (err, response, body) => {
            if (err) {
                return callback(err);
            }
            if (response.statusCode >= 400) {
                err = new Error("url=" + url + " statusCode=" + response.statusCode);
                return callback(err);
            }
            callback(err, body);
        });
    };

    _geoinfo2url(geoInfo) {
        console.info({geoInfo: geoInfo});
        let url = this.url + '/' + this.version;
        if (geoInfo.country === 'KR') {
            url += '/kma/addr';
            if (geoInfo.kmaAddress.name1 && geoInfo.kmaAddress.name1.length > 0)  {
                url += '/'+ encodeURIComponent(geoInfo.kmaAddress.name1);
            }
            if (geoInfo.kmaAddress.name2 && geoInfo.kmaAddress.name1.length > 0)  {
                url += '/'+ encodeURIComponent(geoInfo.kmaAddress.name2);
            }
            if (geoInfo.kmaAddress.name3 && geoInfo.kmaAddress.name1.length > 0)  {
                url += '/'+ encodeURIComponent(geoInfo.kmaAddress.name3);
            }
            return url;
        }
        else {
            url += '/dsf/coord';
            url += '/' + geoInfo.loc[0] + ','+geoInfo.loc[1];
            return url;
        }
    }

    _appendQueryParameters(event, url) {
        let querys;
        let count = 0;
        if (!event.hasOwnProperty('queryStringParameters')) {
            return url;
        }
        querys = event.queryStringParameters;
        for (let key in querys) {
            url += count === 0? '?':'&';
            url += key+'='+querys[key];
            count ++;
        }
        return url;
    }

    _importGeoInfo(dest, source) {
        ['label', 'country', 'address', 'loc'].forEach(function (propertyName) {
            if (source.hasOwnProperty(propertyName)) {
                if (propertyName === 'label') {
                    dest.name = source.label;
                }
                else if (propertyName === 'loc') {
                    dest.location = {lat: source.loc[0], long:source.loc[1]};
                }
                else {
                    dest[propertyName] = source[propertyName];
                }
            }
        });
    }

    byCoord(event, callback) {
        try{
            this.lang = event.headers['Accept-Language'];
        }
        catch (err) {
            console.error(err);
        }

        async.waterfall([
            (callback) => {
                this.geoCode.coord2geoInfo(event, (err, result) => {
                    callback(err, result);
                });
            },
            (geoInfo, callback) => {
                let url;
                try {
                    url = this._geoinfo2url(geoInfo);
                    url = this._appendQueryParameters(event, url);
                }
                catch (err) {
                    return callback(err);
                }
                this._request(url, (err, result)=> {
                    if (err) {
                        return callback(err);
                    }
                    try {
                        this._importGeoInfo(result, geoInfo);
                    }
                    catch (err) {
                        return callback(err);
                    }
                    callback(null, result);
                });
            }
        ], (err, result) => {
            if (err) {
                return callback(err);
            }
            callback(null, result);
        });
    }

    byAddress(event, callback) {
        console.error(event);
        return callback(new Error("This event is not supported yet!"));
    }
}

module.exports = Weather;
