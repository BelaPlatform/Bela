#
# This file was used for TDD and as such probably has limited utility as
# actual unit tests.
#
try
  osc = require '../lib-cov/osc-utilities'
catch e
  osc = require '../lib/osc-utilities'

assert = require "assert"

# Basic string tests.

testString = (str, expected_len) ->
  str : str
  len : expected_len

testData = [
  testString("abc", 4)
  testString("abcd", 8)
  testString("abcde", 8)
  testString("abcdef", 8)
  testString("abcdefg", 8)
]

testStringLength = (str, expected_len) ->
  oscstr = osc.toOscString(str)
  assert.strictEqual(oscstr.length, expected_len)

test 'basic strings length', ->
  for data in testData
    testStringLength data.str, data.len


testStringRoundTrip = (str, strict) ->
  oscstr = osc.toOscString(str)
  str2 = osc.splitOscString(oscstr, strict)?.string
  assert.strictEqual(str, str2)

test 'basic strings round trip', ->
  for data in testData
    testStringRoundTrip data.str


test 'non strings fail toOscString', ->
  assert.throws -> osc.toOscString(7)


test 'strings with null characters don\'t fail toOscString by default', ->
  assert.notEqual(osc.toOscString("\u0000"), null)


test 'strings with null characters fail toOscString in strict mode', ->
  assert.throws -> osc.toOscString("\u0000", true)


test 'osc buffers with no null characters fail splitOscString in strict mode', ->
  assert.throws -> osc.splitOscString new Buffer("abc"), true


test 'osc buffers with non-null characters after a null character fail fromOscString in strict mode', ->
  assert.throws -> osc.fromOscString new Buffer("abc\u0000abcd"), true


test 'basic strings pass fromOscString in strict mode', ->
  for data in testData
    testStringRoundTrip data.str, true


test 'osc buffers with non-four length fail in strict mode', ->
  assert.throws -> osc.fromOscString new Buffer("abcd\u0000\u0000"), true

test 'splitOscString throws when passed a non-buffer', ->
  assert.throws -> osc.splitOscString "test"

test 'splitOscString of an osc-string matches the string', ->
  split = osc.splitOscString osc.toOscString "testing it"
  assert.strictEqual(split?.string, "testing it")
  assert.strictEqual(split?.rest?.length, 0)


test 'splitOscString works with an over-allocated buffer', ->
  buffer = osc.toOscString "testing it"
  overallocated = new Buffer(16)
  buffer.copy(overallocated)
  split = osc.splitOscString overallocated
  assert.strictEqual(split?.string, "testing it")
  assert.strictEqual(split?.rest?.length, 4)


test 'splitOscString works with just a string by default', ->
  split = osc.splitOscString (new Buffer "testing it")
  assert.strictEqual(split?.string, "testing it")
  assert.strictEqual(split?.rest?.length, 0)


test 'splitOscString strict fails for just a string', ->
  assert.throws -> osc.splitOscString (new Buffer "testing it"), true


test 'splitOscString strict fails for string with not enough padding', ->
  assert.throws -> osc.splitOscString (new Buffer "testing \u0000\u0000"), true


test 'splitOscString strict succeeds for strings with valid padding', ->
  split = osc.splitOscString (new Buffer "testing it\u0000\u0000aaaa"), true
  assert.strictEqual(split?.string, "testing it")
  assert.strictEqual(split?.rest?.length, 4)


test 'splitOscString strict fails for string with invalid padding', ->
  assert.throws -> osc.splitOscString (new Buffer "testing it\u0000aaaaa"), true

test 'concat throws when passed a single buffer', ->
  assert.throws -> osc.concat new Buffer "test"

test 'concat throws when passed an array of non-buffers', ->
  assert.throws -> osc.concat ["bleh"]

test 'toIntegerBuffer throws when passed a non-number', ->
  assert.throws -> osc.toIntegerBuffer "abcdefg"

test 'splitInteger fails when sent a buffer that\'s too small', ->
  assert.throws -> osc.splitInteger new Buffer 3, "Int32"

test 'splitOscArgument fails when given a bogus type', ->
  assert.throws -> osc.splitOscArgument new Buffer 8, "bogus"

