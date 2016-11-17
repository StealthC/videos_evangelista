"use strict";
var fs = require('fs');
var path = require('path');
var getDuration = require('get-video-duration');
var dir = process.argv[2];
if (!dir) {
    throw new Error('É necessário informar um diretório!');
}
function ListaDir(dir) {
    return new Promise(function (resolve, reject) {
        fs.readdir(dir, function (err, files) {
            if (err) {
                reject(err);
            }
            else {
                resolve(files);
            }
        });
    });
}
function ProcessaArquivo(dir_base, dir, file) {
    var filepath = path.join(dir_base, dir, file);
    var parsed = path.parse(filepath);
    if (parsed.ext === '.mp4' || parsed.ext === '.avi' || parsed.ext === '.mkv') {
        return getDuration(filepath).then(function (duration) {
            console.log(filepath + " - " + duration);
            return duration;
        });
    }
}
function ProcessaPastas(dir) {
    return ListaDir(dir)
        .then(function (subdirs) {
        return Promise.all(subdirs.map(function (subdir) {
            return ListaDir(path.join(dir, subdir))
                .then(function (files) {
                return Promise.all(files.map(function (file) {
                    return ProcessaArquivo(dir, subdir, file);
                }));
            }).catch(function (err) {
                if (err.code === 'ENOTDIR') {
                    return;
                }
                else {
                    throw err;
                }
            });
        }));
    });
}
ProcessaPastas(dir).catch(function (err) {
    console.error(err);
});
