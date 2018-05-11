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
var project_settings = require("./ProjectSettings");
var paths_1 = require("./paths");
var readChunk = require("read-chunk");
var fileType = require("file-type");
var max_file_size = 50000000; // bytes (50Mb)
// all ProjectManager methods are async functions called when websocket messages
// with the field event: 'project-event' is received. The function called is 
// contained in the 'func' field. The websocket message is passed into the method
// as the data variable, and is modified and returned by the method, and sent
// back over the websocket
// openFile takes a message with currentProject and newFile fields
// it opens the file from the project, if it is not too big or binary
// if the file is an image or audio file, it is symlinked from the media folder
function openFile(data) {
    return __awaiter(this, void 0, void 0, function () {
        var file_path, file_stat, chunk, file_type, is_binary, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    file_path = paths_1.paths.projects + data.currentProject + '/' + data.newFile;
                    return [4 /*yield*/, file_manager.stat_file(file_path)];
                case 1:
                    file_stat = _b.sent();
                    if (file_stat.size > max_file_size) {
                        data.error = 'file is too large: ' + (file_stat.size / 1000000) + 'Mb';
                        data.fileData = "The IDE can't open non-source files larger than " + (max_file_size / 1000000) + "Mb";
                        data.readOnly = true;
                        data.fileName = data.newFile;
                        data.newFile = undefined;
                        data.fileType = 0;
                        return [2 /*return*/];
                    }
                    return [4 /*yield*/, readChunk(file_path, 0, 4100)];
                case 2:
                    chunk = _b.sent();
                    return [4 /*yield*/, fileType(chunk)];
                case 3:
                    file_type = _b.sent();
                    if (!(file_type && (file_type.mime.includes('image') || file_type.mime.includes('audio')))) return [3 /*break*/, 6];
                    return [4 /*yield*/, file_manager.empty_directory(paths_1.paths.media)];
                case 4:
                    _b.sent();
                    return [4 /*yield*/, file_manager.make_symlink(file_path, paths_1.paths.media + data.newFile)];
                case 5:
                    _b.sent();
                    data.fileData = '';
                    data.readOnly = true;
                    data.fileName = data.newFile;
                    data.newFile = undefined;
                    data.fileType = file_type.mime;
                    return [2 /*return*/];
                case 6: return [4 /*yield*/, file_manager.is_binary(file_path)];
                case 7:
                    is_binary = _b.sent();
                    if (is_binary) {
                        data.error = 'can\'t open binary files';
                        data.fileData = 'Binary files can not be edited in the IDE';
                        data.fileName = data.newFile;
                        data.newFile = undefined;
                        data.readOnly = true;
                        data.fileType = 0;
                        return [2 /*return*/];
                    }
                    _a = data;
                    return [4 /*yield*/, file_manager.read_file(file_path)];
                case 8:
                    _a.fileData = _b.sent();
                    if (data.newFile.split && data.newFile.includes('.')) {
                        data.fileType = data.newFile.split('.').pop();
                    }
                    else {
                        data.fileType = 0;
                    }
                    data.fileName = data.newFile;
                    data.newFile = undefined;
                    data.readOnly = false;
                    return [2 /*return*/];
            }
        });
    });
}
exports.openFile = openFile;
// these two methods are exceptions and don't take the data object
function listProjects() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, file_manager.read_directory(paths_1.paths.projects)];
        });
    });
}
exports.listProjects = listProjects;
function listExamples() {
    return __awaiter(this, void 0, void 0, function () {
        var examples, categories, _i, categories_1, category, _a, _b, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    examples = [];
                    return [4 /*yield*/, file_manager.read_directory(paths_1.paths.examples)];
                case 1:
                    categories = _d.sent();
                    _i = 0, categories_1 = categories;
                    _d.label = 2;
                case 2:
                    if (!(_i < categories_1.length)) return [3 /*break*/, 6];
                    category = categories_1[_i];
                    return [4 /*yield*/, file_manager.directory_exists(paths_1.paths.examples + '/' + category)];
                case 3:
                    if (!_d.sent()) return [3 /*break*/, 5];
                    _b = (_a = examples).push;
                    _c = {
                        name: category
                    };
                    return [4 /*yield*/, file_manager.read_directory(paths_1.paths.examples + '/' + category)];
                case 4:
                    _b.apply(_a, [(_c.children = _d.sent(),
                            _c)]);
                    _d.label = 5;
                case 5:
                    _i++;
                    return [3 /*break*/, 2];
                case 6: return [2 /*return*/, examples];
            }
        });
    });
}
exports.listExamples = listExamples;
function openProject(data) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, settings;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _a = data;
                    return [4 /*yield*/, file_manager.deep_read_directory(paths_1.paths.projects + data.currentProject)];
                case 1:
                    _a.fileList = _b.sent();
                    return [4 /*yield*/, project_settings.read(data.currentProject)];
                case 2:
                    settings = _b.sent();
                    data.newFile = settings.fileName;
                    data.CLArgs = settings.CLArgs;
                    // TODO: data.exampleName
                    // TODO: data.gitData
                    return [4 /*yield*/, this.openFile(data)];
                case 3:
                    // TODO: data.exampleName
                    // TODO: data.gitData
                    _b.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.openProject = openProject;
