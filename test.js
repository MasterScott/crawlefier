import Crawlefier from './src/main';

const crawl = async urls => {
    const crawler = new Crawlefier({
        timeout: 15000, 
        threads: 15, 
        external: false, // don't follow third-party links
        headlessChrome: true, // sends requests via puppeteer
        depth: 2,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.181 Safari/537.36'
    });

    const result = await crawler.launch(urls,
    (response) => {
        // prints response url and body.
        console.log(response.url, response.content);
    },
    (error) => {
        // prints error url and message.
        console.log(error.url, error.message);
    });

    // prints array of links
    // max depth is 2. But returns found links (also contains links those was not crawled). Includes links for 3rd step depth.
    console.log(result);
}

crawl(['https://www.youtube.com/', 'https://github.com/']);