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
            if (f = 1, y && (t = y[op[0] & 2 ? "return" : op[0] ? "throw" : "next"]) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [0, t.value];
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
var child_process = require("child_process");
var pidtree = require("pidtree");
var ide_settings = require("./IDESettings");
// this module monitors the linux-domain CPU usage of a running bela process
// once it has found the correct pid it calls the callback passed to start()
// every second with the cpu usage as a parameter
var name;
var timeout;
var found_pid = false;
var root_pid;
var main_pid;
var callback;
var stopped = false;
function start(pid, project, cb) {
    root_pid = pid;
    // the process name gets cut off at 15 chars
    name = project.substring(0, 15);
    callback = cb;
    stopped = false;
    timeout = setTimeout(function () { return timeout_func(); }, 1000);
}
exports.start = start;
function stop() {
    if (timeout)
        clearTimeout(timeout);
    stopped = true;
}
exports.stop = stop;
// this function keeps trying every second to find the correct pid
// once it has, it uses ps to get the cpu usage, and calls the callback
function timeout_func() {
    return __awaiter(this, void 0, void 0, function () {
        var _this = this;
        var cpu;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, ide_settings.get_setting('cpuMonitoring')];
                case 1:
                    if (!(_a.sent()))
                        return [2 /*return*/];
                    cpu = '0';
                    if (!!found_pid) return [3 /*break*/, 3];
                    // use pidtree to find all the child pids of the make process
                    console.log('pidtree');
                    return [4 /*yield*/, pidtree(root_pid, { root: true })
                            .then(function (pids) { return __awaiter(_this, void 0, void 0, function () {
                            var _i, pids_1, pid, test_name;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        console.log(pids);
                                        _i = 0, pids_1 = pids;
                                        _a.label = 1;
                                    case 1:
                                        if (!(_i < pids_1.length)) return [3 /*break*/, 4];
                                        pid = pids_1[_i];
                                        return [4 /*yield*/, name_from_pid(pid)];
                                    case 2:
                                        test_name = (_a.sent()).trim();
                                        console.log(pid, test_name, name);
                                        if (test_name === name) {
                                            main_pid = pid;
                                            found_pid = true;
                                        }
                                        _a.label = 3;
                                    case 3:
                                        _i++;
                                        return [3 /*break*/, 1];
                                    case 4: return [2 /*return*/];
                                }
                            });
                        }); })
                            .catch(function (e) {
                            console.log('error finding pid');
                            found_pid = false;
                        })];
                case 2:
                    _a.sent();
                    return [3 /*break*/, 5];
                case 3: return [4 /*yield*/, getCPU()
                        .catch(function (e) {
                        console.log('ps error');
                        found_pid = false;
                    })];
                case 4:
                    cpu = _a.sent();
                    _a.label = 5;
                case 5:
                    if (stopped)
                        return [2 /*return*/];
                    callback(cpu);
                    setTimeout(timeout_func);
                    return [2 /*return*/];
            }
        });
    });
}
// returns the name of the process corresponding to the pid passed in to it
function name_from_pid(pid) {
    return new Promise(function (resolve, reject) {
        child_process.exec('ps -p ' + pid + ' -o comm=', function (err, stdout) {
            if (err)
                reject(err);
            resolve(stdout);
        });
    });
}
function getCPU() {
    return new Promise(function (resolve, reject) {
        child_process.exec('ps -p ' + main_pid + ' -o %cpu --no-headers', function (err, stdout) {
            if (err)
                reject(err);
            resolve(stdout);
        });
    });
}

