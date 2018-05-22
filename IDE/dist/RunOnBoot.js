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
var project_settings = require("./ProjectSettings");
var child_process = require("child_process");
var paths = require("./paths");
function get_boot_project() {
    return __awaiter(this, void 0, void 0, function () {
        var startup_env, lines, _i, lines_1, line, split_line;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, file_manager.read_file(paths.startup_env)
                        .catch(function (e) { return console.log('error: no startup_env found'); })];
                case 1:
                    startup_env = _a.sent();
                    if ((typeof startup_env) === 'undefined')
                        return [2 /*return*/, 'none'];
                    lines = startup_env.split('\n');
                    for (_i = 0, lines_1 = lines; _i < lines_1.length; _i++) {
                        line = lines_1[_i];
                        split_line = line.split('=');
                        if (split_line[0] === 'ACTIVE' && split_line[1] === '0') {
                            return [2 /*return*/, 'none'];
                        }
                        else if (split_line[0] === 'PROJECT') {
                            listen_on_boot();
                            return [2 /*return*/, split_line[1]];
                        }
                    }
                    return [2 /*return*/];
            }
        });
    });
}
exports.get_boot_project = get_boot_project;
function set_boot_project(socket, project) {
    return __awaiter(this, void 0, void 0, function () {
        var args;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!(project === 'none')) return [3 /*break*/, 1];
                    run_on_boot(socket, [
                        '--no-print-directory',
                        '-C',
                        paths.Bela,
                        'nostartup'
                    ]);
                    return [3 /*break*/, 3];
                case 1: return [4 /*yield*/, project_settings.getArgs(project)];
                case 2:
                    args = _a.sent();
                    run_on_boot(socket, [
                        '--no-print-directory',
                        '-C',
                        paths.Bela,
                        'startuploop',
                        'PROJECT=' + project,
                        'CL="' + args.CL + '"',
                        args.make
                    ]);
                    _a.label = 3;
                case 3: return [2 /*return*/];
            }
        });
    });
}
exports.set_boot_project = set_boot_project;
function run_on_boot(socket, args) {
    console.log('make ' + args.join(' '));
    child_process.exec('make ' + args.join(' '), function (err, stdout, stderr) {
        if (err)
            console.log('error setting boot project', err);
        if (stdout)
            socket.emit('run-on-boot-log', stdout);
        if (stderr)
            socket.emit('run-on-boot-log', stderr);
        socket.emit('run-on-boot-log', 'done');
    });
}
function listen_on_boot() {
}

