fs = require 'fs'
child = require 'child_process'

task 'test', 'run tests (requires development install)', (options) ->
  process.env['NODE_PATH'] = './lib/:$NODE_PATH'
  test = child.spawn 'mocha', ['--compilers', 'coffee:coffee-script/register', '-u', 'tdd', 'test']
  test.stdout.pipe process.stdout
  test.stderr.pipe process.stderr
  test.on 'exit', (num) ->
    return process.exit num

spawnMochaCov = (reporter) ->
  return child.spawn 'mocha', ['--compilers', 'coffee:coffee-script/register', '-r', 'blanket', '-R', reporter, '-u', 'tdd', 'test']

task 'coverage', 'run tests with coverage check (requires development install)', (options) ->
  process.env['NODE_PATH'] = './lib/:$NODE_PATH'
  test = spawnMochaCov 'html-cov'
  file = fs.createWriteStream 'coverage.html'
  test.stdout.pipe file
  test.stderr.pipe process.stderr
  test.on 'exit', (num) ->
    child.exec 'open ./coverage.html'

task 'coveralls', 'report coveralls to travis', (options) ->
  process.env['NODE_PATH'] = './lib/:$NODE_PATH'
  test = spawnMochaCov 'mocha-lcov-reporter'
  report = child.spawn './node_modules/coveralls/bin/coveralls.js'
  test.stdout.pipe report.stdin
  test.stderr.pipe process.stderr

task 'doc', 'create md and html doc files', (options) ->
  child.exec 'coffee -b -c examples/*', ->
    child.exec 'docket lib/* examples/* -m', ->
      child.exec 'docket lib/* examples/* -d doc_html'

task 'browserify', 'build for a browser', (options)->
  fs.mkdir './build', ->
    child.exec './node_modules/browserify/bin/cmd.js ./lib/index.js --standalone osc -o ./build/osc-min.js', ->
      child.exec './node_modules/uglify-js/bin/uglifyjs -o ./build/osc-min.min.js ./build/osc-min.js'
