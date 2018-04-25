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
var chai_1 = require("chai");
var mock = require("mock-fs");
var FileManager_1 = require("../src/FileManager");
chai_1.should();
var fm = new FileManager_1.FileManager();
describe('FileManager', function () {
    describe('primitive file and directory manipulation', function () {
        describe('#read_file', function () {
            var content = 'this is a test';
            before(function () {
                var test_file = mock.file({ content: content });
                mock({ test_file: test_file });
            });
            it('should read a file', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var data;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, fm.read_file('test_file')];
                            case 1:
                                data = _a.sent();
                                data.should.equal(content);
                                return [2 /*return*/];
                        }
                    });
                });
            });
        });
        describe('#write_file', function () {
            var content = 'this is still a test';
            before(function () {
                mock({});
            });
            it('should write a file', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var data;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, fm.write_file('test_file', content)];
                            case 1:
                                _a.sent();
                                return [4 /*yield*/, fm.read_file('test_file')];
                            case 2:
                                data = _a.sent();
                                data.should.equal(content);
                                return [2 /*return*/];
                        }
                    });
                });
            });
        });
        describe('#rename_file', function () {
            var content = 'yup, still a test';
            before(function () {
                mock({ 'test_file': mock.file({ content: content }) });
            });
            it('should rename a file', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var data, data2;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, fm.rename_file('test_file', 'other_file')];
                            case 1:
                                _a.sent();
                                return [4 /*yield*/, fm.read_file('other_file')];
                            case 2:
                                data = _a.sent();
                                data.should.equal(content);
                                return [4 /*yield*/, fm.read_file('test_file')
                                        .catch(function (e) {
                                        e.code.should.equal('ENOENT');
                                    })];
                            case 3:
                                data2 = _a.sent();
                                return [2 /*return*/];
                        }
                    });
                });
            });
        });
        describe('#delete_file', function () {
            var content = 'this is a test';
            before(function () {
                mock({ 'test_file': mock.file({ content: content }) });
            });
            it('should delete a file', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var data;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, fm.delete_file('test_file')];
                            case 1:
                                _a.sent();
                                return [4 /*yield*/, fm.read_file('test_file')
                                        .catch(function (e) {
                                        e.code.should.equal('ENOENT');
                                    })];
                            case 2:
                                data = _a.sent();
                                return [2 /*return*/];
                        }
                    });
                });
            });
        });
        describe('#read_directory', function () {
            var file_list = ['test_file1', 'test_file2', 'test_file3'];
            before(function () {
                var mock_dir = {};
                mock_dir[file_list[0]] = 'test';
                mock_dir[file_list[1]] = 'test';
                mock_dir[file_list[2]] = 'test';
                mock({ 'test_dir': mock_dir });
            });
            it('should return an array of the names of the files in a directory', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var output;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, fm.read_directory('test_dir')];
                            case 1:
                                output = _a.sent();
                                output.should.deep.equal(file_list);
                                return [2 /*return*/];
                        }
                    });
                });
            });
        });
        describe('#stat_file', function () {
            before(function () {
                mock({ 'test_file': 'test' });
            });
            it('should return an object with a size field and isDirectory method', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var stat;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, fm.stat_file('test_file')];
                            case 1:
                                stat = _a.sent();
                                stat.size.should.be.a('Number');
                                stat.isDirectory.should.be.a('Function');
                                stat.isDirectory().should.equal(false);
                                return [2 /*return*/];
                        }
                    });
                });
            });
        });
        describe('#is_binary', function () {
            beforeEach(function () {
                mock({ 'test_text': 'test', 'test_bin': new Buffer(100) });
            });
            it('should return true for a binary file', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var result;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, fm.is_binary('test_bin')];
                            case 1:
                                result = _a.sent();
                                result.should.equal(true);
                                return [2 /*return*/];
                        }
                    });
                });
            });
            it('should return false for a non-binary file', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var result;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, fm.is_binary('test_text')];
                            case 1:
                                result = _a.sent();
                                result.should.equal(false);
                                return [2 /*return*/];
                        }
                    });
                });
            });
        });
        afterEach(function () {
            mock.restore();
        });
    });
    describe('Sophisticated file and directory manipulation', function () {
        describe('#save_file', function () {
            var content = 'this is a test';
            var file_name = 'test_file';
            var lockfile = '.lockfile';
            beforeEach(function () {
                mock({});
            });
            it('should save a file following vim\'s strategy to avoid data loss', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var data;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, fm.save_file(file_name, content, lockfile)];
                            case 1:
                                _a.sent();
                                return [4 /*yield*/, fm.read_file(file_name)];
                            case 2:
                                data = _a.sent();
                                data.should.equal(content);
                                return [2 /*return*/];
                        }
                    });
                });
            });
            it('should also work without using a lockfile', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var data;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, fm.save_file(file_name, content)];
                            case 1:
                                _a.sent();
                                return [4 /*yield*/, fm.read_file(file_name)];
                            case 2:
                                data = _a.sent();
                                data.should.equal(content);
                                return [2 /*return*/];
                        }
                    });
                });
            });
            afterEach(function () {
                mock.restore();
            });
        });
        describe('#deep_read_directory', function () {
            var root_content = [
                new FileManager_1.File_Descriptor('dir1', undefined, [
                    new FileManager_1.File_Descriptor('dir2', undefined, [
                        new FileManager_1.File_Descriptor('file3', 6, undefined)
                    ]),
                    new FileManager_1.File_Descriptor('file2', 5, undefined)
                ]),
                new FileManager_1.File_Descriptor('file', 4, undefined)
            ];
            before(function () {
                mock({
                    'root': {
                        'file': 'test',
                        'dir1': {
                            'file2': 'test2',
                            'dir2': { 'file3': 'test33' }
                        }
                    }
                });
            });
            it('should recursively read the contents of a directory, returning an array of file descriptors', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var output;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, fm.deep_read_directory('root')];
                            case 1:
                                output = _a.sent();
                                //	console.dir(output, { depth: null });
                                output.should.deep.equal(root_content);
                                return [2 /*return*/];
                        }
                    });
                });
            });
        });
        afterEach(function () {
            mock.restore();
        });
    });
});
