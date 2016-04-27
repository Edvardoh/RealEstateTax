var request = require("request"),
	cheerio = require("cheerio"),
	json2csv = require("json2csv"),
	Horseman = require('node-horseman'),
	horseman = new Horseman(),
	fs = require('fs'),
	page = 0;

function filterByTaxData (addresses, taxData) {
	var taxData = taxData ? taxData : [];

	if(addresses.length == 0) {
		json2csv({ data: taxData, fields: ['address', '2001', '2002', '2003', '2004', '2005', '2006', '2007', '2008', '2009', '2010', '2011', '2012', '2013', '2014', '2015', '2016'] }, function(err, csv) {
			if (err) console.log(err);
			fs.writeFile('taxes.csv', csv, function(err) {
				if (err) throw err;
			    console.log('taxes saved');
			});
		});

		console.log('done');
		return;
	}

	var address = addresses[0].number + ' ' + addresses[0].street;

	console.log('processing taxes for ' + address);

	horseman
  		.userAgent('Mozilla/5.0 (Windows NT 6.1; WOW64; rv:27.0) Gecko/20100101 Firefox/27.0')
  		.open('http://www.phila.gov/revenue/realestatetax/')
  		.type('input[name="ctl00$BodyContentPlaceHolder$SearchByAddressControl$txtLookup"]', address)
  		.click('input[name="ctl00$BodyContentPlaceHolder$SearchByAddressControl$btnLookup"]')
  		.waitForNextPage()
  		.html('table.grdRecords')
  		.then(function(html) {
  			var $ = cheerio.load(html),
  				rows = $('tr'),
  				data = {
  					address: address
  				};

  			for(var i=0; i<rows.length; i++) {
  				var $$ = cheerio.load(rows[i]),
  					cells = $$('td'),
  					year = $$(cells[0]).text();

  				if(!isNaN(parseInt(year))) {
  					data[year] = $$(cells[5]).text();
  				}
  			}

  			taxData.push(data);

			addresses.shift();
			filterByTaxData(addresses, taxData);
  		})
  		.close();
}

//TODO temp
filterByTaxData([{number:'1300',street:'N Orianna St'}]); //, {number:'1302',street:'N Orianna St'}, {number:'1304',street:'N Orianna St'}, {number:'1306',street:'N Orianna St'}

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

	    		filterByTaxData(addresses);
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

//getAddresses(page);