function openExample(data) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, file_manager.empty_directory(paths_1.paths.exampleTempProject)];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, file_manager.copy_directory(paths_1.paths.examples + data.currentProject, paths_1.paths.exampleTempProject)];
                case 2:
                    _a.sent();
                    data.exampleName = data.currentProject.split('/').pop();
                    data.currentProject = 'exampleTempProject';
                    return [4 /*yield*/, this.openProject(data)];
                case 3:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.openExample = openExample;
function newProject(data) {
    return __awaiter(this, void 0, void 0, function () {
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, file_manager.directory_exists(paths_1.paths.projects + data.newProject)];
                case 1:
                    if (_b.sent()) {
                        data.error = 'failed, project ' + data.newProject + ' already exists!';
                        return [2 /*return*/];
                    }
                    return [4 /*yield*/, file_manager.copy_directory(paths_1.paths.templates + data.projectType, paths_1.paths.projects + data.newProject)];
                case 2:
                    _b.sent();
                    _a = data;
                    return [4 /*yield*/, this.listProjects()];
                case 3:
                    _a.projectList = _b.sent();
                    data.currentProject = data.newProject;
                    data.newProject = undefined;
                    return [4 /*yield*/, this.openProject(data)];
                case 4:
                    _b.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.newProject = newProject;
function saveAs(data) {
    return __awaiter(this, void 0, void 0, function () {
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, file_manager.directory_exists(paths_1.paths.projects + data.newProject)];
                case 1:
                    if (_b.sent()) {
                        data.error = 'failed, project ' + data.newProject + ' already exists!';
                        return [2 /*return*/];
                    }
                    return [4 /*yield*/, file_manager.copy_directory(paths_1.paths.projects + data.currentProject, paths_1.paths.projects + data.newProject)];
                case 2:
                    _b.sent();
                    _a = data;
                    return [4 /*yield*/, this.listProjects()];
                case 3:
                    _a.projectList = _b.sent();
                    data.currentProject = data.newProject;
                    data.newProject = undefined;
                    return [4 /*yield*/, this.openProject(data)];
                case 4:
                    _b.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.saveAs = saveAs;
function deleteProject(data) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, _i, _b, project;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, file_manager.delete_file(paths_1.paths.projects + data.currentProject)];
                case 1:
                    _c.sent();
                    _a = data;
                    return [4 /*yield*/, this.listProjects()];
                case 2:
                    _a.projectList = _c.sent();
                    _i = 0, _b = data.projectList;
                    _c.label = 3;
                case 3:
                    if (!(_i < _b.length)) return [3 /*break*/, 6];
                    project = _b[_i];
                    if (!(project && project !== 'undefined' && project !== 'exampleTempProject')) return [3 /*break*/, 5];
                    data.currentProject = project;
                    return [4 /*yield*/, this.openProject(data)];
                case 4:
                    _c.sent();
                    return [2 /*return*/];
                case 5:
                    _i++;
                    return [3 /*break*/, 3];
                case 6:
                    data.currentProject = '';
                    data.readOnly = true;
                    data.fileData = 'please create a new project to continue';
                    return [2 /*return*/];
            }
        });
    });
}
exports.deleteProject = deleteProject;
function cleanProject(data) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, file_manager.empty_directory(paths_1.paths.projects + data.currentProject + '/build')];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, file_manager.delete_file(paths_1.paths.projects + data.currentProject + '/' + data.currentProject)];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.cleanProject = cleanProject;
function newFile(data) {
    return __awaiter(this, void 0, void 0, function () {
        var file_path, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    file_path = paths_1.paths.projects + data.currentProject + '/' + data.newFile;
                    return [4 /*yield*/, file_manager.file_exists(file_path)];
                case 1:
                    if (_b.sent()) {
                        data.error = 'failed, file ' + data.newFile + ' already exists!';
                        return [2 /*return*/];
                    }
                    file_manager.write_file(file_path, '/***** ' + data.newFile + ' *****/\n');
                    _a = data;
                    return [4 /*yield*/, file_manager.deep_read_directory(paths_1.paths.projects + data.currentProject)];
                case 2:
                    _a.fileList = _b.sent();
                    data.focus = { 'line': 2, 'column': 1 };
                    return [4 /*yield*/, this.openFile(data)];
                case 3:
                    _b.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.newFile = newFile;
function uploadFile(data) {
    return __awaiter(this, void 0, void 0, function () {
        var file_path, file_exists, _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    file_path = paths_1.paths.projects + data.currentProject + '/' + data.newFile;
                    return [4 /*yield*/, file_manager.file_exists(file_path)];
                case 1:
                    _a = (_c.sent());
                    if (_a) return [3 /*break*/, 3];
                    return [4 /*yield*/, file_manager.directory_exists(file_path)];
                case 2:
                    _a = (_c.sent());
                    _c.label = 3;
                case 3:
                    file_exists = (_a);
                    if (file_exists && !data.force) {
                        data.error = 'failed, file ' + data.newFile + ' already exists!';
                        data.fileData = undefined;
                        return [2 /*return*/];
                    }
                    return [4 /*yield*/, file_manager.save_file(file_path, data.fileData)];
                case 4:
                    _c.sent();
                    _b = data;
                    return [4 /*yield*/, file_manager.deep_read_directory(paths_1.paths.projects + data.currentProject)];
                case 5:
                    _b.fileList = _c.sent();
                    return [4 /*yield*/, this.openFile(data)];
                case 6:
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.uploadFile = uploadFile;
function cleanFile(project, file) {
    return __awaiter(this, void 0, void 0, function () {
        var split_file, ext, file_root, file_path;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!(file.split && file.includes('.'))) return [3 /*break*/, 4];
                    split_file = file.split('.');
                    ext = split_file.pop();
                    file_root = split_file.join('.');
                    if (!(ext === 'cpp' || ext === 'c' || ext === 'S')) return [3 /*break*/, 4];
                    file_path = paths_1.paths.projects + project + '/build/' + file_root;
                    return [4 /*yield*/, file_manager.delete_file(file_path + '.d')];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, file_manager.delete_file(file_path + '.o')];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, file_manager.delete_file(paths_1.paths.projects + project + '/' + project)];
                case 3:
                    _a.sent();
                    _a.label = 4;
                case 4: return [2 /*return*/];
            }
        });
    });
}
exports.cleanFile = cleanFile;
function renameFile(data) {
    return __awaiter(this, void 0, void 0, function () {
        var file_path, file_exists, _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    file_path = paths_1.paths.projects + data.currentProject + '/' + data.newFile;
                    return [4 /*yield*/, file_manager.file_exists(file_path)];
                case 1:
                    _a = (_c.sent());
                    if (_a) return [3 /*break*/, 3];
                    return [4 /*yield*/, file_manager.directory_exists(file_path)];
                case 2:
                    _a = (_c.sent());
                    _c.label = 3;
                case 3:
                    file_exists = (_a);
                    if (file_exists) {
                        data.error = 'failed, file ' + data.newFile + ' already exists!';
                        return [2 /*return*/];
                    }
                    return [4 /*yield*/, file_manager.rename_file(paths_1.paths.projects + data.currentProject + '/' + data.fileName, file_path)];
                case 4:
                    _c.sent();
                    return [4 /*yield*/, this.cleanFile(data.currentProject, data.fileName)];
                case 5:
                    _c.sent();
                    _b = data;
                    return [4 /*yield*/, file_manager.deep_read_directory(paths_1.paths.projects + data.currentProject)];
                case 6:
                    _b.fileList = _c.sent();
                    return [4 /*yield*/, this.openFile(data)];
                case 7:
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.renameFile = renameFile;
function deleteFile(data) {
    return __awaiter(this, void 0, void 0, function () {
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, file_manager.delete_file(paths_1.paths.projects + data.currentProject + '/' + data.fileName)];
                case 1:
                    _b.sent();
                    return [4 /*yield*/, this.cleanFile(data.currentProject, data.fileName)];
                case 2:
                    _b.sent();
                    _a = data;
                    return [4 /*yield*/, file_manager.deep_read_directory(paths_1.paths.projects + data.currentProject)];
                case 3:
                    _a.fileList = _b.sent();
                    data.fileData = 'File deleted - open another file to continue';
                    data.fileName = '';
                    data.readOnly = true;
                    return [2 /*return*/];
            }
        });
    });
}
exports.deleteFile = deleteFile;

