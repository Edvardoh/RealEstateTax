var request = require("request"),
	cheerio = require("cheerio"),
	json2csv = require("json2csv"),
	_ = require('lodash'),
	Horseman = require('node-horseman'),
	fs = require('fs'),
	page = 15;

function getTaxData(addresses, userAgent, proxy) {
	return new Promise(function(fulfill, reject) {
		var taxData = [],
			address = addresses[0].number + ' ' + addresses[0].street,
			horseman = new Horseman({
				timeout: 10000,
				proxy: proxy.ipPort,
				proxyType: proxy.type
			});

		function extractData() {
			return horseman.evaluate(function() {
				var rows = $('tr'),
					data = {};

				for(var i=0; i<rows.length; i++) {
					var cells = $(rows[i]).children(),
						year = $(cells[0]).text();

					if(!isNaN(parseInt(year))) {
						var totalTax = parseFloat($(cells[5]).text().substring(1));

						if(totalTax > 0) {
							data[year] = $(cells[5]).text();
						}
	  				}
				}

				return data;
			});
		}

		function scrape() {
			return new Promise(function(resolve, reject) {
				console.log('processing taxes for ' + address);

				return extractData()
				.then(function(data) {
					console.log('data: ' + JSON.stringify(data));

					if(!_.isEmpty(data)) {
						data.address = address;
						taxData.push(data);	
					}
					
					addresses.shift();

					if(addresses.length > 0) {
						address = addresses[0].number + ' ' + addresses[0].street;

						return horseman
								.type('input[name="ctl00$BodyContentPlaceHolder$SearchByAddressControl$txtLookup"]', address)
						  		.click('input[name="ctl00$BodyContentPlaceHolder$SearchByAddressControl$btnLookup"]')
						  		.waitForNextPage()
						  		.then(scrape)
					}
				})
				.then(resolve)
				.catch(function(e) {
					console.log('error: ' + e);
				});
			});
		}

		horseman
			.userAgent(userAgent)
			.open('http://www.phila.gov/revenue/realestatetax/')
	  		.type('input[name="ctl00$BodyContentPlaceHolder$SearchByAddressControl$txtLookup"]', address)
	  		.click('input[name="ctl00$BodyContentPlaceHolder$SearchByAddressControl$btnLookup"]')
	  		.waitForNextPage()
	  		.then(scrape)
	  		.finally(function() {
	  			//writeCsv()
	  			//horseman.close();
	  			//TODO - pull out writeCsv and handle from queueTaxScrapers. write each time we get data back, in case it breaks the next time around.
	  			// call with new proxy and useragent each time.
	  			// need a way to save our spot?
	  			console.log('finally!');
	  			fulfill(taxData);
	  		});
	});
}

function writeCsv(data) {
	var taxFields = ['address', '2001', '2002', '2003', '2004', '2005', '2006', '2007', '2008', '2009', '2010', '2011', '2012', '2013', '2014', '2015', '2016'];

	json2csv({ data: data, fields: taxFields}, function(err, csv) {
		if (err) console.log(err);
		fs.writeFile('taxes.csv', csv, function(err) {
			if (err) throw err;
		    console.log('taxes saved');
		});
	});

	console.log('done');
	return;
}

