import fs from 'fs';

import parseClub from './src/page-parsers/club.mjs';
import parseClubPlayer from './src/page-parsers/club-player.mjs';
import parseLeague from './src/page-parsers/league.mjs';

// TODO: Fix the certificate problem properly
process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0;

async function main(propertyType, propertyId) {
    let ret;

    switch (propertyType) {
        case 'league': {
            ret = await parseLeague([propertyId]);
            break;
        }

        case 'club': {
            ret = await parseClub([propertyId]);
            break;
        }

        case 'club-player': {
            ret = await parseClubPlayer([propertyId]);
            break;
        }
    }

    return ret;
}

(async function() {
    const propertyType = process.argv[2];
    const propertyId = process.argv[3];

    const ret = await main(propertyType, propertyId);
    console.log(JSON.stringify(ret, null, '\t'));
})();
