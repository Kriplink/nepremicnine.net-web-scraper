# nepremicnine.net web scraper
This is a web scraper for nepremicnine.net, that was created for personal use on a school project. It currently only supports the apartments that are for sale and are being rented. Support for houses, vacation homes, and other types of real-estate, may be added in the future.

NOTE: *By default, this only returns apartments that have coordinates, which also gives an address via the GeoCode API. If you want ALL of the apartments, simply comment out line 100 in nepremicnine-web-scraper.js*

## How to use:

1. Require this in your application.
```javascript
const nepremicnineWebScraper = require('nepremicnine-web-scraper')
```

2. Initialize an instance of WebScraper, that takes a Google GeoCode API key as a constructor argument. 
```javascript
let webScraper = new nepremicnineWebScraper.WebScraper("YOUR API KEY")
```
You can get your API key [HERE](https://developers.google.com/maps/documentation/geocoding/get-api-key).

3. Run the scrape function, that takes query parameters as an argument. They need to be a string of this structure: "argument1/argument2/".
```javascript
webScraper.scrape("juzna-primorska/stanovanje/velikost-od-50-do-100-m2/")
```
The arguments can be found in the URL on [nepremicnine.net](https://www.nepremicnine.net/), when you search for specific apartments with conditions.
![Arguments](https://user-images.githubusercontent.com/48378286/168442605-16cec95e-d890-496f-a854-977f579d533e.png)

4. That's it. After the function finishes, which might take a few minutes, an array filled with Apartment objects is returned. 
