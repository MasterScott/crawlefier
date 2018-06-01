/**
 * Filter for all links.
 */
export default class BlackList {
    constructor(links) {
        this.blackList = links;
    }

    filter(links) {
        const find = value => {
            return this.blackList.some((element, index) => {
                if(value.indexOf(element) != -1){
                    return true;
                }
            })
        }
    
        return links.filter(link => {
            return !find(link);
        })
    }
}