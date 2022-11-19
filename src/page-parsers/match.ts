import { JSDOM } from 'jsdom';
import {
    HKFA_WEB_LANGUAGE_CODE,
    fetchTextWithRetry,
    mergeResult,
} from './util.ts';

type HkfaWebLanguageString = {
    [language in HKFA_WEB_LANGUAGE_CODE]?: string;
};

type HkfaWebMatchData = {
    competitionName: HkfaWebLanguageString;
    date: string;
    attendance?: number;
    homeClubId: number;
    awayClubId: number;
    homeClubName: HkfaWebLanguageString;
    awayClubName: HkfaWebLanguageString;
    homeEmblemImageSrc?: string;
    awayEmblemImageSrc?: string;
    homeScore?: number;
    awayScore?: number;
};

const getUrl = (
    matchId: number,
    language: HKFA_WEB_LANGUAGE_CODE = HKFA_WEB_LANGUAGE_CODE.Chinese
) => {
    // return `https://www.hkfa.com/${language}/match/detail/${matchId}`;
    return `https://www.hkfa.com/${language}/match/${matchId}`;
};

const undefinedIfNotFinite = (n: number): number | undefined => {
    return Number.isFinite(n) ? n : undefined;
}

const parseClubIdHref = (href: string): number | undefined => {
    const CLUB_HREF_ID_REGEX = /club\/([0-9]*)/g;
    const regexResult = CLUB_HREF_ID_REGEX.exec(href);

    return undefinedIfNotFinite(parseInt(regexResult?.[1] || ''));
};

const parseAttendanceTextContent = (textContent: string): number | undefined => {
    const ATTENDANCE_TEXT_REGEX = /(?:入場人數|Attendance) : ([0-9,\-]*)/g;
    const regexResult = ATTENDANCE_TEXT_REGEX.exec(textContent.trim());
    
    return undefinedIfNotFinite(parseInt(regexResult?.[1] || ''));
}
const parsePlayerIdHref = (href: string): number | undefined => {
    const PLAYER_HREF_ID_REGEX = /player=([0-9]*)/g;
    const regexResult = PLAYER_HREF_ID_REGEX.exec(href);
    
    return undefinedIfNotFinite(parseInt(regexResult?.[1] || ''));
};

const parseBodyDom = (dom: JSDOM, language: HKFA_WEB_LANGUAGE_CODE): HkfaWebMatchData => {
    console.log('parseBodyDom');
    const { document } = dom.window;
    const matchNode = document.querySelector('table[width="70%"]');

    const competitionName = matchNode.getElementsByTagName('h2')[0].textContent.trim();
    const [homeTeamInfoNode, awayTeamInfoNode] = matchNode.querySelectorAll('h2 a');
    const homeClubId = parseClubIdHref(homeTeamInfoNode.href);
    const awayClubId = parseClubIdHref(awayTeamInfoNode.href);
    const homeClubName = homeTeamInfoNode.textContent;
    const awayClubName = awayTeamInfoNode.textContent;

    if (!homeClubId || !awayClubId) {
        throw new Error('Cannot parse club ID');
    }

    const [homeScoreNode, awayScoreNode] = document.querySelectorAll('center p ~ h1');
    const getEmblemImageSrc = (scoreNode: any): string => {
        const imageEl = scoreNode.parentNode.parentNode.querySelector('img');
        return imageEl.src;
    };
    const homeEmblemImageSrc = getEmblemImageSrc(homeScoreNode);
    const awayEmblemImageSrc = getEmblemImageSrc(awayScoreNode);
    const homeScore = undefinedIfNotFinite(parseInt(homeScoreNode.textContent));
    const awayScore = undefinedIfNotFinite(parseInt(awayScoreNode.textContent));

    const date = matchNode.querySelector('table[width="100%"] td[align="right"] h3').textContent;

    const attendanceTextContent = matchNode.querySelector('td[height="20"]').textContent.trim();
    const attendance = parseAttendanceTextContent(attendanceTextContent);

    const [
        homeScoreEventsNode,
        awayScoreEventsNode,
        homePsoEventsNode,
        awayPsoEventsNode,
        homeLineupNode,
        awayLineupNode
    ] = matchNode.querySelectorAll('table[width="100%"] td[width="50%"]');

    const scoreEventNodes = homeScoreEventsNode.querySelectorAll('span');
    console.log([...scoreEventNodes].map((scoreEventNode) => {
        const anchorNode = scoreEventNode.getElementsByTagName('a')[0];
        return {
            playerId: parsePlayerIdHref(anchorNode.href),
        }
    }));
    
    return {
        competitionName: { [language]: competitionName },
        date,
        attendance,
        homeClubId,
        awayClubId,
        homeClubName: { [language]: homeClubName },
        awayClubName: { [language]: awayClubName },
        homeEmblemImageSrc,
        awayEmblemImageSrc,
        homeScore,
        awayScore,
    };
};

const parseSingleLangue = async (matchId: number, language: HKFA_WEB_LANGUAGE_CODE) => {
    console.log('parseSingleLanguage', {language});
    const body = await fetchTextWithRetry(getUrl(matchId, language));
    const dom = new JSDOM(body);
    return parseBodyDom(dom, language);
};

const parse = async (matchId: number) => {
    console.log('parse');
    const result = await Promise.all([
        parseSingleLangue(matchId, HKFA_WEB_LANGUAGE_CODE.Chinese),
        parseSingleLangue(matchId, HKFA_WEB_LANGUAGE_CODE.English),
    ]);
    return mergeResult(result[0], result[1]);
};

export default parse;
