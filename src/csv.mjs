import fs from 'fs';
import writeCsv from 'write-csv';

const leagueFiles = fs.readdirSync('data/league');

leagueFiles.forEach((filename) => {
    let clubOrder = [];
    let playerOrder = [];

    let clubs = {};
    let players = {};
    let rows = {};

    const league = JSON.parse(fs.readFileSync(`data/league/${filename}`));
    const { leagueId } = league;

    const { clubs: leagueClubs } = league;
    leagueClubs.forEach((club, index) => {
        const { clubId } = club;
        clubOrder.push(clubId);

        club = {
            ...club,
            ...JSON.parse(fs.readFileSync(`data/club/${clubId}.json`)),
        };

        clubs[clubId] = club;

        const { players: clubPlayers, reservePlayers } = club;
        const forEachPlayer = (player, index) => {
            const { playerId } = player;
            playerOrder.push(playerId);

            player = {
                ...player,
                ...JSON.parse(fs.readFileSync(`data/player/${playerId}.json`)),
            };

            players[playerId] = player;

            rows[playerId] = {
                clubId,
                clubChineseName: club.chineseName,
                clubEnglishName: club.englishName,
                playerId: player.playerId,
                playerNumber: player.number,
                playerChineseName: player.chineseName,
                playerEnglishName: player.englishName,
                playerDateOfBirth: player.dateOfBirth,
                playerHeight: player.height,
                playerWeight: player.weight,
                playerPosition: player.position,
            };
        };

        clubPlayers.forEach(forEachPlayer);
        reservePlayers.forEach(forEachPlayer);
    });

    writeCsv(`data/${leagueId}.csv`, playerOrder.map(playerId => rows[playerId]));
});