//# sourceMappingURL=data:application/json;charset=utf8;base64,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QyxxQkFBTSxZQUFZLENBQUMsV0FBVyxDQUFDLGFBQUssQ0FBQyxRQUFRLEdBQUMsSUFBSSxDQUFDLGNBQWMsR0FBQyxHQUFHLEdBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFBOztvQkFBcEYsU0FBb0YsQ0FBQztvQkFDckYscUJBQU0sSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsY0FBYyxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBQTs7b0JBQXhELFNBQXdELENBQUM7b0JBQ3pELEtBQUEsSUFBSSxDQUFBO29CQUFZLHFCQUFNLFlBQVksQ0FBQyxtQkFBbUIsQ0FBQyxhQUFLLENBQUMsUUFBUSxHQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsRUFBQTs7b0JBQTFGLEdBQUssUUFBUSxHQUFHLFNBQTBFLENBQUM7b0JBQzNGLElBQUksQ0FBQyxRQUFRLEdBQUcsOENBQThDLENBQUM7b0JBQy9ELElBQUksQ0FBQyxRQUFRLEdBQUcsRUFBRSxDQUFDO29CQUNuQixJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQzs7Ozs7Q0FDckI7QUFQRCxnQ0FPQyIsImZpbGUiOiJQcm9qZWN0TWFuYWdlci5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGZpbGVfbWFuYWdlciBmcm9tIFwiLi9GaWxlTWFuYWdlclwiO1xuaW1wb3J0ICogYXMgcHJvamVjdF9zZXR0aW5ncyBmcm9tICcuL1Byb2plY3RTZXR0aW5ncyc7XG5pbXBvcnQgKiBhcyB1dGlsIGZyb20gJy4vdXRpbHMnO1xuaW1wb3J0IHtwYXRoc30gZnJvbSAnLi9wYXRocyc7XG5pbXBvcnQgKiBhcyByZWFkQ2h1bmsgZnJvbSAncmVhZC1jaHVuayc7XG5pbXBvcnQgKiBhcyBmaWxlVHlwZSBmcm9tICdmaWxlLXR5cGUnO1xuXG5sZXQgbWF4X2ZpbGVfc2l6ZSA9IDUwMDAwMDAwO1x0Ly8gYnl0ZXMgKDUwTWIpXG5cbi8vIGFsbCBQcm9qZWN0TWFuYWdlciBtZXRob2RzIGFyZSBhc3luYyBmdW5jdGlvbnMgY2FsbGVkIHdoZW4gd2Vic29ja2V0IG1lc3NhZ2VzXG4vLyB3aXRoIHRoZSBmaWVsZCBldmVudDogJ3Byb2plY3QtZXZlbnQnIGlzIHJlY2VpdmVkLiBUaGUgZnVuY3Rpb24gY2FsbGVkIGlzIFxuLy8gY29udGFpbmVkIGluIHRoZSAnZnVuYycgZmllbGQuIFRoZSB3ZWJzb2NrZXQgbWVzc2FnZSBpcyBwYXNzZWQgaW50byB0aGUgbWV0aG9kXG4vLyBhcyB0aGUgZGF0YSB2YXJpYWJsZSwgYW5kIGlzIG1vZGlmaWVkIGFuZCByZXR1cm5lZCBieSB0aGUgbWV0aG9kLCBhbmQgc2VudFxuLy8gYmFjayBvdmVyIHRoZSB3ZWJzb2NrZXRcblxuLy8gb3BlbkZpbGUgdGFrZXMgYSBtZXNzYWdlIHdpdGggY3VycmVudFByb2plY3QgYW5kIG5ld0ZpbGUgZmllbGRzXG4vLyBpdCBvcGVucyB0aGUgZmlsZSBmcm9tIHRoZSBwcm9qZWN0LCBpZiBpdCBpcyBub3QgdG9vIGJpZyBvciBiaW5hcnlcbi8vIGlmIHRoZSBmaWxlIGlzIGFuIGltYWdlIG9yIGF1ZGlvIGZpbGUsIGl0IGlzIHN5bWxpbmtlZCBmcm9tIHRoZSBtZWRpYSBmb2xkZXJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBvcGVuRmlsZShkYXRhOiBhbnkpe1xuXHRsZXQgZmlsZV9wYXRoID0gcGF0aHMucHJvamVjdHMrZGF0YS5jdXJyZW50UHJvamVjdCsnLycrZGF0YS5uZXdGaWxlO1xuXHRsZXQgZmlsZV9zdGF0ID0gYXdhaXQgZmlsZV9tYW5hZ2VyLnN0YXRfZmlsZShmaWxlX3BhdGgpO1xuXHRpZiAoZmlsZV9zdGF0LnNpemUgPiBtYXhfZmlsZV9zaXplKXtcblx0XHRkYXRhLmVycm9yID0gJ2ZpbGUgaXMgdG9vIGxhcmdlOiAnKyhmaWxlX3N0YXQuc2l6ZS8xMDAwMDAwKSsnTWInO1xuXHRcdGRhdGEuZmlsZURhdGEgPSBcIlRoZSBJREUgY2FuJ3Qgb3BlbiBub24tc291cmNlIGZpbGVzIGxhcmdlciB0aGFuIFwiKyhtYXhfZmlsZV9zaXplLzEwMDAwMDApK1wiTWJcIjtcblx0XHRkYXRhLnJlYWRPbmx5ID0gdHJ1ZTtcblx0XHRkYXRhLmZpbGVOYW1lID0gZGF0YS5uZXdGaWxlO1xuXHRcdGRhdGEubmV3RmlsZSA9IHVuZGVmaW5lZDtcblx0XHRkYXRhLmZpbGVUeXBlID0gMDtcblx0XHRyZXR1cm47XG5cdH1cblx0bGV0IGNodW5rOiBCdWZmZXIgPSBhd2FpdCByZWFkQ2h1bmsoZmlsZV9wYXRoLCAwLCA0MTAwKTtcblx0bGV0IGZpbGVfdHlwZSA9IGF3YWl0IGZpbGVUeXBlKGNodW5rKTtcblx0aWYgKGZpbGVfdHlwZSAmJiAoZmlsZV90eXBlLm1pbWUuaW5jbHVkZXMoJ2ltYWdlJykgfHwgZmlsZV90eXBlLm1pbWUuaW5jbHVkZXMoJ2F1ZGlvJykpKXtcblx0XHRhd2FpdCBmaWxlX21hbmFnZXIuZW1wdHlfZGlyZWN0b3J5KHBhdGhzLm1lZGlhKTtcblx0XHRhd2FpdCBmaWxlX21hbmFnZXIubWFrZV9zeW1saW5rKGZpbGVfcGF0aCwgcGF0aHMubWVkaWErZGF0YS5uZXdGaWxlKTtcblx0XHRkYXRhLmZpbGVEYXRhID0gJyc7XG5cdFx0ZGF0YS5yZWFkT25seSA9IHRydWU7XG5cdFx0ZGF0YS5maWxlTmFtZSA9IGRhdGEubmV3RmlsZTtcblx0XHRkYXRhLm5ld0ZpbGUgPSB1bmRlZmluZWQ7XG5cdFx0ZGF0YS5maWxlVHlwZSA9IGZpbGVfdHlwZS5taW1lO1xuXHRcdHJldHVybjtcblx0fVxuXHRsZXQgaXNfYmluYXJ5ID0gYXdhaXQgZmlsZV9tYW5hZ2VyLmlzX2JpbmFyeShmaWxlX3BhdGgpO1xuXHRpZiAoaXNfYmluYXJ5KXtcblx0XHRkYXRhLmVycm9yID0gJ2NhblxcJ3Qgb3BlbiBiaW5hcnkgZmlsZXMnO1xuXHRcdGRhdGEuZmlsZURhdGEgPSAnQmluYXJ5IGZpbGVzIGNhbiBub3QgYmUgZWRpdGVkIGluIHRoZSBJREUnO1xuXHRcdGRhdGEuZmlsZU5hbWUgPSBkYXRhLm5ld0ZpbGU7XG5cdFx0ZGF0YS5uZXdGaWxlID0gdW5kZWZpbmVkO1xuXHRcdGRhdGEucmVhZE9ubHkgPSB0cnVlO1xuXHRcdGRhdGEuZmlsZVR5cGUgPSAwO1xuXHRcdHJldHVybjtcblx0fVxuXHRkYXRhLmZpbGVEYXRhID0gYXdhaXQgZmlsZV9tYW5hZ2VyLnJlYWRfZmlsZShmaWxlX3BhdGgpO1xuXHRpZiAoZGF0YS5uZXdGaWxlLnNwbGl0ICYmIGRhdGEubmV3RmlsZS5pbmNsdWRlcygnLicpKXtcblx0XHRkYXRhLmZpbGVUeXBlID0gZGF0YS5uZXdGaWxlLnNwbGl0KCcuJykucG9wKCk7XG5cdH0gZWxzZSB7XG5cdFx0ZGF0YS5maWxlVHlwZSA9IDA7XG5cdH1cblx0ZGF0YS5maWxlTmFtZSA9IGRhdGEubmV3RmlsZTtcblx0ZGF0YS5uZXdGaWxlID0gdW5kZWZpbmVkO1xuXHRkYXRhLnJlYWRPbmx5ID0gZmFsc2U7XG5cdHJldHVybjtcbn1cblxuLy8gdGhlc2UgdHdvIG1ldGhvZHMgYXJlIGV4Y2VwdGlvbnMgYW5kIGRvbid0IHRha2UgdGhlIGRhdGEgb2JqZWN0XG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gbGlzdFByb2plY3RzKCk6IFByb21pc2U8c3RyaW5nW10+e1xuXHRyZXR1cm4gZmlsZV9tYW5hZ2VyLnJlYWRfZGlyZWN0b3J5KHBhdGhzLnByb2plY3RzKTtcbn1cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBsaXN0RXhhbXBsZXMoKTogUHJvbWlzZTxhbnk+e1xuXHRsZXQgZXhhbXBsZXMgPSBbXTtcblx0bGV0IGNhdGVnb3JpZXMgPSBhd2FpdCBmaWxlX21hbmFnZXIucmVhZF9kaXJlY3RvcnkocGF0aHMuZXhhbXBsZXMpO1xuXHRmb3IgKGxldCBjYXRlZ29yeSBvZiBjYXRlZ29yaWVzKXtcblx0XHRpZiAoYXdhaXQgZmlsZV9tYW5hZ2VyLmRpcmVjdG9yeV9leGlzdHMocGF0aHMuZXhhbXBsZXMrJy8nK2NhdGVnb3J5KSl7XG5cdFx0XHRleGFtcGxlcy5wdXNoKHtcblx0XHRcdFx0bmFtZTogY2F0ZWdvcnksXG5cdFx0XHRcdGNoaWxkcmVuOiBhd2FpdCBmaWxlX21hbmFnZXIucmVhZF9kaXJlY3RvcnkocGF0aHMuZXhhbXBsZXMrJy8nK2NhdGVnb3J5KVxuXHRcdFx0fSk7XG5cdFx0fVxuXHR9XG5cdHJldHVybiBleGFtcGxlcztcbn1cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBvcGVuUHJvamVjdChkYXRhOiBhbnkpIHtcblx0ZGF0YS5maWxlTGlzdCA9IGF3YWl0IGZpbGVfbWFuYWdlci5kZWVwX3JlYWRfZGlyZWN0b3J5KHBhdGhzLnByb2plY3RzK2RhdGEuY3VycmVudFByb2plY3QpO1xuXHRsZXQgc2V0dGluZ3M6IGFueSA9IGF3YWl0IHByb2plY3Rfc2V0dGluZ3MucmVhZChkYXRhLmN1cnJlbnRQcm9qZWN0KTtcblx0ZGF0YS5uZXdGaWxlID0gc2V0dGluZ3MuZmlsZU5hbWU7XG5cdGRhdGEuQ0xBcmdzID0gc2V0dGluZ3MuQ0xBcmdzO1xuXHQvLyBUT0RPOiBkYXRhLmV4YW1wbGVOYW1lXG5cdC8vIFRPRE86IGRhdGEuZ2l0RGF0YVxuXHRhd2FpdCB0aGlzLm9wZW5GaWxlKGRhdGEpO1xufVxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIG9wZW5FeGFtcGxlKGRhdGE6IGFueSl7XG5cdGF3YWl0IGZpbGVfbWFuYWdlci5lbXB0eV9kaXJlY3RvcnkocGF0aHMuZXhhbXBsZVRlbXBQcm9qZWN0KTtcblx0YXdhaXQgZmlsZV9tYW5hZ2VyLmNvcHlfZGlyZWN0b3J5KHBhdGhzLmV4YW1wbGVzK2RhdGEuY3VycmVudFByb2plY3QsIHBhdGhzLmV4YW1wbGVUZW1wUHJvamVjdCk7XG5cdGRhdGEuZXhhbXBsZU5hbWUgPSBkYXRhLmN1cnJlbnRQcm9qZWN0LnNwbGl0KCcvJykucG9wKCk7XG5cdGRhdGEuY3VycmVudFByb2plY3QgPSAnZXhhbXBsZVRlbXBQcm9qZWN0Jztcblx0YXdhaXQgdGhpcy5vcGVuUHJvamVjdChkYXRhKTtcbn1cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBuZXdQcm9qZWN0KGRhdGE6IGFueSl7XG5cdGlmIChhd2FpdCBmaWxlX21hbmFnZXIuZGlyZWN0b3J5X2V4aXN0cyhwYXRocy5wcm9qZWN0cytkYXRhLm5ld1Byb2plY3QpKXtcblx0XHRkYXRhLmVycm9yID0gJ2ZhaWxlZCwgcHJvamVjdCAnK2RhdGEubmV3UHJvamVjdCsnIGFscmVhZHkgZXhpc3RzISc7XG5cdFx0cmV0dXJuO1xuXHR9XG5cdGF3YWl0IGZpbGVfbWFuYWdlci5jb3B5X2RpcmVjdG9yeShwYXRocy50ZW1wbGF0ZXMrZGF0YS5wcm9qZWN0VHlwZSwgcGF0aHMucHJvamVjdHMrZGF0YS5uZXdQcm9qZWN0KTtcblx0ZGF0YS5wcm9qZWN0TGlzdCA9IGF3YWl0IHRoaXMubGlzdFByb2plY3RzKCk7XG5cdGRhdGEuY3VycmVudFByb2plY3QgPSBkYXRhLm5ld1Byb2plY3Q7XG5cdGRhdGEubmV3UHJvamVjdCA9IHVuZGVmaW5lZDtcblx0YXdhaXQgdGhpcy5vcGVuUHJvamVjdChkYXRhKTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHNhdmVBcyhkYXRhOiBhbnkpe1xuXHRpZiAoYXdhaXQgZmlsZV9tYW5hZ2VyLmRpcmVjdG9yeV9leGlzdHMocGF0aHMucHJvamVjdHMrZGF0YS5uZXdQcm9qZWN0KSl7XG5cdFx0ZGF0YS5lcnJvciA9ICdmYWlsZWQsIHByb2plY3QgJytkYXRhLm5ld1Byb2plY3QrJyBhbHJlYWR5IGV4aXN0cyEnO1xuXHRcdHJldHVybjtcblx0fVxuXHRhd2FpdCBmaWxlX21hbmFnZXIuY29weV9kaXJlY3RvcnkocGF0aHMucHJvamVjdHMrZGF0YS5jdXJyZW50UHJvamVjdCwgcGF0aHMucHJvamVjdHMrZGF0YS5uZXdQcm9qZWN0KTtcblx0ZGF0YS5wcm9qZWN0TGlzdCA9IGF3YWl0IHRoaXMubGlzdFByb2plY3RzKCk7XG5cdGRhdGEuY3VycmVudFByb2plY3QgPSBkYXRhLm5ld1Byb2plY3Q7XG5cdGRhdGEubmV3UHJvamVjdCA9IHVuZGVmaW5lZDtcblx0YXdhaXQgdGhpcy5vcGVuUHJvamVjdChkYXRhKTtcbn1cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBkZWxldGVQcm9qZWN0KGRhdGE6IGFueSl7XG5cdGF3YWl0IGZpbGVfbWFuYWdlci5kZWxldGVfZmlsZShwYXRocy5wcm9qZWN0cytkYXRhLmN1cnJlbnRQcm9qZWN0KTtcblx0ZGF0YS5wcm9qZWN0TGlzdCA9IGF3YWl0IHRoaXMubGlzdFByb2plY3RzKCk7XG5cdGZvciAobGV0IHByb2plY3Qgb2YgZGF0YS5wcm9qZWN0TGlzdCl7XG5cdFx0aWYgKHByb2plY3QgJiYgcHJvamVjdCAhPT0gJ3VuZGVmaW5lZCcgJiYgcHJvamVjdCAhPT0gJ2V4YW1wbGVUZW1wUHJvamVjdCcpe1xuXHRcdFx0ZGF0YS5jdXJyZW50UHJvamVjdCA9IHByb2plY3Q7XG5cdFx0XHRhd2FpdCB0aGlzLm9wZW5Qcm9qZWN0KGRhdGEpO1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0fVxuXHRkYXRhLmN1cnJlbnRQcm9qZWN0ID0gJyc7XG5cdGRhdGEucmVhZE9ubHkgPSB0cnVlO1xuXHRkYXRhLmZpbGVEYXRhID0gJ3BsZWFzZSBjcmVhdGUgYSBuZXcgcHJvamVjdCB0byBjb250aW51ZSc7XG59XG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gY2xlYW5Qcm9qZWN0KGRhdGE6IGFueSl7XG5cdGF3YWl0IGZpbGVfbWFuYWdlci5lbXB0eV9kaXJlY3RvcnkocGF0aHMucHJvamVjdHMrZGF0YS5jdXJyZW50UHJvamVjdCsnL2J1aWxkJyk7XG5cdGF3YWl0IGZpbGVfbWFuYWdlci5kZWxldGVfZmlsZShwYXRocy5wcm9qZWN0cytkYXRhLmN1cnJlbnRQcm9qZWN0KycvJytkYXRhLmN1cnJlbnRQcm9qZWN0KTtcbn1cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBuZXdGaWxlKGRhdGE6IGFueSl7XG5cdGxldCBmaWxlX3BhdGggPSBwYXRocy5wcm9qZWN0cytkYXRhLmN1cnJlbnRQcm9qZWN0KycvJytkYXRhLm5ld0ZpbGU7XG5cdGlmIChhd2FpdCBmaWxlX21hbmFnZXIuZmlsZV9leGlzdHMoZmlsZV9wYXRoKSl7XG5cdFx0ZGF0YS5lcnJvciA9ICdmYWlsZWQsIGZpbGUgJytkYXRhLm5ld0ZpbGUrJyBhbHJlYWR5IGV4aXN0cyEnO1xuXHRcdHJldHVybjtcblx0fVxuXHRmaWxlX21hbmFnZXIud3JpdGVfZmlsZShmaWxlX3BhdGgsICcvKioqKiogJytkYXRhLm5ld0ZpbGUrJyAqKioqKi9cXG4nKTtcblx0ZGF0YS5maWxlTGlzdCA9IGF3YWl0IGZpbGVfbWFuYWdlci5kZWVwX3JlYWRfZGlyZWN0b3J5KHBhdGhzLnByb2plY3RzK2RhdGEuY3VycmVudFByb2plY3QpO1xuXHRkYXRhLmZvY3VzID0geydsaW5lJzogMiwgJ2NvbHVtbic6IDF9O1xuXHRhd2FpdCB0aGlzLm9wZW5GaWxlKGRhdGEpO1xufVxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHVwbG9hZEZpbGUoZGF0YTogYW55KXtcblx0bGV0IGZpbGVfcGF0aCA9IHBhdGhzLnByb2plY3RzK2RhdGEuY3VycmVudFByb2plY3QrJy8nK2RhdGEubmV3RmlsZTtcblx0bGV0IGZpbGVfZXhpc3RzID0gKGF3YWl0IGZpbGVfbWFuYWdlci5maWxlX2V4aXN0cyhmaWxlX3BhdGgpIHx8IGF3YWl0IGZpbGVfbWFuYWdlci5kaXJlY3RvcnlfZXhpc3RzKGZpbGVfcGF0aCkpO1xuXHRpZiAoZmlsZV9leGlzdHMgJiYgIWRhdGEuZm9yY2Upe1xuXHRcdGRhdGEuZXJyb3IgPSAnZmFpbGVkLCBmaWxlICcrZGF0YS5uZXdGaWxlKycgYWxyZWFkeSBleGlzdHMhJztcblx0XHRkYXRhLmZpbGVEYXRhID0gdW5kZWZpbmVkO1xuXHRcdHJldHVybjtcblx0fVxuXHRhd2FpdCBmaWxlX21hbmFnZXIuc2F2ZV9maWxlKGZpbGVfcGF0aCwgZGF0YS5maWxlRGF0YSk7XG5cdGRhdGEuZmlsZUxpc3QgPSBhd2FpdCBmaWxlX21hbmFnZXIuZGVlcF9yZWFkX2RpcmVjdG9yeShwYXRocy5wcm9qZWN0cytkYXRhLmN1cnJlbnRQcm9qZWN0KTtcblx0YXdhaXQgdGhpcy5vcGVuRmlsZShkYXRhKTtcbn1cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjbGVhbkZpbGUocHJvamVjdDogc3RyaW5nLCBmaWxlOiBzdHJpbmcpe1xuXHRpZiAoZmlsZS5zcGxpdCAmJiBmaWxlLmluY2x1ZGVzKCcuJykpe1xuXHRcdGxldCBzcGxpdF9maWxlID0gZmlsZS5zcGxpdCgnLicpO1xuXHRcdGxldCBleHQgPSBzcGxpdF9maWxlLnBvcCgpO1xuXHRcdGxldCBmaWxlX3Jvb3QgPSBzcGxpdF9maWxlLmpvaW4oJy4nKTtcblx0XHRpZiAoZXh0ID09PSAnY3BwJyB8fCBleHQgPT09ICdjJyB8fCBleHQgPT09ICdTJyl7XG5cdFx0XHRsZXQgZmlsZV9wYXRoID0gcGF0aHMucHJvamVjdHMrcHJvamVjdCsnL2J1aWxkLycrZmlsZV9yb290O1xuXHRcdFx0YXdhaXQgZmlsZV9tYW5hZ2VyLmRlbGV0ZV9maWxlKGZpbGVfcGF0aCsnLmQnKTtcblx0XHRcdGF3YWl0IGZpbGVfbWFuYWdlci5kZWxldGVfZmlsZShmaWxlX3BhdGgrJy5vJyk7XG5cdFx0XHRhd2FpdCBmaWxlX21hbmFnZXIuZGVsZXRlX2ZpbGUocGF0aHMucHJvamVjdHMrcHJvamVjdCsnLycrcHJvamVjdCk7XG5cdFx0fVxuXHR9XG59XHRcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZW5hbWVGaWxlKGRhdGE6IGFueSl7XG5cdGxldCBmaWxlX3BhdGggPSBwYXRocy5wcm9qZWN0cytkYXRhLmN1cnJlbnRQcm9qZWN0KycvJytkYXRhLm5ld0ZpbGU7XG5cdGxldCBmaWxlX2V4aXN0cyA9IChhd2FpdCBmaWxlX21hbmFnZXIuZmlsZV9leGlzdHMoZmlsZV9wYXRoKSB8fCBhd2FpdCBmaWxlX21hbmFnZXIuZGlyZWN0b3J5X2V4aXN0cyhmaWxlX3BhdGgpKTtcblx0aWYgKGZpbGVfZXhpc3RzKXtcblx0XHRkYXRhLmVycm9yID0gJ2ZhaWxlZCwgZmlsZSAnK2RhdGEubmV3RmlsZSsnIGFscmVhZHkgZXhpc3RzISc7XG5cdFx0cmV0dXJuO1xuXHR9XG5cdGF3YWl0IGZpbGVfbWFuYWdlci5yZW5hbWVfZmlsZShwYXRocy5wcm9qZWN0cytkYXRhLmN1cnJlbnRQcm9qZWN0KycvJytkYXRhLmZpbGVOYW1lLCBmaWxlX3BhdGgpO1xuXHRhd2FpdCB0aGlzLmNsZWFuRmlsZShkYXRhLmN1cnJlbnRQcm9qZWN0LCBkYXRhLmZpbGVOYW1lKTtcblx0ZGF0YS5maWxlTGlzdCA9IGF3YWl0IGZpbGVfbWFuYWdlci5kZWVwX3JlYWRfZGlyZWN0b3J5KHBhdGhzLnByb2plY3RzK2RhdGEuY3VycmVudFByb2plY3QpO1xuXHRhd2FpdCB0aGlzLm9wZW5GaWxlKGRhdGEpO1xufVxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGRlbGV0ZUZpbGUoZGF0YTogYW55KXtcblx0YXdhaXQgZmlsZV9tYW5hZ2VyLmRlbGV0ZV9maWxlKHBhdGhzLnByb2plY3RzK2RhdGEuY3VycmVudFByb2plY3QrJy8nK2RhdGEuZmlsZU5hbWUpO1xuXHRhd2FpdCB0aGlzLmNsZWFuRmlsZShkYXRhLmN1cnJlbnRQcm9qZWN0LCBkYXRhLmZpbGVOYW1lKTtcblx0ZGF0YS5maWxlTGlzdCA9IGF3YWl0IGZpbGVfbWFuYWdlci5kZWVwX3JlYWRfZGlyZWN0b3J5KHBhdGhzLnByb2plY3RzK2RhdGEuY3VycmVudFByb2plY3QpO1xuXHRkYXRhLmZpbGVEYXRhID0gJ0ZpbGUgZGVsZXRlZCAtIG9wZW4gYW5vdGhlciBmaWxlIHRvIGNvbnRpbnVlJztcblx0ZGF0YS5maWxlTmFtZSA9ICcnO1xuXHRkYXRhLnJlYWRPbmx5ID0gdHJ1ZTtcbn1cbiJdfQ==
