import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';
import deepmerge from 'deepmerge';

import {
    CLUB_HREF_ID_REGEX,
    MATCH_HREF_ID_REGEX,
} from '../constants.mjs';

import { parseVenueIdFromAnchorNode } from '../util.mjs';

const combineMerge = (target, source, options) => {
    const destination = target.slice()
 
    source.forEach((item, index) => {
        if (typeof destination[index] === 'undefined') {
            destination[index] = options.cloneUnlessOtherwiseSpecified(item, options)
        } else if (options.isMergeableObject(item)) {
            destination[index] = deepmerge(target[index], item, options)
        } else if (target.indexOf(item) === -1) {
            destination.push(item)
        }
    })
    return destination;
};

function getUrl(params = {}, langCode) {
    const {
        leagueId,   // e.g. 1395
        year,       // e.g. "2021-2022"
        type,
        page,
        other,
        date,
        team,
        gpage,
    } = params;

    // return `https://www.hkfa.com/ch/leagueyear?leagueid=${leagueId || ''}&year=${year || ''}`;
    return `https://www.hkfa.com/${langCode}/leagueyear?leagueid=${leagueId || ''}&year=${year || ''}&type=${type || ''}&page=${page || ''}&other=${other || ''}&date=${date || ''}&team=${team || ''}&gpage=${gpage || ''}`;
}

function getChineseUrl(params = {}) {
    return getUrl(params, 'ch');
}

function getEnglishUrl(params = {}) {
    return getUrl(params, 'en');
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

function getTeamIdFromAnchorNode(anchorNode) {
    return parseInt(CLUB_HREF_ID_REGEX.exec(anchorNode.href)?.[1], 10);
}

function parseBodyDom(dom, langCode) {
    const { document } = dom.window;
    const fixtureTableNode = document.querySelector('.table_style');
    const matchRowNodes = Array.from(fixtureTableNode.querySelectorAll('.trs'));

    // Page information
    const pageInfo = Array.from(document.querySelector('#checkrecord center center').childNodes)
        .filter(node => node.nodeName === '#text')
        .map(node => node.textContent)
        .join('')
        .match(/([0-9]*)/gm)
        .filter(Boolean)
        .map(str => parseInt(str, 10))
        .sort((a, b) => a - b);

    const currentPage = pageInfo[0];
    const numPages = pageInfo[1];

    return {
        currentPage,
        numPages,
        schedules: matchRowNodes.map((rowNode) => {
            const cellNodes = Array.from(rowNode.getElementsByTagName('td'));

            // match ID
            const matchId = parseInt(MATCH_HREF_ID_REGEX.exec(cellNodes[1].querySelector('a').href)[1], 10);

            // date & time
            const date = cellNodes[0].textContent.trim();
            const time = cellNodes[6].textContent.trim();

            // club IDs and team names
            const clubIds = Array.from(cellNodes[3].querySelectorAll('a'))
                .map(getTeamIdFromAnchorNode)
                .filter(Boolean);
            const teamNames = Array.from(cellNodes[3].querySelectorAll('a'))
                .filter(getTeamIdFromAnchorNode)
                .map(anchorNode => ({
                    [langCode]: anchorNode.textContent.trim(),
                }));
                
            // venue
            const venueAnchorNode = cellNodes[5].querySelector('a');
            const venueId = parseVenueIdFromAnchorNode(venueAnchorNode);
            const venueName = { [langCode]: venueAnchorNode.textContent.trim() };

            // competition & round
            const competitionName = { [langCode]: cellNodes[4].textContent.trim() };
            const round = cellNodes[2].textContent.trim();

            const trimmedScoreContent = cellNodes[1].textContent.trim();
            const matchedScoreContent = /([0-9]*) ?: ?([0-9]*) ?(?:\((.*)\))?/.exec(trimmedScoreContent);
            let isLive = false,
                status,
                scores;

            if (matchedScoreContent) {
                switch (matchedScoreContent[3]) {
                    case '進行中':
                    case 'Live':
                        isLive = true;
                        break;
                    case undefined:
                        break;
                    default:
                        throw new Error('Unsupported score format');
                }
                
                if (matchedScoreContent[1].length && matchedScoreContent[2].length) {
                    scores = [matchedScoreContent[1], matchedScoreContent[2]]
                        .map(str => parseInt(str, 10));
                }
            } else {
                switch (trimmedScoreContent) {
                    case 'Abandon':
                    case '腰斬':
                        status = 'abandoned';
                        break;
                    case 'Cancel':
                    case '取消':
                        status = 'canceled';
                        break;
                    case 'Delay':
                    case 'Reschedule':
                    case '改期':
                    case '延期':
                        status = 'rescheduled';
                        break;
                    default:
                        throw new Error('Unsupported score format');
                }
            }

            // const cellContents = cellNodes.map((cellNode) => cellNode.textContent);

            const ret = {
                matchId,
                date,
                time,
                clubIds,
                teamNames,
                scores,
                competitionName,
                round,
                venueId,
                venueName,
                isLive,
                status,
            };

            return ret;
        }),
    };
}

async function parse(params) {
    const bodies = await Promise.all([
        fetchTextWithRetry(getChineseUrl(params)),
        fetchTextWithRetry(getEnglishUrl(params)),
    ]);

    const cDom = new JSDOM(bodies[0]);
    const eDom = new JSDOM(bodies[1]);

    const cResult = parseBodyDom(cDom, 'ch');
    const eResult = parseBodyDom(eDom, 'en');

    return deepmerge(cResult, eResult, { arrayMerge: combineMerge });
}

export default parse;
