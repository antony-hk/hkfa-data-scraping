import { createClient } from 'redis';

import parseClub from './page-parsers/club.mjs';
import parseClubPlayer from './page-parsers/club-player.mjs';
import parseLeague from './page-parsers/league.mjs';

export default async function main(defaultParsingQueue = []) {
    const redisClient = createClient();

    redisClient.on('error', (err) => console.log('Redis Client Error', err));
    await redisClient.connect();

    let parsingQueue = defaultParsingQueue.slice();

    let maxNumWorkers = 100;
    let numWorking = 0;

    async function next() {
        numWorking++;

        const job = parsingQueue.shift();

        if (!job) {
            return;
        }

        const {
            page,
            args,
        } = job;

        console.log(`Job: ${page} - ${args[0]}, remaining ${parsingQueue.length} jobs`);

        switch (page) {
            case 'league': {
                const league = await parseLeague(...args);
                await redisClient.set(`hds-league-${args[0]}`, JSON.stringify(league));

                const { clubs } = league;
                clubs.forEach((club) => {
                    parsingQueue.push({ page: 'club', args: [club.clubId] });
                });

                break;
            }

            case 'club': {
                const club = await parseClub(...args);
                await redisClient.set(`hds-club-${args[0]}`, JSON.stringify(club));

                const { clubId, players, reservePlayers } = club;
                if (players) {
                    players.forEach((player) => {
                        parsingQueue.push({ page: 'club-player', args: [player.playerId, clubId] });
                    })
                }
                if (reservePlayers) {
                    reservePlayers.forEach((player) => {
                        parsingQueue.push({ page: 'club-player', args: [player.playerId, clubId] });
                    })
                }
                break;
            }

            case 'club-player': {
                const player = await parseClubPlayer(...args);
                const { playerId } = player;
                await redisClient.set(`hds-player-${playerId}`, JSON.stringify(player));

                break;
            }
        }

        numWorking--;

        const nextJobs = [];

        for (let i = 0; i < (maxNumWorkers - numWorking); i++) {
            nextJobs.push(next());
        }

        await Promise.all(nextJobs);
    }

    await next();
}
