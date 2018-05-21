"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var express = require("express");
var http = require("http");
var child_process = require("child_process");
var socket_manager = require("./SocketManager");
var paths = require("./paths");
var routes = require("./RouteManager");
var TerminalManager = require('./TerminalManager');
function init() {
    console.log('starting IDE');
    // setup webserver 
    var app = express();
    var server = new http.Server(app);
    setup_routes(app);
    // start serving the IDE on port 80
    server.listen(80, function () { return console.log('listening on port', 80); });
    // initialise websocket
    socket_manager.init(server);
    TerminalManager.init();
}
exports.init = init;
function setup_routes(app) {
    // static paths
    app.use(express.static(paths.webserver_root)); // all files in this directory are served to bela.local/
    app.use('/documentation', express.static(paths.Bela + 'Documentation/html'));
    // ajax routes
    // file and project downloads
    app.get('/download', routes.download);
    // doxygen xml
    app.get('/documentation_xml', routes.doxygen);
}
function get_xenomai_version() {
    return new Promise(function (resolve, reject) {
        child_process.exec('/usr/xenomai/bin/xeno-config --version', function (err, stdout, stderr) {
            if (err) {
                console.log('error reading xenomai version');
                reject(err);
            }
            if (stdout.includes('2.6')) {
                paths.set_xenomai_stat('/proc/xenomai/stat');
            }
            else if (stdout.includes('3.0')) {
                paths.set_xenomai_stat('/proc/xenomai/sched/stat');
            }
            resolve(stdout);
        });
    });
}
exports.get_xenomai_version = get_xenomai_version;
function set_time(time) {
    child_process.exec('date -s "' + time + '"', function (err, stdout, stderr) {
        if (err || stderr) {
            console.log('error setting time', err, stderr);
        }
        else {
            console.log('time set to:', stdout);
        }
    });
}
exports.set_time = set_time;
/*process.on('uncaughtException', err => {
    console.log('uncaught exception');
    throw err;
});
process.on('SIGTERM', () => {
    console.log('SIGTERM');
    throw new Error('SIGTERM');
});*/

