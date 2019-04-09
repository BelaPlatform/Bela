"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var express = require("express");
var http = require("http");
var child_process = require("child_process");
var socket_manager = require("./SocketManager");
var file_manager = require("./FileManager");
var paths = require("./paths");
var routes = require("./RouteManager");
var path = require("path");
var TerminalManager = require('./TerminalManager');
function init() {
    return __awaiter(this, void 0, void 0, function () {
        var app, server;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log('starting IDE');
                    return [4 /*yield*/, check_lockfile()
                            .catch(function (e) { return console.log('error checking lockfile', e); })];
                case 1:
                    _a.sent();
                    app = express();
                    server = new http.Server(app);
                    setup_routes(app);
                    // start serving the IDE on port 80
                    server.listen(80, function () { return console.log('listening on port', 80); });
                    // initialise websocket
                    socket_manager.init(server);
                    TerminalManager.init();
                    return [2 /*return*/];
            }
        });
    });
}
exports.init = init;
var backup_file_stats = {};
function check_lockfile() {
    return __awaiter(this, void 0, void 0, function () {
        var lockfile_exists, file_path, filename, project_path, tmp_backup_file, backup_file_exists, backup_filename;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, file_manager.file_exists(paths.lockfile)];
                case 1:
                    lockfile_exists = _a.sent();
                    if (!lockfile_exists) {
                        backup_file_stats.exists = false;
                        return [2 /*return*/];
                    }
                    return [4 /*yield*/, file_manager.read_file(paths.lockfile)];
                case 2:
                    file_path = _a.sent();
                    filename = path.basename(file_path);
                    project_path = path.dirname(file_path) + '/';
                    tmp_backup_file = project_path + '.' + filename + '~';
                    return [4 /*yield*/, file_manager.file_exists(tmp_backup_file)];
                case 3:
                    backup_file_exists = _a.sent();
                    if (!backup_file_exists) {
                        backup_file_stats.exists = false;
                        return [2 /*return*/];
                    }
                    backup_filename = filename + '.bak';
                    return [4 /*yield*/, file_manager.copy_file(tmp_backup_file, project_path + backup_filename)];
                case 4:
                    _a.sent();
                    console.log('backup file copied to', project_path + backup_filename);
                    backup_file_stats.exists = true;
                    backup_file_stats.filename = filename;
                    backup_file_stats.backup_filename = backup_filename;
                    backup_file_stats.project = path.basename(project_path);
                    return [4 /*yield*/, file_manager.delete_file(paths.lockfile)];
                case 5:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.check_lockfile = check_lockfile;
function get_backup_file_stats() {
    return backup_file_stats;
}
exports.get_backup_file_stats = get_backup_file_stats;
function setup_routes(app) {
    // static paths
    app.use(express.static(paths.webserver_root)); // all files in this directory are served to bela.local/
    app.use('/documentation', express.static(paths.Bela + 'Documentation/html'));
    // ajax routes
    // file and project downloads
    app.get('/download', routes.download);
    // doxygen xml
    app.get('/documentation_xml', routes.doxygen);
    // gui
    app.use('/gui', express.static(paths.gui));
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
function board_detect() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, new Promise(function (resolve, reject) {
                    child_process.exec('board_detect', function (err, stdout, stderr) {
                        if (err)
                            reject(err);
                        console.log('running on', stdout);
                        resolve(stdout);
                    });
                })];
        });
    });
}
exports.board_detect = board_detect;
process.on('warning', function (e) { return console.warn(e.stack); });
/*process.on('uncaughtException', err => {
    console.log('uncaught exception');
    throw err;
});
process.on('SIGTERM', () => {
    console.log('SIGTERM');
    throw new Error('SIGTERM');
});*/

