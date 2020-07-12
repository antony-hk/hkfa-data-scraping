import fs from 'fs';
import writeCsv from 'write-csv';

const playerFiles = fs.readdirSync('data/player');

let clubOrder = [];
let playerOrder = [];

let clubs = {};
let players = {};
let rows = {};

playerFiles.forEach((filename) => {

    const player = JSON.parse(fs.readFileSync(`data/player/${filename}`));
    const { playerId } = player;
    playerOrder.push(playerId);
    players[playerId] = player;

    rows[playerId] = {
        playerId: player.playerId,
        playerNumber: player.number,
        playerChineseName: player.chineseName,
        playerEnglishName: player.englishName,
        playerDateOfBirth: player.dateOfBirth,
        playerHeight: player.height,
        playerWeight: player.weight,
        playerPosition: player.position,
    };
});

writeCsv(`data/all.csv`, playerOrder.map(playerId => rows[playerId]));
