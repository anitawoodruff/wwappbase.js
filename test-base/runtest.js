'use strict';
const shell = require('shelljs');
const yargv = require('yargs').argv;

let config = {
	site: 'test', // TODO can we sniff this?? // How do we set it??
	unsafe: false,
	vert: 'test_wide_multiple',
	head: true,
	chrome: false,
	flag: false,
};
let argv = process.argv.slice(0, 2);

let testPath = '';
let runInBand = '';

Object.entries(yargv).forEach(([key, value]) => {
	if (key === 'test') { testPath = value; }
	if (key === 'runInBand') { runInBand = '--runInBand'; }

	if (Object.keys(config).includes(key)) {
		if (typeof config[key] === "boolean") {
			const bool = config[key];
			config[key] = !bool;
		} else config[key] = value;
	}
});

// Store configuration on env
process.env.__CONFIGURATION = JSON.stringify(config);

// Setting real ARGV
process.argv = argv;

// Execute Jest. Specific target optional.
// shell.exec(`npm run test${' ' + testPath} ${runInBand}`);
shell.exec(`npm run test${' ' + testPath} ${runInBand}`);
