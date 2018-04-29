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
    return ProjectManager;
}());
exports.ProjectManager = ProjectManager;
