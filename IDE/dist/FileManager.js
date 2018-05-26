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
                    return [4 /*yield*/, fs.readFileAsync(file_path, 'utf8')
                            .catch(function (e) {
                            error_handler(e);
                            return '';
                        })];
                case 2:
                    out = _a.sent();
                    lock.release();
                    return [2 /*return*/, out];
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
                    return [4 /*yield*/, fs.readFileAsync(file_path)
                            .catch(function (e) {
                            error_handler(e);
                            return Buffer.alloc(0);
                        })];
                case 2:
                    out = _a.sent();
                    lock.release();
                    return [2 /*return*/, out];
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
                    return [4 /*yield*/, fs.moveAsync(src, dest, { overwrite: true })
                            .catch(function (e) { return error_handler(e); })];
                case 2:
                    _a.sent();
                    lock.release();
                    return [2 /*return*/];
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
                    return [4 /*yield*/, fs.removeAsync(file_path)
                            .catch(function (e) { return error_handler(e); })];
                case 2:
                    _a.sent();
                    lock.release();
                    return [2 /*return*/];
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
                    return [4 /*yield*/, fs.readdirAsync(dir_path)
                            .catch(function (e) {
                            error_handler(e);
                            return [''];
                        })];
                case 2:
                    out = _a.sent();
                    lock.release();
                    return [2 /*return*/, out];
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
                    return [4 /*yield*/, fs.lstatAsync(file_name)
                            .catch(function (e) { return error_handler(e); })];
                case 2:
                    out = _a.sent();
                    lock.release();
                    return [2 /*return*/, out];
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
                    return [4 /*yield*/, fs.copyAsync(src_path, dest_path)
                            .catch(function (e) { return error_handler(e); })];
                case 2:
                    _a.sent();
                    lock.release();
                    return [2 /*return*/];
            }
        });
    });
}
exports.copy_directory = copy_directory;
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,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QU0sR0FBVyxTQUEwQjtvQkFDL0Msc0JBQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsRUFBQzs7OztDQUMxQjtBQUhELDhCQUdDO0FBQ0Qsb0JBQWlDLFNBQWlCLEVBQUUsSUFBUzs7O1lBQzVELHNCQUFPLFVBQVUsQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFDOzs7Q0FDbkQ7QUFGRCxnQ0FFQztBQUNELDBCQUF1QyxRQUFnQjs7Ozs7d0JBQ3RDLHFCQUFNLFNBQVMsQ0FBQyxRQUFRLENBQUM7eUJBQ3ZDLEtBQUssQ0FBRSxVQUFBLENBQUMsSUFBSyxDQUFDLENBQUUsRUFBQTs7b0JBRGQsSUFBSSxHQUFRLFNBQ0U7b0JBQ2xCLHNCQUFPLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQyxXQUFXLElBQUksSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFDOzs7O0NBQ3ZFO0FBSkQsNENBSUM7QUFDRCxxQkFBa0MsU0FBaUI7Ozs7O3dCQUNsQyxxQkFBTSxTQUFTLENBQUMsU0FBUyxDQUFDO3lCQUN4QyxLQUFLLENBQUUsVUFBQSxDQUFDLElBQUssQ0FBQyxDQUFFLEVBQUE7O29CQURkLElBQUksR0FBUSxTQUNFO29CQUNsQixzQkFBTyxDQUFDLElBQUksSUFBSSxJQUFJLENBQUMsTUFBTSxJQUFJLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBQzs7OztDQUM3RDtBQUpELGtDQUlDIiwiZmlsZSI6IkZpbGVNYW5hZ2VyLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMtZXh0cmEtcHJvbWlzZSc7XG5pbXBvcnQgKiBhcyBpc0JpbmFyeSBmcm9tICdpc2JpbmFyeWZpbGUnO1xuaW1wb3J0ICogYXMgdXRpbCBmcm9tICcuL3V0aWxzJztcbmltcG9ydCB7IExvY2sgfSBmcm9tIFwiLi9Mb2NrXCI7XG5cbi8vIEZpbGVNYW5hZ2VyIGlzIG9ubHkgYXZhaWxhYmxlIGFzIGEgc2luZ2xlIGluc3RhbmNlIGFjY3Jvc3MgdGhlIGFwcCwgZXhwb3J0ZWQgYXMgZm1cbi8vIGl0IGhhcyBhIHByaXZhdGUgTG9jayB3aGljaCBpcyBhbHdheXMgYWNxdWlyZWQgYmVmb3JlIG1hbmlwdWxhdGluZyB0aGUgZmlsZXN5c3RlbVxuLy8gdGh1cyBjb25jdXJlbnQgYWNjZXNzIGlzIHByb2hpYml0ZWRcbi8vIG9ubHkgdGhlIHByaW1pdGl2ZSBmaWxlIGFuZCBkaXJlY3RvcnkgbWFuaXB1bGF0aW9uIG1ldGhvZHMgc2hvdWxkIHRvdWNoIHRoZSBsb2NrXG4vLyBPUiB0aGUgZmlsZXN5c3RlbSwgaW4gdGhlIHdob2xlIGFwcFxuXG52YXIgbG9jazogTG9jayA9IG5ldyBMb2NrKCk7XG5cbi8vIHByaW1pdGl2ZSBmaWxlIGFuZCBkaXJlY3RvcnkgbWFuaXB1bGF0aW9uXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gd3JpdGVfZmlsZShmaWxlX3BhdGg6IHN0cmluZywgZGF0YTogc3RyaW5nKTogUHJvbWlzZTx2b2lkPntcblx0YXdhaXQgbG9jay5hY3F1aXJlKCk7XG5cdHRyeXtcblx0XHRhd2FpdCBmcy5vdXRwdXRGaWxlQXN5bmMoZmlsZV9wYXRoLCBkYXRhKTtcblx0fVxuXHRmaW5hbGx5e1xuXHRcdGxvY2sucmVsZWFzZSgpO1xuXHR9XG59XG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVhZF9maWxlKGZpbGVfcGF0aDogc3RyaW5nKTogUHJvbWlzZTxzdHJpbmc+IHtcblx0YXdhaXQgbG9jay5hY3F1aXJlKCk7XG5cdGxldCBvdXQ6IHN0cmluZyA9IGF3YWl0IGZzLnJlYWRGaWxlQXN5bmMoZmlsZV9wYXRoLCAndXRmOCcpXG5cdFx0LmNhdGNoKCBlID0+IHtcblx0XHRcdGVycm9yX2hhbmRsZXIoZSk7XG5cdFx0XHRyZXR1cm4gJyc7XG5cdFx0fSk7XG5cdGxvY2sucmVsZWFzZSgpO1xuXHRyZXR1cm4gb3V0O1xufVxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJlYWRfZmlsZV9yYXcoZmlsZV9wYXRoOiBzdHJpbmcpOiBQcm9taXNlPEJ1ZmZlcj57XG5cdGF3YWl0IGxvY2suYWNxdWlyZSgpO1xuXHRsZXQgb3V0OiBCdWZmZXIgPSBhd2FpdCBmcy5yZWFkRmlsZUFzeW5jKGZpbGVfcGF0aClcblx0XHQuY2F0Y2goIGUgPT4ge1xuXHRcdFx0ZXJyb3JfaGFuZGxlcihlKTtcblx0XHRcdHJldHVybiBCdWZmZXIuYWxsb2MoMCk7IFxuXHRcdH0pO1xuXHRsb2NrLnJlbGVhc2UoKTtcblx0cmV0dXJuIG91dDtcbn1cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZW5hbWVfZmlsZShzcmM6IHN0cmluZywgZGVzdDogc3RyaW5nKTogUHJvbWlzZTx2b2lkPntcblx0YXdhaXQgbG9jay5hY3F1aXJlKCk7XG5cdGF3YWl0IGZzLm1vdmVBc3luYyhzcmMsIGRlc3QsIHtvdmVyd3JpdGU6IHRydWV9KVxuXHRcdC5jYXRjaCggZSA9PiBlcnJvcl9oYW5kbGVyKGUpICk7XG5cdGxvY2sucmVsZWFzZSgpO1xufVxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGRlbGV0ZV9maWxlKGZpbGVfcGF0aDogc3RyaW5nKTogUHJvbWlzZTx2b2lkPntcblx0YXdhaXQgbG9jay5hY3F1aXJlKCk7XG5cdGF3YWl0IGZzLnJlbW92ZUFzeW5jKGZpbGVfcGF0aClcblx0XHQuY2F0Y2goIGUgPT4gZXJyb3JfaGFuZGxlcihlKSApO1xuXHRsb2NrLnJlbGVhc2UoKTtcbn1cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZWFkX2RpcmVjdG9yeShkaXJfcGF0aDogc3RyaW5nKTogUHJvbWlzZTxzdHJpbmdbXT57XG5cdGF3YWl0IGxvY2suYWNxdWlyZSgpO1xuXHRsZXQgb3V0OiBzdHJpbmdbXSA9IGF3YWl0IGZzLnJlYWRkaXJBc3luYyhkaXJfcGF0aClcblx0XHQuY2F0Y2goIGUgPT4ge1xuXHRcdFx0ZXJyb3JfaGFuZGxlcihlKTtcblx0XHRcdHJldHVybiBbJyddOyBcblx0XHR9KTtcblx0bG9jay5yZWxlYXNlKCk7XG5cdHJldHVybiBvdXQ7XG59XG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gc3RhdF9maWxlKGZpbGVfbmFtZTogc3RyaW5nKTogUHJvbWlzZTxhbnk+e1xuXHRhd2FpdCBsb2NrLmFjcXVpcmUoKTtcblx0bGV0IG91dDogYW55ID0gYXdhaXQgZnMubHN0YXRBc3luYyhmaWxlX25hbWUpXG5cdFx0LmNhdGNoKCBlID0+IGVycm9yX2hhbmRsZXIoZSkgKTtcblx0bG9jay5yZWxlYXNlKCk7XG5cdHJldHVybiBvdXQ7XG59XG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gY29weV9kaXJlY3Rvcnkoc3JjX3BhdGg6IHN0cmluZywgZGVzdF9wYXRoOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+e1xuXHRhd2FpdCBsb2NrLmFjcXVpcmUoKTtcblx0YXdhaXQgZnMuY29weUFzeW5jKHNyY19wYXRoLCBkZXN0X3BhdGgpXG5cdFx0LmNhdGNoKCBlID0+IGVycm9yX2hhbmRsZXIoZSkgKTtcblx0bG9jay5yZWxlYXNlKCk7XG59XG4vLyBmb3Igc29tZSByZWFzb24gZnMgZG9lcyBub3QgaGF2ZSBlbnN1cmVTeW1MaW5rQXN5bmMgb3IgZW1wdHlEaXJBc3luY1xuLy8gc28gcHJvbWlzaWZ5IHRoZW0gbWFudWFsbHlcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBtYWtlX3N5bWxpbmsoc3JjX3BhdGg6IHN0cmluZywgZGVzdF9wYXRoOiBzdHJpbmcpOiBQcm9taXNlPGFueT57XG5cdGF3YWl0IGxvY2suYWNxdWlyZSgpO1xuXHRyZXR1cm4gbmV3IFByb21pc2UoIChyZXNvbHZlLCByZWplY3QpID0+IHtcblx0XHRmcy5lbnN1cmVTeW1saW5rKHNyY19wYXRoLCBkZXN0X3BhdGgsIGVyciA9PiB7XG5cdFx0XHRsb2NrLnJlbGVhc2UoKTtcblx0XHRcdGlmIChlcnIpIHJlamVjdChlcnIpO1xuXHRcdFx0cmVzb2x2ZSgpO1xuXHRcdH0pO1xuXHR9KTtcbn1cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBlbXB0eV9kaXJlY3RvcnkoZGlyX3BhdGg6IHN0cmluZyk6IFByb21pc2U8YW55Pntcblx0YXdhaXQgbG9jay5hY3F1aXJlKCk7XG5cdHJldHVybiBuZXcgUHJvbWlzZSggKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuXHRmcy5lbXB0eURpcihkaXJfcGF0aCwgZXJyID0+IHtcblx0XHRcdGxvY2sucmVsZWFzZSgpO1xuXHRcdFx0aWYgKGVycikgcmVqZWN0KGVycik7XG5cdFx0XHRyZXNvbHZlKCk7XG5cdFx0fSk7XG5cdH0pO1xufVxuLy8gc29waGlzdGljYXRlZCBmaWxlIGFuZCBkaXJlY3RvcnkgbWFuaXB1bGF0aW9uXG5leHBvcnQge3NhdmVfZmlsZSBhcyBzYXZlX2ZpbGV9IGZyb20gJy4vU2F2ZUZpbGUnO1xuXG4vLyByZWN1cnNpdmVseSByZWFkIHRoZSBjb250ZW50cyBvZiBhIGRpcmVjdG9yeSwgcmV0dXJuaW5nIGFuIGFycmF5IG9mIEZpbGVfRGVzY3JpcHRvcnNcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBkZWVwX3JlYWRfZGlyZWN0b3J5KGRpcl9wYXRoOiBzdHJpbmcpOiBQcm9taXNlPHV0aWwuRmlsZV9EZXNjcmlwdG9yW10+e1xuXHRsZXQgY29udGVudHM6IGFueSA9IGF3YWl0IHJlYWRfZGlyZWN0b3J5KGRpcl9wYXRoKTtcblx0bGV0IG91dHB1dDogdXRpbC5GaWxlX0Rlc2NyaXB0b3JbXSA9IFtdO1xuXHRmb3IgKGxldCBuYW1lIG9mIGNvbnRlbnRzKXtcblx0XHRsZXQgc3RhdCA9IGF3YWl0IHN0YXRfZmlsZShkaXJfcGF0aCsnLycrbmFtZSk7XG5cdFx0bGV0IGRlc2M6IHV0aWwuRmlsZV9EZXNjcmlwdG9yID0gbmV3IHV0aWwuRmlsZV9EZXNjcmlwdG9yKG5hbWUpO1xuXHRcdGlmIChzdGF0LmlzRGlyZWN0b3J5KCkpXG5cdFx0XHRkZXNjLmNoaWxkcmVuID0gYXdhaXQgZGVlcF9yZWFkX2RpcmVjdG9yeShkaXJfcGF0aCsnLycrbmFtZSk7XG5cdFx0ZWxzZVxuXHRcdFx0ZGVzYy5zaXplID0gc3RhdC5zaXplO1xuXHRcdG91dHB1dC5wdXNoKGRlc2MpO1xuXHR9XG5cdHJldHVybiBvdXRwdXQ7XG59XG5cbi8vIGNoZWNrcyBpZiBhIGZpbGUgaXMgYmluYXJ5IC0gb25seSByZWFkcyBhIGZldyB0aG91c2FuZCBieXRlcyBhdCBtb3N0XG4vLyByZXR1cm5zIGEgYm9vbGVhbiB3aGVuIGF3YWl0ZWRcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBpc19iaW5hcnkoZmlsZV9wYXRoOiBzdHJpbmcpe1xuXHRhd2FpdCBsb2NrLmFjcXVpcmUoKTtcblx0cmV0dXJuIG5ldyBQcm9taXNlKCAocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG5cdFx0aXNCaW5hcnkoZmlsZV9wYXRoLCAoZXJyOiBhbnksIHJlc3VsdDogYW55KSA9PiB7XG5cdFx0XHRsb2NrLnJlbGVhc2UoKTtcblx0XHRcdGlmIChlcnIpIHJlamVjdChlcnIpO1xuXHRcdFx0cmVzb2x2ZShyZXN1bHQpO1xuXHRcdH0pO1xuXHR9KTtcbn1cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZWFkX2pzb24oZmlsZV9wYXRoOiBzdHJpbmcpOiBQcm9taXNlPGFueT4ge1xuXHRsZXQgb3V0cHV0OiBzdHJpbmcgPSBhd2FpdCByZWFkX2ZpbGUoZmlsZV9wYXRoKTtcblx0cmV0dXJuIEpTT04ucGFyc2Uob3V0cHV0KTtcbn1cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiB3cml0ZV9qc29uKGZpbGVfcGF0aDogc3RyaW5nLCBkYXRhOiBhbnkpOiBQcm9taXNlPHZvaWQ+IHtcblx0cmV0dXJuIHdyaXRlX2ZpbGUoZmlsZV9wYXRoLCBKU09OLnN0cmluZ2lmeShkYXRhKSk7XG59XG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZGlyZWN0b3J5X2V4aXN0cyhkaXJfcGF0aDogc3RyaW5nKTogUHJvbWlzZTxib29sZWFuPntcblx0bGV0IHN0YXQ6IGFueSA9IGF3YWl0IHN0YXRfZmlsZShkaXJfcGF0aClcblx0XHQuY2F0Y2goIGUgPT4ge30gKTtcblx0cmV0dXJuIChzdGF0ICYmIHN0YXQuaXNEaXJlY3RvcnkgJiYgc3RhdC5pc0RpcmVjdG9yeSgpKSA/IHRydWUgOiBmYWxzZTtcbn1cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBmaWxlX2V4aXN0cyhmaWxlX3BhdGg6IHN0cmluZyk6IFByb21pc2U8Ym9vbGVhbj57XG5cdGxldCBzdGF0OiBhbnkgPSBhd2FpdCBzdGF0X2ZpbGUoZmlsZV9wYXRoKVxuXHRcdC5jYXRjaCggZSA9PiB7fSApO1xuXHRyZXR1cm4gKHN0YXQgJiYgc3RhdC5pc0ZpbGUgJiYgc3RhdC5pc0ZpbGUoKSkgPyB0cnVlIDogZmFsc2U7XG59XG5cbiJdfQ==
