var request = require("request"),
	cheerio = require("cheerio"),
	json2csv = require("json2csv"),
	_ = require('lodash'),
	Horseman = require('node-horseman'),
	fs = require('fs'),
	page = 15; //starting page (TODO - starting at 15 for now to limit address results during development)

function getTaxData(addresses) {
	var taxData = [],
		address = addresses[0].number + ' ' + addresses[0].street,
		horseman = new Horseman({
			timeout: 10000
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
			console.log('processing taxes for ' + address + '...');

			return extractData()
			.then(function(data) {
				console.log('tax data: ' + JSON.stringify(data));

				if(!_.isEmpty(data)) {
					data.address = address;
					taxData.push(data);	
				}
				
				addresses.shift();

				if(addresses.length > 0) {
					address = addresses[0].number + ' ' + addresses[0].street;

					setTimeout(function() {
						return horseman
							.type('input[name="ctl00$BodyContentPlaceHolder$SearchByAddressControl$txtLookup"]', address)
					  		.click('input[name="ctl00$BodyContentPlaceHolder$SearchByAddressControl$btnLookup"]')
					  		.waitForNextPage()
					  		.then(scrape);
					}, 1000);
				} else {
					resolve();
				}
			})
			.catch(function(e) {
				console.log('error: ' + e);
				reject();
			});
		});
	}

	horseman
		.open('http://www.phila.gov/revenue/realestatetax/')
  		.type('input[name="ctl00$BodyContentPlaceHolder$SearchByAddressControl$txtLookup"]', address)
  		.click('input[name="ctl00$BodyContentPlaceHolder$SearchByAddressControl$btnLookup"]')
  		.waitForNextPage()
  		.then(scrape)
  		.finally(function() {
  			writeCsv(taxData);
  		});
}

function writeCsv(data) {
	var taxFields = ['address', '2001', '2002', '2003', '2004', '2005', '2006', '2007', '2008', '2009', '2010', '2011', '2012', '2013', '2014', '2015', '2016'];

	console.log('writing tax data to csv...')

	json2csv({ data: data, fields: taxFields}, function(err, csv) {
		if (err) console.log(err);
		fs.writeFile('taxes.csv', csv, function(err) {
			if (err) throw err;
		    console.log('taxes saved');
		    process.exit();
		});
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

	    		getTaxData(addresses.splice(0,1)); //TODO limiting number of addresses during testing
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