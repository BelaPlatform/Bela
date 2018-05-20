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
// this module monitors the linux-domain CPU usage of a running bela process
// once it has found the correct pid it calls the callback passed to start()
// every second with the cpu usage as a parameter
var name;
var interval;
var found_pid = false;
var root_pid;
var main_pid;
var callback;
function start(pid, project, cb) {
    root_pid = pid;
    // the process name gets cut off at 15 chars
    name = project.substring(0, 15);
    callback = cb;
    interval = setInterval(function () { return interval_func(); }, 1000);
}
exports.start = start;
function stop() {
    clearInterval(interval);
}
exports.stop = stop;
// this function keeps trying every second to find the correct pid
// once it has, it uses ps to get the cpu usage, and calls the callback
function interval_func() {
    return __awaiter(this, void 0, void 0, function () {
        var _this = this;
        var cpu;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    cpu = '0';
                    if (!!found_pid) return [3 /*break*/, 2];
                    // use pidtree to find all the child pids of the make process
                    return [4 /*yield*/, pidtree(root_pid, { root: true })
                            .then(function (pids) { return __awaiter(_this, void 0, void 0, function () {
                            var _i, pids_1, pid, test_name;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        _i = 0, pids_1 = pids;
                                        _a.label = 1;
                                    case 1:
                                        if (!(_i < pids_1.length)) return [3 /*break*/, 4];
                                        pid = pids_1[_i];
                                        return [4 /*yield*/, name_from_pid(pid)];
                                    case 2:
                                        test_name = (_a.sent()).trim();
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
                case 1:
                    // use pidtree to find all the child pids of the make process
                    _a.sent();
                    return [3 /*break*/, 4];
                case 2: return [4 /*yield*/, getCPU()
                        .catch(function (e) {
                        console.log('ps error');
                        found_pid = false;
                    })];
                case 3:
                    cpu = _a.sent();
                    _a.label = 4;
                case 4:
                    callback(cpu);
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,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QVEsR0FBQyxRQUFRLEdBQUMsdUJBQXVCLEVBQUUsVUFBQyxHQUFHLEVBQUUsTUFBTTtZQUN6RSxJQUFJLEdBQUc7Z0JBQUUsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ3JCLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNqQixDQUFDLENBQUMsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQyIsImZpbGUiOiJDUFVNb25pdG9yLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2hpbGRfcHJvY2VzcyBmcm9tICdjaGlsZF9wcm9jZXNzJztcbmltcG9ydCAqIGFzIHBpZHRyZWUgZnJvbSAncGlkdHJlZSc7XG5cbi8vIHRoaXMgbW9kdWxlIG1vbml0b3JzIHRoZSBsaW51eC1kb21haW4gQ1BVIHVzYWdlIG9mIGEgcnVubmluZyBiZWxhIHByb2Nlc3Ncbi8vIG9uY2UgaXQgaGFzIGZvdW5kIHRoZSBjb3JyZWN0IHBpZCBpdCBjYWxscyB0aGUgY2FsbGJhY2sgcGFzc2VkIHRvIHN0YXJ0KClcbi8vIGV2ZXJ5IHNlY29uZCB3aXRoIHRoZSBjcHUgdXNhZ2UgYXMgYSBwYXJhbWV0ZXJcblxubGV0IG5hbWU6IHN0cmluZztcbmxldCBpbnRlcnZhbDogTm9kZUpTLlRpbWVyO1xubGV0IGZvdW5kX3BpZDogYm9vbGVhbiA9IGZhbHNlO1xubGV0IHJvb3RfcGlkOiBudW1iZXI7XG5sZXQgbWFpbl9waWQ6IG51bWJlcjtcbmxldCBjYWxsYmFjazogKGNwdTogYW55KSA9PiB2b2lkO1xuXG5leHBvcnQgZnVuY3Rpb24gc3RhcnQocGlkOiBudW1iZXIsIHByb2plY3Q6IHN0cmluZywgY2I6IChjcHU6IGFueSk9PnZvaWQpe1xuXHRyb290X3BpZCA9IHBpZDtcblx0Ly8gdGhlIHByb2Nlc3MgbmFtZSBnZXRzIGN1dCBvZmYgYXQgMTUgY2hhcnNcblx0bmFtZSA9IHByb2plY3Quc3Vic3RyaW5nKDAsIDE1KTtcblx0Y2FsbGJhY2sgPSBjYjtcblx0aW50ZXJ2YWwgPSBzZXRJbnRlcnZhbCggKCkgPT4gaW50ZXJ2YWxfZnVuYygpLCAxMDAwKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHN0b3AoKXtcblx0Y2xlYXJJbnRlcnZhbChpbnRlcnZhbCk7XG59XG5cbi8vIHRoaXMgZnVuY3Rpb24ga2VlcHMgdHJ5aW5nIGV2ZXJ5IHNlY29uZCB0byBmaW5kIHRoZSBjb3JyZWN0IHBpZFxuLy8gb25jZSBpdCBoYXMsIGl0IHVzZXMgcHMgdG8gZ2V0IHRoZSBjcHUgdXNhZ2UsIGFuZCBjYWxscyB0aGUgY2FsbGJhY2tcbmFzeW5jIGZ1bmN0aW9uIGludGVydmFsX2Z1bmMoKXtcblx0bGV0IGNwdSA9ICcwJztcblx0aWYgKCFmb3VuZF9waWQpe1xuXHRcdC8vIHVzZSBwaWR0cmVlIHRvIGZpbmQgYWxsIHRoZSBjaGlsZCBwaWRzIG9mIHRoZSBtYWtlIHByb2Nlc3Ncblx0XHRhd2FpdCBwaWR0cmVlKHJvb3RfcGlkLCB7cm9vdDogdHJ1ZX0pXG5cdFx0XHQudGhlbihhc3luYyAocGlkczogYW55KSA9PiB7XG5cdFx0XHRcdC8vIGxvb2sgdGhyb3VnaCB0aGUgcGlkcyB0byBzZWUgaWYgYW55IG9mIHRoZW0gYmVsb25nIHRvIGEgcHJvY2VzcyB3aXRoIHRoZSByaWdodCBuYW1lXG5cdFx0XHRcdGZvciAobGV0IHBpZCBvZiBwaWRzKXtcblx0XHRcdFx0XHRsZXQgdGVzdF9uYW1lID0gKGF3YWl0IG5hbWVfZnJvbV9waWQocGlkKSBhcyBzdHJpbmcpLnRyaW0oKTtcblx0XHRcdFx0XHRpZiAodGVzdF9uYW1lID09PSBuYW1lKXtcblx0XHRcdFx0XHRcdG1haW5fcGlkID0gcGlkO1xuXHRcdFx0XHRcdFx0Zm91bmRfcGlkID0gdHJ1ZTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH0pXG5cdFx0XHQuY2F0Y2goIChlOiBFcnJvcikgPT4ge1xuXHRcdFx0XHRjb25zb2xlLmxvZygnZXJyb3IgZmluZGluZyBwaWQnKTtcblx0XHRcdFx0Zm91bmRfcGlkID0gZmFsc2U7XG5cdFx0XHR9KTtcblx0fSBlbHNlIHtcblx0XHRjcHUgPSBhd2FpdCBnZXRDUFUoKVxuXHRcdFx0LmNhdGNoKCAoZTogYW55KSA9PiB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdwcyBlcnJvcicpOyBcblx0XHRcdFx0Zm91bmRfcGlkID0gZmFsc2U7XG5cdFx0XHR9KTtcblx0fVxuXHRjYWxsYmFjayhjcHUpO1xufVxuXG4vLyByZXR1cm5zIHRoZSBuYW1lIG9mIHRoZSBwcm9jZXNzIGNvcnJlc3BvbmRpbmcgdG8gdGhlIHBpZCBwYXNzZWQgaW4gdG8gaXRcbmZ1bmN0aW9uIG5hbWVfZnJvbV9waWQocGlkOiBudW1iZXIpe1xuXHRyZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuXHRcdGNoaWxkX3Byb2Nlc3MuZXhlYygncHMgLXAgJytwaWQrJyAtbyBjb21tPScsIChlcnIsIHN0ZG91dCkgPT4ge1xuXHRcdFx0aWYgKGVycikgcmVqZWN0KGVycik7XG5cdFx0XHRyZXNvbHZlKHN0ZG91dCk7XG5cdFx0fSk7XG5cdH0pO1xufVxuXG5mdW5jdGlvbiBnZXRDUFUoKXtcblx0cmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcblx0XHRjaGlsZF9wcm9jZXNzLmV4ZWMoJ3BzIC1wICcrbWFpbl9waWQrJyAtbyAlY3B1IC0tbm8taGVhZGVycycsIChlcnIsIHN0ZG91dCkgPT4ge1xuXHRcdFx0aWYgKGVycikgcmVqZWN0KGVycik7XG5cdFx0XHRyZXNvbHZlKHN0ZG91dCk7XG5cdFx0fSk7XG5cdH0pO1xufVxuIl19
