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
var git_manager = require("./GitManager");
var project_settings = require("./ProjectSettings");
var paths = require("./paths");
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
                    file_path = paths.projects + data.currentProject + '/' + data.newFile;
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
                    return [4 /*yield*/, file_manager.empty_directory(paths.media)];
                case 4:
                    _b.sent();
                    return [4 /*yield*/, file_manager.make_symlink(file_path, paths.media + data.newFile)];
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
            return [2 /*return*/, file_manager.read_directory(paths.projects)];
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
                    return [4 /*yield*/, file_manager.read_directory(paths.examples)];
                case 1:
                    categories = _d.sent();
                    _i = 0, categories_1 = categories;
                    _d.label = 2;
                case 2:
                    if (!(_i < categories_1.length)) return [3 /*break*/, 6];
                    category = categories_1[_i];
                    return [4 /*yield*/, file_manager.directory_exists(paths.examples + '/' + category)];
                case 3:
                    if (!_d.sent()) return [3 /*break*/, 5];
                    _b = (_a = examples).push;
                    _c = {
                        name: category
                    };
                    return [4 /*yield*/, file_manager.read_directory(paths.examples + '/' + category)];
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
                    return [4 /*yield*/, listFiles(data.currentProject)];
                case 1:
                    _a.fileList = _b.sent();
                    return [4 /*yield*/, project_settings.read(data.currentProject)];
                case 2:
                    settings = _b.sent();
                    data.newFile = settings.fileName;
                    data.CLArgs = settings.CLArgs;
                    // TODO: data.exampleName
                    if (!data.gitData)
                        data.gitData = {};
                    data.gitData.currentProject = data.currentProject;
                    return [4 /*yield*/, git_manager.info(data.gitData)];
                case 3:
                    _b.sent();
                    return [4 /*yield*/, openFile(data)];
                case 4:
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
                case 0: return [4 /*yield*/, file_manager.empty_directory(paths.exampleTempProject)];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, file_manager.copy_directory(paths.examples + data.currentProject, paths.exampleTempProject)];
                case 2:
                    _a.sent();
                    data.exampleName = data.currentProject.split('/').pop();
                    data.currentProject = 'exampleTempProject';
                    return [4 /*yield*/, openProject(data)];
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
                case 0: return [4 /*yield*/, file_manager.directory_exists(paths.projects + data.newProject)];
                case 1:
                    if (_b.sent()) {
                        data.error = 'failed, project ' + data.newProject + ' already exists!';
                        return [2 /*return*/];
                    }
                    return [4 /*yield*/, file_manager.copy_directory(paths.templates + data.projectType, paths.projects + data.newProject)];
                case 2:
                    _b.sent();
                    _a = data;
                    return [4 /*yield*/, listProjects()];
                case 3:
                    _a.projectList = _b.sent();
                    data.currentProject = data.newProject;
                    data.newProject = undefined;
                    return [4 /*yield*/, openProject(data)];
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
                case 0: return [4 /*yield*/, file_manager.directory_exists(paths.projects + data.newProject)];
                case 1:
                    if (_b.sent()) {
                        data.error = 'failed, project ' + data.newProject + ' already exists!';
                        return [2 /*return*/];
                    }
                    return [4 /*yield*/, file_manager.copy_directory(paths.projects + data.currentProject, paths.projects + data.newProject)];
                case 2:
                    _b.sent();
                    _a = data;
                    return [4 /*yield*/, listProjects()];
                case 3:
                    _a.projectList = _b.sent();
                    data.currentProject = data.newProject;
                    data.newProject = undefined;
                    return [4 /*yield*/, openProject(data)];
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
                case 0: return [4 /*yield*/, file_manager.delete_file(paths.projects + data.currentProject)];
                case 1:
                    _c.sent();
                    _a = data;
                    return [4 /*yield*/, listProjects()];
                case 2:
                    _a.projectList = _c.sent();
                    _i = 0, _b = data.projectList;
                    _c.label = 3;
                case 3:
                    if (!(_i < _b.length)) return [3 /*break*/, 6];
                    project = _b[_i];
                    if (!(project && project !== 'undefined' && project !== 'exampleTempProject')) return [3 /*break*/, 5];
                    data.currentProject = project;
                    return [4 /*yield*/, openProject(data)];
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
                case 0: return [4 /*yield*/, file_manager.empty_directory(paths.projects + data.currentProject + '/build')];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, file_manager.delete_file(paths.projects + data.currentProject + '/' + data.currentProject)];
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
                    file_path = paths.projects + data.currentProject + '/' + data.newFile;
                    return [4 /*yield*/, file_manager.file_exists(file_path)];
                case 1:
                    if (_b.sent()) {
                        data.error = 'failed, file ' + data.newFile + ' already exists!';
                        return [2 /*return*/];
                    }
                    file_manager.write_file(file_path, '/***** ' + data.newFile + ' *****/\n');
                    _a = data;
                    return [4 /*yield*/, listFiles(data.currentProject)];
                case 2:
                    _a.fileList = _b.sent();
                    data.focus = { 'line': 2, 'column': 1 };
                    return [4 /*yield*/, openFile(data)];
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
                    file_path = paths.projects + data.currentProject + '/' + data.newFile;
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
                    return [4 /*yield*/, listFiles(data.currentProject)];
                case 5:
                    _b.fileList = _c.sent();
                    return [4 /*yield*/, openFile(data)];
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
                    file_path = paths.projects + project + '/build/' + file_root;
                    return [4 /*yield*/, file_manager.delete_file(file_path + '.d')];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, file_manager.delete_file(file_path + '.o')];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, file_manager.delete_file(paths.projects + project + '/' + project)];
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
                    file_path = paths.projects + data.currentProject + '/' + data.newFile;
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
                    return [4 /*yield*/, file_manager.rename_file(paths.projects + data.currentProject + '/' + data.fileName, file_path)];
                case 4:
                    _c.sent();
                    return [4 /*yield*/, cleanFile(data.currentProject, data.fileName)];
                case 5:
                    _c.sent();
                    _b = data;
                    return [4 /*yield*/, listFiles(data.currentProject)];
                case 6:
                    _b.fileList = _c.sent();
                    return [4 /*yield*/, openFile(data)];
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
                case 0: return [4 /*yield*/, file_manager.delete_file(paths.projects + data.currentProject + '/' + data.fileName)];
                case 1:
                    _b.sent();
                    return [4 /*yield*/, cleanFile(data.currentProject, data.fileName)];
                case 2:
                    _b.sent();
                    _a = data;
                    return [4 /*yield*/, listFiles(data.currentProject)];
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
function listFiles(project) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, file_manager.deep_read_directory(paths.projects + project)];
                case 1: return [2 /*return*/, _a.sent()];
            }
        });
    });
}
exports.listFiles = listFiles;

