import { uniq } from './misc/uniq';
/**
 * Store for all links.
 */
export default class LinksList {
    constructor() {
        this.links = [];
    }

    filterNextLinks(links) {
        return links.filter(link => {
            return !this.links.includes(link);
        })
    }

    get() {
        return this.links;
    }
  
    set(links) {
        this.links = uniq(this.links.concat(links));
    }
}