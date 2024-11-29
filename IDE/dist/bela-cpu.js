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
var _this = this;
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs");
var xenomaiStatPath = '/proc/xenomai/sched/stat';
// small utilities to minimise dependencies
function getFile(file) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, new Promise(function (resolve, reject) {
                    fs.readFile(file, 'utf8', function (err, data) {
                        resolve(err ? null : data);
                    });
                })];
        });
    });
}
function getLine(file, match) {
    return __awaiter(this, void 0, void 0, function () {
        var _this = this;
        return __generator(this, function (_a) {
            return [2 /*return*/, new Promise(function (resolve, reject) { return __awaiter(_this, void 0, void 0, function () {
                    var data, line;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, getFile(file)];
                            case 1:
                                data = _a.sent();
                                if (!data) {
                                    resolve(null);
                                    return [2 /*return*/];
                                }
                                line = data.match(match);
                                if (!line) {
                                    resolve(null);
                                    return [2 /*return*/];
                                }
                                resolve(line.toString());
                                return [2 /*return*/];
                        }
                    });
                }); })];
        });
    });
}
function computeCPU(xenomaiStat, linux) {
    var nameIndex = 8;
    var CPUIndex = 7;
    var rootName = '[ROOT]';
    var IRQName = '[IRQ16:';
    var NORMAL_MSW = 1;
    var xenomaiCPU = 0;
    var rootCPU = 1;
    var msw = 0;
    // extract the data from the output
    var lines = xenomaiStat.split('\n');
    var taskData = [];
    for (var j = 0; j < lines.length; j++) {
        taskData.push([]);
        var elements = lines[j].split(' ');
        for (var k = 0; k < elements.length; k++) {
            if (elements[k]) {
                taskData[j].push(elements[k]);
            }
        }
    }
    var output = [];
    var audioThreadCpu = 0;
    for (var j = 0; j < taskData.length; j++) {
        if (taskData[j].length) {
            var proc = {
                'name': taskData[j][nameIndex],
                'cpu': parseFloat(taskData[j][CPUIndex]),
                'msw': parseInt(taskData[j][2]),
            };
            if (proc.name === rootName)
                rootCPU = proc.cpu * 0.01;
            if (proc.name === 'bela-audio') {
                msw = Math.max(0, proc.msw - NORMAL_MSW);
                audioThreadCpu = proc.cpu;
            }
            // ignore uninteresting data
            if (proc && proc.name && proc.name !== rootName && proc.name !== 'NAME' && proc.name !== IRQName) {
                output.push(proc);
            }
        }
    }
    for (var j = 0; j < output.length; j++) {
        xenomaiCPU += output[j].cpu;
    }
    var cpu = xenomaiCPU + linux * rootCPU;
    return ({ cpu: cpu, audioThreadCpu: audioThreadCpu, msw: msw });
}
// https://stackoverflow.com/a/12604028/2958741
function getStat(procstat, proctidstat) {
    return __awaiter(this, void 0, void 0, function () {
        var globalStat, stat, items, time, cpu;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, getFile(procstat)];
                case 1:
                    globalStat = _a.sent();
                    return [4 /*yield*/, getFile(proctidstat)];
                case 2:
                    stat = _a.sent();
                    if (!stat || !globalStat)
                        return [2 /*return*/, null];
                    items = globalStat.split('\n');
                    if (items.length < 1)
                        return [2 /*return*/, null];
                    items = items[0].replace(/\s+/g, ' ').split(' ');
                    time = parseInt(items[1]) + parseInt(items[2]) + parseInt(items[3]) + parseInt(items[4]);
                    items = stat.split(' ');
                    if (items.length < 14)
                        return [2 /*return*/, null];
                    cpu = parseInt(items[14]) + parseInt(items[15]);
                    return [2 /*return*/, { time: time, cpu: cpu }];
            }
        });
    });
}
var shouldStop;
function stop() {
    shouldStop = true;
}
exports.stop = stop;
function getCPU(tid, callback) {
    return __awaiter(this, void 0, void 0, function () {
        var _this = this;
        var procstat, proctidstat, oldStat;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    procstat = '/proc/stat';
                    proctidstat = "/proc/" + tid + "/stat";
                    return [4 /*yield*/, getStat(procstat, proctidstat)];
                case 1:
                    oldStat = _a.sent();
                    shouldStop = false;
                    return [4 /*yield*/, (function () { return __awaiter(_this, void 0, void 0, function () {
                            var stat, cpuDiff, timeDiff, xstat, res;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        if (!!shouldStop) return [3 /*break*/, 4];
                                        return [4 /*yield*/, delay(1000)];
                                    case 1:
                                        _a.sent();
                                        if (shouldStop)
                                            return [3 /*break*/, 4];
                                        return [4 /*yield*/, getStat(procstat, proctidstat)];
                                    case 2:
                                        stat = _a.sent();
                                        if (!stat)
                                            return [3 /*break*/, 4];
                                        cpuDiff = stat.cpu - oldStat.cpu;
                                        timeDiff = stat.time - oldStat.time;
                                        oldStat = stat;
                                        return [4 /*yield*/, getFile(xenomaiStatPath)];
                                    case 3:
                                        xstat = _a.sent();
                                        res = computeCPU(xstat, cpuDiff / timeDiff * 100);
                                        if (shouldStop)
                                            return [3 /*break*/, 4];
                                        callback(res);
                                        return [3 /*break*/, 0];
                                    case 4: return [2 /*return*/];
                                }
                            });
                        }); })()];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.getCPU = getCPU;
function findTid() {
    return __awaiter(this, void 0, void 0, function () {
        var line, tid;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, getLine(xenomaiStatPath, /.*bela-audio.*/)];
                case 1:
                    line = _a.sent();
                    if (!line)
                        return [2 /*return*/, -1];
                    tid = line.replace(/[\t\s]+/g, ' ').trim().split(' ')[1];
                    return [2 /*return*/, parseInt(tid)];
            }
        });
    });
}
exports.findTid = findTid;
var delay = function (ms) { return __awaiter(_this, void 0, void 0, function () {
    return __generator(this, function (_a) {
        return [2 /*return*/, new Promise(function (resolve) {
                setTimeout(resolve, ms);
            })];
    });
}); };
if (!module.parent) {
    // if running stand-alone (not imported)
    (function () { return __awaiter(_this, void 0, void 0, function () {
        var tid;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!1) return [3 /*break*/, 5];
                    return [4 /*yield*/, findTid()];
                case 1:
                    tid = _a.sent();
                    if (!(tid >= 0)) return [3 /*break*/, 3];
                    return [4 /*yield*/, getCPU(tid, function (stat) {
                            console.log(stat.msw + ' ' + stat.cpu.toFixed(1) + '% ' + stat.audioThreadCpu.toFixed(1) + '%');
                        })];
                case 2:
                    _a.sent();
                    _a.label = 3;
                case 3: return [4 /*yield*/, delay(1000)];
                case 4:
                    _a.sent();
                    return [3 /*break*/, 0];
                case 5: return [2 /*return*/];
            }
        });
    }); })();
}
