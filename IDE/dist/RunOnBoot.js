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
var IDE = require("./main");
var socket_manager = require("./SocketManager");
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
    return __awaiter(this, void 0, void 0, function () {
        var version, proc;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, IDE.get_xenomai_version()];
                case 1:
                    version = _a.sent();
                    if (!version.includes('2.6')) {
                        proc = child_process.spawn('journalctl', ['-fu', 'bela_startup']);
                        proc.stdout.setEncoding('utf8');
                        proc.stdout.on('data', function (data) { return socket_manager.broadcast('run-on-boot-log', data); });
                        proc.stderr.setEncoding('utf8');
                        proc.stderr.on('data', function (data) { return socket_manager.broadcast('run-on-boot-log', data); });
                    }
                    return [2 /*return*/];
            }
        });
    });
}

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIlJ1bk9uQm9vdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsNENBQThDO0FBQzlDLG9EQUFzRDtBQUN0RCw2Q0FBK0M7QUFDL0MsNEJBQThCO0FBQzlCLGdEQUFrRDtBQUNsRCwrQkFBaUM7QUFFakM7Ozs7O3dCQUNxQyxxQkFBTSxZQUFZLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUM7eUJBQ2pGLEtBQUssQ0FBQyxVQUFBLENBQUMsSUFBSSxPQUFBLE9BQU8sQ0FBQyxHQUFHLENBQUMsNkJBQTZCLENBQUMsRUFBMUMsQ0FBMEMsQ0FBRSxFQUFBOztvQkFEckQsV0FBVyxHQUFxQixTQUNxQjtvQkFDekQsSUFBSSxDQUFDLE9BQU8sV0FBVyxDQUFDLEtBQUssV0FBVzt3QkFBRSxzQkFBTyxNQUFNLEVBQUM7b0JBQ3BELEtBQUssR0FBRyxXQUFXLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO29CQUNwQyxXQUFzQixFQUFMLGVBQUssRUFBTCxtQkFBSyxFQUFMLElBQUs7d0JBQWIsSUFBSTt3QkFDUixVQUFVLEdBQWEsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQzt3QkFDM0MsSUFBSSxVQUFVLENBQUMsQ0FBQyxDQUFDLEtBQUssUUFBUSxJQUFJLFVBQVUsQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLEVBQUM7NEJBQ3ZELHNCQUFPLE1BQU0sRUFBQzt5QkFDZDs2QkFBTSxJQUFJLFVBQVUsQ0FBQyxDQUFDLENBQUMsS0FBSyxTQUFTLEVBQUM7NEJBQ3RDLGNBQWMsRUFBRSxDQUFDOzRCQUNqQixzQkFBTyxVQUFVLENBQUMsQ0FBQyxDQUFDLEVBQUM7eUJBQ3JCO3FCQUNEOzs7OztDQUNEO0FBZEQsNENBY0M7QUFFRCwwQkFBdUMsTUFBdUIsRUFBRSxPQUFnQjs7Ozs7O3lCQUMzRSxDQUFBLE9BQU8sS0FBSyxNQUFNLENBQUEsRUFBbEIsd0JBQWtCO29CQUNyQixXQUFXLENBQUMsTUFBTSxFQUFFO3dCQUNuQixzQkFBc0I7d0JBQ3RCLElBQUk7d0JBQ0osS0FBSyxDQUFDLElBQUk7d0JBQ1YsV0FBVztxQkFDWCxDQUFDLENBQUM7O3dCQUVvQyxxQkFBTSxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLEVBQUE7O29CQUExRSxJQUFJLEdBQStCLFNBQXVDO29CQUM5RSxXQUFXLENBQUMsTUFBTSxFQUFFO3dCQUNuQixzQkFBc0I7d0JBQ3RCLElBQUk7d0JBQ0osS0FBSyxDQUFDLElBQUk7d0JBQ1YsYUFBYTt3QkFDYixVQUFVLEdBQUMsT0FBTzt3QkFDbEIsTUFBTSxHQUFDLElBQUksQ0FBQyxFQUFFLEdBQUMsR0FBRzt3QkFDbEIsSUFBSSxDQUFDLElBQUk7cUJBQ1QsQ0FBQyxDQUFDOzs7Ozs7Q0FFSjtBQXBCRCw0Q0FvQkM7QUFFRCxxQkFBcUIsTUFBdUIsRUFBRSxJQUFjO0lBQzNELE9BQU8sQ0FBQyxHQUFHLENBQUMsT0FBTyxHQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztJQUNwQyxhQUFhLENBQUMsSUFBSSxDQUFDLE9BQU8sR0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLFVBQUMsR0FBRyxFQUFFLE1BQU0sRUFBRSxNQUFNO1FBQzlELElBQUksR0FBRztZQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsNEJBQTRCLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDeEQsSUFBSSxNQUFNO1lBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUNuRCxJQUFJLE1BQU07WUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLGlCQUFpQixFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQ25ELE1BQU0sQ0FBQyxJQUFJLENBQUMsaUJBQWlCLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDeEMsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDO0FBRUQ7Ozs7O3dCQUN1QixxQkFBTSxHQUFHLENBQUMsbUJBQW1CLEVBQUUsRUFBQTs7b0JBQWpELE9BQU8sR0FBVyxTQUErQjtvQkFDckQsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEVBQUM7d0JBQ3hCLElBQUksR0FBRyxhQUFhLENBQUMsS0FBSyxDQUFDLFlBQVksRUFBRSxDQUFDLEtBQUssRUFBRSxjQUFjLENBQUMsQ0FBQyxDQUFDO3dCQUN0RSxJQUFJLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQzt3QkFDaEMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxFQUFFLFVBQUEsSUFBSSxJQUFJLE9BQUEsY0FBYyxDQUFDLFNBQVMsQ0FBQyxpQkFBaUIsRUFBRSxJQUFJLENBQUMsRUFBakQsQ0FBaUQsQ0FBQyxDQUFDO3dCQUNsRixJQUFJLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQzt3QkFDaEMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxFQUFFLFVBQUEsSUFBSSxJQUFJLE9BQUEsY0FBYyxDQUFDLFNBQVMsQ0FBQyxpQkFBaUIsRUFBRSxJQUFJLENBQUMsRUFBakQsQ0FBaUQsQ0FBQyxDQUFDO3FCQUNsRjs7Ozs7Q0FDRCIsImZpbGUiOiJSdW5PbkJvb3QuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBmaWxlX21hbmFnZXIgZnJvbSAnLi9GaWxlTWFuYWdlcic7XG5pbXBvcnQgKiBhcyBwcm9qZWN0X3NldHRpbmdzIGZyb20gJy4vUHJvamVjdFNldHRpbmdzJztcbmltcG9ydCAqIGFzIGNoaWxkX3Byb2Nlc3MgZnJvbSAnY2hpbGRfcHJvY2Vzcyc7XG5pbXBvcnQgKiBhcyBJREUgZnJvbSAnLi9tYWluJztcbmltcG9ydCAqIGFzIHNvY2tldF9tYW5hZ2VyIGZyb20gJy4vU29ja2V0TWFuYWdlcic7XG5pbXBvcnQgKiBhcyBwYXRocyBmcm9tICcuL3BhdGhzJztcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldF9ib290X3Byb2plY3QoKTogUHJvbWlzZTxzdHJpbmc+IHtcblx0bGV0IHN0YXJ0dXBfZW52OiBzdHJpbmd8dW5kZWZpbmVkID0gYXdhaXQgZmlsZV9tYW5hZ2VyLnJlYWRfZmlsZShwYXRocy5zdGFydHVwX2Vudilcblx0XHQuY2F0Y2goZSA9PiBjb25zb2xlLmxvZygnZXJyb3I6IG5vIHN0YXJ0dXBfZW52IGZvdW5kJykgKTtcblx0aWYgKCh0eXBlb2Ygc3RhcnR1cF9lbnYpID09PSAndW5kZWZpbmVkJykgcmV0dXJuICdub25lJztcblx0bGV0IGxpbmVzID0gc3RhcnR1cF9lbnYuc3BsaXQoJ1xcbicpO1xuXHRmb3IgKGxldCBsaW5lIG9mIGxpbmVzKXtcblx0XHRsZXQgc3BsaXRfbGluZTogc3RyaW5nW10gPSBsaW5lLnNwbGl0KCc9Jyk7XG5cdFx0aWYgKHNwbGl0X2xpbmVbMF0gPT09ICdBQ1RJVkUnICYmIHNwbGl0X2xpbmVbMV0gPT09ICcwJyl7XG5cdFx0XHRyZXR1cm4gJ25vbmUnO1xuXHRcdH0gZWxzZSBpZiAoc3BsaXRfbGluZVswXSA9PT0gJ1BST0pFQ1QnKXtcblx0XHRcdGxpc3Rlbl9vbl9ib290KCk7XG5cdFx0XHRyZXR1cm4gc3BsaXRfbGluZVsxXTtcblx0XHR9XG5cdH1cbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHNldF9ib290X3Byb2plY3Qoc29ja2V0OiBTb2NrZXRJTy5Tb2NrZXQsIHByb2plY3Q6ICBzdHJpbmcpe1xuXHRpZiAocHJvamVjdCA9PT0gJ25vbmUnKXtcblx0XHRydW5fb25fYm9vdChzb2NrZXQsIFtcblx0XHRcdCctLW5vLXByaW50LWRpcmVjdG9yeScsXG5cdFx0XHQnLUMnLFxuXHRcdFx0cGF0aHMuQmVsYSxcblx0XHRcdCdub3N0YXJ0dXAnXG5cdFx0XSk7XG5cdH0gZWxzZSB7XG5cdFx0bGV0IGFyZ3M6IHtDTDogc3RyaW5nLCBtYWtlOiBzdHJpbmd9ID0gYXdhaXQgcHJvamVjdF9zZXR0aW5ncy5nZXRBcmdzKHByb2plY3QpO1xuXHRcdHJ1bl9vbl9ib290KHNvY2tldCwgW1xuXHRcdFx0Jy0tbm8tcHJpbnQtZGlyZWN0b3J5Jyxcblx0XHRcdCctQycsXG5cdFx0XHRwYXRocy5CZWxhLFxuXHRcdFx0J3N0YXJ0dXBsb29wJyxcblx0XHRcdCdQUk9KRUNUPScrcHJvamVjdCxcblx0XHRcdCdDTD1cIicrYXJncy5DTCsnXCInLFxuXHRcdFx0YXJncy5tYWtlXG5cdFx0XSk7XG5cdH1cbn1cblxuZnVuY3Rpb24gcnVuX29uX2Jvb3Qoc29ja2V0OiBTb2NrZXRJTy5Tb2NrZXQsIGFyZ3M6IHN0cmluZ1tdKXtcblx0Y29uc29sZS5sb2coJ21ha2UgJythcmdzLmpvaW4oJyAnKSk7XG5cdGNoaWxkX3Byb2Nlc3MuZXhlYygnbWFrZSAnK2FyZ3Muam9pbignICcpLCAoZXJyLCBzdGRvdXQsIHN0ZGVycikgPT4ge1xuXHRcdGlmIChlcnIpIGNvbnNvbGUubG9nKCdlcnJvciBzZXR0aW5nIGJvb3QgcHJvamVjdCcsIGVycik7XG5cdFx0aWYgKHN0ZG91dCkgc29ja2V0LmVtaXQoJ3J1bi1vbi1ib290LWxvZycsIHN0ZG91dCk7XG5cdFx0aWYgKHN0ZGVycikgc29ja2V0LmVtaXQoJ3J1bi1vbi1ib290LWxvZycsIHN0ZGVycik7XG5cdFx0c29ja2V0LmVtaXQoJ3J1bi1vbi1ib290LWxvZycsICdkb25lJyk7XG5cdH0pO1xufVxuXG5hc3luYyBmdW5jdGlvbiBsaXN0ZW5fb25fYm9vdCgpe1xuXHRsZXQgdmVyc2lvbjogc3RyaW5nID0gYXdhaXQgSURFLmdldF94ZW5vbWFpX3ZlcnNpb24oKTtcblx0aWYgKCF2ZXJzaW9uLmluY2x1ZGVzKCcyLjYnKSl7XG5cdFx0bGV0IHByb2MgPSBjaGlsZF9wcm9jZXNzLnNwYXduKCdqb3VybmFsY3RsJywgWyctZnUnLCAnYmVsYV9zdGFydHVwJ10pO1xuXHRcdHByb2Muc3Rkb3V0LnNldEVuY29kaW5nKCd1dGY4Jyk7XG5cdFx0cHJvYy5zdGRvdXQub24oJ2RhdGEnLCBkYXRhID0+IHNvY2tldF9tYW5hZ2VyLmJyb2FkY2FzdCgncnVuLW9uLWJvb3QtbG9nJywgZGF0YSkpO1xuXHRcdHByb2Muc3RkZXJyLnNldEVuY29kaW5nKCd1dGY4Jyk7XG5cdFx0cHJvYy5zdGRlcnIub24oJ2RhdGEnLCBkYXRhID0+IHNvY2tldF9tYW5hZ2VyLmJyb2FkY2FzdCgncnVuLW9uLWJvb3QtbG9nJywgZGF0YSkpO1xuXHR9XG59XG4iXX0=
