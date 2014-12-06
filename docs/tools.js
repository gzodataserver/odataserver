//
// tools.js
//
// Run with: `npm install minimist pretty-data; node spec_example.js`
//

var http = require('http');
var argv = require('minimist')(process.argv.slice(2));
var pd = require('pretty-data').pd;

var options = null,
  usage = 'usage: node tools.js --help|--accountId=[joe@example.com]';

var h = require('../src/helpers.js');


if (argv.accountId) {
  console.log('-- accountId --');
  console.log('Account ID for '+argv.accountId+' is '+h.email2accountId(argv.accountId));
  return;
}

if (argv.help) {
  console.log(usage);
  return;
}

if (options === null) {
  //console.dir(argv);

  console.log(usage);
  return;
}