test 'fromOscMessage with no type string works', ->
  translate = osc.fromOscMessage osc.toOscString "/stuff"
  assert.strictEqual translate?.address, "/stuff"
  assert.deepEqual translate?.args, []

test 'fromOscMessage with type string and no args works', ->
  oscaddr = osc.toOscString "/stuff"
  osctype = osc.toOscString ","
  oscmessage = new Buffer(oscaddr.length + osctype.length)
  oscaddr.copy oscmessage
  osctype.copy oscmessage, oscaddr.length
  translate = osc.fromOscMessage oscmessage
  assert.strictEqual translate?.address, "/stuff"
  assert.deepEqual translate?.args, []

test 'fromOscMessage with string argument works', ->
  oscaddr = osc.toOscString "/stuff"
  osctype = osc.toOscString ",s"
  oscarg = osc.toOscString "argu"
  translate = osc.fromOscMessage osc.concat [oscaddr, osctype, oscarg]
  assert.strictEqual translate?.address, "/stuff"
  assert.strictEqual translate?.args?[0]?.type, "string"
  assert.strictEqual translate?.args?[0]?.value, "argu"

test 'fromOscMessage with true argument works', ->
  oscaddr = osc.toOscString "/stuff"
  osctype = osc.toOscString ",T"
  translate = osc.fromOscMessage osc.concat [oscaddr, osctype]
  assert.strictEqual translate?.address, "/stuff"
  assert.strictEqual translate?.args?[0]?.type, "true"
  assert.strictEqual translate?.args?[0]?.value, true

test 'fromOscMessage with false argument works', ->
  oscaddr = osc.toOscString "/stuff"
  osctype = osc.toOscString ",F"
  translate = osc.fromOscMessage osc.concat [oscaddr, osctype]
  assert.strictEqual translate?.address, "/stuff"
  assert.strictEqual translate?.args?[0]?.type, "false"
  assert.strictEqual translate?.args?[0]?.value, false

test 'fromOscMessage with null argument works', ->
  oscaddr = osc.toOscString "/stuff"
  osctype = osc.toOscString ",N"
  translate = osc.fromOscMessage osc.concat [oscaddr, osctype]
  assert.strictEqual translate?.address, "/stuff"
  assert.strictEqual translate?.args?[0]?.type, "null"
  assert.strictEqual translate?.args?[0]?.value, null

test 'fromOscMessage with bang argument works', ->
  oscaddr = osc.toOscString "/stuff"
  osctype = osc.toOscString ",I"
  translate = osc.fromOscMessage osc.concat [oscaddr, osctype]
  assert.strictEqual translate?.address, "/stuff"
  assert.strictEqual translate?.args?[0]?.type, "bang"
  assert.strictEqual translate?.args?[0]?.value, "bang"

test 'fromOscMessage with blob argument works', ->
  oscaddr = osc.toOscString "/stuff"
  osctype = osc.toOscString ",b"
  oscarg = osc.concat [(osc.toIntegerBuffer 4), new Buffer "argu"]
  translate = osc.fromOscMessage osc.concat [oscaddr, osctype, oscarg]
  assert.strictEqual translate?.address, "/stuff"
  assert.strictEqual translate?.args?[0]?.type, "blob"
  assert.strictEqual (translate?.args?[0]?.value?.toString "utf8"), "argu"

test 'fromOscMessage with integer argument works', ->
  oscaddr = osc.toOscString "/stuff"
  osctype = osc.toOscString ",i"
  oscarg = osc.toIntegerBuffer 888
  translate = osc.fromOscMessage osc.concat [oscaddr, osctype, oscarg]
  assert.strictEqual translate?.address, "/stuff"
  assert.strictEqual translate?.args?[0]?.type, "integer"
  assert.strictEqual (translate?.args?[0]?.value), 888

test 'fromOscMessage with timetag argument works', ->
  oscaddr = osc.toOscString "/stuff"
  osctype = osc.toOscString ",t"
  timetag = [8888, 9999]
  oscarg = osc.toTimetagBuffer timetag
  translate = osc.fromOscMessage osc.concat [oscaddr, osctype, oscarg]
  assert.strictEqual translate?.address, "/stuff"
  assert.strictEqual translate?.args?[0]?.type, "timetag"
  assert.deepEqual (translate?.args?[0]?.value), timetag

