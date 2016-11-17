#!/usr/bin/env node
"use strict";
var fs = require('fs');
var path = require('path');
var glob = require('glob');
var moment = require('moment');
var rxjs_1 = require('@reactivex/rxjs');
var excelbuilder = require('msexcel-builder');
var getDuration = require('get-video-duration');
var dir = process.argv[2];
if (!dir) {
    console.log('É necessário informar um diretório na forma (c:/dir/**/*.*)!');
    process.exit(1);
}
var output = process.argv[3];
if (!output) {
    output = './results.xlsx';
}
function formatBytes(bytes, decimals) {
    if (bytes == 0)
        return '0 Byte';
    var k = 1000; // or 1024 for binary
    var dm = decimals + 1 || 3;
    var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    var i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
function ProcessaArquivo(file) {
    console.log("Processando " + file);
    return new Promise(function (resolve, reject) {
        var fd;
        var parsed = path.parse(file);
        fd = {
            name: parsed.name,
            base: parsed.base,
            ext: parsed.ext,
            dir: parsed.dir
        };
        fs.stat(file, function (err, stats) {
            if (err) {
                reject(err);
            }
            else {
                fd.date = stats.birthtime;
                fd.size = stats.size;
                if (parsed.ext === '.mp4') {
                    resolve(getDuration(file).then(function (duration) {
                        fd.duration = duration;
                        return fd;
                    }));
                }
                else {
                    resolve(fd);
                }
            }
        });
    });
}
function ProcessaPastas(dir) {
    var results = [];
    return new Promise(function (resolve, reject) {
        glob(dir, function (err, matches) {
            if (err) {
                reject(err);
            }
            else {
                rxjs_1.Observable.from(matches).bufferCount(4)
                    .concatMap(function (matches) {
                    return Promise.all(matches.map(function (match) {
                        return ProcessaArquivo(match);
                    }));
                }).subscribe(function (next) {
                    results = results.concat(next);
                }, function (err) {
                    reject(err);
                }, function () {
                    resolve(results);
                });
            }
        });
    });
}
ProcessaPastas(dir)
    .then(function (files) {
    if (output.indexOf('.xlsx') < 0) {
        output = output + ".xlsx";
    }
    var outputParsed = path.parse(output);
    // Create a new workbook file in current working-path
    var workbook = excelbuilder.createWorkbook(outputParsed.dir, outputParsed.base);
    // Create a new worksheet with 10 columns and 12 rows
    var sheet1 = workbook.createSheet('dados', 6, files.length + 1);
    // Fill some data
    sheet1.set(1, 1, 'Nome');
    sheet1.set(2, 1, 'Data');
    sheet1.set(3, 1, 'Tipo');
    sheet1.set(4, 1, 'Tamanho');
    sheet1.set(5, 1, 'Comprimento');
    sheet1.set(6, 1, 'Local');
    files.forEach(function (file, index) {
        var col = index + 2;
        sheet1.set(1, col, file.name);
        sheet1.set(2, col, moment(file.date).format('DD/MM/YYYY'));
        sheet1.set(3, col, file.ext);
        sheet1.set(4, col, formatBytes(file.size, 2));
        if (file.duration) {
            sheet1.set(5, col, moment.utc(file.duration * 1000).format("HH:mm:ss"));
        }
        sheet1.set(6, col, file.dir);
    });
    // Save it
    workbook.save(function (err) {
        if (err)
            throw err;
    });
})
    .catch(function (err) {
    console.error(err);
});
