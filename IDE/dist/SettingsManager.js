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
    ProjectSettings.prototype.restoreDefaultCLArgs = function (project) {
        return __awaiter(this, void 0, void 0, function () {
            var settings, e_2;
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
                        settings.CLArgs = default_project_settings().CLArgs;
                        this.write(project, settings);
                        return [3 /*break*/, 4];
                    case 3:
                        e_2 = _a.sent();
                        this.lock.release();
                        throw e_2;
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,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RTtRQUNWLE1BQU0sRUFBRSxFQUFFO1FBQ1YsSUFBSSxFQUFFLEdBQUc7UUFDVCxlQUFlLEVBQUUsR0FBRztRQUNwQixJQUFJLEVBQUUsRUFBRTtRQUNSLElBQUksRUFBRSxFQUFFLENBQUUseUJBQXlCO0tBQ25DLENBQUM7SUFDRixPQUFPO1FBQ04sVUFBVSxFQUFJLFlBQVk7UUFDMUIsTUFBTSxRQUFBO0tBQ04sQ0FBQztBQUNILENBQUM7QUFFRCxJQUFJLFVBQVUsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFDO0FBQy9CLGdDQUFVIiwiZmlsZSI6IlNldHRpbmdzTWFuYWdlci5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7cGF0aHN9IGZyb20gJy4vcGF0aHMnO1xuaW1wb3J0IHsgZm0gfSBmcm9tIFwiLi9GaWxlTWFuYWdlclwiO1xuaW1wb3J0IHsgTG9jayB9IGZyb20gXCIuL0xvY2tcIjtcblxuY2xhc3MgUHJvamVjdFNldHRpbmdzIHtcblx0Y29uc3RydWN0b3IoKXtcblx0XHR0aGlzLmxvY2sgPSBuZXcgTG9jaygpO1xuXHR9XG5cdHByaXZhdGUgbG9jazogTG9jaztcblx0YXN5bmMgcmVhZChwcm9qZWN0OiBzdHJpbmcpOiBQcm9taXNlPGFueT4ge1xuXHRcdGxldCBvdXRwdXQ6IGFueSA9IGF3YWl0IGZtLnJlYWRfanNvbihwYXRocy5wcm9qZWN0cytwcm9qZWN0Kycvc2V0dGluZ3MuanNvbicpXG5cdFx0XHQuY2F0Y2goIGUgPT4ge1xuXHRcdFx0XHQvLyBjb25zb2xlLmxvZygnZXJyb3IgcmVhZGluZyBwcm9qZWN0ICcrcHJvamVjdCsnIHNldHRpbmdzLmpzb24nLCAoZS5tZXNzYWdlID8gZS5tZXNzYWdlIDogbnVsbCkpO1xuXHRcdFx0XHQvLyBjb25zb2xlLmxvZygncmVjcmVhdGluZyBkZWZhdWx0IHNldHRpbmdzLmpzb24nKTtcblx0XHRcdFx0cmV0dXJuIHRoaXMud3JpdGUocHJvamVjdCwgZGVmYXVsdF9wcm9qZWN0X3NldHRpbmdzKCkpO1xuXHRcdFx0fSk7XG5cdFx0cmV0dXJuIG91dHB1dDtcblx0fVxuXHRhc3luYyB3cml0ZShwcm9qZWN0OiBzdHJpbmcsIGRhdGE6IGFueSk6IFByb21pc2U8YW55PiB7XG5cdFx0YXdhaXQgZm0ud3JpdGVfanNvbihwYXRocy5wcm9qZWN0cytwcm9qZWN0Kycvc2V0dGluZ3MuanNvbicsIGRhdGEpO1xuXHRcdHJldHVybiBkYXRhO1xuXHR9XG5cblx0YXN5bmMgc2V0Q0xBcmcocHJvamVjdDogc3RyaW5nLCBrZXk6IHN0cmluZywgdmFsdWU6IHN0cmluZyk6IFByb21pc2U8YW55PiB7XG5cdFx0dGhpcy5sb2NrLmFjcXVpcmUoKTtcblx0XHR0cnl7XG5cdFx0XHR2YXIgc2V0dGluZ3MgPSBhd2FpdCB0aGlzLnJlYWQocHJvamVjdCk7XG5cdFx0XHRzZXR0aW5ncy5DTEFyZ3Nba2V5XSA9IHZhbHVlO1xuXHRcdFx0dGhpcy53cml0ZShwcm9qZWN0LCBzZXR0aW5ncyk7XG5cdFx0fVxuXHRcdGNhdGNoKGUpe1xuXHRcdFx0dGhpcy5sb2NrLnJlbGVhc2UoKTtcblx0XHRcdHRocm93IGU7XG5cdFx0fVxuXHRcdHRoaXMubG9jay5yZWxlYXNlKCk7XG5cdFx0cmV0dXJuIHNldHRpbmdzO1xuXHR9XG5cdGFzeW5jIHJlc3RvcmVEZWZhdWx0Q0xBcmdzKHByb2plY3Q6IHN0cmluZyk6IFByb21pc2U8YW55PiB7XG5cdFx0dGhpcy5sb2NrLmFjcXVpcmUoKTtcblx0XHR0cnl7XG5cdFx0XHR2YXIgc2V0dGluZ3MgPSBhd2FpdCB0aGlzLnJlYWQocHJvamVjdCk7XG5cdFx0XHRzZXR0aW5ncy5DTEFyZ3MgPSBkZWZhdWx0X3Byb2plY3Rfc2V0dGluZ3MoKS5DTEFyZ3M7XG5cdFx0XHR0aGlzLndyaXRlKHByb2plY3QsIHNldHRpbmdzKTtcblx0XHR9XG5cdFx0Y2F0Y2goZSl7XG5cdFx0XHR0aGlzLmxvY2sucmVsZWFzZSgpO1xuXHRcdFx0dGhyb3cgZTtcblx0XHR9XG5cdFx0dGhpcy5sb2NrLnJlbGVhc2UoKTtcblx0XHRyZXR1cm4gc2V0dGluZ3M7XG5cdH1cblxuXG59XG5cbmZ1bmN0aW9uIGRlZmF1bHRfcHJvamVjdF9zZXR0aW5ncygpe1xuXHRsZXQgQ0xBcmdzID0ge1xuXHRcdFwiLXBcIjogXCIxNlwiLFx0XHQvLyBhdWRpbyBidWZmZXIgc2l6ZVxuXHRcdFwiLUNcIjogXCI4XCIsXHRcdC8vIG5vLiBhbmFsb2cgY2hhbm5lbHNcblx0XHRcIi1CXCI6IFwiMTZcIixcdFx0Ly8gbm8uIGRpZ2l0YWwgY2hhbm5lbHNcblx0XHRcIi1IXCI6IFwiLTZcIixcdFx0Ly8gaGVhZHBob25lIGxldmVsIChkQilcblx0XHRcIi1OXCI6IFwiMVwiLFx0XHQvLyB1c2UgYW5hbG9nXG5cdFx0XCItR1wiOiBcIjFcIixcdFx0Ly8gdXNlIGRpZ2l0YWxcblx0XHRcIi1NXCI6IFwiMFwiLCBcdFx0Ly8gbXV0ZSBzcGVha2VyXG5cdFx0XCItRFwiOiBcIjBcIixcdFx0Ly8gZGFjIGxldmVsXG5cdFx0XCItQVwiOiBcIjBcIiwgXHRcdC8vIGFkYyBsZXZlbFxuXHRcdFwiLS1wZ2EtZ2Fpbi1sZWZ0XCI6IFwiMTBcIixcblx0XHRcIi0tcGdhLWdhaW4tcmlnaHRcIjogXCIxMFwiLFxuXHRcdFwidXNlclwiOiAnJyxcdFx0Ly8gdXNlci1kZWZpbmVkIGNsYXJnc1xuXHRcdFwibWFrZVwiOiAnJyxcdFx0Ly8gdXNlci1kZWZpbmVkIE1ha2VmaWxlIHBhcmFtZXRlcnNcblx0XHRcIi1YXCI6IFwiMFwiLFx0XHQvLyBtdWx0aXBsZXhlciBjYXBlbGV0XG5cdFx0XCJhdWRpb0V4cGFuZGVyXCI6IFwiMFwiLFx0Ly8gYXVkaW8gZXhwYW5kZXIgY2FwZWxldFxuXHRcdFwiLVlcIjogXCJcIixcdFx0Ly8gYXVkaW8gZXhwYW5kZXIgaW5wdXRzXG5cdFx0XCItWlwiOiBcIlwiXHRcdC8vIGF1ZGlvIGV4cGFuZGVyIG91dHB1dHNcblx0fTtcblx0cmV0dXJuIHtcblx0XHRcImZpbGVOYW1lXCJcdFx0OiBcInJlbmRlci5jcHBcIixcblx0XHRDTEFyZ3Ncblx0fTtcbn1cblxubGV0IHBfc2V0dGluZ3MgPSBuZXcgUHJvamVjdFNldHRpbmdzKCk7XG5leHBvcnQge3Bfc2V0dGluZ3N9O1xuIl19
