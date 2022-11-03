import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';
import deepmerge from 'deepmerge';

import { CLUB_HREF_ID_REGEX } from '../constants.mjs';

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

function getChineseUrl(params = {}) {
    const {
        leagueId,   // e.g. 1395
        year,       // e.g. "2021-2022"
    } = params;

    return `https://www.hkfa.com/ch/leaguerank?leagueid=${leagueId || ''}&year=${year || ''}`;
}

function getEnglishUrl(params = {}) {
    const {
        leagueId,
        year,
    } = params;

    return `https://www.hkfa.com/en/leaguerank?leagueid=${leagueId || ''}&year=${year || ''}`;
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

function parseBodyDom(dom, langCode) {
    const competitionMap = new Map();
    const competitionOrderMap = new Map();

    const competitionNodes = Array.from(dom.window.document.getElementById('leagueyear_id').childNodes);

    competitionNodes.filter(node => node.tagName === 'OPTION')
        .forEach((node, index) => {
            const competitionId = parseInt(node.value);

            competitionOrderMap.set(competitionId, index);
            competitionMap.set(competitionId, {
                ...competitionMap.get(competitionId),
                competitionName: {
                    [langCode]: node.textContent,
                },
            });
        });

    const competitions = Array.from(competitionMap)
        .map(([key, data]) => {
            return {
                competitionId: key,
                ...data,
            };
        })
        .sort((a, b) => (competitionOrderMap.get(a.competitionId) - competitionOrderMap.get(b.competitionId)));

    const standingsTitleNodes = Array.from(dom.window.document.querySelectorAll('.tabContent h1'));
    const standingsTitles = standingsTitleNodes.map(node => node.textContent.trim());
    const standingsTableNodes = standingsTitleNodes.map(node => node.parentNode.nextElementSibling);
    const standings = standingsTableNodes.map((tableNode, index) => {
        const rankRowNodes = Array.from(tableNode.querySelectorAll('#trs'));

        return {
            title: {
                [langCode]: standingsTitles[index],
            },
            table: rankRowNodes.map((rowNode) => {
                const cellNodes = Array.from(rowNode.getElementsByTagName('td'));
                const clubId = parseInt(CLUB_HREF_ID_REGEX.exec(cellNodes[1].querySelector('a').href)[1], 10);
                const cellContents = cellNodes.map((cellNode) => cellNode.textContent);

                return {
                    rank: parseInt(cellContents[0], 10),
                    clubId: clubId,
                    teamName: {
                        [langCode]: cellContents[1],
                    },
                    played: parseInt(cellContents[2], 10),
                    won: parseInt(cellContents[3], 10),
                    drawn: parseInt(cellContents[4], 10),
                    lost: parseInt(cellContents[5], 10),
                    goalsFor: parseInt(cellContents[6], 10),
                    goalsAgainst: parseInt(cellContents[7], 10),
                    goalsDifference: parseInt(cellContents[8], 10),
                    points: parseInt(cellContents[9], 10),
                };
            }),
        };
    });

    return {
        competitions,
        standings,
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
