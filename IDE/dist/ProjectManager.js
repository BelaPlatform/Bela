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
var max_file_size = 52428800; // bytes (50Mb)
var max_preview_size = 524288000; // bytes (500Mb)
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
                    if (typeof data.newFile == 'undefined') {
                        data.newFile = data.fileName;
                    }
                    if (null === data.newFile) {
                        return [2 /*return*/];
                    }
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
                    data.error = 'Error opening file ' + data.newFile + ': file does not exist.';
                    data.fileData = null;
                    data.fileName = data.newFile;
                    data.newFile = undefined;
                    data.readOnly = true;
                    data.fileType = 0;
                    return [2 /*return*/];
                case 8:
                    if (file_stat.size > max_preview_size) {
                        data.error = 'file is too large: ' + (file_stat.size / 1048576) + 'Mb';
                        data.fileData = "The IDE can't open files larger than " + (max_preview_size / 1048576) + "Mb";
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
        var examples, categories, _i, categories_2, category, parsedChildren, children, _a, children_1, child;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    examples = [];
                    return [4 /*yield*/, file_manager.read_directory(paths.examples)];
                case 1:
                    categories = _b.sent();
                    _i = 0, categories_2 = categories;
                    _b.label = 2;
                case 2:
                    if (!(_i < categories_2.length)) return [3 /*break*/, 6];
                    category = categories_2[_i];
                    parsedChildren = [];
                    return [4 /*yield*/, file_manager.directory_exists(paths.examples + '/' + category)];
                case 3:
                    if (!_b.sent()) return [3 /*break*/, 5];
                    return [4 /*yield*/, file_manager.read_directory(paths.examples + '/' + category)];
                case 4:
                    children = _b.sent();
                    for (_a = 0, children_1 = children; _a < children_1.length; _a++) {
                        child = children_1[_a];
                        if (child.split('.').length < 2 || child.split('.').pop() === 'json') {
                            parsedChildren.push(child);
                        }
                        else {
                            console.log(child);
                            console.log('^^ this is NOT a json file or folder ^^');
                        }
                    }
                    examples.push({
                        name: category,
                        children: parsedChildren
                    });
                    parsedChildren = [];
                    _b.label = 5;
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
        var projectRetryString, exists, _a, settings;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    projectRetryString = "Select a project from the projects menu, or create a new one.";
                    if (!data.currentProject.trim()) {
                        data.error = "No project is selected. " + projectRetryString;
                        return [2 /*return*/];
                    }
                    return [4 /*yield*/, projectExists(data.currentProject)];
                case 1:
                    exists = _b.sent();
                    if (!exists) {
                        data.error = "Project `" + data.currentProject + "' does not exist. " + projectRetryString;
                        return [2 /*return*/];
                    }
                    _a = data;
                    return [4 /*yield*/, listFiles(data.currentProject)];
                case 2:
                    _a.fileList = _b.sent();
                    return [4 /*yield*/, project_settings.read(data.currentProject)];
                case 3:
                    settings = _b.sent();
                    data.newFile = settings.fileName;
                    data.CLArgs = settings.CLArgs;
                    if (data.currentProject !== 'exampleTempProject')
                        data.exampleName = '';
                    if (!data.gitData)
                        data.gitData = {};
                    data.gitData.currentProject = data.currentProject;
                    return [4 /*yield*/, git_manager.info(data.gitData)];
                case 4:
                    _b.sent();
                    return [4 /*yield*/, openFile(data)];
                case 5:
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
                case 0:
                    if (typeof (data.newProject) === "string") {
                        data.newProject = data.newProject.trim();
                    }
                    if (!data.newProject) {
                        data.error = 'failed, project name is empty.';
                        return [2 /*return*/];
                    }
                    return [4 /*yield*/, file_manager.directory_exists(paths.projects + data.newProject)];
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
        var file_name, file_path, folder, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    file_name = data.newFile.split('/').pop();
                    if (data.folder) {
                        folder = data.folder;
                        file_path = paths.projects + data.currentProject + '/' + folder + '/' + file_name;
                        data.newFile = folder + '/' + file_name;
                    }
                    else {
                        file_path = paths.projects + data.currentProject + '/' + file_name;
                        data.newFile = file_name;
                    }
                    return [4 /*yield*/, file_manager.file_exists(file_path)];
                case 1:
                    if (_b.sent()) {
                        data.error = 'failed, file ' + file_path + ' already exists!';
                        return [2 /*return*/];
                    }
                    file_manager.write_file(file_path, '/***** ' + file_name + ' *****/\n');
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
function newFolder(data) {
    return __awaiter(this, void 0, void 0, function () {
        var file_path, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    console.log(data);
                    file_path = paths.projects + data.currentProject + '/' + data.newFolder;
                    return [4 /*yield*/, file_manager.directory_exists(file_path)];
                case 1:
                    if (_b.sent()) {
                        data.error = 'failed, folder ' + data.newFolder + ' already exists!';
                        return [2 /*return*/];
                    }
                    return [4 /*yield*/, file_manager.write_folder(file_path)];
                case 2:
                    _b.sent();
                    _a = data;
                    return [4 /*yield*/, listFiles(data.currentProject)];
                case 3:
                    _a.fileList = _b.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.newFolder = newFolder;
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
function moveUploadedFile(data) {
    return __awaiter(this, void 0, void 0, function () {
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, file_manager.rename_file(paths.uploads + data.newFile, paths.projects + data.currentProject + '/' + data.sanitisedNewFile)];
                case 1:
                    _b.sent();
                    return [4 /*yield*/, cleanFile(data.currentProject, data.sanitisedNewFile)];
                case 2:
                    _b.sent();
                    data.newFile = data.sanitisedNewFile;
                    _a = data;
                    return [4 /*yield*/, listFiles(data.currentProject)];
                case 3:
                    _a.fileList = _b.sent();
                    return [4 /*yield*/, openFile(data)];
                case 4:
                    _b.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.moveUploadedFile = moveUploadedFile;
function renameFile(data) {
    return __awaiter(this, void 0, void 0, function () {
        var old_file_name, file_name, file_path, folder, new_file_path, file_exists, _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    old_file_name = data.oldName;
                    file_name = data.oldName.split('/').pop();
                    if (data.folder) {
                        folder = data.folder + '/';
                        file_path = paths.projects + data.currentProject + '/' + folder + file_name;
                    }
                    else {
                        file_path = paths.projects + data.currentProject + '/' + file_name;
                    }
                    new_file_path = file_path.replace(file_name, data.newFile);
                    return [4 /*yield*/, file_manager.file_exists(new_file_path)];
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
                    return [4 /*yield*/, file_manager.rename_file(file_path, new_file_path)];
                case 4:
                    _c.sent();
                    return [4 /*yield*/, cleanFile(data.currentProject, data.oldName)];
                case 5:
                    _c.sent();
                    if (!(data.fileName == data.oldName)) return [3 /*break*/, 7];
                    data.fileName = data.newFile;
                    return [4 /*yield*/, openFile(data)];
                case 6:
                    _c.sent();
                    _c.label = 7;
                case 7:
                    _b = data;
                    return [4 /*yield*/, listFiles(data.currentProject)];
                case 8:
                    _b.fileList = _c.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.renameFile = renameFile;
function renameFolder(data) {
    return __awaiter(this, void 0, void 0, function () {
        var folder_path, new_folder_path, folder_exists, _a, regex;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    folder_path = paths.projects + data.currentProject + "/" + data.oldName;
                    new_folder_path = paths.projects + data.currentProject + "/" + data.newFolder;
                    return [4 /*yield*/, file_manager.directory_exists(new_folder_path)];
                case 1:
                    folder_exists = _b.sent();
                    if (folder_exists) {
                        data.error = 'failed, file ' + data.newFolder + ' already exists!';
                        return [2 /*return*/];
                    }
                    return [4 /*yield*/, file_manager.rename_file(folder_path, new_folder_path)];
                case 2:
                    _b.sent();
                    return [4 /*yield*/, cleanFile(data.currentProject, data.oldName)];
                case 3:
                    _b.sent();
                    _a = data;
                    return [4 /*yield*/, listFiles(data.currentProject)];
                case 4:
                    _a.fileList = _b.sent();
                    regex = RegExp(data.oldName);
                    if (!regex.test(data.fileName)) return [3 /*break*/, 6];
                    data.fileName = data.fileName.replace(data.oldName, data.newFolder);
                    return [4 /*yield*/, openFile(data)];
                case 5:
                    _b.sent();
                    _b.label = 6;
                case 6: return [2 /*return*/];
            }
        });
    });
}
exports.renameFolder = renameFolder;
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
                    if (data.fileName == data.currentFile) {
                        //TODO: ideally we would send a message to the frontend, but currently we
                        //can only send "errors", and we don't want to
                        data.fileData = null;
                        data.fileName = null;
                        data.readOnly = true;
                    }
                    else {
                        data.fileName = data.currentFile;
                    }
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
function projectExists(project) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, file_manager.directory_exists(paths.projects + project)];
                case 1: return [2 /*return*/, _a.sent()];
            }
        });
    });
}
exports.projectExists = projectExists;
