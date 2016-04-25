var request = require("request"),
	cheerio = require("cheerio"),
	json2csv = require("json2csv"),
	fs = require('fs'),
	options = {
		headers: {
			'User-Agent': 'Opera/9.80 (X11; Linux i686; Ubuntu/14.10) Presto/2.12.388 Version/12.16'
		},
		url: "https://www.melissadata.com/lookups/zipnumber.asp?zip=" + 19122 //replace with any zip code
	};

	/* PROXY STUFF
	httpsProxyAgent = require('https-proxy-agent'),
	proxy = 'http://117.135.250.138:8082/',
	agent = new httpsProxyAgent(proxy),
	options = {
		agent: agent,
		url: "https://www.melissadata.com/lookups/zipnumber.asp?zip=" + 19122, //replace with any zip code
		agent: agent,
	  	timeout: 10000,
	  	followRedirect: true,
	  	maxRedirects: 10
	};
	*/

request(options, function (error, response, body) {
	if (!error) {
  		var $ = cheerio.load(body),
    		numberNodes = $(".Tableresultborder tr td u a"),
    		urls = [];
    	//console.log('body: ' + body);

    	for(var i=0; i<numberNodes.length; i++) {
    		urls.push($(numberNodes[i]).attr('href'));
    	}

    	console.log('*****urls: ' + urls.toString());
    	console.log('not calling address function');
    	//getAddresses(urls);
	} else {
  		console.log("Error processing street names by zip code page: " + error);
	}
});

function getAddresses (urls, addresses) {
	var addresses = addresses ? addresses : [];
	//console.log('###urls: ' + urls.toString());
	//console.log('###addresses: ' + addresses.toString());
	console.log(urls.length + ' house numbers remaining');
	json2csv({ data: addresses, fields: ['address'] }, function(err, csv) {
	  if (err) console.log(err);
	  fs.writeFile('out.csv', csv, function(err) {
	    if (err) throw err;
	    console.log('file saved');
	  });
	});

	if(urls.length == 0) {
		/*json2csv({ data: addresses, fields: ['address'] }, function(err, csv) {
		  if (err) console.log(err);
		  fs.writeFile('out.csv', csv, function(err) {
		    if (err) throw err;
		    console.log('file saved');
		  });
		});*/

		console.log('done');
		return;
	};

	options.url = 'https://www.melissadata.com/lookups/' + urls[0];
	request(options, function(error, response, body) {
		if(!error) {
			var $$ = cheerio.load(body),
	    		addressNodes = $$('.Tableresultborder td[height="25"][align="left"]');

	    	//console.log('***address nodes: ' + addressNodes.toString());

	    	var text = '';
	    	for(var i=0; i<addressNodes.length; i++) {
	    		text = $$(addressNodes[i]).text();

	    		//console.log('address: ' + text);
	    		// Throw away extra white space and non-alphanumeric characters.
				text = text.replace(/\s+/g, " ")
	       			.replace(/[^a-zA-Z\d\s ]/g, "");

	    		//console.log('**address: ' + text);

    			addresses.push({
    				address: text
    			});
	    	}

	  		urls.shift();
	  		//console.log('***urls: ' + urls.toString());
	  		//console.log('***addresses: ' + addresses.toString());

	  		getAddresses(urls, addresses);
		} else {
			console.log('Error processing street name page: ' + error);
		}
	});
}