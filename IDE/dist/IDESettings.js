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

//# sourceMappingURL=data:application/json;charset=utf8;base64,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RUFBSSxDQUFDO1FBQ3BCLGVBQWUsRUFBSSxDQUFDO1FBQ3BCLHNCQUFzQixFQUFHLENBQUM7UUFDMUIsZUFBZSxFQUFJLENBQUM7UUFDcEIsaUJBQWlCLEVBQUcsQ0FBQztLQUNyQixDQUFDO0FBQ0gsQ0FBQyIsImZpbGUiOiJJREVTZXR0aW5ncy5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGZpbGVfbWFuYWdlciBmcm9tICcuL0ZpbGVNYW5hZ2VyJztcbmltcG9ydCAqIGFzIHBhdGhzIGZyb20gJy4vcGF0aHMnO1xuaW1wb3J0IHsgTG9jayB9IGZyb20gJy4vTG9jayc7XG5cbnZhciBsb2NrOiBMb2NrID0gbmV3IExvY2soKTtcbmxldCBjYWNoZWQ6IGJvb2xlYW4gPSBmYWxzZTtcbmxldCBjYWNoZWRfc2V0dGluZ3M6IGFueTtcblx0XG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVhZCgpOiBQcm9taXNlPGFueT4ge1xuXHRpZiAoY2FjaGVkKSByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKGNhY2hlZF9zZXR0aW5ncyk7XG5cdGxldCBvdXRwdXQ6IGFueSA9IGF3YWl0IGZpbGVfbWFuYWdlci5yZWFkX2pzb24ocGF0aHMuaWRlX3NldHRpbmdzKVxuXHRcdC5jYXRjaCggZSA9PiB7XG5cdFx0XHQvLyBjb25zb2xlLmxvZygnZXJyb3IgcmVhZGluZyBJREUgc2V0dGluZ3MnLCAoZS5tZXNzYWdlID8gZS5tZXNzYWdlIDogbnVsbCkpO1xuXHRcdFx0Ly8gY29uc29sZS5sb2coJ3JlY3JlYXRpbmcgZGVmYXVsdCBzZXR0aW5ncycpO1xuXHRcdFx0cmV0dXJuIHdyaXRlKGRlZmF1bHRfSURFX3NldHRpbmdzKCkpO1xuXHRcdH0pO1xuXHRjYWNoZWRfc2V0dGluZ3MgPSBvdXRwdXQ7XG5cdGNhY2hlZCA9IHRydWU7XG5cdHJldHVybiBvdXRwdXQ7XG59XG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gd3JpdGUoZGF0YTogYW55KTogUHJvbWlzZTxhbnk+IHtcblx0Y2FjaGVkX3NldHRpbmdzID0gZGF0YTtcblx0Y2FjaGVkID0gdHJ1ZTtcblx0YXdhaXQgZmlsZV9tYW5hZ2VyLndyaXRlX2pzb24ocGF0aHMuaWRlX3NldHRpbmdzLCBkYXRhKTtcblx0cmV0dXJuIGRhdGE7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBzZXRJREVTZXR0aW5nKGRhdGE6IGFueSl7XG5cdGF3YWl0IGxvY2suYWNxdWlyZSgpO1xuXHR0cnl7XG5cdFx0dmFyIHNldHRpbmdzID0gYXdhaXQgcmVhZCgpO1xuXHRcdHNldHRpbmdzW2RhdGEua2V5XSA9IGRhdGEudmFsdWU7XG5cdFx0YXdhaXQgd3JpdGUoc2V0dGluZ3MpO1xuXHR9XG5cdGNhdGNoKGUpe1xuXHRcdGxvY2sucmVsZWFzZSgpO1xuXHRcdHRocm93IGU7XG5cdH1cblx0bG9jay5yZWxlYXNlKCk7XG5cdHJldHVybiBzZXR0aW5ncztcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldF9zZXR0aW5nKGtleTogc3RyaW5nKXtcblx0bGV0IHNldHRpbmdzID0gYXdhaXQgcmVhZCgpO1xuXHRyZXR1cm4gc2V0dGluZ3Nba2V5XTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJlc3RvcmVEZWZhdWx0SURFU2V0dGluZ3MoZGF0YTogYW55KXtcblx0YXdhaXQgbG9jay5hY3F1aXJlKCk7XG5cdHRyeXtcblx0XHRsZXQgc2V0dGluZ3MgPSBhd2FpdCByZWFkKCk7XG5cdFx0dmFyIG5ld1NldHRpbmdzID0gZGVmYXVsdF9JREVfc2V0dGluZ3MoKTtcblx0XHRuZXdTZXR0aW5ncy5wcm9qZWN0ID0gc2V0dGluZ3MucHJvamVjdDtcblx0XHRhd2FpdCB3cml0ZShuZXdTZXR0aW5ncyk7XG5cdH1cblx0Y2F0Y2goZSl7XG5cdFx0bG9jay5yZWxlYXNlKCk7XG5cdFx0dGhyb3cgZTtcblx0fVxuXHRsb2NrLnJlbGVhc2UoKTtcblx0cmV0dXJuIG5ld1NldHRpbmdzO1xufVxuXG5mdW5jdGlvbiBkZWZhdWx0X0lERV9zZXR0aW5ncygpe1xuXHRyZXR1cm4ge1xuXHRcdCdwcm9qZWN0J1x0XHQ6ICdiYXNpYycsXG5cdFx0J2xpdmVBdXRvY29tcGxldGlvbidcdDogMSxcblx0XHQnbGl2ZVN5bnRheENoZWNraW5nJ1x0OiAxLFxuXHRcdCd2ZXJib3NlRXJyb3JzJ1x0XHQ6IDAsXG5cdFx0J2NwdU1vbml0b3JpbmcnXHRcdDogMSxcblx0XHQnY3B1TW9uaXRvcmluZ1ZlcmJvc2UnXHQ6IDAsXG5cdFx0J2NvbnNvbGVEZWxldGUnXHRcdDogMCxcblx0XHQndmlld0hpZGRlbkZpbGVzJ1x0OiAwXG5cdH07XG59XG4iXX0=
