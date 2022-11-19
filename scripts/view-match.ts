// import fs from 'fs';
// import parseLeagueYear from '../src/page-parsers/leagueyear.mjs';
import parseMatch from '../src/page-parsers/match.ts';

const HKFA_WEBSITE_TIMEZONE = '+08:00';

export default async function view(matchId) {
    console.log({ matchId });
    const match = await parseMatch(matchId);
    console.log(match);

    // let allSchedules = [];

    // // Get the data of page 1 first, so that we know the total number of pages
    // const { numPages, schedules } = await parseLeagueYear({ type: 10, other: 2, page: 1 });
    // allSchedules.push(schedules);
    
    // // NOTE: Since there are no any pagination tokens or similar things,
    // // we cannot guarantee that the website is not updated during fethcing the data.
    // for (let i = 2; i <= numPages; i++) {
    //     const { schedules } = await parseLeagueYear({ type: 10, other: 2, page: i });
    //     allSchedules.push(schedules);
    // }

    // // console.log(
    // const json = JSON.stringify(
    //     allSchedules
    //         .flat()
    //         .filter(match => match.competitionName.ch === '中銀人壽香港超級聯賽')
    //         // .map(match => convertHkfaResponeToSchema(match))
    // );

    // fs.writeFileSync('./league-matches.json', json);
}

await view(Deno.args[0]);
Deno.exit();
