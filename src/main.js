import DEFAULT_SETTINGS from './constants/settings';
import BlackList from './blacklist';
import LinksList from './links';
import Pool from './pool';
import { uniq } from './misc/uniq';
import axios from "axios";
import { launch } from "puppeteer";

class Crawlefier {
    constructor(settings = DEFAULT_SETTINGS, blackList = []) {
        this.settings = {
            timeout: settings.timeout,
            userAgent: settings.userAgent,
            headlessChrome: settings.headlessChrome,
            depth: {
                current: 0,
                max: settings.depth
            }
        }

        this.counter = {
            links: {
                all: 0,
                done: 0
            }
        }

        this.blackList = new BlackList(blackList);
        this.linksList = new LinksList();
        this.pool = new Pool(settings.threads);
        this.getLinksMethod = settings.external ? this.allLinks : this.internalLinks;
        this.getRequestMethod = settings.headlessChrome ? this.puppeteerRequest : this.axiosRequest;
    }

    setCallbacks(onSuccess, onError) {
        if (onSuccess) this.onSuccessCallback = onSuccess;
        if (onError) this.onErrorCallback = onError;
    }

    async launch(links, onSuccess, onError) {
        let urls = this.normalizeLinks(links);
        if (urls == null) {
            throw new Error('No links!');
        }

        this.setCallbacks(onSuccess, onError);

        if(this.settings.headlessChrome) {
            this.headlessChrome = await launch();
        }

        return new Promise((resolve, reject) => {
            this.reject = reject;
            this.resolve = resolve;
            
            this.linksList.set(urls);
            this.crawl(urls);
        });
    }

    /**
     * Normalize urls without protocol.
     * @param {array} links 
     * @returns {array} urls with protocol.
     */
    normalizeLinks(links) {
        return links.map((link) => link.match(/http:\/\/|https:\/\//g) ? link : `http://${link}`);
    }

    crawl(links) {
        if (links.length > 0) {
            this.settings.depth.current++;
            this.parsedLinks = [];
            this.counter.links.done = 0;
            this.counter.links.all = links.length;

            links.forEach(link => 
                this.pool.addTask(this.getRequestMethod.bind(this, link))
            );

            this.pool.run();
        } else {
            this.resolve(this.linksList.get());
        }
    }

    isDone() {
        return this.counter.links.done == this.counter.links.all;
    }

    wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    isCloudflare(content) {
        if (content.match(new RegExp('cloudflare', 'gi'))) {
            return true;
        }
    }

    onSuccess(url, content) {
        this.parsedLinks = this.parsedLinks.concat(this.getLinksMethod(url, content));
        this.update();

        if (this.onSuccessCallback) {
            this.onSuccessCallback({url: url, content: content});
        }
    }

    onError(url, error) {
        this.update();

        if (this.onErrorCallback) {
            this.onErrorCallback({url: url, message: error});
        }
    }

    async puppeteerRequest(url) {
        try {
            const page = await this.headlessChrome.newPage();
            await page.setUserAgent(this.settings.userAgent);
            await page.goto(url, {timeout: this.settings.timeout});
            let content = await page.content();
    
            if(this.isCloudflare(content)) {
                await this.wait(7500);
                content = await page.content();
            }
            
            this.onSuccess(url, content);
            await page.close();
        } catch (error) {
            this.onError(url, error);
        }
    }

    async axiosRequest(url) {
        try {
            const req = await axios.get(url, {timeout: this.settings.timeout, responseType: 'text', userAgent: this.settings.userAgent});
            this.onSuccess(url, req.data);
        } catch (error) {
            this.onError(url, error);
        }
    }

    update() {
        this.counter.links.done++;
        this.parsedLinks = uniq(this.blackList.filter(this.linksList.filterNextLinks(this.parsedLinks)));
        this.linksList.set(this.parsedLinks);

        if (this.isDone()) {
            if (this.settings.depth.current < this.settings.depth.max) {
                this.crawl(this.parsedLinks);
            } else {
                if (this.settings.headlessChrome) {
                    this.headlessChrome.close();
                }

                this.resolve(this.linksList.get());
            }
        } else {
            this.pool.nextTask();
        }
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

    parseLinks(content) {
        try {
            return content.match(new RegExp('<a(.*?)href=(((\'|").*?(\'|")))', 'gi')).join("\n").match(new RegExp('href=(((\'|").*?(\'|")))', 'gi')).map((item) => item.slice(6, -1));
        } catch (error) {
            return [];
        }
    }

    allLinks(url, content) {
        let urlProps = this.getUrlProps(url),
            extractLinks = this.parseLinks(content);

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

    internalLinks(url, content) {
        let urlProps = this.getUrlProps(url),
            extractLinks = this.parseLinks(content);

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

export default Crawlefier;