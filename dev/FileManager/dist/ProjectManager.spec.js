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
var ProjectManager_1 = require("../src/ProjectManager");
chai_1.should();
var fm = new FileManager_1.FileManager();
var pm = new ProjectManager_1.ProjectManager();
describe('ProjectManager', function () {
    describe('simple project management functions', function () {
        describe('#openFile', function () {
            var currentProject = 'test';
            var ext = 'cpp';
            var newFile = 'render.' + ext;
            var fileData = 'test_render_content';
            var image;
            var wav;
            beforeEach(function () {
                return __awaiter(this, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, fm.read_file_raw('/root/FileManager/src/test_image.png')];
                            case 1:
                                image = _a.sent();
                                return [4 /*yield*/, fm.read_file_raw('/root/FileManager/src/test_wav.wav')];
                            case 2:
                                wav = _a.sent();
                                mock({
                                    '/root/Bela/projects/test': {
                                        'render.cpp': fileData,
                                        'bin_large': new Buffer(50000001),
                                        'bin_small': new Buffer(100),
                                        'test_image.png': image,
                                        'test_wav.wav': wav
                                    }
                                });
                                return [4 /*yield*/, fm.make_symlink('/root/Bela/projects/test/test_image.png', '/root/Bela/IDE/public/media/old_symlink')];
                            case 3:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                });
            });
            it('should open a file from a project', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var output;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, pm.openFile({ currentProject: currentProject, newFile: newFile })];
                            case 1:
                                output = _a.sent();
                                output.fileName.should.equal(newFile);
                                output.fileData.should.equal(fileData);
                                (typeof output.newFile).should.equal('undefined');
                                output.fileType.should.equal(ext);
                                output.readOnly.should.equal(false);
                                return [2 /*return*/];
                        }
                    });
                });
            });
            it('should reject files larger than 50 Mb', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var output;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, pm.openFile({ currentProject: currentProject, newFile: 'bin_large' })];
                            case 1:
                                output = _a.sent();
                                output.error.should.be.a('string');
                                output.fileData.should.be.a('string');
                                output.fileName.should.equal('bin_large');
                                output.readOnly.should.equal(true);
                                output.fileType.should.equal(0);
                                return [2 /*return*/];
                        }
                    });
                });
            });
            it('should reject binary files', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var output;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, pm.openFile({ currentProject: currentProject, newFile: 'bin_small' })];
                            case 1:
                                output = _a.sent();
                                output.error.should.be.a('string');
                                output.fileData.should.be.a('string');
                                output.fileName.should.equal('bin_small');
                                output.readOnly.should.equal(true);
                                output.fileType.should.equal(0);
                                return [2 /*return*/];
                        }
                    });
                });
            });
            it('should empty the media directory and symlink the file if it is an audio or image file', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var output, file_list;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, pm.openFile({ currentProject: currentProject, newFile: 'test_image.png' })];
                            case 1:
                                output = _a.sent();
                                return [4 /*yield*/, fm.read_directory('/root/Bela/IDE/public/media')];
                            case 2:
                                file_list = _a.sent();
                                file_list.should.deep.equal(['test_image.png']);
                                output.fileData.should.equal('');
                                output.readOnly.should.equal(true);
                                output.fileName.should.equal('test_image.png');
                                output.fileType.should.equal('image/png');
                                return [4 /*yield*/, pm.openFile({ currentProject: currentProject, newFile: 'test_wav.wav' })];
                            case 3:
                                output = _a.sent();
                                return [4 /*yield*/, fm.read_directory('/root/Bela/IDE/public/media')];
                            case 4:
                                file_list = _a.sent();
                                file_list.should.deep.equal(['test_wav.wav']);
                                output.fileData.should.equal('');
                                output.readOnly.should.equal(true);
                                output.fileName.should.equal('test_wav.wav');
                                output.fileType.should.equal('audio/x-wav');
                                return [2 /*return*/];
                        }
                    });
                });
            });
        });
        describe('#listProjects', function () {
            before(function () {
                mock({
                    '/root/Bela/projects': {
                        'test_project1': { 'test_file1': 'content' },
                        'test_project2': { 'test_file2': 'content' }
                    }
                });
            });
            it('should return an array of strings containing the names of the projects in the projects folder', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var data;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                data = {};
                                return [4 /*yield*/, pm.listProjects(data)];
                            case 1:
                                data = _a.sent();
                                data.projectList.should.deep.equal(['test_project1', 'test_project2']);
                                return [2 /*return*/];
                        }
                    });
                });
            });
        });
        describe('#listExamples', function () {
            var output = [new FileManager_1.File_Descriptor('test_category1', undefined, [new FileManager_1.File_Descriptor('test_example1', undefined, [new FileManager_1.File_Descriptor('test_file1', 7, undefined)])]), new FileManager_1.File_Descriptor('test_category2', undefined, [new FileManager_1.File_Descriptor('test_example2', undefined, [new FileManager_1.File_Descriptor('test_file2', 7, undefined)])])];
            before(function () {
                mock({
                    '/root/Bela/examples': {
                        'test_category1': {
                            'test_example1': {
                                'test_file1': 'content'
                            }
                        },
                        'test_category2': {
                            'test_example2': {
                                'test_file2': 'content'
                            }
                        }
                    }
                });
            });
            it('should return an array of File_Descriptors describing the contents of the examples folder', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var data;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                data = {};
                                return [4 /*yield*/, pm.listExamples(data)];
                            case 1:
                                data = _a.sent();
                                data.exampleList.should.deep.equal(output);
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
