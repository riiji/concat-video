import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import * as AWS from 'aws-sdk';
import * as fs from 'fs';
import { Download } from './download';
import { URL } from 'url';
import path from 'path';
import { customAlphabet } from 'nanoid';
import * as mime from 'mime';
import { Ffmpeg } from './ffmpeg';

const downloader = new Download();
const s3 = new AWS.S3();
const nanoid = customAlphabet('1234567890abcdefghijklmnopqrstuvwxyz', 20);
const ffmpeg = new Ffmpeg();

/**
 *
 * Event doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format
 * @param {Object} event - API Gateway Lambda Proxy Input Format
 *
 * Return doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
 * @returns {Object} object - API Gateway Lambda Proxy Output Format
 *
 */

export const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    let response: APIGatewayProxyResult;
    try {
        console.log(JSON.stringify(event.body))

        const body = JSON.parse(event.body as string);

        const urls = body.urls.map((url: string) => new URL(url));
        await Promise.all(urls.map((url: globalThis.URL) => downloader.fromUrl(url)));

        const resultVideoDist = `${nanoid()}.${body.outputExtension}`;
        const args = `-y ${urls
            .map((url: { pathname: string }) => `-i /tmp/${path.basename(url.pathname)}`)
            .join(' ')} -filter_complex ${urls
            .map((url: globalThis.URL, index: number) => `[${index}:v][${index}:a]`)
            .join('')}concat=n=${urls.length}:v=1:a=1[out] -map [out] /tmp/${resultVideoDist}`.split(' ');

        console.log(JSON.stringify({ message: 'before ffmpeg call' }));

        await ffmpeg.call(args);
        urls.forEach((url: { pathname: string }) => fs.unlink('/tmp/' + path.basename(url.pathname), () => {}));

        const rs = fs.createReadStream('/tmp/' + resultVideoDist);

        const uploadResult = await s3
            .upload({
                Bucket: process.env.AWS_S3_BUCKET as string,
                ACL: 'public-read',
                ContentType: mime.getType('/tmp/' + resultVideoDist) as string,
                Key: resultVideoDist,
                Body: rs,
            })
            .promise();

        fs.unlink('/tmp/' + resultVideoDist, () => {});

        response = {
            statusCode: 200,
            body: JSON.stringify({
                url: uploadResult.Location,
            }),
        };
    } catch (err) {
        console.log(err);
        response = {
            statusCode: 500,
            body: JSON.stringify({
                message: 'some error happened',
            }),
        };
    }

    return response;
};
