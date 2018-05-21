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

//# sourceMappingURL=data:application/json;charset=utf8;base64,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QUMxQyxJQUFJLENBQUMsUUFBUSxHQUFHLFFBQVEsQ0FBQyxNQUFNLENBQUM7Ozs7O0NBQ2hDO0FBdEJELG9CQXNCQztBQUVELGNBQTJCLElBQVM7Ozs7d0JBQy9CLHFCQUFNLFdBQVcsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLEVBQUE7O29CQUExQyxJQUFJLFNBQXNDO3dCQUN6QyxNQUFNLElBQUksS0FBSyxDQUFDLHFCQUFxQixDQUFDLENBQUM7b0JBQ3hDLHFCQUFNLFlBQVksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLFFBQVEsR0FBQyxJQUFJLENBQUMsY0FBYyxHQUFDLGFBQWEsRUFBRSxxQ0FBcUMsR0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLEVBQUE7O29CQUExSSxTQUEwSSxDQUFDO29CQUMzSSxJQUFJLENBQUMsT0FBTyxHQUFHLE1BQU0sQ0FBQztvQkFDdEIscUJBQU0sT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFBOztvQkFBbkIsU0FBbUIsQ0FBQztvQkFDcEIsSUFBSSxDQUFDLE9BQU8sR0FBRyxRQUFRLENBQUM7b0JBQ3hCLHFCQUFNLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBQTs7b0JBQW5CLFNBQW1CLENBQUM7b0JBQ3BCLElBQUksQ0FBQyxPQUFPLEdBQUcsMkJBQTJCLENBQUM7b0JBQzNDLHFCQUFNLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBQTs7b0JBQW5CLFNBQW1CLENBQUM7Ozs7O0NBRXBCO0FBWEQsb0JBV0MiLCJmaWxlIjoiR2l0TWFuYWdlci5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGZpbGVfbWFuYWdlciBmcm9tICcuL0ZpbGVNYW5hZ2VyJztcbmltcG9ydCAqIGFzIGNoaWxkX3Byb2Nlc3MgZnJvbSAnY2hpbGRfcHJvY2Vzcyc7XG5pbXBvcnQgKiBhcyBwYXRocyBmcm9tICcuL3BhdGhzJztcbmltcG9ydCB7TG9ja30gZnJvbSAnLi9Mb2NrJztcblxuY29uc3QgbG9jazogTG9jayA9IG5ldyBMb2NrKCk7XG5cbi8vIHNpbXBsZSBjaGVjayB0byBzZWUgaWYgYSBnaXQgcmVwbyBleGlzdHMgaW4gYSBwcm9qZWN0XG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVwb19leGlzdHMocHJvamVjdDogc3RyaW5nKTogUHJvbWlzZTxib29sZWFuPntcblx0cmV0dXJuIGZpbGVfbWFuYWdlci5kaXJlY3RvcnlfZXhpc3RzKHBhdGhzLnByb2plY3RzK3Byb2plY3QrJy8uZ2l0Jyk7XG59XG5cbi8vIGV4ZWN1dGUgYSBnaXQgY29tbWFuZFxuLy8gZGF0YS5jb21tYW5kIGlzIHRoZSBjb21tYW5kLCBjdXJyZW50UHJvamVjdCBpcyB0aGUgcHJvamVjdFxuLy8gc3Rkb3V0IGFuZCBzdGRlcnIgYXJlIHNhdmVkIG9udG8gdGhlIGRhdGEgb2JqZWN0LCBvciBleHRlbmRlZCBpZiB0aGV5IGFscmVhZHkgZXhpc3RcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBleGVjdXRlKGRhdGE6IGFueSk6IFByb21pc2U8YW55PiB7XG5cdHJldHVybiBuZXcgUHJvbWlzZSggKHJlc29sdmUsIHJlamVjdCkgPT4ge1x0XHRcdFxuXHRcdGNoaWxkX3Byb2Nlc3MuZXhlYygnZ2l0ICcrZGF0YS5jb21tYW5kLCB7Y3dkOiBwYXRocy5wcm9qZWN0cytkYXRhLmN1cnJlbnRQcm9qZWN0KycvJ30sIChlcnIsIHN0ZG91dCwgc3RkZXJyKSA9PiB7XG5cdFx0XHRpZiAoZXJyKSByZWplY3QoZXJyKTtcblx0XHRcdGlmIChkYXRhLnN0ZG91dCl7XG5cdFx0XHRcdGRhdGEuc3Rkb3V0ICs9IHN0ZG91dCA/ICgnXFxuJyArIHN0ZG91dCkgOiAnJztcblx0XHRcdH0gZWxzZSB7IFxuXHRcdFx0XHRkYXRhLnN0ZG91dCA9IHN0ZG91dDtcblx0XHRcdH1cblx0XHRcdGlmIChkYXRhLnN0ZGVycil7IFxuXHRcdFx0XHRkYXRhLnN0ZGVyciArPSBzdGRlcnIgPyAoJ1xcbicgKyBzdGRlcnIpIDogJyc7XG5cdFx0XHR9IGVsc2UgeyBcblx0XHRcdFx0ZGF0YS5zdGRlcnIgPSBzdGRlcnI7XG5cdFx0XHR9XG5cdFx0XHRyZXNvbHZlKCk7XG5cdFx0fSk7XG5cdH0pO1xufVxuZXhwb3J0IHZhciBjb21tYW5kID0gZXhlY3V0ZTtcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGluZm8oZGF0YTogYW55KXtcblx0ZGF0YS5yZXBvRXhpc3RzID0gYXdhaXQgcmVwb19leGlzdHMoZGF0YS5jdXJyZW50UHJvamVjdCk7XG5cdGlmICghZGF0YS5yZXBvRXhpc3RzKVxuXHRcdHJldHVybjtcblx0bGV0IGNvbW1pdHM6IGFueSA9IHtcblx0XHRjdXJyZW50UHJvamVjdDogZGF0YS5jdXJyZW50UHJvamVjdCxcblx0XHRjb21tYW5kOiBcImxvZyAtLWFsbCAtLXByZXR0eT1vbmVsaW5lIC0tZm9ybWF0PSclcywgJWFyICVIJyAtLWdyYXBoXCJcblx0fTtcblx0bGV0IGN1cnJlbnRDb21taXQ6IGFueSA9IHtcblx0XHRjdXJyZW50UHJvamVjdDogZGF0YS5jdXJyZW50UHJvamVjdCxcblx0XHRjb21tYW5kOiBcImxvZyAtMSAtLWZvcm1hdD0nJUgnXCJcblx0fTtcblx0bGV0IGJyYW5jaGVzOiBhbnkgPSB7XG5cdFx0Y3VycmVudFByb2plY3Q6IGRhdGEuY3VycmVudFByb2plY3QsXG5cdFx0Y29tbWFuZDogXCJicmFuY2hcIlxuXHR9O1xuXHRhd2FpdCBleGVjdXRlKGNvbW1pdHMpO1xuXHRhd2FpdCBleGVjdXRlKGN1cnJlbnRDb21taXQpO1xuXHRhd2FpdCBleGVjdXRlKGJyYW5jaGVzKTtcblx0ZGF0YS5jb21taXRzID0gY29tbWl0cy5zdGRvdXQ7XG5cdGRhdGEuY3VycmVudENvbW1pdCA9IGN1cnJlbnRDb21taXQuc3Rkb3V0O1xuXHRkYXRhLmJyYW5jaGVzID0gYnJhbmNoZXMuc3Rkb3V0O1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gaW5pdChkYXRhOiBhbnkpe1xuXHRpZiAoYXdhaXQgcmVwb19leGlzdHMoZGF0YS5jdXJyZW50UHJvamVjdCkpXG5cdFx0dGhyb3cgbmV3IEVycm9yKCdyZXBvIGFscmVhZHkgZXhpc3RzJyk7XG5cdGF3YWl0IGZpbGVfbWFuYWdlci53cml0ZV9maWxlKHBhdGhzLnByb2plY3RzK2RhdGEuY3VycmVudFByb2plY3QrJy8uZ2l0aWdub3JlJywgJy5EU19TdG9yZVxcbnNldHRpbmdzLmpzb25cXG5idWlsZC8qXFxuJytkYXRhLmN1cnJlbnRQcm9qZWN0KTtcblx0ZGF0YS5jb21tYW5kID0gJ2luaXQnO1xuXHRhd2FpdCBleGVjdXRlKGRhdGEpO1xuXHRkYXRhLmNvbW1hbmQgPSAnYWRkIC1BJztcblx0YXdhaXQgZXhlY3V0ZShkYXRhKTtcblx0ZGF0YS5jb21tYW5kID0gJ2NvbW1pdCAtYW0gXCJmaXJzdCBjb21taXRcIic7XG5cdGF3YWl0IGV4ZWN1dGUoZGF0YSk7XG5cbn1cbiJdfQ==
