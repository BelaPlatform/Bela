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
var FileManager_1 = require("./FileManager");
var SettingsManager_1 = require("./SettingsManager");
var paths_1 = require("./paths");
var readChunk = require("read-chunk");
var fileType = require("file-type");
var max_file_size = 50000000; // bytes (50Mb)
// all ProjectManager methods are async functions called when websocket messages
// with the field event: 'project-event' is received. The function called is 
// contained in the 'func' field. The websocket message is passed into the method
// as the data variable, and is modified and returned by the method, and sent
// back over the websocket
var ProjectManager = /** @class */ (function () {
    function ProjectManager() {
        console.log('OHAI');
    }
    // openFile takes a message with currentProject and newFile fields
    // it opens the file from the project, if it is not too big or binary
    // if the file is an image or audio file, it is symlinked from the media folder
    ProjectManager.prototype.openFile = function (data) {
        return __awaiter(this, void 0, void 0, function () {
            var file_path, file_stat, chunk, file_type, is_binary, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        file_path = paths_1.paths.projects + data.currentProject + '/' + data.newFile;
                        return [4 /*yield*/, FileManager_1.fm.stat_file(file_path)];
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
                        return [4 /*yield*/, FileManager_1.fm.empty_directory(paths_1.paths.media)];
                    case 4:
                        _b.sent();
                        return [4 /*yield*/, FileManager_1.fm.make_symlink(file_path, paths_1.paths.media + data.newFile)];
                    case 5:
                        _b.sent();
                        data.fileData = '';
                        data.readOnly = true;
                        data.fileName = data.newFile;
                        data.newFile = undefined;
                        data.fileType = file_type.mime;
                        return [2 /*return*/];
                    case 6: return [4 /*yield*/, FileManager_1.fm.is_binary(file_path)];
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
                        return [4 /*yield*/, FileManager_1.fm.read_file(file_path)];
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
    };
    // these two methods are exceptions and don't take the data object
    ProjectManager.prototype.listProjects = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, FileManager_1.fm.read_directory(paths_1.paths.projects)];
            });
        });
    };
    ProjectManager.prototype.listExamples = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, FileManager_1.fm.deep_read_directory(paths_1.paths.examples)];
            });
        });
    };
    ProjectManager.prototype.openProject = function (data) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, settings;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _a = data;
                        return [4 /*yield*/, FileManager_1.fm.deep_read_directory(paths_1.paths.projects + data.currentProject)];
                    case 1:
                        _a.fileList = _b.sent();
                        return [4 /*yield*/, SettingsManager_1.p_settings.read(data.currentProject)];
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
    };
    ProjectManager.prototype.openExample = function (data) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, FileManager_1.fm.empty_directory(paths_1.paths.exampleTempProject)];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, FileManager_1.fm.copy_directory(paths_1.paths.examples + data.currentProject, paths_1.paths.exampleTempProject)];
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
    };
    ProjectManager.prototype.newProject = function (data) {
        return __awaiter(this, void 0, void 0, function () {
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, FileManager_1.fm.directory_exists(paths_1.paths.projects + data.newProject)];
                    case 1:
                        if (_b.sent()) {
                            data.error = 'failed, project ' + data.newProject + ' already exists!';
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, FileManager_1.fm.copy_directory(paths_1.paths.templates + data.projectType, paths_1.paths.projects + data.newProject)];
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
    };
    ProjectManager.prototype.saveAs = function (data) {
        return __awaiter(this, void 0, void 0, function () {
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, FileManager_1.fm.directory_exists(paths_1.paths.projects + data.newProject)];
                    case 1:
                        if (_b.sent()) {
                            data.error = 'failed, project ' + data.newProject + ' already exists!';
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, FileManager_1.fm.copy_directory(paths_1.paths.projects + data.currentProject, paths_1.paths.projects + data.newProject)];
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
    };
    ProjectManager.prototype.deleteProject = function (data) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, _i, _b, project;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, FileManager_1.fm.delete_file(paths_1.paths.projects + data.currentProject)];
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
    };
    ProjectManager.prototype.cleanProject = function (data) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, FileManager_1.fm.empty_directory(paths_1.paths.projects + data.currentProject + '/build')];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, FileManager_1.fm.delete_file(paths_1.paths.projects + data.currentProject + '/' + data.currentProject)];
                    case 2:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    ProjectManager.prototype.newFile = function (data) {
        return __awaiter(this, void 0, void 0, function () {
            var file_path, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        file_path = paths_1.paths.projects + data.currentProject + '/' + data.newFile;
                        return [4 /*yield*/, FileManager_1.fm.file_exists(file_path)];
                    case 1:
                        if (_b.sent()) {
                            data.error = 'failed, file ' + data.newFile + ' already exists!';
                            return [2 /*return*/];
                        }
                        FileManager_1.fm.write_file(file_path, '/***** ' + data.newFile + ' *****/\n');
                        _a = data;
                        return [4 /*yield*/, FileManager_1.fm.deep_read_directory(paths_1.paths.projects + data.currentProject)];
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
    };
    ProjectManager.prototype.uploadFile = function (data) {
        return __awaiter(this, void 0, void 0, function () {
            var file_path, file_exists, _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        file_path = paths_1.paths.projects + data.currentProject + '/' + data.newFile;
                        return [4 /*yield*/, FileManager_1.fm.file_exists(file_path)];
                    case 1:
                        _a = (_c.sent());
                        if (_a) return [3 /*break*/, 3];
                        return [4 /*yield*/, FileManager_1.fm.directory_exists(file_path)];
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
                        return [4 /*yield*/, FileManager_1.fm.save_file(file_path, data.fileData)];
                    case 4:
                        _c.sent();
                        _b = data;
                        return [4 /*yield*/, FileManager_1.fm.deep_read_directory(paths_1.paths.projects + data.currentProject)];
                    case 5:
                        _b.fileList = _c.sent();
                        return [4 /*yield*/, this.openFile(data)];
                    case 6:
                        _c.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    ProjectManager.prototype.cleanFile = function (project, file) {
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
                        return [4 /*yield*/, FileManager_1.fm.delete_file(file_path + '.d')];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, FileManager_1.fm.delete_file(file_path + '.o')];
                    case 2:
                        _a.sent();
                        return [4 /*yield*/, FileManager_1.fm.delete_file(paths_1.paths.projects + project + '/' + project)];
                    case 3:
                        _a.sent();
                        _a.label = 4;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    ProjectManager.prototype.renameFile = function (data) {
        return __awaiter(this, void 0, void 0, function () {
            var file_path, file_exists, _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        file_path = paths_1.paths.projects + data.currentProject + '/' + data.newFile;
                        return [4 /*yield*/, FileManager_1.fm.file_exists(file_path)];
                    case 1:
                        _a = (_c.sent());
                        if (_a) return [3 /*break*/, 3];
                        return [4 /*yield*/, FileManager_1.fm.directory_exists(file_path)];
                    case 2:
                        _a = (_c.sent());
                        _c.label = 3;
                    case 3:
                        file_exists = (_a);
                        if (file_exists) {
                            data.error = 'failed, file ' + data.newFile + ' already exists!';
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, FileManager_1.fm.rename_file(paths_1.paths.projects + data.currentProject + '/' + data.fileName, file_path)];
                    case 4:
                        _c.sent();
                        return [4 /*yield*/, this.cleanFile(data.currentProject, data.fileName)];
                    case 5:
                        _c.sent();
                        _b = data;
                        return [4 /*yield*/, FileManager_1.fm.deep_read_directory(paths_1.paths.projects + data.currentProject)];
                    case 6:
                        _b.fileList = _c.sent();
                        return [4 /*yield*/, this.openFile(data)];
                    case 7:
                        _c.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    ProjectManager.prototype.deleteFile = function (data) {
        return __awaiter(this, void 0, void 0, function () {
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, FileManager_1.fm.delete_file(paths_1.paths.projects + data.currentProject + '/' + data.fileName)];
                    case 1:
                        _b.sent();
                        return [4 /*yield*/, this.cleanFile(data.currentProject, data.fileName)];
                    case 2:
                        _b.sent();
                        _a = data;
                        return [4 /*yield*/, FileManager_1.fm.deep_read_directory(paths_1.paths.projects + data.currentProject)];
                    case 3:
                        _a.fileList = _b.sent();
                        data.fileData = 'File deleted - open another file to continue';
                        data.fileName = '';
                        data.readOnly = true;
                        return [2 /*return*/];
                }
            });
        });
    };
    return ProjectManager;
}());
exports.ProjectManager = ProjectManager;

//# sourceMappingURL=data:application/json;charset=utf8;base64,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QWdFLENBQUM7d0JBQ2pGLElBQUksQ0FBQyxRQUFRLEdBQUcsOENBQThDLENBQUM7d0JBQy9ELElBQUksQ0FBQyxRQUFRLEdBQUcsRUFBRSxDQUFDO3dCQUNuQixJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQzs7Ozs7S0FDckI7SUFJRixxQkFBQztBQUFELENBekxBLEFBeUxDLElBQUE7QUF6TFksd0NBQWMiLCJmaWxlIjoiUHJvamVjdE1hbmFnZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBmbSwgRmlsZV9EZXNjcmlwdG9yIH0gZnJvbSBcIi4vRmlsZU1hbmFnZXJcIjtcbmltcG9ydCB7IHBfc2V0dGluZ3MgfSBmcm9tICcuL1NldHRpbmdzTWFuYWdlcic7XG5pbXBvcnQge3BhdGhzfSBmcm9tICcuL3BhdGhzJztcbmltcG9ydCAqIGFzIHJlYWRDaHVuayBmcm9tICdyZWFkLWNodW5rJztcbmltcG9ydCAqIGFzIGZpbGVUeXBlIGZyb20gJ2ZpbGUtdHlwZSc7XG5cbmxldCBtYXhfZmlsZV9zaXplID0gNTAwMDAwMDA7XHQvLyBieXRlcyAoNTBNYilcblxuLy8gYWxsIFByb2plY3RNYW5hZ2VyIG1ldGhvZHMgYXJlIGFzeW5jIGZ1bmN0aW9ucyBjYWxsZWQgd2hlbiB3ZWJzb2NrZXQgbWVzc2FnZXNcbi8vIHdpdGggdGhlIGZpZWxkIGV2ZW50OiAncHJvamVjdC1ldmVudCcgaXMgcmVjZWl2ZWQuIFRoZSBmdW5jdGlvbiBjYWxsZWQgaXMgXG4vLyBjb250YWluZWQgaW4gdGhlICdmdW5jJyBmaWVsZC4gVGhlIHdlYnNvY2tldCBtZXNzYWdlIGlzIHBhc3NlZCBpbnRvIHRoZSBtZXRob2Rcbi8vIGFzIHRoZSBkYXRhIHZhcmlhYmxlLCBhbmQgaXMgbW9kaWZpZWQgYW5kIHJldHVybmVkIGJ5IHRoZSBtZXRob2QsIGFuZCBzZW50XG4vLyBiYWNrIG92ZXIgdGhlIHdlYnNvY2tldFxuZXhwb3J0IGNsYXNzIFByb2plY3RNYW5hZ2VyIHtcblx0Y29uc3RydWN0b3IoKXtjb25zb2xlLmxvZygnT0hBSScpO31cblxuXHQvLyBvcGVuRmlsZSB0YWtlcyBhIG1lc3NhZ2Ugd2l0aCBjdXJyZW50UHJvamVjdCBhbmQgbmV3RmlsZSBmaWVsZHNcblx0Ly8gaXQgb3BlbnMgdGhlIGZpbGUgZnJvbSB0aGUgcHJvamVjdCwgaWYgaXQgaXMgbm90IHRvbyBiaWcgb3IgYmluYXJ5XG5cdC8vIGlmIHRoZSBmaWxlIGlzIGFuIGltYWdlIG9yIGF1ZGlvIGZpbGUsIGl0IGlzIHN5bWxpbmtlZCBmcm9tIHRoZSBtZWRpYSBmb2xkZXJcblx0YXN5bmMgb3BlbkZpbGUoZGF0YTogYW55KXtcblx0XHRsZXQgZmlsZV9wYXRoID0gcGF0aHMucHJvamVjdHMrZGF0YS5jdXJyZW50UHJvamVjdCsnLycrZGF0YS5uZXdGaWxlO1xuXHRcdGxldCBmaWxlX3N0YXQgPSBhd2FpdCBmbS5zdGF0X2ZpbGUoZmlsZV9wYXRoKTtcblx0XHRpZiAoZmlsZV9zdGF0LnNpemUgPiBtYXhfZmlsZV9zaXplKXtcblx0XHRcdGRhdGEuZXJyb3IgPSAnZmlsZSBpcyB0b28gbGFyZ2U6ICcrKGZpbGVfc3RhdC5zaXplLzEwMDAwMDApKydNYic7XG5cdFx0XHRkYXRhLmZpbGVEYXRhID0gXCJUaGUgSURFIGNhbid0IG9wZW4gbm9uLXNvdXJjZSBmaWxlcyBsYXJnZXIgdGhhbiBcIisobWF4X2ZpbGVfc2l6ZS8xMDAwMDAwKStcIk1iXCI7XG5cdFx0XHRkYXRhLnJlYWRPbmx5ID0gdHJ1ZTtcblx0XHRcdGRhdGEuZmlsZU5hbWUgPSBkYXRhLm5ld0ZpbGU7XG5cdFx0XHRkYXRhLm5ld0ZpbGUgPSB1bmRlZmluZWQ7XG5cdFx0XHRkYXRhLmZpbGVUeXBlID0gMDtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0bGV0IGNodW5rOiBCdWZmZXIgPSBhd2FpdCByZWFkQ2h1bmsoZmlsZV9wYXRoLCAwLCA0MTAwKTtcblx0XHRsZXQgZmlsZV90eXBlID0gYXdhaXQgZmlsZVR5cGUoY2h1bmspO1xuXHRcdGlmIChmaWxlX3R5cGUgJiYgKGZpbGVfdHlwZS5taW1lLmluY2x1ZGVzKCdpbWFnZScpIHx8IGZpbGVfdHlwZS5taW1lLmluY2x1ZGVzKCdhdWRpbycpKSl7XG5cdFx0XHRhd2FpdCBmbS5lbXB0eV9kaXJlY3RvcnkocGF0aHMubWVkaWEpO1xuXHRcdFx0YXdhaXQgZm0ubWFrZV9zeW1saW5rKGZpbGVfcGF0aCwgcGF0aHMubWVkaWErZGF0YS5uZXdGaWxlKTtcblx0XHRcdGRhdGEuZmlsZURhdGEgPSAnJztcblx0XHRcdGRhdGEucmVhZE9ubHkgPSB0cnVlO1xuXHRcdFx0ZGF0YS5maWxlTmFtZSA9IGRhdGEubmV3RmlsZTtcblx0XHRcdGRhdGEubmV3RmlsZSA9IHVuZGVmaW5lZDtcblx0XHRcdGRhdGEuZmlsZVR5cGUgPSBmaWxlX3R5cGUubWltZTtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0bGV0IGlzX2JpbmFyeSA9IGF3YWl0IGZtLmlzX2JpbmFyeShmaWxlX3BhdGgpO1xuXHRcdGlmIChpc19iaW5hcnkpe1xuXHRcdFx0ZGF0YS5lcnJvciA9ICdjYW5cXCd0IG9wZW4gYmluYXJ5IGZpbGVzJztcblx0XHRcdGRhdGEuZmlsZURhdGEgPSAnQmluYXJ5IGZpbGVzIGNhbiBub3QgYmUgZWRpdGVkIGluIHRoZSBJREUnO1xuXHRcdFx0ZGF0YS5maWxlTmFtZSA9IGRhdGEubmV3RmlsZTtcblx0XHRcdGRhdGEubmV3RmlsZSA9IHVuZGVmaW5lZDtcblx0XHRcdGRhdGEucmVhZE9ubHkgPSB0cnVlO1xuXHRcdFx0ZGF0YS5maWxlVHlwZSA9IDA7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdGRhdGEuZmlsZURhdGEgPSBhd2FpdCBmbS5yZWFkX2ZpbGUoZmlsZV9wYXRoKTtcblx0XHRpZiAoZGF0YS5uZXdGaWxlLnNwbGl0ICYmIGRhdGEubmV3RmlsZS5pbmNsdWRlcygnLicpKXtcblx0XHRcdGRhdGEuZmlsZVR5cGUgPSBkYXRhLm5ld0ZpbGUuc3BsaXQoJy4nKS5wb3AoKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0ZGF0YS5maWxlVHlwZSA9IDA7XG5cdFx0fVxuXHRcdGRhdGEuZmlsZU5hbWUgPSBkYXRhLm5ld0ZpbGU7XG5cdFx0ZGF0YS5uZXdGaWxlID0gdW5kZWZpbmVkO1xuXHRcdGRhdGEucmVhZE9ubHkgPSBmYWxzZTtcblx0XHRyZXR1cm47XG5cdH1cblxuXHQvLyB0aGVzZSB0d28gbWV0aG9kcyBhcmUgZXhjZXB0aW9ucyBhbmQgZG9uJ3QgdGFrZSB0aGUgZGF0YSBvYmplY3Rcblx0YXN5bmMgbGlzdFByb2plY3RzKCk6IFByb21pc2U8c3RyaW5nW10+e1xuXHRcdHJldHVybiBmbS5yZWFkX2RpcmVjdG9yeShwYXRocy5wcm9qZWN0cyk7XG5cdH1cblx0YXN5bmMgbGlzdEV4YW1wbGVzKCk6IFByb21pc2U8RmlsZV9EZXNjcmlwdG9yW10+e1xuXHRcdHJldHVybiBmbS5kZWVwX3JlYWRfZGlyZWN0b3J5KHBhdGhzLmV4YW1wbGVzKTtcblx0fVxuXG5cdGFzeW5jIG9wZW5Qcm9qZWN0KGRhdGE6IGFueSkge1xuXHRcdGRhdGEuZmlsZUxpc3QgPSBhd2FpdCBmbS5kZWVwX3JlYWRfZGlyZWN0b3J5KHBhdGhzLnByb2plY3RzK2RhdGEuY3VycmVudFByb2plY3QpO1xuXHRcdGxldCBzZXR0aW5nczogYW55ID0gYXdhaXQgcF9zZXR0aW5ncy5yZWFkKGRhdGEuY3VycmVudFByb2plY3QpO1xuXHRcdGRhdGEubmV3RmlsZSA9IHNldHRpbmdzLmZpbGVOYW1lO1xuXHRcdGRhdGEuQ0xBcmdzID0gc2V0dGluZ3MuQ0xBcmdzO1xuXHRcdC8vIFRPRE86IGRhdGEuZXhhbXBsZU5hbWVcblx0XHQvLyBUT0RPOiBkYXRhLmdpdERhdGFcblx0XHRhd2FpdCB0aGlzLm9wZW5GaWxlKGRhdGEpO1xuXHR9XG5cblx0YXN5bmMgb3BlbkV4YW1wbGUoZGF0YTogYW55KXtcblx0XHRhd2FpdCBmbS5lbXB0eV9kaXJlY3RvcnkocGF0aHMuZXhhbXBsZVRlbXBQcm9qZWN0KTtcblx0XHRhd2FpdCBmbS5jb3B5X2RpcmVjdG9yeShwYXRocy5leGFtcGxlcytkYXRhLmN1cnJlbnRQcm9qZWN0LCBwYXRocy5leGFtcGxlVGVtcFByb2plY3QpO1xuXHRcdGRhdGEuZXhhbXBsZU5hbWUgPSBkYXRhLmN1cnJlbnRQcm9qZWN0LnNwbGl0KCcvJykucG9wKCk7XG5cdFx0ZGF0YS5jdXJyZW50UHJvamVjdCA9ICdleGFtcGxlVGVtcFByb2plY3QnO1xuXHRcdGF3YWl0IHRoaXMub3BlblByb2plY3QoZGF0YSk7XG5cdH1cblxuXHRhc3luYyBuZXdQcm9qZWN0KGRhdGE6IGFueSl7XG5cdFx0aWYgKGF3YWl0IGZtLmRpcmVjdG9yeV9leGlzdHMocGF0aHMucHJvamVjdHMrZGF0YS5uZXdQcm9qZWN0KSl7XG5cdFx0XHRkYXRhLmVycm9yID0gJ2ZhaWxlZCwgcHJvamVjdCAnK2RhdGEubmV3UHJvamVjdCsnIGFscmVhZHkgZXhpc3RzISc7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdGF3YWl0IGZtLmNvcHlfZGlyZWN0b3J5KHBhdGhzLnRlbXBsYXRlcytkYXRhLnByb2plY3RUeXBlLCBwYXRocy5wcm9qZWN0cytkYXRhLm5ld1Byb2plY3QpO1xuXHRcdGRhdGEucHJvamVjdExpc3QgPSBhd2FpdCB0aGlzLmxpc3RQcm9qZWN0cygpO1xuXHRcdGRhdGEuY3VycmVudFByb2plY3QgPSBkYXRhLm5ld1Byb2plY3Q7XG5cdFx0ZGF0YS5uZXdQcm9qZWN0ID0gdW5kZWZpbmVkO1xuXHRcdGF3YWl0IHRoaXMub3BlblByb2plY3QoZGF0YSk7XG5cdH1cblxuXHRhc3luYyBzYXZlQXMoZGF0YTogYW55KXtcblx0XHRpZiAoYXdhaXQgZm0uZGlyZWN0b3J5X2V4aXN0cyhwYXRocy5wcm9qZWN0cytkYXRhLm5ld1Byb2plY3QpKXtcblx0XHRcdGRhdGEuZXJyb3IgPSAnZmFpbGVkLCBwcm9qZWN0ICcrZGF0YS5uZXdQcm9qZWN0KycgYWxyZWFkeSBleGlzdHMhJztcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0YXdhaXQgZm0uY29weV9kaXJlY3RvcnkocGF0aHMucHJvamVjdHMrZGF0YS5jdXJyZW50UHJvamVjdCwgcGF0aHMucHJvamVjdHMrZGF0YS5uZXdQcm9qZWN0KTtcblx0XHRkYXRhLnByb2plY3RMaXN0ID0gYXdhaXQgdGhpcy5saXN0UHJvamVjdHMoKTtcblx0XHRkYXRhLmN1cnJlbnRQcm9qZWN0ID0gZGF0YS5uZXdQcm9qZWN0O1xuXHRcdGRhdGEubmV3UHJvamVjdCA9IHVuZGVmaW5lZDtcblx0XHRhd2FpdCB0aGlzLm9wZW5Qcm9qZWN0KGRhdGEpO1xuXHR9XG5cblx0YXN5bmMgZGVsZXRlUHJvamVjdChkYXRhOiBhbnkpe1xuXHRcdGF3YWl0IGZtLmRlbGV0ZV9maWxlKHBhdGhzLnByb2plY3RzK2RhdGEuY3VycmVudFByb2plY3QpO1xuXHRcdGRhdGEucHJvamVjdExpc3QgPSBhd2FpdCB0aGlzLmxpc3RQcm9qZWN0cygpO1xuXHRcdGZvciAobGV0IHByb2plY3Qgb2YgZGF0YS5wcm9qZWN0TGlzdCl7XG5cdFx0XHRpZiAocHJvamVjdCAmJiBwcm9qZWN0ICE9PSAndW5kZWZpbmVkJyAmJiBwcm9qZWN0ICE9PSAnZXhhbXBsZVRlbXBQcm9qZWN0Jyl7XG5cdFx0XHRcdGRhdGEuY3VycmVudFByb2plY3QgPSBwcm9qZWN0O1xuXHRcdFx0XHRhd2FpdCB0aGlzLm9wZW5Qcm9qZWN0KGRhdGEpO1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cdFx0fVxuXHRcdGRhdGEuY3VycmVudFByb2plY3QgPSAnJztcblx0XHRkYXRhLnJlYWRPbmx5ID0gdHJ1ZTtcblx0XHRkYXRhLmZpbGVEYXRhID0gJ3BsZWFzZSBjcmVhdGUgYSBuZXcgcHJvamVjdCB0byBjb250aW51ZSc7XG5cdH1cblxuXHRhc3luYyBjbGVhblByb2plY3QoZGF0YTogYW55KXtcblx0XHRhd2FpdCBmbS5lbXB0eV9kaXJlY3RvcnkocGF0aHMucHJvamVjdHMrZGF0YS5jdXJyZW50UHJvamVjdCsnL2J1aWxkJyk7XG5cdFx0YXdhaXQgZm0uZGVsZXRlX2ZpbGUocGF0aHMucHJvamVjdHMrZGF0YS5jdXJyZW50UHJvamVjdCsnLycrZGF0YS5jdXJyZW50UHJvamVjdCk7XG5cdH1cblxuXHRhc3luYyBuZXdGaWxlKGRhdGE6IGFueSl7XG5cdFx0bGV0IGZpbGVfcGF0aCA9IHBhdGhzLnByb2plY3RzK2RhdGEuY3VycmVudFByb2plY3QrJy8nK2RhdGEubmV3RmlsZTtcblx0XHRpZiAoYXdhaXQgZm0uZmlsZV9leGlzdHMoZmlsZV9wYXRoKSl7XG5cdFx0XHRkYXRhLmVycm9yID0gJ2ZhaWxlZCwgZmlsZSAnK2RhdGEubmV3RmlsZSsnIGFscmVhZHkgZXhpc3RzISc7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdGZtLndyaXRlX2ZpbGUoZmlsZV9wYXRoLCAnLyoqKioqICcrZGF0YS5uZXdGaWxlKycgKioqKiovXFxuJyk7XG5cdFx0ZGF0YS5maWxlTGlzdCA9IGF3YWl0IGZtLmRlZXBfcmVhZF9kaXJlY3RvcnkocGF0aHMucHJvamVjdHMrZGF0YS5jdXJyZW50UHJvamVjdCk7XG5cdFx0ZGF0YS5mb2N1cyA9IHsnbGluZSc6IDIsICdjb2x1bW4nOiAxfTtcblx0XHRhd2FpdCB0aGlzLm9wZW5GaWxlKGRhdGEpO1xuXHR9XG5cblx0YXN5bmMgdXBsb2FkRmlsZShkYXRhOiBhbnkpe1xuXHRcdGxldCBmaWxlX3BhdGggPSBwYXRocy5wcm9qZWN0cytkYXRhLmN1cnJlbnRQcm9qZWN0KycvJytkYXRhLm5ld0ZpbGU7XG5cdFx0bGV0IGZpbGVfZXhpc3RzID0gKGF3YWl0IGZtLmZpbGVfZXhpc3RzKGZpbGVfcGF0aCkgfHwgYXdhaXQgZm0uZGlyZWN0b3J5X2V4aXN0cyhmaWxlX3BhdGgpKTtcblx0XHRpZiAoZmlsZV9leGlzdHMgJiYgIWRhdGEuZm9yY2Upe1xuXHRcdFx0ZGF0YS5lcnJvciA9ICdmYWlsZWQsIGZpbGUgJytkYXRhLm5ld0ZpbGUrJyBhbHJlYWR5IGV4aXN0cyEnO1xuXHRcdFx0ZGF0YS5maWxlRGF0YSA9IHVuZGVmaW5lZDtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0YXdhaXQgZm0uc2F2ZV9maWxlKGZpbGVfcGF0aCwgZGF0YS5maWxlRGF0YSk7XG5cdFx0ZGF0YS5maWxlTGlzdCA9IGF3YWl0IGZtLmRlZXBfcmVhZF9kaXJlY3RvcnkocGF0aHMucHJvamVjdHMrZGF0YS5jdXJyZW50UHJvamVjdCk7XG5cdFx0YXdhaXQgdGhpcy5vcGVuRmlsZShkYXRhKTtcblx0fVxuXG5cdGFzeW5jIGNsZWFuRmlsZShwcm9qZWN0OiBzdHJpbmcsIGZpbGU6IHN0cmluZyl7XG5cdFx0aWYgKGZpbGUuc3BsaXQgJiYgZmlsZS5pbmNsdWRlcygnLicpKXtcblx0XHRcdGxldCBzcGxpdF9maWxlID0gZmlsZS5zcGxpdCgnLicpO1xuXHRcdFx0bGV0IGV4dCA9IHNwbGl0X2ZpbGUucG9wKCk7XG5cdFx0XHRsZXQgZmlsZV9yb290ID0gc3BsaXRfZmlsZS5qb2luKCcuJyk7XG5cdFx0XHRpZiAoZXh0ID09PSAnY3BwJyB8fCBleHQgPT09ICdjJyB8fCBleHQgPT09ICdTJyl7XG5cdFx0XHRcdGxldCBmaWxlX3BhdGggPSBwYXRocy5wcm9qZWN0cytwcm9qZWN0KycvYnVpbGQvJytmaWxlX3Jvb3Q7XG5cdFx0XHRcdGF3YWl0IGZtLmRlbGV0ZV9maWxlKGZpbGVfcGF0aCsnLmQnKTtcblx0XHRcdFx0YXdhaXQgZm0uZGVsZXRlX2ZpbGUoZmlsZV9wYXRoKycubycpO1xuXHRcdFx0XHRhd2FpdCBmbS5kZWxldGVfZmlsZShwYXRocy5wcm9qZWN0cytwcm9qZWN0KycvJytwcm9qZWN0KTtcblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHRhc3luYyByZW5hbWVGaWxlKGRhdGE6IGFueSl7XG5cdFx0bGV0IGZpbGVfcGF0aCA9IHBhdGhzLnByb2plY3RzK2RhdGEuY3VycmVudFByb2plY3QrJy8nK2RhdGEubmV3RmlsZTtcblx0XHRsZXQgZmlsZV9leGlzdHMgPSAoYXdhaXQgZm0uZmlsZV9leGlzdHMoZmlsZV9wYXRoKSB8fCBhd2FpdCBmbS5kaXJlY3RvcnlfZXhpc3RzKGZpbGVfcGF0aCkpO1xuXHRcdGlmIChmaWxlX2V4aXN0cyl7XG5cdFx0XHRkYXRhLmVycm9yID0gJ2ZhaWxlZCwgZmlsZSAnK2RhdGEubmV3RmlsZSsnIGFscmVhZHkgZXhpc3RzISc7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdGF3YWl0IGZtLnJlbmFtZV9maWxlKHBhdGhzLnByb2plY3RzK2RhdGEuY3VycmVudFByb2plY3QrJy8nK2RhdGEuZmlsZU5hbWUsIGZpbGVfcGF0aCk7XG5cdFx0YXdhaXQgdGhpcy5jbGVhbkZpbGUoZGF0YS5jdXJyZW50UHJvamVjdCwgZGF0YS5maWxlTmFtZSk7XG5cdFx0ZGF0YS5maWxlTGlzdCA9IGF3YWl0IGZtLmRlZXBfcmVhZF9kaXJlY3RvcnkocGF0aHMucHJvamVjdHMrZGF0YS5jdXJyZW50UHJvamVjdCk7XG5cdFx0YXdhaXQgdGhpcy5vcGVuRmlsZShkYXRhKTtcblx0fVxuXG5cdGFzeW5jIGRlbGV0ZUZpbGUoZGF0YTogYW55KXtcblx0XHRhd2FpdCBmbS5kZWxldGVfZmlsZShwYXRocy5wcm9qZWN0cytkYXRhLmN1cnJlbnRQcm9qZWN0KycvJytkYXRhLmZpbGVOYW1lKTtcblx0XHRhd2FpdCB0aGlzLmNsZWFuRmlsZShkYXRhLmN1cnJlbnRQcm9qZWN0LCBkYXRhLmZpbGVOYW1lKTtcblx0XHRkYXRhLmZpbGVMaXN0ID0gYXdhaXQgZm0uZGVlcF9yZWFkX2RpcmVjdG9yeShwYXRocy5wcm9qZWN0cytkYXRhLmN1cnJlbnRQcm9qZWN0KTtcblx0XHRkYXRhLmZpbGVEYXRhID0gJ0ZpbGUgZGVsZXRlZCAtIG9wZW4gYW5vdGhlciBmaWxlIHRvIGNvbnRpbnVlJztcblx0XHRkYXRhLmZpbGVOYW1lID0gJyc7XG5cdFx0ZGF0YS5yZWFkT25seSA9IHRydWU7XG5cdH1cblxuXG5cbn1cbiJdfQ==
