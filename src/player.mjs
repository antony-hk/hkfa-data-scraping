import fs from 'fs';

import parseClub from './page-parsers/club.mjs';
import parseClubPlayer from './page-parsers/club-player.mjs';
import parseLeague from './page-parsers/league.mjs';

// process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0;

async function main() {
    let parsingQueue = [];

    let maxNumWorkers = 10;
    let numWorking = 0;

    function queue(page, args) {
        parsingQueue.push({
            page,
            args,
        });
    }

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
                fs.writeFileSync(`data/league/${args[0]}.json`, JSON.stringify(league));

                const { clubs } = league;
                clubs.forEach((club) => {
                    queue('club', [club.clubId]);
                });

                break;
            }

            case 'club': {
                const club = await parseClub(...args);
                fs.writeFileSync(`data/club/${args[0]}.json`, JSON.stringify(club));

                const { clubId, players, reservePlayers } = club;
                if (players) {
                    players.forEach((player) => {
                        queue('club-player', [player.playerId, clubId]);
                    })
                }
                if (reservePlayers) {
                    reservePlayers.forEach((player) => {
                        queue('club-player', [player.playerId, clubId]);
                    })
                }
                break;
            }

            case 'club-player': {
                const player = await parseClubPlayer(...args);
                const { playerId } = player;
                fs.writeFileSync(`data/player/${playerId}.json`, JSON.stringify(player));

                break;
            }
        }

        numWorking--;

        for (let i = 0; i < (maxNumWorkers - numWorking); i++) {
            next();
        }
    }
// 18250, 19500
    for (let i = 1; i < 18250; i++) {
        if (i >=200 && i < 3700) {
            continue;
        }
        queue('club-player', [i]);
    }
    next();
}

(async function() {
    await main();
})();