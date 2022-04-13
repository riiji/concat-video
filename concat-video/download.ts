import * as http from 'https';
import * as fs from 'fs';
import * as path from 'path';

export class Download {
    fromUrl(url: URL, dist: string = path.basename(url.pathname)): Promise<void> {
        return new Promise((resolve, reject) => {
            const file = fs.createWriteStream('/tmp/' + dist);
            http.get(url, (response) => {
                response.pipe(file);

                file.on('finish', () => {
                    file.close();
                    resolve();
                });

                file.on('error', () => {
                    file.close();
                    fs.unlink('/tmp/' + dist, () => {});
                    reject();
                });
            });
        });
    }
}
