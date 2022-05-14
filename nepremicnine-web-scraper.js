const axios = require('axios')
const cheerio = require('cheerio')
const NodeGeocoder = require('node-geocoder')

async function getApartments(urlArguments) {
    // This will scrape every apartment that is for SALE and is being RENTED.
    let mainSoldUrl =   `https://www.nepremicnine.net/oglasi-prodaja/${urlArguments}`                      
    let mainRentUrl =   `https://www.nepremicnine.net/oglasi-oddaja/${urlArguments}`

    let response = await axios(mainSoldUrl)
    let html = response.data
    let $ = cheerio.load(html) 

    let apartments = []

    // Gets the amount of pages avaliable
    try {
        let argumentCounter = $('.paging_last').find('a').attr('href').split('/').length
        amountOfPages = $('.paging_last').find('a').attr('href').split('/')[argumentCounter - 2]
    } catch(error) {
        amountOfPages = 1
    }

    // Grabs every URL of an apartment
    $("*[itemprop = 'name']").each(function(){
        let apartment = $(this)
        let apartmentUrl = apartment.find('a').first().attr('href')
        if (apartmentUrl != undefined) apartments.push("https://www.nepremicnine.net" + apartmentUrl)
    })

    // Goes through every page, and scraps for URLs of individual apartments
    for (let i = 2; i <= amountOfPages; i++) {
        response = await axios(`${mainSoldUrl}${i}/`)
        html = response.data
        $ = cheerio.load(html) 

        $("*[itemprop = 'name']").each(function(){
            let apartment = $(this)
            let apartmentUrl = apartment.find('a').first().attr('href')
            if (apartmentUrl != undefined) apartments.push("https://www.nepremicnine.net" + apartmentUrl)
        })
    }

    // Scraps the main site
    response = await axios(mainRentUrl)
    html = response.data
    $ = cheerio.load(html) 

    // Gets the amount of pages avaliable
    try {
        let argumentCounter = $('.paging_last').find('a').attr('href').split('/').length
        amountOfPages = $('.paging_last').find('a').attr('href').split('/')[argumentCounter - 2]
    } catch(error) {
        amountOfPages = 1
    }

    // Grabs every URL of an apartment
    $("*[itemprop = 'name']").each(function(){
        let apartment = $(this)
        let apartmentUrl = apartment.find('a').first().attr('href')
        if (apartmentUrl != undefined) apartments.push("https://www.nepremicnine.net" + apartmentUrl)
    })

    // Goes through every page, and scraps for URLs of individual apartments
    for (let i = 2; i <= amountOfPages; i++) {
        response = await axios(`${mainRentUrl}${i}/`)
        html = response.data
        $ = cheerio.load(html) 

        $("*[itemprop = 'name']").each(function(){
            let apartment = $(this)
            let apartmentUrl = apartment.find('a').first().attr('href')
            if (apartmentUrl != undefined) apartments.push("https://www.nepremicnine.net" + apartmentUrl)
        })
    }

    return apartments
}

