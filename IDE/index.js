var IDE = require('./dist/main');
let args = process.argv;
args.splice(0, 2);
IDE.init(args);