//# sourceMappingURL=data:application/json;charset=utf8;base64,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b3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBmaWxlX21hbmFnZXIgZnJvbSAnLi9GaWxlTWFuYWdlcic7XG5pbXBvcnQgKiBhcyBwcm9qZWN0X3NldHRpbmdzIGZyb20gJy4vUHJvamVjdFNldHRpbmdzJztcbmltcG9ydCAqIGFzIGNoaWxkX3Byb2Nlc3MgZnJvbSAnY2hpbGRfcHJvY2Vzcyc7XG5pbXBvcnQgKiBhcyBwYXRocyBmcm9tICcuL3BhdGhzJztcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldF9ib290X3Byb2plY3QoKTogUHJvbWlzZTxzdHJpbmc+IHtcblx0bGV0IHN0YXJ0dXBfZW52OiBzdHJpbmd8dW5kZWZpbmVkID0gYXdhaXQgZmlsZV9tYW5hZ2VyLnJlYWRfZmlsZShwYXRocy5zdGFydHVwX2Vudilcblx0XHQuY2F0Y2goZSA9PiBjb25zb2xlLmxvZygnZXJyb3I6IG5vIHN0YXJ0dXBfZW52IGZvdW5kJykgKTtcblx0aWYgKCh0eXBlb2Ygc3RhcnR1cF9lbnYpID09PSAndW5kZWZpbmVkJykgcmV0dXJuICdub25lJztcblx0bGV0IGxpbmVzID0gc3RhcnR1cF9lbnYuc3BsaXQoJ1xcbicpO1xuXHRmb3IgKGxldCBsaW5lIG9mIGxpbmVzKXtcblx0XHRsZXQgc3BsaXRfbGluZTogc3RyaW5nW10gPSBsaW5lLnNwbGl0KCc9Jyk7XG5cdFx0aWYgKHNwbGl0X2xpbmVbMF0gPT09ICdBQ1RJVkUnICYmIHNwbGl0X2xpbmVbMV0gPT09ICcwJyl7XG5cdFx0XHRyZXR1cm4gJ25vbmUnO1xuXHRcdH0gZWxzZSBpZiAoc3BsaXRfbGluZVswXSA9PT0gJ1BST0pFQ1QnKXtcblx0XHRcdGxpc3Rlbl9vbl9ib290KCk7XG5cdFx0XHRyZXR1cm4gc3BsaXRfbGluZVsxXTtcblx0XHR9XG5cdH1cbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHNldF9ib290X3Byb2plY3Qoc29ja2V0OiBTb2NrZXRJTy5Tb2NrZXQsIHByb2plY3Q6ICBzdHJpbmcpe1xuXHRpZiAocHJvamVjdCA9PT0gJ25vbmUnKXtcblx0XHRydW5fb25fYm9vdChzb2NrZXQsIFtcblx0XHRcdCctLW5vLXByaW50LWRpcmVjdG9yeScsXG5cdFx0XHQnLUMnLFxuXHRcdFx0cGF0aHMuQmVsYSxcblx0XHRcdCdub3N0YXJ0dXAnXG5cdFx0XSk7XG5cdH0gZWxzZSB7XG5cdFx0bGV0IGFyZ3M6IHtDTDogc3RyaW5nLCBtYWtlOiBzdHJpbmd9ID0gYXdhaXQgcHJvamVjdF9zZXR0aW5ncy5nZXRBcmdzKHByb2plY3QpO1xuXHRcdHJ1bl9vbl9ib290KHNvY2tldCwgW1xuXHRcdFx0Jy0tbm8tcHJpbnQtZGlyZWN0b3J5Jyxcblx0XHRcdCctQycsXG5cdFx0XHRwYXRocy5CZWxhLFxuXHRcdFx0J3N0YXJ0dXBsb29wJyxcblx0XHRcdCdQUk9KRUNUPScrcHJvamVjdCxcblx0XHRcdCdDTD1cIicrYXJncy5DTCsnXCInLFxuXHRcdFx0YXJncy5tYWtlXG5cdFx0XSk7XG5cdH1cbn1cblxuZnVuY3Rpb24gcnVuX29uX2Jvb3Qoc29ja2V0OiBTb2NrZXRJTy5Tb2NrZXQsIGFyZ3M6IHN0cmluZ1tdKXtcblx0Y29uc29sZS5sb2coJ21ha2UgJythcmdzLmpvaW4oJyAnKSk7XG5cdGNoaWxkX3Byb2Nlc3MuZXhlYygnbWFrZSAnK2FyZ3Muam9pbignICcpLCAoZXJyLCBzdGRvdXQsIHN0ZGVycikgPT4ge1xuXHRcdGlmIChlcnIpIGNvbnNvbGUubG9nKCdlcnJvciBzZXR0aW5nIGJvb3QgcHJvamVjdCcsIGVycik7XG5cdFx0aWYgKHN0ZG91dCkgc29ja2V0LmVtaXQoJ3J1bi1vbi1ib290LWxvZycsIHN0ZG91dCk7XG5cdFx0aWYgKHN0ZGVycikgc29ja2V0LmVtaXQoJ3J1bi1vbi1ib290LWxvZycsIHN0ZGVycik7XG5cdFx0c29ja2V0LmVtaXQoJ3J1bi1vbi1ib290LWxvZycsICdkb25lJyk7XG5cdH0pO1xufVxuXG5mdW5jdGlvbiBsaXN0ZW5fb25fYm9vdCgpe1xuXG59XG4iXX0=
