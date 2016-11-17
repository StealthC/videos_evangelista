import * as fs from 'fs';
import * as path from 'path';
import * as glob from 'glob';

let getDuration = require('get-video-duration');

let dir = process.argv[2];
if (!dir) {
    throw new Error('É necessário informar um diretório!');
}

function ListaDir(dir): Promise<string[]> {
    return new Promise((resolve, reject) => {
        fs.readdir(dir, (err, files) => {
            if (err) {
                reject(err);
            } else {
                resolve(files);
            }
        });
    });
}

function ProcessaArquivo(dir_base, dir, file): Promise<any> {
    let filepath = path.join(dir_base, dir, file);
    let parsed = path.parse(filepath);
    if (parsed.ext === '.mp4' || parsed.ext === '.avi' || parsed.ext === '.mkv') {
        return getDuration(filepath).then(duration => {
            console.log(`${filepath} - ${duration}`);
            return duration;
        })
    }
}

function ProcessaPastas(dir): Promise<any> {
    return ListaDir(dir)
    .then(subdirs => {
        return Promise.all(subdirs.map(subdir => {
            return ListaDir(path.join(dir, subdir))
            .then(files => {
                return Promise.all(files.map(file => {
                    return ProcessaArquivo(dir, subdir, file);
                }));
            }).catch(err => {
                if (err.code === 'ENOTDIR') {
                    return;
                } else {
                    throw err;
                }
            });
        }))
    });
}



ProcessaPastas(dir).catch(err => {
    console.error(err);
});
