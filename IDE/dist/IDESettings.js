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
function read() {
    return __awaiter(this, void 0, void 0, function () {
        var output;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, file_manager.read_json(paths.ide_settings)
                        .catch(function (e) {
                        // console.log('error reading IDE settings', (e.message ? e.message : null));
                        // console.log('recreating default settings');
                        return write(default_IDE_settings());
                    })];
                case 1:
                    output = _a.sent();
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
                case 0: return [4 /*yield*/, file_manager.write_json(paths.ide_settings, data)];
                case 1:
                    _a.sent();
                    return [2 /*return*/, data];
            }
        });
    });
}
exports.write = write;
function set_setting(key, value) {
    return __awaiter(this, void 0, void 0, function () {
        var settings, e_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    lock.acquire();
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, , 5]);
                    return [4 /*yield*/, read()];
                case 2:
                    settings = _a.sent();
                    settings[key] = value;
                    return [4 /*yield*/, write(settings)];
                case 3:
                    _a.sent();
                    return [3 /*break*/, 5];
                case 4:
                    e_1 = _a.sent();
                    lock.release();
                    throw e_1;
                case 5:
                    lock.release();
                    return [2 /*return*/];
            }
        });
    });
}
exports.set_setting = set_setting;
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIklERVNldHRpbmdzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSw0Q0FBOEM7QUFDOUMsK0JBQWlDO0FBQ2pDLCtCQUE4QjtBQUU5QixJQUFJLElBQUksR0FBUyxJQUFJLFdBQUksRUFBRSxDQUFDO0FBRTVCOzs7Ozt3QkFDbUIscUJBQU0sWUFBWSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDO3lCQUNoRSxLQUFLLENBQUUsVUFBQSxDQUFDO3dCQUNSLDZFQUE2RTt3QkFDN0UsOENBQThDO3dCQUM5QyxPQUFPLEtBQUssQ0FBQyxvQkFBb0IsRUFBRSxDQUFDLENBQUM7b0JBQ3RDLENBQUMsQ0FBQyxFQUFBOztvQkFMQyxNQUFNLEdBQVEsU0FLZjtvQkFDSCxzQkFBTyxNQUFNLEVBQUM7Ozs7Q0FDZDtBQVJELG9CQVFDO0FBQ0QsZUFBNEIsSUFBUzs7Ozt3QkFDcEMscUJBQU0sWUFBWSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsWUFBWSxFQUFFLElBQUksQ0FBQyxFQUFBOztvQkFBdkQsU0FBdUQsQ0FBQztvQkFDeEQsc0JBQU8sSUFBSSxFQUFDOzs7O0NBQ1o7QUFIRCxzQkFHQztBQUVELHFCQUFrQyxHQUFXLEVBQUUsS0FBYTs7Ozs7O29CQUMzRCxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7Ozs7b0JBRUMscUJBQU0sSUFBSSxFQUFFLEVBQUE7O29CQUF2QixRQUFRLEdBQUcsU0FBWTtvQkFDM0IsUUFBUSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEtBQUssQ0FBQztvQkFDdEIscUJBQU0sS0FBSyxDQUFDLFFBQVEsQ0FBQyxFQUFBOztvQkFBckIsU0FBcUIsQ0FBQzs7OztvQkFHdEIsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO29CQUNmLE1BQU0sR0FBQyxDQUFDOztvQkFFVCxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7Ozs7O0NBQ2Y7QUFaRCxrQ0FZQztBQUVEO0lBQ0MsT0FBTztRQUNOLFNBQVMsRUFBSSxPQUFPO1FBQ3BCLG9CQUFvQixFQUFHLENBQUM7UUFDeEIsb0JBQW9CLEVBQUcsQ0FBQztRQUN4QixlQUFlLEVBQUksQ0FBQztRQUNwQixlQUFlLEVBQUksQ0FBQztRQUNwQixzQkFBc0IsRUFBRyxDQUFDO1FBQzFCLGVBQWUsRUFBSSxDQUFDO1FBQ3BCLGlCQUFpQixFQUFHLENBQUM7S0FDckIsQ0FBQztBQUNILENBQUMiLCJmaWxlIjoiSURFU2V0dGluZ3MuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBmaWxlX21hbmFnZXIgZnJvbSAnLi9GaWxlTWFuYWdlcic7XG5pbXBvcnQgKiBhcyBwYXRocyBmcm9tICcuL3BhdGhzJztcbmltcG9ydCB7IExvY2sgfSBmcm9tICcuL0xvY2snO1xuXG52YXIgbG9jazogTG9jayA9IG5ldyBMb2NrKCk7XG5cdFxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJlYWQoKTogUHJvbWlzZTxhbnk+IHtcblx0bGV0IG91dHB1dDogYW55ID0gYXdhaXQgZmlsZV9tYW5hZ2VyLnJlYWRfanNvbihwYXRocy5pZGVfc2V0dGluZ3MpXG5cdFx0LmNhdGNoKCBlID0+IHtcblx0XHRcdC8vIGNvbnNvbGUubG9nKCdlcnJvciByZWFkaW5nIElERSBzZXR0aW5ncycsIChlLm1lc3NhZ2UgPyBlLm1lc3NhZ2UgOiBudWxsKSk7XG5cdFx0XHQvLyBjb25zb2xlLmxvZygncmVjcmVhdGluZyBkZWZhdWx0IHNldHRpbmdzJyk7XG5cdFx0XHRyZXR1cm4gd3JpdGUoZGVmYXVsdF9JREVfc2V0dGluZ3MoKSk7XG5cdFx0fSk7XG5cdHJldHVybiBvdXRwdXQ7XG59XG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gd3JpdGUoZGF0YTogYW55KTogUHJvbWlzZTxhbnk+IHtcblx0YXdhaXQgZmlsZV9tYW5hZ2VyLndyaXRlX2pzb24ocGF0aHMuaWRlX3NldHRpbmdzLCBkYXRhKTtcblx0cmV0dXJuIGRhdGE7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBzZXRfc2V0dGluZyhrZXk6IHN0cmluZywgdmFsdWU6IHN0cmluZyl7XG5cdGxvY2suYWNxdWlyZSgpO1xuXHR0cnl7XG5cdFx0bGV0IHNldHRpbmdzID0gYXdhaXQgcmVhZCgpO1xuXHRcdHNldHRpbmdzW2tleV0gPSB2YWx1ZTtcblx0XHRhd2FpdCB3cml0ZShzZXR0aW5ncyk7XG5cdH1cblx0Y2F0Y2goZSl7XG5cdFx0bG9jay5yZWxlYXNlKCk7XG5cdFx0dGhyb3cgZTtcblx0fVxuXHRsb2NrLnJlbGVhc2UoKTtcbn1cblxuZnVuY3Rpb24gZGVmYXVsdF9JREVfc2V0dGluZ3MoKXtcblx0cmV0dXJuIHtcblx0XHQncHJvamVjdCdcdFx0OiAnYmFzaWMnLFxuXHRcdCdsaXZlQXV0b2NvbXBsZXRpb24nXHQ6IDEsXG5cdFx0J2xpdmVTeW50YXhDaGVja2luZydcdDogMSxcblx0XHQndmVyYm9zZUVycm9ycydcdFx0OiAwLFxuXHRcdCdjcHVNb25pdG9yaW5nJ1x0XHQ6IDEsXG5cdFx0J2NwdU1vbml0b3JpbmdWZXJib3NlJ1x0OiAwLFxuXHRcdCdjb25zb2xlRGVsZXRlJ1x0XHQ6IDAsXG5cdFx0J3ZpZXdIaWRkZW5GaWxlcydcdDogMFxuXHR9O1xufVxuIl19
