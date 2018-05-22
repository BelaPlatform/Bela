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
        var cpu, e_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, ide_settings.get_setting('cpuMonitoring')];
                case 1:
                    if (!(_a.sent()))
                        return [2 /*return*/];
                    cpu = '0';
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 7, 8, 9]);
                    if (!!found_pid) return [3 /*break*/, 4];
                    return [4 /*yield*/, find_pid()];
                case 3:
                    _a.sent();
                    return [3 /*break*/, 6];
                case 4: return [4 /*yield*/, getCPU()];
                case 5:
                    cpu = _a.sent();
                    _a.label = 6;
                case 6: return [3 /*break*/, 9];
                case 7:
                    e_1 = _a.sent();
                    console.log('Failed to get CPU usage');
                    found_pid = false;
                    return [3 /*break*/, 9];
                case 8:
                    if (!stopped) {
                        callback(cpu);
                        console.log('setting timeout');
                        timeout = setTimeout(timeout_func, 1000);
                    }
                    return [7 /*endfinally*/];
                case 9: return [2 /*return*/];
            }
        });
    });
}
function find_pid() {
    return __awaiter(this, void 0, void 0, function () {
        var pids, _i, pids_1, pid, test_name;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    // use pidtree to find all the child pids of the root process
                    console.log('pidtree');
                    return [4 /*yield*/, pidtree(root_pid, { root: true })];
                case 1:
                    pids = _a.sent();
                    console.log(pids);
                    _i = 0, pids_1 = pids;
                    _a.label = 2;
                case 2:
                    if (!(_i < pids_1.length)) return [3 /*break*/, 5];
                    pid = pids_1[_i];
                    return [4 /*yield*/, name_from_pid(pid)];
                case 3:
                    test_name = (_a.sent()).trim();
                    console.log(pid, test_name, name);
                    if (test_name === name) {
                        main_pid = pid;
                        found_pid = true;
                    }
                    _a.label = 4;
                case 4:
                    _i++;
                    return [3 /*break*/, 2];
                case 5: return [2 /*return*/];
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,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M0UsdUJBQXVCLEdBQVc7SUFDakMsT0FBTyxJQUFJLE9BQU8sQ0FBQyxVQUFDLE9BQU8sRUFBRSxNQUFNO1FBQ2xDLGFBQWEsQ0FBQyxJQUFJLENBQUMsUUFBUSxHQUFDLEdBQUcsR0FBQyxXQUFXLEVBQUUsVUFBQyxHQUFHLEVBQUUsTUFBTTtZQUN4RCxJQUFJLEdBQUc7Z0JBQUUsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ3JCLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNqQixDQUFDLENBQUMsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQztBQUVEO0lBQ0MsT0FBTyxJQUFJLE9BQU8sQ0FBQyxVQUFDLE9BQU8sRUFBRSxNQUFNO1FBQ2xDLGFBQWEsQ0FBQyxJQUFJLENBQUMsUUFBUSxHQUFDLFFBQVEsR0FBQyx1QkFBdUIsRUFBRSxVQUFDLEdBQUcsRUFBRSxNQUFNO1lBQ3pFLElBQUksR0FBRztnQkFBRSxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDckIsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ2pCLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDIiwiZmlsZSI6IkNQVU1vbml0b3IuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjaGlsZF9wcm9jZXNzIGZyb20gJ2NoaWxkX3Byb2Nlc3MnO1xuaW1wb3J0ICogYXMgcGlkdHJlZSBmcm9tICdwaWR0cmVlJztcbmltcG9ydCAqIGFzIGlkZV9zZXR0aW5ncyBmcm9tICcuL0lERVNldHRpbmdzJztcblxuLy8gdGhpcyBtb2R1bGUgbW9uaXRvcnMgdGhlIGxpbnV4LWRvbWFpbiBDUFUgdXNhZ2Ugb2YgYSBydW5uaW5nIGJlbGEgcHJvY2Vzc1xuLy8gb25jZSBpdCBoYXMgZm91bmQgdGhlIGNvcnJlY3QgcGlkIGl0IGNhbGxzIHRoZSBjYWxsYmFjayBwYXNzZWQgdG8gc3RhcnQoKVxuLy8gZXZlcnkgc2Vjb25kIHdpdGggdGhlIGNwdSB1c2FnZSBhcyBhIHBhcmFtZXRlclxuXG5sZXQgbmFtZTogc3RyaW5nO1xubGV0IHRpbWVvdXQ6IE5vZGVKUy5UaW1lcjtcbmxldCBmb3VuZF9waWQ6IGJvb2xlYW4gPSBmYWxzZTtcbmxldCByb290X3BpZDogbnVtYmVyO1xubGV0IG1haW5fcGlkOiBudW1iZXI7XG5sZXQgY2FsbGJhY2s6IChjcHU6IGFueSkgPT4gdm9pZDtcbmxldCBzdG9wcGVkOiBib29sZWFuID0gZmFsc2U7XG5cbmV4cG9ydCBmdW5jdGlvbiBzdGFydChwaWQ6IG51bWJlciwgcHJvamVjdDogc3RyaW5nLCBjYjogKGNwdTogYW55KT0+dm9pZCl7XG5cdHJvb3RfcGlkID0gcGlkO1xuXHQvLyB0aGUgcHJvY2VzcyBuYW1lIGdldHMgY3V0IG9mZiBhdCAxNSBjaGFyc1xuXHRuYW1lID0gcHJvamVjdC5zdWJzdHJpbmcoMCwgMTUpO1xuXHRjYWxsYmFjayA9IGNiO1xuXHRzdG9wcGVkID0gZmFsc2U7XG5cdHRpbWVvdXQgPSBzZXRUaW1lb3V0KCAoKSA9PiB0aW1lb3V0X2Z1bmMoKSwgMTAwMCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzdG9wKCl7XG5cdGlmICh0aW1lb3V0KSBjbGVhclRpbWVvdXQodGltZW91dCk7XG5cdHN0b3BwZWQgPSB0cnVlO1xufVxuXG4vLyB0aGlzIGZ1bmN0aW9uIGtlZXBzIHRyeWluZyBldmVyeSBzZWNvbmQgdG8gZmluZCB0aGUgY29ycmVjdCBwaWRcbi8vIG9uY2UgaXQgaGFzLCBpdCB1c2VzIHBzIHRvIGdldCB0aGUgY3B1IHVzYWdlLCBhbmQgY2FsbHMgdGhlIGNhbGxiYWNrXG5hc3luYyBmdW5jdGlvbiB0aW1lb3V0X2Z1bmMoKXtcblx0aWYgKCEoYXdhaXQgaWRlX3NldHRpbmdzLmdldF9zZXR0aW5nKCdjcHVNb25pdG9yaW5nJykpKVxuXHRcdHJldHVybjtcblx0bGV0IGNwdTogYW55ID0gJzAnO1xuXHR0cnl7XG5cdFx0aWYgKCFmb3VuZF9waWQpe1xuXHRcdFx0YXdhaXQgZmluZF9waWQoKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0Y3B1ID0gYXdhaXQgZ2V0Q1BVKCk7XG5cdFx0fVxuXHR9XG5cdGNhdGNoKGUpe1xuXHRcdGNvbnNvbGUubG9nKCdGYWlsZWQgdG8gZ2V0IENQVSB1c2FnZScpOyBcblx0XHRmb3VuZF9waWQgPSBmYWxzZTtcblx0fVxuXHRmaW5hbGx5e1xuXHRcdGlmKCFzdG9wcGVkKXtcblx0XHRcdGNhbGxiYWNrKGNwdSk7XG5cdFx0XHRjb25zb2xlLmxvZygnc2V0dGluZyB0aW1lb3V0Jyk7XG5cdFx0XHR0aW1lb3V0ID0gc2V0VGltZW91dCh0aW1lb3V0X2Z1bmMsIDEwMDApO1xuXHRcdH1cblx0fVxufVxuXG5hc3luYyBmdW5jdGlvbiBmaW5kX3BpZCgpe1xuXHQvLyB1c2UgcGlkdHJlZSB0byBmaW5kIGFsbCB0aGUgY2hpbGQgcGlkcyBvZiB0aGUgcm9vdCBwcm9jZXNzXG5cdGNvbnNvbGUubG9nKCdwaWR0cmVlJyk7XG5cdGxldCBwaWRzID0gYXdhaXQgcGlkdHJlZShyb290X3BpZCwge3Jvb3Q6IHRydWV9KTtcblx0Y29uc29sZS5sb2cocGlkcyk7XG5cdC8vIGxvb2sgdGhyb3VnaCB0aGUgcGlkcyB0byBzZWUgaWYgYW55IG9mIHRoZW0gYmVsb25nIHRvIGEgcHJvY2VzcyB3aXRoIHRoZSByaWdodCBuYW1lXG5cdGZvciAobGV0IHBpZCBvZiBwaWRzKXtcblx0XHRsZXQgdGVzdF9uYW1lID0gKGF3YWl0IG5hbWVfZnJvbV9waWQocGlkKSBhcyBzdHJpbmcpLnRyaW0oKTtcblx0XHRjb25zb2xlLmxvZyhwaWQsIHRlc3RfbmFtZSwgbmFtZSk7XG5cdFx0aWYgKHRlc3RfbmFtZSA9PT0gbmFtZSl7XG5cdFx0XHRtYWluX3BpZCA9IHBpZDtcblx0XHRcdGZvdW5kX3BpZCA9IHRydWU7XG5cdFx0fVxuXHR9XG59XG5cbi8vIHJldHVybnMgdGhlIG5hbWUgb2YgdGhlIHByb2Nlc3MgY29ycmVzcG9uZGluZyB0byB0aGUgcGlkIHBhc3NlZCBpbiB0byBpdFxuZnVuY3Rpb24gbmFtZV9mcm9tX3BpZChwaWQ6IG51bWJlcil7XG5cdHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG5cdFx0Y2hpbGRfcHJvY2Vzcy5leGVjKCdwcyAtcCAnK3BpZCsnIC1vIGNvbW09JywgKGVyciwgc3Rkb3V0KSA9PiB7XG5cdFx0XHRpZiAoZXJyKSByZWplY3QoZXJyKTtcblx0XHRcdHJlc29sdmUoc3Rkb3V0KTtcblx0XHR9KTtcblx0fSk7XG59XG5cbmZ1bmN0aW9uIGdldENQVSgpe1xuXHRyZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuXHRcdGNoaWxkX3Byb2Nlc3MuZXhlYygncHMgLXAgJyttYWluX3BpZCsnIC1vICVjcHUgLS1uby1oZWFkZXJzJywgKGVyciwgc3Rkb3V0KSA9PiB7XG5cdFx0XHRpZiAoZXJyKSByZWplY3QoZXJyKTtcblx0XHRcdHJlc29sdmUoc3Rkb3V0KTtcblx0XHR9KTtcblx0fSk7XG59XG4iXX0=
