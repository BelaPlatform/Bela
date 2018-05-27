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
function setCLArg(data) {
    return __awaiter(this, void 0, void 0, function () {
        var settings, e_1;
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
                    settings.CLArgs[data.key] = data.value;
                    write(data.currentProject, settings);
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
        var CLArgs, CL, key, make, makeArgs, _i, makeArgs_1, arg;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, read(project)];
                case 1:
                    CLArgs = (_a.sent()).CLArgs;
                    CL = '';
                    for (key in CLArgs) {
                        if (key[0] === '-' && key[1] === '-') {
                            CL += key + '=' + CLArgs[key] + ' ';
                        }
                        else if (key === 'user') {
                            CL += CLArgs[key] + ' ';
                        }
                        else if (key !== 'make' && key !== 'audioExpander' && CLArgs[key] !== '') {
                            CL += key + CLArgs[key] + ' ';
                        }
                    }
                    make = '';
                    if (CLArgs.make && CLArgs.make.split) {
                        makeArgs = CLArgs.make.split(';');
                        for (_i = 0, makeArgs_1 = makeArgs; _i < makeArgs_1.length; _i++) {
                            arg = makeArgs_1[_i];
                            arg = arg.trim();
                            if (arg.length > 0) {
                                make += arg + ' ';
                            }
                        }
                    }
                    CL = CL.trim();
                    make = make.trim();
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
exports.default_project_settings = default_project_settings;

//# sourceMappingURL=data:application/json;charset=utf8;base64,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QUksTUFBQSxFQUFDLEVBQUM7Ozs7Q0FDbEI7QUF6QkQsMEJBeUJDO0FBR0Q7SUFDQyxJQUFJLE1BQU0sR0FBRztRQUNaLElBQUksRUFBRSxJQUFJO1FBQ1YsSUFBSSxFQUFFLEdBQUc7UUFDVCxJQUFJLEVBQUUsSUFBSTtRQUNWLElBQUksRUFBRSxJQUFJO1FBQ1YsSUFBSSxFQUFFLEdBQUc7UUFDVCxJQUFJLEVBQUUsR0FBRztRQUNULElBQUksRUFBRSxHQUFHO1FBQ1QsSUFBSSxFQUFFLEdBQUc7UUFDVCxJQUFJLEVBQUUsR0FBRztRQUNULGlCQUFpQixFQUFFLElBQUk7UUFDdkIsa0JBQWtCLEVBQUUsSUFBSTtRQUN4QixNQUFNLEVBQUUsRUFBRTtRQUNWLE1BQU0sRUFBRSxFQUFFO1FBQ1YsSUFBSSxFQUFFLEdBQUc7UUFDVCxlQUFlLEVBQUUsR0FBRztRQUNwQixJQUFJLEVBQUUsRUFBRTtRQUNSLElBQUksRUFBRSxFQUFFLENBQUUseUJBQXlCO0tBQ25DLENBQUM7SUFDRixPQUFPO1FBQ04sVUFBVSxFQUFJLFlBQVk7UUFDMUIsTUFBTSxRQUFBO0tBQ04sQ0FBQztBQUNILENBQUM7QUF4QkQsNERBd0JDIiwiZmlsZSI6IlByb2plY3RTZXR0aW5ncy5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIHBhdGhzIGZyb20gJy4vcGF0aHMnO1xuaW1wb3J0ICogYXMgZmlsZV9tYW5hZ2VyIGZyb20gXCIuL0ZpbGVNYW5hZ2VyXCI7XG5pbXBvcnQgeyBMb2NrIH0gZnJvbSBcIi4vTG9ja1wiO1xuXG52YXIgbG9jazogTG9jayA9IG5ldyBMb2NrKCk7XG5cdFxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJlYWQocHJvamVjdDogc3RyaW5nKTogUHJvbWlzZTxhbnk+IHtcblx0bGV0IG91dHB1dDogYW55ID0gYXdhaXQgZmlsZV9tYW5hZ2VyLnJlYWRfanNvbihwYXRocy5wcm9qZWN0cytwcm9qZWN0Kycvc2V0dGluZ3MuanNvbicpXG5cdFx0LmNhdGNoKCBlID0+IHtcblx0XHRcdC8vIGNvbnNvbGUubG9nKCdlcnJvciByZWFkaW5nIHByb2plY3QgJytwcm9qZWN0Kycgc2V0dGluZ3MuanNvbicsIChlLm1lc3NhZ2UgPyBlLm1lc3NhZ2UgOiBudWxsKSk7XG5cdFx0XHQvLyBjb25zb2xlLmxvZygncmVjcmVhdGluZyBkZWZhdWx0IHNldHRpbmdzLmpzb24nKTtcblx0XHRcdHJldHVybiB3cml0ZShwcm9qZWN0LCBkZWZhdWx0X3Byb2plY3Rfc2V0dGluZ3MoKSk7XG5cdFx0fSk7XG5cdHJldHVybiBvdXRwdXQ7XG59XG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gd3JpdGUocHJvamVjdDogc3RyaW5nLCBkYXRhOiBhbnkpOiBQcm9taXNlPGFueT4ge1xuXHRhd2FpdCBmaWxlX21hbmFnZXIud3JpdGVfanNvbihwYXRocy5wcm9qZWN0cytwcm9qZWN0Kycvc2V0dGluZ3MuanNvbicsIGRhdGEpO1xuXHRyZXR1cm4gZGF0YTtcbn1cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBzZXRDTEFyZyhkYXRhOiBhbnkpOiBQcm9taXNlPGFueT4ge1xuXHRsb2NrLmFjcXVpcmUoKTtcblx0dHJ5e1xuXHRcdHZhciBzZXR0aW5ncyA9IGF3YWl0IHJlYWQoZGF0YS5jdXJyZW50UHJvamVjdCk7XG5cdFx0c2V0dGluZ3MuQ0xBcmdzW2RhdGEua2V5XSA9IGRhdGEudmFsdWU7XG5cdFx0d3JpdGUoZGF0YS5jdXJyZW50UHJvamVjdCwgc2V0dGluZ3MpO1xuXHR9XG5cdGNhdGNoKGUpe1xuXHRcdGxvY2sucmVsZWFzZSgpO1xuXHRcdHRocm93IGU7XG5cdH1cblx0bG9jay5yZWxlYXNlKCk7XG5cdHJldHVybiBzZXR0aW5ncztcbn1cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBzZXRfZmlsZU5hbWUocHJvamVjdDogc3RyaW5nLCBmaWxlTmFtZTogc3RyaW5nKXtcblx0bG9jay5hY3F1aXJlKCk7XG5cdHRyeXtcblx0XHRsZXQgc2V0dGluZ3MgPSBhd2FpdCByZWFkKHByb2plY3QpO1xuXHRcdHNldHRpbmdzLmZpbGVOYW1lID0gZmlsZU5hbWU7XG5cdFx0d3JpdGUocHJvamVjdCwgc2V0dGluZ3MpO1xuXHR9XG5cdGZpbmFsbHl7XG5cdFx0bG9jay5yZWxlYXNlKCk7XG5cdH1cbn1cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZXN0b3JlRGVmYXVsdENMQXJncyhkYXRhOiBhbnkpOiBQcm9taXNlPGFueT4ge1xuXHRsb2NrLmFjcXVpcmUoKTtcblx0dHJ5e1xuXHRcdHZhciBzZXR0aW5ncyA9IGF3YWl0IHJlYWQoZGF0YS5jdXJyZW50UHJvamVjdCk7XG5cdFx0c2V0dGluZ3MuQ0xBcmdzID0gZGVmYXVsdF9wcm9qZWN0X3NldHRpbmdzKCkuQ0xBcmdzO1xuXHRcdHdyaXRlKGRhdGEuY3VycmVudFByb2plY3QsIHNldHRpbmdzKTtcblx0fVxuXHRjYXRjaChlKXtcblx0XHRsb2NrLnJlbGVhc2UoKTtcblx0XHR0aHJvdyBlO1xuXHR9XG5cdGxvY2sucmVsZWFzZSgpO1xuXHRyZXR1cm4gc2V0dGluZ3M7XG59XG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ2V0QXJncyhwcm9qZWN0OiBhbnkpOiBQcm9taXNlPHtDTDogc3RyaW5nLCBtYWtlOiBzdHJpbmd9PiB7XG5cdGxldCBDTEFyZ3MgPSAoYXdhaXQgcmVhZChwcm9qZWN0KSkuQ0xBcmdzO1xuXHRsZXQgQ0w6IHN0cmluZyA9ICcnO1xuXHRmb3IgKGxldCBrZXkgaW4gQ0xBcmdzKSB7XG5cdFx0aWYgKGtleVswXSA9PT0gJy0nICYmIGtleVsxXSA9PT0gJy0nKXtcblx0XHRcdENMICs9IGtleSsnPScrQ0xBcmdzW2tleV0rJyAnO1xuXHRcdH0gZWxzZSBpZiAoa2V5ID09PSAndXNlcicpe1xuXHRcdFx0Q0wgKz0gQ0xBcmdzW2tleV0rJyAnO1xuXHRcdH0gZWxzZSBpZiAoa2V5ICE9PSAnbWFrZScgJiYga2V5ICE9PSAnYXVkaW9FeHBhbmRlcicgJiYgQ0xBcmdzW2tleV0gIT09ICcnKXtcblx0XHRcdENMICs9IGtleStDTEFyZ3Nba2V5XSsnICc7XG5cdFx0fVxuXHR9XG5cdGxldCBtYWtlOiBzdHJpbmcgPSAnJzsgXG5cdGlmIChDTEFyZ3MubWFrZSAmJiBDTEFyZ3MubWFrZS5zcGxpdCl7XG5cdFx0bGV0IG1ha2VBcmdzID0gQ0xBcmdzLm1ha2Uuc3BsaXQoJzsnKTtcblx0XHRmb3IgKGxldCBhcmcgb2YgbWFrZUFyZ3Mpe1xuXHRcdFx0YXJnID0gYXJnLnRyaW0oKTtcblx0XHRcdGlmKGFyZy5sZW5ndGggPiAwKXtcblx0XHRcdFx0bWFrZSArPSBhcmcrJyAnO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxuXHRDTCA9IENMLnRyaW0oKTtcblx0bWFrZSA9IG1ha2UudHJpbSgpO1xuXHRyZXR1cm4ge0NMLCBtYWtlfTtcbn1cblxuXG5leHBvcnQgZnVuY3Rpb24gZGVmYXVsdF9wcm9qZWN0X3NldHRpbmdzKCl7XG5cdGxldCBDTEFyZ3MgPSB7XG5cdFx0XCItcFwiOiBcIjE2XCIsXHRcdC8vIGF1ZGlvIGJ1ZmZlciBzaXplXG5cdFx0XCItQ1wiOiBcIjhcIixcdFx0Ly8gbm8uIGFuYWxvZyBjaGFubmVsc1xuXHRcdFwiLUJcIjogXCIxNlwiLFx0XHQvLyBuby4gZGlnaXRhbCBjaGFubmVsc1xuXHRcdFwiLUhcIjogXCItNlwiLFx0XHQvLyBoZWFkcGhvbmUgbGV2ZWwgKGRCKVxuXHRcdFwiLU5cIjogXCIxXCIsXHRcdC8vIHVzZSBhbmFsb2dcblx0XHRcIi1HXCI6IFwiMVwiLFx0XHQvLyB1c2UgZGlnaXRhbFxuXHRcdFwiLU1cIjogXCIwXCIsIFx0XHQvLyBtdXRlIHNwZWFrZXJcblx0XHRcIi1EXCI6IFwiMFwiLFx0XHQvLyBkYWMgbGV2ZWxcblx0XHRcIi1BXCI6IFwiMFwiLCBcdFx0Ly8gYWRjIGxldmVsXG5cdFx0XCItLXBnYS1nYWluLWxlZnRcIjogXCIxMFwiLFxuXHRcdFwiLS1wZ2EtZ2Fpbi1yaWdodFwiOiBcIjEwXCIsXG5cdFx0XCJ1c2VyXCI6ICcnLFx0XHQvLyB1c2VyLWRlZmluZWQgY2xhcmdzXG5cdFx0XCJtYWtlXCI6ICcnLFx0XHQvLyB1c2VyLWRlZmluZWQgTWFrZWZpbGUgcGFyYW1ldGVyc1xuXHRcdFwiLVhcIjogXCIwXCIsXHRcdC8vIG11bHRpcGxleGVyIGNhcGVsZXRcblx0XHRcImF1ZGlvRXhwYW5kZXJcIjogXCIwXCIsXHQvLyBhdWRpbyBleHBhbmRlciBjYXBlbGV0XG5cdFx0XCItWVwiOiBcIlwiLFx0XHQvLyBhdWRpbyBleHBhbmRlciBpbnB1dHNcblx0XHRcIi1aXCI6IFwiXCJcdFx0Ly8gYXVkaW8gZXhwYW5kZXIgb3V0cHV0c1xuXHR9O1xuXHRyZXR1cm4ge1xuXHRcdFwiZmlsZU5hbWVcIlx0XHQ6IFwicmVuZGVyLmNwcFwiLFxuXHRcdENMQXJnc1xuXHR9O1xufVxuIl19