//# sourceMappingURL=data:application/json;charset=utf8;base64,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QUMsR0FBRyxDQUFDLFlBQVksRUFBRSxNQUFNLENBQUMsQ0FBQzt3QkFDbEMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO29CQUNqQixDQUFDLENBQUMsQ0FBQztnQkFDSixDQUFDLENBQUMsRUFBQzs7O0NBQ0g7QUFSRCxvQ0FRQztBQUVELE9BQU8sQ0FBQyxFQUFFLENBQUMsU0FBUyxFQUFFLFVBQUEsQ0FBQyxJQUFJLE9BQUEsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQXJCLENBQXFCLENBQUMsQ0FBQztBQUNsRDs7Ozs7OztLQU9LIiwiZmlsZSI6Im1haW4uanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBleHByZXNzIGZyb20gJ2V4cHJlc3MnO1xuaW1wb3J0ICogYXMgaHR0cCBmcm9tICdodHRwJztcbmltcG9ydCAqIGFzIGNoaWxkX3Byb2Nlc3MgZnJvbSAnY2hpbGRfcHJvY2Vzcyc7XG5pbXBvcnQgKiBhcyBzb2NrZXRfbWFuYWdlciBmcm9tICcuL1NvY2tldE1hbmFnZXInO1xuaW1wb3J0ICogYXMgZmlsZV9tYW5hZ2VyIGZyb20gJy4vRmlsZU1hbmFnZXInO1xuaW1wb3J0ICogYXMgcGF0aHMgZnJvbSAnLi9wYXRocyc7XG5pbXBvcnQgKiBhcyB1dGlsIGZyb20gJy4vdXRpbHMnO1xuaW1wb3J0ICogYXMgcm91dGVzIGZyb20gJy4vUm91dGVNYW5hZ2VyJztcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG52YXIgVGVybWluYWxNYW5hZ2VyID0gcmVxdWlyZSgnLi9UZXJtaW5hbE1hbmFnZXInKTtcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGluaXQoKXtcblx0Y29uc29sZS5sb2coJ3N0YXJ0aW5nIElERScpO1xuXG5cdGF3YWl0IGNoZWNrX2xvY2tmaWxlKClcblx0XHQuY2F0Y2goIChlOiBFcnJvcikgPT4gY29uc29sZS5sb2coJ2Vycm9yIGNoZWNraW5nIGxvY2tmaWxlJywgZSkgKTtcblxuXHQvLyBzZXR1cCB3ZWJzZXJ2ZXJcblx0Y29uc3QgYXBwOiBleHByZXNzLkFwcGxpY2F0aW9uID0gZXhwcmVzcygpO1xuXHRjb25zdCBzZXJ2ZXI6IGh0dHAuU2VydmVyID0gbmV3IGh0dHAuU2VydmVyKGFwcCk7XG5cdHNldHVwX3JvdXRlcyhhcHApO1xuXG5cdC8vIHN0YXJ0IHNlcnZpbmcgdGhlIElERSBvbiBwb3J0IDgwXG5cdHNlcnZlci5saXN0ZW4oODAsICgpID0+IGNvbnNvbGUubG9nKCdsaXN0ZW5pbmcgb24gcG9ydCcsIDgwKSApO1xuXG5cdC8vIGluaXRpYWxpc2Ugd2Vic29ja2V0XG5cdHNvY2tldF9tYW5hZ2VyLmluaXQoc2VydmVyKTtcblxuXHRUZXJtaW5hbE1hbmFnZXIuaW5pdCgpO1xufVxuXG5sZXQgYmFja3VwX2ZpbGVfc3RhdHM6IHV0aWwuQmFja3VwX0ZpbGVfU3RhdHMgPSB7fTtcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjaGVja19sb2NrZmlsZSgpe1xuXHRsZXQgbG9ja2ZpbGVfZXhpc3RzID0gIGF3YWl0IGZpbGVfbWFuYWdlci5maWxlX2V4aXN0cyhwYXRocy5sb2NrZmlsZSk7XG5cdGlmICghbG9ja2ZpbGVfZXhpc3RzKXtcblx0XHRiYWNrdXBfZmlsZV9zdGF0cy5leGlzdHMgPSBmYWxzZTtcblx0XHRyZXR1cm47XG5cdH1cblx0bGV0IGZpbGVfcGF0aDogc3RyaW5nID0gYXdhaXQgZmlsZV9tYW5hZ2VyLnJlYWRfZmlsZShwYXRocy5sb2NrZmlsZSk7XG5cdGxldCBmaWxlbmFtZTogc3RyaW5nID0gcGF0aC5iYXNlbmFtZShmaWxlX3BhdGgpO1xuXHRsZXQgcHJvamVjdF9wYXRoOiBzdHJpbmcgPSBwYXRoLmRpcm5hbWUoZmlsZV9wYXRoKSsnLyc7XG5cdGxldCB0bXBfYmFja3VwX2ZpbGU6IHN0cmluZyA9IHByb2plY3RfcGF0aCsnLicrZmlsZW5hbWUrJ34nO1xuXHRsZXQgYmFja3VwX2ZpbGVfZXhpc3RzOiBib29sZWFuID0gYXdhaXQgZmlsZV9tYW5hZ2VyLmZpbGVfZXhpc3RzKHRtcF9iYWNrdXBfZmlsZSk7XG5cdGlmICghYmFja3VwX2ZpbGVfZXhpc3RzKXtcblx0XHRiYWNrdXBfZmlsZV9zdGF0cy5leGlzdHMgPSBmYWxzZTtcblx0XHRyZXR1cm47XG5cdH1cblx0bGV0IGJhY2t1cF9maWxlbmFtZTogc3RyaW5nID0gZmlsZW5hbWUrJy5iYWsnO1xuXHRhd2FpdCBmaWxlX21hbmFnZXIuY29weV9maWxlKHRtcF9iYWNrdXBfZmlsZSwgcHJvamVjdF9wYXRoK2JhY2t1cF9maWxlbmFtZSk7XG5cdGNvbnNvbGUubG9nKCdiYWNrdXAgZmlsZSBjb3BpZWQgdG8nLCBwcm9qZWN0X3BhdGgrYmFja3VwX2ZpbGVuYW1lKTtcblx0YmFja3VwX2ZpbGVfc3RhdHMuZXhpc3RzID0gdHJ1ZTtcblx0YmFja3VwX2ZpbGVfc3RhdHMuZmlsZW5hbWUgPSBmaWxlbmFtZTtcblx0YmFja3VwX2ZpbGVfc3RhdHMuYmFja3VwX2ZpbGVuYW1lID0gYmFja3VwX2ZpbGVuYW1lO1xuXHRiYWNrdXBfZmlsZV9zdGF0cy5wcm9qZWN0ID0gcGF0aC5iYXNlbmFtZShwcm9qZWN0X3BhdGgpO1xuXHRhd2FpdCBmaWxlX21hbmFnZXIuZGVsZXRlX2ZpbGUocGF0aHMubG9ja2ZpbGUpO1xufVxuZXhwb3J0IGZ1bmN0aW9uIGdldF9iYWNrdXBfZmlsZV9zdGF0cygpOiB1dGlsLkJhY2t1cF9GaWxlX1N0YXRzIHtcblx0cmV0dXJuIGJhY2t1cF9maWxlX3N0YXRzO1xufVxuXG5cbmZ1bmN0aW9uIHNldHVwX3JvdXRlcyhhcHA6IGV4cHJlc3MuQXBwbGljYXRpb24pe1xuXHQvLyBzdGF0aWMgcGF0aHNcblx0YXBwLnVzZShleHByZXNzLnN0YXRpYyhwYXRocy53ZWJzZXJ2ZXJfcm9vdCkpOyAvLyBhbGwgZmlsZXMgaW4gdGhpcyBkaXJlY3RvcnkgYXJlIHNlcnZlZCB0byBiZWxhLmxvY2FsL1xuXHRhcHAudXNlKCcvZG9jdW1lbnRhdGlvbicsIGV4cHJlc3Muc3RhdGljKHBhdGhzLkJlbGErJ0RvY3VtZW50YXRpb24vaHRtbCcpKTtcblxuXHQvLyBhamF4IHJvdXRlc1xuXHQvLyBmaWxlIGFuZCBwcm9qZWN0IGRvd25sb2Fkc1xuXHRhcHAuZ2V0KCcvZG93bmxvYWQnLCByb3V0ZXMuZG93bmxvYWQpO1xuXHQvLyBkb3h5Z2VuIHhtbFxuXHRhcHAuZ2V0KCcvZG9jdW1lbnRhdGlvbl94bWwnLCByb3V0ZXMuZG94eWdlbik7XG4gIC8vIGd1aVxuICBhcHAudXNlKCcvZ3VpJywgZXhwcmVzcy5zdGF0aWMocGF0aHMuZ3VpKSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRfeGVub21haV92ZXJzaW9uKCk6IFByb21pc2U8c3RyaW5nPntcblx0cmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCl7XG5cdFx0Y2hpbGRfcHJvY2Vzcy5leGVjKCcvdXNyL3hlbm9tYWkvYmluL3hlbm8tY29uZmlnIC0tdmVyc2lvbicsIChlcnIsIHN0ZG91dCwgc3RkZXJyKSA9PiB7XG5cdFx0XHRpZiAoZXJyKXtcblx0XHRcdFx0Y29uc29sZS5sb2coJ2Vycm9yIHJlYWRpbmcgeGVub21haSB2ZXJzaW9uJyk7XG5cdFx0XHRcdHJlamVjdChlcnIpO1xuXHRcdFx0fVxuXHRcdFx0aWYgKHN0ZG91dC5pbmNsdWRlcygnMi42Jykpe1xuXHRcdFx0XHRwYXRocy5zZXRfeGVub21haV9zdGF0KCcvcHJvYy94ZW5vbWFpL3N0YXQnKTtcblx0XHRcdH0gZWxzZSBpZiAoc3Rkb3V0LmluY2x1ZGVzKCczLjAnKSl7XG5cdFx0XHRcdHBhdGhzLnNldF94ZW5vbWFpX3N0YXQoJy9wcm9jL3hlbm9tYWkvc2NoZWQvc3RhdCcpO1xuXHRcdFx0fVxuXHRcdFx0cmVzb2x2ZShzdGRvdXQpO1xuXHRcdH0pO1xuXHR9KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNldF90aW1lKHRpbWU6IHN0cmluZyl7XG5cdGNoaWxkX3Byb2Nlc3MuZXhlYygnZGF0ZSAtcyBcIicrdGltZSsnXCInLCAoZXJyLCBzdGRvdXQsIHN0ZGVycikgPT4ge1xuXHRcdGlmIChlcnIgfHwgc3RkZXJyKXtcblx0XHRcdGNvbnNvbGUubG9nKCdlcnJvciBzZXR0aW5nIHRpbWUnLCBlcnIsIHN0ZGVycik7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGNvbnNvbGUubG9nKCd0aW1lIHNldCB0bzonLCBzdGRvdXQpO1xuXHRcdH1cblx0fSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzaHV0ZG93bigpe1xuXHRjaGlsZF9wcm9jZXNzLmV4ZWMoJ3NodXRkb3duIC1oIG5vdycsIChlcnIsIHN0ZG91dCwgc3RkZXJyKSA9PiBjb25zb2xlLmxvZygnc2h1dHRpbmcgZG93bicsIGVyciwgc3Rkb3V0LCBzdGRlcnIpICk7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBib2FyZF9kZXRlY3QoKTogUHJvbWlzZTxhbnk+e1xuXHRyZXR1cm4gbmV3IFByb21pc2UoIChyZXNvbHZlLCByZWplY3QpID0+IHtcblx0XHRjaGlsZF9wcm9jZXNzLmV4ZWMoJ2JvYXJkX2RldGVjdCcsIChlcnIsIHN0ZG91dCwgc3RkZXJyKSA9PiB7XG5cdFx0XHRpZiAoZXJyKSByZWplY3QoZXJyKTtcblx0XHRcdGNvbnNvbGUubG9nKCdydW5uaW5nIG9uJywgc3Rkb3V0KTtcblx0XHRcdHJlc29sdmUoc3Rkb3V0KTtcblx0XHR9KTtcblx0fSk7XG59XG5cbnByb2Nlc3Mub24oJ3dhcm5pbmcnLCBlID0+IGNvbnNvbGUud2FybihlLnN0YWNrKSk7XG4vKnByb2Nlc3Mub24oJ3VuY2F1Z2h0RXhjZXB0aW9uJywgZXJyID0+IHtcblx0Y29uc29sZS5sb2coJ3VuY2F1Z2h0IGV4Y2VwdGlvbicpO1xuXHR0aHJvdyBlcnI7XG59KTtcbnByb2Nlc3Mub24oJ1NJR1RFUk0nLCAoKSA9PiB7XG5cdGNvbnNvbGUubG9nKCdTSUdURVJNJyk7XG5cdHRocm93IG5ldyBFcnJvcignU0lHVEVSTScpO1xufSk7Ki9cbiJdfQ==
