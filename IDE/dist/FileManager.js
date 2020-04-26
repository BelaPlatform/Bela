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
function commit(path) {
    return __awaiter(this, void 0, void 0, function () {
        var fd;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, fs.openAsync(path, 'r')];
                case 1:
                    fd = _a.sent();
                    return [4 /*yield*/, fs.fsyncAsync(fd)];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, fs.closeAsync(fd)];
                case 3:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
function commit_folder(path) {
    return __awaiter(this, void 0, void 0, function () {
        var list, _i, list_1, file_path;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, commit(path)];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, deep_read_directory(path)];
                case 2:
                    list = _a.sent();
                    _i = 0, list_1 = list;
                    _a.label = 3;
                case 3:
                    if (!(_i < list_1.length)) return [3 /*break*/, 6];
                    file_path = list_1[_i];
                    return [4 /*yield*/, commit(path + "/" + file_path.name)];
                case 4:
                    _a.sent();
                    _a.label = 5;
                case 5:
                    _i++;
                    return [3 /*break*/, 3];
                case 6: return [2 /*return*/];
            }
        });
    });
}
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
                    _a.trys.push([2, , 5, 6]);
                    return [4 /*yield*/, fs.outputFileAsync(file_path, data)];
                case 3:
                    _a.sent();
                    return [4 /*yield*/, commit(file_path)];
                case 4:
                    _a.sent();
                    return [3 /*break*/, 6];
                case 5:
                    lock.release();
                    return [7 /*endfinally*/];
                case 6: return [2 /*return*/];
            }
        });
    });
}
exports.write_file = write_file;
function write_folder(file_path) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log(file_path);
                    return [4 /*yield*/, lock.acquire()];
                case 1:
                    _a.sent();
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, , 5, 6]);
                    return [4 /*yield*/, fs.mkdirSync(file_path)];
                case 3:
                    _a.sent();
                    return [4 /*yield*/, commit(file_path)];
                case 4:
                    _a.sent();
                    return [3 /*break*/, 6];
                case 5:
                    lock.release();
                    return [7 /*endfinally*/];
                case 6: return [2 /*return*/];
            }
        });
    });
}
exports.write_folder = write_folder;
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
                    _a.trys.push([2, , 5, 6]);
                    return [4 /*yield*/, fs.moveAsync(src, dest, { overwrite: true })];
                case 3:
                    _a.sent();
                    return [4 /*yield*/, commit(dest)];
                case 4:
                    _a.sent();
                    return [3 /*break*/, 6];
                case 5:
                    lock.release();
                    return [7 /*endfinally*/];
                case 6: return [2 /*return*/];
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
                    out.sort(function (a, b) {
                        return a.toLowerCase().localeCompare(b.toLowerCase());
                    });
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
                case 5: 
                // TODO: this would normally be in the finally(), however it cannot be
                // within lock-guarded section because (for unclear reasons) read_directory
                // (whcih is called under the hood by commit_folder() ) also needs the lock.
                return [4 /*yield*/, commit_folder(dest_path)];
                case 6:
                    // TODO: this would normally be in the finally(), however it cannot be
                    // within lock-guarded section because (for unclear reasons) read_directory
                    // (whcih is called under the hood by commit_folder() ) also needs the lock.
                    _a.sent();
                    return [2 /*return*/];
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
        var contents, output, _i, contents_1, name_1, original_path, path, stat, maxLevels, levels, desc, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, read_directory(dir_path)];
                case 1:
                    contents = _b.sent();
                    output = [];
                    _i = 0, contents_1 = contents;
                    _b.label = 2;
                case 2:
                    if (!(_i < contents_1.length)) return [3 /*break*/, 12];
                    name_1 = contents_1[_i];
                    original_path = dir_path + '/' + name_1;
                    path = original_path;
                    return [4 /*yield*/, stat_file(path)];
                case 3:
                    stat = _b.sent();
                    maxLevels = 100;
                    levels = 0;
                    _b.label = 4;
                case 4:
                    if (!stat.isSymbolicLink()) return [3 /*break*/, 7];
                    return [4 /*yield*/, fs.readlinkAsync(path)];
                case 5:
                    path = _b.sent();
                    if ('/' != path[0])
                        path = dir_path + '/' + path;
                    return [4 /*yield*/, stat_file(path)];
                case 6:
                    stat = _b.sent();
                    ++levels;
                    if (maxLevels <= levels) {
                        return [3 /*break*/, 7];
                    }
                    return [3 /*break*/, 4];
                case 7:
                    if (maxLevels <= levels) {
                        console.error('Unable to properly stat %s: too many symlinks to follow(%d)', original_path, levels);
                        path = original_path;
                    }
                    desc = new util.File_Descriptor(name_1);
                    if (!stat.isDirectory()) return [3 /*break*/, 9];
                    _a = desc;
                    return [4 /*yield*/, deep_read_directory(path)];
                case 8:
                    _a.children = _b.sent();
                    return [3 /*break*/, 10];
                case 9:
                    desc.size = stat.size;
                    _b.label = 10;
                case 10:
                    output.push(desc);
                    _b.label = 11;
                case 11:
                    _i++;
                    return [3 /*break*/, 2];
                case 12: return [2 /*return*/, output];
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
                case 0: return [4 /*yield*/, stat_file(dir_path + "/")
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
function delete_matching_recursive(path, matches) {
    return __awaiter(this, void 0, void 0, function () {
        var all, contents, matching, updated, _i, matching_1, match, full_path, _a, contents_2, file, full_path, stat;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, read_directory(path)];
                case 1:
                    all = _b.sent();
                    return [4 /*yield*/, read_directory(path)];
                case 2:
                    contents = _b.sent();
                    matching = contents.filter(function (file) {
                        var matching = matches.filter(function (match) { return match === file; });
                        return matching.length > 0;
                    });
                    updated = false;
                    _i = 0, matching_1 = matching;
                    _b.label = 3;
                case 3:
                    if (!(_i < matching_1.length)) return [3 /*break*/, 6];
                    match = matching_1[_i];
                    full_path = path + '/' + match;
                    return [4 /*yield*/, delete_file(full_path)];
                case 4:
                    _b.sent();
                    updated = true;
                    _b.label = 5;
                case 5:
                    _i++;
                    return [3 /*break*/, 3];
                case 6:
                    if (!updated) return [3 /*break*/, 8];
                    return [4 /*yield*/, read_directory(path)];
                case 7:
                    contents = _b.sent();
                    _b.label = 8;
                case 8:
                    _a = 0, contents_2 = contents;
                    _b.label = 9;
                case 9:
                    if (!(_a < contents_2.length)) return [3 /*break*/, 12];
                    file = contents_2[_a];
                    full_path = path + '/' + file;
                    return [4 /*yield*/, stat_file(full_path)];
                case 10:
                    stat = _b.sent();
                    if (stat.isDirectory()) {
                        delete_matching_recursive(full_path, matches);
                    }
                    _b.label = 11;
                case 11:
                    _a++;
                    return [3 /*break*/, 9];
                case 12: return [2 /*return*/];
            }
        });
    });
}
exports.delete_matching_recursive = delete_matching_recursive;
