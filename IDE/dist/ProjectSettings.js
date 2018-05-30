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
        var CLArgs, CL, key, make, makeArgs, _i, makeArgs_1, arg;
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
        "-Z": "",
        "--disable-led": "0"
    };
    return {
        "fileName": "render.cpp",
        CLArgs: CLArgs
    };
}
exports.default_project_settings = default_project_settings;

//# sourceMappingURL=data:application/json;charset=utf8;base64,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QUFHO1FBQ3BCLElBQUksRUFBRSxFQUFFO1FBQ1IsSUFBSSxFQUFFLEVBQUU7UUFDUixlQUFlLEVBQUUsR0FBRztLQUNwQixDQUFDO0lBQ0YsT0FBTztRQUNOLFVBQVUsRUFBSSxZQUFZO1FBQzFCLE1BQU0sUUFBQTtLQUNOLENBQUM7QUFDSCxDQUFDO0FBekJELDREQXlCQyIsImZpbGUiOiJQcm9qZWN0U2V0dGluZ3MuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBwYXRocyBmcm9tICcuL3BhdGhzJztcbmltcG9ydCAqIGFzIGZpbGVfbWFuYWdlciBmcm9tIFwiLi9GaWxlTWFuYWdlclwiO1xuaW1wb3J0IHsgTG9jayB9IGZyb20gXCIuL0xvY2tcIjtcblxudmFyIGxvY2s6IExvY2sgPSBuZXcgTG9jaygpO1xuXHRcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZWFkKHByb2plY3Q6IHN0cmluZyk6IFByb21pc2U8YW55PiB7XG5cdGxldCBvdXRwdXQ6IGFueSA9IGF3YWl0IGZpbGVfbWFuYWdlci5yZWFkX2pzb24ocGF0aHMucHJvamVjdHMrcHJvamVjdCsnL3NldHRpbmdzLmpzb24nKVxuXHRcdC5jYXRjaCggZSA9PiB7XG5cdFx0XHQvLyBjb25zb2xlLmxvZygnZXJyb3IgcmVhZGluZyBwcm9qZWN0ICcrcHJvamVjdCsnIHNldHRpbmdzLmpzb24nLCAoZS5tZXNzYWdlID8gZS5tZXNzYWdlIDogbnVsbCkpO1xuXHRcdFx0Ly8gY29uc29sZS5sb2coJ3JlY3JlYXRpbmcgZGVmYXVsdCBzZXR0aW5ncy5qc29uJyk7XG5cdFx0XHRyZXR1cm4gd3JpdGUocHJvamVjdCwgZGVmYXVsdF9wcm9qZWN0X3NldHRpbmdzKCkpO1xuXHRcdH0pO1xuXHRyZXR1cm4gb3V0cHV0O1xufVxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHdyaXRlKHByb2plY3Q6IHN0cmluZywgZGF0YTogYW55KTogUHJvbWlzZTxhbnk+IHtcblx0YXdhaXQgZmlsZV9tYW5hZ2VyLndyaXRlX2pzb24ocGF0aHMucHJvamVjdHMrcHJvamVjdCsnL3NldHRpbmdzLmpzb24nLCBkYXRhKTtcblx0cmV0dXJuIGRhdGE7XG59XG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gc2V0Q0xBcmcoZGF0YTogYW55KTogUHJvbWlzZTxhbnk+IHtcblx0bG9jay5hY3F1aXJlKCk7XG5cdHRyeXtcblx0XHR2YXIgc2V0dGluZ3MgPSBhd2FpdCByZWFkKGRhdGEuY3VycmVudFByb2plY3QpO1xuXHRcdHNldHRpbmdzLkNMQXJnc1tkYXRhLmtleV0gPSBkYXRhLnZhbHVlO1xuXHRcdHdyaXRlKGRhdGEuY3VycmVudFByb2plY3QsIHNldHRpbmdzKTtcblx0fVxuXHRjYXRjaChlKXtcblx0XHRsb2NrLnJlbGVhc2UoKTtcblx0XHR0aHJvdyBlO1xuXHR9XG5cdGxvY2sucmVsZWFzZSgpO1xuXHRyZXR1cm4gc2V0dGluZ3M7XG59XG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gc2V0Q0xBcmdzKGRhdGE6IGFueSk6IFByb21pc2U8YW55PiB7XG5cdGxvY2suYWNxdWlyZSgpO1xuXHR0cnl7XG5cdFx0dmFyIHNldHRpbmdzID0gYXdhaXQgcmVhZChkYXRhLmN1cnJlbnRQcm9qZWN0KTtcblx0XHRmb3IgKGxldCBpdGVtIG9mIGRhdGEuYXJncyl7XG5cdFx0XHRzZXR0aW5ncy5DTEFyZ3NbaXRlbS5rZXldID0gaXRlbS52YWx1ZTtcblx0XHR9XG5cdFx0d3JpdGUoZGF0YS5jdXJyZW50UHJvamVjdCwgc2V0dGluZ3MpO1xuXHR9XG5cdGZpbmFsbHl7XG5cdFx0bG9jay5yZWxlYXNlKCk7XG5cdH1cblx0cmV0dXJuIHNldHRpbmdzO1xufVxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHNldF9maWxlTmFtZShwcm9qZWN0OiBzdHJpbmcsIGZpbGVOYW1lOiBzdHJpbmcpe1xuXHRsb2NrLmFjcXVpcmUoKTtcblx0dHJ5e1xuXHRcdGxldCBzZXR0aW5ncyA9IGF3YWl0IHJlYWQocHJvamVjdCk7XG5cdFx0c2V0dGluZ3MuZmlsZU5hbWUgPSBmaWxlTmFtZTtcblx0XHR3cml0ZShwcm9qZWN0LCBzZXR0aW5ncyk7XG5cdH1cblx0ZmluYWxseXtcblx0XHRsb2NrLnJlbGVhc2UoKTtcblx0fVxufVxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJlc3RvcmVEZWZhdWx0Q0xBcmdzKGRhdGE6IGFueSk6IFByb21pc2U8YW55PiB7XG5cdGxvY2suYWNxdWlyZSgpO1xuXHR0cnl7XG5cdFx0dmFyIHNldHRpbmdzID0gYXdhaXQgcmVhZChkYXRhLmN1cnJlbnRQcm9qZWN0KTtcblx0XHRzZXR0aW5ncy5DTEFyZ3MgPSBkZWZhdWx0X3Byb2plY3Rfc2V0dGluZ3MoKS5DTEFyZ3M7XG5cdFx0d3JpdGUoZGF0YS5jdXJyZW50UHJvamVjdCwgc2V0dGluZ3MpO1xuXHR9XG5cdGNhdGNoKGUpe1xuXHRcdGxvY2sucmVsZWFzZSgpO1xuXHRcdHRocm93IGU7XG5cdH1cblx0bG9jay5yZWxlYXNlKCk7XG5cdHJldHVybiBzZXR0aW5ncztcbn1cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZXRBcmdzKHByb2plY3Q6IGFueSk6IFByb21pc2U8e0NMOiBzdHJpbmcsIG1ha2U6IHN0cmluZ30+IHtcblx0bGV0IENMQXJncyA9IChhd2FpdCByZWFkKHByb2plY3QpKS5DTEFyZ3M7XG5cdGxldCBDTDogc3RyaW5nID0gJyc7XG5cdGZvciAobGV0IGtleSBpbiBDTEFyZ3MpIHtcblx0XHRpZiAoa2V5WzBdID09PSAnLScgJiYga2V5WzFdID09PSAnLScpe1xuXHRcdFx0aWYgKGtleSA9PT0gJy0tZGlzYWJsZS1sZWQnKXtcblx0XHRcdFx0aWYgKENMQXJnc1trZXldID09PSAxKVxuXHRcdFx0XHRcdENMICs9IGtleSsnICc7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRDTCArPSBrZXkrJz0nK0NMQXJnc1trZXldKycgJztcblx0XHRcdH1cblx0XHR9IGVsc2UgaWYgKGtleSA9PT0gJ3VzZXInKXtcblx0XHRcdENMICs9IENMQXJnc1trZXldKycgJztcblx0XHR9IGVsc2UgaWYgKGtleSAhPT0gJ21ha2UnICYmIGtleSAhPT0gJ2F1ZGlvRXhwYW5kZXInICYmIENMQXJnc1trZXldICE9PSAnJyl7XG5cdFx0XHRDTCArPSBrZXkrQ0xBcmdzW2tleV0rJyAnO1xuXHRcdH1cblx0fVxuXHRsZXQgbWFrZTogc3RyaW5nID0gJyc7IFxuXHRpZiAoQ0xBcmdzLm1ha2UgJiYgQ0xBcmdzLm1ha2Uuc3BsaXQpe1xuXHRcdGxldCBtYWtlQXJncyA9IENMQXJncy5tYWtlLnNwbGl0KCc7Jyk7XG5cdFx0Zm9yIChsZXQgYXJnIG9mIG1ha2VBcmdzKXtcblx0XHRcdGFyZyA9IGFyZy50cmltKCk7XG5cdFx0XHRpZihhcmcubGVuZ3RoID4gMCl7XG5cdFx0XHRcdG1ha2UgKz0gYXJnKycgJztcblx0XHRcdH1cblx0XHR9XG5cdH1cblx0Q0wgPSBDTC50cmltKCk7XG5cdG1ha2UgPSBtYWtlLnRyaW0oKTtcblx0cmV0dXJuIHtDTCwgbWFrZX07XG59XG5cblxuZXhwb3J0IGZ1bmN0aW9uIGRlZmF1bHRfcHJvamVjdF9zZXR0aW5ncygpe1xuXHRsZXQgQ0xBcmdzID0ge1xuXHRcdFwiLXBcIjogXCIxNlwiLFx0XHQvLyBhdWRpbyBidWZmZXIgc2l6ZVxuXHRcdFwiLUNcIjogXCI4XCIsXHRcdC8vIG5vLiBhbmFsb2cgY2hhbm5lbHNcblx0XHRcIi1CXCI6IFwiMTZcIixcdFx0Ly8gbm8uIGRpZ2l0YWwgY2hhbm5lbHNcblx0XHRcIi1IXCI6IFwiLTZcIixcdFx0Ly8gaGVhZHBob25lIGxldmVsIChkQilcblx0XHRcIi1OXCI6IFwiMVwiLFx0XHQvLyB1c2UgYW5hbG9nXG5cdFx0XCItR1wiOiBcIjFcIixcdFx0Ly8gdXNlIGRpZ2l0YWxcblx0XHRcIi1NXCI6IFwiMFwiLCBcdFx0Ly8gbXV0ZSBzcGVha2VyXG5cdFx0XCItRFwiOiBcIjBcIixcdFx0Ly8gZGFjIGxldmVsXG5cdFx0XCItQVwiOiBcIjBcIiwgXHRcdC8vIGFkYyBsZXZlbFxuXHRcdFwiLS1wZ2EtZ2Fpbi1sZWZ0XCI6IFwiMTBcIixcblx0XHRcIi0tcGdhLWdhaW4tcmlnaHRcIjogXCIxMFwiLFxuXHRcdFwidXNlclwiOiAnJyxcdFx0Ly8gdXNlci1kZWZpbmVkIGNsYXJnc1xuXHRcdFwibWFrZVwiOiAnJyxcdFx0Ly8gdXNlci1kZWZpbmVkIE1ha2VmaWxlIHBhcmFtZXRlcnNcblx0XHRcIi1YXCI6IFwiMFwiLFx0XHQvLyBtdWx0aXBsZXhlciBjYXBlbGV0XG5cdFx0XCJhdWRpb0V4cGFuZGVyXCI6IFwiMFwiLFx0Ly8gYXVkaW8gZXhwYW5kZXIgY2FwZWxldFxuXHRcdFwiLVlcIjogXCJcIixcdFx0Ly8gYXVkaW8gZXhwYW5kZXIgaW5wdXRzXG5cdFx0XCItWlwiOiBcIlwiLFx0XHQvLyBhdWRpbyBleHBhbmRlciBvdXRwdXRzXG5cdFx0XCItLWRpc2FibGUtbGVkXCI6IFwiMFwiXG5cdH07XG5cdHJldHVybiB7XG5cdFx0XCJmaWxlTmFtZVwiXHRcdDogXCJyZW5kZXIuY3BwXCIsXG5cdFx0Q0xBcmdzXG5cdH07XG59XG4iXX0=
