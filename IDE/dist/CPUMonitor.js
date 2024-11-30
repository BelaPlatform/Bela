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
var __values = (this && this.__values) || function (o) {
    var m = typeof Symbol === "function" && o[Symbol.iterator], i = 0;
    if (m) return m.call(o);
    return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
};
Object.defineProperty(exports, "__esModule", { value: true });
var child_process = require("child_process");
var pidtree = require("pidtree");
var bela_cpu = require("./bela-cpu");
// this module monitors the linux-domain CPU usage of a running bela process
// once it has found the correct pid it calls the callback passed to start()
// every second with the cpu usage as a parameter
var name;
var found_pid;
var root_pid;
var main_pid;
var callback;
var stopped;
var find_pid_count;
function start(pid, project, cb) {
    root_pid = pid;
    // the process name gets cut off at 15 chars
    name = project.substring(0, 15) || project[0].substring(0, 15);
    callback = cb;
    stopped = false;
    found_pid = false;
    find_pid_count = 0;
    setTimeout(loop, 1000);
}
exports.start = start;
function stop() {
    bela_cpu.stop();
    stopped = true;
}
exports.stop = stop;
// this function keeps trying every second to find the correct pid
// once it has, it uses ps to get the cpu usage, and calls the callback
function loop() {
    return __awaiter(this, void 0, void 0, function () {
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!!stopped) return [3 /*break*/, 7];
                    if (!!found_pid) return [3 /*break*/, 3];
                    if (!(find_pid_count++ < 5)) return [3 /*break*/, 2];
                    return [4 /*yield*/, find_pid()];
                case 1:
                    _a.sent();
                    _a.label = 2;
                case 2: return [3 /*break*/, 5];
                case 3: return [4 /*yield*/, bela_cpu.getCPU(main_pid, callback)];
                case 4:
                    _a.sent();
                    found_pid = false;
                    _a.label = 5;
                case 5: return [4 /*yield*/, (function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                        return [2 /*return*/, new Promise(function (resolve) { setTimeout(resolve, 1000); })];
                    }); }); })()];
                case 6:
                    _a.sent();
                    return [3 /*break*/, 0];
                case 7: return [2 /*return*/];
            }
        });
    });
}
function find_pid() {
    return __awaiter(this, void 0, void 0, function () {
        var pids, pids_1, pids_1_1, pid, test_name, e_1_1, e_1, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, pidtree(root_pid, { root: true })];
                case 1:
                    pids = _b.sent();
                    _b.label = 2;
                case 2:
                    _b.trys.push([2, 7, 8, 9]);
                    pids_1 = __values(pids), pids_1_1 = pids_1.next();
                    _b.label = 3;
                case 3:
                    if (!!pids_1_1.done) return [3 /*break*/, 6];
                    pid = pids_1_1.value;
                    return [4 /*yield*/, name_from_pid(pid)];
                case 4:
                    test_name = (_b.sent()).trim();
                    if (test_name === name) {
                        main_pid = pid;
                        found_pid = true;
                    }
                    _b.label = 5;
                case 5:
                    pids_1_1 = pids_1.next();
                    return [3 /*break*/, 3];
                case 6: return [3 /*break*/, 9];
                case 7:
                    e_1_1 = _b.sent();
                    e_1 = { error: e_1_1 };
                    return [3 /*break*/, 9];
                case 8:
                    try {
                        if (pids_1_1 && !pids_1_1.done && (_a = pids_1.return)) _a.call(pids_1);
                    }
                    finally { if (e_1) throw e_1.error; }
                    return [7 /*endfinally*/];
                case 9: return [2 /*return*/];
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
