import fetch from 'node-fetch';
import cheerio from 'cheerio';

const IMAGE_SRC_MEANING_UNDEFINED = '/var/images/user.png';

const PLAYER_HREF_ID_REGEX = /player=([0-9]*)/g;
const PLAYER_QUERY = '#player table[style="width:100%;"] table[border="1"]';
const RESERVE_PLAYER_QUERY = '#player2 table[style="width:100%;"] table[border="1"]';

function warnIfLengthNotEqual(...args) {
    const lengths = args.map(arg => arg.length);
    if (Math.min(...lengths) !== Math.max(...lengths)) {
        console.warn('Warning: The length of parsed data is not matching.');
    }
}

function getChineseUrl(clubId) {
    return `https://www.hkfa.com/ch/club/${clubId}/detail`;
}

function getEnglishUrl(clubId) {
    return `https://www.hkfa.com/en/club/${clubId}/detail`;
}

async function fetchText(url) {
    const res = await fetch(url);
    return await res.text();
}

function parsePlayers(c$, e$, query) {
    let players = [];

    const chinesePlayerNodes = c$(query);
    const englishPlayerNodes = e$(query);

    // Common nodes in both languages
    const playerImageNodes = chinesePlayerNodes.find('a img');
    const playerNumberNodes = chinesePlayerNodes.find('font');

    // Nodes only in Chinese language
    const chinesePlayerNameNodes = chinesePlayerNodes.find('a p[style]');

    // Nodes only in English languages
    const englishPlayerNameNodes = englishPlayerNodes.find('a p[style]');

    warnIfLengthNotEqual(chinesePlayerNodes, englishPlayerNodes, chinesePlayerNameNodes, englishPlayerNameNodes);

    for (let i = 0; i < chinesePlayerNodes.length; i++) {
        const chinesePlayerNameNode = chinesePlayerNameNodes[i];
        const englishPlayerNameNode = englishPlayerNameNodes[i];
        const playerNumberNode = playerNumberNodes[i];

        // Chinese-only data
        const playerChineseName = chinesePlayerNameNodes[i].children[0].data.trim();
        const chinesePlayerAnchorNode = chinesePlayerNameNodes[i].parent;
        const playerChineseHref = chinesePlayerAnchorNode.attribs.href;

        // English-only data
        const playerEnglishName = englishPlayerNameNode.children[0].data.trim();
        const englishPlayerAnchorNode = englishPlayerNameNode.parent;
        const playerEnglishHref = englishPlayerAnchorNode.attribs.href;

        // Common data
        const playerImageSrc = playerImageNodes[i].attribs.src;
        const playerNumber = playerNumberNode && parseInt(playerNumberNode.children[0].data.trim());

        // Reset the lastIndex of the regular expression is necessary
        PLAYER_HREF_ID_REGEX.lastIndex = 0;
        const regexResult = PLAYER_HREF_ID_REGEX.exec(playerChineseHref);
        const playerId = regexResult && regexResult[1] && parseInt(regexResult[1]);

        let player = {
            playerId: playerId,
            chineseName: playerChineseName,
            englishName: playerEnglishName,
            chineseHref: playerChineseHref,
            englishHref: playerEnglishHref,
        };

        if (typeof playerNumber === 'number') {
            player.number = playerNumber;
        }

        if (playerImageSrc !== IMAGE_SRC_MEANING_UNDEFINED) {
            player.imageSrc = playerImageSrc;
        }

        players.push(player);
    }

    return players;
}

async function parse(clubId) {
    const bodies = await Promise.all([fetchText(getChineseUrl(clubId)), fetchText(getEnglishUrl(clubId))]);

    const c$ = cheerio.load(bodies[0]);   // Chinese version
    const e$ = cheerio.load(bodies[1]);

    const players = parsePlayers(c$, e$, PLAYER_QUERY);
    const reservePlayers = parsePlayers(c$, e$, RESERVE_PLAYER_QUERY);

    return {
        clubId,
        players,
        reservePlayers,
    };
}

export default parse;
