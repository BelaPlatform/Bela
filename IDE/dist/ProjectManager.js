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
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
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
        var file_path, file_stat, e_1, _i, _a, file, chunk, file_type, is_binary, _b, e_2;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    file_path = paths.projects + data.currentProject + '/' + data.newFile;
                    _c.label = 1;
                case 1:
                    _c.trys.push([1, 3, , 8]);
                    return [4 /*yield*/, file_manager.stat_file(file_path)];
                case 2:
                    file_stat = _c.sent();
                    return [3 /*break*/, 8];
                case 3:
                    e_1 = _c.sent();
                    if (!(typeof data.exampleName !== 'undefined' || data.func === 'newProject')) return [3 /*break*/, 7];
                    _i = 0, _a = data.fileList;
                    _c.label = 4;
                case 4:
                    if (!(_i < _a.length)) return [3 /*break*/, 7];
                    file = _a[_i];
                    if (!file.name.includes('_main')) return [3 /*break*/, 6];
                    data.newFile = file.name;
                    return [4 /*yield*/, openFile(data)];
                case 5:
                    _c.sent();
                    return [2 /*return*/];
                case 6:
                    _i++;
                    return [3 /*break*/, 4];
                case 7:
                    data.error = 'error opening file ' + data.newFile + ': ' + e_1.toString();
                    data.fileData = 'Error opening file. Please open a different file to continue';
                    data.fileName = data.newFile;
                    data.newFile = undefined;
                    data.readOnly = true;
                    data.fileType = 0;
                    return [2 /*return*/];
                case 8:
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
                case 9:
                    chunk = _c.sent();
                    return [4 /*yield*/, fileType(chunk)];
                case 10:
                    file_type = _c.sent();
                    if (!(file_type && (file_type.mime.includes('image') || file_type.mime.includes('audio')))) return [3 /*break*/, 13];
                    return [4 /*yield*/, file_manager.empty_directory(paths.media)];
                case 11:
                    _c.sent();
                    return [4 /*yield*/, file_manager.make_symlink(file_path, paths.media + data.newFile)];
                case 12:
                    _c.sent();
                    data.fileData = '';
                    data.readOnly = true;
                    data.fileName = data.newFile;
                    data.newFile = undefined;
                    data.fileType = file_type.mime;
                    return [2 /*return*/];
                case 13: return [4 /*yield*/, file_manager.is_binary(file_path)];
                case 14:
                    is_binary = _c.sent();
                    if (is_binary) {
                        data.error = 'can\'t open binary files';
                        data.fileData = 'Binary files can not be edited in the IDE';
                        data.fileName = data.newFile;
                        data.newFile = undefined;
                        data.readOnly = true;
                        data.fileType = 0;
                        return [2 /*return*/];
                    }
                    _c.label = 15;
                case 15:
                    _c.trys.push([15, 17, , 18]);
                    _b = data;
                    return [4 /*yield*/, file_manager.read_file(file_path)];
                case 16:
                    _b.fileData = _c.sent();
                    return [3 /*break*/, 18];
                case 17:
                    e_2 = _c.sent();
                    data.error = 'error opening file ' + data.newFile + ': ' + e_2.toString();
                    data.fileData = 'Error opening file. Please open a different file to continue';
                    data.fileName = data.newFile;
                    data.newFile = undefined;
                    data.readOnly = true;
                    data.fileType = 0;
                    return [2 /*return*/];
                case 18:
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
function listLibraries() {
    return __awaiter(this, void 0, void 0, function () {
        var libraries, categories, _i, categories_1, category, _a, _b, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    libraries = [];
                    return [4 /*yield*/, file_manager.read_directory(paths.libraries)];
                case 1:
                    categories = _d.sent();
                    _i = 0, categories_1 = categories;
                    _d.label = 2;
                case 2:
                    if (!(_i < categories_1.length)) return [3 /*break*/, 6];
                    category = categories_1[_i];
                    return [4 /*yield*/, file_manager.directory_exists(paths.libraries + '/' + category)];
                case 3:
                    if (!_d.sent()) return [3 /*break*/, 5];
                    _b = (_a = libraries).push;
                    _c = {
                        name: category
                    };
                    return [4 /*yield*/, file_manager.read_directory(paths.libraries + '/' + category)];
                case 4:
                    _b.apply(_a, [(_c.children = _d.sent(),
                            _c)]);
                    _d.label = 5;
                case 5:
                    _i++;
                    return [3 /*break*/, 2];
                case 6: return [2 /*return*/, libraries];
            }
        });
    });
}
exports.listLibraries = listLibraries;
function listExamples() {
    return __awaiter(this, void 0, void 0, function () {
        var examples, categories, _i, categories_2, category, _a, _b, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    examples = [];
                    return [4 /*yield*/, file_manager.read_directory(paths.examples)];
                case 1:
                    categories = _d.sent();
                    _i = 0, categories_2 = categories;
                    _d.label = 2;
                case 2:
                    if (!(_i < categories_2.length)) return [3 /*break*/, 6];
                    category = categories_2[_i];
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
                    if (data.currentProject !== 'exampleTempProject')
                        data.exampleName = '';
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
                    return [4 /*yield*/, cleanProject(data)];
                case 2:
                    _b.sent();
                    return [4 /*yield*/, file_manager.copy_directory(paths.projects + data.currentProject, paths.projects + data.newProject)];
                case 3:
                    _b.sent();
                    _a = data;
                    return [4 /*yield*/, listProjects()];
                case 4:
                    _a.projectList = _b.sent();
                    data.currentProject = data.newProject;
                    data.newProject = undefined;
                    return [4 /*yield*/, openProject(data)];
                case 5:
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,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SSxDQUFDLGNBQWMsQ0FBQyxFQUFBOztvQkFBcEQsR0FBSyxRQUFRLEdBQUcsU0FBb0MsQ0FBQztvQkFDckQsSUFBSSxDQUFDLFFBQVEsR0FBRyw4Q0FBOEMsQ0FBQztvQkFDL0QsSUFBSSxDQUFDLFFBQVEsR0FBRyxFQUFFLENBQUM7b0JBQ25CLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDOzs7OztDQUNyQjtBQVBELGdDQU9DO0FBRUQsbUJBQWdDLE9BQWU7Ozs7d0JBQ3ZDLHFCQUFNLFlBQVksQ0FBQyxtQkFBbUIsQ0FBQyxLQUFLLENBQUMsUUFBUSxHQUFDLE9BQU8sQ0FBQyxFQUFBO3dCQUFyRSxzQkFBTyxTQUE4RCxFQUFDOzs7O0NBQ3RFO0FBRkQsOEJBRUMiLCJmaWxlIjoiUHJvamVjdE1hbmFnZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBmaWxlX21hbmFnZXIgZnJvbSAnLi9GaWxlTWFuYWdlcic7XG5pbXBvcnQgKiBhcyBnaXRfbWFuYWdlciBmcm9tICcuL0dpdE1hbmFnZXInO1xuaW1wb3J0ICogYXMgcHJvamVjdF9zZXR0aW5ncyBmcm9tICcuL1Byb2plY3RTZXR0aW5ncyc7XG5pbXBvcnQgKiBhcyB1dGlsIGZyb20gJy4vdXRpbHMnO1xuaW1wb3J0ICogYXMgcGF0aHMgZnJvbSAnLi9wYXRocyc7XG5pbXBvcnQgKiBhcyByZWFkQ2h1bmsgZnJvbSAncmVhZC1jaHVuayc7XG5pbXBvcnQgKiBhcyBmaWxlVHlwZSBmcm9tICdmaWxlLXR5cGUnO1xuXG5sZXQgbWF4X2ZpbGVfc2l6ZSA9IDUwMDAwMDAwO1x0Ly8gYnl0ZXMgKDUwTWIpXG5cbi8vIGFsbCBQcm9qZWN0TWFuYWdlciBtZXRob2RzIGFyZSBhc3luYyBmdW5jdGlvbnMgY2FsbGVkIHdoZW4gd2Vic29ja2V0IG1lc3NhZ2VzXG4vLyB3aXRoIHRoZSBmaWVsZCBldmVudDogJ3Byb2plY3QtZXZlbnQnIGlzIHJlY2VpdmVkLiBUaGUgZnVuY3Rpb24gY2FsbGVkIGlzXG4vLyBjb250YWluZWQgaW4gdGhlICdmdW5jJyBmaWVsZC4gVGhlIHdlYnNvY2tldCBtZXNzYWdlIGlzIHBhc3NlZCBpbnRvIHRoZSBtZXRob2Rcbi8vIGFzIHRoZSBkYXRhIHZhcmlhYmxlLCBhbmQgaXMgbW9kaWZpZWQgYW5kIHJldHVybmVkIGJ5IHRoZSBtZXRob2QsIGFuZCBzZW50XG4vLyBiYWNrIG92ZXIgdGhlIHdlYnNvY2tldFxuXG4vLyBvcGVuRmlsZSB0YWtlcyBhIG1lc3NhZ2Ugd2l0aCBjdXJyZW50UHJvamVjdCBhbmQgbmV3RmlsZSBmaWVsZHNcbi8vIGl0IG9wZW5zIHRoZSBmaWxlIGZyb20gdGhlIHByb2plY3QsIGlmIGl0IGlzIG5vdCB0b28gYmlnIG9yIGJpbmFyeVxuLy8gaWYgdGhlIGZpbGUgaXMgYW4gaW1hZ2Ugb3IgYXVkaW8gZmlsZSwgaXQgaXMgc3ltbGlua2VkIGZyb20gdGhlIG1lZGlhIGZvbGRlclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIG9wZW5GaWxlKGRhdGE6IGFueSl7XG5cdGxldCBmaWxlX3BhdGggPSBwYXRocy5wcm9qZWN0cytkYXRhLmN1cnJlbnRQcm9qZWN0KycvJytkYXRhLm5ld0ZpbGU7XG5cdHRyeXtcblx0XHR2YXIgZmlsZV9zdGF0ID0gYXdhaXQgZmlsZV9tYW5hZ2VyLnN0YXRfZmlsZShmaWxlX3BhdGgpO1xuXHR9XG5cdGNhdGNoKGUpe1xuXHRcdC8vIGlmIHdlIGFyZSB0cnlpbmcgdG8gb3BlbiBhbiBleGFtcGxlIG9yIHRlbXBsYXRlIGFuZCB3ZSBjYW4ndCBmaW5kIHRoZSBmaWxlLCB3ZSBhcmUgKHByb2JhYmx5KVxuXHRcdC8vIHRyeWluZyB0byBvcGVuIGEgcGQgb3Igc3VwZXJjb2xsaWRlciBwcm9qZWN0LCBzbyBvcGVuIF9tYWluKiBpZiBpdCBleGlzdHMgaW5zdGVhZFxuXHRcdGlmICh0eXBlb2YgZGF0YS5leGFtcGxlTmFtZSAhPT0gJ3VuZGVmaW5lZCcgfHwgZGF0YS5mdW5jID09PSAnbmV3UHJvamVjdCcpe1xuXHRcdFx0Zm9yKGxldCBmaWxlIG9mIGRhdGEuZmlsZUxpc3Qpe1xuXHRcdFx0XHRpZiAoZmlsZS5uYW1lLmluY2x1ZGVzKCdfbWFpbicpKXtcblx0XHRcdFx0XHRkYXRhLm5ld0ZpbGUgPSBmaWxlLm5hbWU7XG5cdFx0XHRcdFx0YXdhaXQgb3BlbkZpbGUoZGF0YSk7XG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHRcdGRhdGEuZXJyb3IgPSAnZXJyb3Igb3BlbmluZyBmaWxlICcrZGF0YS5uZXdGaWxlKyc6ICcrZS50b1N0cmluZygpO1xuXHRcdGRhdGEuZmlsZURhdGEgPSAnRXJyb3Igb3BlbmluZyBmaWxlLiBQbGVhc2Ugb3BlbiBhIGRpZmZlcmVudCBmaWxlIHRvIGNvbnRpbnVlJztcblx0XHRkYXRhLmZpbGVOYW1lID0gZGF0YS5uZXdGaWxlO1xuXHRcdGRhdGEubmV3RmlsZSA9IHVuZGVmaW5lZDtcblx0XHRkYXRhLnJlYWRPbmx5ID0gdHJ1ZTtcblx0XHRkYXRhLmZpbGVUeXBlID0gMDtcblx0XHRyZXR1cm47XG5cdH1cblx0aWYgKGZpbGVfc3RhdC5zaXplID4gbWF4X2ZpbGVfc2l6ZSl7XG5cdFx0ZGF0YS5lcnJvciA9ICdmaWxlIGlzIHRvbyBsYXJnZTogJysoZmlsZV9zdGF0LnNpemUvMTAwMDAwMCkrJ01iJztcblx0XHRkYXRhLmZpbGVEYXRhID0gXCJUaGUgSURFIGNhbid0IG9wZW4gZmlsZXMgbGFyZ2VyIHRoYW4gXCIrKG1heF9maWxlX3NpemUvMTAwMDAwMCkrXCJNYlwiO1xuXHRcdGRhdGEucmVhZE9ubHkgPSB0cnVlO1xuXHRcdGRhdGEuZmlsZU5hbWUgPSBkYXRhLm5ld0ZpbGU7XG5cdFx0ZGF0YS5uZXdGaWxlID0gdW5kZWZpbmVkO1xuXHRcdGRhdGEuZmlsZVR5cGUgPSAwO1xuXHRcdHJldHVybjtcblx0fVxuXHRsZXQgY2h1bms6IEJ1ZmZlciA9IGF3YWl0IHJlYWRDaHVuayhmaWxlX3BhdGgsIDAsIDQxMDApO1xuXHRsZXQgZmlsZV90eXBlID0gYXdhaXQgZmlsZVR5cGUoY2h1bmspO1xuXHRpZiAoZmlsZV90eXBlICYmIChmaWxlX3R5cGUubWltZS5pbmNsdWRlcygnaW1hZ2UnKSB8fCBmaWxlX3R5cGUubWltZS5pbmNsdWRlcygnYXVkaW8nKSkpe1xuXHRcdGF3YWl0IGZpbGVfbWFuYWdlci5lbXB0eV9kaXJlY3RvcnkocGF0aHMubWVkaWEpO1xuXHRcdGF3YWl0IGZpbGVfbWFuYWdlci5tYWtlX3N5bWxpbmsoZmlsZV9wYXRoLCBwYXRocy5tZWRpYStkYXRhLm5ld0ZpbGUpO1xuXHRcdGRhdGEuZmlsZURhdGEgPSAnJztcblx0XHRkYXRhLnJlYWRPbmx5ID0gdHJ1ZTtcblx0XHRkYXRhLmZpbGVOYW1lID0gZGF0YS5uZXdGaWxlO1xuXHRcdGRhdGEubmV3RmlsZSA9IHVuZGVmaW5lZDtcblx0XHRkYXRhLmZpbGVUeXBlID0gZmlsZV90eXBlLm1pbWU7XG5cdFx0cmV0dXJuO1xuXHR9XG5cdGxldCBpc19iaW5hcnkgPSBhd2FpdCBmaWxlX21hbmFnZXIuaXNfYmluYXJ5KGZpbGVfcGF0aCk7XG5cdGlmIChpc19iaW5hcnkpe1xuXHRcdGRhdGEuZXJyb3IgPSAnY2FuXFwndCBvcGVuIGJpbmFyeSBmaWxlcyc7XG5cdFx0ZGF0YS5maWxlRGF0YSA9ICdCaW5hcnkgZmlsZXMgY2FuIG5vdCBiZSBlZGl0ZWQgaW4gdGhlIElERSc7XG5cdFx0ZGF0YS5maWxlTmFtZSA9IGRhdGEubmV3RmlsZTtcblx0XHRkYXRhLm5ld0ZpbGUgPSB1bmRlZmluZWQ7XG5cdFx0ZGF0YS5yZWFkT25seSA9IHRydWU7XG5cdFx0ZGF0YS5maWxlVHlwZSA9IDA7XG5cdFx0cmV0dXJuO1xuXHR9XG5cdHRyeXtcblx0XHRkYXRhLmZpbGVEYXRhID0gYXdhaXQgZmlsZV9tYW5hZ2VyLnJlYWRfZmlsZShmaWxlX3BhdGgpO1xuXHR9XG5cdGNhdGNoKGUpe1xuXHRcdGRhdGEuZXJyb3IgPSAnZXJyb3Igb3BlbmluZyBmaWxlICcrZGF0YS5uZXdGaWxlKyc6ICcrZS50b1N0cmluZygpO1xuXHRcdGRhdGEuZmlsZURhdGEgPSAnRXJyb3Igb3BlbmluZyBmaWxlLiBQbGVhc2Ugb3BlbiBhIGRpZmZlcmVudCBmaWxlIHRvIGNvbnRpbnVlJztcblx0XHRkYXRhLmZpbGVOYW1lID0gZGF0YS5uZXdGaWxlO1xuXHRcdGRhdGEubmV3RmlsZSA9IHVuZGVmaW5lZDtcblx0XHRkYXRhLnJlYWRPbmx5ID0gdHJ1ZTtcblx0XHRkYXRhLmZpbGVUeXBlID0gMDtcblx0XHRyZXR1cm47XG5cdH1cblx0aWYgKGRhdGEubmV3RmlsZS5zcGxpdCAmJiBkYXRhLm5ld0ZpbGUuaW5jbHVkZXMoJy4nKSl7XG5cdFx0ZGF0YS5maWxlVHlwZSA9IGRhdGEubmV3RmlsZS5zcGxpdCgnLicpLnBvcCgpO1xuXHR9IGVsc2Uge1xuXHRcdGRhdGEuZmlsZVR5cGUgPSAwO1xuXHR9XG5cdGRhdGEuZmlsZU5hbWUgPSBkYXRhLm5ld0ZpbGU7XG5cdGRhdGEubmV3RmlsZSA9IHVuZGVmaW5lZDtcblx0ZGF0YS5yZWFkT25seSA9IGZhbHNlO1xuXHRyZXR1cm47XG59XG5cbi8vIHRoZXNlIHR3byBtZXRob2RzIGFyZSBleGNlcHRpb25zIGFuZCBkb24ndCB0YWtlIHRoZSBkYXRhIG9iamVjdFxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGxpc3RQcm9qZWN0cygpOiBQcm9taXNlPHN0cmluZ1tdPntcblx0cmV0dXJuIGZpbGVfbWFuYWdlci5yZWFkX2RpcmVjdG9yeShwYXRocy5wcm9qZWN0cyk7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBsaXN0TGlicmFyaWVzKCk6IFByb21pc2U8YW55Pntcblx0bGV0IGxpYnJhcmllcyA9IFtdO1xuXHRsZXQgY2F0ZWdvcmllcyA9IGF3YWl0IGZpbGVfbWFuYWdlci5yZWFkX2RpcmVjdG9yeShwYXRocy5saWJyYXJpZXMpO1xuXHRmb3IgKGxldCBjYXRlZ29yeSBvZiBjYXRlZ29yaWVzKXtcblx0XHRpZiAoYXdhaXQgZmlsZV9tYW5hZ2VyLmRpcmVjdG9yeV9leGlzdHMocGF0aHMubGlicmFyaWVzKycvJytjYXRlZ29yeSkpe1xuXHRcdFx0bGlicmFyaWVzLnB1c2goe1xuXHRcdFx0XHRuYW1lOiBjYXRlZ29yeSxcblx0XHRcdFx0Y2hpbGRyZW46IGF3YWl0IGZpbGVfbWFuYWdlci5yZWFkX2RpcmVjdG9yeShwYXRocy5saWJyYXJpZXMrJy8nK2NhdGVnb3J5KVxuXHRcdFx0fSk7XG5cdFx0fVxuXHR9XG5cdHJldHVybiBsaWJyYXJpZXM7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBsaXN0RXhhbXBsZXMoKTogUHJvbWlzZTxhbnk+e1xuXHRsZXQgZXhhbXBsZXMgPSBbXTtcblx0bGV0IGNhdGVnb3JpZXMgPSBhd2FpdCBmaWxlX21hbmFnZXIucmVhZF9kaXJlY3RvcnkocGF0aHMuZXhhbXBsZXMpO1xuXHRmb3IgKGxldCBjYXRlZ29yeSBvZiBjYXRlZ29yaWVzKXtcblx0XHRpZiAoYXdhaXQgZmlsZV9tYW5hZ2VyLmRpcmVjdG9yeV9leGlzdHMocGF0aHMuZXhhbXBsZXMrJy8nK2NhdGVnb3J5KSl7XG5cdFx0XHRleGFtcGxlcy5wdXNoKHtcblx0XHRcdFx0bmFtZTogY2F0ZWdvcnksXG5cdFx0XHRcdGNoaWxkcmVuOiBhd2FpdCBmaWxlX21hbmFnZXIucmVhZF9kaXJlY3RvcnkocGF0aHMuZXhhbXBsZXMrJy8nK2NhdGVnb3J5KVxuXHRcdFx0fSk7XG5cdFx0fVxuXHR9XG5cdHJldHVybiBleGFtcGxlcztcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIG9wZW5Qcm9qZWN0KGRhdGE6IGFueSkge1xuXHRkYXRhLmZpbGVMaXN0ID0gYXdhaXQgbGlzdEZpbGVzKGRhdGEuY3VycmVudFByb2plY3QpO1xuXHRsZXQgc2V0dGluZ3M6IGFueSA9IGF3YWl0IHByb2plY3Rfc2V0dGluZ3MucmVhZChkYXRhLmN1cnJlbnRQcm9qZWN0KTtcblx0ZGF0YS5uZXdGaWxlID0gc2V0dGluZ3MuZmlsZU5hbWU7XG5cdGRhdGEuQ0xBcmdzID0gc2V0dGluZ3MuQ0xBcmdzO1xuXHRpZiAoZGF0YS5jdXJyZW50UHJvamVjdCAhPT0gJ2V4YW1wbGVUZW1wUHJvamVjdCcpIGRhdGEuZXhhbXBsZU5hbWUgPSAnJztcblx0aWYgKCFkYXRhLmdpdERhdGEpXG5cdFx0ZGF0YS5naXREYXRhID0ge307XG5cdGRhdGEuZ2l0RGF0YS5jdXJyZW50UHJvamVjdCA9IGRhdGEuY3VycmVudFByb2plY3Q7XG5cdGF3YWl0IGdpdF9tYW5hZ2VyLmluZm8oZGF0YS5naXREYXRhKTtcblx0YXdhaXQgb3BlbkZpbGUoZGF0YSk7XG59XG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gb3BlbkV4YW1wbGUoZGF0YTogYW55KXtcblx0YXdhaXQgZmlsZV9tYW5hZ2VyLmVtcHR5X2RpcmVjdG9yeShwYXRocy5leGFtcGxlVGVtcFByb2plY3QpO1xuXHRhd2FpdCBmaWxlX21hbmFnZXIuY29weV9kaXJlY3RvcnkocGF0aHMuZXhhbXBsZXMrZGF0YS5jdXJyZW50UHJvamVjdCwgcGF0aHMuZXhhbXBsZVRlbXBQcm9qZWN0KTtcblx0ZGF0YS5leGFtcGxlTmFtZSA9IGRhdGEuY3VycmVudFByb2plY3Quc3BsaXQoJy8nKS5wb3AoKTtcblx0ZGF0YS5jdXJyZW50UHJvamVjdCA9ICdleGFtcGxlVGVtcFByb2plY3QnO1xuXHRhd2FpdCBvcGVuUHJvamVjdChkYXRhKTtcbn1cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBuZXdQcm9qZWN0KGRhdGE6IGFueSl7XG5cdGlmIChhd2FpdCBmaWxlX21hbmFnZXIuZGlyZWN0b3J5X2V4aXN0cyhwYXRocy5wcm9qZWN0cytkYXRhLm5ld1Byb2plY3QpKXtcblx0XHRkYXRhLmVycm9yID0gJ2ZhaWxlZCwgcHJvamVjdCAnK2RhdGEubmV3UHJvamVjdCsnIGFscmVhZHkgZXhpc3RzISc7XG5cdFx0cmV0dXJuO1xuXHR9XG5cdGF3YWl0IGZpbGVfbWFuYWdlci5jb3B5X2RpcmVjdG9yeShwYXRocy50ZW1wbGF0ZXMrZGF0YS5wcm9qZWN0VHlwZSwgcGF0aHMucHJvamVjdHMrZGF0YS5uZXdQcm9qZWN0KTtcblx0ZGF0YS5wcm9qZWN0TGlzdCA9IGF3YWl0IGxpc3RQcm9qZWN0cygpO1xuXHRkYXRhLmN1cnJlbnRQcm9qZWN0ID0gZGF0YS5uZXdQcm9qZWN0O1xuXHRkYXRhLm5ld1Byb2plY3QgPSB1bmRlZmluZWQ7XG5cdGF3YWl0IG9wZW5Qcm9qZWN0KGRhdGEpO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gc2F2ZUFzKGRhdGE6IGFueSl7XG5cdGlmIChhd2FpdCBmaWxlX21hbmFnZXIuZGlyZWN0b3J5X2V4aXN0cyhwYXRocy5wcm9qZWN0cytkYXRhLm5ld1Byb2plY3QpKXtcblx0XHRkYXRhLmVycm9yID0gJ2ZhaWxlZCwgcHJvamVjdCAnK2RhdGEubmV3UHJvamVjdCsnIGFscmVhZHkgZXhpc3RzISc7XG5cdFx0cmV0dXJuO1xuXHR9XG5cdGF3YWl0IGNsZWFuUHJvamVjdChkYXRhKTtcblx0YXdhaXQgZmlsZV9tYW5hZ2VyLmNvcHlfZGlyZWN0b3J5KHBhdGhzLnByb2plY3RzK2RhdGEuY3VycmVudFByb2plY3QsIHBhdGhzLnByb2plY3RzK2RhdGEubmV3UHJvamVjdCk7XG5cdGRhdGEucHJvamVjdExpc3QgPSBhd2FpdCBsaXN0UHJvamVjdHMoKTtcblx0ZGF0YS5jdXJyZW50UHJvamVjdCA9IGRhdGEubmV3UHJvamVjdDtcblx0ZGF0YS5uZXdQcm9qZWN0ID0gdW5kZWZpbmVkO1xuXHRhd2FpdCBvcGVuUHJvamVjdChkYXRhKTtcbn1cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBkZWxldGVQcm9qZWN0KGRhdGE6IGFueSl7XG5cdGF3YWl0IGZpbGVfbWFuYWdlci5kZWxldGVfZmlsZShwYXRocy5wcm9qZWN0cytkYXRhLmN1cnJlbnRQcm9qZWN0KTtcblx0ZGF0YS5wcm9qZWN0TGlzdCA9IGF3YWl0IGxpc3RQcm9qZWN0cygpO1xuXHRmb3IgKGxldCBwcm9qZWN0IG9mIGRhdGEucHJvamVjdExpc3Qpe1xuXHRcdGlmIChwcm9qZWN0ICYmIHByb2plY3QgIT09ICd1bmRlZmluZWQnICYmIHByb2plY3QgIT09ICdleGFtcGxlVGVtcFByb2plY3QnKXtcblx0XHRcdGRhdGEuY3VycmVudFByb2plY3QgPSBwcm9qZWN0O1xuXHRcdFx0YXdhaXQgb3BlblByb2plY3QoZGF0YSk7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHR9XG5cdGRhdGEuY3VycmVudFByb2plY3QgPSAnJztcblx0ZGF0YS5yZWFkT25seSA9IHRydWU7XG5cdGRhdGEuZmlsZURhdGEgPSAncGxlYXNlIGNyZWF0ZSBhIG5ldyBwcm9qZWN0IHRvIGNvbnRpbnVlJztcbn1cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjbGVhblByb2plY3QoZGF0YTogYW55KXtcblx0YXdhaXQgZmlsZV9tYW5hZ2VyLmVtcHR5X2RpcmVjdG9yeShwYXRocy5wcm9qZWN0cytkYXRhLmN1cnJlbnRQcm9qZWN0KycvYnVpbGQnKTtcblx0YXdhaXQgZmlsZV9tYW5hZ2VyLmRlbGV0ZV9maWxlKHBhdGhzLnByb2plY3RzK2RhdGEuY3VycmVudFByb2plY3QrJy8nK2RhdGEuY3VycmVudFByb2plY3QpO1xufVxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIG5ld0ZpbGUoZGF0YTogYW55KXtcblx0bGV0IGZpbGVfcGF0aCA9IHBhdGhzLnByb2plY3RzK2RhdGEuY3VycmVudFByb2plY3QrJy8nK2RhdGEubmV3RmlsZTtcblx0aWYgKGF3YWl0IGZpbGVfbWFuYWdlci5maWxlX2V4aXN0cyhmaWxlX3BhdGgpKXtcblx0XHRkYXRhLmVycm9yID0gJ2ZhaWxlZCwgZmlsZSAnK2RhdGEubmV3RmlsZSsnIGFscmVhZHkgZXhpc3RzISc7XG5cdFx0cmV0dXJuO1xuXHR9XG5cdGZpbGVfbWFuYWdlci53cml0ZV9maWxlKGZpbGVfcGF0aCwgJy8qKioqKiAnK2RhdGEubmV3RmlsZSsnICoqKioqL1xcbicpO1xuXHRkYXRhLmZpbGVMaXN0ID0gYXdhaXQgbGlzdEZpbGVzKGRhdGEuY3VycmVudFByb2plY3QpO1xuXHRkYXRhLmZvY3VzID0geydsaW5lJzogMiwgJ2NvbHVtbic6IDF9O1xuXHRhd2FpdCBvcGVuRmlsZShkYXRhKTtcbn1cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiB1cGxvYWRGaWxlKGRhdGE6IGFueSl7XG5cdGxldCBmaWxlX3BhdGggPSBwYXRocy5wcm9qZWN0cytkYXRhLmN1cnJlbnRQcm9qZWN0KycvJytkYXRhLm5ld0ZpbGU7XG5cdGxldCBmaWxlX2V4aXN0cyA9IChhd2FpdCBmaWxlX21hbmFnZXIuZmlsZV9leGlzdHMoZmlsZV9wYXRoKSB8fCBhd2FpdCBmaWxlX21hbmFnZXIuZGlyZWN0b3J5X2V4aXN0cyhmaWxlX3BhdGgpKTtcblx0aWYgKGZpbGVfZXhpc3RzICYmICFkYXRhLmZvcmNlKXtcblx0XHRkYXRhLmVycm9yID0gJ2ZhaWxlZCwgZmlsZSAnK2RhdGEubmV3RmlsZSsnIGFscmVhZHkgZXhpc3RzISc7XG5cdFx0ZGF0YS5maWxlRGF0YSA9IHVuZGVmaW5lZDtcblx0XHRyZXR1cm47XG5cdH1cblx0YXdhaXQgZmlsZV9tYW5hZ2VyLnNhdmVfZmlsZShmaWxlX3BhdGgsIGRhdGEuZmlsZURhdGEpO1xuXHRkYXRhLmZpbGVMaXN0ID0gYXdhaXQgbGlzdEZpbGVzKGRhdGEuY3VycmVudFByb2plY3QpO1xuXHRhd2FpdCBvcGVuRmlsZShkYXRhKTtcbn1cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjbGVhbkZpbGUocHJvamVjdDogc3RyaW5nLCBmaWxlOiBzdHJpbmcpe1xuXHRpZiAoZmlsZS5zcGxpdCAmJiBmaWxlLmluY2x1ZGVzKCcuJykpe1xuXHRcdGxldCBzcGxpdF9maWxlID0gZmlsZS5zcGxpdCgnLicpO1xuXHRcdGxldCBleHQgPSBzcGxpdF9maWxlLnBvcCgpO1xuXHRcdGxldCBmaWxlX3Jvb3QgPSBzcGxpdF9maWxlLmpvaW4oJy4nKTtcblx0XHRpZiAoZXh0ID09PSAnY3BwJyB8fCBleHQgPT09ICdjJyB8fCBleHQgPT09ICdTJyl7XG5cdFx0XHRsZXQgZmlsZV9wYXRoID0gcGF0aHMucHJvamVjdHMrcHJvamVjdCsnL2J1aWxkLycrZmlsZV9yb290O1xuXHRcdFx0YXdhaXQgZmlsZV9tYW5hZ2VyLmRlbGV0ZV9maWxlKGZpbGVfcGF0aCsnLmQnKTtcblx0XHRcdGF3YWl0IGZpbGVfbWFuYWdlci5kZWxldGVfZmlsZShmaWxlX3BhdGgrJy5vJyk7XG5cdFx0XHRhd2FpdCBmaWxlX21hbmFnZXIuZGVsZXRlX2ZpbGUocGF0aHMucHJvamVjdHMrcHJvamVjdCsnLycrcHJvamVjdCk7XG5cdFx0fVxuXHR9XG59XG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVuYW1lRmlsZShkYXRhOiBhbnkpe1xuXHRsZXQgZmlsZV9wYXRoID0gcGF0aHMucHJvamVjdHMrZGF0YS5jdXJyZW50UHJvamVjdCsnLycrZGF0YS5uZXdGaWxlO1xuXHRsZXQgZmlsZV9leGlzdHMgPSAoYXdhaXQgZmlsZV9tYW5hZ2VyLmZpbGVfZXhpc3RzKGZpbGVfcGF0aCkgfHwgYXdhaXQgZmlsZV9tYW5hZ2VyLmRpcmVjdG9yeV9leGlzdHMoZmlsZV9wYXRoKSk7XG5cdGlmIChmaWxlX2V4aXN0cyl7XG5cdFx0ZGF0YS5lcnJvciA9ICdmYWlsZWQsIGZpbGUgJytkYXRhLm5ld0ZpbGUrJyBhbHJlYWR5IGV4aXN0cyEnO1xuXHRcdHJldHVybjtcblx0fVxuXHRhd2FpdCBmaWxlX21hbmFnZXIucmVuYW1lX2ZpbGUocGF0aHMucHJvamVjdHMrZGF0YS5jdXJyZW50UHJvamVjdCsnLycrZGF0YS5maWxlTmFtZSwgZmlsZV9wYXRoKTtcblx0YXdhaXQgY2xlYW5GaWxlKGRhdGEuY3VycmVudFByb2plY3QsIGRhdGEuZmlsZU5hbWUpO1xuXHRkYXRhLmZpbGVMaXN0ID0gYXdhaXQgbGlzdEZpbGVzKGRhdGEuY3VycmVudFByb2plY3QpO1xuXHRhd2FpdCBvcGVuRmlsZShkYXRhKTtcbn1cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBkZWxldGVGaWxlKGRhdGE6IGFueSl7XG5cdGF3YWl0IGZpbGVfbWFuYWdlci5kZWxldGVfZmlsZShwYXRocy5wcm9qZWN0cytkYXRhLmN1cnJlbnRQcm9qZWN0KycvJytkYXRhLmZpbGVOYW1lKTtcblx0YXdhaXQgY2xlYW5GaWxlKGRhdGEuY3VycmVudFByb2plY3QsIGRhdGEuZmlsZU5hbWUpO1xuXHRkYXRhLmZpbGVMaXN0ID0gYXdhaXQgbGlzdEZpbGVzKGRhdGEuY3VycmVudFByb2plY3QpO1xuXHRkYXRhLmZpbGVEYXRhID0gJ0ZpbGUgZGVsZXRlZCAtIG9wZW4gYW5vdGhlciBmaWxlIHRvIGNvbnRpbnVlJztcblx0ZGF0YS5maWxlTmFtZSA9ICcnO1xuXHRkYXRhLnJlYWRPbmx5ID0gdHJ1ZTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGxpc3RGaWxlcyhwcm9qZWN0OiBzdHJpbmcpOiBQcm9taXNlPHV0aWwuRmlsZV9EZXNjcmlwdG9yW10+e1xuXHRyZXR1cm4gYXdhaXQgZmlsZV9tYW5hZ2VyLmRlZXBfcmVhZF9kaXJlY3RvcnkocGF0aHMucHJvamVjdHMrcHJvamVjdCk7XG59XG4iXX0=
