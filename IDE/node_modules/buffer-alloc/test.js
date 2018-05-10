var alloc = require('./')
var assert = require('assert')

var b1 = alloc(4)
assert.ok(Buffer.isBuffer(b1))
assert.equal(b1.length, 4)
assert.equal(b1.toString('hex'), '00000000')

var b2 = alloc(6, 0x41)
assert.ok(Buffer.isBuffer(b2))
assert.equal(b2.length, 6)
assert.equal(b2.toString('hex'), '414141414141')

var b3 = alloc(10, 'linus', 'utf8')
assert.ok(Buffer.isBuffer(b3))
assert.equal(b3.length, 10)
assert.equal(b3.toString('hex'), '6c696e75736c696e7573')

var b4 = alloc(8192)
assert.ok(Buffer.isBuffer(b4))
for (var i = 0; i < 8192; i++) {
  assert.equal(b4[i], 0)
}
