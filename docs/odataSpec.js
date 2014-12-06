//
// odataSpec.js
//
// Run with: `npm install minimist pretty-data; node spec_example.js`
//

var http = require('http');
var argv = require('minimist')(process.argv.slice(2));
var pd   = require('pretty-data').pd;

var options = null,
    resultType = '',
    usage='usage: node spec_example.js --help|--prodcuts|--metadata|--service [--ignore_status]';

// Same as: `curl: http://services.odata.org/V3/OData/OData.svc/Products\?\$format=json`
if(argv.products) {
  console.log('-- PRODUCTS --');
  resultType = 'JSON';
  options = {
    host: 'services.odata.org',
    port: 80,
    path: '/V3/OData/OData.svc/Products?$format=json',
    method: 'GET'
  };
}

// curl http://services.odata.org/V3/OData/OData.svc/$metadata#Products
if(argv.products_metadata) {
  console.log('-- PRODUCTS METADATA --');
  resultType = 'XML';
  var options = {
    host: 'services.odata.org',
    port: 80,
    path: '/V3/OData/OData.svc/$metadata#Products',
    method: 'GET'
  };
}

// curl http://services.odata.org/V3/OData/OData.svc/\$metadata
if(argv.metadata) {
  console.log('-- METADATA --');
  resultType = 'XML';
  var options = {
    host: 'services.odata.org',
    port: 80,
    path: '/V3/OData/OData.svc/$metadata',
    method: 'GET'
  };
}

// curl http://services.odata.org/V3/OData/OData.svc/\?\$format=json
if(argv.service) {
  console.log('-- SERVICE --');
  resultType = 'JSON';
  var options = {
    host: 'services.odata.org',
    port: 80,
    path: '/V3/OData/OData.svc/?$format=json',
    method: 'GET'
  };
}

if(argv.help) {
  console.log(usage);
  return;
}

if (options === null) {
  //console.dir(argv);

  console.log(usage);
  return;
}

// Print the resutls
var req = http.request(options, function(res) {
  var data = '';

  console.log('STATUS: ' + res.statusCode);
  console.log('HEADERS: ' + JSON.stringify(res.headers, null, 4));

//  if(res.statusCode != 200 && !argv.ignore_status)
//    return;

  res.setEncoding('utf8');

  res.on('data', function (chunk) {
    data += chunk;
  });

  res.on('end', function(){

    data = (resultType == 'JSON') ? JSON.stringify(JSON.parse(data), null, 4) : data;
    data = (resultType == 'XML')  ? pd.xml(data)                              : data;

    console.log('BODY: ' + data);
    console.log('END!');
  });

});

req.end();
