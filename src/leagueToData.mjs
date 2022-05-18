import { exit } from 'process';
import main from './index.mjs';

(async function() {
    const leagueId = parseInt(process.argv[process.argv.length - 1]);

    await main([{
        page: 'league',
        args: [leagueId],
    }]);

    console.log('Done');
    exit(0);
})();
