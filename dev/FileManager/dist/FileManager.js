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
var FileManager = /** @class */ (function () {
    function FileManager() {
        console.log('hi');
    }
    // primitive file and directory manipulation
    FileManager.prototype.write_file = function (file_path, data) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, fs.outputFile(file_path, data)];
            });
        });
    };
    FileManager.prototype.read_file = function (file_path) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, fs.readFileAsync(file_path, 'utf8')];
            });
        });
    };
    FileManager.prototype.rename_file = function (src, dest) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, fs.moveAsync(src, dest, { overwrite: true })];
            });
        });
    };
    FileManager.prototype.delete_file = function (file_path) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, fs.remove(file_path)];
            });
        });
    };
    FileManager.prototype.read_directory = function (dir_path) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, fs.readdirAsync(dir_path)];
            });
        });
    };
    FileManager.prototype.stat_file = function (file_name) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, fs.lstatAsync(file_name)];
            });
        });
    };
    // sophisticated file and directory manipulation
    // save_file follows vim's strategy to save a file in a crash-proof way
    // it first writes the file to .<file_name>~
    // then it deletes the existing file at <file_name>
    // then it renames .<file_name>~ to <file_name>
    // if a path is given, a lockfile is also created and destroyed
    FileManager.prototype.save_file = function (file_name, file_content, lockfile) {
        if (lockfile === void 0) { lockfile = undefined; }
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!lockfile) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.write_file(lockfile, file_name)];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2: return [4 /*yield*/, this.write_file('.' + file_name + '~', file_content)];
                    case 3:
                        _a.sent();
                        return [4 /*yield*/, this.delete_file(file_name)];
                    case 4:
                        _a.sent();
                        return [4 /*yield*/, this.rename_file('.' + file_name + '~', file_name)];
                    case 5:
                        _a.sent();
                        if (!lockfile) return [3 /*break*/, 7];
                        return [4 /*yield*/, this.delete_file(lockfile)];
                    case 6:
                        _a.sent();
                        _a.label = 7;
                    case 7: return [2 /*return*/];
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
            return __generator(this, function (_a) {
                return [2 /*return*/, new Promise(function (resolve, reject) {
                        isBinary(file_path, function (err, result) {
                            if (err)
                                reject(err);
                            resolve(result);
                        });
                    })];
            });
        });
    };
    return FileManager;
}());
exports.FileManager = FileManager;
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
