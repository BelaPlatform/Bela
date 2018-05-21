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

//# sourceMappingURL=data:application/json;charset=utf8;base64,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QUFDLE1BQU0sQ0FBQzs7Ozs7Q0FDaEM7QUF0QkQsb0JBc0JDO0FBRUQsY0FBMkIsSUFBUzs7Ozt3QkFDL0IscUJBQU0sV0FBVyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsRUFBQTs7b0JBQTFDLElBQUksU0FBc0M7d0JBQ3pDLE1BQU0sSUFBSSxLQUFLLENBQUMscUJBQXFCLENBQUMsQ0FBQztvQkFDeEMscUJBQU0sWUFBWSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsUUFBUSxHQUFDLElBQUksQ0FBQyxjQUFjLEdBQUMsYUFBYSxFQUFFLHFDQUFxQyxHQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsRUFBQTs7b0JBQTFJLFNBQTBJLENBQUM7b0JBQzNJLElBQUksQ0FBQyxPQUFPLEdBQUcsTUFBTSxDQUFDO29CQUN0QixxQkFBTSxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUE7O29CQUFuQixTQUFtQixDQUFDO29CQUNwQixJQUFJLENBQUMsT0FBTyxHQUFHLFFBQVEsQ0FBQztvQkFDeEIscUJBQU0sT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFBOztvQkFBbkIsU0FBbUIsQ0FBQztvQkFDcEIsSUFBSSxDQUFDLE9BQU8sR0FBRywyQkFBMkIsQ0FBQztvQkFDM0MscUJBQU0sT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFBOztvQkFBbkIsU0FBbUIsQ0FBQzs7Ozs7Q0FFcEI7QUFYRCxvQkFXQyIsImZpbGUiOiJHaXRNYW5hZ2VyLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgZmlsZV9tYW5hZ2VyIGZyb20gJy4vRmlsZU1hbmFnZXInO1xuaW1wb3J0ICogYXMgY2hpbGRfcHJvY2VzcyBmcm9tICdjaGlsZF9wcm9jZXNzJztcbmltcG9ydCAqIGFzIHBhdGhzIGZyb20gJy4vcGF0aHMnO1xuaW1wb3J0IHtMb2NrfSBmcm9tICcuL0xvY2snO1xuXG5jb25zdCBsb2NrOiBMb2NrID0gbmV3IExvY2soKTtcblxuLy8gc2ltcGxlIGNoZWNrIHRvIHNlZSBpZiBhIGdpdCByZXBvIGV4aXN0cyBpbiBhIHByb2plY3RcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZXBvX2V4aXN0cyhwcm9qZWN0OiBzdHJpbmcpOiBQcm9taXNlPGJvb2xlYW4+e1xuXHRyZXR1cm4gZmlsZV9tYW5hZ2VyLmRpcmVjdG9yeV9leGlzdHMocGF0aHMucHJvamVjdHMrcHJvamVjdCsnLy5naXQnKTtcbn1cblxuLy8gZXhlY3V0ZSBhIGdpdCBjb21tYW5kXG4vLyBkYXRhLmNvbW1hbmQgaXMgdGhlIGNvbW1hbmQsIGN1cnJlbnRQcm9qZWN0IGlzIHRoZSBwcm9qZWN0XG4vLyBzdGRvdXQgYW5kIHN0ZGVyciBhcmUgc2F2ZWQgb250byB0aGUgZGF0YSBvYmplY3QsIG9yIGV4dGVuZGVkIGlmIHRoZXkgYWxyZWFkeSBleGlzdFxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGV4ZWN1dGUoZGF0YTogYW55KTogUHJvbWlzZTxhbnk+IHtcblx0cmV0dXJuIG5ldyBQcm9taXNlKCAocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XHRcdFx0XG5cdFx0Y2hpbGRfcHJvY2Vzcy5leGVjKCdnaXQgJytkYXRhLmNvbW1hbmQsIHtjd2Q6IHBhdGhzLnByb2plY3RzK2RhdGEuY3VycmVudFByb2plY3QrJy8nfSwgKGVyciwgc3Rkb3V0LCBzdGRlcnIpID0+IHtcblx0XHRcdGlmIChlcnIpIHJlamVjdChlcnIpO1xuXHRcdFx0aWYgKGRhdGEuc3Rkb3V0KXtcblx0XHRcdFx0ZGF0YS5zdGRvdXQgKz0gc3Rkb3V0ID8gKCdcXG4nICsgc3Rkb3V0KSA6ICcnO1xuXHRcdFx0fSBlbHNlIHsgXG5cdFx0XHRcdGRhdGEuc3Rkb3V0ID0gc3Rkb3V0O1xuXHRcdFx0fVxuXHRcdFx0aWYgKGRhdGEuc3RkZXJyKXsgXG5cdFx0XHRcdGRhdGEuc3RkZXJyICs9IHN0ZGVyciA/ICgnXFxuJyArIHN0ZGVycikgOiAnJztcblx0XHRcdH0gZWxzZSB7IFxuXHRcdFx0XHRkYXRhLnN0ZGVyciA9IHN0ZGVycjtcblx0XHRcdH1cblx0XHRcdHJlc29sdmUoKTtcblx0XHR9KTtcblx0fSk7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBpbmZvKGRhdGE6IGFueSl7XG5cdGRhdGEucmVwb0V4aXN0cyA9IGF3YWl0IHJlcG9fZXhpc3RzKGRhdGEuY3VycmVudFByb2plY3QpO1xuXHRpZiAoIWRhdGEucmVwb0V4aXN0cylcblx0XHRyZXR1cm47XG5cdGxldCBjb21taXRzOiBhbnkgPSB7XG5cdFx0Y3VycmVudFByb2plY3Q6IGRhdGEuY3VycmVudFByb2plY3QsXG5cdFx0Y29tbWFuZDogXCJsb2cgLS1hbGwgLS1wcmV0dHk9b25lbGluZSAtLWZvcm1hdD0nJXMsICVhciAlSCcgLS1ncmFwaFwiXG5cdH07XG5cdGxldCBjdXJyZW50Q29tbWl0OiBhbnkgPSB7XG5cdFx0Y3VycmVudFByb2plY3Q6IGRhdGEuY3VycmVudFByb2plY3QsXG5cdFx0Y29tbWFuZDogXCJsb2cgLTEgLS1mb3JtYXQ9JyVIJ1wiXG5cdH07XG5cdGxldCBicmFuY2hlczogYW55ID0ge1xuXHRcdGN1cnJlbnRQcm9qZWN0OiBkYXRhLmN1cnJlbnRQcm9qZWN0LFxuXHRcdGNvbW1hbmQ6IFwiYnJhbmNoXCJcblx0fTtcblx0YXdhaXQgZXhlY3V0ZShjb21taXRzKTtcblx0YXdhaXQgZXhlY3V0ZShjdXJyZW50Q29tbWl0KTtcblx0YXdhaXQgZXhlY3V0ZShicmFuY2hlcyk7XG5cdGRhdGEuY29tbWl0cyA9IGNvbW1pdHMuc3Rkb3V0O1xuXHRkYXRhLmN1cnJlbnRDb21taXQgPSBjdXJyZW50Q29tbWl0LnN0ZG91dDtcblx0ZGF0YS5icmFuY2hlcyA9IGJyYW5jaGVzLnN0ZG91dDtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGluaXQoZGF0YTogYW55KXtcblx0aWYgKGF3YWl0IHJlcG9fZXhpc3RzKGRhdGEuY3VycmVudFByb2plY3QpKVxuXHRcdHRocm93IG5ldyBFcnJvcigncmVwbyBhbHJlYWR5IGV4aXN0cycpO1xuXHRhd2FpdCBmaWxlX21hbmFnZXIud3JpdGVfZmlsZShwYXRocy5wcm9qZWN0cytkYXRhLmN1cnJlbnRQcm9qZWN0KycvLmdpdGlnbm9yZScsICcuRFNfU3RvcmVcXG5zZXR0aW5ncy5qc29uXFxuYnVpbGQvKlxcbicrZGF0YS5jdXJyZW50UHJvamVjdCk7XG5cdGRhdGEuY29tbWFuZCA9ICdpbml0Jztcblx0YXdhaXQgZXhlY3V0ZShkYXRhKTtcblx0ZGF0YS5jb21tYW5kID0gJ2FkZCAtQSc7XG5cdGF3YWl0IGV4ZWN1dGUoZGF0YSk7XG5cdGRhdGEuY29tbWFuZCA9ICdjb21taXQgLWFtIFwiZmlyc3QgY29tbWl0XCInO1xuXHRhd2FpdCBleGVjdXRlKGRhdGEpO1xuXG59XG4iXX0=