//# sourceMappingURL=data:application/json;charset=utf8;base64,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QUVEOzs7Ozs7O0tBT0siLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGV4cHJlc3MgZnJvbSAnZXhwcmVzcyc7XG5pbXBvcnQgKiBhcyBodHRwIGZyb20gJ2h0dHAnO1xuaW1wb3J0ICogYXMgY2hpbGRfcHJvY2VzcyBmcm9tICdjaGlsZF9wcm9jZXNzJztcbmltcG9ydCAqIGFzIHNvY2tldF9tYW5hZ2VyIGZyb20gJy4vU29ja2V0TWFuYWdlcic7XG5pbXBvcnQgKiBhcyBwYXRocyBmcm9tICcuL3BhdGhzJztcbmltcG9ydCAqIGFzIHJvdXRlcyBmcm9tICcuL1JvdXRlTWFuYWdlcic7XG52YXIgVGVybWluYWxNYW5hZ2VyID0gcmVxdWlyZSgnLi9UZXJtaW5hbE1hbmFnZXInKTtcblxuZXhwb3J0IGZ1bmN0aW9uIGluaXQoKXtcblx0Y29uc29sZS5sb2coJ3N0YXJ0aW5nIElERScpO1xuXG5cdC8vIHNldHVwIHdlYnNlcnZlciBcblx0Y29uc3QgYXBwOiBleHByZXNzLkFwcGxpY2F0aW9uID0gZXhwcmVzcygpO1xuXHRjb25zdCBzZXJ2ZXI6IGh0dHAuU2VydmVyID0gbmV3IGh0dHAuU2VydmVyKGFwcCk7XG5cdHNldHVwX3JvdXRlcyhhcHApO1xuXG5cdC8vIHN0YXJ0IHNlcnZpbmcgdGhlIElERSBvbiBwb3J0IDgwXG5cdHNlcnZlci5saXN0ZW4oODAsICgpID0+IGNvbnNvbGUubG9nKCdsaXN0ZW5pbmcgb24gcG9ydCcsIDgwKSApO1xuXG5cdC8vIGluaXRpYWxpc2Ugd2Vic29ja2V0XG5cdHNvY2tldF9tYW5hZ2VyLmluaXQoc2VydmVyKTtcblxuXHRUZXJtaW5hbE1hbmFnZXIuaW5pdCgpO1xufVxuXG5mdW5jdGlvbiBzZXR1cF9yb3V0ZXMoYXBwOiBleHByZXNzLkFwcGxpY2F0aW9uKXtcblx0Ly8gc3RhdGljIHBhdGhzXG5cdGFwcC51c2UoZXhwcmVzcy5zdGF0aWMocGF0aHMud2Vic2VydmVyX3Jvb3QpKTsgLy8gYWxsIGZpbGVzIGluIHRoaXMgZGlyZWN0b3J5IGFyZSBzZXJ2ZWQgdG8gYmVsYS5sb2NhbC9cblx0YXBwLnVzZSgnL2RvY3VtZW50YXRpb24nLCBleHByZXNzLnN0YXRpYyhwYXRocy5CZWxhKydEb2N1bWVudGF0aW9uL2h0bWwnKSk7XG5cblx0Ly8gYWpheCByb3V0ZXNcblx0Ly8gZmlsZSBhbmQgcHJvamVjdCBkb3dubG9hZHNcblx0YXBwLmdldCgnL2Rvd25sb2FkJywgcm91dGVzLmRvd25sb2FkKTtcblx0Ly8gZG94eWdlbiB4bWxcblx0YXBwLmdldCgnL2RvY3VtZW50YXRpb25feG1sJywgcm91dGVzLmRveHlnZW4pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0X3hlbm9tYWlfdmVyc2lvbigpOiBQcm9taXNlPHN0cmluZz57XG5cdHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3Qpe1xuXHRcdGNoaWxkX3Byb2Nlc3MuZXhlYygnL3Vzci94ZW5vbWFpL2Jpbi94ZW5vLWNvbmZpZyAtLXZlcnNpb24nLCAoZXJyLCBzdGRvdXQsIHN0ZGVycikgPT4ge1xuXHRcdFx0aWYgKGVycil7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdlcnJvciByZWFkaW5nIHhlbm9tYWkgdmVyc2lvbicpO1xuXHRcdFx0XHRyZWplY3QoZXJyKTtcblx0XHRcdH1cblx0XHRcdGlmIChzdGRvdXQuaW5jbHVkZXMoJzIuNicpKXtcblx0XHRcdFx0cGF0aHMuc2V0X3hlbm9tYWlfc3RhdCgnL3Byb2MveGVub21haS9zdGF0Jyk7XG5cdFx0XHR9IGVsc2UgaWYgKHN0ZG91dC5pbmNsdWRlcygnMy4wJykpe1xuXHRcdFx0XHRwYXRocy5zZXRfeGVub21haV9zdGF0KCcvcHJvYy94ZW5vbWFpL3NjaGVkL3N0YXQnKTtcblx0XHRcdH1cblx0XHRcdHJlc29sdmUoc3Rkb3V0KTtcblx0XHR9KTtcblx0fSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzZXRfdGltZSh0aW1lOiBzdHJpbmcpe1xuXHRjaGlsZF9wcm9jZXNzLmV4ZWMoJ2RhdGUgLXMgXCInK3RpbWUrJ1wiJywgKGVyciwgc3Rkb3V0LCBzdGRlcnIpID0+IHtcblx0XHRpZiAoZXJyIHx8IHN0ZGVycil7XG5cdFx0XHRjb25zb2xlLmxvZygnZXJyb3Igc2V0dGluZyB0aW1lJywgZXJyLCBzdGRlcnIpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRjb25zb2xlLmxvZygndGltZSBzZXQgdG86Jywgc3Rkb3V0KTtcblx0XHR9XG5cdH0pO1xufVxuXG4vKnByb2Nlc3Mub24oJ3VuY2F1Z2h0RXhjZXB0aW9uJywgZXJyID0+IHtcblx0Y29uc29sZS5sb2coJ3VuY2F1Z2h0IGV4Y2VwdGlvbicpO1xuXHR0aHJvdyBlcnI7XG59KTtcbnByb2Nlc3Mub24oJ1NJR1RFUk0nLCAoKSA9PiB7XG5cdGNvbnNvbGUubG9nKCdTSUdURVJNJyk7XG5cdHRocm93IG5ldyBFcnJvcignU0lHVEVSTScpO1xufSk7Ki9cbiJdfQ==
