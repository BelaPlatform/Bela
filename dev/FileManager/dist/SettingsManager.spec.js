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
var chai_1 = require("chai");
var mock = require("mock-fs");
var SettingsManager_1 = require("../src/SettingsManager");
chai_1.should();
describe('SettingsManager', function () {
    describe('manage project settings json file', function () {
        describe('#read', function () {
            var test_obj = { 'test_key': 'test_field' };
            beforeEach(function () {
                mock({ '/root/Bela/projects/test_project/settings.json': JSON.stringify(test_obj) });
            });
            it('should return a project\'s settings.json', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var out;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, SettingsManager_1.p_settings.read('test_project')];
                            case 1:
                                out = _a.sent();
                                out.should.deep.equal(test_obj);
                                return [2 /*return*/];
                        }
                    });
                });
            });
            it('should create a default settings.json if one does not exist', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var out, out2;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, SettingsManager_1.p_settings.read('wrong_project')];
                            case 1:
                                out = _a.sent();
                                return [4 /*yield*/, SettingsManager_1.p_settings.read('wrong_project')];
                            case 2:
                                out2 = _a.sent();
                                out2.should.deep.equal(out);
                                out.fileName.should.equal('render.cpp');
                                out.CLArgs.should.be.a('object');
                                return [2 /*return*/];
                        }
                    });
                });
            });
            afterEach(function () {
                mock.restore();
            });
        });
        describe('#write', function () {
            var test_obj = { 'test_key': 'test_field' };
            before(function () {
                mock({});
            });
            it('should write a project\'s settings.json', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var out;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, SettingsManager_1.p_settings.write('test_project', test_obj)];
                            case 1:
                                _a.sent();
                                return [4 /*yield*/, SettingsManager_1.p_settings.read('test_project')];
                            case 2:
                                out = _a.sent();
                                test_obj.should.deep.equal(out);
                                return [2 /*return*/];
                        }
                    });
                });
            });
            after(function () {
                mock({});
            });
        });
    });
    describe('manage project settings', function () {
        describe('#setCLArg', function () {
            before(function () {
                mock({ '/root/Bela/projects/test_project/settings.json': JSON.stringify({ CLArgs: { 'old_key': 'old_value' } }) });
            });
            it('should set a single command line argument', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var settings;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, SettingsManager_1.p_settings.setCLArg('test_project', 'key', 'value')];
                            case 1:
                                settings = _a.sent();
                                settings.CLArgs['old_key'].should.equal('old_value');
                                settings.CLArgs['key'].should.equal('value');
                                return [2 /*return*/];
                        }
                    });
                });
            });
            after(function () {
                mock({});
            });
        });
    });
});