//# sourceMappingURL=data:application/json;charset=utf8;base64,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QUNkLFVBQVUsQ0FBQyxZQUFZLENBQUMsQ0FBQzs7Ozs7Q0FDekI7QUFFRCwyRUFBMkU7QUFDM0UsdUJBQXVCLEdBQVc7SUFDakMsT0FBTyxJQUFJLE9BQU8sQ0FBQyxVQUFDLE9BQU8sRUFBRSxNQUFNO1FBQ2xDLGFBQWEsQ0FBQyxJQUFJLENBQUMsUUFBUSxHQUFDLEdBQUcsR0FBQyxXQUFXLEVBQUUsVUFBQyxHQUFHLEVBQUUsTUFBTTtZQUN4RCxJQUFJLEdBQUc7Z0JBQUUsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ3JCLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNqQixDQUFDLENBQUMsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQztBQUVEO0lBQ0MsT0FBTyxJQUFJLE9BQU8sQ0FBQyxVQUFDLE9BQU8sRUFBRSxNQUFNO1FBQ2xDLGFBQWEsQ0FBQyxJQUFJLENBQUMsUUFBUSxHQUFDLFFBQVEsR0FBQyx1QkFBdUIsRUFBRSxVQUFDLEdBQUcsRUFBRSxNQUFNO1lBQ3pFLElBQUksR0FBRztnQkFBRSxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDckIsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ2pCLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDIiwiZmlsZSI6IkNQVU1vbml0b3IuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjaGlsZF9wcm9jZXNzIGZyb20gJ2NoaWxkX3Byb2Nlc3MnO1xuaW1wb3J0ICogYXMgcGlkdHJlZSBmcm9tICdwaWR0cmVlJztcbmltcG9ydCAqIGFzIGlkZV9zZXR0aW5ncyBmcm9tICcuL0lERVNldHRpbmdzJztcblxuLy8gdGhpcyBtb2R1bGUgbW9uaXRvcnMgdGhlIGxpbnV4LWRvbWFpbiBDUFUgdXNhZ2Ugb2YgYSBydW5uaW5nIGJlbGEgcHJvY2Vzc1xuLy8gb25jZSBpdCBoYXMgZm91bmQgdGhlIGNvcnJlY3QgcGlkIGl0IGNhbGxzIHRoZSBjYWxsYmFjayBwYXNzZWQgdG8gc3RhcnQoKVxuLy8gZXZlcnkgc2Vjb25kIHdpdGggdGhlIGNwdSB1c2FnZSBhcyBhIHBhcmFtZXRlclxuXG5sZXQgbmFtZTogc3RyaW5nO1xubGV0IHRpbWVvdXQ6IE5vZGVKUy5UaW1lcjtcbmxldCBmb3VuZF9waWQ6IGJvb2xlYW4gPSBmYWxzZTtcbmxldCByb290X3BpZDogbnVtYmVyO1xubGV0IG1haW5fcGlkOiBudW1iZXI7XG5sZXQgY2FsbGJhY2s6IChjcHU6IGFueSkgPT4gdm9pZDtcbmxldCBzdG9wcGVkOiBib29sZWFuID0gZmFsc2U7XG5cbmV4cG9ydCBmdW5jdGlvbiBzdGFydChwaWQ6IG51bWJlciwgcHJvamVjdDogc3RyaW5nLCBjYjogKGNwdTogYW55KT0+dm9pZCl7XG5cdHJvb3RfcGlkID0gcGlkO1xuXHQvLyB0aGUgcHJvY2VzcyBuYW1lIGdldHMgY3V0IG9mZiBhdCAxNSBjaGFyc1xuXHRuYW1lID0gcHJvamVjdC5zdWJzdHJpbmcoMCwgMTUpO1xuXHRjYWxsYmFjayA9IGNiO1xuXHRzdG9wcGVkID0gZmFsc2U7XG5cdHRpbWVvdXQgPSBzZXRUaW1lb3V0KCAoKSA9PiB0aW1lb3V0X2Z1bmMoKSwgMTAwMCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzdG9wKCl7XG5cdGlmICh0aW1lb3V0KSBjbGVhclRpbWVvdXQodGltZW91dCk7XG5cdHN0b3BwZWQgPSB0cnVlO1xufVxuXG4vLyB0aGlzIGZ1bmN0aW9uIGtlZXBzIHRyeWluZyBldmVyeSBzZWNvbmQgdG8gZmluZCB0aGUgY29ycmVjdCBwaWRcbi8vIG9uY2UgaXQgaGFzLCBpdCB1c2VzIHBzIHRvIGdldCB0aGUgY3B1IHVzYWdlLCBhbmQgY2FsbHMgdGhlIGNhbGxiYWNrXG5hc3luYyBmdW5jdGlvbiB0aW1lb3V0X2Z1bmMoKXtcblx0aWYgKCEoYXdhaXQgaWRlX3NldHRpbmdzLmdldF9zZXR0aW5nKCdjcHVNb25pdG9yaW5nJykpKVxuXHRcdHJldHVybjtcblx0bGV0IGNwdTogYW55ID0gJzAnO1xuXHRpZiAoIWZvdW5kX3BpZCl7XG5cdFx0Ly8gdXNlIHBpZHRyZWUgdG8gZmluZCBhbGwgdGhlIGNoaWxkIHBpZHMgb2YgdGhlIG1ha2UgcHJvY2Vzc1xuXHRcdGNvbnNvbGUubG9nKCdwaWR0cmVlJyk7XG5cdFx0YXdhaXQgcGlkdHJlZShyb290X3BpZCwge3Jvb3Q6IHRydWV9KVxuXHRcdFx0LnRoZW4oYXN5bmMgKHBpZHM6IGFueSkgPT4ge1xuXHRcdFx0XHRjb25zb2xlLmxvZyhwaWRzKTtcblx0XHRcdFx0Ly8gbG9vayB0aHJvdWdoIHRoZSBwaWRzIHRvIHNlZSBpZiBhbnkgb2YgdGhlbSBiZWxvbmcgdG8gYSBwcm9jZXNzIHdpdGggdGhlIHJpZ2h0IG5hbWVcblx0XHRcdFx0Zm9yIChsZXQgcGlkIG9mIHBpZHMpe1xuXHRcdFx0XHRcdGxldCB0ZXN0X25hbWUgPSAoYXdhaXQgbmFtZV9mcm9tX3BpZChwaWQpIGFzIHN0cmluZykudHJpbSgpO1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKHBpZCwgdGVzdF9uYW1lLCBuYW1lKTtcblx0XHRcdFx0XHRpZiAodGVzdF9uYW1lID09PSBuYW1lKXtcblx0XHRcdFx0XHRcdG1haW5fcGlkID0gcGlkO1xuXHRcdFx0XHRcdFx0Zm91bmRfcGlkID0gdHJ1ZTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH0pXG5cdFx0XHQuY2F0Y2goIChlOiBFcnJvcikgPT4ge1xuXHRcdFx0XHRjb25zb2xlLmxvZygnZXJyb3IgZmluZGluZyBwaWQnKTtcblx0XHRcdFx0Zm91bmRfcGlkID0gZmFsc2U7XG5cdFx0XHR9KTtcblx0fSBlbHNlIHtcblx0XHRjcHUgPSBhd2FpdCBnZXRDUFUoKVxuXHRcdFx0LmNhdGNoKCAoZTogYW55KSA9PiB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdwcyBlcnJvcicpOyBcblx0XHRcdFx0Zm91bmRfcGlkID0gZmFsc2U7XG5cdFx0XHR9KTtcblx0fVxuXHRpZihzdG9wcGVkKVxuXHRcdHJldHVybjtcblx0Y2FsbGJhY2soY3B1KTtcblx0c2V0VGltZW91dCh0aW1lb3V0X2Z1bmMpO1xufVxuXG4vLyByZXR1cm5zIHRoZSBuYW1lIG9mIHRoZSBwcm9jZXNzIGNvcnJlc3BvbmRpbmcgdG8gdGhlIHBpZCBwYXNzZWQgaW4gdG8gaXRcbmZ1bmN0aW9uIG5hbWVfZnJvbV9waWQocGlkOiBudW1iZXIpe1xuXHRyZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuXHRcdGNoaWxkX3Byb2Nlc3MuZXhlYygncHMgLXAgJytwaWQrJyAtbyBjb21tPScsIChlcnIsIHN0ZG91dCkgPT4ge1xuXHRcdFx0aWYgKGVycikgcmVqZWN0KGVycik7XG5cdFx0XHRyZXNvbHZlKHN0ZG91dCk7XG5cdFx0fSk7XG5cdH0pO1xufVxuXG5mdW5jdGlvbiBnZXRDUFUoKXtcblx0cmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcblx0XHRjaGlsZF9wcm9jZXNzLmV4ZWMoJ3BzIC1wICcrbWFpbl9waWQrJyAtbyAlY3B1IC0tbm8taGVhZGVycycsIChlcnIsIHN0ZG91dCkgPT4ge1xuXHRcdFx0aWYgKGVycikgcmVqZWN0KGVycik7XG5cdFx0XHRyZXNvbHZlKHN0ZG91dCk7XG5cdFx0fSk7XG5cdH0pO1xufVxuIl19
