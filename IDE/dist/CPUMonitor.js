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
var child_process = require("child_process");
var pidtree = require("pidtree");
var ide_settings = require("./IDESettings");
// this module monitors the linux-domain CPU usage of a running bela process
// once it has found the correct pid it calls the callback passed to start()
// every second with the cpu usage as a parameter
var name;
var timeout;
var found_pid;
var root_pid;
var main_pid;
var callback;
var stopped;
var find_pid_count;
function start(pid, project, cb) {
    root_pid = pid;
    // the process name gets cut off at 15 chars
    name = project.substring(0, 15);
    callback = cb;
    stopped = false;
    found_pid = false;
    find_pid_count = 0;
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
                    _a.trys.push([2, 8, 9, 10]);
                    if (!!found_pid) return [3 /*break*/, 5];
                    if (!(find_pid_count++ < 3)) return [3 /*break*/, 4];
                    return [4 /*yield*/, find_pid()];
                case 3:
                    _a.sent();
                    _a.label = 4;
                case 4: return [3 /*break*/, 7];
                case 5: return [4 /*yield*/, getCPU()];
                case 6:
                    cpu = _a.sent();
                    _a.label = 7;
                case 7: return [3 /*break*/, 10];
                case 8:
                    e_1 = _a.sent();
                    console.log('Failed to get CPU usage');
                    found_pid = false;
                    return [3 /*break*/, 10];
                case 9:
                    if (!stopped) {
                        callback(cpu);
                        timeout = setTimeout(timeout_func, 1000);
                    }
                    return [7 /*endfinally*/];
                case 10: return [2 /*return*/];
            }
        });
    });
}
function find_pid() {
    return __awaiter(this, void 0, void 0, function () {
        var pids, _i, pids_1, pid, test_name;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, pidtree(root_pid, { root: true })];
                case 1:
                    pids = _a.sent();
                    _i = 0, pids_1 = pids;
                    _a.label = 2;
                case 2:
                    if (!(_i < pids_1.length)) return [3 /*break*/, 5];
                    pid = pids_1[_i];
                    return [4 /*yield*/, name_from_pid(pid)];
                case 3:
                    test_name = (_a.sent()).trim();
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIkNQVU1vbml0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDZDQUErQztBQUMvQyxpQ0FBbUM7QUFDbkMsNENBQThDO0FBRTlDLDRFQUE0RTtBQUM1RSw0RUFBNEU7QUFDNUUsaURBQWlEO0FBRWpELElBQUksSUFBWSxDQUFDO0FBQ2pCLElBQUksT0FBcUIsQ0FBQztBQUMxQixJQUFJLFNBQWtCLENBQUM7QUFDdkIsSUFBSSxRQUFnQixDQUFDO0FBQ3JCLElBQUksUUFBZ0IsQ0FBQztBQUNyQixJQUFJLFFBQTRCLENBQUM7QUFDakMsSUFBSSxPQUFnQixDQUFDO0FBQ3JCLElBQUksY0FBc0IsQ0FBQztBQUUzQixlQUFzQixHQUFXLEVBQUUsT0FBZSxFQUFFLEVBQW9CO0lBQ3ZFLFFBQVEsR0FBRyxHQUFHLENBQUM7SUFDZiw0Q0FBNEM7SUFDNUMsSUFBSSxHQUFHLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQ2hDLFFBQVEsR0FBRyxFQUFFLENBQUM7SUFDZCxPQUFPLEdBQUcsS0FBSyxDQUFDO0lBQ2hCLFNBQVMsR0FBRyxLQUFLLENBQUM7SUFDbEIsY0FBYyxHQUFHLENBQUMsQ0FBQztJQUNuQixPQUFPLEdBQUcsVUFBVSxDQUFFLGNBQU0sT0FBQSxZQUFZLEVBQUUsRUFBZCxDQUFjLEVBQUUsSUFBSSxDQUFDLENBQUM7QUFDbkQsQ0FBQztBQVRELHNCQVNDO0FBRUQ7SUFDQyxJQUFJLE9BQU87UUFBRSxZQUFZLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDbkMsT0FBTyxHQUFHLElBQUksQ0FBQztBQUNoQixDQUFDO0FBSEQsb0JBR0M7QUFFRCxrRUFBa0U7QUFDbEUsdUVBQXVFO0FBQ3ZFOzs7Ozt3QkFDTyxxQkFBTSxZQUFZLENBQUMsV0FBVyxDQUFDLGVBQWUsQ0FBQyxFQUFBOztvQkFBckQsSUFBSSxDQUFDLENBQUMsU0FBK0MsQ0FBQzt3QkFDckQsc0JBQU87b0JBQ0osR0FBRyxHQUFRLEdBQUcsQ0FBQzs7Ozt5QkFFZCxDQUFDLFNBQVMsRUFBVix3QkFBVTt5QkFDVCxDQUFBLGNBQWMsRUFBRSxHQUFHLENBQUMsQ0FBQSxFQUFwQix3QkFBb0I7b0JBQ3ZCLHFCQUFNLFFBQVEsRUFBRSxFQUFBOztvQkFBaEIsU0FBZ0IsQ0FBQzs7O3dCQUdaLHFCQUFNLE1BQU0sRUFBRSxFQUFBOztvQkFBcEIsR0FBRyxHQUFHLFNBQWMsQ0FBQzs7Ozs7b0JBSXRCLE9BQU8sQ0FBQyxHQUFHLENBQUMseUJBQXlCLENBQUMsQ0FBQztvQkFDdkMsU0FBUyxHQUFHLEtBQUssQ0FBQzs7O29CQUdsQixJQUFHLENBQUMsT0FBTyxFQUFDO3dCQUNYLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQzt3QkFDZCxPQUFPLEdBQUcsVUFBVSxDQUFDLFlBQVksRUFBRSxJQUFJLENBQUMsQ0FBQztxQkFDekM7Ozs7OztDQUVGO0FBRUQ7Ozs7O3dCQUVZLHFCQUFNLE9BQU8sQ0FBQyxRQUFRLEVBQUUsRUFBQyxJQUFJLEVBQUUsSUFBSSxFQUFDLENBQUMsRUFBQTs7b0JBQTVDLElBQUksR0FBRyxTQUFxQzswQkFFNUIsRUFBSixhQUFJOzs7eUJBQUosQ0FBQSxrQkFBSSxDQUFBO29CQUFYLEdBQUc7b0JBQ00scUJBQU0sYUFBYSxDQUFDLEdBQUcsQ0FBQyxFQUFBOztvQkFBckMsU0FBUyxHQUFHLENBQUMsU0FBbUMsQ0FBQSxDQUFDLElBQUksRUFBRTtvQkFDM0QsSUFBSSxTQUFTLEtBQUssSUFBSSxFQUFDO3dCQUN0QixRQUFRLEdBQUcsR0FBRyxDQUFDO3dCQUNmLFNBQVMsR0FBRyxJQUFJLENBQUM7cUJBQ2pCOzs7b0JBTGMsSUFBSSxDQUFBOzs7Ozs7Q0FPcEI7QUFFRCwyRUFBMkU7QUFDM0UsdUJBQXVCLEdBQVc7SUFDakMsT0FBTyxJQUFJLE9BQU8sQ0FBQyxVQUFDLE9BQU8sRUFBRSxNQUFNO1FBQ2xDLGFBQWEsQ0FBQyxJQUFJLENBQUMsUUFBUSxHQUFDLEdBQUcsR0FBQyxXQUFXLEVBQUUsVUFBQyxHQUFHLEVBQUUsTUFBTTtZQUN4RCxJQUFJLEdBQUc7Z0JBQUUsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ3JCLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNqQixDQUFDLENBQUMsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQztBQUVEO0lBQ0MsT0FBTyxJQUFJLE9BQU8sQ0FBQyxVQUFDLE9BQU8sRUFBRSxNQUFNO1FBQ2xDLGFBQWEsQ0FBQyxJQUFJLENBQUMsUUFBUSxHQUFDLFFBQVEsR0FBQyx1QkFBdUIsRUFBRSxVQUFDLEdBQUcsRUFBRSxNQUFNO1lBQ3pFLElBQUksR0FBRztnQkFBRSxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDckIsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ2pCLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDIiwiZmlsZSI6IkNQVU1vbml0b3IuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjaGlsZF9wcm9jZXNzIGZyb20gJ2NoaWxkX3Byb2Nlc3MnO1xuaW1wb3J0ICogYXMgcGlkdHJlZSBmcm9tICdwaWR0cmVlJztcbmltcG9ydCAqIGFzIGlkZV9zZXR0aW5ncyBmcm9tICcuL0lERVNldHRpbmdzJztcblxuLy8gdGhpcyBtb2R1bGUgbW9uaXRvcnMgdGhlIGxpbnV4LWRvbWFpbiBDUFUgdXNhZ2Ugb2YgYSBydW5uaW5nIGJlbGEgcHJvY2Vzc1xuLy8gb25jZSBpdCBoYXMgZm91bmQgdGhlIGNvcnJlY3QgcGlkIGl0IGNhbGxzIHRoZSBjYWxsYmFjayBwYXNzZWQgdG8gc3RhcnQoKVxuLy8gZXZlcnkgc2Vjb25kIHdpdGggdGhlIGNwdSB1c2FnZSBhcyBhIHBhcmFtZXRlclxuXG5sZXQgbmFtZTogc3RyaW5nO1xubGV0IHRpbWVvdXQ6IE5vZGVKUy5UaW1lcjtcbmxldCBmb3VuZF9waWQ6IGJvb2xlYW47XG5sZXQgcm9vdF9waWQ6IG51bWJlcjtcbmxldCBtYWluX3BpZDogbnVtYmVyO1xubGV0IGNhbGxiYWNrOiAoY3B1OiBhbnkpID0+IHZvaWQ7XG5sZXQgc3RvcHBlZDogYm9vbGVhbjtcbmxldCBmaW5kX3BpZF9jb3VudDogbnVtYmVyO1xuXG5leHBvcnQgZnVuY3Rpb24gc3RhcnQocGlkOiBudW1iZXIsIHByb2plY3Q6IHN0cmluZywgY2I6IChjcHU6IGFueSk9PnZvaWQpe1xuXHRyb290X3BpZCA9IHBpZDtcblx0Ly8gdGhlIHByb2Nlc3MgbmFtZSBnZXRzIGN1dCBvZmYgYXQgMTUgY2hhcnNcblx0bmFtZSA9IHByb2plY3Quc3Vic3RyaW5nKDAsIDE1KTtcblx0Y2FsbGJhY2sgPSBjYjtcblx0c3RvcHBlZCA9IGZhbHNlO1xuXHRmb3VuZF9waWQgPSBmYWxzZTtcblx0ZmluZF9waWRfY291bnQgPSAwO1xuXHR0aW1lb3V0ID0gc2V0VGltZW91dCggKCkgPT4gdGltZW91dF9mdW5jKCksIDEwMDApO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc3RvcCgpe1xuXHRpZiAodGltZW91dCkgY2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xuXHRzdG9wcGVkID0gdHJ1ZTtcbn1cblxuLy8gdGhpcyBmdW5jdGlvbiBrZWVwcyB0cnlpbmcgZXZlcnkgc2Vjb25kIHRvIGZpbmQgdGhlIGNvcnJlY3QgcGlkXG4vLyBvbmNlIGl0IGhhcywgaXQgdXNlcyBwcyB0byBnZXQgdGhlIGNwdSB1c2FnZSwgYW5kIGNhbGxzIHRoZSBjYWxsYmFja1xuYXN5bmMgZnVuY3Rpb24gdGltZW91dF9mdW5jKCl7XG5cdGlmICghKGF3YWl0IGlkZV9zZXR0aW5ncy5nZXRfc2V0dGluZygnY3B1TW9uaXRvcmluZycpKSlcblx0XHRyZXR1cm47XG5cdGxldCBjcHU6IGFueSA9ICcwJztcblx0dHJ5e1xuXHRcdGlmICghZm91bmRfcGlkKXtcblx0XHRcdGlmIChmaW5kX3BpZF9jb3VudCsrIDwgMyl7XG5cdFx0XHRcdGF3YWl0IGZpbmRfcGlkKCk7XG5cdFx0XHR9XG5cdFx0fSBlbHNlIHtcblx0XHRcdGNwdSA9IGF3YWl0IGdldENQVSgpO1xuXHRcdH1cblx0fVxuXHRjYXRjaChlKXtcblx0XHRjb25zb2xlLmxvZygnRmFpbGVkIHRvIGdldCBDUFUgdXNhZ2UnKTsgXG5cdFx0Zm91bmRfcGlkID0gZmFsc2U7XG5cdH1cblx0ZmluYWxseXtcblx0XHRpZighc3RvcHBlZCl7XG5cdFx0XHRjYWxsYmFjayhjcHUpO1xuXHRcdFx0dGltZW91dCA9IHNldFRpbWVvdXQodGltZW91dF9mdW5jLCAxMDAwKTtcblx0XHR9XG5cdH1cbn1cblxuYXN5bmMgZnVuY3Rpb24gZmluZF9waWQoKXtcblx0Ly8gdXNlIHBpZHRyZWUgdG8gZmluZCBhbGwgdGhlIGNoaWxkIHBpZHMgb2YgdGhlIHJvb3QgcHJvY2Vzc1xuXHRsZXQgcGlkcyA9IGF3YWl0IHBpZHRyZWUocm9vdF9waWQsIHtyb290OiB0cnVlfSk7XG5cdC8vIGxvb2sgdGhyb3VnaCB0aGUgcGlkcyB0byBzZWUgaWYgYW55IG9mIHRoZW0gYmVsb25nIHRvIGEgcHJvY2VzcyB3aXRoIHRoZSByaWdodCBuYW1lXG5cdGZvciAobGV0IHBpZCBvZiBwaWRzKXtcblx0XHRsZXQgdGVzdF9uYW1lID0gKGF3YWl0IG5hbWVfZnJvbV9waWQocGlkKSBhcyBzdHJpbmcpLnRyaW0oKTtcblx0XHRpZiAodGVzdF9uYW1lID09PSBuYW1lKXtcblx0XHRcdG1haW5fcGlkID0gcGlkO1xuXHRcdFx0Zm91bmRfcGlkID0gdHJ1ZTtcblx0XHR9XG5cdH1cbn1cblxuLy8gcmV0dXJucyB0aGUgbmFtZSBvZiB0aGUgcHJvY2VzcyBjb3JyZXNwb25kaW5nIHRvIHRoZSBwaWQgcGFzc2VkIGluIHRvIGl0XG5mdW5jdGlvbiBuYW1lX2Zyb21fcGlkKHBpZDogbnVtYmVyKXtcblx0cmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcblx0XHRjaGlsZF9wcm9jZXNzLmV4ZWMoJ3BzIC1wICcrcGlkKycgLW8gY29tbT0nLCAoZXJyLCBzdGRvdXQpID0+IHtcblx0XHRcdGlmIChlcnIpIHJlamVjdChlcnIpO1xuXHRcdFx0cmVzb2x2ZShzdGRvdXQpO1xuXHRcdH0pO1xuXHR9KTtcbn1cblxuZnVuY3Rpb24gZ2V0Q1BVKCl7XG5cdHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG5cdFx0Y2hpbGRfcHJvY2Vzcy5leGVjKCdwcyAtcCAnK21haW5fcGlkKycgLW8gJWNwdSAtLW5vLWhlYWRlcnMnLCAoZXJyLCBzdGRvdXQpID0+IHtcblx0XHRcdGlmIChlcnIpIHJlamVjdChlcnIpO1xuXHRcdFx0cmVzb2x2ZShzdGRvdXQpO1xuXHRcdH0pO1xuXHR9KTtcbn1cbiJdfQ==
