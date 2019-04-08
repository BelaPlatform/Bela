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
var fs = require("fs-extra-promise");
var isBinary = require("isbinaryfile");
var util = require("./utils");
var Lock_1 = require("./Lock");
// FileManager is only available as a single instance accross the app, exported as fm
// it has a private Lock which is always acquired before manipulating the filesystem
// thus concurent access is prohibited
// only the primitive file and directory manipulation methods should touch the lock
// OR the filesystem, in the whole app
var lock = new Lock_1.Lock();
// primitive file and directory manipulation
function write_file(file_path, data) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, lock.acquire()];
                case 1:
                    _a.sent();
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, , 4, 5]);
                    return [4 /*yield*/, fs.outputFileAsync(file_path, data)];
                case 3:
                    _a.sent();
                    return [3 /*break*/, 5];
                case 4:
                    lock.release();
                    return [7 /*endfinally*/];
                case 5: return [2 /*return*/];
            }
        });
    });
}
exports.write_file = write_file;
function read_file(file_path) {
    return __awaiter(this, void 0, void 0, function () {
        var out;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, lock.acquire()];
                case 1:
                    _a.sent();
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, , 4, 5]);
                    return [4 /*yield*/, fs.readFileAsync(file_path, 'utf8')];
                case 3:
                    out = _a.sent();
                    return [3 /*break*/, 5];
                case 4:
                    lock.release();
                    return [7 /*endfinally*/];
                case 5: return [2 /*return*/, out];
            }
        });
    });
}
exports.read_file = read_file;
function read_file_raw(file_path) {
    return __awaiter(this, void 0, void 0, function () {
        var out;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, lock.acquire()];
                case 1:
                    _a.sent();
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, , 4, 5]);
                    return [4 /*yield*/, fs.readFileAsync(file_path)];
                case 3:
                    out = _a.sent();
                    return [3 /*break*/, 5];
                case 4:
                    lock.release();
                    return [7 /*endfinally*/];
                case 5: return [2 /*return*/, out];
            }
        });
    });
}
exports.read_file_raw = read_file_raw;
function rename_file(src, dest) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, lock.acquire()];
                case 1:
                    _a.sent();
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, , 4, 5]);
                    return [4 /*yield*/, fs.moveAsync(src, dest, { overwrite: true })];
                case 3:
                    _a.sent();
                    return [3 /*break*/, 5];
                case 4:
                    lock.release();
                    return [7 /*endfinally*/];
                case 5: return [2 /*return*/];
            }
        });
    });
}
exports.rename_file = rename_file;
function delete_file(file_path) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, lock.acquire()];
                case 1:
                    _a.sent();
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, , 4, 5]);
                    return [4 /*yield*/, fs.removeAsync(file_path)];
                case 3:
                    _a.sent();
                    return [3 /*break*/, 5];
                case 4:
                    lock.release();
                    return [7 /*endfinally*/];
                case 5: return [2 /*return*/];
            }
        });
    });
}
exports.delete_file = delete_file;
function read_directory(dir_path) {
    return __awaiter(this, void 0, void 0, function () {
        var out;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, lock.acquire()];
                case 1:
                    _a.sent();
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, , 4, 5]);
                    return [4 /*yield*/, fs.readdirAsync(dir_path)];
                case 3:
                    out = _a.sent();
                    return [3 /*break*/, 5];
                case 4:
                    lock.release();
                    return [7 /*endfinally*/];
                case 5: return [2 /*return*/, out];
            }
        });
    });
}
exports.read_directory = read_directory;
function stat_file(file_name) {
    return __awaiter(this, void 0, void 0, function () {
        var out;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, lock.acquire()];
                case 1:
                    _a.sent();
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, , 4, 5]);
                    return [4 /*yield*/, fs.lstatAsync(file_name)];
                case 3:
                    out = _a.sent();
                    return [3 /*break*/, 5];
                case 4:
                    lock.release();
                    return [7 /*endfinally*/];
                case 5: return [2 /*return*/, out];
            }
        });
    });
}
exports.stat_file = stat_file;
function copy_directory(src_path, dest_path) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, lock.acquire()];
                case 1:
                    _a.sent();
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, , 4, 5]);
                    return [4 /*yield*/, fs.copyAsync(src_path, dest_path)];
                case 3:
                    _a.sent();
                    return [3 /*break*/, 5];
                case 4:
                    lock.release();
                    return [7 /*endfinally*/];
                case 5: return [2 /*return*/];
            }
        });
    });
}
exports.copy_directory = copy_directory;
function copy_file(src_path, dest_path) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, copy_directory(src_path, dest_path)];
        });
    });
}
exports.copy_file = copy_file;
// for some reason fs does not have ensureSymLinkAsync or emptyDirAsync
// so promisify them manually
function make_symlink(src_path, dest_path) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, lock.acquire()];
                case 1:
                    _a.sent();
                    return [2 /*return*/, new Promise(function (resolve, reject) {
                            fs.ensureSymlink(src_path, dest_path, function (err) {
                                lock.release();
                                if (err)
                                    reject(err);
                                resolve();
                            });
                        })];
            }
        });
    });
}
exports.make_symlink = make_symlink;
function empty_directory(dir_path) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, lock.acquire()];
                case 1:
                    _a.sent();
                    return [2 /*return*/, new Promise(function (resolve, reject) {
                            fs.emptyDir(dir_path, function (err) {
                                lock.release();
                                if (err)
                                    reject(err);
                                resolve();
                            });
                        })];
            }
        });
    });
}
exports.empty_directory = empty_directory;
// sophisticated file and directory manipulation
var SaveFile_1 = require("./SaveFile");
exports.save_file = SaveFile_1.save_file;
// recursively read the contents of a directory, returning an array of File_Descriptors
function deep_read_directory(dir_path) {
    return __awaiter(this, void 0, void 0, function () {
        var contents, output, _i, contents_1, name_1, stat, desc, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, read_directory(dir_path)];
                case 1:
                    contents = _b.sent();
                    output = [];
                    _i = 0, contents_1 = contents;
                    _b.label = 2;
                case 2:
                    if (!(_i < contents_1.length)) return [3 /*break*/, 8];
                    name_1 = contents_1[_i];
                    return [4 /*yield*/, stat_file(dir_path + '/' + name_1)];
                case 3:
                    stat = _b.sent();
                    desc = new util.File_Descriptor(name_1);
                    if (!stat.isDirectory()) return [3 /*break*/, 5];
                    _a = desc;
                    return [4 /*yield*/, deep_read_directory(dir_path + '/' + name_1)];
                case 4:
                    _a.children = _b.sent();
                    return [3 /*break*/, 6];
                case 5:
                    desc.size = stat.size;
                    _b.label = 6;
                case 6:
                    output.push(desc);
                    _b.label = 7;
                case 7:
                    _i++;
                    return [3 /*break*/, 2];
                case 8: return [2 /*return*/, output];
            }
        });
    });
}
exports.deep_read_directory = deep_read_directory;
// checks if a file is binary - only reads a few thousand bytes at most
// returns a boolean when awaited
function is_binary(file_path) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, lock.acquire()];
                case 1:
                    _a.sent();
                    return [2 /*return*/, new Promise(function (resolve, reject) {
                            isBinary(file_path, function (err, result) {
                                lock.release();
                                if (err)
                                    reject(err);
                                resolve(result);
                            });
                        })];
            }
        });
    });
}
exports.is_binary = is_binary;
function read_json(file_path) {
    return __awaiter(this, void 0, void 0, function () {
        var output;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, read_file(file_path)];
                case 1:
                    output = _a.sent();
                    return [2 /*return*/, JSON.parse(output)];
            }
        });
    });
}
exports.read_json = read_json;
function write_json(file_path, data) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, write_file(file_path, JSON.stringify(data))];
        });
    });
}
exports.write_json = write_json;
function directory_exists(dir_path) {
    return __awaiter(this, void 0, void 0, function () {
        var stat;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, stat_file(dir_path)
                        .catch(function (e) { })];
                case 1:
                    stat = _a.sent();
                    return [2 /*return*/, (stat && stat.isDirectory && stat.isDirectory()) ? true : false];
            }
        });
    });
}
exports.directory_exists = directory_exists;
function file_exists(file_path) {
    return __awaiter(this, void 0, void 0, function () {
        var stat;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, stat_file(file_path)
                        .catch(function (e) { })];
                case 1:
                    stat = _a.sent();
                    return [2 /*return*/, (stat && stat.isFile && stat.isFile()) ? true : false];
            }
        });
    });
}
exports.file_exists = file_exists;

