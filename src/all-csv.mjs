import fs from 'fs';
import csvStringify from 'csv-stringify';
import { exit } from 'process';
import { createClient } from 'redis';

const csvStringifyAsync = (data) => {
    return new Promise((resolve, reject) => {
        csvStringify(data, { header: true }, (err, output) => {
            if (err) {
                reject(err);
            }
        
            resolve(output);
        });
    });
};

(async function allCsv() {
    const redisClient = createClient();

    redisClient.on('error', (err) => console.log('Redis Client Error', err));
    await redisClient.connect();

    let players  = new Map();
    let rows = new Map();

    const keys = await redisClient.keys('hds-player-*');

    await Promise.all(keys.map(async (key) => {
        const playerJson = await redisClient.get(key);

        const player = JSON.parse(playerJson);
        const playerId = parseInt(player.playerId, 10);

        players.set(playerId, player);
        rows.set(playerId, {
            playerId,
            playerNumber: player.number,
            playerChineseName: player.chineseName,
            playerEnglishName: player.englishName,
            playerDateOfBirth: player.dateOfBirth,
            playerHeight: player.height,
            playerWeight: player.weight,
            playerPosition: player.position,
            imageSrc: player.imageSrc,
        });
    }));

    const result = [...rows.values()];
    result.sort((playerA, playerB) => {
        return playerA.playerId - playerB.playerId;
    });

    const csv = await csvStringifyAsync(result);
    fs.writeFileSync('./all.csv', csv);

    console.log('Done');
    exit(0);
})();