test 'fromOscMessage with mismatched array doesn\'t throw', ->
  oscaddr = osc.toOscString "/stuff"
  assert.doesNotThrow (-> osc.fromOscMessage osc.concat(
    [oscaddr, osc.toOscString ",["]))
  assert.doesNotThrow (-> osc.fromOscMessage osc.concat(
    [oscaddr, osc.toOscString ",["]))

test 'fromOscMessage with mismatched array throws in strict', ->
  oscaddr = osc.toOscString "/stuff"
  assert.throws (-> osc.fromOscMessage (osc.concat(
    [oscaddr, osc.toOscString ",["])), true)
  assert.throws (-> osc.fromOscMessage (osc.concat(
    [oscaddr, osc.toOscString ",]"])), true)

test 'fromOscMessage with empty array argument works', ->
  oscaddr = osc.toOscString "/stuff"
  osctype = osc.toOscString ",[]"
  translate = osc.fromOscMessage osc.concat [oscaddr, osctype]
  assert.strictEqual translate?.address, "/stuff"
  assert.strictEqual translate?.args?[0]?.type, "array"
  assert.strictEqual (translate?.args?[0]?.value?.length), 0
  assert.deepEqual (translate?.args?[0]?.value), []

test 'fromOscMessage with bang array argument works', ->
  oscaddr = osc.toOscString "/stuff"
  osctype = osc.toOscString ",[I]"
  translate = osc.fromOscMessage osc.concat [oscaddr, osctype]
  assert.strictEqual translate?.address, "/stuff"
  assert.strictEqual translate?.args?[0]?.type, "array"
  assert.strictEqual (translate?.args?[0]?.value?.length), 1
  assert.strictEqual (translate?.args?[0]?.value?[0]?.type), "bang"
  assert.strictEqual (translate?.args?[0]?.value?[0]?.value), "bang"

test 'fromOscMessage with string array argument works', ->
  oscaddr = osc.toOscString "/stuff"
  osctype = osc.toOscString ",[s]"
  oscarg = osc.toOscString "argu"
  translate = osc.fromOscMessage osc.concat [oscaddr, osctype, oscarg]
  assert.strictEqual translate?.address, "/stuff"
  assert.strictEqual translate?.args?[0]?.type, "array"
  assert.strictEqual (translate?.args?[0]?.value?.length), 1
  assert.strictEqual (translate?.args?[0]?.value?[0]?.type), "string"
  assert.strictEqual (translate?.args?[0]?.value?[0]?.value), "argu"

test 'fromOscMessage with nested array argument works', ->
  oscaddr = osc.toOscString "/stuff"
  osctype = osc.toOscString ",[[I]]"
  translate = osc.fromOscMessage osc.concat [oscaddr, osctype]
  assert.strictEqual translate?.address, "/stuff"
  assert.strictEqual translate?.args?[0]?.type, "array"
  assert.strictEqual translate?.args?[0]?.value?.length, 1
  assert.strictEqual (translate?.args?[0]?.value?[0]?.type), "array"
  assert.strictEqual (translate?.args?[0]?.value?[0]?.value?.length), 1
  assert.strictEqual (translate?.args?[0]?.value?[0]?.value?[0]?.type), "bang"
  assert.strictEqual (translate?.args?[0]?.value?[0]?.value?[0]?.value), "bang"

test 'fromOscMessage with multiple args works', ->
  oscaddr = osc.toOscString "/stuff"
  osctype = osc.toOscString ",sbi"
  oscargs = [
        (osc.toOscString "argu")
        (osc.concat [(osc.toIntegerBuffer 4), new Buffer "argu"])
        (osc.toIntegerBuffer 888)
  ]

  oscbuffer = osc.concat [oscaddr, osctype, (osc.concat oscargs)]
  translate = osc.fromOscMessage oscbuffer
  assert.strictEqual translate?.address, "/stuff"
  assert.strictEqual translate?.args?[0]?.type, "string"
  assert.strictEqual (translate?.args?[0]?.value), "argu"

test 'fromOscMessage strict fails if type string has no comma', ->
  oscaddr = osc.toOscString "/stuff"
  osctype = osc.toOscString "fake"
  assert.throws ->
    osc.fromOscMessage (osc.concat [oscaddr, osctype]), true

