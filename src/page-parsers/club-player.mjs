import fetch from 'node-fetch';
import cheerio from 'cheerio';

const IMAGE_SRC_MEANING_UNDEFINED = '/var/images/user.png';

const PLAYER_HREF_ID_REGEX = /player=([0-9]*)/g;
const PLAYER_QUERY = '.playerDe table[bgcolor="#CCCCCC"]';

function warnIfLengthNotEqual(...args) {
    const lengths = args.map(arg => arg.length);
    if (Math.min(...lengths) !== Math.max(...lengths)) {
        console.warn('Warning: The length of parsed data is not matching.');
    }
}

function getChineseUrl(playerId, clubId) {
    return `https://www.hkfa.com/ch/club/${clubId}/detail?player=${playerId}`;
}

function getEnglishUrl(playerId, clubId) {
    return `https://www.hkfa.com/en/club/${clubId}/detail?player=${playerId}`;
}

async function fetchText(url) {
    const res = await fetch(url);
    return await res.text();
}

async function fetchTextWithRetry(url) {
    let body;

    while (!body) {
        try {
            body = await fetchText(url);
        } catch (err) {
            console.error(err);
        }
    }
    
    return body;
}

function parseDate(str) {
    str = str.replace(/\//g, '-');
    return new Date(str);
}

function parsePosition(str) {
    str = str.trim();

    switch (str) {
        case 'Goalkeeper':
        case 'GoalKeeper':
        case 'GK':
            return 'GK';
        case 'Defender':
        case 'DF':
            return 'DF';
        case 'Midfielder':
        case 'MF':
            return 'MF';
        case 'FW':
            return 'FW';
        case '':
            return undefined;
        default:
            console.warn(`Unsupported position "${str}".`)
            return str;
    }
}

function parseRawData(rawData) {
    let ret = {};

    rawData.forEach((data, index) => {
        let key;

        switch (data.title) {
            case 'Player name':
                key = 'englishName';
                break;
            case '球員名稱':
                key = 'chineseName';
                break;
            case 'Date of Birth':
            case '出生日期':
                key = 'dateOfBirth';
                break;
            case 'Weight':
            case '體重':
                key = 'weight';
                break;
            case 'Height':
            case '身高':
                key = 'height';
                break;
            case 'Position':
            case '位置':
                key = 'position';
                break;
            case 'Age':
            case '年齡':
                key = 'age';
                break;
            default:
                console.warn(`Data "${data.title}" is not yet supported.`);
        }

        switch (key) {
            case 'age':
                // Skip
                break;
            // Don't parse date now
            // case 'dateOfBirth':
            //     ret[key] = parseDate(data.value);
            //     break;
            case 'height':
                ret[key] = parseFloat(data.value);
                if (ret[key] < 3) {
                    ret[key] = parseInt(ret[key] * 100);
                }
                break;
            case 'position':
                ret[key] = parsePosition(data.value);
                break;
            case 'weight':
                ret[key] = parseFloat(data.value);
                break;

            default:
                ret[key] = data.value;
        }
    });

    return ret;
}

function parsePlayers($) {
    const playerNodes = $(PLAYER_QUERY);

    const playerImageNodes = playerNodes.find('img[height="160"]');
    const playerImageSrc = playerImageNodes[0].attribs.src;

    const playerDataTableNodes = playerNodes.find('table[width="905"]');
    const playerDataTitleNodes = playerDataTableNodes.find('td[width="125"], td[width="91"], td[width="87"]');
    const playerDataValueNodes = playerDataTableNodes.find('td:not([rowspan]) b');

    let numSkippedTitles = 0;
    let rawData = [];

    for (let i = 0; i < playerDataTitleNodes.length; i++) {
        const titleNode = playerDataTitleNodes[i];
        const title = titleNode.children[0].data.replace(/:/g, '').trim();

        if (!title) {
            numSkippedTitles += 1;
            continue;
        }

        const valueNode = playerDataValueNodes[i - numSkippedTitles];
        const value = valueNode.children[0] && valueNode.children[0].data.trim();

        if (value !== undefined) {
            rawData.push({ title, value });
        }
    }

    return {
        imageSrc: playerImageSrc,
        ...parseRawData(rawData),
        rawData,
    };
}

async function parse(playerId, clubId = 4) {
    const bodies = await Promise.all([
        fetchTextWithRetry(getChineseUrl(playerId, clubId)),
        fetchTextWithRetry(getEnglishUrl(playerId, clubId)),
    ]);

    const c$ = cheerio.load(bodies[0]); // Chinese version
    const e$ = cheerio.load(bodies[1]); // English version

    const chineseResult = parsePlayers(c$);
    const englishResult = parsePlayers(e$);

    console.log(`${playerId} ${chineseResult.chineseName} ${englishResult.englishName}`);

    return {
        playerId,
        ...chineseResult,
        ...englishResult,
        rawData: [
            ...chineseResult.rawData,
            ...englishResult.rawData,
        ],
    };
}

export default parse;
