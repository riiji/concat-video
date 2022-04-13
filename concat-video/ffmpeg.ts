import * as fs from 'fs';
import { spawn } from 'child_process';

export class Ffmpeg {
    call(args: string[]): Promise<void> {
        return new Promise((resolve, reject) => {
            const ffmpeg = spawn('/opt/ffmpeglib/ffmpeg', args);

            ffmpeg.stdout.on('data', (data) => {
                console.log(JSON.stringify(data.toString()));
            });

            ffmpeg.stderr.on('data', (data) => {
                console.error(JSON.stringify(data.toString()));
            });

            ffmpeg.on('data', (data) => {
                console.log(JSON.stringify(data.toString()));
            });

            ffmpeg.on('close', () => {
                ffmpeg.kill();
                resolve();
            });

            ffmpeg.on('finish', () => {
                ffmpeg.kill();
                resolve();
            });

            ffmpeg.on('error', (message) => {
                console.log(JSON.stringify(message));
                ffmpeg.kill();
                fs.unlink(args[args.length - 1], () => {});
                reject();
            });
        });
    }
}
