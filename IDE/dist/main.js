"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var express = require("express");
var http = require("http");
var child_process = require("child_process");
var socket_manager = require("./SocketManager");
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1haW4udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSxpQ0FBbUM7QUFDbkMsMkJBQTZCO0FBQzdCLDZDQUErQztBQUMvQyxnREFBa0Q7QUFFbEQsd0RBQXdEO0FBQ3hELElBQU0sR0FBRyxHQUF3QixPQUFPLEVBQUUsQ0FBQztBQUMzQyxJQUFNLE1BQU0sR0FBZ0IsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQ2pELEdBQUcsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO0FBRWxDO0lBQ0MsT0FBTyxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQztJQUU1QixtQ0FBbUM7SUFDbkMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEVBQUUsY0FBTSxPQUFBLE9BQU8sQ0FBQyxHQUFHLENBQUMsbUJBQW1CLEVBQUUsRUFBRSxDQUFDLEVBQXBDLENBQW9DLENBQUUsQ0FBQztJQUUvRCx1QkFBdUI7SUFDdkIsY0FBYyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUM3QixDQUFDO0FBUkQsb0JBUUM7QUFFRDtJQUNDLE9BQU8sSUFBSSxPQUFPLENBQUMsVUFBUyxPQUFPLEVBQUUsTUFBTTtRQUMxQyxhQUFhLENBQUMsSUFBSSxDQUFDLHdDQUF3QyxFQUFFLFVBQUMsR0FBRyxFQUFFLE1BQU0sRUFBRSxNQUFNO1lBQ2hGLElBQUksR0FBRyxFQUFDO2dCQUNQLE9BQU8sQ0FBQyxHQUFHLENBQUMsK0JBQStCLENBQUMsQ0FBQztnQkFDN0MsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO2FBQ1o7WUFDRCxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDakIsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztBQUNKLENBQUM7QUFWRCxrREFVQztBQUVELGtCQUF5QixJQUFZO0lBQ3BDLGFBQWEsQ0FBQyxJQUFJLENBQUMsV0FBVyxHQUFDLElBQUksR0FBQyxHQUFHLEVBQUUsVUFBQyxHQUFHLEVBQUUsTUFBTSxFQUFFLE1BQU07UUFDNUQsSUFBSSxHQUFHLElBQUksTUFBTSxFQUFDO1lBQ2pCLE9BQU8sQ0FBQyxHQUFHLENBQUMsb0JBQW9CLEVBQUUsR0FBRyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1NBQy9DO2FBQU07WUFDTixPQUFPLENBQUMsR0FBRyxDQUFDLGNBQWMsRUFBRSxNQUFNLENBQUMsQ0FBQztTQUNwQztJQUNGLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQztBQVJELDRCQVFDIiwiZmlsZSI6Im1haW4uanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBleHByZXNzIGZyb20gJ2V4cHJlc3MnO1xuaW1wb3J0ICogYXMgaHR0cCBmcm9tICdodHRwJztcbmltcG9ydCAqIGFzIGNoaWxkX3Byb2Nlc3MgZnJvbSAnY2hpbGRfcHJvY2Vzcyc7XG5pbXBvcnQgKiBhcyBzb2NrZXRfbWFuYWdlciBmcm9tICcuL1NvY2tldE1hbmFnZXInO1xuXG4vLyBzZXR1cCB3ZWJzZXJ2ZXIgdG8gc2VydmUgZmlsZXMgZnJvbSB+L0JlbGEvSURFL3B1YmxpY1xuY29uc3QgYXBwOiBleHByZXNzLkFwcGxpY2F0aW9uID0gZXhwcmVzcygpO1xuY29uc3Qgc2VydmVyOiBodHRwLlNlcnZlciA9IG5ldyBodHRwLlNlcnZlcihhcHApO1xuYXBwLnVzZShleHByZXNzLnN0YXRpYygncHVibGljJykpO1xuXG5leHBvcnQgZnVuY3Rpb24gaW5pdCgpe1xuXHRjb25zb2xlLmxvZygnc3RhcnRpbmcgSURFJyk7XG5cblx0Ly8gc3RhcnQgc2VydmluZyB0aGUgSURFIG9uIHBvcnQgODBcblx0c2VydmVyLmxpc3Rlbig4MCwgKCkgPT4gY29uc29sZS5sb2coJ2xpc3RlbmluZyBvbiBwb3J0JywgODApICk7XG5cblx0Ly8gaW5pdGlhbGlzZSB3ZWJzb2NrZXRcblx0c29ja2V0X21hbmFnZXIuaW5pdChzZXJ2ZXIpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0X3hlbm9tYWlfdmVyc2lvbigpOiBQcm9taXNlPHN0cmluZz57XG5cdHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3Qpe1xuXHRcdGNoaWxkX3Byb2Nlc3MuZXhlYygnL3Vzci94ZW5vbWFpL2Jpbi94ZW5vLWNvbmZpZyAtLXZlcnNpb24nLCAoZXJyLCBzdGRvdXQsIHN0ZGVycikgPT4ge1xuXHRcdFx0aWYgKGVycil7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdlcnJvciByZWFkaW5nIHhlbm9tYWkgdmVyc2lvbicpO1xuXHRcdFx0XHRyZWplY3QoZXJyKTtcblx0XHRcdH1cblx0XHRcdHJlc29sdmUoc3Rkb3V0KTtcblx0XHR9KTtcblx0fSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzZXRfdGltZSh0aW1lOiBzdHJpbmcpe1xuXHRjaGlsZF9wcm9jZXNzLmV4ZWMoJ2RhdGUgLXMgXCInK3RpbWUrJ1wiJywgKGVyciwgc3Rkb3V0LCBzdGRlcnIpID0+IHtcblx0XHRpZiAoZXJyIHx8IHN0ZGVycil7XG5cdFx0XHRjb25zb2xlLmxvZygnZXJyb3Igc2V0dGluZyB0aW1lJywgZXJyLCBzdGRlcnIpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRjb25zb2xlLmxvZygndGltZSBzZXQgdG86Jywgc3Rkb3V0KTtcblx0XHR9XG5cdH0pO1xufVxuIl19
