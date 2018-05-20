"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var express = require("express");
var http = require("http");
var child_process = require("child_process");
var socket_manager = require("./SocketManager");
var paths = require("./paths");
// setup webserver to serve files from ~/Bela/IDE/public
var app = express();
var server = new http.Server(app);
app.use(express.static('public'));
function init() {
    console.log('starting IDE');
    // start serving the IDE on port 80
    server.listen(80, function () { return console.log('listening on port', 80); });
    // initialise websocket
    socket_manager.init(server);
}
exports.init = init;
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1haW4udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSxpQ0FBbUM7QUFDbkMsMkJBQTZCO0FBQzdCLDZDQUErQztBQUMvQyxnREFBa0Q7QUFDbEQsK0JBQWlDO0FBRWpDLHdEQUF3RDtBQUN4RCxJQUFNLEdBQUcsR0FBd0IsT0FBTyxFQUFFLENBQUM7QUFDM0MsSUFBTSxNQUFNLEdBQWdCLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUNqRCxHQUFHLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztBQUVsQztJQUNDLE9BQU8sQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUM7SUFFNUIsbUNBQW1DO0lBQ25DLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxFQUFFLGNBQU0sT0FBQSxPQUFPLENBQUMsR0FBRyxDQUFDLG1CQUFtQixFQUFFLEVBQUUsQ0FBQyxFQUFwQyxDQUFvQyxDQUFFLENBQUM7SUFFL0QsdUJBQXVCO0lBQ3ZCLGNBQWMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDN0IsQ0FBQztBQVJELG9CQVFDO0FBRUQ7SUFDQyxPQUFPLElBQUksT0FBTyxDQUFDLFVBQVMsT0FBTyxFQUFFLE1BQU07UUFDMUMsYUFBYSxDQUFDLElBQUksQ0FBQyx3Q0FBd0MsRUFBRSxVQUFDLEdBQUcsRUFBRSxNQUFNLEVBQUUsTUFBTTtZQUNoRixJQUFJLEdBQUcsRUFBQztnQkFDUCxPQUFPLENBQUMsR0FBRyxDQUFDLCtCQUErQixDQUFDLENBQUM7Z0JBQzdDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQzthQUNaO1lBQ0QsSUFBSSxNQUFNLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxFQUFDO2dCQUMxQixLQUFLLENBQUMsZ0JBQWdCLENBQUMsb0JBQW9CLENBQUMsQ0FBQzthQUM3QztpQkFBTSxJQUFJLE1BQU0sQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEVBQUM7Z0JBQ2pDLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQywwQkFBMEIsQ0FBQyxDQUFDO2FBQ25EO1lBQ0QsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ2pCLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDO0FBZkQsa0RBZUM7QUFFRCxrQkFBeUIsSUFBWTtJQUNwQyxhQUFhLENBQUMsSUFBSSxDQUFDLFdBQVcsR0FBQyxJQUFJLEdBQUMsR0FBRyxFQUFFLFVBQUMsR0FBRyxFQUFFLE1BQU0sRUFBRSxNQUFNO1FBQzVELElBQUksR0FBRyxJQUFJLE1BQU0sRUFBQztZQUNqQixPQUFPLENBQUMsR0FBRyxDQUFDLG9CQUFvQixFQUFFLEdBQUcsRUFBRSxNQUFNLENBQUMsQ0FBQztTQUMvQzthQUFNO1lBQ04sT0FBTyxDQUFDLEdBQUcsQ0FBQyxjQUFjLEVBQUUsTUFBTSxDQUFDLENBQUM7U0FDcEM7SUFDRixDQUFDLENBQUMsQ0FBQztBQUNKLENBQUM7QUFSRCw0QkFRQztBQUVEOzs7Ozs7O0tBT0siLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGV4cHJlc3MgZnJvbSAnZXhwcmVzcyc7XG5pbXBvcnQgKiBhcyBodHRwIGZyb20gJ2h0dHAnO1xuaW1wb3J0ICogYXMgY2hpbGRfcHJvY2VzcyBmcm9tICdjaGlsZF9wcm9jZXNzJztcbmltcG9ydCAqIGFzIHNvY2tldF9tYW5hZ2VyIGZyb20gJy4vU29ja2V0TWFuYWdlcic7XG5pbXBvcnQgKiBhcyBwYXRocyBmcm9tICcuL3BhdGhzJztcblxuLy8gc2V0dXAgd2Vic2VydmVyIHRvIHNlcnZlIGZpbGVzIGZyb20gfi9CZWxhL0lERS9wdWJsaWNcbmNvbnN0IGFwcDogZXhwcmVzcy5BcHBsaWNhdGlvbiA9IGV4cHJlc3MoKTtcbmNvbnN0IHNlcnZlcjogaHR0cC5TZXJ2ZXIgPSBuZXcgaHR0cC5TZXJ2ZXIoYXBwKTtcbmFwcC51c2UoZXhwcmVzcy5zdGF0aWMoJ3B1YmxpYycpKTtcblxuZXhwb3J0IGZ1bmN0aW9uIGluaXQoKXtcblx0Y29uc29sZS5sb2coJ3N0YXJ0aW5nIElERScpO1xuXG5cdC8vIHN0YXJ0IHNlcnZpbmcgdGhlIElERSBvbiBwb3J0IDgwXG5cdHNlcnZlci5saXN0ZW4oODAsICgpID0+IGNvbnNvbGUubG9nKCdsaXN0ZW5pbmcgb24gcG9ydCcsIDgwKSApO1xuXG5cdC8vIGluaXRpYWxpc2Ugd2Vic29ja2V0XG5cdHNvY2tldF9tYW5hZ2VyLmluaXQoc2VydmVyKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldF94ZW5vbWFpX3ZlcnNpb24oKTogUHJvbWlzZTxzdHJpbmc+e1xuXHRyZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KXtcblx0XHRjaGlsZF9wcm9jZXNzLmV4ZWMoJy91c3IveGVub21haS9iaW4veGVuby1jb25maWcgLS12ZXJzaW9uJywgKGVyciwgc3Rkb3V0LCBzdGRlcnIpID0+IHtcblx0XHRcdGlmIChlcnIpe1xuXHRcdFx0XHRjb25zb2xlLmxvZygnZXJyb3IgcmVhZGluZyB4ZW5vbWFpIHZlcnNpb24nKTtcblx0XHRcdFx0cmVqZWN0KGVycik7XG5cdFx0XHR9XG5cdFx0XHRpZiAoc3Rkb3V0LmluY2x1ZGVzKCcyLjYnKSl7XG5cdFx0XHRcdHBhdGhzLnNldF94ZW5vbWFpX3N0YXQoJy9wcm9jL3hlbm9tYWkvc3RhdCcpO1xuXHRcdFx0fSBlbHNlIGlmIChzdGRvdXQuaW5jbHVkZXMoJzMuMCcpKXtcblx0XHRcdFx0cGF0aHMuc2V0X3hlbm9tYWlfc3RhdCgnL3Byb2MveGVub21haS9zY2hlZC9zdGF0Jyk7XG5cdFx0XHR9XG5cdFx0XHRyZXNvbHZlKHN0ZG91dCk7XG5cdFx0fSk7XG5cdH0pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc2V0X3RpbWUodGltZTogc3RyaW5nKXtcblx0Y2hpbGRfcHJvY2Vzcy5leGVjKCdkYXRlIC1zIFwiJyt0aW1lKydcIicsIChlcnIsIHN0ZG91dCwgc3RkZXJyKSA9PiB7XG5cdFx0aWYgKGVyciB8fCBzdGRlcnIpe1xuXHRcdFx0Y29uc29sZS5sb2coJ2Vycm9yIHNldHRpbmcgdGltZScsIGVyciwgc3RkZXJyKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0Y29uc29sZS5sb2coJ3RpbWUgc2V0IHRvOicsIHN0ZG91dCk7XG5cdFx0fVxuXHR9KTtcbn1cblxuLypwcm9jZXNzLm9uKCd1bmNhdWdodEV4Y2VwdGlvbicsIGVyciA9PiB7XG5cdGNvbnNvbGUubG9nKCd1bmNhdWdodCBleGNlcHRpb24nKTtcblx0dGhyb3cgZXJyO1xufSk7XG5wcm9jZXNzLm9uKCdTSUdURVJNJywgKCkgPT4ge1xuXHRjb25zb2xlLmxvZygnU0lHVEVSTScpO1xuXHR0aHJvdyBuZXcgRXJyb3IoJ1NJR1RFUk0nKTtcbn0pOyovXG4iXX0=
