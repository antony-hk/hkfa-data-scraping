import deepmerge from 'npm:deepmerge';
// import fetch from 'npm:node-fetch';

export enum HKFA_WEB_LANGUAGE_CODE {
    Chinese = 'ch',
    English = 'en',
};

export const mergeResult = (resultA, resultB) => {
    const combineMerge = (target, source, options) => {
        const destination = target.slice();
     
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

    return deepmerge(resultA, resultB, { araryMerge: combineMerge });
};

const fetchText = async (url: string): Promise<string> => {
    const res = await fetch(url);
    return await res.text();
};

export const fetchTextWithRetry = async (url: string): Promise<string> => {
    let body;
    while (!body) {
        try {
            body = await fetchText(url);
        } catch (err) {
            console.error(err);
        }
    }
    return body;
};
