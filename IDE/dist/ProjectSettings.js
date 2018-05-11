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
var paths = require("./paths");
var file_manager = require("./FileManager");
var Lock_1 = require("./Lock");
var lock = new Lock_1.Lock();
function read(project) {
    return __awaiter(this, void 0, void 0, function () {
        var output;
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
function setCLArg(project, key, value) {
    return __awaiter(this, void 0, void 0, function () {
        var settings, e_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    lock.acquire();
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, read(project)];
                case 2:
                    settings = _a.sent();
                    settings.CLArgs[key] = value;
                    write(project, settings);
                    return [3 /*break*/, 4];
                case 3:
                    e_1 = _a.sent();
                    lock.release();
                    throw e_1;
                case 4:
                    lock.release();
                    return [2 /*return*/, settings];
            }
        });
    });
}
exports.setCLArg = setCLArg;
function restoreDefaultCLArgs(project) {
    return __awaiter(this, void 0, void 0, function () {
        var settings, e_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    lock.acquire();
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, read(project)];
                case 2:
                    settings = _a.sent();
                    settings.CLArgs = default_project_settings().CLArgs;
                    write(project, settings);
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,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O0tBQ04sQ0FBQztBQUNILENBQUMiLCJmaWxlIjoiUHJvamVjdFNldHRpbmdzLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgcGF0aHMgZnJvbSAnLi9wYXRocyc7XG5pbXBvcnQgKiBhcyBmaWxlX21hbmFnZXIgZnJvbSBcIi4vRmlsZU1hbmFnZXJcIjtcbmltcG9ydCB7IExvY2sgfSBmcm9tIFwiLi9Mb2NrXCI7XG5cbnZhciBsb2NrOiBMb2NrID0gbmV3IExvY2soKTtcblx0XG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVhZChwcm9qZWN0OiBzdHJpbmcpOiBQcm9taXNlPGFueT4ge1xuXHRsZXQgb3V0cHV0OiBhbnkgPSBhd2FpdCBmaWxlX21hbmFnZXIucmVhZF9qc29uKHBhdGhzLnByb2plY3RzK3Byb2plY3QrJy9zZXR0aW5ncy5qc29uJylcblx0XHQuY2F0Y2goIGUgPT4ge1xuXHRcdFx0Ly8gY29uc29sZS5sb2coJ2Vycm9yIHJlYWRpbmcgcHJvamVjdCAnK3Byb2plY3QrJyBzZXR0aW5ncy5qc29uJywgKGUubWVzc2FnZSA/IGUubWVzc2FnZSA6IG51bGwpKTtcblx0XHRcdC8vIGNvbnNvbGUubG9nKCdyZWNyZWF0aW5nIGRlZmF1bHQgc2V0dGluZ3MuanNvbicpO1xuXHRcdFx0cmV0dXJuIHdyaXRlKHByb2plY3QsIGRlZmF1bHRfcHJvamVjdF9zZXR0aW5ncygpKTtcblx0XHR9KTtcblx0cmV0dXJuIG91dHB1dDtcbn1cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiB3cml0ZShwcm9qZWN0OiBzdHJpbmcsIGRhdGE6IGFueSk6IFByb21pc2U8YW55PiB7XG5cdGF3YWl0IGZpbGVfbWFuYWdlci53cml0ZV9qc29uKHBhdGhzLnByb2plY3RzK3Byb2plY3QrJy9zZXR0aW5ncy5qc29uJywgZGF0YSk7XG5cdHJldHVybiBkYXRhO1xufVxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHNldENMQXJnKHByb2plY3Q6IHN0cmluZywga2V5OiBzdHJpbmcsIHZhbHVlOiBzdHJpbmcpOiBQcm9taXNlPGFueT4ge1xuXHRsb2NrLmFjcXVpcmUoKTtcblx0dHJ5e1xuXHRcdHZhciBzZXR0aW5ncyA9IGF3YWl0IHJlYWQocHJvamVjdCk7XG5cdFx0c2V0dGluZ3MuQ0xBcmdzW2tleV0gPSB2YWx1ZTtcblx0XHR3cml0ZShwcm9qZWN0LCBzZXR0aW5ncyk7XG5cdH1cblx0Y2F0Y2goZSl7XG5cdFx0bG9jay5yZWxlYXNlKCk7XG5cdFx0dGhyb3cgZTtcblx0fVxuXHRsb2NrLnJlbGVhc2UoKTtcblx0cmV0dXJuIHNldHRpbmdzO1xufVxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJlc3RvcmVEZWZhdWx0Q0xBcmdzKHByb2plY3Q6IHN0cmluZyk6IFByb21pc2U8YW55PiB7XG5cdGxvY2suYWNxdWlyZSgpO1xuXHR0cnl7XG5cdFx0dmFyIHNldHRpbmdzID0gYXdhaXQgcmVhZChwcm9qZWN0KTtcblx0XHRzZXR0aW5ncy5DTEFyZ3MgPSBkZWZhdWx0X3Byb2plY3Rfc2V0dGluZ3MoKS5DTEFyZ3M7XG5cdFx0d3JpdGUocHJvamVjdCwgc2V0dGluZ3MpO1xuXHR9XG5cdGNhdGNoKGUpe1xuXHRcdGxvY2sucmVsZWFzZSgpO1xuXHRcdHRocm93IGU7XG5cdH1cblx0bG9jay5yZWxlYXNlKCk7XG5cdHJldHVybiBzZXR0aW5ncztcbn1cblxuZnVuY3Rpb24gZGVmYXVsdF9wcm9qZWN0X3NldHRpbmdzKCl7XG5cdGxldCBDTEFyZ3MgPSB7XG5cdFx0XCItcFwiOiBcIjE2XCIsXHRcdC8vIGF1ZGlvIGJ1ZmZlciBzaXplXG5cdFx0XCItQ1wiOiBcIjhcIixcdFx0Ly8gbm8uIGFuYWxvZyBjaGFubmVsc1xuXHRcdFwiLUJcIjogXCIxNlwiLFx0XHQvLyBuby4gZGlnaXRhbCBjaGFubmVsc1xuXHRcdFwiLUhcIjogXCItNlwiLFx0XHQvLyBoZWFkcGhvbmUgbGV2ZWwgKGRCKVxuXHRcdFwiLU5cIjogXCIxXCIsXHRcdC8vIHVzZSBhbmFsb2dcblx0XHRcIi1HXCI6IFwiMVwiLFx0XHQvLyB1c2UgZGlnaXRhbFxuXHRcdFwiLU1cIjogXCIwXCIsIFx0XHQvLyBtdXRlIHNwZWFrZXJcblx0XHRcIi1EXCI6IFwiMFwiLFx0XHQvLyBkYWMgbGV2ZWxcblx0XHRcIi1BXCI6IFwiMFwiLCBcdFx0Ly8gYWRjIGxldmVsXG5cdFx0XCItLXBnYS1nYWluLWxlZnRcIjogXCIxMFwiLFxuXHRcdFwiLS1wZ2EtZ2Fpbi1yaWdodFwiOiBcIjEwXCIsXG5cdFx0XCJ1c2VyXCI6ICcnLFx0XHQvLyB1c2VyLWRlZmluZWQgY2xhcmdzXG5cdFx0XCJtYWtlXCI6ICcnLFx0XHQvLyB1c2VyLWRlZmluZWQgTWFrZWZpbGUgcGFyYW1ldGVyc1xuXHRcdFwiLVhcIjogXCIwXCIsXHRcdC8vIG11bHRpcGxleGVyIGNhcGVsZXRcblx0XHRcImF1ZGlvRXhwYW5kZXJcIjogXCIwXCIsXHQvLyBhdWRpbyBleHBhbmRlciBjYXBlbGV0XG5cdFx0XCItWVwiOiBcIlwiLFx0XHQvLyBhdWRpbyBleHBhbmRlciBpbnB1dHNcblx0XHRcIi1aXCI6IFwiXCJcdFx0Ly8gYXVkaW8gZXhwYW5kZXIgb3V0cHV0c1xuXHR9O1xuXHRyZXR1cm4ge1xuXHRcdFwiZmlsZU5hbWVcIlx0XHQ6IFwicmVuZGVyLmNwcFwiLFxuXHRcdENMQXJnc1xuXHR9O1xufVxuIl19
