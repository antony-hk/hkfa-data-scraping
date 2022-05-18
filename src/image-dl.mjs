import fs from 'fs';
import { exit } from 'process';
import { createClient } from 'redis';
import sanitizeFilename from 'sanitize-filename';
import fetch from 'node-fetch';
import mkdirp from 'mkdirp';

const MAX_NUM_WORKERS = 50;

const PLACEHOLDER_SRC_URLS = new Set([
    '/var/images/',
    '/var/images/user.png',
]);

async function downloadImageFile(url, targetFilePath) {
    const res = await fetch(url);
    const headers = await res.headers;
    const contentType = headers.get('content-type');

    if (contentType.startsWith('text')) {
        return false;
    }

    const fileStream = fs.createWriteStream(targetFilePath);
    await new Promise((resolve, reject) => {
        res.body.pipe(fileStream);
        res.body.on('error', reject);
        fileStream.on('finish', resolve);
    });

    return true;
}

async function downloadImageFileWithRetry(url, targetFilePath, numAttempts) {
    try {
        return await downloadImageFile(url, targetFilePath);
    } catch (err) {
        console.error(err);
        
        if (numAttempts === 0) {
            throw err;
        }

        console.log(`Retry downloading ${url}, remaining attempts: ${numAttempts}`);
        return downloadImageFileWithRetry(url, targetFilePath, numAttempts - 1);
    }
}

(async function allCsv() {
    let numWorking = 0;
    const downloadQueue = [];
    const suceededTasks = [];

    mkdirp.sync('output/images');

    async function next() {
        numWorking++;

        const job = downloadQueue.shift();

        if (!job) {
            return
        };

        console.log(`Job: ${job.playerId} ${job.imageSrc} --> ${job.targetFileName}`);

        try {
            const isImage = await downloadImageFileWithRetry(
                `https://www.hkfa.com${job.imageSrc}`,
                `output/images/${job.targetFileName}`,
                3
            );
            if (isImage) {
                suceededTasks.push(job);
            }
        } catch (err) {
            console.error(err);
        }

        numWorking--;

        const nextJobs = [];
        for (let i = 0; i < MAX_NUM_WORKERS - numWorking; i++) {
            nextJobs.push(next());
        }
        await Promise.all(nextJobs);
    }

    // Create the queue
    const redisClient = createClient();

    redisClient.on('error', (err) => console.log('Redis Client Error', err));
    await redisClient.connect();

    const keys = await redisClient.keys('hds-player-*');

    await Promise.all(keys.map(async (key) => {
        const playerJson = await redisClient.get(key);
        const player = JSON.parse(playerJson);
        const imageSrc = player.imageSrc;
        const playerId = parseInt(player.playerId, 10);

        if (imageSrc && !PLACEHOLDER_SRC_URLS.has(imageSrc)) {
            const fileExtension = imageSrc.match(/.[A-Za-z0-9]*$/)[0];
            downloadQueue.push({
                playerId,
                imageSrc,
                targetFileName:
                    sanitizeFilename(
                        `${playerId}_${player.englishName || player.chineseName || ''}${fileExtension}`
                    ),
            });
        }
    }));

    const nextJobs = [];
    for (let i = 0; i < MAX_NUM_WORKERS - numWorking; i++) {
        nextJobs.push(next());
    }
    await Promise.all(nextJobs);

    const logJson = JSON.stringify(suceededTasks);
    fs.writeFileSync('output/images/log.json', logJson);

    console.log('Done');
    exit(0);
})();
