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
function shutdown() {
    child_process.exec('shutdown -h now', function (err, stdout, stderr) { return console.log('shutting down', err, stdout, stderr); });
}
exports.shutdown = shutdown;
process.on('warning', function (e) { return console.warn(e.stack); });
/*process.on('uncaughtException', err => {
    console.log('uncaught exception');
    throw err;
});
process.on('SIGTERM', () => {
    console.log('SIGTERM');
    throw new Error('SIGTERM');
});*/

//# sourceMappingURL=data:application/json;charset=utf8;base64,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QUVEO0lBQ0MsYUFBYSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxVQUFDLEdBQUcsRUFBRSxNQUFNLEVBQUUsTUFBTSxJQUFLLE9BQUEsT0FBTyxDQUFDLEdBQUcsQ0FBQyxlQUFlLEVBQUUsR0FBRyxFQUFFLE1BQU0sRUFBRSxNQUFNLENBQUMsRUFBakQsQ0FBaUQsQ0FBRSxDQUFDO0FBQ3BILENBQUM7QUFGRCw0QkFFQztBQUVELE9BQU8sQ0FBQyxFQUFFLENBQUMsU0FBUyxFQUFFLFVBQUEsQ0FBQyxJQUFJLE9BQUEsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQXJCLENBQXFCLENBQUMsQ0FBQztBQUNsRDs7Ozs7OztLQU9LIiwiZmlsZSI6Im1haW4uanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBleHByZXNzIGZyb20gJ2V4cHJlc3MnO1xuaW1wb3J0ICogYXMgaHR0cCBmcm9tICdodHRwJztcbmltcG9ydCAqIGFzIGNoaWxkX3Byb2Nlc3MgZnJvbSAnY2hpbGRfcHJvY2Vzcyc7XG5pbXBvcnQgKiBhcyBzb2NrZXRfbWFuYWdlciBmcm9tICcuL1NvY2tldE1hbmFnZXInO1xuaW1wb3J0ICogYXMgcGF0aHMgZnJvbSAnLi9wYXRocyc7XG5pbXBvcnQgKiBhcyByb3V0ZXMgZnJvbSAnLi9Sb3V0ZU1hbmFnZXInO1xudmFyIFRlcm1pbmFsTWFuYWdlciA9IHJlcXVpcmUoJy4vVGVybWluYWxNYW5hZ2VyJyk7XG5cbmV4cG9ydCBmdW5jdGlvbiBpbml0KCl7XG5cdGNvbnNvbGUubG9nKCdzdGFydGluZyBJREUnKTtcblxuXHQvLyBzZXR1cCB3ZWJzZXJ2ZXIgXG5cdGNvbnN0IGFwcDogZXhwcmVzcy5BcHBsaWNhdGlvbiA9IGV4cHJlc3MoKTtcblx0Y29uc3Qgc2VydmVyOiBodHRwLlNlcnZlciA9IG5ldyBodHRwLlNlcnZlcihhcHApO1xuXHRzZXR1cF9yb3V0ZXMoYXBwKTtcblxuXHQvLyBzdGFydCBzZXJ2aW5nIHRoZSBJREUgb24gcG9ydCA4MFxuXHRzZXJ2ZXIubGlzdGVuKDgwLCAoKSA9PiBjb25zb2xlLmxvZygnbGlzdGVuaW5nIG9uIHBvcnQnLCA4MCkgKTtcblxuXHQvLyBpbml0aWFsaXNlIHdlYnNvY2tldFxuXHRzb2NrZXRfbWFuYWdlci5pbml0KHNlcnZlcik7XG5cblx0VGVybWluYWxNYW5hZ2VyLmluaXQoKTtcbn1cblxuZnVuY3Rpb24gc2V0dXBfcm91dGVzKGFwcDogZXhwcmVzcy5BcHBsaWNhdGlvbil7XG5cdC8vIHN0YXRpYyBwYXRoc1xuXHRhcHAudXNlKGV4cHJlc3Muc3RhdGljKHBhdGhzLndlYnNlcnZlcl9yb290KSk7IC8vIGFsbCBmaWxlcyBpbiB0aGlzIGRpcmVjdG9yeSBhcmUgc2VydmVkIHRvIGJlbGEubG9jYWwvXG5cdGFwcC51c2UoJy9kb2N1bWVudGF0aW9uJywgZXhwcmVzcy5zdGF0aWMocGF0aHMuQmVsYSsnRG9jdW1lbnRhdGlvbi9odG1sJykpO1xuXG5cdC8vIGFqYXggcm91dGVzXG5cdC8vIGZpbGUgYW5kIHByb2plY3QgZG93bmxvYWRzXG5cdGFwcC5nZXQoJy9kb3dubG9hZCcsIHJvdXRlcy5kb3dubG9hZCk7XG5cdC8vIGRveHlnZW4geG1sXG5cdGFwcC5nZXQoJy9kb2N1bWVudGF0aW9uX3htbCcsIHJvdXRlcy5kb3h5Z2VuKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldF94ZW5vbWFpX3ZlcnNpb24oKTogUHJvbWlzZTxzdHJpbmc+e1xuXHRyZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KXtcblx0XHRjaGlsZF9wcm9jZXNzLmV4ZWMoJy91c3IveGVub21haS9iaW4veGVuby1jb25maWcgLS12ZXJzaW9uJywgKGVyciwgc3Rkb3V0LCBzdGRlcnIpID0+IHtcblx0XHRcdGlmIChlcnIpe1xuXHRcdFx0XHRjb25zb2xlLmxvZygnZXJyb3IgcmVhZGluZyB4ZW5vbWFpIHZlcnNpb24nKTtcblx0XHRcdFx0cmVqZWN0KGVycik7XG5cdFx0XHR9XG5cdFx0XHRpZiAoc3Rkb3V0LmluY2x1ZGVzKCcyLjYnKSl7XG5cdFx0XHRcdHBhdGhzLnNldF94ZW5vbWFpX3N0YXQoJy9wcm9jL3hlbm9tYWkvc3RhdCcpO1xuXHRcdFx0fSBlbHNlIGlmIChzdGRvdXQuaW5jbHVkZXMoJzMuMCcpKXtcblx0XHRcdFx0cGF0aHMuc2V0X3hlbm9tYWlfc3RhdCgnL3Byb2MveGVub21haS9zY2hlZC9zdGF0Jyk7XG5cdFx0XHR9XG5cdFx0XHRyZXNvbHZlKHN0ZG91dCk7XG5cdFx0fSk7XG5cdH0pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc2V0X3RpbWUodGltZTogc3RyaW5nKXtcblx0Y2hpbGRfcHJvY2Vzcy5leGVjKCdkYXRlIC1zIFwiJyt0aW1lKydcIicsIChlcnIsIHN0ZG91dCwgc3RkZXJyKSA9PiB7XG5cdFx0aWYgKGVyciB8fCBzdGRlcnIpe1xuXHRcdFx0Y29uc29sZS5sb2coJ2Vycm9yIHNldHRpbmcgdGltZScsIGVyciwgc3RkZXJyKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0Y29uc29sZS5sb2coJ3RpbWUgc2V0IHRvOicsIHN0ZG91dCk7XG5cdFx0fVxuXHR9KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNodXRkb3duKCl7XG5cdGNoaWxkX3Byb2Nlc3MuZXhlYygnc2h1dGRvd24gLWggbm93JywgKGVyciwgc3Rkb3V0LCBzdGRlcnIpID0+IGNvbnNvbGUubG9nKCdzaHV0dGluZyBkb3duJywgZXJyLCBzdGRvdXQsIHN0ZGVycikgKTtcbn1cblxucHJvY2Vzcy5vbignd2FybmluZycsIGUgPT4gY29uc29sZS53YXJuKGUuc3RhY2spKTtcbi8qcHJvY2Vzcy5vbigndW5jYXVnaHRFeGNlcHRpb24nLCBlcnIgPT4ge1xuXHRjb25zb2xlLmxvZygndW5jYXVnaHQgZXhjZXB0aW9uJyk7XG5cdHRocm93IGVycjtcbn0pO1xucHJvY2Vzcy5vbignU0lHVEVSTScsICgpID0+IHtcblx0Y29uc29sZS5sb2coJ1NJR1RFUk0nKTtcblx0dGhyb3cgbmV3IEVycm9yKCdTSUdURVJNJyk7XG59KTsqL1xuIl19