//# sourceMappingURL=data:application/json;charset=utf8;base64,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QUFDLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBQTs7b0JBQXBGLFNBQW9GLENBQUM7b0JBQ3JGLHFCQUFNLFNBQVMsQ0FBQyxJQUFJLENBQUMsY0FBYyxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBQTs7b0JBQW5ELFNBQW1ELENBQUM7b0JBQ3BELEtBQUEsSUFBSSxDQUFBO29CQUFZLHFCQUFNLFNBQVMsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLEVBQUE7O29CQUFwRCxHQUFLLFFBQVEsR0FBRyxTQUFvQyxDQUFDO29CQUNyRCxJQUFJLENBQUMsUUFBUSxHQUFHLDhDQUE4QyxDQUFDO29CQUMvRCxJQUFJLENBQUMsUUFBUSxHQUFHLEVBQUUsQ0FBQztvQkFDbkIsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUM7Ozs7O0NBQ3JCO0FBUEQsZ0NBT0M7QUFFRCxtQkFBZ0MsT0FBZTs7Ozt3QkFDdkMscUJBQU0sWUFBWSxDQUFDLG1CQUFtQixDQUFDLEtBQUssQ0FBQyxRQUFRLEdBQUMsT0FBTyxDQUFDLEVBQUE7d0JBQXJFLHNCQUFPLFNBQThELEVBQUM7Ozs7Q0FDdEU7QUFGRCw4QkFFQyIsImZpbGUiOiJQcm9qZWN0TWFuYWdlci5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGZpbGVfbWFuYWdlciBmcm9tICcuL0ZpbGVNYW5hZ2VyJztcbmltcG9ydCAqIGFzIGdpdF9tYW5hZ2VyIGZyb20gJy4vR2l0TWFuYWdlcic7XG5pbXBvcnQgKiBhcyBwcm9qZWN0X3NldHRpbmdzIGZyb20gJy4vUHJvamVjdFNldHRpbmdzJztcbmltcG9ydCAqIGFzIHV0aWwgZnJvbSAnLi91dGlscyc7XG5pbXBvcnQgKiBhcyBwYXRocyBmcm9tICcuL3BhdGhzJztcbmltcG9ydCAqIGFzIHJlYWRDaHVuayBmcm9tICdyZWFkLWNodW5rJztcbmltcG9ydCAqIGFzIGZpbGVUeXBlIGZyb20gJ2ZpbGUtdHlwZSc7XG5cbmxldCBtYXhfZmlsZV9zaXplID0gNTAwMDAwMDA7XHQvLyBieXRlcyAoNTBNYilcblxuLy8gYWxsIFByb2plY3RNYW5hZ2VyIG1ldGhvZHMgYXJlIGFzeW5jIGZ1bmN0aW9ucyBjYWxsZWQgd2hlbiB3ZWJzb2NrZXQgbWVzc2FnZXNcbi8vIHdpdGggdGhlIGZpZWxkIGV2ZW50OiAncHJvamVjdC1ldmVudCcgaXMgcmVjZWl2ZWQuIFRoZSBmdW5jdGlvbiBjYWxsZWQgaXMgXG4vLyBjb250YWluZWQgaW4gdGhlICdmdW5jJyBmaWVsZC4gVGhlIHdlYnNvY2tldCBtZXNzYWdlIGlzIHBhc3NlZCBpbnRvIHRoZSBtZXRob2Rcbi8vIGFzIHRoZSBkYXRhIHZhcmlhYmxlLCBhbmQgaXMgbW9kaWZpZWQgYW5kIHJldHVybmVkIGJ5IHRoZSBtZXRob2QsIGFuZCBzZW50XG4vLyBiYWNrIG92ZXIgdGhlIHdlYnNvY2tldFxuXG4vLyBvcGVuRmlsZSB0YWtlcyBhIG1lc3NhZ2Ugd2l0aCBjdXJyZW50UHJvamVjdCBhbmQgbmV3RmlsZSBmaWVsZHNcbi8vIGl0IG9wZW5zIHRoZSBmaWxlIGZyb20gdGhlIHByb2plY3QsIGlmIGl0IGlzIG5vdCB0b28gYmlnIG9yIGJpbmFyeVxuLy8gaWYgdGhlIGZpbGUgaXMgYW4gaW1hZ2Ugb3IgYXVkaW8gZmlsZSwgaXQgaXMgc3ltbGlua2VkIGZyb20gdGhlIG1lZGlhIGZvbGRlclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIG9wZW5GaWxlKGRhdGE6IGFueSl7XG5cdGxldCBmaWxlX3BhdGggPSBwYXRocy5wcm9qZWN0cytkYXRhLmN1cnJlbnRQcm9qZWN0KycvJytkYXRhLm5ld0ZpbGU7XG5cdGxldCBmaWxlX3N0YXQgPSBhd2FpdCBmaWxlX21hbmFnZXIuc3RhdF9maWxlKGZpbGVfcGF0aCk7XG5cdGlmIChmaWxlX3N0YXQuc2l6ZSA+IG1heF9maWxlX3NpemUpe1xuXHRcdGRhdGEuZXJyb3IgPSAnZmlsZSBpcyB0b28gbGFyZ2U6ICcrKGZpbGVfc3RhdC5zaXplLzEwMDAwMDApKydNYic7XG5cdFx0ZGF0YS5maWxlRGF0YSA9IFwiVGhlIElERSBjYW4ndCBvcGVuIG5vbi1zb3VyY2UgZmlsZXMgbGFyZ2VyIHRoYW4gXCIrKG1heF9maWxlX3NpemUvMTAwMDAwMCkrXCJNYlwiO1xuXHRcdGRhdGEucmVhZE9ubHkgPSB0cnVlO1xuXHRcdGRhdGEuZmlsZU5hbWUgPSBkYXRhLm5ld0ZpbGU7XG5cdFx0ZGF0YS5uZXdGaWxlID0gdW5kZWZpbmVkO1xuXHRcdGRhdGEuZmlsZVR5cGUgPSAwO1xuXHRcdHJldHVybjtcblx0fVxuXHRsZXQgY2h1bms6IEJ1ZmZlciA9IGF3YWl0IHJlYWRDaHVuayhmaWxlX3BhdGgsIDAsIDQxMDApO1xuXHRsZXQgZmlsZV90eXBlID0gYXdhaXQgZmlsZVR5cGUoY2h1bmspO1xuXHRpZiAoZmlsZV90eXBlICYmIChmaWxlX3R5cGUubWltZS5pbmNsdWRlcygnaW1hZ2UnKSB8fCBmaWxlX3R5cGUubWltZS5pbmNsdWRlcygnYXVkaW8nKSkpe1xuXHRcdGF3YWl0IGZpbGVfbWFuYWdlci5lbXB0eV9kaXJlY3RvcnkocGF0aHMubWVkaWEpO1xuXHRcdGF3YWl0IGZpbGVfbWFuYWdlci5tYWtlX3N5bWxpbmsoZmlsZV9wYXRoLCBwYXRocy5tZWRpYStkYXRhLm5ld0ZpbGUpO1xuXHRcdGRhdGEuZmlsZURhdGEgPSAnJztcblx0XHRkYXRhLnJlYWRPbmx5ID0gdHJ1ZTtcblx0XHRkYXRhLmZpbGVOYW1lID0gZGF0YS5uZXdGaWxlO1xuXHRcdGRhdGEubmV3RmlsZSA9IHVuZGVmaW5lZDtcblx0XHRkYXRhLmZpbGVUeXBlID0gZmlsZV90eXBlLm1pbWU7XG5cdFx0cmV0dXJuO1xuXHR9XG5cdGxldCBpc19iaW5hcnkgPSBhd2FpdCBmaWxlX21hbmFnZXIuaXNfYmluYXJ5KGZpbGVfcGF0aCk7XG5cdGlmIChpc19iaW5hcnkpe1xuXHRcdGRhdGEuZXJyb3IgPSAnY2FuXFwndCBvcGVuIGJpbmFyeSBmaWxlcyc7XG5cdFx0ZGF0YS5maWxlRGF0YSA9ICdCaW5hcnkgZmlsZXMgY2FuIG5vdCBiZSBlZGl0ZWQgaW4gdGhlIElERSc7XG5cdFx0ZGF0YS5maWxlTmFtZSA9IGRhdGEubmV3RmlsZTtcblx0XHRkYXRhLm5ld0ZpbGUgPSB1bmRlZmluZWQ7XG5cdFx0ZGF0YS5yZWFkT25seSA9IHRydWU7XG5cdFx0ZGF0YS5maWxlVHlwZSA9IDA7XG5cdFx0cmV0dXJuO1xuXHR9XG5cdGRhdGEuZmlsZURhdGEgPSBhd2FpdCBmaWxlX21hbmFnZXIucmVhZF9maWxlKGZpbGVfcGF0aCk7XG5cdGlmIChkYXRhLm5ld0ZpbGUuc3BsaXQgJiYgZGF0YS5uZXdGaWxlLmluY2x1ZGVzKCcuJykpe1xuXHRcdGRhdGEuZmlsZVR5cGUgPSBkYXRhLm5ld0ZpbGUuc3BsaXQoJy4nKS5wb3AoKTtcblx0fSBlbHNlIHtcblx0XHRkYXRhLmZpbGVUeXBlID0gMDtcblx0fVxuXHRkYXRhLmZpbGVOYW1lID0gZGF0YS5uZXdGaWxlO1xuXHRkYXRhLm5ld0ZpbGUgPSB1bmRlZmluZWQ7XG5cdGRhdGEucmVhZE9ubHkgPSBmYWxzZTtcblx0cmV0dXJuO1xufVxuXG4vLyB0aGVzZSB0d28gbWV0aG9kcyBhcmUgZXhjZXB0aW9ucyBhbmQgZG9uJ3QgdGFrZSB0aGUgZGF0YSBvYmplY3RcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBsaXN0UHJvamVjdHMoKTogUHJvbWlzZTxzdHJpbmdbXT57XG5cdHJldHVybiBmaWxlX21hbmFnZXIucmVhZF9kaXJlY3RvcnkocGF0aHMucHJvamVjdHMpO1xufVxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGxpc3RFeGFtcGxlcygpOiBQcm9taXNlPGFueT57XG5cdGxldCBleGFtcGxlcyA9IFtdO1xuXHRsZXQgY2F0ZWdvcmllcyA9IGF3YWl0IGZpbGVfbWFuYWdlci5yZWFkX2RpcmVjdG9yeShwYXRocy5leGFtcGxlcyk7XG5cdGZvciAobGV0IGNhdGVnb3J5IG9mIGNhdGVnb3JpZXMpe1xuXHRcdGlmIChhd2FpdCBmaWxlX21hbmFnZXIuZGlyZWN0b3J5X2V4aXN0cyhwYXRocy5leGFtcGxlcysnLycrY2F0ZWdvcnkpKXtcblx0XHRcdGV4YW1wbGVzLnB1c2goe1xuXHRcdFx0XHRuYW1lOiBjYXRlZ29yeSxcblx0XHRcdFx0Y2hpbGRyZW46IGF3YWl0IGZpbGVfbWFuYWdlci5yZWFkX2RpcmVjdG9yeShwYXRocy5leGFtcGxlcysnLycrY2F0ZWdvcnkpXG5cdFx0XHR9KTtcblx0XHR9XG5cdH1cblx0cmV0dXJuIGV4YW1wbGVzO1xufVxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIG9wZW5Qcm9qZWN0KGRhdGE6IGFueSkge1xuXHRkYXRhLmZpbGVMaXN0ID0gYXdhaXQgbGlzdEZpbGVzKGRhdGEuY3VycmVudFByb2plY3QpO1xuXHRsZXQgc2V0dGluZ3M6IGFueSA9IGF3YWl0IHByb2plY3Rfc2V0dGluZ3MucmVhZChkYXRhLmN1cnJlbnRQcm9qZWN0KTtcblx0ZGF0YS5uZXdGaWxlID0gc2V0dGluZ3MuZmlsZU5hbWU7XG5cdGRhdGEuQ0xBcmdzID0gc2V0dGluZ3MuQ0xBcmdzO1xuXHQvLyBUT0RPOiBkYXRhLmV4YW1wbGVOYW1lXG5cdGlmICghZGF0YS5naXREYXRhKVxuXHRcdGRhdGEuZ2l0RGF0YSA9IHt9O1xuXHRkYXRhLmdpdERhdGEuY3VycmVudFByb2plY3QgPSBkYXRhLmN1cnJlbnRQcm9qZWN0O1xuXHRhd2FpdCBnaXRfbWFuYWdlci5pbmZvKGRhdGEuZ2l0RGF0YSk7XG5cdGF3YWl0IG9wZW5GaWxlKGRhdGEpO1xufVxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIG9wZW5FeGFtcGxlKGRhdGE6IGFueSl7XG5cdGF3YWl0IGZpbGVfbWFuYWdlci5lbXB0eV9kaXJlY3RvcnkocGF0aHMuZXhhbXBsZVRlbXBQcm9qZWN0KTtcblx0YXdhaXQgZmlsZV9tYW5hZ2VyLmNvcHlfZGlyZWN0b3J5KHBhdGhzLmV4YW1wbGVzK2RhdGEuY3VycmVudFByb2plY3QsIHBhdGhzLmV4YW1wbGVUZW1wUHJvamVjdCk7XG5cdGRhdGEuZXhhbXBsZU5hbWUgPSBkYXRhLmN1cnJlbnRQcm9qZWN0LnNwbGl0KCcvJykucG9wKCk7XG5cdGRhdGEuY3VycmVudFByb2plY3QgPSAnZXhhbXBsZVRlbXBQcm9qZWN0Jztcblx0YXdhaXQgb3BlblByb2plY3QoZGF0YSk7XG59XG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gbmV3UHJvamVjdChkYXRhOiBhbnkpe1xuXHRpZiAoYXdhaXQgZmlsZV9tYW5hZ2VyLmRpcmVjdG9yeV9leGlzdHMocGF0aHMucHJvamVjdHMrZGF0YS5uZXdQcm9qZWN0KSl7XG5cdFx0ZGF0YS5lcnJvciA9ICdmYWlsZWQsIHByb2plY3QgJytkYXRhLm5ld1Byb2plY3QrJyBhbHJlYWR5IGV4aXN0cyEnO1xuXHRcdHJldHVybjtcblx0fVxuXHRhd2FpdCBmaWxlX21hbmFnZXIuY29weV9kaXJlY3RvcnkocGF0aHMudGVtcGxhdGVzK2RhdGEucHJvamVjdFR5cGUsIHBhdGhzLnByb2plY3RzK2RhdGEubmV3UHJvamVjdCk7XG5cdGRhdGEucHJvamVjdExpc3QgPSBhd2FpdCBsaXN0UHJvamVjdHMoKTtcblx0ZGF0YS5jdXJyZW50UHJvamVjdCA9IGRhdGEubmV3UHJvamVjdDtcblx0ZGF0YS5uZXdQcm9qZWN0ID0gdW5kZWZpbmVkO1xuXHRhd2FpdCBvcGVuUHJvamVjdChkYXRhKTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHNhdmVBcyhkYXRhOiBhbnkpe1xuXHRpZiAoYXdhaXQgZmlsZV9tYW5hZ2VyLmRpcmVjdG9yeV9leGlzdHMocGF0aHMucHJvamVjdHMrZGF0YS5uZXdQcm9qZWN0KSl7XG5cdFx0ZGF0YS5lcnJvciA9ICdmYWlsZWQsIHByb2plY3QgJytkYXRhLm5ld1Byb2plY3QrJyBhbHJlYWR5IGV4aXN0cyEnO1xuXHRcdHJldHVybjtcblx0fVxuXHRhd2FpdCBmaWxlX21hbmFnZXIuY29weV9kaXJlY3RvcnkocGF0aHMucHJvamVjdHMrZGF0YS5jdXJyZW50UHJvamVjdCwgcGF0aHMucHJvamVjdHMrZGF0YS5uZXdQcm9qZWN0KTtcblx0ZGF0YS5wcm9qZWN0TGlzdCA9IGF3YWl0IGxpc3RQcm9qZWN0cygpO1xuXHRkYXRhLmN1cnJlbnRQcm9qZWN0ID0gZGF0YS5uZXdQcm9qZWN0O1xuXHRkYXRhLm5ld1Byb2plY3QgPSB1bmRlZmluZWQ7XG5cdGF3YWl0IG9wZW5Qcm9qZWN0KGRhdGEpO1xufVxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGRlbGV0ZVByb2plY3QoZGF0YTogYW55KXtcblx0YXdhaXQgZmlsZV9tYW5hZ2VyLmRlbGV0ZV9maWxlKHBhdGhzLnByb2plY3RzK2RhdGEuY3VycmVudFByb2plY3QpO1xuXHRkYXRhLnByb2plY3RMaXN0ID0gYXdhaXQgbGlzdFByb2plY3RzKCk7XG5cdGZvciAobGV0IHByb2plY3Qgb2YgZGF0YS5wcm9qZWN0TGlzdCl7XG5cdFx0aWYgKHByb2plY3QgJiYgcHJvamVjdCAhPT0gJ3VuZGVmaW5lZCcgJiYgcHJvamVjdCAhPT0gJ2V4YW1wbGVUZW1wUHJvamVjdCcpe1xuXHRcdFx0ZGF0YS5jdXJyZW50UHJvamVjdCA9IHByb2plY3Q7XG5cdFx0XHRhd2FpdCBvcGVuUHJvamVjdChkYXRhKTtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdH1cblx0ZGF0YS5jdXJyZW50UHJvamVjdCA9ICcnO1xuXHRkYXRhLnJlYWRPbmx5ID0gdHJ1ZTtcblx0ZGF0YS5maWxlRGF0YSA9ICdwbGVhc2UgY3JlYXRlIGEgbmV3IHByb2plY3QgdG8gY29udGludWUnO1xufVxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNsZWFuUHJvamVjdChkYXRhOiBhbnkpe1xuXHRhd2FpdCBmaWxlX21hbmFnZXIuZW1wdHlfZGlyZWN0b3J5KHBhdGhzLnByb2plY3RzK2RhdGEuY3VycmVudFByb2plY3QrJy9idWlsZCcpO1xuXHRhd2FpdCBmaWxlX21hbmFnZXIuZGVsZXRlX2ZpbGUocGF0aHMucHJvamVjdHMrZGF0YS5jdXJyZW50UHJvamVjdCsnLycrZGF0YS5jdXJyZW50UHJvamVjdCk7XG59XG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gbmV3RmlsZShkYXRhOiBhbnkpe1xuXHRsZXQgZmlsZV9wYXRoID0gcGF0aHMucHJvamVjdHMrZGF0YS5jdXJyZW50UHJvamVjdCsnLycrZGF0YS5uZXdGaWxlO1xuXHRpZiAoYXdhaXQgZmlsZV9tYW5hZ2VyLmZpbGVfZXhpc3RzKGZpbGVfcGF0aCkpe1xuXHRcdGRhdGEuZXJyb3IgPSAnZmFpbGVkLCBmaWxlICcrZGF0YS5uZXdGaWxlKycgYWxyZWFkeSBleGlzdHMhJztcblx0XHRyZXR1cm47XG5cdH1cblx0ZmlsZV9tYW5hZ2VyLndyaXRlX2ZpbGUoZmlsZV9wYXRoLCAnLyoqKioqICcrZGF0YS5uZXdGaWxlKycgKioqKiovXFxuJyk7XG5cdGRhdGEuZmlsZUxpc3QgPSBhd2FpdCBsaXN0RmlsZXMoZGF0YS5jdXJyZW50UHJvamVjdCk7XG5cdGRhdGEuZm9jdXMgPSB7J2xpbmUnOiAyLCAnY29sdW1uJzogMX07XG5cdGF3YWl0IG9wZW5GaWxlKGRhdGEpO1xufVxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHVwbG9hZEZpbGUoZGF0YTogYW55KXtcblx0bGV0IGZpbGVfcGF0aCA9IHBhdGhzLnByb2plY3RzK2RhdGEuY3VycmVudFByb2plY3QrJy8nK2RhdGEubmV3RmlsZTtcblx0bGV0IGZpbGVfZXhpc3RzID0gKGF3YWl0IGZpbGVfbWFuYWdlci5maWxlX2V4aXN0cyhmaWxlX3BhdGgpIHx8IGF3YWl0IGZpbGVfbWFuYWdlci5kaXJlY3RvcnlfZXhpc3RzKGZpbGVfcGF0aCkpO1xuXHRpZiAoZmlsZV9leGlzdHMgJiYgIWRhdGEuZm9yY2Upe1xuXHRcdGRhdGEuZXJyb3IgPSAnZmFpbGVkLCBmaWxlICcrZGF0YS5uZXdGaWxlKycgYWxyZWFkeSBleGlzdHMhJztcblx0XHRkYXRhLmZpbGVEYXRhID0gdW5kZWZpbmVkO1xuXHRcdHJldHVybjtcblx0fVxuXHRhd2FpdCBmaWxlX21hbmFnZXIuc2F2ZV9maWxlKGZpbGVfcGF0aCwgZGF0YS5maWxlRGF0YSk7XG5cdGRhdGEuZmlsZUxpc3QgPSBhd2FpdCBsaXN0RmlsZXMoZGF0YS5jdXJyZW50UHJvamVjdCk7XG5cdGF3YWl0IG9wZW5GaWxlKGRhdGEpO1xufVxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNsZWFuRmlsZShwcm9qZWN0OiBzdHJpbmcsIGZpbGU6IHN0cmluZyl7XG5cdGlmIChmaWxlLnNwbGl0ICYmIGZpbGUuaW5jbHVkZXMoJy4nKSl7XG5cdFx0bGV0IHNwbGl0X2ZpbGUgPSBmaWxlLnNwbGl0KCcuJyk7XG5cdFx0bGV0IGV4dCA9IHNwbGl0X2ZpbGUucG9wKCk7XG5cdFx0bGV0IGZpbGVfcm9vdCA9IHNwbGl0X2ZpbGUuam9pbignLicpO1xuXHRcdGlmIChleHQgPT09ICdjcHAnIHx8IGV4dCA9PT0gJ2MnIHx8IGV4dCA9PT0gJ1MnKXtcblx0XHRcdGxldCBmaWxlX3BhdGggPSBwYXRocy5wcm9qZWN0cytwcm9qZWN0KycvYnVpbGQvJytmaWxlX3Jvb3Q7XG5cdFx0XHRhd2FpdCBmaWxlX21hbmFnZXIuZGVsZXRlX2ZpbGUoZmlsZV9wYXRoKycuZCcpO1xuXHRcdFx0YXdhaXQgZmlsZV9tYW5hZ2VyLmRlbGV0ZV9maWxlKGZpbGVfcGF0aCsnLm8nKTtcblx0XHRcdGF3YWl0IGZpbGVfbWFuYWdlci5kZWxldGVfZmlsZShwYXRocy5wcm9qZWN0cytwcm9qZWN0KycvJytwcm9qZWN0KTtcblx0XHR9XG5cdH1cbn1cdFxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJlbmFtZUZpbGUoZGF0YTogYW55KXtcblx0bGV0IGZpbGVfcGF0aCA9IHBhdGhzLnByb2plY3RzK2RhdGEuY3VycmVudFByb2plY3QrJy8nK2RhdGEubmV3RmlsZTtcblx0bGV0IGZpbGVfZXhpc3RzID0gKGF3YWl0IGZpbGVfbWFuYWdlci5maWxlX2V4aXN0cyhmaWxlX3BhdGgpIHx8IGF3YWl0IGZpbGVfbWFuYWdlci5kaXJlY3RvcnlfZXhpc3RzKGZpbGVfcGF0aCkpO1xuXHRpZiAoZmlsZV9leGlzdHMpe1xuXHRcdGRhdGEuZXJyb3IgPSAnZmFpbGVkLCBmaWxlICcrZGF0YS5uZXdGaWxlKycgYWxyZWFkeSBleGlzdHMhJztcblx0XHRyZXR1cm47XG5cdH1cblx0YXdhaXQgZmlsZV9tYW5hZ2VyLnJlbmFtZV9maWxlKHBhdGhzLnByb2plY3RzK2RhdGEuY3VycmVudFByb2plY3QrJy8nK2RhdGEuZmlsZU5hbWUsIGZpbGVfcGF0aCk7XG5cdGF3YWl0IGNsZWFuRmlsZShkYXRhLmN1cnJlbnRQcm9qZWN0LCBkYXRhLmZpbGVOYW1lKTtcblx0ZGF0YS5maWxlTGlzdCA9IGF3YWl0IGxpc3RGaWxlcyhkYXRhLmN1cnJlbnRQcm9qZWN0KTtcblx0YXdhaXQgb3BlbkZpbGUoZGF0YSk7XG59XG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZGVsZXRlRmlsZShkYXRhOiBhbnkpe1xuXHRhd2FpdCBmaWxlX21hbmFnZXIuZGVsZXRlX2ZpbGUocGF0aHMucHJvamVjdHMrZGF0YS5jdXJyZW50UHJvamVjdCsnLycrZGF0YS5maWxlTmFtZSk7XG5cdGF3YWl0IGNsZWFuRmlsZShkYXRhLmN1cnJlbnRQcm9qZWN0LCBkYXRhLmZpbGVOYW1lKTtcblx0ZGF0YS5maWxlTGlzdCA9IGF3YWl0IGxpc3RGaWxlcyhkYXRhLmN1cnJlbnRQcm9qZWN0KTtcblx0ZGF0YS5maWxlRGF0YSA9ICdGaWxlIGRlbGV0ZWQgLSBvcGVuIGFub3RoZXIgZmlsZSB0byBjb250aW51ZSc7XG5cdGRhdGEuZmlsZU5hbWUgPSAnJztcblx0ZGF0YS5yZWFkT25seSA9IHRydWU7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBsaXN0RmlsZXMocHJvamVjdDogc3RyaW5nKTogUHJvbWlzZTx1dGlsLkZpbGVfRGVzY3JpcHRvcltdPntcblx0cmV0dXJuIGF3YWl0IGZpbGVfbWFuYWdlci5kZWVwX3JlYWRfZGlyZWN0b3J5KHBhdGhzLnByb2plY3RzK3Byb2plY3QpO1xufVxuIl19
