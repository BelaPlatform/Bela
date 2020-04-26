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
var file_manager = require("./FileManager");
var paths = require("./paths");
var Lock_1 = require("./Lock");
var lock = new Lock_1.Lock();
var cached = false;
var cached_settings;
function read() {
    return __awaiter(this, void 0, void 0, function () {
        var output;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (cached)
                        return [2 /*return*/, Promise.resolve(cached_settings)];
                    return [4 /*yield*/, file_manager.read_json(paths.ide_settings)
                            .catch(function (e) {
                            // console.log('error reading IDE settings', (e.message ? e.message : null));
                            // console.log('recreating default settings');
                            return write(default_IDE_settings());
                        })];
                case 1:
                    output = _a.sent();
                    cached_settings = output;
                    cached = true;
                    return [2 /*return*/, output];
            }
        });
    });
}
exports.read = read;
function write(data) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    cached_settings = data;
                    cached = true;
                    return [4 /*yield*/, file_manager.write_json(paths.ide_settings, data)];
                case 1:
                    _a.sent();
                    return [2 /*return*/, data];
            }
        });
    });
}
exports.write = write;
function setIDESetting(data) {
    return __awaiter(this, void 0, void 0, function () {
        var settings, e_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, lock.acquire()];
                case 1:
                    _a.sent();
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 5, , 6]);
                    return [4 /*yield*/, read()];
                case 3:
                    settings = _a.sent();
                    settings[data.key] = data.value;
                    return [4 /*yield*/, write(settings)];
                case 4:
                    _a.sent();
                    return [3 /*break*/, 6];
                case 5:
                    e_1 = _a.sent();
                    lock.release();
                    throw e_1;
                case 6:
                    lock.release();
                    return [2 /*return*/, settings];
            }
        });
    });
}
exports.setIDESetting = setIDESetting;
function get_setting(key) {
    return __awaiter(this, void 0, void 0, function () {
        var settings;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, read()];
                case 1:
                    settings = _a.sent();
                    return [2 /*return*/, settings[key]];
            }
        });
    });
}
exports.get_setting = get_setting;
function restoreDefaultIDESettings(data) {
    return __awaiter(this, void 0, void 0, function () {
        var settings, newSettings, e_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, lock.acquire()];
                case 1:
                    _a.sent();
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 5, , 6]);
                    return [4 /*yield*/, read()];
                case 3:
                    settings = _a.sent();
                    newSettings = default_IDE_settings();
                    newSettings.project = settings.project;
                    return [4 /*yield*/, write(newSettings)];
                case 4:
                    _a.sent();
                    return [3 /*break*/, 6];
                case 5:
                    e_2 = _a.sent();
                    lock.release();
                    throw e_2;
                case 6:
                    lock.release();
                    return [2 /*return*/, newSettings];
            }
        });
    });
}
exports.restoreDefaultIDESettings = restoreDefaultIDESettings;
function default_IDE_settings() {
    return {
        'project': 'basic',
        'liveAutocompletion': 1,
        'liveSyntaxChecking': 1,
        'verboseErrors': 0,
        'cpuMonitoring': 1,
        'cpuMonitoringVerbose': 0,
        'consoleDelete': 0,
        'viewHiddenFiles': 0
    };
}
