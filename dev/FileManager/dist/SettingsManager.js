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
var paths_1 = require("./paths");
var FileManager_1 = require("./FileManager");
var Lock_1 = require("./Lock");
var ProjectSettings = /** @class */ (function () {
    function ProjectSettings() {
        this.lock = new Lock_1.Lock();
    }
    ProjectSettings.prototype.read = function (project) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            var output;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, FileManager_1.fm.read_json(paths_1.paths.projects + project + '/settings.json')
                            .catch(function (e) {
                            // console.log('error reading project '+project+' settings.json', (e.message ? e.message : null));
                            // console.log('recreating default settings.json');
                            return _this.write(project, default_project_settings());
                        })];
                    case 1:
                        output = _a.sent();
                        return [2 /*return*/, output];
                }
            });
        });
    };
    ProjectSettings.prototype.write = function (project, data) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, FileManager_1.fm.write_json(paths_1.paths.projects + project + '/settings.json', data)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/, data];
                }
            });
        });
    };
    ProjectSettings.prototype.setCLArg = function (project, key, value) {
        return __awaiter(this, void 0, void 0, function () {
            var settings, e_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.lock.acquire();
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.read(project)];
                    case 2:
                        settings = _a.sent();
                        settings.CLArgs[key] = value;
                        this.write(project, settings);
                        return [3 /*break*/, 4];
                    case 3:
                        e_1 = _a.sent();
                        this.lock.release();
                        throw e_1;
                    case 4:
                        this.lock.release();
                        return [2 /*return*/, settings];
                }
            });
        });
    };
    return ProjectSettings;
}());
function default_project_settings() {
    var CLArgs = {
        "-p": "16",
        "-C": "8",
        "-B": "16",
        "-H": "-6",
        "-N": "1",
        "-G": "1",
        "-M": "0",
        "-D": "0",
        "-A": "0",
        "--pga-gain-left": "10",
        "--pga-gain-right": "10",
        "user": '',
        "make": '',
        "-X": "0",
        "audioExpander": "0",
        "-Y": "",
        "-Z": "" // audio expander outputs
    };
    return {
        "fileName": "render.cpp",
        CLArgs: CLArgs
    };
}
var p_settings = new ProjectSettings();
exports.p_settings = p_settings;
