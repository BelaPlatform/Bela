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
        var file_path, file_stat, e_1, chunk, file_type, is_binary, _a, e_2;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    file_path = paths.projects + data.currentProject + '/' + data.newFile;
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, file_manager.stat_file(file_path)];
                case 2:
                    file_stat = _b.sent();
                    return [3 /*break*/, 4];
                case 3:
                    e_1 = _b.sent();
                    data.error = 'error opening file ' + data.newFile + ': ' + e_1.toString();
                    data.fileData = 'Error opening file. Please open a different file to continue';
                    data.fileName = data.newFile;
                    data.newFile = undefined;
                    data.readOnly = true;
                    data.fileType = 0;
                    return [2 /*return*/];
                case 4:
                    if (file_stat.size > max_file_size) {
                        data.error = 'file is too large: ' + (file_stat.size / 1000000) + 'Mb';
                        data.fileData = "The IDE can't open files larger than " + (max_file_size / 1000000) + "Mb";
                        data.readOnly = true;
                        data.fileName = data.newFile;
                        data.newFile = undefined;
                        data.fileType = 0;
                        return [2 /*return*/];
                    }
                    return [4 /*yield*/, readChunk(file_path, 0, 4100)];
                case 5:
                    chunk = _b.sent();
                    return [4 /*yield*/, fileType(chunk)];
                case 6:
                    file_type = _b.sent();
                    if (!(file_type && (file_type.mime.includes('image') || file_type.mime.includes('audio')))) return [3 /*break*/, 9];
                    return [4 /*yield*/, file_manager.empty_directory(paths.media)];
                case 7:
                    _b.sent();
                    return [4 /*yield*/, file_manager.make_symlink(file_path, paths.media + data.newFile)];
                case 8:
                    _b.sent();
                    data.fileData = '';
                    data.readOnly = true;
                    data.fileName = data.newFile;
                    data.newFile = undefined;
                    data.fileType = file_type.mime;
                    return [2 /*return*/];
                case 9: return [4 /*yield*/, file_manager.is_binary(file_path)];
                case 10:
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
                    _b.label = 11;
                case 11:
                    _b.trys.push([11, 13, , 14]);
                    _a = data;
                    return [4 /*yield*/, file_manager.read_file(file_path)];
                case 12:
                    _a.fileData = _b.sent();
                    return [3 /*break*/, 14];
                case 13:
                    e_2 = _b.sent();
                    data.error = 'error opening file ' + data.newFile + ': ' + e_2.toString();
                    data.fileData = 'Error opening file. Please open a different file to continue';
                    data.fileName = data.newFile;
                    data.newFile = undefined;
                    data.readOnly = true;
                    data.fileType = 0;
                    return [2 /*return*/];
                case 14:
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,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Qy9ELElBQUksQ0FBQyxRQUFRLEdBQUcsRUFBRSxDQUFDO29CQUNuQixJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQzs7Ozs7Q0FDckI7QUFQRCxnQ0FPQztBQUVELG1CQUFnQyxPQUFlOzs7O3dCQUN2QyxxQkFBTSxZQUFZLENBQUMsbUJBQW1CLENBQUMsS0FBSyxDQUFDLFFBQVEsR0FBQyxPQUFPLENBQUMsRUFBQTt3QkFBckUsc0JBQU8sU0FBOEQsRUFBQzs7OztDQUN0RTtBQUZELDhCQUVDIiwiZmlsZSI6IlByb2plY3RNYW5hZ2VyLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgZmlsZV9tYW5hZ2VyIGZyb20gJy4vRmlsZU1hbmFnZXInO1xuaW1wb3J0ICogYXMgZ2l0X21hbmFnZXIgZnJvbSAnLi9HaXRNYW5hZ2VyJztcbmltcG9ydCAqIGFzIHByb2plY3Rfc2V0dGluZ3MgZnJvbSAnLi9Qcm9qZWN0U2V0dGluZ3MnO1xuaW1wb3J0ICogYXMgdXRpbCBmcm9tICcuL3V0aWxzJztcbmltcG9ydCAqIGFzIHBhdGhzIGZyb20gJy4vcGF0aHMnO1xuaW1wb3J0ICogYXMgcmVhZENodW5rIGZyb20gJ3JlYWQtY2h1bmsnO1xuaW1wb3J0ICogYXMgZmlsZVR5cGUgZnJvbSAnZmlsZS10eXBlJztcblxubGV0IG1heF9maWxlX3NpemUgPSA1MDAwMDAwMDtcdC8vIGJ5dGVzICg1ME1iKVxuXG4vLyBhbGwgUHJvamVjdE1hbmFnZXIgbWV0aG9kcyBhcmUgYXN5bmMgZnVuY3Rpb25zIGNhbGxlZCB3aGVuIHdlYnNvY2tldCBtZXNzYWdlc1xuLy8gd2l0aCB0aGUgZmllbGQgZXZlbnQ6ICdwcm9qZWN0LWV2ZW50JyBpcyByZWNlaXZlZC4gVGhlIGZ1bmN0aW9uIGNhbGxlZCBpcyBcbi8vIGNvbnRhaW5lZCBpbiB0aGUgJ2Z1bmMnIGZpZWxkLiBUaGUgd2Vic29ja2V0IG1lc3NhZ2UgaXMgcGFzc2VkIGludG8gdGhlIG1ldGhvZFxuLy8gYXMgdGhlIGRhdGEgdmFyaWFibGUsIGFuZCBpcyBtb2RpZmllZCBhbmQgcmV0dXJuZWQgYnkgdGhlIG1ldGhvZCwgYW5kIHNlbnRcbi8vIGJhY2sgb3ZlciB0aGUgd2Vic29ja2V0XG5cbi8vIG9wZW5GaWxlIHRha2VzIGEgbWVzc2FnZSB3aXRoIGN1cnJlbnRQcm9qZWN0IGFuZCBuZXdGaWxlIGZpZWxkc1xuLy8gaXQgb3BlbnMgdGhlIGZpbGUgZnJvbSB0aGUgcHJvamVjdCwgaWYgaXQgaXMgbm90IHRvbyBiaWcgb3IgYmluYXJ5XG4vLyBpZiB0aGUgZmlsZSBpcyBhbiBpbWFnZSBvciBhdWRpbyBmaWxlLCBpdCBpcyBzeW1saW5rZWQgZnJvbSB0aGUgbWVkaWEgZm9sZGVyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gb3BlbkZpbGUoZGF0YTogYW55KXtcblx0bGV0IGZpbGVfcGF0aCA9IHBhdGhzLnByb2plY3RzK2RhdGEuY3VycmVudFByb2plY3QrJy8nK2RhdGEubmV3RmlsZTtcblx0dHJ5e1xuXHRcdHZhciBmaWxlX3N0YXQgPSBhd2FpdCBmaWxlX21hbmFnZXIuc3RhdF9maWxlKGZpbGVfcGF0aCk7XG5cdH1cblx0Y2F0Y2goZSl7XG5cdFx0ZGF0YS5lcnJvciA9ICdlcnJvciBvcGVuaW5nIGZpbGUgJytkYXRhLm5ld0ZpbGUrJzogJytlLnRvU3RyaW5nKCk7XG5cdFx0ZGF0YS5maWxlRGF0YSA9ICdFcnJvciBvcGVuaW5nIGZpbGUuIFBsZWFzZSBvcGVuIGEgZGlmZmVyZW50IGZpbGUgdG8gY29udGludWUnO1xuXHRcdGRhdGEuZmlsZU5hbWUgPSBkYXRhLm5ld0ZpbGU7XG5cdFx0ZGF0YS5uZXdGaWxlID0gdW5kZWZpbmVkO1xuXHRcdGRhdGEucmVhZE9ubHkgPSB0cnVlO1xuXHRcdGRhdGEuZmlsZVR5cGUgPSAwO1xuXHRcdHJldHVybjtcblx0fVxuXHRpZiAoZmlsZV9zdGF0LnNpemUgPiBtYXhfZmlsZV9zaXplKXtcblx0XHRkYXRhLmVycm9yID0gJ2ZpbGUgaXMgdG9vIGxhcmdlOiAnKyhmaWxlX3N0YXQuc2l6ZS8xMDAwMDAwKSsnTWInO1xuXHRcdGRhdGEuZmlsZURhdGEgPSBcIlRoZSBJREUgY2FuJ3Qgb3BlbiBmaWxlcyBsYXJnZXIgdGhhbiBcIisobWF4X2ZpbGVfc2l6ZS8xMDAwMDAwKStcIk1iXCI7XG5cdFx0ZGF0YS5yZWFkT25seSA9IHRydWU7XG5cdFx0ZGF0YS5maWxlTmFtZSA9IGRhdGEubmV3RmlsZTtcblx0XHRkYXRhLm5ld0ZpbGUgPSB1bmRlZmluZWQ7XG5cdFx0ZGF0YS5maWxlVHlwZSA9IDA7XG5cdFx0cmV0dXJuO1xuXHR9XG5cdGxldCBjaHVuazogQnVmZmVyID0gYXdhaXQgcmVhZENodW5rKGZpbGVfcGF0aCwgMCwgNDEwMCk7XG5cdGxldCBmaWxlX3R5cGUgPSBhd2FpdCBmaWxlVHlwZShjaHVuayk7XG5cdGlmIChmaWxlX3R5cGUgJiYgKGZpbGVfdHlwZS5taW1lLmluY2x1ZGVzKCdpbWFnZScpIHx8IGZpbGVfdHlwZS5taW1lLmluY2x1ZGVzKCdhdWRpbycpKSl7XG5cdFx0YXdhaXQgZmlsZV9tYW5hZ2VyLmVtcHR5X2RpcmVjdG9yeShwYXRocy5tZWRpYSk7XG5cdFx0YXdhaXQgZmlsZV9tYW5hZ2VyLm1ha2Vfc3ltbGluayhmaWxlX3BhdGgsIHBhdGhzLm1lZGlhK2RhdGEubmV3RmlsZSk7XG5cdFx0ZGF0YS5maWxlRGF0YSA9ICcnO1xuXHRcdGRhdGEucmVhZE9ubHkgPSB0cnVlO1xuXHRcdGRhdGEuZmlsZU5hbWUgPSBkYXRhLm5ld0ZpbGU7XG5cdFx0ZGF0YS5uZXdGaWxlID0gdW5kZWZpbmVkO1xuXHRcdGRhdGEuZmlsZVR5cGUgPSBmaWxlX3R5cGUubWltZTtcblx0XHRyZXR1cm47XG5cdH1cblx0bGV0IGlzX2JpbmFyeSA9IGF3YWl0IGZpbGVfbWFuYWdlci5pc19iaW5hcnkoZmlsZV9wYXRoKTtcblx0aWYgKGlzX2JpbmFyeSl7XG5cdFx0ZGF0YS5lcnJvciA9ICdjYW5cXCd0IG9wZW4gYmluYXJ5IGZpbGVzJztcblx0XHRkYXRhLmZpbGVEYXRhID0gJ0JpbmFyeSBmaWxlcyBjYW4gbm90IGJlIGVkaXRlZCBpbiB0aGUgSURFJztcblx0XHRkYXRhLmZpbGVOYW1lID0gZGF0YS5uZXdGaWxlO1xuXHRcdGRhdGEubmV3RmlsZSA9IHVuZGVmaW5lZDtcblx0XHRkYXRhLnJlYWRPbmx5ID0gdHJ1ZTtcblx0XHRkYXRhLmZpbGVUeXBlID0gMDtcblx0XHRyZXR1cm47XG5cdH1cblx0dHJ5e1xuXHRcdGRhdGEuZmlsZURhdGEgPSBhd2FpdCBmaWxlX21hbmFnZXIucmVhZF9maWxlKGZpbGVfcGF0aCk7XG5cdH1cblx0Y2F0Y2goZSl7XG5cdFx0ZGF0YS5lcnJvciA9ICdlcnJvciBvcGVuaW5nIGZpbGUgJytkYXRhLm5ld0ZpbGUrJzogJytlLnRvU3RyaW5nKCk7XG5cdFx0ZGF0YS5maWxlRGF0YSA9ICdFcnJvciBvcGVuaW5nIGZpbGUuIFBsZWFzZSBvcGVuIGEgZGlmZmVyZW50IGZpbGUgdG8gY29udGludWUnO1xuXHRcdGRhdGEuZmlsZU5hbWUgPSBkYXRhLm5ld0ZpbGU7XG5cdFx0ZGF0YS5uZXdGaWxlID0gdW5kZWZpbmVkO1xuXHRcdGRhdGEucmVhZE9ubHkgPSB0cnVlO1xuXHRcdGRhdGEuZmlsZVR5cGUgPSAwO1xuXHRcdHJldHVybjtcblx0fVxuXHRpZiAoZGF0YS5uZXdGaWxlLnNwbGl0ICYmIGRhdGEubmV3RmlsZS5pbmNsdWRlcygnLicpKXtcblx0XHRkYXRhLmZpbGVUeXBlID0gZGF0YS5uZXdGaWxlLnNwbGl0KCcuJykucG9wKCk7XG5cdH0gZWxzZSB7XG5cdFx0ZGF0YS5maWxlVHlwZSA9IDA7XG5cdH1cblx0ZGF0YS5maWxlTmFtZSA9IGRhdGEubmV3RmlsZTtcblx0ZGF0YS5uZXdGaWxlID0gdW5kZWZpbmVkO1xuXHRkYXRhLnJlYWRPbmx5ID0gZmFsc2U7XG5cdHJldHVybjtcbn1cblxuLy8gdGhlc2UgdHdvIG1ldGhvZHMgYXJlIGV4Y2VwdGlvbnMgYW5kIGRvbid0IHRha2UgdGhlIGRhdGEgb2JqZWN0XG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gbGlzdFByb2plY3RzKCk6IFByb21pc2U8c3RyaW5nW10+e1xuXHRyZXR1cm4gZmlsZV9tYW5hZ2VyLnJlYWRfZGlyZWN0b3J5KHBhdGhzLnByb2plY3RzKTtcbn1cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBsaXN0RXhhbXBsZXMoKTogUHJvbWlzZTxhbnk+e1xuXHRsZXQgZXhhbXBsZXMgPSBbXTtcblx0bGV0IGNhdGVnb3JpZXMgPSBhd2FpdCBmaWxlX21hbmFnZXIucmVhZF9kaXJlY3RvcnkocGF0aHMuZXhhbXBsZXMpO1xuXHRmb3IgKGxldCBjYXRlZ29yeSBvZiBjYXRlZ29yaWVzKXtcblx0XHRpZiAoYXdhaXQgZmlsZV9tYW5hZ2VyLmRpcmVjdG9yeV9leGlzdHMocGF0aHMuZXhhbXBsZXMrJy8nK2NhdGVnb3J5KSl7XG5cdFx0XHRleGFtcGxlcy5wdXNoKHtcblx0XHRcdFx0bmFtZTogY2F0ZWdvcnksXG5cdFx0XHRcdGNoaWxkcmVuOiBhd2FpdCBmaWxlX21hbmFnZXIucmVhZF9kaXJlY3RvcnkocGF0aHMuZXhhbXBsZXMrJy8nK2NhdGVnb3J5KVxuXHRcdFx0fSk7XG5cdFx0fVxuXHR9XG5cdHJldHVybiBleGFtcGxlcztcbn1cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBvcGVuUHJvamVjdChkYXRhOiBhbnkpIHtcblx0ZGF0YS5maWxlTGlzdCA9IGF3YWl0IGxpc3RGaWxlcyhkYXRhLmN1cnJlbnRQcm9qZWN0KTtcblx0bGV0IHNldHRpbmdzOiBhbnkgPSBhd2FpdCBwcm9qZWN0X3NldHRpbmdzLnJlYWQoZGF0YS5jdXJyZW50UHJvamVjdCk7XG5cdGRhdGEubmV3RmlsZSA9IHNldHRpbmdzLmZpbGVOYW1lO1xuXHRkYXRhLkNMQXJncyA9IHNldHRpbmdzLkNMQXJncztcblx0Ly8gVE9ETzogZGF0YS5leGFtcGxlTmFtZVxuXHRpZiAoIWRhdGEuZ2l0RGF0YSlcblx0XHRkYXRhLmdpdERhdGEgPSB7fTtcblx0ZGF0YS5naXREYXRhLmN1cnJlbnRQcm9qZWN0ID0gZGF0YS5jdXJyZW50UHJvamVjdDtcblx0YXdhaXQgZ2l0X21hbmFnZXIuaW5mbyhkYXRhLmdpdERhdGEpO1xuXHRhd2FpdCBvcGVuRmlsZShkYXRhKTtcbn1cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBvcGVuRXhhbXBsZShkYXRhOiBhbnkpe1xuXHRhd2FpdCBmaWxlX21hbmFnZXIuZW1wdHlfZGlyZWN0b3J5KHBhdGhzLmV4YW1wbGVUZW1wUHJvamVjdCk7XG5cdGF3YWl0IGZpbGVfbWFuYWdlci5jb3B5X2RpcmVjdG9yeShwYXRocy5leGFtcGxlcytkYXRhLmN1cnJlbnRQcm9qZWN0LCBwYXRocy5leGFtcGxlVGVtcFByb2plY3QpO1xuXHRkYXRhLmV4YW1wbGVOYW1lID0gZGF0YS5jdXJyZW50UHJvamVjdC5zcGxpdCgnLycpLnBvcCgpO1xuXHRkYXRhLmN1cnJlbnRQcm9qZWN0ID0gJ2V4YW1wbGVUZW1wUHJvamVjdCc7XG5cdGF3YWl0IG9wZW5Qcm9qZWN0KGRhdGEpO1xufVxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIG5ld1Byb2plY3QoZGF0YTogYW55KXtcblx0aWYgKGF3YWl0IGZpbGVfbWFuYWdlci5kaXJlY3RvcnlfZXhpc3RzKHBhdGhzLnByb2plY3RzK2RhdGEubmV3UHJvamVjdCkpe1xuXHRcdGRhdGEuZXJyb3IgPSAnZmFpbGVkLCBwcm9qZWN0ICcrZGF0YS5uZXdQcm9qZWN0KycgYWxyZWFkeSBleGlzdHMhJztcblx0XHRyZXR1cm47XG5cdH1cblx0YXdhaXQgZmlsZV9tYW5hZ2VyLmNvcHlfZGlyZWN0b3J5KHBhdGhzLnRlbXBsYXRlcytkYXRhLnByb2plY3RUeXBlLCBwYXRocy5wcm9qZWN0cytkYXRhLm5ld1Byb2plY3QpO1xuXHRkYXRhLnByb2plY3RMaXN0ID0gYXdhaXQgbGlzdFByb2plY3RzKCk7XG5cdGRhdGEuY3VycmVudFByb2plY3QgPSBkYXRhLm5ld1Byb2plY3Q7XG5cdGRhdGEubmV3UHJvamVjdCA9IHVuZGVmaW5lZDtcblx0YXdhaXQgb3BlblByb2plY3QoZGF0YSk7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBzYXZlQXMoZGF0YTogYW55KXtcblx0aWYgKGF3YWl0IGZpbGVfbWFuYWdlci5kaXJlY3RvcnlfZXhpc3RzKHBhdGhzLnByb2plY3RzK2RhdGEubmV3UHJvamVjdCkpe1xuXHRcdGRhdGEuZXJyb3IgPSAnZmFpbGVkLCBwcm9qZWN0ICcrZGF0YS5uZXdQcm9qZWN0KycgYWxyZWFkeSBleGlzdHMhJztcblx0XHRyZXR1cm47XG5cdH1cblx0YXdhaXQgZmlsZV9tYW5hZ2VyLmNvcHlfZGlyZWN0b3J5KHBhdGhzLnByb2plY3RzK2RhdGEuY3VycmVudFByb2plY3QsIHBhdGhzLnByb2plY3RzK2RhdGEubmV3UHJvamVjdCk7XG5cdGRhdGEucHJvamVjdExpc3QgPSBhd2FpdCBsaXN0UHJvamVjdHMoKTtcblx0ZGF0YS5jdXJyZW50UHJvamVjdCA9IGRhdGEubmV3UHJvamVjdDtcblx0ZGF0YS5uZXdQcm9qZWN0ID0gdW5kZWZpbmVkO1xuXHRhd2FpdCBvcGVuUHJvamVjdChkYXRhKTtcbn1cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBkZWxldGVQcm9qZWN0KGRhdGE6IGFueSl7XG5cdGF3YWl0IGZpbGVfbWFuYWdlci5kZWxldGVfZmlsZShwYXRocy5wcm9qZWN0cytkYXRhLmN1cnJlbnRQcm9qZWN0KTtcblx0ZGF0YS5wcm9qZWN0TGlzdCA9IGF3YWl0IGxpc3RQcm9qZWN0cygpO1xuXHRmb3IgKGxldCBwcm9qZWN0IG9mIGRhdGEucHJvamVjdExpc3Qpe1xuXHRcdGlmIChwcm9qZWN0ICYmIHByb2plY3QgIT09ICd1bmRlZmluZWQnICYmIHByb2plY3QgIT09ICdleGFtcGxlVGVtcFByb2plY3QnKXtcblx0XHRcdGRhdGEuY3VycmVudFByb2plY3QgPSBwcm9qZWN0O1xuXHRcdFx0YXdhaXQgb3BlblByb2plY3QoZGF0YSk7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHR9XG5cdGRhdGEuY3VycmVudFByb2plY3QgPSAnJztcblx0ZGF0YS5yZWFkT25seSA9IHRydWU7XG5cdGRhdGEuZmlsZURhdGEgPSAncGxlYXNlIGNyZWF0ZSBhIG5ldyBwcm9qZWN0IHRvIGNvbnRpbnVlJztcbn1cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjbGVhblByb2plY3QoZGF0YTogYW55KXtcblx0YXdhaXQgZmlsZV9tYW5hZ2VyLmVtcHR5X2RpcmVjdG9yeShwYXRocy5wcm9qZWN0cytkYXRhLmN1cnJlbnRQcm9qZWN0KycvYnVpbGQnKTtcblx0YXdhaXQgZmlsZV9tYW5hZ2VyLmRlbGV0ZV9maWxlKHBhdGhzLnByb2plY3RzK2RhdGEuY3VycmVudFByb2plY3QrJy8nK2RhdGEuY3VycmVudFByb2plY3QpO1xufVxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIG5ld0ZpbGUoZGF0YTogYW55KXtcblx0bGV0IGZpbGVfcGF0aCA9IHBhdGhzLnByb2plY3RzK2RhdGEuY3VycmVudFByb2plY3QrJy8nK2RhdGEubmV3RmlsZTtcblx0aWYgKGF3YWl0IGZpbGVfbWFuYWdlci5maWxlX2V4aXN0cyhmaWxlX3BhdGgpKXtcblx0XHRkYXRhLmVycm9yID0gJ2ZhaWxlZCwgZmlsZSAnK2RhdGEubmV3RmlsZSsnIGFscmVhZHkgZXhpc3RzISc7XG5cdFx0cmV0dXJuO1xuXHR9XG5cdGZpbGVfbWFuYWdlci53cml0ZV9maWxlKGZpbGVfcGF0aCwgJy8qKioqKiAnK2RhdGEubmV3RmlsZSsnICoqKioqL1xcbicpO1xuXHRkYXRhLmZpbGVMaXN0ID0gYXdhaXQgbGlzdEZpbGVzKGRhdGEuY3VycmVudFByb2plY3QpO1xuXHRkYXRhLmZvY3VzID0geydsaW5lJzogMiwgJ2NvbHVtbic6IDF9O1xuXHRhd2FpdCBvcGVuRmlsZShkYXRhKTtcbn1cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiB1cGxvYWRGaWxlKGRhdGE6IGFueSl7XG5cdGxldCBmaWxlX3BhdGggPSBwYXRocy5wcm9qZWN0cytkYXRhLmN1cnJlbnRQcm9qZWN0KycvJytkYXRhLm5ld0ZpbGU7XG5cdGxldCBmaWxlX2V4aXN0cyA9IChhd2FpdCBmaWxlX21hbmFnZXIuZmlsZV9leGlzdHMoZmlsZV9wYXRoKSB8fCBhd2FpdCBmaWxlX21hbmFnZXIuZGlyZWN0b3J5X2V4aXN0cyhmaWxlX3BhdGgpKTtcblx0aWYgKGZpbGVfZXhpc3RzICYmICFkYXRhLmZvcmNlKXtcblx0XHRkYXRhLmVycm9yID0gJ2ZhaWxlZCwgZmlsZSAnK2RhdGEubmV3RmlsZSsnIGFscmVhZHkgZXhpc3RzISc7XG5cdFx0ZGF0YS5maWxlRGF0YSA9IHVuZGVmaW5lZDtcblx0XHRyZXR1cm47XG5cdH1cblx0YXdhaXQgZmlsZV9tYW5hZ2VyLnNhdmVfZmlsZShmaWxlX3BhdGgsIGRhdGEuZmlsZURhdGEpO1xuXHRkYXRhLmZpbGVMaXN0ID0gYXdhaXQgbGlzdEZpbGVzKGRhdGEuY3VycmVudFByb2plY3QpO1xuXHRhd2FpdCBvcGVuRmlsZShkYXRhKTtcbn1cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjbGVhbkZpbGUocHJvamVjdDogc3RyaW5nLCBmaWxlOiBzdHJpbmcpe1xuXHRpZiAoZmlsZS5zcGxpdCAmJiBmaWxlLmluY2x1ZGVzKCcuJykpe1xuXHRcdGxldCBzcGxpdF9maWxlID0gZmlsZS5zcGxpdCgnLicpO1xuXHRcdGxldCBleHQgPSBzcGxpdF9maWxlLnBvcCgpO1xuXHRcdGxldCBmaWxlX3Jvb3QgPSBzcGxpdF9maWxlLmpvaW4oJy4nKTtcblx0XHRpZiAoZXh0ID09PSAnY3BwJyB8fCBleHQgPT09ICdjJyB8fCBleHQgPT09ICdTJyl7XG5cdFx0XHRsZXQgZmlsZV9wYXRoID0gcGF0aHMucHJvamVjdHMrcHJvamVjdCsnL2J1aWxkLycrZmlsZV9yb290O1xuXHRcdFx0YXdhaXQgZmlsZV9tYW5hZ2VyLmRlbGV0ZV9maWxlKGZpbGVfcGF0aCsnLmQnKTtcblx0XHRcdGF3YWl0IGZpbGVfbWFuYWdlci5kZWxldGVfZmlsZShmaWxlX3BhdGgrJy5vJyk7XG5cdFx0XHRhd2FpdCBmaWxlX21hbmFnZXIuZGVsZXRlX2ZpbGUocGF0aHMucHJvamVjdHMrcHJvamVjdCsnLycrcHJvamVjdCk7XG5cdFx0fVxuXHR9XG59XHRcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZW5hbWVGaWxlKGRhdGE6IGFueSl7XG5cdGxldCBmaWxlX3BhdGggPSBwYXRocy5wcm9qZWN0cytkYXRhLmN1cnJlbnRQcm9qZWN0KycvJytkYXRhLm5ld0ZpbGU7XG5cdGxldCBmaWxlX2V4aXN0cyA9IChhd2FpdCBmaWxlX21hbmFnZXIuZmlsZV9leGlzdHMoZmlsZV9wYXRoKSB8fCBhd2FpdCBmaWxlX21hbmFnZXIuZGlyZWN0b3J5X2V4aXN0cyhmaWxlX3BhdGgpKTtcblx0aWYgKGZpbGVfZXhpc3RzKXtcblx0XHRkYXRhLmVycm9yID0gJ2ZhaWxlZCwgZmlsZSAnK2RhdGEubmV3RmlsZSsnIGFscmVhZHkgZXhpc3RzISc7XG5cdFx0cmV0dXJuO1xuXHR9XG5cdGF3YWl0IGZpbGVfbWFuYWdlci5yZW5hbWVfZmlsZShwYXRocy5wcm9qZWN0cytkYXRhLmN1cnJlbnRQcm9qZWN0KycvJytkYXRhLmZpbGVOYW1lLCBmaWxlX3BhdGgpO1xuXHRhd2FpdCBjbGVhbkZpbGUoZGF0YS5jdXJyZW50UHJvamVjdCwgZGF0YS5maWxlTmFtZSk7XG5cdGRhdGEuZmlsZUxpc3QgPSBhd2FpdCBsaXN0RmlsZXMoZGF0YS5jdXJyZW50UHJvamVjdCk7XG5cdGF3YWl0IG9wZW5GaWxlKGRhdGEpO1xufVxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGRlbGV0ZUZpbGUoZGF0YTogYW55KXtcblx0YXdhaXQgZmlsZV9tYW5hZ2VyLmRlbGV0ZV9maWxlKHBhdGhzLnByb2plY3RzK2RhdGEuY3VycmVudFByb2plY3QrJy8nK2RhdGEuZmlsZU5hbWUpO1xuXHRhd2FpdCBjbGVhbkZpbGUoZGF0YS5jdXJyZW50UHJvamVjdCwgZGF0YS5maWxlTmFtZSk7XG5cdGRhdGEuZmlsZUxpc3QgPSBhd2FpdCBsaXN0RmlsZXMoZGF0YS5jdXJyZW50UHJvamVjdCk7XG5cdGRhdGEuZmlsZURhdGEgPSAnRmlsZSBkZWxldGVkIC0gb3BlbiBhbm90aGVyIGZpbGUgdG8gY29udGludWUnO1xuXHRkYXRhLmZpbGVOYW1lID0gJyc7XG5cdGRhdGEucmVhZE9ubHkgPSB0cnVlO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gbGlzdEZpbGVzKHByb2plY3Q6IHN0cmluZyk6IFByb21pc2U8dXRpbC5GaWxlX0Rlc2NyaXB0b3JbXT57XG5cdHJldHVybiBhd2FpdCBmaWxlX21hbmFnZXIuZGVlcF9yZWFkX2RpcmVjdG9yeShwYXRocy5wcm9qZWN0cytwcm9qZWN0KTtcbn1cbiJdfQ==