test 'fromOscMessage non-strict works if type string has no comma', ->
  oscaddr = osc.toOscString "/stuff"
  osctype = osc.toOscString "fake"
  message = osc.fromOscMessage (osc.concat [oscaddr, osctype])
  assert.strictEqual message.address, "/stuff"
  assert.strictEqual message.args.length, 0

test 'fromOscMessage strict fails if type address doesn\'t begin with /', ->
  oscaddr = osc.toOscString "stuff"
  osctype = osc.toOscString ","
  assert.throws ->
    osc.fromOscMessage (osc.concat [oscaddr, osctype]), true

test 'fromOscBundle works with no messages', ->
  oscbundle = osc.toOscString "#bundle"
  timetag = [0, 0]
  osctimetag = osc.toTimetagBuffer timetag
  buffer = osc.concat [oscbundle, osctimetag]
  translate = osc.fromOscBundle buffer
  assert.deepEqual translate?.timetag, timetag
  assert.deepEqual translate?.elements, []

test 'fromOscBundle works with single message', ->
  oscbundle = osc.toOscString "#bundle"
  timetag = [0, 0]
  osctimetag = osc.toTimetagBuffer timetag
  oscaddr = osc.toOscString "/addr"
  osctype = osc.toOscString ","
  oscmessage = osc.concat [oscaddr, osctype]
  osclen = osc.toIntegerBuffer oscmessage.length
  buffer = osc.concat [oscbundle, osctimetag, osclen, oscmessage]
  translate = osc.fromOscBundle buffer
  assert.deepEqual translate?.timetag, timetag
  assert.strictEqual translate?.elements?.length, 1
  assert.strictEqual translate?.elements?[0]?.address, "/addr"

test 'fromOscBundle works with multiple messages', ->
  oscbundle = osc.toOscString "#bundle"
  timetag = [0, 0]
  osctimetag = osc.toTimetagBuffer timetag
  oscaddr1 = osc.toOscString "/addr"
  osctype1 = osc.toOscString ","
  oscmessage1 = osc.concat [oscaddr1, osctype1]
  osclen1 = osc.toIntegerBuffer oscmessage1.length
  oscaddr2 = osc.toOscString "/addr2"
  osctype2 = osc.toOscString ","
  oscmessage2 = osc.concat [oscaddr2, osctype2]
  osclen2 = osc.toIntegerBuffer oscmessage2.length
  buffer = osc.concat [oscbundle, osctimetag, osclen1, oscmessage1, osclen2, oscmessage2]
  translate = osc.fromOscBundle buffer
  assert.deepEqual translate?.timetag, timetag
  assert.strictEqual translate?.elements?.length, 2
  assert.strictEqual translate?.elements?[0]?.address, "/addr"
  assert.strictEqual translate?.elements?[1]?.address, "/addr2"

test 'fromOscBundle works with nested bundles', ->
  oscbundle = osc.toOscString "#bundle"
  timetag = [0, 0]
  osctimetag = osc.toTimetagBuffer timetag
  oscaddr1 = osc.toOscString "/addr"
  osctype1 = osc.toOscString ","
  oscmessage1 = osc.concat [oscaddr1, osctype1]
  osclen1 = osc.toIntegerBuffer oscmessage1.length
  oscbundle2 = osc.toOscString "#bundle"
  timetag2 = [0, 0]
  osctimetag2 = osc.toTimetagBuffer timetag2
  oscmessage2 = osc.concat [oscbundle2, osctimetag2]
  osclen2 = osc.toIntegerBuffer oscmessage2.length
  buffer = osc.concat [oscbundle, osctimetag, osclen1, oscmessage1, osclen2, oscmessage2]
  translate = osc.fromOscBundle buffer
  assert.deepEqual translate?.timetag, timetag
  assert.strictEqual translate?.elements?.length, 2
  assert.strictEqual translate?.elements?[0]?.address, "/addr"
  assert.deepEqual translate?.elements?[1]?.timetag, timetag2

