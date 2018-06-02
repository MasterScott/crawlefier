/**
 Returns empty promise. For a waiting effect.
 * @param {number} ms
 */
export const wait = ms => {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export const uniq = array => {
    return [...new Set([...array])];
}