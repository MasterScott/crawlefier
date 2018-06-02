import DEFAULT_SETTINGS from './constants/settings';
import Links from './links';
import Pool from './pool';
import {wait} from './misc';
import axios from "axios";
import {launch} from "puppeteer";

class Crawlefier {
    constructor(settings = DEFAULT_SETTINGS, blackList = false) {
        this.settings = {
            timeout: settings.timeout,
            external: settings.external,
            blackList: blackList,
            userAgent: settings.userAgent,
            headlessChrome: settings.headlessChrome,
            depth: {
                current: 0,
                max: settings.depth
            }
        }

        this.counter = {
            all: 0,
            done: 0
        }

        this.pool = new Pool(settings.threads);
        this.getRequestMethod = settings.headlessChrome ? this.puppeteerRequest : this.axiosRequest;
    }
    
    setCallbacks(onSuccess, onError) {
        if (onSuccess) this.onSuccessCallback = onSuccess;
        if (onError) this.onErrorCallback = onError;
    }
    
    async launch(links, onSuccess, onError) {
        // if links is not set or provides empty array
        if (!links || !links.length) {
            throw new Error('No links!');
        }
        
        this.links = new Links(this.settings.external, links, this.settings.blackList);
        this.setCallbacks(onSuccess, onError);

        if(this.settings.headlessChrome) {
            this.headlessChrome = await launch();
        }

        return new Promise((resolve, reject) => {
            this.reject = reject;
            this.resolve = resolve;
            this.crawl(this.links.all);
        });
    }

    crawl(links) {
        if (links.length > 0) {
            this.settings.depth.current++;
            this.links.next = [];
            this.counter.done = 0;
            this.counter.all = links.length;

            links.forEach(link => 
                this.pool.addTask(this.getRequestMethod.bind(this, link))
            );

            this.pool.run();
        } else {
            this.resolve(this.links.all);
        }
    }

    isDone() {
        return this.counter.done == this.counter.all;
    }

    isCloudflare(content) {
        if (content.match(new RegExp('cloudflare', 'gi'))) {
            return true;
        }
    }

    onSuccess(url, content) {
        this.links.find(url, content);
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

    /**
     *@param {string} url crawl url
     *@param {function} next sets next callback in pool queue
     */
    async puppeteerRequest(url, next) {
        try {
            const page = await this.headlessChrome.newPage();
            await page.setUserAgent(this.settings.userAgent);
            await page.goto(url, {timeout: this.settings.timeout});
            let content = await page.content();
    
            if(this.isCloudflare(content)) {
                await wait(7500);
                content = await page.content();
            }
            
            this.onSuccess(url, content);
            await page.close();
            next();
        } catch (error) {
            this.onError(url, error);
            next();
        }
    }
    
    /**
     *@param {string} url crawl url
     *@param {function} next sets next callback in pool queue
     */
    async axiosRequest(url, next) {
        try {
            const req = await axios.get(url, {timeout: this.settings.timeout, responseType: 'text', userAgent: this.settings.userAgent});
            this.onSuccess(url, req.data);
            next();
        } catch (error) {
            this.onError(url, error);
            next();
        }
    }

    update() {
        this.counter.done++;
        
        if (this.isDone()) {
            if (this.settings.depth.current < this.settings.depth.max) {
                this.links.setAll();
                this.crawl(this.links.next);
            } else {
                if (this.settings.headlessChrome) {
                    this.headlessChrome.close();
                }

                this.resolve(this.links.all);
            }
        }
    }
}

export default Crawlefier;