test 'fromOscBundle works with non-understood messages', ->
  oscbundle = osc.toOscString "#bundle"
  timetag = [0, 0]
  osctimetag = osc.toTimetagBuffer timetag
  oscaddr1 = osc.toOscString "/addr"
  osctype1 = osc.toOscString ","
  oscmessage1 = osc.concat [oscaddr1, osctype1]
  osclen1 = osc.toIntegerBuffer oscmessage1.length
  oscaddr2 = osc.toOscString "/addr2"
  osctype2 = osc.toOscString ",α"
  oscmessage2 = osc.concat [oscaddr2, osctype2]
  osclen2 = osc.toIntegerBuffer oscmessage2.length
  buffer = osc.concat [oscbundle, osctimetag, osclen1, oscmessage1, osclen2, oscmessage2]
  translate = osc.fromOscBundle buffer
  assert.deepEqual translate?.timetag, timetag
  assert.strictEqual translate?.elements?.length, 1
  assert.strictEqual translate?.elements?[0]?.address, "/addr"

test 'fromOscBundle fails with bad bundle ID', ->
  oscbundle = osc.toOscString "#blunder"
  assert.throws -> osc.fromOscBundle oscbundle

test 'fromOscBundle fails with ridiculous sizes', ->
  timetag = [0, 0]
  oscbundle = osc.concat [
    osc.toOscString "#bundle"
    osc.toTimetagBuffer timetag
    osc.toIntegerBuffer 999999
  ]
  assert.throws -> osc.fromOscBundle oscbundle

roundTripMessage = (args) ->
  oscMessage = {
    address : "/addr"
    args : args
  }
  roundTrip = osc.fromOscMessage (osc.toOscMessage oscMessage), true
  assert.strictEqual roundTrip?.address, "/addr"
  assert.strictEqual roundTrip?.args?.length, args.length
  for i in [0...args.length]
    comp = if args[i]?.value? then args[i].value else args[i]
    assert.strictEqual roundTrip?.args?[i]?.type, args[i].type if args[i]?.type?
    if Buffer.isBuffer comp
      for j in [0...comp.length]
        assert.deepEqual roundTrip?.args?[i]?.value?[j], comp[j]
    else
      assert.deepEqual roundTrip?.args?[i]?.value, comp

test 'toOscArgument fails when given bogus type', ->
  assert.throws -> osc.toOscArgument "bleh", "bogus"

# we tested fromOsc* manually, so just use roundtrip testing for toOsc*
test 'toOscMessage with no args works', ->
  roundTripMessage []

test 'toOscMessage strict with null argument throws', ->
  assert.throws -> osc.toOscMessage {address : "/addr", args : [null]}, true

test 'toOscMessage with string argument works', ->
  roundTripMessage ["strr"]

test 'toOscMessage with empty array argument works', ->
  roundTripMessage [[]]

test 'toOscMessage with array value works', ->
  roundTripMessage [{value:[]}]

test 'toOscMessage with string array argument works', ->
  roundTripMessage [[{type:"string", value:"hello"},
                     {type:"string", value:"goodbye"}]]

test 'toOscMessage with multi-type array argument works', ->
  roundTripMessage [[{type:"string", value:"hello"},
                     {type:"integer", value:7}]]

test 'toOscMessage with nested array argument works', ->
  roundTripMessage [[{type:"array", value:[{type:"string", value:"hello"}]}]]

buffeq = (buff, exp_buff) ->
  assert.strictEqual buff.length, exp_buff.length
  for i in [0...exp_buff.length]
    assert.equal buff[i], exp_buff[i]

test 'toOscMessage with bad layout works', ->
  oscMessage = {
    address : "/addr"
    args : [
      "strr"
    ]
  }
  roundTrip = osc.fromOscMessage (osc.toOscMessage oscMessage), true
  assert.strictEqual roundTrip?.address, "/addr"
  assert.strictEqual roundTrip?.args?.length, 1
  assert.strictEqual roundTrip?.args?[0]?.value, "strr"

test 'toOscMessage with single numeric argument works', ->
  oscMessage = {
    address : "/addr"
    args : 13
  }
  roundTrip = osc.fromOscMessage (osc.toOscMessage oscMessage)
  assert.strictEqual roundTrip?.address, "/addr"
  assert.strictEqual roundTrip?.args?.length, 1
  assert.strictEqual roundTrip?.args?[0]?.value, 13
  assert.strictEqual roundTrip?.args?[0]?.type, "float"

