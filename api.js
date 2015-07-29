var request = require('request');
var cheerio = require('cheerio');
var Iconv = require('iconv').Iconv;

// Setting up constants
var hostname = "extranet.novae-restauration.ch";
var SIDEndpoint = "http://" + hostname + "/index.php?frame=1&x=ad3f8f75fe1e353b972afcce8e375d6e&y=81dc9bdb52d04dc20036dbd8313ed055&z=135";
var menuEndpoint = "http://" + hostname + "/novae/traiteur/restauration/bon-app.html?frame=1";
var userAgent = "CERN Restaurant API (https://github.com/mweisz/cern-restaurant-api)"

var MEAL_TYPES = ['Menu 1', 'Menu 2', 'Vegetarian'];

var response;

function SIDRequestCallback(error, response, body) {
    if (!error && response.statusCode == 302) {
        var sessionId = response.headers['set-cookie'][0].split(';')[0].substring(4);
        console.log("Successfuly retrieved sid (" + sessionId + ").");

        var menuRequestOption = {   url: menuEndpoint, 
                                    headers: {  'Cookie' : 'sid=' + sessionId,
                                                'Host': hostname,
                                                'User-Agent': userAgent,
                                    },
                                    encoding: null // prevent 'request' module from assuming UTF-8
                                };

        // Now that we've got a session Id, we can fetch the actual menu html
        request(menuRequestOption, menuRequestCallback);

    } else {
        console.log("Couldn't retrieve session Id. Exiting.");
    }
}

function menuRequestCallback(error, response, body) {
    if (!error && response.statusCode == 200) {

        // Convert ISO-8859-1 -> UTF-8
        menuPageBuffer = new Buffer(body, 'binary');
        var encoder = new Iconv('ISO-8859-1', 'utf8');
        menuPageRawHTML = encoder.convert(menuPageBuffer).toString();

        // Parse the menu page raw HTML to extract the Menu
        parseMenuPage(menuPageRawHTML);
    } else {
        console.log("Couldn't retrieve menu.");
    }
}

function parseMenuPage(rawHTML){

    var $ = cheerio.load(rawHTML, {
        normalizeWhitespace: false,
        xmlMode: false,
        decodeEntities: true
    });

    var menu = [];

    // Fetch the dates
    $('td[class=EnteteMenu]').each(function(name,val){
        menu.push({day: $(this).text(), meals: []});
    });

    // Fetch the actual meals
    var day = -1;
    $('span[class=]').each(function(name,val){
        if (name % 3 == 0) { 
            day++;
        }
        var type = name % 3;
        var encodedName = $(this).text();
        menu[day].meals.push({type: MEAL_TYPES[type], name: encodedName});
    });

    console.log(menu);
    response.set({'Content-Type': 'application/json'});
    response.send(menu);
}



exports.getMenu = function(req, res){

    response = res;

    var SIDRequestOptions = {
        url: SIDEndpoint,
        followRedirect: false,
        headers: {
            'User-Agent': userAgent,
            'Host': hostname
        }
    };
    request(SIDRequestOptions, SIDRequestCallback);
}

