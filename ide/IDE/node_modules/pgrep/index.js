var proc = require('child_process');
var Promise = require('bluebird');
var _ = require('lodash');

var flagMap = {
  count: 'c',
  delimeter: 'd',
  full: 'f',
  pgroup: 'g',
  group: 'G',
  'list-name': 'l',
  'list-full': 'a',
  newest: 'n',
  oldest: 'o',
  P: 'P',
  ppid: 'P',
  session: 's',
  terminal: 't',
  euid: 'u',
  uid: 'U',
  inverse: 'v',
  lightweight: 'w',
  exact: 'x',
  pidfile: 'F',
  logpidfile: 'L',
  version: 'V',
  help: 'h'
};

exports.exec = function (options) {
  var args = _.compact([ options.name ]);
  delete options.name;
  args = _.compact(args.concat(_.flatten(_.map(options, function (value, flag) {
    if (!flagMap[flag]) {
      throw new Error('flag not recognized: '+ flag);
    }
    return [ '-' + flagMap[flag], ((value === true) ? '' : value) ];
  }))));
  return new Promise(function (resolve, reject) {
    proc.exec('pgrep ' + args.join(' '), function (error, stdout, stderr) {
      if (error) return reject(error);

      resolve(_.compact(_.map(stdout.split('\n'), function (pid) {
        return parseInt(pid);
      })));
    });
  });
};