test 'toOscMessage with args shortcut works', ->
  oscMessage = {
    address : "/addr"
    args : 13
  }
  roundTrip = osc.fromOscMessage (osc.toOscMessage oscMessage)
  assert.strictEqual roundTrip?.address, "/addr"
  assert.strictEqual roundTrip?.args?.length, 1
  assert.strictEqual roundTrip?.args?[0]?.value, 13
  assert.strictEqual roundTrip?.args?[0]?.type, "float"

test 'toOscMessage with single blob argument works', ->
  buff = new Buffer 18
  oscMessage = {
    address : "/addr"
    args : buff
  }
  roundTrip = osc.fromOscMessage (osc.toOscMessage oscMessage)
  assert.strictEqual roundTrip?.address, "/addr"
  assert.strictEqual roundTrip?.args?.length, 1
  buffeq roundTrip?.args?[0]?.value, buff
  assert.strictEqual roundTrip?.args?[0]?.type, "blob"

test 'toOscMessage with single string argument works', ->
  oscMessage = {
    address : "/addr"
    args : "strr"
  }
  roundTrip = osc.fromOscMessage (osc.toOscMessage oscMessage)
  assert.strictEqual roundTrip?.address, "/addr"
  assert.strictEqual roundTrip?.args?.length, 1
  assert.strictEqual roundTrip?.args?[0]?.value, "strr"
  assert.strictEqual roundTrip?.args?[0]?.type, "string"

test 'toOscMessage with integer argument works', ->
  roundTripMessage [8]

test 'toOscMessage with buffer argument works', ->
  # buffer will have random contents, but that's okay.
  roundTripMessage [new Buffer 16]

test 'toOscMessage strict with type true and value false throws', ->
  assert.throws -> osc.toOscMessage {address: "/addr/", args: {type : "true", value : false}}, true

test 'toOscMessage strict with type false with value true throws', ->
  assert.throws -> osc.toOscMessage {address: "/addr/", args: {type : "false", value : true}}, true

test 'toOscMessage with type true works', ->
  roundTrip = osc.fromOscMessage osc.toOscMessage {address: "/addr", args : true}
  assert.strictEqual roundTrip.args.length, 1
  assert.strictEqual roundTrip.args[0].value, true
  assert.strictEqual roundTrip.args[0].type, "true"

test 'toOscMessage with type false works', ->
  roundTrip = osc.fromOscMessage osc.toOscMessage {address: "/addr", args : false}
  assert.strictEqual roundTrip.args.length, 1
  assert.strictEqual roundTrip.args[0].value, false
  assert.strictEqual roundTrip.args[0].type, "false"

test 'toOscMessage with type bang argument works', ->
  roundTrip = osc.fromOscMessage osc.toOscMessage {address: "/addr", args : {type:"bang"}}
  assert.strictEqual roundTrip.args.length, 1
  assert.strictEqual roundTrip.args[0].value, "bang"
  assert.strictEqual roundTrip.args[0].type, "bang"

test 'toOscMessage with type timetag argument works', ->
  roundTripMessage [{type: "timetag", value: [8888, 9999]}]

test 'toOscMessage with type double argument works', ->
  roundTripMessage [{type: "double", value: 8888}]

test 'toOscMessage strict with type null with value true throws', ->
  assert.throws -> osc.toOscMessage({address: "/addr/", args: {type : "null", value : true}}, true)

test 'toOscMessage with type null works', ->
  roundTrip = osc.fromOscMessage osc.toOscMessage {address: "/addr", args : null}
  assert.strictEqual roundTrip.args.length, 1
  assert.strictEqual roundTrip.args[0].value, null
  assert.strictEqual roundTrip.args[0].type, "null"

test 'toOscMessage with float argument works', ->
  roundTripMessage [{value : 6, type : "float"}]

test 'toOscMessage just a string works', ->
  message = osc.fromOscMessage osc.toOscMessage "bleh"
  assert.strictEqual message.address, "bleh"
  assert.strictEqual message.args.length, 0

test 'toOscMessage with multiple args works', ->
  roundTripMessage ["str", 7, (new Buffer 30), 6]

test 'toOscMessage with integer argument works', ->
  roundTripMessage [{value : 7, type: "integer"}]

