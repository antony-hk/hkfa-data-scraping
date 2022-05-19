import pLimit from 'p-limit';
import { exit } from 'process';
import { createClient } from 'redis';

import parseClub from '../src/page-parsers/club.mjs';
import parseLeagueRank from '../src/page-parsers/leaguerank.mjs';
import parseLeagueYear from '../src/page-parsers/leagueyear.mjs';

const limit = pLimit(10);

function addAllClubIdsFromResult(set, result) {
    result.schedules.forEach((match) => {
        match.clubIds.forEach((clubId) => {
            set.add(clubId);
        });
    });
}

function addCompetitionNameFromResult(set, result) {
    result.schedules.forEach((match) => {
        if (match.competitionName.en) {
            set.add(match.competitionName.en);
        }
    });
}

(async function() {
    const redisClient = createClient();

    redisClient.on('error', (err) => console.log('Redis Client Error', err));
    await redisClient.connect();

    const promises = [];
    const clubIdSet = new Set();
    const competitionNameSet = new Set();

    const parseAndAnalyzeSingleLeagueYearPage = async (pageNumber) => {
        const result = await parseLeagueYear({
            page: pageNumber,
            other: 2,
            type: 4,
        });

        addAllClubIdsFromResult(clubIdSet, result);
        addCompetitionNameFromResult(competitionNameSet, result);

        return result;
    };

    const parseAndAnalyzeSingleLeagueRankPage = async (competitionId) => {
        const result  = await parseLeagueRank({
            leagueId: competitionId,
        });

        if (competitionId) {
            result.standings.forEach((standing) => {
                // TODO: Put the record in redis as a women record
            });
        }

        return result;
    };

    const { numPages } = await parseAndAnalyzeSingleLeagueYearPage(1);
    const { competitions } = await parseAndAnalyzeSingleLeagueRankPage();

    competitions.forEach((competition) => {
        if (competitionNameSet.has(competition.competitionName.en)) {
            promises.push(
                limit(async () => {
                    await parseAndAnalyzeSingleLeagueRankPage(competition.competitionId);
                })
            );
        }
    });
    
    for (let i = 2 ; i <= numPages; i++) {
        promises.push(
            limit(async () => {
                await parseAndAnalyzeSingleLeagueYearPage(i);
            })
        );
    }
    await Promise.all(promises);
    promises.splice(0, promises.length);    // Clear array

    // Parse club pages
    clubIdSet.forEach((clubId) => {
        promises.push(
            limit(async () => {
                const result = await parseClub([clubId]);
                await redisClient.set(`hds-club-${clubId}`, JSON.stringify(result));
            })
        )
    });
    await Promise.all(promises);

    console.log('Done');
    exit(0);
})();
