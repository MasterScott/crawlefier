# Crawlefier
Multilinks web crawler for Node with Headless Chrome and blacklist. Based on Async/Await.

## Features

- Simple CloudFlare bypass (only with Headless Chrome).
- Filter links through blacklist.
- Follow to third-party domains.
- Limit to max active requests.

# Install
```
npm install crawlefier
```

# Example
## Default crawl
### Launch method returns array of links which was found. 

```js
import Crawlefier from 'crawlefier';

const crawl = async urls => {
    const crawler = new Crawlefier();
    const result = await crawler.launch(urls);

    // prints array of links
    console.log(result);
}

crawl(['https://www.youtube.com/', 'https://github.com/']);
```

## Crawl with handlers

```js
import Crawlefier from 'crawlefier';

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
```

## Set blacklist

```js
const crawler = new Crawlefier({}, ['watch_videos']);
```

### Link https://www.youtube.com/watch_videos?video_ids=texttexttext will be ignored.

# Default settings

```js
{
    // request timeout
    timeout: 5000, 

    // max running requests. Is not real threads.
    threads: 50, 

    // follow to third-party urls
    // {true} - all links will be allowed.
    external: false,
    
    // initialize headless chrome
    // {false} - requests sends via axios by default
    headlessChrome: false,

    // max follow depth
    depth: 1,

    // set user-agent
    userAgent: 'CRAWLEFIER'
}
```