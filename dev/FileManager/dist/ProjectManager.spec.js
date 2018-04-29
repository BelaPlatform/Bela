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
                            case 0: return [4 /*yield*/, FileManager_1.fm.read_file_raw('/root/FileManager/src/test_image.png')];
                            case 1:
                                image = _a.sent();
                                return [4 /*yield*/, FileManager_1.fm.read_file_raw('/root/FileManager/src/test_wav.wav')];
                            case 2:
                                wav = _a.sent();
                                mock({
                                    '/root/Bela/projects/test': {
                                        'render.cpp': fileData,
                                        'bin_large': new Buffer(50000001),
                                        'bin_small': new Buffer(10000),
                                        'test_image.png': image,
                                        'test_wav.wav': wav
                                    }
                                });
                                return [4 /*yield*/, FileManager_1.fm.make_symlink('/root/Bela/projects/test/test_image.png', '/root/Bela/IDE/public/media/old_symlink')];
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
                            case 0:
                                output = { currentProject: currentProject, newFile: newFile };
                                return [4 /*yield*/, pm.openFile(output)];
                            case 1:
                                _a.sent();
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
                            case 0:
                                output = { currentProject: currentProject, newFile: 'bin_large' };
                                return [4 /*yield*/, pm.openFile(output)];
                            case 1:
                                _a.sent();
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
                            case 0:
                                output = { currentProject: currentProject, newFile: 'bin_small' };
                                return [4 /*yield*/, pm.openFile(output)];
                            case 1:
                                _a.sent();
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
                    var output, file_list, output2;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                output = { currentProject: currentProject, newFile: 'test_image.png' };
                                return [4 /*yield*/, pm.openFile(output)];
                            case 1:
                                _a.sent();
                                return [4 /*yield*/, FileManager_1.fm.read_directory('/root/Bela/IDE/public/media')];
                            case 2:
                                file_list = _a.sent();
                                file_list.should.deep.equal(['test_image.png']);
                                output.fileData.should.equal('');
                                output.readOnly.should.equal(true);
                                output.fileName.should.equal('test_image.png');
                                output.fileType.should.equal('image/png');
                                output2 = { currentProject: currentProject, newFile: 'test_wav.wav' };
                                return [4 /*yield*/, pm.openFile(output2)];
                            case 3:
                                _a.sent();
                                return [4 /*yield*/, FileManager_1.fm.read_directory('/root/Bela/IDE/public/media')];
                            case 4:
                                file_list = _a.sent();
                                file_list.should.deep.equal(['test_wav.wav']);
                                output2.fileData.should.equal('');
                                output2.readOnly.should.equal(true);
                                output2.fileName.should.equal('test_wav.wav');
                                output2.fileType.should.equal('audio/x-wav');
                                return [2 /*return*/];
                        }
                    });
                });
            });
            afterEach(function () {
                mock.restore();
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
                            case 0: return [4 /*yield*/, pm.listProjects()];
                            case 1:
                                data = _a.sent();
                                data.should.deep.equal(['test_project1', 'test_project2']);
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
                            case 0: return [4 /*yield*/, pm.listExamples()];
                            case 1:
                                data = _a.sent();
                                data.should.deep.equal(output);
                                return [2 /*return*/];
                        }
                    });
                });
            });
        });
        describe('#openProject', function () {
            var test_content = 'ohai';
            var CLArgs = { 'key': 'field' };
            before(function () {
                mock({
                    '/root/Bela/projects/test_project': {
                        'settings.json': JSON.stringify({ 'fileName': 'fender.cpp', CLArgs: CLArgs }),
                        'fender.cpp': test_content
                    }
                });
            });
            it('should open a project', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var out;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                out = { currentProject: 'test_project' };
                                return [4 /*yield*/, pm.openProject(out)];
                            case 1:
                                _a.sent();
                                out.fileName.should.equal('fender.cpp');
                                out.CLArgs.should.deep.equal(CLArgs);
                                out.fileData.should.equal(test_content);
                                out.fileList.should.deep.equal([new FileManager_1.File_Descriptor('fender.cpp', 4, undefined), new FileManager_1.File_Descriptor('settings.json', 50, undefined)]);
                                return [2 /*return*/];
                        }
                    });
                });
            });
        });
        describe('#openExample', function () {
            before(function () {
                mock({
                    '/root/Bela/examples/01-basics/test_example': {
                        'render.cpp': 'test_content'
                    }
                });
            });
            it('should copy the chosen example to projects/exampleTempProject and open it', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var data, data2;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                data = { currentProject: '01-basics/test_example' };
                                return [4 /*yield*/, pm.openExample(data)];
                            case 1:
                                _a.sent();
                                data.currentProject.should.equal('exampleTempProject');
                                data.exampleName.should.equal('test_example');
                                data.fileList.should.deep.equal([new FileManager_1.File_Descriptor('render.cpp', 12, undefined)]);
                                data.fileName.should.equal('render.cpp');
                                data.CLArgs.should.be.a('object');
                                data2 = { currentProject: 'exampleTempProject' };
                                return [4 /*yield*/, pm.openProject(data2)];
                            case 2:
                                _a.sent();
                                data.fileData.should.equal(data2.fileData);
                                return [2 /*return*/];
                        }
                    });
                });
            });
        });
        describe('#newProject', function () {
            before(function () {
                mock({
                    '/root/Bela/IDE/templates/C': { 'render.cpp': 'test_content' }
                });
            });
            it('should create a new C project', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var data, data2;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                data = { newProject: 'test_project', projectType: 'C' };
                                return [4 /*yield*/, pm.newProject(data)];
                            case 1:
                                _a.sent();
                                (typeof data.newProject).should.equal('undefined');
                                data.currentProject.should.equal('test_project');
                                data.projectList.should.deep.equal(['test_project']);
                                data.fileList.should.deep.equal([new FileManager_1.File_Descriptor('render.cpp', 12, undefined)]);
                                data.fileName.should.equal('render.cpp');
                                data.CLArgs.should.be.a('object');
                                data.fileData.should.equal('test_content');
                                data.readOnly.should.equal(false);
                                data2 = { currentProject: 'test_project' };
                                return [4 /*yield*/, pm.openProject(data2)];
                            case 2:
                                _a.sent();
                                data.fileData.should.equal(data2.fileData);
                                return [2 /*return*/];
                        }
                    });
                });
            });
            it('should fail gracefully if the project already exists', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var data;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                data = { newProject: 'test_project', projectType: 'C' };
                                return [4 /*yield*/, pm.newProject(data)];
                            case 1:
                                _a.sent();
                                data.error.should.equal('failed, project test_project already exists!');
                                return [2 /*return*/];
                        }
                    });
                });
            });
            after(function () {
                mock.restore();
            });
        });
        describe('#saveAs', function () {
            beforeEach(function () {
                mock({
                    '/root/Bela/projects/test_src': { 'render.cpp': 'test_content' },
                    '/root/Bela/projects/wrong_dir': { 'render.cpp': 'wrong_content' }
                });
            });
            it('should duplicate a project and open the copy', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var data, data2;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                data = { currentProject: 'test_src', newProject: 'test_dest' };
                                return [4 /*yield*/, pm.saveAs(data)];
                            case 1:
                                _a.sent();
                                (typeof data.newProject).should.equal('undefined');
                                data.currentProject.should.equal('test_dest');
                                data.projectList.should.deep.equal(['test_dest', 'test_src', 'wrong_dir']);
                                data.fileList.should.deep.equal([new FileManager_1.File_Descriptor('render.cpp', 12, undefined)]);
                                data.fileName.should.equal('render.cpp');
                                data.fileData.should.equal('test_content');
                                data2 = { currentProject: 'test_dest' };
                                return [4 /*yield*/, pm.openProject(data2)];
                            case 2:
                                _a.sent();
                                data.fileData.should.equal(data2.fileData);
                                return [2 /*return*/];
                        }
                    });
                });
            });
            it('should fail gracefully when the destination project exists', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var data, data2;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                data = { currentProject: 'test_src', newProject: 'wrong_dir' };
                                return [4 /*yield*/, pm.saveAs(data)];
                            case 1:
                                _a.sent();
                                data.error.should.equal('failed, project wrong_dir already exists!');
                                data2 = { currentProject: 'wrong_dir' };
                                return [4 /*yield*/, pm.openProject(data2)];
                            case 2:
                                _a.sent();
                                data2.fileName.should.equal('render.cpp');
                                data2.fileData.should.equal('wrong_content');
                                return [2 /*return*/];
                        }
                    });
                });
            });
        });
        describe('#deleteProject', function () {
            beforeEach(function () {
                mock({
                    '/root/Bela/projects/test_project1': { 'render.cpp': 'test_content1' },
                    '/root/Bela/projects/test_project2': { 'render.cpp': 'test_content2' }
                });
            });
            it('should delete a project and open any remaining project', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var data;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                data = { currentProject: 'test_project1' };
                                return [4 /*yield*/, pm.deleteProject(data)];
                            case 1:
                                _a.sent();
                                data.currentProject.should.equal('test_project2');
                                data.projectList.should.deep.equal(['test_project2']);
                                data.fileName.should.equal('render.cpp');
                                data.fileData.should.equal('test_content2');
                                return [2 /*return*/];
                        }
                    });
                });
            });
            it('should fail gracefully if there are no remaining projects to open', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var data;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                data = { currentProject: 'test_project1' };
                                return [4 /*yield*/, pm.deleteProject(data)];
                            case 1:
                                _a.sent();
                                data = { currentProject: 'test_project2' };
                                return [4 /*yield*/, pm.deleteProject(data)];
                            case 2:
                                _a.sent();
                                data.currentProject.should.equal('');
                                data.readOnly.should.equal(true);
                                data.fileData.should.equal('please create a new project to continue');
                                return [2 /*return*/];
                        }
                    });
                });
            });
        });
        describe('#cleanProject', function () {
            before(function () {
                mock({
                    '/root/Bela/projects/test_project': {
                        'build': { 'test.o': 'test', 'test.d': 'test' },
                        'test_project': Buffer.alloc(4100),
                        'render.cpp': 'test_content'
                    }
                });
            });
            it('should clear the contents of the project\'s build directory, and delete the binary', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var data;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                data = { currentProject: 'test_project' };
                                return [4 /*yield*/, pm.cleanProject(data)];
                            case 1:
                                _a.sent();
                                data = { currentProject: 'test_project' };
                                return [4 /*yield*/, pm.openProject(data)];
                            case 2:
                                _a.sent();
                                data.fileList.should.deep.equal([
                                    new FileManager_1.File_Descriptor('build', undefined, []),
                                    new FileManager_1.File_Descriptor('render.cpp', 12, undefined)
                                ]);
                                return [2 /*return*/];
                        }
                    });
                });
            });
        });
        describe('#newFile', function () {
            beforeEach(function () {
                mock({
                    '/root/Bela/projects/test_project': { 'old_file': 'old_content' }
                });
            });
            it('should create a new file in the current project, and open it', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var data, data2;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                data = { currentProject: 'test_project', 'newFile': 'test_file' };
                                return [4 /*yield*/, pm.newFile(data)];
                            case 1:
                                _a.sent();
                                data.fileName.should.equal('test_file');
                                (typeof data.newFile).should.equal('undefined');
                                data.fileData.should.equal('/***** test_file *****/\n');
                                data.fileList.should.deep.equal([new FileManager_1.File_Descriptor('old_file', 11, undefined), new FileManager_1.File_Descriptor('test_file', 24, undefined)]);
                                data.focus.should.deep.equal({ line: 2, column: 1 });
                                data.readOnly.should.equal(false);
                                data2 = { currentProject: 'test_project', 'newFile': 'test_file' };
                                return [4 /*yield*/, pm.openFile(data2)];
                            case 2:
                                _a.sent();
                                data.fileData.should.equal(data2.fileData);
                                return [2 /*return*/];
                        }
                    });
                });
            });
            it('should fail gracefully if the file already exists', function () {
                return __awaiter(this, void 0, void 0, function () {
                    var data;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                data = { currentProject: 'test_project', 'newFile': 'old_file' };
                                return [4 /*yield*/, pm.newFile(data)];
                            case 1:
                                _a.sent();
                                data.error.should.equal('failed, file old_file already exists!');
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
