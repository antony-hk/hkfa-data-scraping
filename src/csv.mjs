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

(async function writeCsv() {
    const redisClient = createClient();

    redisClient.on('error', (err) => console.log('Redis Client Error', err));
    await redisClient.connect();

    const leagueKeys = await redisClient.keys('hds-league-*');

    for (let i = 0 ; i < leagueKeys.length; i++) {
        const leagueKey = leagueKeys[i];

        let clubOrder = [];
        let playerOrder = [];
        
        let clubs = {};
        let players  = new Map();
        let rows = new Map();

        const leagueJson = await redisClient.get(leagueKey);
        const league = JSON.parse(leagueJson);
        const {
            clubs: leagueClubs,
            leagueId,
        } = league;

        await Promise.all(leagueClubs.map((async (club) => {
            const { clubId } = club;
            const clubJson = await redisClient.get(`hds-club-${clubId}`);
            const retClub = {
                ...club,
                ...JSON.parse(clubJson),
            };

            clubs[clubId] = retClub;

            const {
                players: clubPlayers,
                reservePlayers,
            } = retClub;

            const forEachPlayer = async (player, index) => {
                const playerId = parseInt(player.playerId, 10);

                const playerJson = await redisClient.get(`hds-player-${player.playerId}`);
                playerOrder.push(playerId);

                player = {
                    ...player,
                    ...JSON.parse(playerJson),
                };

                players.set(playerId, player);
                rows.set(playerId, {
                    clubId,
                    playerId,
                    clubChineseName: club.chineseName,
                    clubEnglishName: club.englishName,
                    playerNumber: player.number,
                    playerChineseName: player.chineseName,
                    playerEnglishName: player.englishName,
                    playerDateOfBirth: player.dateOfBirth,
                    playerHeight: player.height,
                    playerWeight: player.weight,
                    playerPosition: player.position,
                });
            };

            await Promise.all([
                ...clubPlayers.map(forEachPlayer),
                ...reservePlayers.map(forEachPlayer),
            ]);
        })));

        const csv = await csvStringifyAsync(playerOrder.map(playerId => rows.get(playerId)));
        fs.writeFileSync(`${leagueId}.csv`, csv);
    }

    console.log('Done');
    exit(0);
})();
