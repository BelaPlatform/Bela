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
    if (typeof (project) === "object") {
        project = project.join("");
    }
    else if (typeof (project) !== "string") {
        project = "";
    }
    name = project.substring(0, 15) || project[0].substring(0, 15);
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
