import {
    VENUE_HREF_ID_REGEX,
} from './constants.mjs';

// This function assumes the first capturing group in the regular expression is the ID
function parseIdWithRegexFromAnchorNode(anchorNode, regex) {
    return parseInt(regex.exec(anchorNode.href)?.[1], 10);
}

export function parseVenueIdFromAnchorNode(anchorNode) {
    return parseIdWithRegexFromAnchorNode(anchorNode, VENUE_HREF_ID_REGEX);
}