test 'toOscMessage fails with no address', ->
  assert.throws -> osc.toOscMessage {args : []}

toOscMessageThrowsHelper = (arg) ->
  assert.throws -> osc.toOscMessage(
    address : "/addr"
    args : [arg]
  )

test 'toOscMessage fails when string type is specified but wrong', ->
  toOscMessageThrowsHelper(
    value : 7
    type : "string"
  )

test 'toOscMessage fails when integer type is specified but wrong', ->
  toOscMessageThrowsHelper(
    value : "blah blah"
    type : "integer"
  )

test 'toOscMessage fails when float type is specified but wrong', ->
  toOscMessageThrowsHelper(
    value : "blah blah"
    type : "float"
  )

test 'toOscMessage fails when timetag type is specified but wrong', ->
  toOscMessageThrowsHelper(
    value : "blah blah"
    type : "timetag"
  )

test 'toOscMessage fails when double type is specified but wrong', ->
  toOscMessageThrowsHelper(
    value : "blah blah"
    type : "double"
  )

test 'toOscMessage fails when blob type is specified but wrong', ->
  toOscMessageThrowsHelper(
    value : "blah blah"
    type : "blob"
  )

test 'toOscMessage fails argument is a random type', ->
  toOscMessageThrowsHelper(
    random_field : 42
    "is pretty random" : 888
  )

roundTripBundle = (elems) ->
  oscMessage = {
    timetag : [0, 0]
    elements : elems
  }
  roundTrip = osc.fromOscBundle (osc.toOscBundle oscMessage), true
  assert.deepEqual roundTrip?.timetag, [0, 0]
  length = if typeof elems is "object" then elems.length else 1
  assert.strictEqual roundTrip?.elements?.length, length
  for i in [0...length]
    if typeof elems is "object"
      assert.deepEqual roundTrip?.elements?[i]?.timetag, elems[i].timetag
      assert.strictEqual roundTrip?.elements?[i]?.address, elems[i].address
    else
      assert.strictEqual roundTrip?.elements?[i]?.address, elems

test 'toOscBundle with no elements works', ->
  roundTripBundle []

test 'toOscBundle with just a string works', ->
  roundTripBundle "/address"

test 'toOscBundle with just a number fails', ->
  assert.throws -> roundTripBundle 78

test 'toOscBundle with one message works', ->
  roundTripBundle [{address : "/addr"}]

test 'toOscBundle with nested bundles works', ->
  roundTripBundle [{address : "/addr"}, {timetag : [8888, 9999]}]

test 'toOscBundle with bogus packets works', ->
  roundTrip = osc.fromOscBundle osc.toOscBundle {
    timetag : [0, 0]
    elements : [{timetag : [0, 0]}, {maddress : "/addr"}]
  }
  assert.strictEqual roundTrip.elements.length, 1
  assert.deepEqual roundTrip.elements[0].timetag, [0, 0]

test 'toOscBundle strict fails without timetags', ->
  assert.throws -> osc.toOscBundle {elements :[]}, true

test 'identity applyTransform works with single message', ->
  testBuffer = osc.toOscString "/message"
  assert.strictEqual (osc.applyTransform testBuffer, (a) -> a), testBuffer

test 'nullary applyTransform works with single message', ->
  testBuffer = osc.toOscString "/message"
  assert.strictEqual (osc.applyTransform testBuffer, (a) -> new Buffer 0).length, 0

test 'toOscPacket works when explicitly set to bundle', ->
  roundTrip = osc.fromOscBundle osc.toOscPacket {timetag: 0, oscType:"bundle", elements :[]}, true
  assert.strictEqual roundTrip.elements.length, 0

test 'toOscPacket works when explicitly set to message', ->
  roundTrip = osc.fromOscPacket osc.toOscPacket {address: "/bleh", oscType:"message", args :[]}, true
  assert.strictEqual roundTrip.args.length, 0
  assert.strictEqual roundTrip.address, "/bleh"

test 'identity applyTransform works with a simple bundle', ->
  base = {
    timetag : [0, 0]
    elements : [
      {address : "test1"}
      {address : "test2"}
    ]
  }
  transformed = osc.fromOscPacket (osc.applyTransform (osc.toOscPacket base), (a) -> a)

  assert.deepEqual transformed?.timetag, [0, 0]
  assert.strictEqual transformed?.elements?.length, base.elements.length
  for i in [0...base.elements.length]
    assert.equal transformed?.elements?[i]?.timetag, base.elements[i].timetag
    assert.strictEqual transformed?.elements?[i]?.address, base.elements[i].address

