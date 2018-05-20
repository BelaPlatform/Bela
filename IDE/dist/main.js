"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var express = require("express");
var http = require("http");
var child_process = require("child_process");
var socket_manager = require("./SocketManager");
var paths = require("./paths");
var routes = require("./RouteManager");
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,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eHByZXNzJztcbmltcG9ydCAqIGFzIGh0dHAgZnJvbSAnaHR0cCc7XG5pbXBvcnQgKiBhcyBjaGlsZF9wcm9jZXNzIGZyb20gJ2NoaWxkX3Byb2Nlc3MnO1xuaW1wb3J0ICogYXMgc29ja2V0X21hbmFnZXIgZnJvbSAnLi9Tb2NrZXRNYW5hZ2VyJztcbmltcG9ydCAqIGFzIHBhdGhzIGZyb20gJy4vcGF0aHMnO1xuaW1wb3J0ICogYXMgcm91dGVzIGZyb20gJy4vUm91dGVNYW5hZ2VyJztcblxuZXhwb3J0IGZ1bmN0aW9uIGluaXQoKXtcblx0Y29uc29sZS5sb2coJ3N0YXJ0aW5nIElERScpO1xuXG5cdC8vIHNldHVwIHdlYnNlcnZlciBcblx0Y29uc3QgYXBwOiBleHByZXNzLkFwcGxpY2F0aW9uID0gZXhwcmVzcygpO1xuXHRjb25zdCBzZXJ2ZXI6IGh0dHAuU2VydmVyID0gbmV3IGh0dHAuU2VydmVyKGFwcCk7XG5cdHNldHVwX3JvdXRlcyhhcHApO1xuXG5cdC8vIHN0YXJ0IHNlcnZpbmcgdGhlIElERSBvbiBwb3J0IDgwXG5cdHNlcnZlci5saXN0ZW4oODAsICgpID0+IGNvbnNvbGUubG9nKCdsaXN0ZW5pbmcgb24gcG9ydCcsIDgwKSApO1xuXG5cdC8vIGluaXRpYWxpc2Ugd2Vic29ja2V0XG5cdHNvY2tldF9tYW5hZ2VyLmluaXQoc2VydmVyKTtcbn1cblxuZnVuY3Rpb24gc2V0dXBfcm91dGVzKGFwcDogZXhwcmVzcy5BcHBsaWNhdGlvbil7XG5cdC8vIHN0YXRpYyBwYXRoc1xuXHRhcHAudXNlKGV4cHJlc3Muc3RhdGljKHBhdGhzLndlYnNlcnZlcl9yb290KSk7IC8vIGFsbCBmaWxlcyBpbiB0aGlzIGRpcmVjdG9yeSBhcmUgc2VydmVkIHRvIGJlbGEubG9jYWwvXG5cdGFwcC51c2UoJy9kb2N1bWVudGF0aW9uJywgZXhwcmVzcy5zdGF0aWMocGF0aHMuQmVsYSsnRG9jdW1lbnRhdGlvbi9odG1sJykpO1xuXG5cdC8vIGFqYXggcm91dGVzXG5cdC8vIGZpbGUgYW5kIHByb2plY3QgZG93bmxvYWRzXG5cdGFwcC5nZXQoJy9kb3dubG9hZCcsIHJvdXRlcy5kb3dubG9hZCk7XG5cdC8vIGRveHlnZW4geG1sXG5cdGFwcC5nZXQoJy9kb2N1bWVudGF0aW9uX3htbCcsIHJvdXRlcy5kb3h5Z2VuKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldF94ZW5vbWFpX3ZlcnNpb24oKTogUHJvbWlzZTxzdHJpbmc+e1xuXHRyZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KXtcblx0XHRjaGlsZF9wcm9jZXNzLmV4ZWMoJy91c3IveGVub21haS9iaW4veGVuby1jb25maWcgLS12ZXJzaW9uJywgKGVyciwgc3Rkb3V0LCBzdGRlcnIpID0+IHtcblx0XHRcdGlmIChlcnIpe1xuXHRcdFx0XHRjb25zb2xlLmxvZygnZXJyb3IgcmVhZGluZyB4ZW5vbWFpIHZlcnNpb24nKTtcblx0XHRcdFx0cmVqZWN0KGVycik7XG5cdFx0XHR9XG5cdFx0XHRpZiAoc3Rkb3V0LmluY2x1ZGVzKCcyLjYnKSl7XG5cdFx0XHRcdHBhdGhzLnNldF94ZW5vbWFpX3N0YXQoJy9wcm9jL3hlbm9tYWkvc3RhdCcpO1xuXHRcdFx0fSBlbHNlIGlmIChzdGRvdXQuaW5jbHVkZXMoJzMuMCcpKXtcblx0XHRcdFx0cGF0aHMuc2V0X3hlbm9tYWlfc3RhdCgnL3Byb2MveGVub21haS9zY2hlZC9zdGF0Jyk7XG5cdFx0XHR9XG5cdFx0XHRyZXNvbHZlKHN0ZG91dCk7XG5cdFx0fSk7XG5cdH0pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc2V0X3RpbWUodGltZTogc3RyaW5nKXtcblx0Y2hpbGRfcHJvY2Vzcy5leGVjKCdkYXRlIC1zIFwiJyt0aW1lKydcIicsIChlcnIsIHN0ZG91dCwgc3RkZXJyKSA9PiB7XG5cdFx0aWYgKGVyciB8fCBzdGRlcnIpe1xuXHRcdFx0Y29uc29sZS5sb2coJ2Vycm9yIHNldHRpbmcgdGltZScsIGVyciwgc3RkZXJyKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0Y29uc29sZS5sb2coJ3RpbWUgc2V0IHRvOicsIHN0ZG91dCk7XG5cdFx0fVxuXHR9KTtcbn1cblxuLypwcm9jZXNzLm9uKCd1bmNhdWdodEV4Y2VwdGlvbicsIGVyciA9PiB7XG5cdGNvbnNvbGUubG9nKCd1bmNhdWdodCBleGNlcHRpb24nKTtcblx0dGhyb3cgZXJyO1xufSk7XG5wcm9jZXNzLm9uKCdTSUdURVJNJywgKCkgPT4ge1xuXHRjb25zb2xlLmxvZygnU0lHVEVSTScpO1xuXHR0aHJvdyBuZXcgRXJyb3IoJ1NJR1RFUk0nKTtcbn0pOyovXG4iXX0=
