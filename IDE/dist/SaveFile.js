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
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
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
var path = require("path");
var Lock_1 = require("./Lock");
var lock = new Lock_1.Lock();
// save_file follows vim's strategy to save a file in a crash-proof way
// it first writes the file to .<file_name>~
// then it deletes the existing file at <file_name>
// then it renames .<file_name>~ to <file_name>
// if a path is given, a lockfile is also created and destroyed
// the lockfile contains the full path of the file being saved
// save_file has its own mutex, so it cannot run concurrently with itself
function save_file(file_path, file_content, lockfile) {
    return __awaiter(this, void 0, void 0, function () {
        var file_name, file_dir;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, lock.acquire()];
                case 1:
                    _a.sent();
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, , 10, 11]);
                    file_name = path.basename(file_path);
                    file_dir = path.dirname(file_path) + '/';
                    if (!lockfile) return [3 /*break*/, 4];
                    return [4 /*yield*/, file_manager.write_file(lockfile, file_path)];
                case 3:
                    _a.sent();
                    _a.label = 4;
                case 4: return [4 /*yield*/, file_manager.write_file(file_dir + '.' + file_name + '~', file_content)];
                case 5:
                    _a.sent();
                    return [4 /*yield*/, file_manager.delete_file(file_path)];
                case 6:
                    _a.sent();
                    return [4 /*yield*/, file_manager.rename_file(file_dir + '.' + file_name + '~', file_path)];
                case 7:
                    _a.sent();
                    if (!lockfile) return [3 /*break*/, 9];
                    return [4 /*yield*/, file_manager.delete_file(lockfile)];
                case 8:
                    _a.sent();
                    _a.label = 9;
                case 9: return [3 /*break*/, 11];
                case 10:
                    lock.release();
                    return [7 /*endfinally*/];
                case 11: return [2 /*return*/];
            }
        });
    });
}
exports.save_file = save_file;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIlNhdmVGaWxlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSw0Q0FBOEM7QUFDOUMsMkJBQTZCO0FBQzdCLCtCQUE4QjtBQUU5QixJQUFNLElBQUksR0FBUyxJQUFJLFdBQUksRUFBRSxDQUFDO0FBRTlCLHVFQUF1RTtBQUN2RSw0Q0FBNEM7QUFDNUMsbURBQW1EO0FBQ25ELCtDQUErQztBQUMvQywrREFBK0Q7QUFDL0QsOERBQThEO0FBQzlELHlFQUF5RTtBQUN6RSxtQkFBZ0MsU0FBaUIsRUFBRSxZQUFvQixFQUFFLFFBQWlCOzs7Ozt3QkFDekYscUJBQU0sSUFBSSxDQUFDLE9BQU8sRUFBRSxFQUFBOztvQkFBcEIsU0FBb0IsQ0FBQzs7OztvQkFFZCxTQUFTLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsQ0FBQztvQkFDckMsUUFBUSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLEdBQUMsR0FBRyxDQUFDO3lCQUN6QyxRQUFRLEVBQVIsd0JBQVE7b0JBQ1gscUJBQU0sWUFBWSxDQUFDLFVBQVUsQ0FBQyxRQUFRLEVBQUUsU0FBUyxDQUFDLEVBQUE7O29CQUFsRCxTQUFrRCxDQUFDOzt3QkFDcEQscUJBQU0sWUFBWSxDQUFDLFVBQVUsQ0FBQyxRQUFRLEdBQUMsR0FBRyxHQUFDLFNBQVMsR0FBQyxHQUFHLEVBQUUsWUFBWSxDQUFDLEVBQUE7O29CQUF2RSxTQUF1RSxDQUFDO29CQUN4RSxxQkFBTSxZQUFZLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxFQUFBOztvQkFBekMsU0FBeUMsQ0FBQztvQkFDMUMscUJBQU0sWUFBWSxDQUFDLFdBQVcsQ0FBQyxRQUFRLEdBQUMsR0FBRyxHQUFDLFNBQVMsR0FBQyxHQUFHLEVBQUUsU0FBUyxDQUFDLEVBQUE7O29CQUFyRSxTQUFxRSxDQUFDO3lCQUNsRSxRQUFRLEVBQVIsd0JBQVE7b0JBQ1gscUJBQU0sWUFBWSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsRUFBQTs7b0JBQXhDLFNBQXdDLENBQUM7Ozs7b0JBRzFDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQzs7Ozs7O0NBRWhCO0FBaEJELDhCQWdCQyIsImZpbGUiOiJTYXZlRmlsZS5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGZpbGVfbWFuYWdlciBmcm9tICcuL0ZpbGVNYW5hZ2VyJztcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBMb2NrIH0gZnJvbSAnLi9Mb2NrJztcblxuY29uc3QgbG9jazogTG9jayA9IG5ldyBMb2NrKCk7XG5cbi8vIHNhdmVfZmlsZSBmb2xsb3dzIHZpbSdzIHN0cmF0ZWd5IHRvIHNhdmUgYSBmaWxlIGluIGEgY3Jhc2gtcHJvb2Ygd2F5XG4vLyBpdCBmaXJzdCB3cml0ZXMgdGhlIGZpbGUgdG8gLjxmaWxlX25hbWU+flxuLy8gdGhlbiBpdCBkZWxldGVzIHRoZSBleGlzdGluZyBmaWxlIGF0IDxmaWxlX25hbWU+XG4vLyB0aGVuIGl0IHJlbmFtZXMgLjxmaWxlX25hbWU+fiB0byA8ZmlsZV9uYW1lPlxuLy8gaWYgYSBwYXRoIGlzIGdpdmVuLCBhIGxvY2tmaWxlIGlzIGFsc28gY3JlYXRlZCBhbmQgZGVzdHJveWVkXG4vLyB0aGUgbG9ja2ZpbGUgY29udGFpbnMgdGhlIGZ1bGwgcGF0aCBvZiB0aGUgZmlsZSBiZWluZyBzYXZlZFxuLy8gc2F2ZV9maWxlIGhhcyBpdHMgb3duIG11dGV4LCBzbyBpdCBjYW5ub3QgcnVuIGNvbmN1cnJlbnRseSB3aXRoIGl0c2VsZlxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHNhdmVfZmlsZShmaWxlX3BhdGg6IHN0cmluZywgZmlsZV9jb250ZW50OiBzdHJpbmcsIGxvY2tmaWxlPzogc3RyaW5nKXtcblx0YXdhaXQgbG9jay5hY3F1aXJlKCk7XG5cdHRyeXtcblx0XHRjb25zdCBmaWxlX25hbWUgPSBwYXRoLmJhc2VuYW1lKGZpbGVfcGF0aCk7XG5cdFx0Y29uc3QgZmlsZV9kaXIgPSBwYXRoLmRpcm5hbWUoZmlsZV9wYXRoKSsnLyc7XG5cdFx0aWYgKGxvY2tmaWxlKVxuXHRcdFx0YXdhaXQgZmlsZV9tYW5hZ2VyLndyaXRlX2ZpbGUobG9ja2ZpbGUsIGZpbGVfcGF0aCk7XG5cdFx0YXdhaXQgZmlsZV9tYW5hZ2VyLndyaXRlX2ZpbGUoZmlsZV9kaXIrJy4nK2ZpbGVfbmFtZSsnficsIGZpbGVfY29udGVudCk7XG5cdFx0YXdhaXQgZmlsZV9tYW5hZ2VyLmRlbGV0ZV9maWxlKGZpbGVfcGF0aCk7XG5cdFx0YXdhaXQgZmlsZV9tYW5hZ2VyLnJlbmFtZV9maWxlKGZpbGVfZGlyKycuJytmaWxlX25hbWUrJ34nLCBmaWxlX3BhdGgpO1xuXHRcdGlmIChsb2NrZmlsZSlcblx0XHRcdGF3YWl0IGZpbGVfbWFuYWdlci5kZWxldGVfZmlsZShsb2NrZmlsZSk7XG5cdH1cblx0ZmluYWxseXtcblx0XHRsb2NrLnJlbGVhc2UoKTtcblx0fVxufVxuIl19
