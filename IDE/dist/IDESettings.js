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
var paths_1 = require("./paths");
var Lock_1 = require("./Lock");
var lock = new Lock_1.Lock();
function read() {
    return __awaiter(this, void 0, void 0, function () {
        var output;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, file_manager.read_json(paths_1.paths.ide_settings)
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
                case 0: return [4 /*yield*/, file_manager.write_json(paths_1.paths.ide_settings, data)];
                case 1:
                    _a.sent();
                    return [2 /*return*/, data];
            }
        });
    });
}
exports.write = write;
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIklERVNldHRpbmdzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSw0Q0FBOEM7QUFDOUMsaUNBQWdDO0FBQ2hDLCtCQUE4QjtBQUU5QixJQUFJLElBQUksR0FBUyxJQUFJLFdBQUksRUFBRSxDQUFDO0FBRTVCOzs7Ozt3QkFDbUIscUJBQU0sWUFBWSxDQUFDLFNBQVMsQ0FBQyxhQUFLLENBQUMsWUFBWSxDQUFDO3lCQUNoRSxLQUFLLENBQUUsVUFBQSxDQUFDO3dCQUNSLDZFQUE2RTt3QkFDN0UsOENBQThDO3dCQUM5QyxPQUFPLEtBQUssQ0FBQyxvQkFBb0IsRUFBRSxDQUFDLENBQUM7b0JBQ3RDLENBQUMsQ0FBQyxFQUFBOztvQkFMQyxNQUFNLEdBQVEsU0FLZjtvQkFDSCxzQkFBTyxNQUFNLEVBQUM7Ozs7Q0FDZDtBQVJELG9CQVFDO0FBQ0QsZUFBNEIsSUFBUzs7Ozt3QkFDcEMscUJBQU0sWUFBWSxDQUFDLFVBQVUsQ0FBQyxhQUFLLENBQUMsWUFBWSxFQUFFLElBQUksQ0FBQyxFQUFBOztvQkFBdkQsU0FBdUQsQ0FBQztvQkFDeEQsc0JBQU8sSUFBSSxFQUFDOzs7O0NBQ1o7QUFIRCxzQkFHQztBQUVEO0lBQ0MsT0FBTztRQUNOLFNBQVMsRUFBSSxPQUFPO1FBQ3BCLG9CQUFvQixFQUFHLENBQUM7UUFDeEIsb0JBQW9CLEVBQUcsQ0FBQztRQUN4QixlQUFlLEVBQUksQ0FBQztRQUNwQixlQUFlLEVBQUksQ0FBQztRQUNwQixzQkFBc0IsRUFBRyxDQUFDO1FBQzFCLGVBQWUsRUFBSSxDQUFDO1FBQ3BCLGlCQUFpQixFQUFHLENBQUM7S0FDckIsQ0FBQztBQUNILENBQUMiLCJmaWxlIjoiSURFU2V0dGluZ3MuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBmaWxlX21hbmFnZXIgZnJvbSAnLi9GaWxlTWFuYWdlcic7XG5pbXBvcnQgeyBwYXRocyB9IGZyb20gJy4vcGF0aHMnO1xuaW1wb3J0IHsgTG9jayB9IGZyb20gJy4vTG9jayc7XG5cbnZhciBsb2NrOiBMb2NrID0gbmV3IExvY2soKTtcblx0XG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVhZCgpOiBQcm9taXNlPGFueT4ge1xuXHRsZXQgb3V0cHV0OiBhbnkgPSBhd2FpdCBmaWxlX21hbmFnZXIucmVhZF9qc29uKHBhdGhzLmlkZV9zZXR0aW5ncylcblx0XHQuY2F0Y2goIGUgPT4ge1xuXHRcdFx0Ly8gY29uc29sZS5sb2coJ2Vycm9yIHJlYWRpbmcgSURFIHNldHRpbmdzJywgKGUubWVzc2FnZSA/IGUubWVzc2FnZSA6IG51bGwpKTtcblx0XHRcdC8vIGNvbnNvbGUubG9nKCdyZWNyZWF0aW5nIGRlZmF1bHQgc2V0dGluZ3MnKTtcblx0XHRcdHJldHVybiB3cml0ZShkZWZhdWx0X0lERV9zZXR0aW5ncygpKTtcblx0XHR9KTtcblx0cmV0dXJuIG91dHB1dDtcbn1cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiB3cml0ZShkYXRhOiBhbnkpOiBQcm9taXNlPGFueT4ge1xuXHRhd2FpdCBmaWxlX21hbmFnZXIud3JpdGVfanNvbihwYXRocy5pZGVfc2V0dGluZ3MsIGRhdGEpO1xuXHRyZXR1cm4gZGF0YTtcbn1cblxuZnVuY3Rpb24gZGVmYXVsdF9JREVfc2V0dGluZ3MoKXtcblx0cmV0dXJuIHtcblx0XHQncHJvamVjdCdcdFx0OiAnYmFzaWMnLFxuXHRcdCdsaXZlQXV0b2NvbXBsZXRpb24nXHQ6IDEsXG5cdFx0J2xpdmVTeW50YXhDaGVja2luZydcdDogMSxcblx0XHQndmVyYm9zZUVycm9ycydcdFx0OiAwLFxuXHRcdCdjcHVNb25pdG9yaW5nJ1x0XHQ6IDEsXG5cdFx0J2NwdU1vbml0b3JpbmdWZXJib3NlJ1x0OiAwLFxuXHRcdCdjb25zb2xlRGVsZXRlJ1x0XHQ6IDAsXG5cdFx0J3ZpZXdIaWRkZW5GaWxlcydcdDogMFxuXHR9O1xufVxuIl19