test 'applyMessageTranformerToBundle fails on bundle without tag', ->
  func = osc.applyMessageTranformerToBundle ((a) -> a)
  assert.throws -> func osc.concat [osc.toOscString "#grundle", osc.toIntegerBuffer 0, "Int64"]

test 'addressTransform works with identity', ->
  testBuffer = osc.concat [
    osc.toOscString "/message"
    new Buffer "gobblegobblewillsnever\u0000parse blah lbha"
  ]
  transformed = osc.applyTransform testBuffer, osc.addressTransform((a) -> a)
  for i in [0...testBuffer.length]
    assert.equal transformed[i], testBuffer[i]


test 'addressTransform works with bundles', ->
  base = {
    timetag : [0, 0]
    elements : [
      {address : "test1"}
      {address : "test2"}
    ]
  }
  transformed = osc.fromOscPacket (osc.applyTransform (osc.toOscPacket base), osc.addressTransform((a) -> "/prelude/" + a))

  assert.deepEqual transformed?.timetag, [0, 0]
  assert.strictEqual transformed?.elements?.length, base.elements.length
  for i in [0...base.elements.length]
    assert.equal transformed?.elements?[i]?.timetag, base.elements[i].timetag
    assert.strictEqual transformed?.elements?[i]?.address, "/prelude/" + base.elements[i].address

test 'messageTransform works with identity function for single message', ->
  message =
    address: "/addr"
    args: []
  buff = osc.toOscPacket message
  buffeq (osc.applyTransform buff, osc.messageTransform (a) -> a), buff


test 'messageTransform works with bundles', ->
  message = {
    timetag : [0, 0]
    elements : [
      {address : "test1"}
      {address : "test2"}
    ]
  }
  buff = osc.toOscPacket message
  buffeq (osc.applyTransform buff, osc.messageTransform (a) -> a), buff

test 'toTimetagBuffer works with a delta number', ->
  delta = 1.2345
  buf = osc.toTimetagBuffer delta

# assert dates are equal to within floating point conversion error
assertDatesEqual = (date1, date2) ->
  assert Math.abs(date1.getTime() - date2.getTime()) <= 1, '' + date1 + ' != ' + date2

test 'toTimetagBuffer works with a Date', ->
  date = new Date()
  buf = osc.toTimetagBuffer date

test 'toTimetagBuffer works with a timetag array', ->
  timetag = [1000, 10001]
  buf = osc.toTimetagBuffer timetag

test 'toTimetagBuffer throws with invalid', ->
  assert.throws -> osc.toTimetagBuffer "some bullshit"

test 'deltaTimetag makes array from a delta', ->
  delta = 1.2345
  ntp = osc.deltaTimetag(delta)

test 'timetagToDate converts timetag to a Date', ->
  date = new Date()
  timetag = osc.dateToTimetag(date)
  date2 = osc.timetagToDate(timetag)
  assertDatesEqual date, date2

test 'timestampToTimetag converts a unix time to ntp array', ->
  date = new Date()
  timetag = osc.timestampToTimetag(date.getTime() / 1000)
  date2 = osc.timetagToDate(timetag)
  assertDatesEqual date, date2

test 'dateToTimetag converts date to ntp array', ->
  date = new Date()
  timetag = osc.dateToTimetag(date)
  date2 = osc.timetagToDate(timetag)
  assertDatesEqual date, date2

test 'timestamp <-> timeTag round trip', ->
  now = (new Date()).getTime() / 1000
  near = (a, b) -> Math.abs(a - b) < 1e-6
  assert near(osc.timetagToTimestamp(osc.timestampToTimetag(now)), now)

test 'splitTimetag returns timetag from a buffer', ->
  timetag = [1000, 1001]
  rest = "the rest"
  buf = osc.concat [
    osc.toTimetagBuffer(timetag),
    new Buffer(rest)
  ]
  {timetag: timetag2, rest: rest2} = osc.splitTimetag buf
  assert.deepEqual timetag2, timetag
