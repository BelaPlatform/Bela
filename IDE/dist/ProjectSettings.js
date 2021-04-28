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
var paths = require("./paths");
var file_manager = require("./FileManager");
var Lock_1 = require("./Lock");
var lock = new Lock_1.Lock("ProjectSettings");
var maxHp = 8;
var maxInputGains = 8;
function read(project) {
    return __awaiter(this, void 0, void 0, function () {
        var output, key, n, n, n;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, file_manager.read_json(paths.projects + project + '/settings.json')
                        .catch(function (e) {
                        // console.log('error reading project '+project+' settings.json', (e.message ? e.message : null));
                        // console.log('recreating default settings.json');
                        return write(project, default_project_settings());
                    })];
                case 1:
                    output = _a.sent();
                    // backwards compatibility: update legacy command lines
                    for (key in output.CLArgs) {
                        if (key === '-H') {
                            for (n = 0; n < maxHp; ++n)
                                output.CLArgs["-H" + n + ","] = output.CLArgs[key];
                            delete output.CLArgs[key];
                        }
                        else if (key.match(/^--pga-left/)) {
                            for (n = 0; n < maxInputGains; n += 2)
                                output.CLArgs["-I" + n + ","] = output.CLArgs[key];
                            delete output.CLArgs[key];
                        }
                        else if (key.match(/^--pga-right/)) {
                            for (n = 1; n < maxInputGains; n += 2)
                                output.CLArgs["-I" + n + ","] = output.CLArgs[key];
                            delete output.CLArgs[key];
                        }
                    }
                    return [2 /*return*/, output];
            }
        });
    });
}
exports.read = read;
function write(project, data) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, file_manager.write_json(paths.projects + project + '/settings.json', data)];
                case 1:
                    _a.sent();
                    return [2 /*return*/, data];
            }
        });
    });
}
exports.write = write;
function setCLArg(data) {
    return __awaiter(this, void 0, void 0, function () {
        var newData;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    newData = data;
                    newData.args = [
                        { key: data.key, value: data.value }
                    ];
                    delete newData.key;
                    delete newData.value;
                    return [4 /*yield*/, setCLArgs(newData)];
                case 1: return [2 /*return*/, _a.sent()];
            }
        });
    });
}
exports.setCLArg = setCLArg;
function setCLArgs(data) {
    return __awaiter(this, void 0, void 0, function () {
        var settings, _a, _b, item, e_1, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    lock.acquire();
                    _d.label = 1;
                case 1:
                    _d.trys.push([1, , 3, 4]);
                    return [4 /*yield*/, read(data.currentProject)];
                case 2:
                    settings = _d.sent();
                    try {
                        for (_a = __values(data.args), _b = _a.next(); !_b.done; _b = _a.next()) {
                            item = _b.value;
                            if ("undefined" === typeof (settings.CLArgs))
                                settings.CLArgs = {};
                            settings.CLArgs[item.key] = item.value;
                        }
                    }
                    catch (e_1_1) { e_1 = { error: e_1_1 }; }
                    finally {
                        try {
                            if (_b && !_b.done && (_c = _a.return)) _c.call(_a);
                        }
                        finally { if (e_1) throw e_1.error; }
                    }
                    write(data.currentProject, settings);
                    return [3 /*break*/, 4];
                case 3:
                    lock.release();
                    return [7 /*endfinally*/];
                case 4: return [2 /*return*/, settings];
            }
        });
    });
}
exports.setCLArgs = setCLArgs;
function set_fileName(project, fileName) {
    return __awaiter(this, void 0, void 0, function () {
        var settings;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    lock.acquire();
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, , 3, 4]);
                    return [4 /*yield*/, read(project)];
                case 2:
                    settings = _a.sent();
                    settings.fileName = fileName;
                    write(project, settings);
                    return [3 /*break*/, 4];
                case 3:
                    lock.release();
                    return [7 /*endfinally*/];
                case 4: return [2 /*return*/];
            }
        });
    });
}
exports.set_fileName = set_fileName;
function restoreDefaultCLArgs(data) {
    return __awaiter(this, void 0, void 0, function () {
        var settings, e_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    lock.acquire();
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, read(data.currentProject)];
                case 2:
                    settings = _a.sent();
                    settings.CLArgs = default_project_settings().CLArgs;
                    write(data.currentProject, settings);
                    return [3 /*break*/, 4];
                case 3:
                    e_2 = _a.sent();
                    lock.release();
                    throw e_2;
                case 4:
                    lock.release();
                    return [2 /*return*/, settings];
            }
        });
    });
}
exports.restoreDefaultCLArgs = restoreDefaultCLArgs;
function getArgs(project) {
    return __awaiter(this, void 0, void 0, function () {
        var CLArgs, CL, key, make;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, read(project)];
                case 1:
                    CLArgs = (_a.sent()).CLArgs;
                    if (!CLArgs)
                        return [2 /*return*/, { CL: "", make: [] }];
                    CL = '';
                    for (key in CLArgs) {
                        if (key[0] === '-' && key[1] === '-') {
                            if (key === '--disable-led') {
                                if (CLArgs[key] === 1)
                                    CL += key + ' ';
                            }
                            else {
                                CL += key + '=' + CLArgs[key] + ' ';
                            }
                        }
                        else if (key === 'user') {
                            CL += CLArgs[key] + ' ';
                        }
                        else if (key !== 'make' && key !== 'audioExpander' && CLArgs[key] !== '') {
                            CL += key + CLArgs[key] + ' ';
                        }
                    }
                    make = [];
                    if (CLArgs.make && CLArgs.make.split) {
                        make = CLArgs.make.split(';');
                    }
                    CL = CL.trim();
                    return [2 /*return*/, { CL: CL, make: make }];
            }
        });
    });
}
exports.getArgs = getArgs;
function default_project_settings() {
    var CLArgs = {
        "-p": "16",
        "-C": "8",
        "-B": "16",
        "-N": "1",
        "-G": "1",
        "-M": "0",
        // headphone level (dB)
        "-H0,": "-6",
        "-H1,": "-6",
        "-H2,": "-6",
        "-H3,": "-6",
        "-H4,": "-6",
        "-H5,": "-6",
        "-H6,": "-6",
        "-H7,": "-6",
        // input gain (dB)
        "-I0,": "10",
        "-I1,": "10",
        "-I2,": "10",
        "-I3,": "10",
        "-I4,": "10",
        "-I5,": "10",
        "-I6,": "10",
        "-I7,": "10",
        "user": '',
        "make": '',
        "-X": "0",
        "audioExpander": "0",
        "-Y": "",
        "-Z": "",
        "--disable-led": "0"
    };
    return {
        "fileName": "render.cpp",
        CLArgs: CLArgs
    };
}
exports.default_project_settings = default_project_settings;
