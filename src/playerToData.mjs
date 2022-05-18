import { exit } from 'process';
import main from './index.mjs';

(async function() {
    const queue = [];

    for (let i = 1; i < 20000; i++) {
        if (i >= 200 && i < 3700) {
            continue;
        }
        queue.push({
            page: 'club-player',
            args: [i],
        });
    }

    await main(queue);

    console.log('Done');
    exit(0);
})();
