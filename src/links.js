import BlackList from './blacklist';
import {uniq} from './misc';

export default class Links {
    constructor(allowExternal, links, blackList) {
        this.all = this.normalize(links);
        this.next = [];
        this.blackList = blackList ? new BlackList(blackList) : false;
        this.getLinksMethod = allowExternal ? this.getAllLinks : this.getInternalLinks;
    }

    filterNext(links) {
        return links.filter(link => {
            return this.all.indexOf(link) == -1;
        })
    }
  
    addForNext(links) {
        this.next = this.blackList ? this.blackList.filter(this.filterNext([...this.next, ...links])) : this.filterNext([...this.next, ...links]);
    }

    setAll() {
        this.all = uniq([...this.all, ...this.next]);
    }

    /**
     * Normalize urls without protocol.
     * @param {array} links 
     * @returns {array} urls with protocol.
     */
    normalize(links) {
        return links.map((link) => link.match(/http:\/\/|https:\/\//g) ? link : `http://${link}`);
    }

    /**
     * 
     * @param {string} url
     * @returns {array} url protocol, host, path
     * 
     * Exeption for broken links.
     * 
     */
    getUrlProps(url) {
        try {
            const match = url.match(/^(http|https)?(?:[\:\/]*)([a-z0-9\.-]*)(?:\:([0-9]+))?(\/[^?#]*)?(?:\?([^#]*))?(?:#(.*))?$/i);
    
            return {
                protocol: match[1],
                host: match[2],
                path: match[4]
            } 
        } catch (error) {
            return {
                protocol: null,
                host: null,
                path: null
            } 
        }
    }

    parse(content) {
        try {
            return content.match(new RegExp('<a(.*?)href=(((\'|").*?(\'|")))', 'gi')).join("\n").match(new RegExp('href=(((\'|").*?(\'|")))', 'gi')).map((item) => item.slice(6, -1));
        } catch (error) {
            return [];
        }
    }

    find(url, content) {
        this.addForNext(uniq(this.getLinksMethod(url, content)));
    }

    getAllLinks(url, content) {
        let urlProps = this.getUrlProps(url),
            extractLinks = this.parse(content);

        return extractLinks.map((link) => {
            if (link[0] == "/" && link[1] == "/") {
                return link.slice(2);
            } else {
                if (link[0] == "/") {
                    return urlProps.protocol + "://" + urlProps.host + link;
                }

                if (!this.getUrlProps(link).protocol) {
                    return urlProps.protocol + "://" + urlProps.host + "/" + link;
                }
            }

            return link;
        });
    }

    getInternalLinks(url, content) {
        let urlProps = this.getUrlProps(url),
            extractLinks = this.parse(content);

        let filtered = extractLinks.filter((link) => {
            if (link[0] == "/") {
                return link;
            }

            if (urlProps.host === this.getUrlProps(link).host) {
                return link;
            }
        });

        let next = filtered.map((link) => {
            if (link[0] == "/") {
                return urlProps.protocol + "://" + urlProps.host + link;
            }

            if (urlProps.host === this.getUrlProps(link).host) {
                if (link[0] == "/" && link[1] == "/") {
                    return link.slice(2);
                } else {
                    if (link[0] == "/") {
                        return urlProps.protocol + "://" + urlProps.host + link;
                    }

                    if (!this.getUrlProps(link).protocol) {
                        return urlProps.protocol + "://" + urlProps.host + "/" + link;
                    }
                }

                return link;
            }
        });

        return next;
    }
}