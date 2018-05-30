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
function setCLArgs(data) {
    return __awaiter(this, void 0, void 0, function () {
        var settings, _i, _a, item;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    lock.acquire();
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, , 3, 4]);
                    return [4 /*yield*/, read(data.currentProject)];
                case 2:
                    settings = _b.sent();
                    for (_i = 0, _a = data.args; _i < _a.length; _i++) {
                        item = _a[_i];
                        settings.CLArgs[item.key] = item.value;
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
        "-Z": "",
        "--disable-led": "0"
    };
    return {
        "fileName": "render.cpp",
        CLArgs: CLArgs
    };
}
exports.default_project_settings = default_project_settings;

//# sourceMappingURL=data:application/json;charset=utf8;base64,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MUUsRUFBRSxJQUFJLEdBQUcsR0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLEdBQUMsR0FBRyxDQUFDO3lCQUMxQjtxQkFDRDtvQkFDRyxJQUFJLEdBQWEsRUFBRSxDQUFDO29CQUN4QixJQUFJLE1BQU0sQ0FBQyxJQUFJLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUM7d0JBQ3BDLElBQUksR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztxQkFDOUI7b0JBQ0QsRUFBRSxHQUFHLEVBQUUsQ0FBQyxJQUFJLEVBQUUsQ0FBQztvQkFDZixzQkFBTyxFQUFDLEVBQUUsSUFBQSxFQUFFLElBQUksTUFBQSxFQUFDLEVBQUM7Ozs7Q0FDbEI7QUF2QkQsMEJBdUJDO0FBR0Q7SUFDQyxJQUFJLE1BQU0sR0FBRztRQUNaLElBQUksRUFBRSxJQUFJO1FBQ1YsSUFBSSxFQUFFLEdBQUc7UUFDVCxJQUFJLEVBQUUsSUFBSTtRQUNWLElBQUksRUFBRSxJQUFJO1FBQ1YsSUFBSSxFQUFFLEdBQUc7UUFDVCxJQUFJLEVBQUUsR0FBRztRQUNULElBQUksRUFBRSxHQUFHO1FBQ1QsSUFBSSxFQUFFLEdBQUc7UUFDVCxJQUFJLEVBQUUsR0FBRztRQUNULGlCQUFpQixFQUFFLElBQUk7UUFDdkIsa0JBQWtCLEVBQUUsSUFBSTtRQUN4QixNQUFNLEVBQUUsRUFBRTtRQUNWLE1BQU0sRUFBRSxFQUFFO1FBQ1YsSUFBSSxFQUFFLEdBQUc7UUFDVCxlQUFlLEVBQUUsR0FBRztRQUNwQixJQUFJLEVBQUUsRUFBRTtRQUNSLElBQUksRUFBRSxFQUFFO1FBQ1IsZUFBZSxFQUFFLEdBQUc7S0FDcEIsQ0FBQztJQUNGLE9BQU87UUFDTixVQUFVLEVBQUksWUFBWTtRQUMxQixNQUFNLFFBQUE7S0FDTixDQUFDO0FBQ0gsQ0FBQztBQXpCRCw0REF5QkMiLCJmaWxlIjoiUHJvamVjdFNldHRpbmdzLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgcGF0aHMgZnJvbSAnLi9wYXRocyc7XG5pbXBvcnQgKiBhcyBmaWxlX21hbmFnZXIgZnJvbSBcIi4vRmlsZU1hbmFnZXJcIjtcbmltcG9ydCB7IExvY2sgfSBmcm9tIFwiLi9Mb2NrXCI7XG5cbnZhciBsb2NrOiBMb2NrID0gbmV3IExvY2soKTtcblx0XG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVhZChwcm9qZWN0OiBzdHJpbmcpOiBQcm9taXNlPGFueT4ge1xuXHRsZXQgb3V0cHV0OiBhbnkgPSBhd2FpdCBmaWxlX21hbmFnZXIucmVhZF9qc29uKHBhdGhzLnByb2plY3RzK3Byb2plY3QrJy9zZXR0aW5ncy5qc29uJylcblx0XHQuY2F0Y2goIGUgPT4ge1xuXHRcdFx0Ly8gY29uc29sZS5sb2coJ2Vycm9yIHJlYWRpbmcgcHJvamVjdCAnK3Byb2plY3QrJyBzZXR0aW5ncy5qc29uJywgKGUubWVzc2FnZSA/IGUubWVzc2FnZSA6IG51bGwpKTtcblx0XHRcdC8vIGNvbnNvbGUubG9nKCdyZWNyZWF0aW5nIGRlZmF1bHQgc2V0dGluZ3MuanNvbicpO1xuXHRcdFx0cmV0dXJuIHdyaXRlKHByb2plY3QsIGRlZmF1bHRfcHJvamVjdF9zZXR0aW5ncygpKTtcblx0XHR9KTtcblx0cmV0dXJuIG91dHB1dDtcbn1cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiB3cml0ZShwcm9qZWN0OiBzdHJpbmcsIGRhdGE6IGFueSk6IFByb21pc2U8YW55PiB7XG5cdGF3YWl0IGZpbGVfbWFuYWdlci53cml0ZV9qc29uKHBhdGhzLnByb2plY3RzK3Byb2plY3QrJy9zZXR0aW5ncy5qc29uJywgZGF0YSk7XG5cdHJldHVybiBkYXRhO1xufVxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHNldENMQXJnKGRhdGE6IGFueSk6IFByb21pc2U8YW55PiB7XG5cdGxvY2suYWNxdWlyZSgpO1xuXHR0cnl7XG5cdFx0dmFyIHNldHRpbmdzID0gYXdhaXQgcmVhZChkYXRhLmN1cnJlbnRQcm9qZWN0KTtcblx0XHRzZXR0aW5ncy5DTEFyZ3NbZGF0YS5rZXldID0gZGF0YS52YWx1ZTtcblx0XHR3cml0ZShkYXRhLmN1cnJlbnRQcm9qZWN0LCBzZXR0aW5ncyk7XG5cdH1cblx0Y2F0Y2goZSl7XG5cdFx0bG9jay5yZWxlYXNlKCk7XG5cdFx0dGhyb3cgZTtcblx0fVxuXHRsb2NrLnJlbGVhc2UoKTtcblx0cmV0dXJuIHNldHRpbmdzO1xufVxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHNldENMQXJncyhkYXRhOiBhbnkpOiBQcm9taXNlPGFueT4ge1xuXHRsb2NrLmFjcXVpcmUoKTtcblx0dHJ5e1xuXHRcdHZhciBzZXR0aW5ncyA9IGF3YWl0IHJlYWQoZGF0YS5jdXJyZW50UHJvamVjdCk7XG5cdFx0Zm9yIChsZXQgaXRlbSBvZiBkYXRhLmFyZ3Mpe1xuXHRcdFx0c2V0dGluZ3MuQ0xBcmdzW2l0ZW0ua2V5XSA9IGl0ZW0udmFsdWU7XG5cdFx0fVxuXHRcdHdyaXRlKGRhdGEuY3VycmVudFByb2plY3QsIHNldHRpbmdzKTtcblx0fVxuXHRmaW5hbGx5e1xuXHRcdGxvY2sucmVsZWFzZSgpO1xuXHR9XG5cdHJldHVybiBzZXR0aW5ncztcbn1cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBzZXRfZmlsZU5hbWUocHJvamVjdDogc3RyaW5nLCBmaWxlTmFtZTogc3RyaW5nKXtcblx0bG9jay5hY3F1aXJlKCk7XG5cdHRyeXtcblx0XHRsZXQgc2V0dGluZ3MgPSBhd2FpdCByZWFkKHByb2plY3QpO1xuXHRcdHNldHRpbmdzLmZpbGVOYW1lID0gZmlsZU5hbWU7XG5cdFx0d3JpdGUocHJvamVjdCwgc2V0dGluZ3MpO1xuXHR9XG5cdGZpbmFsbHl7XG5cdFx0bG9jay5yZWxlYXNlKCk7XG5cdH1cbn1cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZXN0b3JlRGVmYXVsdENMQXJncyhkYXRhOiBhbnkpOiBQcm9taXNlPGFueT4ge1xuXHRsb2NrLmFjcXVpcmUoKTtcblx0dHJ5e1xuXHRcdHZhciBzZXR0aW5ncyA9IGF3YWl0IHJlYWQoZGF0YS5jdXJyZW50UHJvamVjdCk7XG5cdFx0c2V0dGluZ3MuQ0xBcmdzID0gZGVmYXVsdF9wcm9qZWN0X3NldHRpbmdzKCkuQ0xBcmdzO1xuXHRcdHdyaXRlKGRhdGEuY3VycmVudFByb2plY3QsIHNldHRpbmdzKTtcblx0fVxuXHRjYXRjaChlKXtcblx0XHRsb2NrLnJlbGVhc2UoKTtcblx0XHR0aHJvdyBlO1xuXHR9XG5cdGxvY2sucmVsZWFzZSgpO1xuXHRyZXR1cm4gc2V0dGluZ3M7XG59XG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ2V0QXJncyhwcm9qZWN0OiBhbnkpOiBQcm9taXNlPHtDTDogc3RyaW5nLCBtYWtlOiBzdHJpbmdbXX0+IHtcblx0bGV0IENMQXJncyA9IChhd2FpdCByZWFkKHByb2plY3QpKS5DTEFyZ3M7XG5cdGxldCBDTDogc3RyaW5nID0gJyc7XG5cdGZvciAobGV0IGtleSBpbiBDTEFyZ3MpIHtcblx0XHRpZiAoa2V5WzBdID09PSAnLScgJiYga2V5WzFdID09PSAnLScpe1xuXHRcdFx0aWYgKGtleSA9PT0gJy0tZGlzYWJsZS1sZWQnKXtcblx0XHRcdFx0aWYgKENMQXJnc1trZXldID09PSAxKVxuXHRcdFx0XHRcdENMICs9IGtleSsnICc7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRDTCArPSBrZXkrJz0nK0NMQXJnc1trZXldKycgJztcblx0XHRcdH1cblx0XHR9IGVsc2UgaWYgKGtleSA9PT0gJ3VzZXInKXtcblx0XHRcdENMICs9IENMQXJnc1trZXldKycgJztcblx0XHR9IGVsc2UgaWYgKGtleSAhPT0gJ21ha2UnICYmIGtleSAhPT0gJ2F1ZGlvRXhwYW5kZXInICYmIENMQXJnc1trZXldICE9PSAnJyl7XG5cdFx0XHRDTCArPSBrZXkrQ0xBcmdzW2tleV0rJyAnO1xuXHRcdH1cblx0fVxuXHRsZXQgbWFrZTogc3RyaW5nW10gPSBbXTsgXG5cdGlmIChDTEFyZ3MubWFrZSAmJiBDTEFyZ3MubWFrZS5zcGxpdCl7XG5cdFx0bWFrZSA9IENMQXJncy5tYWtlLnNwbGl0KCc7Jyk7XG5cdH1cblx0Q0wgPSBDTC50cmltKCk7XG5cdHJldHVybiB7Q0wsIG1ha2V9O1xufVxuXG5cbmV4cG9ydCBmdW5jdGlvbiBkZWZhdWx0X3Byb2plY3Rfc2V0dGluZ3MoKXtcblx0bGV0IENMQXJncyA9IHtcblx0XHRcIi1wXCI6IFwiMTZcIixcdFx0Ly8gYXVkaW8gYnVmZmVyIHNpemVcblx0XHRcIi1DXCI6IFwiOFwiLFx0XHQvLyBuby4gYW5hbG9nIGNoYW5uZWxzXG5cdFx0XCItQlwiOiBcIjE2XCIsXHRcdC8vIG5vLiBkaWdpdGFsIGNoYW5uZWxzXG5cdFx0XCItSFwiOiBcIi02XCIsXHRcdC8vIGhlYWRwaG9uZSBsZXZlbCAoZEIpXG5cdFx0XCItTlwiOiBcIjFcIixcdFx0Ly8gdXNlIGFuYWxvZ1xuXHRcdFwiLUdcIjogXCIxXCIsXHRcdC8vIHVzZSBkaWdpdGFsXG5cdFx0XCItTVwiOiBcIjBcIiwgXHRcdC8vIG11dGUgc3BlYWtlclxuXHRcdFwiLURcIjogXCIwXCIsXHRcdC8vIGRhYyBsZXZlbFxuXHRcdFwiLUFcIjogXCIwXCIsIFx0XHQvLyBhZGMgbGV2ZWxcblx0XHRcIi0tcGdhLWdhaW4tbGVmdFwiOiBcIjEwXCIsXG5cdFx0XCItLXBnYS1nYWluLXJpZ2h0XCI6IFwiMTBcIixcblx0XHRcInVzZXJcIjogJycsXHRcdC8vIHVzZXItZGVmaW5lZCBjbGFyZ3Ncblx0XHRcIm1ha2VcIjogJycsXHRcdC8vIHVzZXItZGVmaW5lZCBNYWtlZmlsZSBwYXJhbWV0ZXJzXG5cdFx0XCItWFwiOiBcIjBcIixcdFx0Ly8gbXVsdGlwbGV4ZXIgY2FwZWxldFxuXHRcdFwiYXVkaW9FeHBhbmRlclwiOiBcIjBcIixcdC8vIGF1ZGlvIGV4cGFuZGVyIGNhcGVsZXRcblx0XHRcIi1ZXCI6IFwiXCIsXHRcdC8vIGF1ZGlvIGV4cGFuZGVyIGlucHV0c1xuXHRcdFwiLVpcIjogXCJcIixcdFx0Ly8gYXVkaW8gZXhwYW5kZXIgb3V0cHV0c1xuXHRcdFwiLS1kaXNhYmxlLWxlZFwiOiBcIjBcIlxuXHR9O1xuXHRyZXR1cm4ge1xuXHRcdFwiZmlsZU5hbWVcIlx0XHQ6IFwicmVuZGVyLmNwcFwiLFxuXHRcdENMQXJnc1xuXHR9O1xufVxuIl19