async function scrapeApartment(url, apiKey) {
    // Scarpes the website
    const response = await axios(url)
    const html = response.data
    const $ = cheerio.load(html) 

    /* 
    THIS PART IS DONE FIRST, TO AVOID DOING UNNECESSARY WORK
    IT RETURNS AS SOON AS AN APARTMENT IS INVALID(IT DOES NOT HAVE COORDINATES)
    */

    // Coordinates and address
    let beforeCoordinates = html.match('coord=').index + 7 // +7 so it goes at the start of the coordinate. coord=( is 7 characters
    let afterCoordinates = html.match('&pos=').index - 1 // -1 so it goes at the end of the coordinates. ) is 1 character
    const coordinates = html.substring(beforeCoordinates, afterCoordinates) // Takes everything in between
    const coordinatesSplit = coordinates.split(',')  // This might need switching, because GeoPoint takes longitude first instead of latitude
    let address = ""

    //Initializes the GeoCoder
    const geocoder = NodeGeocoder({provider: 'google', apiKey: apiKey})
    if (coordinates.length != 2) { address = await geocoder.reverse({lat: coordinatesSplit[0], lon: coordinatesSplit[1]}); address = address[0].formattedAddress } else return false // Geocoder API call

    // Regexes used for more accurate information
    const regexSize = new RegExp('\\d+\\.*\\d* m2')
    const regexRooms = new RegExp('(\\d+,*\\d*-sobno|\\d+ in večsobno)')

    // Initialization of variables
    let ownerType = ""
    let size = 0
    let amountOfRooms = 0
    let apartmentType = "FLAT"
    let roomImages = []
    let sellerInfo = ""
    let sellerAddress = ""
    let postNumber = ""
    let contact = ""
    
    // Basic information
    const information = $('.podrobnosti-naslov', html).text()
    const informationSplit = information.split(', ')

    // Owner type
    informationSplit[0] == "Prodaja" ? ownerType = "OWNED" : ownerType = "RENT";

    // Price, room amount and apartment type
    let price = $('.cena', html).text()
    price = price.substring(price.search(/\d/), price.indexOf('€') + 1).trim()

    // Not all information is the same, that's why REGEX needs to be used, to check what information something is
    for(let info of informationSplit) {
        if (regexSize.test(info)) size = info
        else if (regexRooms.test(info)) { 
            let cutCharactersAmount = 6
            if (info.match('in večsobno')) cutCharactersAmount = 10
            amountOfRooms = parseInt(info.substring(0, (info.indexOf(':') - cutCharactersAmount))); 
        }
        else if (info.match('garsonjera')) apartmentType = "STUDIO"
        else if (info.match('apartma')) apartmentType = "APARTMENT"
        else if (info.match('drugo')) apartmentType = "OTHER"
        else if (info.match('soba')) apartmentType = "ROOM"
    }

    // Images
    $('.rsImg', html).each(function() {
        let image = $(this)
        if (image.attr('data-rsbigimg') != undefined) roomImages.push(image.attr('data-rsbigimg')) // Image link is saved in data-rsbigimg instead of src
    })

    // Seller information
    $('.kontakt-opis').find('br').replaceWith('\n')
    const seller = $('.kontakt-opis').text()
    const sellerSplit = seller.split('\n')

    if (sellerSplit[1].trim() == "Zasebna ponudba") {  // If the sale is private, only the number is avaliable, so we set it in the proper field
        sellerInfo = "PRIVATE SALE"
        contact = sellerSplit[2]; sellerAddress = ""
    } else {
        if (sellerSplit[1] != undefined) sellerInfo = sellerSplit[1].trim()
        if (sellerSplit[2] != undefined) sellerAddress = sellerSplit[2].trim()
    }
    if (sellerSplit[3] != undefined) postNumber = sellerSplit[3].trim()
    if (sellerSplit[4] != undefined) contact = sellerSplit[4].trim()

    // Putting all the scraped information into an object
    const apartment = {
        type: ownerType,
        apartmentType: apartmentType,
        amountOfRooms: amountOfRooms,
        size: size,
        price: price,
        roomImages: roomImages,
        address: address,
        location: coordinatesSplit,
        seller: {
            sellerInfo: sellerInfo,
            sellerAddress: sellerAddress,
            postNumber: postNumber,
            contact: contact,
        }
    }

    return apartment
}

async function scrapeAllApartments(apiKey, urlArguments) {
    try {
        let apartmentUrls = await getApartments(urlArguments)
        let apartments = []

        for await (let apartmentUrl of apartmentUrls) {
            let apartment = await scrapeApartment(apartmentUrl, apiKey)
            if (apartment) apartments.push(apartment) // Only gives apartments with coordinates
        }

        return apartments
    } catch(error) {
        console.log(`Error while scraping the apartments: ${error}`)
    }
}

class WebScraper{
    constructor(apiKey) {
        this.apiKey = apiKey
    }

    scrape(urlArguments) {
        return scrapeAllApartments(this.apiKey, urlArguments)
    }
}

module.exports = {
    WebScraper
}