#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import * as glob from 'glob';
import * as moment from 'moment';
import {Observable} from '@reactivex/rxjs';

let excelbuilder = require('msexcel-builder');

let getDuration = require('get-video-duration');

let dir = process.argv[2];
if (!dir) {
    console.log('É necessário informar um diretório na forma (c:/dir/**/*.*)!');
    process.exit(1);
}
let output = process.argv[3];
if (!output) {
    output = './results.xlsx';
}


function formatBytes(bytes,decimals) {
   if(bytes == 0) return '0 Byte';
   let k = 1000; // or 1024 for binary
   let dm = decimals + 1 || 3;
   let sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
   let i = Math.floor(Math.log(bytes) / Math.log(k));
   return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

interface FileDetails {
    name: string;
    base: string;
    ext: string;
    dir: string;
    size?: number;
    duration?: number;
    date?: Date;
}

function ProcessaArquivo(file): Promise<FileDetails> {
    console.log(`Processando ${file}`);
    return new Promise((resolve, reject) => {
        let fd: FileDetails;
        let parsed = path.parse(file);
        fd = {
            name: parsed.name,
            base: parsed.base,
            ext: parsed.ext,
            dir: parsed.dir
        }
        fs.stat(file, (err, stats) => {
            if (err) {
                reject(err);
            } else {
                fd.date = stats.birthtime;
                fd.size = stats.size;
                if (parsed.ext === '.mp4') {
                    resolve(getDuration(file).then(duration => {
                        fd.duration = duration;
                        return fd;
                    }));
                } else {
                    resolve(fd);
                }
            }
        }); 
    });
}

function ProcessaPastas(dir): Promise<FileDetails[]> {
    let results: FileDetails[] = [];
    return new Promise((resolve, reject) => {
        glob(dir, (err, matches) => {
            if (err) {
                reject(err);
            } else {
                Observable.from(matches).bufferCount(4)
                .concatMap(matches => {
                    return Promise.all(matches.map(match => {
                        return ProcessaArquivo(match);
                    }));
                }).subscribe(next => {
                    results = results.concat(next);
                }, err => {
                    reject(err);
                }, () => {
                    resolve(results);
                });
            }
        });
    });
}



ProcessaPastas(dir)
.then(files => {
    if (output.indexOf('.xlsx') < 0) {
        output = `${output}.xlsx`;
    }
    let outputParsed = path.parse(output);
    
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
    files.forEach((file, index) => {
        let col = index + 2;
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
    workbook.save(function(err){
        if (err) throw err;
    });
})
.catch(err => {
    console.error(err);
});
