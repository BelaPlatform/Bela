var _ = require('lodash');
var assert = require('assert');
var pgrep = require('./');

describe('node-pgrep', function () {
  it('#exec()', function (done) {
    pgrep.exec({
        name: 'node',
        full: true
      }).then(function (pids) {
        console.log(pids);
        assert(pids.length > 0);
        assert(_.isNumber(pids[0]));
        done();
      })
      .catch(function (error) {
        done(error);
      });
  });
});
