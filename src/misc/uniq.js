export const uniq = (a) => {
    let prims = {
            "boolean": {},
            "number": {},
            "string": {}
        },
        objs = [];

    return a.filter((item) => {
        let type = typeof item;
        if (type in prims)
            return prims[type].hasOwnProperty(item) ? false : (prims[type][item] = true);
        else
            return objs.indexOf(item) >= 0 ? false : objs.push(item);
    });
}