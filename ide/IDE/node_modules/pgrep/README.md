# node-pgrep

[![NPM version][npm-image]][npm-url]
[![Build status][travis-image]][travis-url]
[![Dependency Status][daviddm-image]][daviddm-url]

## Install
```sh
$ npm install pgrep --save
```

## Usage

```js
var pgrep = require('pgrep');
pgrep.exec({
    euid: 'tjwebb', // owner of process
    full: true,     // whether to match full command line
    parent: 12587   // parent PID
  })
  .then(function (pids) {
    // handle the pids
  });

```

## API

#### `.exec`
Returns [Promise](https://www.npmjs.org/package/bluebird) containing a list of the matching PIDs.

| @param | @description \
|:---|:---|
| `options.euid` | effective user id |
| `options.full` | match the full command line |
| `options.parent` | parent process ID |


#### Manpage
(http://linux.die.net/man/1/pgrep)


## License
MIT

[npm-image]: https://img.shields.io/npm/v/pgrep.svg?style=flat
[npm-url]: https://npmjs.org/package/pgrep
[travis-image]: https://img.shields.io/travis/tjwebb/node-pgrep.svg?style=flat
[travis-url]: https://travis-ci.org/tjwebb/node-pgrep
[daviddm-image]: http://img.shields.io/david/tjwebb/node-pgrep.svg?style=flat
[daviddm-url]: https://david-dm.org/tjwebb/node-pgrep
