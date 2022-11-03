import { exit } from 'process';
import main from './index.mjs';

(async function() {
    const queue = [];

    for (let i = 1; i < 21000; i++) {
        queue.push({
            page: 'club-player',
            args: [i],
        });
    }

    await main(queue);

    console.log('Done');
    exit(0);
})();
