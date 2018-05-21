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

//# sourceMappingURL=data:application/json;charset=utf8;base64,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QUFDLE1BQU0sQ0FBQzs7Ozs7Q0FDaEM7QUF0QkQsb0JBc0JDIiwiZmlsZSI6IkdpdE1hbmFnZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBmaWxlX21hbmFnZXIgZnJvbSAnLi9GaWxlTWFuYWdlcic7XG5pbXBvcnQgKiBhcyBjaGlsZF9wcm9jZXNzIGZyb20gJ2NoaWxkX3Byb2Nlc3MnO1xuaW1wb3J0ICogYXMgcGF0aHMgZnJvbSAnLi9wYXRocyc7XG5pbXBvcnQge0xvY2t9IGZyb20gJy4vTG9jayc7XG5cbmNvbnN0IGxvY2s6IExvY2sgPSBuZXcgTG9jaygpO1xuXG4vLyBzaW1wbGUgY2hlY2sgdG8gc2VlIGlmIGEgZ2l0IHJlcG8gZXhpc3RzIGluIGEgcHJvamVjdFxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJlcG9fZXhpc3RzKHByb2plY3Q6IHN0cmluZyk6IFByb21pc2U8Ym9vbGVhbj57XG5cdHJldHVybiBmaWxlX21hbmFnZXIuZGlyZWN0b3J5X2V4aXN0cyhwYXRocy5wcm9qZWN0cytwcm9qZWN0KycvLmdpdCcpO1xufVxuXG4vLyBleGVjdXRlIGEgZ2l0IGNvbW1hbmRcbi8vIGRhdGEuY29tbWFuZCBpcyB0aGUgY29tbWFuZCwgY3VycmVudFByb2plY3QgaXMgdGhlIHByb2plY3Rcbi8vIHN0ZG91dCBhbmQgc3RkZXJyIGFyZSBzYXZlZCBvbnRvIHRoZSBkYXRhIG9iamVjdCwgb3IgZXh0ZW5kZWQgaWYgdGhleSBhbHJlYWR5IGV4aXN0XG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZXhlY3V0ZShkYXRhOiBhbnkpOiBQcm9taXNlPGFueT4ge1xuXHRyZXR1cm4gbmV3IFByb21pc2UoIChyZXNvbHZlLCByZWplY3QpID0+IHtcdFx0XHRcblx0XHRjaGlsZF9wcm9jZXNzLmV4ZWMoJ2dpdCAnK2RhdGEuY29tbWFuZCwge2N3ZDogcGF0aHMucHJvamVjdHMrZGF0YS5jdXJyZW50UHJvamVjdCsnLyd9LCAoZXJyLCBzdGRvdXQsIHN0ZGVycikgPT4ge1xuXHRcdFx0aWYgKGVycikgcmVqZWN0KGVycik7XG5cdFx0XHRpZiAoZGF0YS5zdGRvdXQpe1xuXHRcdFx0XHRkYXRhLnN0ZG91dCArPSBzdGRvdXQgPyAoJ1xcbicgKyBzdGRvdXQpIDogJyc7XG5cdFx0XHR9IGVsc2UgeyBcblx0XHRcdFx0ZGF0YS5zdGRvdXQgPSBzdGRvdXQ7XG5cdFx0XHR9XG5cdFx0XHRpZiAoZGF0YS5zdGRlcnIpeyBcblx0XHRcdFx0ZGF0YS5zdGRlcnIgKz0gc3RkZXJyID8gKCdcXG4nICsgc3RkZXJyKSA6ICcnO1xuXHRcdFx0fSBlbHNlIHsgXG5cdFx0XHRcdGRhdGEuc3RkZXJyID0gc3RkZXJyO1xuXHRcdFx0fVxuXHRcdFx0cmVzb2x2ZSgpO1xuXHRcdH0pO1xuXHR9KTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGluZm8oZGF0YTogYW55KXtcblx0ZGF0YS5yZXBvRXhpc3RzID0gYXdhaXQgcmVwb19leGlzdHMoZGF0YS5jdXJyZW50UHJvamVjdCk7XG5cdGlmICghZGF0YS5yZXBvRXhpc3RzKVxuXHRcdHJldHVybjtcblx0bGV0IGNvbW1pdHM6IGFueSA9IHtcblx0XHRjdXJyZW50UHJvamVjdDogZGF0YS5jdXJyZW50UHJvamVjdCxcblx0XHRjb21tYW5kOiBcImxvZyAtLWFsbCAtLXByZXR0eT1vbmVsaW5lIC0tZm9ybWF0PSclcywgJWFyICVIJyAtLWdyYXBoXCJcblx0fTtcblx0bGV0IGN1cnJlbnRDb21taXQ6IGFueSA9IHtcblx0XHRjdXJyZW50UHJvamVjdDogZGF0YS5jdXJyZW50UHJvamVjdCxcblx0XHRjb21tYW5kOiBcImxvZyAtMSAtLWZvcm1hdD0nJUgnXCJcblx0fTtcblx0bGV0IGJyYW5jaGVzOiBhbnkgPSB7XG5cdFx0Y3VycmVudFByb2plY3Q6IGRhdGEuY3VycmVudFByb2plY3QsXG5cdFx0Y29tbWFuZDogXCJicmFuY2hcIlxuXHR9O1xuXHRhd2FpdCBleGVjdXRlKGNvbW1pdHMpO1xuXHRhd2FpdCBleGVjdXRlKGN1cnJlbnRDb21taXQpO1xuXHRhd2FpdCBleGVjdXRlKGJyYW5jaGVzKTtcblx0ZGF0YS5jb21taXRzID0gY29tbWl0cy5zdGRvdXQ7XG5cdGRhdGEuY3VycmVudENvbW1pdCA9IGN1cnJlbnRDb21taXQuc3Rkb3V0O1xuXHRkYXRhLmJyYW5jaGVzID0gYnJhbmNoZXMuc3Rkb3V0O1xufVxuIl19
