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
var Lock_1 = require("./Lock");
// FileManager is only available as a single instance accross the app, exported as fm
// it has a private Lock which is always acquired before manipulating the filesystem
// thus concurent access is prohibited
// only the primitive file and directory manipulation methods should touch the lock
// OR the filesystem, in the whole app
var FileManager = /** @class */ (function () {
    function FileManager() {
        this.lock = new Lock_1.Lock();
        this.save_lock = new Lock_1.Lock();
    }
    FileManager.prototype.error_handler = function (e) {
        this.lock.release();
        throw e;
    };
    // primitive file and directory manipulation
    FileManager.prototype.write_file = function (file_path, data) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.lock.acquire()];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, fs.outputFileAsync(file_path, data)
                                .catch(function (e) { return _this.error_handler(e); })];
                    case 2:
                        _a.sent();
                        this.lock.release();
                        return [2 /*return*/];
                }
            });
        });
    };
    FileManager.prototype.read_file = function (file_path) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            var out;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.lock.acquire()];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, fs.readFileAsync(file_path, 'utf8')
                                .catch(function (e) {
                                _this.error_handler(e);
                                return '';
                            })];
                    case 2:
                        out = _a.sent();
                        this.lock.release();
                        return [2 /*return*/, out];
                }
            });
        });
    };
    FileManager.prototype.read_file_raw = function (file_path) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            var out;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.lock.acquire()];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, fs.readFileAsync(file_path)
                                .catch(function (e) {
                                _this.error_handler(e);
                                return Buffer.alloc(0);
                            })];
                    case 2:
                        out = _a.sent();
                        this.lock.release();
                        return [2 /*return*/, out];
                }
            });
        });
    };
    FileManager.prototype.rename_file = function (src, dest) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.lock.acquire()];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, fs.moveAsync(src, dest, { overwrite: true })
                                .catch(function (e) { return _this.error_handler(e); })];
                    case 2:
                        _a.sent();
                        this.lock.release();
                        return [2 /*return*/];
                }
            });
        });
    };
    FileManager.prototype.delete_file = function (file_path) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.lock.acquire()];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, fs.removeAsync(file_path)
                                .catch(function (e) { return _this.error_handler(e); })];
                    case 2:
                        _a.sent();
                        this.lock.release();
                        return [2 /*return*/];
                }
            });
        });
    };
    FileManager.prototype.read_directory = function (dir_path) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            var out;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.lock.acquire()];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, fs.readdirAsync(dir_path)
                                .catch(function (e) {
                                _this.error_handler(e);
                                return [''];
                            })];
                    case 2:
                        out = _a.sent();
                        this.lock.release();
                        return [2 /*return*/, out];
                }
            });
        });
    };
    FileManager.prototype.stat_file = function (file_name) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            var out;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.lock.acquire()];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, fs.lstatAsync(file_name)
                                .catch(function (e) { return _this.error_handler(e); })];
                    case 2:
                        out = _a.sent();
                        this.lock.release();
                        return [2 /*return*/, out];
                }
            });
        });
    };
    FileManager.prototype.copy_directory = function (src_path, dest_path) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.lock.acquire()];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, fs.copyAsync(src_path, dest_path)
                                .catch(function (e) { return _this.error_handler(e); })];
                    case 2:
                        _a.sent();
                        this.lock.release();
                        return [2 /*return*/];
                }
            });
        });
    };
    // for some reason fs does not have ensureSymLinkAsync or emptyDirAsync
    // so promisify them manually
    FileManager.prototype.make_symlink = function (src_path, dest_path) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.lock.acquire()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/, new Promise(function (resolve, reject) {
                                fs.ensureSymlink(src_path, dest_path, function (err) {
                                    _this.lock.release();
                                    if (err)
                                        reject(err);
                                    resolve();
                                });
                            })];
                }
            });
        });
    };
    FileManager.prototype.empty_directory = function (dir_path) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.lock.acquire()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/, new Promise(function (resolve, reject) {
                                fs.emptyDir(dir_path, function (err) {
                                    _this.lock.release();
                                    if (err)
                                        reject(err);
                                    resolve();
                                });
                            })];
                }
            });
        });
    };
    // sophisticated file and directory manipulation
    // save_file follows vim's strategy to save a file in a crash-proof way
    // it first writes the file to .<file_name>~
    // then it deletes the existing file at <file_name>
    // then it renames .<file_name>~ to <file_name>
    // if a path is given, a lockfile is also created and destroyed
    // save_file has its own mutex, so it cannot run concurrently with itself
    FileManager.prototype.save_file = function (file_name, file_content, lockfile) {
        if (lockfile === void 0) { lockfile = undefined; }
        return __awaiter(this, void 0, void 0, function () {
            var e_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.save_lock.acquire()];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 10, , 11]);
                        if (!lockfile) return [3 /*break*/, 4];
                        return [4 /*yield*/, this.write_file(lockfile, file_name)];
                    case 3:
                        _a.sent();
                        _a.label = 4;
                    case 4: return [4 /*yield*/, this.write_file('.' + file_name + '~', file_content)];
                    case 5:
                        _a.sent();
                        return [4 /*yield*/, this.delete_file(file_name)];
                    case 6:
                        _a.sent();
                        return [4 /*yield*/, this.rename_file('.' + file_name + '~', file_name)];
                    case 7:
                        _a.sent();
                        if (!lockfile) return [3 /*break*/, 9];
                        return [4 /*yield*/, this.delete_file(lockfile)];
                    case 8:
                        _a.sent();
                        _a.label = 9;
                    case 9: return [3 /*break*/, 11];
                    case 10:
                        e_1 = _a.sent();
                        this.save_lock.release();
                        throw e_1;
                    case 11:
                        this.save_lock.release();
                        return [2 /*return*/];
                }
            });
        });
    };
    // recursively read the contents of a directory, returning an array of File_Descriptors
    FileManager.prototype.deep_read_directory = function (dir_path) {
        return __awaiter(this, void 0, void 0, function () {
            var contents, output, _i, contents_1, name_1, stat, desc, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, this.read_directory(dir_path)];
                    case 1:
                        contents = _b.sent();
                        output = [];
                        _i = 0, contents_1 = contents;
                        _b.label = 2;
                    case 2:
                        if (!(_i < contents_1.length)) return [3 /*break*/, 8];
                        name_1 = contents_1[_i];
                        return [4 /*yield*/, this.stat_file(dir_path + '/' + name_1)];
                    case 3:
                        stat = _b.sent();
                        desc = new File_Descriptor(name_1);
                        if (!stat.isDirectory()) return [3 /*break*/, 5];
                        _a = desc;
                        return [4 /*yield*/, this.deep_read_directory(dir_path + '/' + name_1)];
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
    };
    // checks if a file is binary - only reads a few thousand bytes at most
    // returns a boolean when awaited
    FileManager.prototype.is_binary = function (file_path) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.lock.acquire()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/, new Promise(function (resolve, reject) {
                                isBinary(file_path, function (err, result) {
                                    _this.lock.release();
                                    if (err)
                                        reject(err);
                                    resolve(result);
                                });
                            })];
                }
            });
        });
    };
    FileManager.prototype.read_json = function (file_path) {
        return __awaiter(this, void 0, void 0, function () {
            var output;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.read_file(file_path)];
                    case 1:
                        output = _a.sent();
                        return [2 /*return*/, JSON.parse(output)];
                }
            });
        });
    };
    FileManager.prototype.write_json = function (file_path, data) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.write_file(file_path, JSON.stringify(data))];
            });
        });
    };
    FileManager.prototype.directory_exists = function (dir_path) {
        return __awaiter(this, void 0, void 0, function () {
            var stat;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.stat_file(dir_path)
                            .catch(function (e) { })];
                    case 1:
                        stat = _a.sent();
                        return [2 /*return*/, (stat && stat.isDirectory && stat.isDirectory()) ? true : false];
                }
            });
        });
    };
    FileManager.prototype.file_exists = function (file_path) {
        return __awaiter(this, void 0, void 0, function () {
            var stat;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.stat_file(file_path)
                            .catch(function (e) { })];
                    case 1:
                        stat = _a.sent();
                        return [2 /*return*/, (stat && stat.isFile && stat.isFile()) ? true : false];
                }
            });
        });
    };
    return FileManager;
}());
var File_Descriptor = /** @class */ (function () {
    function File_Descriptor(name, size, children) {
        if (size === void 0) { size = undefined; }
        if (children === void 0) { children = undefined; }
        this.size = undefined;
        this.children = undefined;
        this.name = name;
        this.size = size;
        this.children = children;
    }
    return File_Descriptor;
}());
exports.File_Descriptor = File_Descriptor;
var fm = new FileManager();
exports.fm = fm;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIkZpbGVNYW5hZ2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxxQ0FBdUM7QUFDdkMsdUNBQXlDO0FBQ3pDLCtCQUE4QjtBQUU5QixxRkFBcUY7QUFDckYsb0ZBQW9GO0FBQ3BGLHNDQUFzQztBQUN0QyxtRkFBbUY7QUFDbkYsc0NBQXNDO0FBRXRDO0lBR0M7UUFDQyxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksV0FBSSxFQUFFLENBQUM7UUFDdkIsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLFdBQUksRUFBRSxDQUFDO0lBQzdCLENBQUM7SUFFTyxtQ0FBYSxHQUFyQixVQUFzQixDQUFRO1FBQzdCLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDcEIsTUFBTSxDQUFDLENBQUM7SUFDVCxDQUFDO0lBRUQsNENBQTRDO0lBQ3RDLGdDQUFVLEdBQWhCLFVBQWlCLFNBQWlCLEVBQUUsSUFBWTs7Ozs7NEJBQy9DLHFCQUFNLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLEVBQUE7O3dCQUF6QixTQUF5QixDQUFDO3dCQUMxQixxQkFBTSxFQUFFLENBQUMsZUFBZSxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUM7aUNBQ3ZDLEtBQUssQ0FBRSxVQUFBLENBQUMsSUFBSSxPQUFBLEtBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLEVBQXJCLENBQXFCLENBQUUsRUFBQTs7d0JBRHJDLFNBQ3FDLENBQUM7d0JBQ3RDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7Ozs7O0tBQ3BCO0lBQ0ssK0JBQVMsR0FBZixVQUFnQixTQUFpQjs7Ozs7OzRCQUNoQyxxQkFBTSxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxFQUFBOzt3QkFBekIsU0FBeUIsQ0FBQzt3QkFDUixxQkFBTSxFQUFFLENBQUMsYUFBYSxDQUFDLFNBQVMsRUFBRSxNQUFNLENBQUM7aUNBQ3pELEtBQUssQ0FBRSxVQUFBLENBQUM7Z0NBQ1IsS0FBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQ0FDdEIsT0FBTyxFQUFFLENBQUM7NEJBQ1gsQ0FBQyxDQUFDLEVBQUE7O3dCQUpDLEdBQUcsR0FBVyxTQUlmO3dCQUNILElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7d0JBQ3BCLHNCQUFPLEdBQUcsRUFBQzs7OztLQUNYO0lBQ0ssbUNBQWEsR0FBbkIsVUFBb0IsU0FBaUI7Ozs7Ozs0QkFDcEMscUJBQU0sSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsRUFBQTs7d0JBQXpCLFNBQXlCLENBQUM7d0JBQ1IscUJBQU0sRUFBRSxDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUM7aUNBQ2pELEtBQUssQ0FBRSxVQUFBLENBQUM7Z0NBQ1IsS0FBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQ0FDdEIsT0FBTyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDOzRCQUN4QixDQUFDLENBQUMsRUFBQTs7d0JBSkMsR0FBRyxHQUFXLFNBSWY7d0JBQ0gsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQzt3QkFDcEIsc0JBQU8sR0FBRyxFQUFDOzs7O0tBQ1g7SUFDSyxpQ0FBVyxHQUFqQixVQUFrQixHQUFXLEVBQUUsSUFBWTs7Ozs7NEJBQzFDLHFCQUFNLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLEVBQUE7O3dCQUF6QixTQUF5QixDQUFDO3dCQUMxQixxQkFBTSxFQUFFLENBQUMsU0FBUyxDQUFDLEdBQUcsRUFBRSxJQUFJLEVBQUUsRUFBQyxTQUFTLEVBQUUsSUFBSSxFQUFDLENBQUM7aUNBQzlDLEtBQUssQ0FBRSxVQUFBLENBQUMsSUFBSSxPQUFBLEtBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLEVBQXJCLENBQXFCLENBQUUsRUFBQTs7d0JBRHJDLFNBQ3FDLENBQUM7d0JBQ3RDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7Ozs7O0tBQ3BCO0lBQ0ssaUNBQVcsR0FBakIsVUFBa0IsU0FBaUI7Ozs7OzRCQUNsQyxxQkFBTSxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxFQUFBOzt3QkFBekIsU0FBeUIsQ0FBQzt3QkFDMUIscUJBQU0sRUFBRSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUM7aUNBQzdCLEtBQUssQ0FBRSxVQUFBLENBQUMsSUFBSSxPQUFBLEtBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLEVBQXJCLENBQXFCLENBQUUsRUFBQTs7d0JBRHJDLFNBQ3FDLENBQUM7d0JBQ3RDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7Ozs7O0tBQ3BCO0lBQ0ssb0NBQWMsR0FBcEIsVUFBcUIsUUFBZ0I7Ozs7Ozs0QkFDcEMscUJBQU0sSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsRUFBQTs7d0JBQXpCLFNBQXlCLENBQUM7d0JBQ04scUJBQU0sRUFBRSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUM7aUNBQ2pELEtBQUssQ0FBRSxVQUFBLENBQUM7Z0NBQ1IsS0FBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQ0FDdEIsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDOzRCQUNiLENBQUMsQ0FBQyxFQUFBOzt3QkFKQyxHQUFHLEdBQWEsU0FJakI7d0JBQ0gsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQzt3QkFDcEIsc0JBQU8sR0FBRyxFQUFDOzs7O0tBQ1g7SUFDSywrQkFBUyxHQUFmLFVBQWdCLFNBQWlCOzs7Ozs7NEJBQ2hDLHFCQUFNLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLEVBQUE7O3dCQUF6QixTQUF5QixDQUFDO3dCQUNYLHFCQUFNLEVBQUUsQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDO2lDQUMzQyxLQUFLLENBQUUsVUFBQSxDQUFDLElBQUksT0FBQSxLQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxFQUFyQixDQUFxQixDQUFFLEVBQUE7O3dCQURqQyxHQUFHLEdBQVEsU0FDc0I7d0JBQ3JDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7d0JBQ3BCLHNCQUFPLEdBQUcsRUFBQzs7OztLQUNYO0lBQ0ssb0NBQWMsR0FBcEIsVUFBcUIsUUFBZ0IsRUFBRSxTQUFpQjs7Ozs7NEJBQ3ZELHFCQUFNLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLEVBQUE7O3dCQUF6QixTQUF5QixDQUFDO3dCQUMxQixxQkFBTSxFQUFFLENBQUMsU0FBUyxDQUFDLFFBQVEsRUFBRSxTQUFTLENBQUM7aUNBQ3JDLEtBQUssQ0FBRSxVQUFBLENBQUMsSUFBSSxPQUFBLEtBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLEVBQXJCLENBQXFCLENBQUUsRUFBQTs7d0JBRHJDLFNBQ3FDLENBQUM7d0JBQ3RDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7Ozs7O0tBQ3BCO0lBQ0QsdUVBQXVFO0lBQ3ZFLDZCQUE2QjtJQUN2QixrQ0FBWSxHQUFsQixVQUFtQixRQUFnQixFQUFFLFNBQWlCOzs7Ozs0QkFDckQscUJBQU0sSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsRUFBQTs7d0JBQXpCLFNBQXlCLENBQUM7d0JBQzFCLHNCQUFPLElBQUksT0FBTyxDQUFFLFVBQUMsT0FBTyxFQUFFLE1BQU07Z0NBQ25DLEVBQUUsQ0FBQyxhQUFhLENBQUMsUUFBUSxFQUFFLFNBQVMsRUFBRSxVQUFBLEdBQUc7b0NBQ3hDLEtBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7b0NBQ3BCLElBQUksR0FBRzt3Q0FBRSxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7b0NBQ3JCLE9BQU8sRUFBRSxDQUFDO2dDQUNYLENBQUMsQ0FBQyxDQUFDOzRCQUNKLENBQUMsQ0FBQyxFQUFDOzs7O0tBQ0g7SUFDSyxxQ0FBZSxHQUFyQixVQUFzQixRQUFnQjs7Ozs7NEJBQ3JDLHFCQUFNLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLEVBQUE7O3dCQUF6QixTQUF5QixDQUFDO3dCQUMxQixzQkFBTyxJQUFJLE9BQU8sQ0FBRSxVQUFDLE9BQU8sRUFBRSxNQUFNO2dDQUNuQyxFQUFFLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxVQUFBLEdBQUc7b0NBQ3hCLEtBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7b0NBQ3BCLElBQUksR0FBRzt3Q0FBRSxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7b0NBQ3JCLE9BQU8sRUFBRSxDQUFDO2dDQUNYLENBQUMsQ0FBQyxDQUFDOzRCQUNKLENBQUMsQ0FBQyxFQUFDOzs7O0tBQ0g7SUFFRCxnREFBZ0Q7SUFFaEQsdUVBQXVFO0lBQ3ZFLDRDQUE0QztJQUM1QyxtREFBbUQ7SUFDbkQsK0NBQStDO0lBQy9DLCtEQUErRDtJQUMvRCx5RUFBeUU7SUFDbkUsK0JBQVMsR0FBZixVQUFnQixTQUFpQixFQUFFLFlBQW9CLEVBQUUsUUFBc0M7UUFBdEMseUJBQUEsRUFBQSxvQkFBc0M7Ozs7OzRCQUM5RixxQkFBTSxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sRUFBRSxFQUFBOzt3QkFBOUIsU0FBOEIsQ0FBQzs7Ozs2QkFFMUIsUUFBUSxFQUFSLHdCQUFRO3dCQUNYLHFCQUFNLElBQUksQ0FBQyxVQUFVLENBQUMsUUFBUSxFQUFFLFNBQVMsQ0FBQyxFQUFBOzt3QkFBMUMsU0FBMEMsQ0FBQzs7NEJBQzVDLHFCQUFNLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxHQUFDLFNBQVMsR0FBQyxHQUFHLEVBQUUsWUFBWSxDQUFDLEVBQUE7O3dCQUF0RCxTQUFzRCxDQUFDO3dCQUN2RCxxQkFBTSxJQUFJLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxFQUFBOzt3QkFBakMsU0FBaUMsQ0FBQzt3QkFDbEMscUJBQU0sSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLEdBQUMsU0FBUyxHQUFDLEdBQUcsRUFBRSxTQUFTLENBQUMsRUFBQTs7d0JBQXBELFNBQW9ELENBQUM7NkJBQ2pELFFBQVEsRUFBUix3QkFBUTt3QkFDWCxxQkFBTSxJQUFJLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxFQUFBOzt3QkFBaEMsU0FBZ0MsQ0FBQTs7Ozs7d0JBR2pDLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxFQUFFLENBQUM7d0JBQ3pCLE1BQU0sR0FBQyxDQUFDOzt3QkFFVCxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sRUFBRSxDQUFDOzs7OztLQUN6QjtJQUVELHVGQUF1RjtJQUNqRix5Q0FBbUIsR0FBekIsVUFBMEIsUUFBZ0I7Ozs7OzRCQUNyQixxQkFBTSxJQUFJLENBQUMsY0FBYyxDQUFDLFFBQVEsQ0FBQyxFQUFBOzt3QkFBbkQsUUFBUSxHQUFRLFNBQW1DO3dCQUNuRCxNQUFNLEdBQXNCLEVBQUUsQ0FBQzs4QkFDVixFQUFSLHFCQUFROzs7NkJBQVIsQ0FBQSxzQkFBUSxDQUFBO3dCQUFwQjt3QkFDTyxxQkFBTSxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsR0FBQyxHQUFHLEdBQUMsTUFBSSxDQUFDLEVBQUE7O3dCQUE5QyxJQUFJLEdBQUcsU0FBdUM7d0JBQzlDLElBQUksR0FBb0IsSUFBSSxlQUFlLENBQUMsTUFBSSxDQUFDLENBQUM7NkJBQ2xELElBQUksQ0FBQyxXQUFXLEVBQUUsRUFBbEIsd0JBQWtCO3dCQUNyQixLQUFBLElBQUksQ0FBQTt3QkFBWSxxQkFBTSxJQUFJLENBQUMsbUJBQW1CLENBQUMsUUFBUSxHQUFDLEdBQUcsR0FBQyxNQUFJLENBQUMsRUFBQTs7d0JBQWpFLEdBQUssUUFBUSxHQUFHLFNBQWlELENBQUM7Ozt3QkFFbEUsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDOzs7d0JBQ3ZCLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7Ozt3QkFQRixJQUFRLENBQUE7OzRCQVN6QixzQkFBTyxNQUFNLEVBQUM7Ozs7S0FDZDtJQUVELHVFQUF1RTtJQUN2RSxpQ0FBaUM7SUFDM0IsK0JBQVMsR0FBZixVQUFnQixTQUFpQjs7Ozs7NEJBQ2hDLHFCQUFNLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLEVBQUE7O3dCQUF6QixTQUF5QixDQUFDO3dCQUMxQixzQkFBTyxJQUFJLE9BQU8sQ0FBRSxVQUFDLE9BQU8sRUFBRSxNQUFNO2dDQUNuQyxRQUFRLENBQUMsU0FBUyxFQUFFLFVBQUMsR0FBUSxFQUFFLE1BQVc7b0NBQ3pDLEtBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7b0NBQ3BCLElBQUksR0FBRzt3Q0FBRSxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7b0NBQ3JCLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztnQ0FDakIsQ0FBQyxDQUFDLENBQUM7NEJBQ0osQ0FBQyxDQUFDLEVBQUM7Ozs7S0FDSDtJQUVLLCtCQUFTLEdBQWYsVUFBZ0IsU0FBaUI7Ozs7OzRCQUNYLHFCQUFNLElBQUksQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLEVBQUE7O3dCQUFoRCxNQUFNLEdBQVcsU0FBK0I7d0JBQ3BELHNCQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLEVBQUM7Ozs7S0FDMUI7SUFDSyxnQ0FBVSxHQUFoQixVQUFpQixTQUFpQixFQUFFLElBQVM7OztnQkFDNUMsc0JBQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFDOzs7S0FDeEQ7SUFFSyxzQ0FBZ0IsR0FBdEIsVUFBdUIsUUFBZ0I7Ozs7OzRCQUN0QixxQkFBTSxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQzs2QkFDNUMsS0FBSyxDQUFFLFVBQUEsQ0FBQyxJQUFLLENBQUMsQ0FBRSxFQUFBOzt3QkFEZCxJQUFJLEdBQVEsU0FDRTt3QkFDbEIsc0JBQU8sQ0FBQyxJQUFJLElBQUksSUFBSSxDQUFDLFdBQVcsSUFBSSxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUM7Ozs7S0FDdkU7SUFDSyxpQ0FBVyxHQUFqQixVQUFrQixTQUFpQjs7Ozs7NEJBQ2xCLHFCQUFNLElBQUksQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDOzZCQUM3QyxLQUFLLENBQUUsVUFBQSxDQUFDLElBQUssQ0FBQyxDQUFFLEVBQUE7O3dCQURkLElBQUksR0FBUSxTQUNFO3dCQUNsQixzQkFBTyxDQUFDLElBQUksSUFBSSxJQUFJLENBQUMsTUFBTSxJQUFJLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBQzs7OztLQUM3RDtJQUNGLGtCQUFDO0FBQUQsQ0EzS0EsQUEyS0MsSUFBQTtBQUVEO0lBQ0MseUJBQVksSUFBWSxFQUFFLElBQWtDLEVBQUUsUUFBaUQ7UUFBckYscUJBQUEsRUFBQSxnQkFBa0M7UUFBRSx5QkFBQSxFQUFBLG9CQUFpRDtRQU0vRyxTQUFJLEdBQXVCLFNBQVMsQ0FBQztRQUNyQyxhQUFRLEdBQWtDLFNBQVMsQ0FBQztRQU5uRCxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQztRQUNqQixJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQztRQUNqQixJQUFJLENBQUMsUUFBUSxHQUFHLFFBQVEsQ0FBQztJQUMxQixDQUFDO0lBSUYsc0JBQUM7QUFBRCxDQVRBLEFBU0MsSUFBQTtBQVRZLDBDQUFlO0FBVzVCLElBQUksRUFBRSxHQUFHLElBQUksV0FBVyxFQUFFLENBQUM7QUFDbkIsZ0JBQUUiLCJmaWxlIjoiRmlsZU1hbmFnZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBmcyBmcm9tICdmcy1leHRyYS1wcm9taXNlJztcbmltcG9ydCAqIGFzIGlzQmluYXJ5IGZyb20gJ2lzYmluYXJ5ZmlsZSc7XG5pbXBvcnQgeyBMb2NrIH0gZnJvbSBcIi4vTG9ja1wiO1xuXG4vLyBGaWxlTWFuYWdlciBpcyBvbmx5IGF2YWlsYWJsZSBhcyBhIHNpbmdsZSBpbnN0YW5jZSBhY2Nyb3NzIHRoZSBhcHAsIGV4cG9ydGVkIGFzIGZtXG4vLyBpdCBoYXMgYSBwcml2YXRlIExvY2sgd2hpY2ggaXMgYWx3YXlzIGFjcXVpcmVkIGJlZm9yZSBtYW5pcHVsYXRpbmcgdGhlIGZpbGVzeXN0ZW1cbi8vIHRodXMgY29uY3VyZW50IGFjY2VzcyBpcyBwcm9oaWJpdGVkXG4vLyBvbmx5IHRoZSBwcmltaXRpdmUgZmlsZSBhbmQgZGlyZWN0b3J5IG1hbmlwdWxhdGlvbiBtZXRob2RzIHNob3VsZCB0b3VjaCB0aGUgbG9ja1xuLy8gT1IgdGhlIGZpbGVzeXN0ZW0sIGluIHRoZSB3aG9sZSBhcHBcblxuY2xhc3MgRmlsZU1hbmFnZXIge1xuXHRwcml2YXRlIGxvY2s6IExvY2s7XG5cdHByaXZhdGUgc2F2ZV9sb2NrOiBMb2NrO1xuXHRjb25zdHJ1Y3Rvcigpe1xuXHRcdHRoaXMubG9jayA9IG5ldyBMb2NrKCk7XG5cdFx0dGhpcy5zYXZlX2xvY2sgPSBuZXcgTG9jaygpO1xuXHR9XG5cblx0cHJpdmF0ZSBlcnJvcl9oYW5kbGVyKGU6IEVycm9yKXtcblx0XHR0aGlzLmxvY2sucmVsZWFzZSgpO1xuXHRcdHRocm93IGU7XG5cdH1cblxuXHQvLyBwcmltaXRpdmUgZmlsZSBhbmQgZGlyZWN0b3J5IG1hbmlwdWxhdGlvblxuXHRhc3luYyB3cml0ZV9maWxlKGZpbGVfcGF0aDogc3RyaW5nLCBkYXRhOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+e1xuXHRcdGF3YWl0IHRoaXMubG9jay5hY3F1aXJlKCk7XG5cdFx0YXdhaXQgZnMub3V0cHV0RmlsZUFzeW5jKGZpbGVfcGF0aCwgZGF0YSlcblx0XHRcdC5jYXRjaCggZSA9PiB0aGlzLmVycm9yX2hhbmRsZXIoZSkgKTtcblx0XHR0aGlzLmxvY2sucmVsZWFzZSgpO1xuXHR9XG5cdGFzeW5jIHJlYWRfZmlsZShmaWxlX3BhdGg6IHN0cmluZyk6IFByb21pc2U8c3RyaW5nPiB7XG5cdFx0YXdhaXQgdGhpcy5sb2NrLmFjcXVpcmUoKTtcblx0XHRsZXQgb3V0OiBzdHJpbmcgPSBhd2FpdCBmcy5yZWFkRmlsZUFzeW5jKGZpbGVfcGF0aCwgJ3V0ZjgnKVxuXHRcdFx0LmNhdGNoKCBlID0+IHtcblx0XHRcdFx0dGhpcy5lcnJvcl9oYW5kbGVyKGUpO1xuXHRcdFx0XHRyZXR1cm4gJyc7XG5cdFx0XHR9KTtcblx0XHR0aGlzLmxvY2sucmVsZWFzZSgpO1xuXHRcdHJldHVybiBvdXQ7XG5cdH1cblx0YXN5bmMgcmVhZF9maWxlX3JhdyhmaWxlX3BhdGg6IHN0cmluZyk6IFByb21pc2U8QnVmZmVyPntcblx0XHRhd2FpdCB0aGlzLmxvY2suYWNxdWlyZSgpO1xuXHRcdGxldCBvdXQ6IEJ1ZmZlciA9IGF3YWl0IGZzLnJlYWRGaWxlQXN5bmMoZmlsZV9wYXRoKVxuXHRcdFx0LmNhdGNoKCBlID0+IHtcblx0XHRcdFx0dGhpcy5lcnJvcl9oYW5kbGVyKGUpO1xuXHRcdFx0XHRyZXR1cm4gQnVmZmVyLmFsbG9jKDApOyBcblx0XHRcdH0pO1xuXHRcdHRoaXMubG9jay5yZWxlYXNlKCk7XG5cdFx0cmV0dXJuIG91dDtcblx0fVxuXHRhc3luYyByZW5hbWVfZmlsZShzcmM6IHN0cmluZywgZGVzdDogc3RyaW5nKTogUHJvbWlzZTx2b2lkPntcblx0XHRhd2FpdCB0aGlzLmxvY2suYWNxdWlyZSgpO1xuXHRcdGF3YWl0IGZzLm1vdmVBc3luYyhzcmMsIGRlc3QsIHtvdmVyd3JpdGU6IHRydWV9KVxuXHRcdFx0LmNhdGNoKCBlID0+IHRoaXMuZXJyb3JfaGFuZGxlcihlKSApO1xuXHRcdHRoaXMubG9jay5yZWxlYXNlKCk7XG5cdH1cblx0YXN5bmMgZGVsZXRlX2ZpbGUoZmlsZV9wYXRoOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+e1xuXHRcdGF3YWl0IHRoaXMubG9jay5hY3F1aXJlKCk7XG5cdFx0YXdhaXQgZnMucmVtb3ZlQXN5bmMoZmlsZV9wYXRoKVxuXHRcdFx0LmNhdGNoKCBlID0+IHRoaXMuZXJyb3JfaGFuZGxlcihlKSApO1xuXHRcdHRoaXMubG9jay5yZWxlYXNlKCk7XG5cdH1cblx0YXN5bmMgcmVhZF9kaXJlY3RvcnkoZGlyX3BhdGg6IHN0cmluZyk6IFByb21pc2U8c3RyaW5nW10+e1xuXHRcdGF3YWl0IHRoaXMubG9jay5hY3F1aXJlKCk7XG5cdFx0bGV0IG91dDogc3RyaW5nW10gPSBhd2FpdCBmcy5yZWFkZGlyQXN5bmMoZGlyX3BhdGgpXG5cdFx0XHQuY2F0Y2goIGUgPT4ge1xuXHRcdFx0XHR0aGlzLmVycm9yX2hhbmRsZXIoZSk7XG5cdFx0XHRcdHJldHVybiBbJyddOyBcblx0XHRcdH0pO1xuXHRcdHRoaXMubG9jay5yZWxlYXNlKCk7XG5cdFx0cmV0dXJuIG91dDtcblx0fVxuXHRhc3luYyBzdGF0X2ZpbGUoZmlsZV9uYW1lOiBzdHJpbmcpOiBQcm9taXNlPGFueT57XG5cdFx0YXdhaXQgdGhpcy5sb2NrLmFjcXVpcmUoKTtcblx0XHRsZXQgb3V0OiBhbnkgPSBhd2FpdCBmcy5sc3RhdEFzeW5jKGZpbGVfbmFtZSlcblx0XHRcdC5jYXRjaCggZSA9PiB0aGlzLmVycm9yX2hhbmRsZXIoZSkgKTtcblx0XHR0aGlzLmxvY2sucmVsZWFzZSgpO1xuXHRcdHJldHVybiBvdXQ7XG5cdH1cblx0YXN5bmMgY29weV9kaXJlY3Rvcnkoc3JjX3BhdGg6IHN0cmluZywgZGVzdF9wYXRoOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+e1xuXHRcdGF3YWl0IHRoaXMubG9jay5hY3F1aXJlKCk7XG5cdFx0YXdhaXQgZnMuY29weUFzeW5jKHNyY19wYXRoLCBkZXN0X3BhdGgpXG5cdFx0XHQuY2F0Y2goIGUgPT4gdGhpcy5lcnJvcl9oYW5kbGVyKGUpICk7XG5cdFx0dGhpcy5sb2NrLnJlbGVhc2UoKTtcblx0fVxuXHQvLyBmb3Igc29tZSByZWFzb24gZnMgZG9lcyBub3QgaGF2ZSBlbnN1cmVTeW1MaW5rQXN5bmMgb3IgZW1wdHlEaXJBc3luY1xuXHQvLyBzbyBwcm9taXNpZnkgdGhlbSBtYW51YWxseVxuXHRhc3luYyBtYWtlX3N5bWxpbmsoc3JjX3BhdGg6IHN0cmluZywgZGVzdF9wYXRoOiBzdHJpbmcpOiBQcm9taXNlPGFueT57XG5cdFx0YXdhaXQgdGhpcy5sb2NrLmFjcXVpcmUoKTtcblx0XHRyZXR1cm4gbmV3IFByb21pc2UoIChyZXNvbHZlLCByZWplY3QpID0+IHtcblx0XHRcdGZzLmVuc3VyZVN5bWxpbmsoc3JjX3BhdGgsIGRlc3RfcGF0aCwgZXJyID0+IHtcblx0XHRcdFx0dGhpcy5sb2NrLnJlbGVhc2UoKTtcblx0XHRcdFx0aWYgKGVycikgcmVqZWN0KGVycik7XG5cdFx0XHRcdHJlc29sdmUoKTtcblx0XHRcdH0pO1xuXHRcdH0pO1xuXHR9XG5cdGFzeW5jIGVtcHR5X2RpcmVjdG9yeShkaXJfcGF0aDogc3RyaW5nKTogUHJvbWlzZTxhbnk+e1xuXHRcdGF3YWl0IHRoaXMubG9jay5hY3F1aXJlKCk7XG5cdFx0cmV0dXJuIG5ldyBQcm9taXNlKCAocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG5cdFx0XHRmcy5lbXB0eURpcihkaXJfcGF0aCwgZXJyID0+IHtcblx0XHRcdFx0dGhpcy5sb2NrLnJlbGVhc2UoKTtcblx0XHRcdFx0aWYgKGVycikgcmVqZWN0KGVycik7XG5cdFx0XHRcdHJlc29sdmUoKTtcblx0XHRcdH0pO1xuXHRcdH0pO1xuXHR9XG5cblx0Ly8gc29waGlzdGljYXRlZCBmaWxlIGFuZCBkaXJlY3RvcnkgbWFuaXB1bGF0aW9uXG5cdFxuXHQvLyBzYXZlX2ZpbGUgZm9sbG93cyB2aW0ncyBzdHJhdGVneSB0byBzYXZlIGEgZmlsZSBpbiBhIGNyYXNoLXByb29mIHdheVxuXHQvLyBpdCBmaXJzdCB3cml0ZXMgdGhlIGZpbGUgdG8gLjxmaWxlX25hbWU+flxuXHQvLyB0aGVuIGl0IGRlbGV0ZXMgdGhlIGV4aXN0aW5nIGZpbGUgYXQgPGZpbGVfbmFtZT5cblx0Ly8gdGhlbiBpdCByZW5hbWVzIC48ZmlsZV9uYW1lPn4gdG8gPGZpbGVfbmFtZT5cblx0Ly8gaWYgYSBwYXRoIGlzIGdpdmVuLCBhIGxvY2tmaWxlIGlzIGFsc28gY3JlYXRlZCBhbmQgZGVzdHJveWVkXG5cdC8vIHNhdmVfZmlsZSBoYXMgaXRzIG93biBtdXRleCwgc28gaXQgY2Fubm90IHJ1biBjb25jdXJyZW50bHkgd2l0aCBpdHNlbGZcblx0YXN5bmMgc2F2ZV9maWxlKGZpbGVfbmFtZTogc3RyaW5nLCBmaWxlX2NvbnRlbnQ6IHN0cmluZywgbG9ja2ZpbGU6IHN0cmluZ3x1bmRlZmluZWQgPSB1bmRlZmluZWQpe1xuXHRcdGF3YWl0IHRoaXMuc2F2ZV9sb2NrLmFjcXVpcmUoKTtcblx0XHR0cnl7XG5cdFx0XHRpZiAobG9ja2ZpbGUpXG5cdFx0XHRcdGF3YWl0IHRoaXMud3JpdGVfZmlsZShsb2NrZmlsZSwgZmlsZV9uYW1lKTtcblx0XHRcdGF3YWl0IHRoaXMud3JpdGVfZmlsZSgnLicrZmlsZV9uYW1lKyd+JywgZmlsZV9jb250ZW50KTtcblx0XHRcdGF3YWl0IHRoaXMuZGVsZXRlX2ZpbGUoZmlsZV9uYW1lKTtcblx0XHRcdGF3YWl0IHRoaXMucmVuYW1lX2ZpbGUoJy4nK2ZpbGVfbmFtZSsnficsIGZpbGVfbmFtZSk7XG5cdFx0XHRpZiAobG9ja2ZpbGUpXG5cdFx0XHRcdGF3YWl0IHRoaXMuZGVsZXRlX2ZpbGUobG9ja2ZpbGUpXG5cdFx0fVxuXHRcdGNhdGNoKGUpe1xuXHRcdFx0dGhpcy5zYXZlX2xvY2sucmVsZWFzZSgpO1xuXHRcdFx0dGhyb3cgZTtcblx0XHR9XG5cdFx0dGhpcy5zYXZlX2xvY2sucmVsZWFzZSgpO1xuXHR9XG5cblx0Ly8gcmVjdXJzaXZlbHkgcmVhZCB0aGUgY29udGVudHMgb2YgYSBkaXJlY3RvcnksIHJldHVybmluZyBhbiBhcnJheSBvZiBGaWxlX0Rlc2NyaXB0b3JzXG5cdGFzeW5jIGRlZXBfcmVhZF9kaXJlY3RvcnkoZGlyX3BhdGg6IHN0cmluZyk6IFByb21pc2U8RmlsZV9EZXNjcmlwdG9yW10+e1xuXHRcdGxldCBjb250ZW50czogYW55ID0gYXdhaXQgdGhpcy5yZWFkX2RpcmVjdG9yeShkaXJfcGF0aCk7XG5cdFx0bGV0IG91dHB1dDogRmlsZV9EZXNjcmlwdG9yW10gPSBbXTtcblx0XHRmb3IgKGxldCBuYW1lIG9mIGNvbnRlbnRzKXtcblx0XHRcdGxldCBzdGF0ID0gYXdhaXQgdGhpcy5zdGF0X2ZpbGUoZGlyX3BhdGgrJy8nK25hbWUpO1xuXHRcdFx0bGV0IGRlc2M6IEZpbGVfRGVzY3JpcHRvciA9IG5ldyBGaWxlX0Rlc2NyaXB0b3IobmFtZSk7XG5cdFx0XHRpZiAoc3RhdC5pc0RpcmVjdG9yeSgpKVxuXHRcdFx0XHRkZXNjLmNoaWxkcmVuID0gYXdhaXQgdGhpcy5kZWVwX3JlYWRfZGlyZWN0b3J5KGRpcl9wYXRoKycvJytuYW1lKTtcblx0XHRcdGVsc2Vcblx0XHRcdFx0ZGVzYy5zaXplID0gc3RhdC5zaXplO1xuXHRcdFx0b3V0cHV0LnB1c2goZGVzYyk7XG5cdFx0fVxuXHRcdHJldHVybiBvdXRwdXQ7XG5cdH1cblx0XG5cdC8vIGNoZWNrcyBpZiBhIGZpbGUgaXMgYmluYXJ5IC0gb25seSByZWFkcyBhIGZldyB0aG91c2FuZCBieXRlcyBhdCBtb3N0XG5cdC8vIHJldHVybnMgYSBib29sZWFuIHdoZW4gYXdhaXRlZFxuXHRhc3luYyBpc19iaW5hcnkoZmlsZV9wYXRoOiBzdHJpbmcpe1xuXHRcdGF3YWl0IHRoaXMubG9jay5hY3F1aXJlKCk7XG5cdFx0cmV0dXJuIG5ldyBQcm9taXNlKCAocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG5cdFx0XHRpc0JpbmFyeShmaWxlX3BhdGgsIChlcnI6IGFueSwgcmVzdWx0OiBhbnkpID0+IHtcblx0XHRcdFx0dGhpcy5sb2NrLnJlbGVhc2UoKTtcblx0XHRcdFx0aWYgKGVycikgcmVqZWN0KGVycik7XG5cdFx0XHRcdHJlc29sdmUocmVzdWx0KTtcblx0XHRcdH0pO1xuXHRcdH0pO1xuXHR9XG5cblx0YXN5bmMgcmVhZF9qc29uKGZpbGVfcGF0aDogc3RyaW5nKTogUHJvbWlzZTxhbnk+IHtcblx0XHRsZXQgb3V0cHV0OiBzdHJpbmcgPSBhd2FpdCB0aGlzLnJlYWRfZmlsZShmaWxlX3BhdGgpO1xuXHRcdHJldHVybiBKU09OLnBhcnNlKG91dHB1dCk7XG5cdH1cblx0YXN5bmMgd3JpdGVfanNvbihmaWxlX3BhdGg6IHN0cmluZywgZGF0YTogYW55KTogUHJvbWlzZTx2b2lkPiB7XG5cdFx0cmV0dXJuIHRoaXMud3JpdGVfZmlsZShmaWxlX3BhdGgsIEpTT04uc3RyaW5naWZ5KGRhdGEpKTtcblx0fVxuXG5cdGFzeW5jIGRpcmVjdG9yeV9leGlzdHMoZGlyX3BhdGg6IHN0cmluZyk6IFByb21pc2U8Ym9vbGVhbj57XG5cdFx0bGV0IHN0YXQ6IGFueSA9IGF3YWl0IHRoaXMuc3RhdF9maWxlKGRpcl9wYXRoKVxuXHRcdFx0LmNhdGNoKCBlID0+IHt9ICk7XG5cdFx0cmV0dXJuIChzdGF0ICYmIHN0YXQuaXNEaXJlY3RvcnkgJiYgc3RhdC5pc0RpcmVjdG9yeSgpKSA/IHRydWUgOiBmYWxzZTtcblx0fVxuXHRhc3luYyBmaWxlX2V4aXN0cyhmaWxlX3BhdGg6IHN0cmluZyk6IFByb21pc2U8Ym9vbGVhbj57XG5cdFx0bGV0IHN0YXQ6IGFueSA9IGF3YWl0IHRoaXMuc3RhdF9maWxlKGZpbGVfcGF0aClcblx0XHRcdC5jYXRjaCggZSA9PiB7fSApO1xuXHRcdHJldHVybiAoc3RhdCAmJiBzdGF0LmlzRmlsZSAmJiBzdGF0LmlzRmlsZSgpKSA/IHRydWUgOiBmYWxzZTtcblx0fVxufVxuXG5leHBvcnQgY2xhc3MgRmlsZV9EZXNjcmlwdG9yIHtcblx0Y29uc3RydWN0b3IobmFtZTogc3RyaW5nLCBzaXplOiBudW1iZXJ8dW5kZWZpbmVkID0gdW5kZWZpbmVkLCBjaGlsZHJlbjogRmlsZV9EZXNjcmlwdG9yW118dW5kZWZpbmVkID0gdW5kZWZpbmVkKXtcblx0XHR0aGlzLm5hbWUgPSBuYW1lO1xuXHRcdHRoaXMuc2l6ZSA9IHNpemU7XG5cdFx0dGhpcy5jaGlsZHJlbiA9IGNoaWxkcmVuO1xuXHR9XG5cdHByaXZhdGUgbmFtZTogc3RyaW5nO1xuXHRzaXplOiBudW1iZXIgfCB1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG5cdGNoaWxkcmVuOiBGaWxlX0Rlc2NyaXB0b3JbXSB8IHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcbn1cblxubGV0IGZtID0gbmV3IEZpbGVNYW5hZ2VyKCk7XG5leHBvcnQge2ZtfTtcbiJdfQ==
