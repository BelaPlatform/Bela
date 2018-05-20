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
                case 0: return [4 /*yield*/, ide_settings.get_setting('cpuMonitoring')];
                case 1:
                    if (!(_a.sent()))
                        return [2 /*return*/];
                    cpu = '0';
                    if (!!found_pid) return [3 /*break*/, 3];
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
                case 2:
                    // use pidtree to find all the child pids of the make process
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIkNQVU1vbml0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDZDQUErQztBQUMvQyxpQ0FBbUM7QUFDbkMsNENBQThDO0FBRTlDLDRFQUE0RTtBQUM1RSw0RUFBNEU7QUFDNUUsaURBQWlEO0FBRWpELElBQUksSUFBWSxDQUFDO0FBQ2pCLElBQUksUUFBc0IsQ0FBQztBQUMzQixJQUFJLFNBQVMsR0FBWSxLQUFLLENBQUM7QUFDL0IsSUFBSSxRQUFnQixDQUFDO0FBQ3JCLElBQUksUUFBZ0IsQ0FBQztBQUNyQixJQUFJLFFBQTRCLENBQUM7QUFFakMsZUFBc0IsR0FBVyxFQUFFLE9BQWUsRUFBRSxFQUFvQjtJQUN2RSxRQUFRLEdBQUcsR0FBRyxDQUFDO0lBQ2YsNENBQTRDO0lBQzVDLElBQUksR0FBRyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztJQUNoQyxRQUFRLEdBQUcsRUFBRSxDQUFDO0lBQ2QsUUFBUSxHQUFHLFdBQVcsQ0FBRSxjQUFNLE9BQUEsYUFBYSxFQUFFLEVBQWYsQ0FBZSxFQUFFLElBQUksQ0FBQyxDQUFDO0FBQ3RELENBQUM7QUFORCxzQkFNQztBQUVEO0lBQ0MsYUFBYSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBQ3pCLENBQUM7QUFGRCxvQkFFQztBQUVELGtFQUFrRTtBQUNsRSx1RUFBdUU7QUFDdkU7Ozs7Ozt3QkFDTyxxQkFBTSxZQUFZLENBQUMsV0FBVyxDQUFDLGVBQWUsQ0FBQyxFQUFBOztvQkFBckQsSUFBSSxDQUFDLENBQUMsU0FBK0MsQ0FBQzt3QkFDckQsc0JBQU87b0JBQ0osR0FBRyxHQUFRLEdBQUcsQ0FBQzt5QkFDZixDQUFDLFNBQVMsRUFBVix3QkFBVTtvQkFDYiw2REFBNkQ7b0JBQzdELHFCQUFNLE9BQU8sQ0FBQyxRQUFRLEVBQUUsRUFBQyxJQUFJLEVBQUUsSUFBSSxFQUFDLENBQUM7NkJBQ25DLElBQUksQ0FBQyxVQUFPLElBQVM7Ozs7OzhDQUVELEVBQUosYUFBSTs7OzZDQUFKLENBQUEsa0JBQUksQ0FBQTt3Q0FBWCxHQUFHO3dDQUNNLHFCQUFNLGFBQWEsQ0FBQyxHQUFHLENBQUMsRUFBQTs7d0NBQXJDLFNBQVMsR0FBRyxDQUFDLFNBQW1DLENBQUEsQ0FBQyxJQUFJLEVBQUU7d0NBQzNELElBQUksU0FBUyxLQUFLLElBQUksRUFBQzs0Q0FDdEIsUUFBUSxHQUFHLEdBQUcsQ0FBQzs0Q0FDZixTQUFTLEdBQUcsSUFBSSxDQUFDO3lDQUNqQjs7O3dDQUxjLElBQUksQ0FBQTs7Ozs7NkJBT3BCLENBQUM7NkJBQ0QsS0FBSyxDQUFFLFVBQUMsQ0FBUTs0QkFDaEIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDOzRCQUNqQyxTQUFTLEdBQUcsS0FBSyxDQUFDO3dCQUNuQixDQUFDLENBQUMsRUFBQTs7b0JBZkgsNkRBQTZEO29CQUM3RCxTQWNHLENBQUM7O3dCQUVFLHFCQUFNLE1BQU0sRUFBRTt5QkFDbEIsS0FBSyxDQUFFLFVBQUMsQ0FBTTt3QkFDZCxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDO3dCQUN4QixTQUFTLEdBQUcsS0FBSyxDQUFDO29CQUNuQixDQUFDLENBQUMsRUFBQTs7b0JBSkgsR0FBRyxHQUFHLFNBSUgsQ0FBQzs7O29CQUVMLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQzs7Ozs7Q0FDZDtBQUVELDJFQUEyRTtBQUMzRSx1QkFBdUIsR0FBVztJQUNqQyxPQUFPLElBQUksT0FBTyxDQUFDLFVBQUMsT0FBTyxFQUFFLE1BQU07UUFDbEMsYUFBYSxDQUFDLElBQUksQ0FBQyxRQUFRLEdBQUMsR0FBRyxHQUFDLFdBQVcsRUFBRSxVQUFDLEdBQUcsRUFBRSxNQUFNO1lBQ3hELElBQUksR0FBRztnQkFBRSxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDckIsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ2pCLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDO0FBRUQ7SUFDQyxPQUFPLElBQUksT0FBTyxDQUFDLFVBQUMsT0FBTyxFQUFFLE1BQU07UUFDbEMsYUFBYSxDQUFDLElBQUksQ0FBQyxRQUFRLEdBQUMsUUFBUSxHQUFDLHVCQUF1QixFQUFFLFVBQUMsR0FBRyxFQUFFLE1BQU07WUFDekUsSUFBSSxHQUFHO2dCQUFFLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNyQixPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDakIsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMiLCJmaWxlIjoiQ1BVTW9uaXRvci5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNoaWxkX3Byb2Nlc3MgZnJvbSAnY2hpbGRfcHJvY2Vzcyc7XG5pbXBvcnQgKiBhcyBwaWR0cmVlIGZyb20gJ3BpZHRyZWUnO1xuaW1wb3J0ICogYXMgaWRlX3NldHRpbmdzIGZyb20gJy4vSURFU2V0dGluZ3MnO1xuXG4vLyB0aGlzIG1vZHVsZSBtb25pdG9ycyB0aGUgbGludXgtZG9tYWluIENQVSB1c2FnZSBvZiBhIHJ1bm5pbmcgYmVsYSBwcm9jZXNzXG4vLyBvbmNlIGl0IGhhcyBmb3VuZCB0aGUgY29ycmVjdCBwaWQgaXQgY2FsbHMgdGhlIGNhbGxiYWNrIHBhc3NlZCB0byBzdGFydCgpXG4vLyBldmVyeSBzZWNvbmQgd2l0aCB0aGUgY3B1IHVzYWdlIGFzIGEgcGFyYW1ldGVyXG5cbmxldCBuYW1lOiBzdHJpbmc7XG5sZXQgaW50ZXJ2YWw6IE5vZGVKUy5UaW1lcjtcbmxldCBmb3VuZF9waWQ6IGJvb2xlYW4gPSBmYWxzZTtcbmxldCByb290X3BpZDogbnVtYmVyO1xubGV0IG1haW5fcGlkOiBudW1iZXI7XG5sZXQgY2FsbGJhY2s6IChjcHU6IGFueSkgPT4gdm9pZDtcblxuZXhwb3J0IGZ1bmN0aW9uIHN0YXJ0KHBpZDogbnVtYmVyLCBwcm9qZWN0OiBzdHJpbmcsIGNiOiAoY3B1OiBhbnkpPT52b2lkKXtcblx0cm9vdF9waWQgPSBwaWQ7XG5cdC8vIHRoZSBwcm9jZXNzIG5hbWUgZ2V0cyBjdXQgb2ZmIGF0IDE1IGNoYXJzXG5cdG5hbWUgPSBwcm9qZWN0LnN1YnN0cmluZygwLCAxNSk7XG5cdGNhbGxiYWNrID0gY2I7XG5cdGludGVydmFsID0gc2V0SW50ZXJ2YWwoICgpID0+IGludGVydmFsX2Z1bmMoKSwgMTAwMCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzdG9wKCl7XG5cdGNsZWFySW50ZXJ2YWwoaW50ZXJ2YWwpO1xufVxuXG4vLyB0aGlzIGZ1bmN0aW9uIGtlZXBzIHRyeWluZyBldmVyeSBzZWNvbmQgdG8gZmluZCB0aGUgY29ycmVjdCBwaWRcbi8vIG9uY2UgaXQgaGFzLCBpdCB1c2VzIHBzIHRvIGdldCB0aGUgY3B1IHVzYWdlLCBhbmQgY2FsbHMgdGhlIGNhbGxiYWNrXG5hc3luYyBmdW5jdGlvbiBpbnRlcnZhbF9mdW5jKCl7XG5cdGlmICghKGF3YWl0IGlkZV9zZXR0aW5ncy5nZXRfc2V0dGluZygnY3B1TW9uaXRvcmluZycpKSlcblx0XHRyZXR1cm47XG5cdGxldCBjcHU6IGFueSA9ICcwJztcblx0aWYgKCFmb3VuZF9waWQpe1xuXHRcdC8vIHVzZSBwaWR0cmVlIHRvIGZpbmQgYWxsIHRoZSBjaGlsZCBwaWRzIG9mIHRoZSBtYWtlIHByb2Nlc3Ncblx0XHRhd2FpdCBwaWR0cmVlKHJvb3RfcGlkLCB7cm9vdDogdHJ1ZX0pXG5cdFx0XHQudGhlbihhc3luYyAocGlkczogYW55KSA9PiB7XG5cdFx0XHRcdC8vIGxvb2sgdGhyb3VnaCB0aGUgcGlkcyB0byBzZWUgaWYgYW55IG9mIHRoZW0gYmVsb25nIHRvIGEgcHJvY2VzcyB3aXRoIHRoZSByaWdodCBuYW1lXG5cdFx0XHRcdGZvciAobGV0IHBpZCBvZiBwaWRzKXtcblx0XHRcdFx0XHRsZXQgdGVzdF9uYW1lID0gKGF3YWl0IG5hbWVfZnJvbV9waWQocGlkKSBhcyBzdHJpbmcpLnRyaW0oKTtcblx0XHRcdFx0XHRpZiAodGVzdF9uYW1lID09PSBuYW1lKXtcblx0XHRcdFx0XHRcdG1haW5fcGlkID0gcGlkO1xuXHRcdFx0XHRcdFx0Zm91bmRfcGlkID0gdHJ1ZTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH0pXG5cdFx0XHQuY2F0Y2goIChlOiBFcnJvcikgPT4ge1xuXHRcdFx0XHRjb25zb2xlLmxvZygnZXJyb3IgZmluZGluZyBwaWQnKTtcblx0XHRcdFx0Zm91bmRfcGlkID0gZmFsc2U7XG5cdFx0XHR9KTtcblx0fSBlbHNlIHtcblx0XHRjcHUgPSBhd2FpdCBnZXRDUFUoKVxuXHRcdFx0LmNhdGNoKCAoZTogYW55KSA9PiB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdwcyBlcnJvcicpOyBcblx0XHRcdFx0Zm91bmRfcGlkID0gZmFsc2U7XG5cdFx0XHR9KTtcblx0fVxuXHRjYWxsYmFjayhjcHUpO1xufVxuXG4vLyByZXR1cm5zIHRoZSBuYW1lIG9mIHRoZSBwcm9jZXNzIGNvcnJlc3BvbmRpbmcgdG8gdGhlIHBpZCBwYXNzZWQgaW4gdG8gaXRcbmZ1bmN0aW9uIG5hbWVfZnJvbV9waWQocGlkOiBudW1iZXIpe1xuXHRyZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuXHRcdGNoaWxkX3Byb2Nlc3MuZXhlYygncHMgLXAgJytwaWQrJyAtbyBjb21tPScsIChlcnIsIHN0ZG91dCkgPT4ge1xuXHRcdFx0aWYgKGVycikgcmVqZWN0KGVycik7XG5cdFx0XHRyZXNvbHZlKHN0ZG91dCk7XG5cdFx0fSk7XG5cdH0pO1xufVxuXG5mdW5jdGlvbiBnZXRDUFUoKXtcblx0cmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcblx0XHRjaGlsZF9wcm9jZXNzLmV4ZWMoJ3BzIC1wICcrbWFpbl9waWQrJyAtbyAlY3B1IC0tbm8taGVhZGVycycsIChlcnIsIHN0ZG91dCkgPT4ge1xuXHRcdFx0aWYgKGVycikgcmVqZWN0KGVycik7XG5cdFx0XHRyZXNvbHZlKHN0ZG91dCk7XG5cdFx0fSk7XG5cdH0pO1xufVxuIl19