//# sourceMappingURL=data:application/json;charset=utf8;base64,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OztDQUN2RTtBQUpELDRDQUlDO0FBQ0QscUJBQWtDLFNBQWlCOzs7Ozt3QkFDbEMscUJBQU0sU0FBUyxDQUFDLFNBQVMsQ0FBQzt5QkFDeEMsS0FBSyxDQUFFLFVBQUEsQ0FBQyxJQUFLLENBQUMsQ0FBRSxFQUFBOztvQkFEZCxJQUFJLEdBQVEsU0FDRTtvQkFDbEIsc0JBQU8sQ0FBQyxJQUFJLElBQUksSUFBSSxDQUFDLE1BQU0sSUFBSSxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUM7Ozs7Q0FDN0Q7QUFKRCxrQ0FJQyIsImZpbGUiOiJGaWxlTWFuYWdlci5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzLWV4dHJhLXByb21pc2UnO1xuaW1wb3J0ICogYXMgaXNCaW5hcnkgZnJvbSAnaXNiaW5hcnlmaWxlJztcbmltcG9ydCAqIGFzIHV0aWwgZnJvbSAnLi91dGlscyc7XG5pbXBvcnQgeyBMb2NrIH0gZnJvbSBcIi4vTG9ja1wiO1xuXG4vLyBGaWxlTWFuYWdlciBpcyBvbmx5IGF2YWlsYWJsZSBhcyBhIHNpbmdsZSBpbnN0YW5jZSBhY2Nyb3NzIHRoZSBhcHAsIGV4cG9ydGVkIGFzIGZtXG4vLyBpdCBoYXMgYSBwcml2YXRlIExvY2sgd2hpY2ggaXMgYWx3YXlzIGFjcXVpcmVkIGJlZm9yZSBtYW5pcHVsYXRpbmcgdGhlIGZpbGVzeXN0ZW1cbi8vIHRodXMgY29uY3VyZW50IGFjY2VzcyBpcyBwcm9oaWJpdGVkXG4vLyBvbmx5IHRoZSBwcmltaXRpdmUgZmlsZSBhbmQgZGlyZWN0b3J5IG1hbmlwdWxhdGlvbiBtZXRob2RzIHNob3VsZCB0b3VjaCB0aGUgbG9ja1xuLy8gT1IgdGhlIGZpbGVzeXN0ZW0sIGluIHRoZSB3aG9sZSBhcHBcblxuY29uc3QgbG9jazogTG9jayA9IG5ldyBMb2NrKCk7XG5cbi8vIHByaW1pdGl2ZSBmaWxlIGFuZCBkaXJlY3RvcnkgbWFuaXB1bGF0aW9uXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gd3JpdGVfZmlsZShmaWxlX3BhdGg6IHN0cmluZywgZGF0YTogc3RyaW5nKTogUHJvbWlzZTx2b2lkPntcblx0YXdhaXQgbG9jay5hY3F1aXJlKCk7XG5cdHRyeXtcblx0XHRhd2FpdCBmcy5vdXRwdXRGaWxlQXN5bmMoZmlsZV9wYXRoLCBkYXRhKTtcblx0fVxuXHRmaW5hbGx5e1xuXHRcdGxvY2sucmVsZWFzZSgpO1xuXHR9XG59XG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVhZF9maWxlKGZpbGVfcGF0aDogc3RyaW5nKTogUHJvbWlzZTxzdHJpbmc+IHtcblx0YXdhaXQgbG9jay5hY3F1aXJlKCk7XG5cdGxldCBvdXQ6IHN0cmluZztcblx0dHJ5e1xuXHRcdG91dCA9IGF3YWl0IGZzLnJlYWRGaWxlQXN5bmMoZmlsZV9wYXRoLCAndXRmOCcpO1xuXHR9XG5cdGZpbmFsbHl7XG5cdFx0bG9jay5yZWxlYXNlKCk7XG5cdH1cblx0cmV0dXJuIG91dDtcbn1cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZWFkX2ZpbGVfcmF3KGZpbGVfcGF0aDogc3RyaW5nKTogUHJvbWlzZTxCdWZmZXI+e1xuXHRhd2FpdCBsb2NrLmFjcXVpcmUoKTtcblx0bGV0IG91dDogQnVmZmVyO1xuXHR0cnl7XG5cdFx0b3V0ID0gYXdhaXQgZnMucmVhZEZpbGVBc3luYyhmaWxlX3BhdGgpO1xuXHR9XG5cdGZpbmFsbHl7XG5cdFx0bG9jay5yZWxlYXNlKCk7XG5cdH1cblx0cmV0dXJuIG91dDtcbn1cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZW5hbWVfZmlsZShzcmM6IHN0cmluZywgZGVzdDogc3RyaW5nKTogUHJvbWlzZTx2b2lkPntcblx0YXdhaXQgbG9jay5hY3F1aXJlKCk7XG5cdHRyeXtcblx0XHRhd2FpdCBmcy5tb3ZlQXN5bmMoc3JjLCBkZXN0LCB7b3ZlcndyaXRlOiB0cnVlfSk7XG5cdH1cblx0ZmluYWxseXtcblx0XHRsb2NrLnJlbGVhc2UoKTtcblx0fVxufVxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGRlbGV0ZV9maWxlKGZpbGVfcGF0aDogc3RyaW5nKTogUHJvbWlzZTx2b2lkPntcblx0YXdhaXQgbG9jay5hY3F1aXJlKCk7XG5cdHRyeXtcblx0XHRhd2FpdCBmcy5yZW1vdmVBc3luYyhmaWxlX3BhdGgpO1xuXHR9XG5cdGZpbmFsbHl7XG5cdFx0bG9jay5yZWxlYXNlKCk7XG5cdH1cbn1cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZWFkX2RpcmVjdG9yeShkaXJfcGF0aDogc3RyaW5nKTogUHJvbWlzZTxzdHJpbmdbXT57XG5cdGF3YWl0IGxvY2suYWNxdWlyZSgpO1xuXHRsZXQgb3V0OiBzdHJpbmdbXTsgXG5cdHRyeXtcblx0XHRvdXQgPSBhd2FpdCBmcy5yZWFkZGlyQXN5bmMoZGlyX3BhdGgpO1xuXHR9XG5cdGZpbmFsbHl7XG5cdFx0bG9jay5yZWxlYXNlKCk7XG5cdH1cblx0cmV0dXJuIG91dDtcbn1cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBzdGF0X2ZpbGUoZmlsZV9uYW1lOiBzdHJpbmcpOiBQcm9taXNlPGFueT57XG5cdGF3YWl0IGxvY2suYWNxdWlyZSgpO1xuXHRsZXQgb3V0OiBhbnk7IFxuXHR0cnl7XG5cdFx0b3V0ID0gYXdhaXQgZnMubHN0YXRBc3luYyhmaWxlX25hbWUpO1xuXHR9XG5cdGZpbmFsbHl7XG5cdFx0bG9jay5yZWxlYXNlKCk7XG5cdH1cblx0cmV0dXJuIG91dDtcbn1cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjb3B5X2RpcmVjdG9yeShzcmNfcGF0aDogc3RyaW5nLCBkZXN0X3BhdGg6IHN0cmluZyk6IFByb21pc2U8dm9pZD57XG5cdGF3YWl0IGxvY2suYWNxdWlyZSgpO1xuXHR0cnl7XG5cdFx0YXdhaXQgZnMuY29weUFzeW5jKHNyY19wYXRoLCBkZXN0X3BhdGgpO1xuXHR9XG5cdGZpbmFsbHl7XG5cdFx0bG9jay5yZWxlYXNlKCk7XG5cdH1cbn1cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjb3B5X2ZpbGUoc3JjX3BhdGg6IHN0cmluZywgZGVzdF9wYXRoOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+e1xuXHRyZXR1cm4gY29weV9kaXJlY3Rvcnkoc3JjX3BhdGgsIGRlc3RfcGF0aCk7XG59XG4vLyBmb3Igc29tZSByZWFzb24gZnMgZG9lcyBub3QgaGF2ZSBlbnN1cmVTeW1MaW5rQXN5bmMgb3IgZW1wdHlEaXJBc3luY1xuLy8gc28gcHJvbWlzaWZ5IHRoZW0gbWFudWFsbHlcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBtYWtlX3N5bWxpbmsoc3JjX3BhdGg6IHN0cmluZywgZGVzdF9wYXRoOiBzdHJpbmcpOiBQcm9taXNlPGFueT57XG5cdGF3YWl0IGxvY2suYWNxdWlyZSgpO1xuXHRyZXR1cm4gbmV3IFByb21pc2UoIChyZXNvbHZlLCByZWplY3QpID0+IHtcblx0XHRmcy5lbnN1cmVTeW1saW5rKHNyY19wYXRoLCBkZXN0X3BhdGgsIGVyciA9PiB7XG5cdFx0XHRsb2NrLnJlbGVhc2UoKTtcblx0XHRcdGlmIChlcnIpIHJlamVjdChlcnIpO1xuXHRcdFx0cmVzb2x2ZSgpO1xuXHRcdH0pO1xuXHR9KTtcbn1cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBlbXB0eV9kaXJlY3RvcnkoZGlyX3BhdGg6IHN0cmluZyk6IFByb21pc2U8YW55Pntcblx0YXdhaXQgbG9jay5hY3F1aXJlKCk7XG5cdHJldHVybiBuZXcgUHJvbWlzZSggKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuXHRcdGZzLmVtcHR5RGlyKGRpcl9wYXRoLCBlcnIgPT4ge1xuXHRcdFx0bG9jay5yZWxlYXNlKCk7XG5cdFx0XHRpZiAoZXJyKSByZWplY3QoZXJyKTtcblx0XHRcdHJlc29sdmUoKTtcblx0XHR9KTtcblx0fSk7XG59XG4vLyBzb3BoaXN0aWNhdGVkIGZpbGUgYW5kIGRpcmVjdG9yeSBtYW5pcHVsYXRpb25cbmV4cG9ydCB7c2F2ZV9maWxlIGFzIHNhdmVfZmlsZX0gZnJvbSAnLi9TYXZlRmlsZSc7XG5cbi8vIHJlY3Vyc2l2ZWx5IHJlYWQgdGhlIGNvbnRlbnRzIG9mIGEgZGlyZWN0b3J5LCByZXR1cm5pbmcgYW4gYXJyYXkgb2YgRmlsZV9EZXNjcmlwdG9yc1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGRlZXBfcmVhZF9kaXJlY3RvcnkoZGlyX3BhdGg6IHN0cmluZyk6IFByb21pc2U8dXRpbC5GaWxlX0Rlc2NyaXB0b3JbXT57XG5cdGxldCBjb250ZW50czogYW55ID0gYXdhaXQgcmVhZF9kaXJlY3RvcnkoZGlyX3BhdGgpO1xuXHRsZXQgb3V0cHV0OiB1dGlsLkZpbGVfRGVzY3JpcHRvcltdID0gW107XG5cdGZvciAobGV0IG5hbWUgb2YgY29udGVudHMpe1xuXHRcdGxldCBzdGF0ID0gYXdhaXQgc3RhdF9maWxlKGRpcl9wYXRoKycvJytuYW1lKTtcblx0XHRsZXQgZGVzYzogdXRpbC5GaWxlX0Rlc2NyaXB0b3IgPSBuZXcgdXRpbC5GaWxlX0Rlc2NyaXB0b3IobmFtZSk7XG5cdFx0aWYgKHN0YXQuaXNEaXJlY3RvcnkoKSlcblx0XHRcdGRlc2MuY2hpbGRyZW4gPSBhd2FpdCBkZWVwX3JlYWRfZGlyZWN0b3J5KGRpcl9wYXRoKycvJytuYW1lKTtcblx0XHRlbHNlXG5cdFx0XHRkZXNjLnNpemUgPSBzdGF0LnNpemU7XG5cdFx0b3V0cHV0LnB1c2goZGVzYyk7XG5cdH1cblx0cmV0dXJuIG91dHB1dDtcbn1cblxuLy8gY2hlY2tzIGlmIGEgZmlsZSBpcyBiaW5hcnkgLSBvbmx5IHJlYWRzIGEgZmV3IHRob3VzYW5kIGJ5dGVzIGF0IG1vc3Rcbi8vIHJldHVybnMgYSBib29sZWFuIHdoZW4gYXdhaXRlZFxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGlzX2JpbmFyeShmaWxlX3BhdGg6IHN0cmluZyl7XG5cdGF3YWl0IGxvY2suYWNxdWlyZSgpO1xuXHRyZXR1cm4gbmV3IFByb21pc2UoIChyZXNvbHZlLCByZWplY3QpID0+IHtcblx0XHRpc0JpbmFyeShmaWxlX3BhdGgsIChlcnI6IGFueSwgcmVzdWx0OiBhbnkpID0+IHtcblx0XHRcdGxvY2sucmVsZWFzZSgpO1xuXHRcdFx0aWYgKGVycikgcmVqZWN0KGVycik7XG5cdFx0XHRyZXNvbHZlKHJlc3VsdCk7XG5cdFx0fSk7XG5cdH0pO1xufVxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJlYWRfanNvbihmaWxlX3BhdGg6IHN0cmluZyk6IFByb21pc2U8YW55PiB7XG5cdGxldCBvdXRwdXQ6IHN0cmluZyA9IGF3YWl0IHJlYWRfZmlsZShmaWxlX3BhdGgpO1xuXHRyZXR1cm4gSlNPTi5wYXJzZShvdXRwdXQpO1xufVxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHdyaXRlX2pzb24oZmlsZV9wYXRoOiBzdHJpbmcsIGRhdGE6IGFueSk6IFByb21pc2U8dm9pZD4ge1xuXHRyZXR1cm4gd3JpdGVfZmlsZShmaWxlX3BhdGgsIEpTT04uc3RyaW5naWZ5KGRhdGEpKTtcbn1cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBkaXJlY3RvcnlfZXhpc3RzKGRpcl9wYXRoOiBzdHJpbmcpOiBQcm9taXNlPGJvb2xlYW4+e1xuXHRsZXQgc3RhdDogYW55ID0gYXdhaXQgc3RhdF9maWxlKGRpcl9wYXRoKVxuXHRcdC5jYXRjaCggZSA9PiB7fSApO1xuXHRyZXR1cm4gKHN0YXQgJiYgc3RhdC5pc0RpcmVjdG9yeSAmJiBzdGF0LmlzRGlyZWN0b3J5KCkpID8gdHJ1ZSA6IGZhbHNlO1xufVxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGZpbGVfZXhpc3RzKGZpbGVfcGF0aDogc3RyaW5nKTogUHJvbWlzZTxib29sZWFuPntcblx0bGV0IHN0YXQ6IGFueSA9IGF3YWl0IHN0YXRfZmlsZShmaWxlX3BhdGgpXG5cdFx0LmNhdGNoKCBlID0+IHt9ICk7XG5cdHJldHVybiAoc3RhdCAmJiBzdGF0LmlzRmlsZSAmJiBzdGF0LmlzRmlsZSgpKSA/IHRydWUgOiBmYWxzZTtcbn1cblxuIl19