function queueTaxScrapers(data) {
	// break up address data into chunks, get tax data for each chunk using separate proxy/user agent
	//TODO hardcoding useragents and ip's for now to see if it works first
	var chunkSize = 15,
		userAgents = [
			'Opera/9.80 (X11; Linux i686; Ubuntu/14.10) Presto/2.12.388 Version/12.16',
			'Opera/9.80 (Windows NT 6.0) Presto/2.12.388 Version/12.14',
			'Mozilla/5.0 (Windows NT 6.0; rv:2.0) Gecko/20100101 Firefox/4.0 Opera 12.14',
			'Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.0) Opera 12.14',
			'Opera/12.80 (Windows NT 5.1; U; en) Presto/2.10.289 Version/12.02',
			'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2228.0 Safari/537.36',
			'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2227.1 Safari/537.36',
			'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2227.0 Safari/537.36',
			'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2227.0 Safari/537.36',
			'Mozilla/5.0 (Windows NT 6.3; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2226.0 Safari/537.36',
			'Mozilla/5.0 (Windows NT 6.4; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2225.0 Safari/537.36',
			'Mozilla/5.0 (Windows NT 6.3; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2225.0 Safari/537.36',
			'Mozilla/5.0 (Windows NT 5.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2224.3 Safari/537.36',
			'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
			'Mozilla/5.0 (compatible, MSIE 11, Windows NT 6.3; Trident/7.0; rv:11.0) like Gecko',
			'Mozilla/5.0 (compatible; MSIE 10.6; Windows NT 6.1; Trident/5.0; InfoPath.2; SLCC1; .NET CLR 3.0.4506.2152; .NET CLR 3.5.30729; .NET CLR 2.0.50727) 3gpp-gba UNTRUSTED/1.0',
			'Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 7.0; InfoPath.3; .NET CLR 3.1.40767; Trident/6.0; en-IN)',
			'Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.1; WOW64; Trident/6.0)'
		],
		proxys = [{
			ipPort: '198.211.115.161:8118',
			type: 'http'
		},{
			ipPort: '107.163.117.130:808',
			type: 'http'
		},{
			ipPort: '24.205.163.136:80',
			type: 'http'
		},{
			ipPort: '107.163.117.160:808',
			type: 'http'
		},{
			ipPort: '107.163.117.113:808',
			type: 'http'
		},{
			ipPort: '52.36.128.179:80',
			type: 'http'
		}],
		promises = [];

	var num = Math.floor(data.length/chunkSize) + 1;
	//console.log('num: ' + num);
	//console.log('data: ' + JSON.stringify(data));
	
	for(var i=0; i<1; i++) {
		// create new promise with unique chunk of addresses, random useragent and proxy
		var ua = userAgents[Math.floor(Math.random() * (userAgents.length - 1))];
		var proxy = proxys[Math.floor(Math.random() * (proxys.length - 1))];
		var chunk = data.splice(0, chunkSize);

		console.log('user agent: ' + ua);
		console.log('proxy: ' + JSON.stringify(proxy));
		console.log('processing addresses: ' + JSON.stringify(chunk));

		promises[i] = getTaxData(chunk, ua, proxy);
	}

	Promise.all(promises).then(function(result) {
		var taxData = [];
		for(var i=0; i<result.length; i++) {
			taxData = Array.prototype.concat(result[i]);
		}
		writeCsv(taxData);
		console.log('done!');

	}, function(error) {
		console.log('tax scraper error: ' + error);
	});
}

function getAddresses (page, addresses) {
	var addresses = addresses ? addresses : [],
		url = "https://zipcode-address.com/Pennsylvania-PA/" + 19122 + "/?page=";

	request(url + page, function(error, response, body) {
		if(!error) {
			var $ = cheerio.load(body),
	    		addressNodes = $('.table-responsive table tr td a');

	    	console.log('processing page: ' + page);

	    	if(addressNodes.length == 0) {
	    		json2csv({ data: addresses, fields: ['number', 'street'] }, function(err, csv) {
					if (err) console.log(err);
					fs.writeFile('addresses.csv', csv, function(err) {
						if (err) throw err;
					    console.log('addresses saved');
					});
				});

	    		queueTaxScrapers(addresses);
	    		return;
	    	}

	    	var text,
	    		street,
	    		range,
	    		diff;
	    	for(var i=0; i<addressNodes.length; i++) { 
	    		text = $(addressNodes[i]).text();
	    		range = text.split(',')[0].split(' - ');
	    		street = text.split(',')[1];

	    		if(range.length != 2) continue;

	    		diff = parseInt(range[1]) - parseInt(range[0]);

	    		for(var j=0; j<=diff; j+=2) {
	    			//console.log(parseInt(range[0]) + j);
	    			addresses.push({
	    				'number': '' + (parseInt(range[0]) + j) + '',
	    				'street': street
	    			});
	    		}
	    	}

	    	page ++;
	  		getAddresses(page, addresses);
		} else {
			console.log('Error on zipcode page ' + page + ': ' + error);
		}
	});
}

getAddresses(page);