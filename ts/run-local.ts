import { main } from './main';
const yaml = require('js-yaml');
const fs = require('fs');

main(process.argv[2], yaml.load(fs.readFileSync('env.yaml', 'utf8')));
