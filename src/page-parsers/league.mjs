import fetch from 'node-fetch';
import cheerio from 'cheerio';
import deepmerge from 'deepmerge';

const CLUB_HREF_ID_REGEX = /club\/([0-9]*)/g;

async function fetchText(url) {
    const res = await fetch(url);
    return await res.text();
}

function getChineseUrl(leagueId) {
    return `https://www.hkfa.com/ch/league/${leagueId}/`;
}

function getEnglishUrl(leagueId) {
    return `https://www.hkfa.com/en/league/${leagueId}/`;
}

function parseLeague($, isEnglish = false) {
    let clubOrder = [],
        clubData = {};

    const clubNodes = $('.club');
    const clubAnchorNodes = clubNodes.find('a');
    const clubImageNodes = clubNodes.find('img');
    const clubNameNodes = clubNodes.find('p:last-child');

    for (let i = 0; i < clubNodes.length; i++) {
        const clubAnchorNode = clubAnchorNodes[i];
        const clubImageNode = clubImageNodes[i];
        const clubNameNode = clubNameNodes[i];

        const clubHref = clubAnchorNode.attribs.href;

        CLUB_HREF_ID_REGEX.lastIndex = 0;
        const regexResult = CLUB_HREF_ID_REGEX.exec(clubHref);
        const clubId = regexResult && regexResult[1] && parseInt(regexResult[1]);

        clubOrder.push(clubId);

        clubData[clubId] = {
            clubId,
            [isEnglish ? 'englishHref' : 'chineseHref']: clubHref,
            imageSrc: clubImageNode.attribs.src,
            [isEnglish ? 'englishName' : 'chineseName']: clubNameNode.children[0].data.trim(),
        };
    }

    return {
        clubOrder,
        clubData,
    };
}

async function parse(leagueId) {
    const bodies = await Promise.all([
        fetchText(getChineseUrl(leagueId)),
        fetchText(getEnglishUrl(leagueId)),
    ]);

    const c$ = cheerio.load(bodies[0]); // Chinese version
    const e$ = cheerio.load(bodies[1]); // English version

    const chineseResult = parseLeague(c$, false);
    const englishResult = parseLeague(e$, true);

    const mergedClubData = deepmerge.all([
        chineseResult.clubData,
        englishResult.clubData,
    ]);

    const { clubOrder } = chineseResult;
    const clubs = clubOrder.map((value) => {
        return mergedClubData[value];
    });

    return { leagueId, clubs };
}

export default parse;

// Script for manual testing
// (async function () {
//     console.log(await parse(10));
// })();
