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
var child_process = require("child_process");
var paths = require("./paths");
var Lock_1 = require("./Lock");
var lock = new Lock_1.Lock();
// simple check to see if a git repo exists in a project
function repo_exists(project) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, file_manager.directory_exists(paths.projects + project + '/.git')];
        });
    });
}
exports.repo_exists = repo_exists;
// execute a git command
// data.command is the command, currentProject is the project
// stdout and stderr are saved onto the data object, or extended if they already exist
function execute(data) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, new Promise(function (resolve, reject) {
                    child_process.exec('git ' + data.command, { cwd: paths.projects + data.currentProject + '/' }, function (err, stdout, stderr) {
                        if (err)
                            reject(err);
                        if (data.stdout) {
                            data.stdout += stdout ? ('\n' + stdout) : '';
                        }
                        else {
                            data.stdout = stdout;
                        }
                        if (data.stderr) {
                            data.stderr += stderr ? ('\n' + stderr) : '';
                        }
                        else {
                            data.stderr = stderr;
                        }
                        resolve();
                    });
                })];
        });
    });
}
exports.execute = execute;
exports.command = execute;
function info(data) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, commits, currentCommit, branches;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _a = data;
                    return [4 /*yield*/, repo_exists(data.currentProject)];
                case 1:
                    _a.repoExists = _b.sent();
                    if (!data.repoExists)
                        return [2 /*return*/];
                    commits = {
                        currentProject: data.currentProject,
                        command: "log --all --pretty=oneline --format='%s, %ar %H' --graph"
                    };
                    currentCommit = {
                        currentProject: data.currentProject,
                        command: "log -1 --format='%H'"
                    };
                    branches = {
                        currentProject: data.currentProject,
                        command: "branch"
                    };
                    return [4 /*yield*/, execute(commits)];
                case 2:
                    _b.sent();
                    return [4 /*yield*/, execute(currentCommit)];
                case 3:
                    _b.sent();
                    return [4 /*yield*/, execute(branches)];
                case 4:
                    _b.sent();
                    data.commits = commits.stdout;
                    data.currentCommit = currentCommit.stdout;
                    data.branches = branches.stdout;
                    return [2 /*return*/];
            }
        });
    });
}
exports.info = info;
function init(data) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, repo_exists(data.currentProject)];
                case 1:
                    if (_a.sent())
                        throw new Error('repo already exists');
                    return [4 /*yield*/, file_manager.write_file(paths.projects + data.currentProject + '/.gitignore', '.DS_Store\nsettings.json\nbuild/*\n' + data.currentProject)];
                case 2:
                    _a.sent();
                    data.command = 'init';
                    return [4 /*yield*/, execute(data)];
                case 3:
                    _a.sent();
                    data.command = 'add -A';
                    return [4 /*yield*/, execute(data)];
                case 4:
                    _a.sent();
                    data.command = 'commit -am "first commit"';
                    return [4 /*yield*/, execute(data)];
                case 5:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.init = init;
