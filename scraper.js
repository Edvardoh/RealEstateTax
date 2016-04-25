var request = require("request"),
	cheerio = require("cheerio"),
	json2csv = require("json2csv"),
	fs = require('fs'),
	page = 0;

function filterByTaxData (addresses) {
	var url = 'http://www.phila.gov/revenue/realestatetax/';

	if(addresses.length == 0) {
		console.log('done');
		return;
	}

	var formData = {
		__EVENTTARGET: '',
		__EVENTARGUMENT: '',
		__VIEWSTATE: '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MGRkAgIPDxYCHwAFBSQwLjAwZGQCAw8PFgIfAAUFJDAuMDBkZAIEDw8WAh8ABQUkMC4wMGRkAgUPDxYCHwAFBSQwLjAwZGQCBg8PFgIfAAUGJm5ic3A7ZGQCBw8PFgIfAAUGJm5ic3A7ZGQCCA8PFgIfAAUGJm5ic3A7ZGQCDg9kFhJmDw8WAh8ABQQyMDE0ZGQCAQ8PFgIfAAUFJDAuMDBkZAICDw8WAh8ABQUkMC4wMGRkAgMPDxYCHwAFBSQwLjAwZGQCBA8PFgIfAAUFJDAuMDBkZAIFDw8WAh8ABQUkMC4wMGRkAgYPDxYCHwAFBiZuYnNwO2RkAgcPDxYCHwAFBiZuYnNwO2RkAggPDxYCHwAFBiZuYnNwO2RkAg8PZBYSZg8PFgIfAAUEMjAxNWRkAgEPDxYCHwAFBSQwLjAwZGQCAg8PFgIfAAUFJDAuMDBkZAIDDw8WAh8ABQUkMC4wMGRkAgQPDxYCHwAFBSQwLjAwZGQCBQ8PFgIfAAUFJDAuMDBkZAIGDw8WAh8ABQYmbmJzcDtkZAIHDw8WAh8ABQYmbmJzcDtkZAIIDw8WAh8ABQYmbmJzcDtkZAIQD2QWEmYPDxYCHwAFBDIwMTZkZAIBDw8WAh8ABQUkMC4wMGRkAgIPDxYCHwAFBSQwLjAwZGQCAw8PFgIfAAUFJDAuMDBkZAIEDw8WAh8ABQUkMC4wMGRkAgUPDxYCHwAFBSQwLjAwZGQCBg8PFgIfAAUGJm5ic3A7ZGQCBw8PFgIfAAUGJm5ic3A7ZGQCCA8PFgIfAAUGJm5ic3A7ZGQCEQ8PFgQeCUZvbnRfQm9sZGceBF8hU0ICgBBkFgxmDw8WAh8ABQZUT1RBTFNkZAIBDw8WAh8ABQUkMC4wMGRkAgIPDxYCHwAFBSQwLjAwZGQCAw8PFgIfAAUFJDAuMDBkZAIEDw8WAh8ABQUkMC4wMGRkAgUPDxYCHwAFBSQwLjAwZGQYAwUeX19Db250cm9sc1JlcXVpcmVQb3N0QmFja0tleV9fFgQFOmN0bDAwJEJvZHlDb250ZW50UGxhY2VIb2xkZXIkR2V0VGF4SW5mb0NvbnRyb2wkUmFkVG9vbFRpcDEFOGN0bDAwJEJvZHlDb250ZW50UGxhY2VIb2xkZXIkR2V0VGF4SW5mb0NvbnRyb2wkU2luZ2xldG9uBTtjdGwwMCRCb2R5Q29udGVudFBsYWNlSG9sZGVyJEdldFRheEluZm9Db250cm9sJERpYWxvZ1dpbmRvdwVAY3RsMDAkQm9keUNvbnRlbnRQbGFjZUhvbGRlciRHZXRUYXhJbmZvQ29udHJvbCRQYXltZW50QWdyZWVtZW50cwVBY3RsMDAkQm9keUNvbnRlbnRQbGFjZUhvbGRlciRHZXRUYXhJbmZvQ29udHJvbCRncmRQYXltZW50c0hpc3RvcnkPPCsADAEIAgFkBTJjdGwwMCRCb2R5Q29udGVudFBsYWNlSG9sZGVyJEdldFRheEluZm9Db250cm9sJGZybQ8UKwAHZGRkZGQWAAIQZBmZeGFchj05DVkW//2A5kgMq2hNG+YqtEYCv7HIP43E',
		__EVENTVALIDATION: '/wEWCAKq+d3jAQLRzsWTBwLlpIbACAKV6q2KDQKIvdHyCQLtwJbeBwLe+rXyAwKvmOrRD7bgej7yXVkAyqbrVkH+5wCUyJgzAF6h3oFWcODuk0Fl',
		ctl00$BodyContentPlaceHolder$SearchByAddressControl$txtLookup: '1300 N Orianna St',
		ctl00$BodyContentPlaceHolder$SearchByAddressControl$btnLookup: '>>',
		ctl00$BodyContentPlaceHolder$SearchByBRTControl$txtTaxInfo: 'by BRT Number',
		ctl00$BodyContentPlaceHolder$GetTaxInfoControl$hcBrtNum: '183404801'
	};
	console.log('pre request');

	//TODO: not getting back the table results when we try to spoof the formdata...
	request({
		url: url + '?txtLookup=%221300+N+Orianna+St%22', 
		formData: formData,
		headers: {
			'Content-Type':'application/x-www-form-urlencoded',
			'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
			//'Accept-Encoding':'gzip, deflate',
			'Accept-Language':'en-US,en;q=0.8',
			'Cache-Control':'no-cache',
			'Connection':'keep-alive',
			//'Content-Length':'786',
			'Cookie':'__utma=260812364.1385584448.1452902631.1460562482.1460562482.1; __utmz=260812364.1460562482.1.1.utmcsr=(direct)|utmccn=(direct)|utmcmd=(none); BIGipServerphila.gov_pool=2183047360.20480.0000; BIGipServerbusiness.phila.gov_pool=1696639168.20480.0000; _hjIncludedInSample=1; __utmt=1; _dc_gtm_UA-860026-1=1; _dc_gtm_UA-860026-6=1; _gat_UA-860026-6=1; __utma=1.1385584448.1452902631.1461624548.1461626674.11; __utmb=1.5.10.1461626674; __utmc=1; __utmz=1.1460475214.6.2.utmcsr=google|utmccn=(organic)|utmcmd=organic|utmctr=(not%20provided); _ga=GA1.2.1385584448.1452902631; _gali=ctl00_BodyContentPlaceHolder_SearchByAddressControl_btnLookup',
			'Host':'www.phila.gov',
			'Origin':'http://www.phila.gov',
			'Pragma':'no-cache',
			'Referer':'http://www.phila.gov/revenue/realestatetax/?txtLookup=%221300+N+Orianna+St%22',
			'Upgrade-Insecure-Requests':'1',
			'User-Agent':'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.86 Safari/537.36'
		}
	}, function(error, response, body) { //{url: url, formData: formData}
		console.log('results for ' + addresses[0]['number'] + addresses[0]['street']);

		if(!error) {
			var $ = cheerio.load(body)
				app = $('.revApp'),
				taxTable = $('.grdRecords');

			console.log(body);
			console.log('app: ' + app);
			console.log('table: ' + taxTable);
		} else {
			console.log('Error on tax page for ' + addresses[0] + ': ' + error);
		}
	});
}

//TODO temp
filterByTaxData([{number:'1300',street:'N Orianna St'}]);

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
					fs.writeFile('out.csv', csv, function(err) {
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