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
var project_settings = require("./ProjectSettings");
var child_process = require("child_process");
var IDE = require("./main");
var socket_manager = require("./SocketManager");
var paths = require("./paths");
function get_boot_project() {
    return __awaiter(this, void 0, void 0, function () {
        var startup_env, lines, _i, lines_1, line, split_line, project;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, file_manager.read_file(paths.startup_env)
                        .catch(function (e) { return console.log('error: no startup_env found'); })];
                case 1:
                    startup_env = _a.sent();
                    if ((typeof startup_env) === 'undefined')
                        return [2 /*return*/, '*none*'];
                    lines = startup_env.split('\n');
                    for (_i = 0, lines_1 = lines; _i < lines_1.length; _i++) {
                        line = lines_1[_i];
                        split_line = line.split('=');
                        if (split_line[0] === 'ACTIVE' && split_line[1] === '0') {
                            return [2 /*return*/, '*none*'];
                        }
                        else if (split_line[0] === 'PROJECT') {
                            project = void 0;
                            if (split_line[1] === '') {
                                project = '*loop*';
                            }
                            else {
                                project = split_line[1];
                            }
                            listen_on_boot();
                            return [2 /*return*/, project];
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
        var project_args, args, _i, _a, arg;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    if (!(project === '*none*')) return [3 /*break*/, 1];
                    run_on_boot(socket, [
                        '--no-print-directory',
                        '-C',
                        paths.Bela,
                        'nostartup'
                    ]);
                    return [3 /*break*/, 4];
                case 1:
                    if (!(project === '*loop*')) return [3 /*break*/, 2];
                    run_on_boot(socket, [
                        '--no-print-directory',
                        '-C',
                        paths.Bela,
                        'startuploop',
                        'PROJECT='
                    ]);
                    return [3 /*break*/, 4];
                case 2: return [4 /*yield*/, project_settings.getArgs(project)];
                case 3:
                    project_args = _b.sent();
                    args = [
                        '--no-print-directory',
                        '-C',
                        paths.Bela,
                        'startuploop',
                        'PROJECT=' + project,
                        'CL=' + project_args.CL
                    ];
                    if (project_args.make) {
                        for (_i = 0, _a = project_args.make; _i < _a.length; _i++) {
                            arg = _a[_i];
                            args.push(arg.trim());
                        }
                    }
                    run_on_boot(socket, args);
                    _b.label = 4;
                case 4: return [2 /*return*/];
            }
        });
    });
}
exports.set_boot_project = set_boot_project;
// this function should really use MakeProcess
function run_on_boot(socket, args) {
    console.log("make '" + args.join("' '") + "'");
    var proc = child_process.spawn('make', args);
    proc.stdout.setEncoding('utf8');
    proc.stdout.on('data', function (data) { return socket_manager.broadcast('run-on-boot-log', data); });
    proc.stderr.setEncoding('utf8');
    proc.stderr.on('data', function (data) { return socket_manager.broadcast('run-on-boot-log', data); });
    proc.on('close', function (code) {
        if (!code) {
            if (args[3] === 'nostartup') {
                socket.emit('run-on-boot-log', 'no project set to run on boot succesfully');
            }
            else {
                socket.emit('run-on-boot-log', 'project set to run on boot succesfully');
            }
        }
        else {
            socket.emit('std-warn', 'error setting project to run on boot!');
        }
    });
    /*	child_process.exec('make '+args.join(' '), (err, stdout, stderr) => {
            if (err) console.log('error setting boot project', err);
            if (stdout) socket.emit('run-on-boot-log', stdout);
            if (stderr) socket.emit('run-on-boot-log', stderr);
            socket.emit('run-on-boot-log', 'done');
        });
    */
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIlJ1bk9uQm9vdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsNENBQThDO0FBQzlDLG9EQUFzRDtBQUN0RCw2Q0FBK0M7QUFDL0MsNEJBQThCO0FBQzlCLGdEQUFrRDtBQUNsRCwrQkFBaUM7QUFFakM7Ozs7O3dCQUNxQyxxQkFBTSxZQUFZLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUM7eUJBQ2pGLEtBQUssQ0FBQyxVQUFBLENBQUMsSUFBSSxPQUFBLE9BQU8sQ0FBQyxHQUFHLENBQUMsNkJBQTZCLENBQUMsRUFBMUMsQ0FBMEMsQ0FBRSxFQUFBOztvQkFEckQsV0FBVyxHQUFxQixTQUNxQjtvQkFDekQsSUFBSSxDQUFDLE9BQU8sV0FBVyxDQUFDLEtBQUssV0FBVzt3QkFBRSxzQkFBTyxRQUFRLEVBQUM7b0JBQ3RELEtBQUssR0FBRyxXQUFXLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO29CQUNwQyxXQUFzQixFQUFMLGVBQUssRUFBTCxtQkFBSyxFQUFMLElBQUssRUFBQzt3QkFBZCxJQUFJO3dCQUNSLFVBQVUsR0FBYSxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO3dCQUMzQyxJQUFJLFVBQVUsQ0FBQyxDQUFDLENBQUMsS0FBSyxRQUFRLElBQUksVUFBVSxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUcsRUFBQzs0QkFDdkQsc0JBQU8sUUFBUSxFQUFDO3lCQUNoQjs2QkFBTSxJQUFJLFVBQVUsQ0FBQyxDQUFDLENBQUMsS0FBSyxTQUFTLEVBQUM7NEJBQ2xDLE9BQU8sU0FBUSxDQUFDOzRCQUNwQixJQUFJLFVBQVUsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUM7Z0NBQ3hCLE9BQU8sR0FBRyxRQUFRLENBQUM7NkJBQ25CO2lDQUFNO2dDQUNOLE9BQU8sR0FBRyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUM7NkJBQ3hCOzRCQUNELGNBQWMsRUFBRSxDQUFDOzRCQUNqQixzQkFBTyxPQUFPLEVBQUM7eUJBQ2Y7cUJBQ0Q7Ozs7O0NBQ0Q7QUFwQkQsNENBb0JDO0FBRUQsMEJBQXVDLE1BQXVCLEVBQUUsT0FBZ0I7Ozs7Ozt5QkFDM0UsQ0FBQSxPQUFPLEtBQUssUUFBUSxDQUFBLEVBQXBCLHdCQUFvQjtvQkFDdkIsV0FBVyxDQUFDLE1BQU0sRUFBRTt3QkFDbkIsc0JBQXNCO3dCQUN0QixJQUFJO3dCQUNKLEtBQUssQ0FBQyxJQUFJO3dCQUNWLFdBQVc7cUJBQ1gsQ0FBQyxDQUFDOzs7eUJBQ00sQ0FBQSxPQUFPLEtBQUssUUFBUSxDQUFBLEVBQXBCLHdCQUFvQjtvQkFDN0IsV0FBVyxDQUFDLE1BQU0sRUFBRTt3QkFDbkIsc0JBQXNCO3dCQUN0QixJQUFJO3dCQUNKLEtBQUssQ0FBQyxJQUFJO3dCQUNWLGFBQWE7d0JBQ2IsVUFBVTtxQkFDVixDQUFDLENBQUM7O3dCQUU4QyxxQkFBTSxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLEVBQUE7O29CQUFwRixZQUFZLEdBQWlDLFNBQXVDO29CQUNwRixJQUFJLEdBQWE7d0JBQ3BCLHNCQUFzQjt3QkFDdEIsSUFBSTt3QkFDSixLQUFLLENBQUMsSUFBSTt3QkFDVixhQUFhO3dCQUNiLFVBQVUsR0FBQyxPQUFPO3dCQUNsQixLQUFLLEdBQUMsWUFBWSxDQUFDLEVBQUU7cUJBQ3JCLENBQUM7b0JBQ0YsSUFBSSxZQUFZLENBQUMsSUFBSSxFQUFDO3dCQUNyQixXQUFpQyxFQUFqQixLQUFBLFlBQVksQ0FBQyxJQUFJLEVBQWpCLGNBQWlCLEVBQWpCLElBQWlCLEVBQUM7NEJBQXpCLEdBQUc7NEJBQ1gsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQzt5QkFDdEI7cUJBQ0Q7b0JBQ0QsV0FBVyxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQzs7Ozs7O0NBRTNCO0FBakNELDRDQWlDQztBQUVELDhDQUE4QztBQUM5QyxxQkFBcUIsTUFBdUIsRUFBRSxJQUFjO0lBQzNELE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUM7SUFDL0MsSUFBSSxJQUFJLEdBQUcsYUFBYSxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDN0MsSUFBSSxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDaEMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxFQUFFLFVBQUEsSUFBSSxJQUFJLE9BQUEsY0FBYyxDQUFDLFNBQVMsQ0FBQyxpQkFBaUIsRUFBRSxJQUFJLENBQUMsRUFBakQsQ0FBaUQsQ0FBQyxDQUFDO0lBQ2xGLElBQUksQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ2hDLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sRUFBRSxVQUFBLElBQUksSUFBSSxPQUFBLGNBQWMsQ0FBQyxTQUFTLENBQUMsaUJBQWlCLEVBQUUsSUFBSSxDQUFDLEVBQWpELENBQWlELENBQUMsQ0FBQztJQUNsRixJQUFJLENBQUMsRUFBRSxDQUFDLE9BQU8sRUFBRSxVQUFDLElBQVk7UUFDN0IsSUFBSSxDQUFDLElBQUksRUFBQztZQUNULElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLFdBQVcsRUFBQztnQkFDM0IsTUFBTSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsRUFBRSwyQ0FBMkMsQ0FBQyxDQUFDO2FBQzVFO2lCQUFNO2dCQUNOLE1BQU0sQ0FBQyxJQUFJLENBQUMsaUJBQWlCLEVBQUUsd0NBQXdDLENBQUMsQ0FBQzthQUN6RTtTQUNEO2FBQU07WUFDTixNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSx1Q0FBdUMsQ0FBQyxDQUFDO1NBQ2pFO0lBQ0YsQ0FBQyxDQUFDLENBQUM7SUFDSjs7Ozs7O01BTUU7QUFDRixDQUFDO0FBRUQ7Ozs7O3dCQUN1QixxQkFBTSxHQUFHLENBQUMsbUJBQW1CLEVBQUUsRUFBQTs7b0JBQWpELE9BQU8sR0FBVyxTQUErQjtvQkFDckQsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEVBQUM7d0JBQ3hCLElBQUksR0FBRyxhQUFhLENBQUMsS0FBSyxDQUFDLFlBQVksRUFBRSxDQUFDLEtBQUssRUFBRSxjQUFjLENBQUMsQ0FBQyxDQUFDO3dCQUN0RSxJQUFJLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQzt3QkFDaEMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxFQUFFLFVBQUEsSUFBSSxJQUFJLE9BQUEsY0FBYyxDQUFDLFNBQVMsQ0FBQyxpQkFBaUIsRUFBRSxJQUFJLENBQUMsRUFBakQsQ0FBaUQsQ0FBQyxDQUFDO3dCQUNsRixJQUFJLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQzt3QkFDaEMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxFQUFFLFVBQUEsSUFBSSxJQUFJLE9BQUEsY0FBYyxDQUFDLFNBQVMsQ0FBQyxpQkFBaUIsRUFBRSxJQUFJLENBQUMsRUFBakQsQ0FBaUQsQ0FBQyxDQUFDO3FCQUNsRjs7Ozs7Q0FDRCIsImZpbGUiOiJSdW5PbkJvb3QuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBmaWxlX21hbmFnZXIgZnJvbSAnLi9GaWxlTWFuYWdlcic7XG5pbXBvcnQgKiBhcyBwcm9qZWN0X3NldHRpbmdzIGZyb20gJy4vUHJvamVjdFNldHRpbmdzJztcbmltcG9ydCAqIGFzIGNoaWxkX3Byb2Nlc3MgZnJvbSAnY2hpbGRfcHJvY2Vzcyc7XG5pbXBvcnQgKiBhcyBJREUgZnJvbSAnLi9tYWluJztcbmltcG9ydCAqIGFzIHNvY2tldF9tYW5hZ2VyIGZyb20gJy4vU29ja2V0TWFuYWdlcic7XG5pbXBvcnQgKiBhcyBwYXRocyBmcm9tICcuL3BhdGhzJztcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldF9ib290X3Byb2plY3QoKTogUHJvbWlzZTxzdHJpbmc+IHtcblx0bGV0IHN0YXJ0dXBfZW52OiBzdHJpbmd8dW5kZWZpbmVkID0gYXdhaXQgZmlsZV9tYW5hZ2VyLnJlYWRfZmlsZShwYXRocy5zdGFydHVwX2Vudilcblx0XHQuY2F0Y2goZSA9PiBjb25zb2xlLmxvZygnZXJyb3I6IG5vIHN0YXJ0dXBfZW52IGZvdW5kJykgKTtcblx0aWYgKCh0eXBlb2Ygc3RhcnR1cF9lbnYpID09PSAndW5kZWZpbmVkJykgcmV0dXJuICcqbm9uZSonO1xuXHRsZXQgbGluZXMgPSBzdGFydHVwX2Vudi5zcGxpdCgnXFxuJyk7XG5cdGZvciAobGV0IGxpbmUgb2YgbGluZXMpe1xuXHRcdGxldCBzcGxpdF9saW5lOiBzdHJpbmdbXSA9IGxpbmUuc3BsaXQoJz0nKTtcblx0XHRpZiAoc3BsaXRfbGluZVswXSA9PT0gJ0FDVElWRScgJiYgc3BsaXRfbGluZVsxXSA9PT0gJzAnKXtcblx0XHRcdHJldHVybiAnKm5vbmUqJztcblx0XHR9IGVsc2UgaWYgKHNwbGl0X2xpbmVbMF0gPT09ICdQUk9KRUNUJyl7XG5cdFx0XHRsZXQgcHJvamVjdDogc3RyaW5nO1xuXHRcdFx0aWYgKHNwbGl0X2xpbmVbMV0gPT09ICcnKXtcblx0XHRcdFx0cHJvamVjdCA9ICcqbG9vcConO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0cHJvamVjdCA9IHNwbGl0X2xpbmVbMV07XG5cdFx0XHR9XG5cdFx0XHRsaXN0ZW5fb25fYm9vdCgpO1xuXHRcdFx0cmV0dXJuIHByb2plY3Q7XG5cdFx0fVxuXHR9XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBzZXRfYm9vdF9wcm9qZWN0KHNvY2tldDogU29ja2V0SU8uU29ja2V0LCBwcm9qZWN0OiAgc3RyaW5nKXtcblx0aWYgKHByb2plY3QgPT09ICcqbm9uZSonKXtcblx0XHRydW5fb25fYm9vdChzb2NrZXQsIFtcblx0XHRcdCctLW5vLXByaW50LWRpcmVjdG9yeScsXG5cdFx0XHQnLUMnLFxuXHRcdFx0cGF0aHMuQmVsYSxcblx0XHRcdCdub3N0YXJ0dXAnXG5cdFx0XSk7XG5cdH0gZWxzZSBpZihwcm9qZWN0ID09PSAnKmxvb3AqJyl7XG5cdFx0cnVuX29uX2Jvb3Qoc29ja2V0LCBbXG5cdFx0XHQnLS1uby1wcmludC1kaXJlY3RvcnknLFxuXHRcdFx0Jy1DJyxcblx0XHRcdHBhdGhzLkJlbGEsXG5cdFx0XHQnc3RhcnR1cGxvb3AnLFxuXHRcdFx0J1BST0pFQ1Q9J1xuXHRcdF0pO1xuXHR9IGVsc2Uge1xuXHRcdGxldCBwcm9qZWN0X2FyZ3M6IHtDTDogc3RyaW5nLCBtYWtlOiBzdHJpbmdbXX0gPSBhd2FpdCBwcm9qZWN0X3NldHRpbmdzLmdldEFyZ3MocHJvamVjdCk7XG5cdFx0bGV0IGFyZ3M6IHN0cmluZ1tdID0gW1xuXHRcdFx0Jy0tbm8tcHJpbnQtZGlyZWN0b3J5Jyxcblx0XHRcdCctQycsXG5cdFx0XHRwYXRocy5CZWxhLFxuXHRcdFx0J3N0YXJ0dXBsb29wJyxcblx0XHRcdCdQUk9KRUNUPScrcHJvamVjdCxcblx0XHRcdCdDTD0nK3Byb2plY3RfYXJncy5DTFxuXHRcdF07XG5cdFx0aWYgKHByb2plY3RfYXJncy5tYWtlKXtcblx0XHRcdGZvciAobGV0IGFyZyBvZiBwcm9qZWN0X2FyZ3MubWFrZSl7XG5cdFx0XHRcdGFyZ3MucHVzaChhcmcudHJpbSgpKTtcblx0XHRcdH1cblx0XHR9XG5cdFx0cnVuX29uX2Jvb3Qoc29ja2V0LCBhcmdzKTtcblx0fVxufVxuXG4vLyB0aGlzIGZ1bmN0aW9uIHNob3VsZCByZWFsbHkgdXNlIE1ha2VQcm9jZXNzXG5mdW5jdGlvbiBydW5fb25fYm9vdChzb2NrZXQ6IFNvY2tldElPLlNvY2tldCwgYXJnczogc3RyaW5nW10pe1xuXHRjb25zb2xlLmxvZyhcIm1ha2UgJ1wiICsgYXJncy5qb2luKFwiJyAnXCIpICsgXCInXCIpO1xuXHRsZXQgcHJvYyA9IGNoaWxkX3Byb2Nlc3Muc3Bhd24oJ21ha2UnLCBhcmdzKTtcblx0cHJvYy5zdGRvdXQuc2V0RW5jb2RpbmcoJ3V0ZjgnKTtcblx0cHJvYy5zdGRvdXQub24oJ2RhdGEnLCBkYXRhID0+IHNvY2tldF9tYW5hZ2VyLmJyb2FkY2FzdCgncnVuLW9uLWJvb3QtbG9nJywgZGF0YSkpO1xuXHRwcm9jLnN0ZGVyci5zZXRFbmNvZGluZygndXRmOCcpO1xuXHRwcm9jLnN0ZGVyci5vbignZGF0YScsIGRhdGEgPT4gc29ja2V0X21hbmFnZXIuYnJvYWRjYXN0KCdydW4tb24tYm9vdC1sb2cnLCBkYXRhKSk7XG5cdHByb2Mub24oJ2Nsb3NlJywgKGNvZGU6IG51bWJlcikgPT4ge1xuXHRcdGlmICghY29kZSl7XG5cdFx0XHRpZiAoYXJnc1szXSA9PT0gJ25vc3RhcnR1cCcpe1xuXHRcdFx0XHRzb2NrZXQuZW1pdCgncnVuLW9uLWJvb3QtbG9nJywgJ25vIHByb2plY3Qgc2V0IHRvIHJ1biBvbiBib290IHN1Y2Nlc2Z1bGx5Jyk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRzb2NrZXQuZW1pdCgncnVuLW9uLWJvb3QtbG9nJywgJ3Byb2plY3Qgc2V0IHRvIHJ1biBvbiBib290IHN1Y2Nlc2Z1bGx5Jyk7XG5cdFx0XHR9XG5cdFx0fSBlbHNlIHtcblx0XHRcdHNvY2tldC5lbWl0KCdzdGQtd2FybicsICdlcnJvciBzZXR0aW5nIHByb2plY3QgdG8gcnVuIG9uIGJvb3QhJyk7XG5cdFx0fVxuXHR9KTtcbi8qXHRjaGlsZF9wcm9jZXNzLmV4ZWMoJ21ha2UgJythcmdzLmpvaW4oJyAnKSwgKGVyciwgc3Rkb3V0LCBzdGRlcnIpID0+IHtcblx0XHRpZiAoZXJyKSBjb25zb2xlLmxvZygnZXJyb3Igc2V0dGluZyBib290IHByb2plY3QnLCBlcnIpO1xuXHRcdGlmIChzdGRvdXQpIHNvY2tldC5lbWl0KCdydW4tb24tYm9vdC1sb2cnLCBzdGRvdXQpO1xuXHRcdGlmIChzdGRlcnIpIHNvY2tldC5lbWl0KCdydW4tb24tYm9vdC1sb2cnLCBzdGRlcnIpO1xuXHRcdHNvY2tldC5lbWl0KCdydW4tb24tYm9vdC1sb2cnLCAnZG9uZScpO1xuXHR9KTtcbiovXG59XG5cbmFzeW5jIGZ1bmN0aW9uIGxpc3Rlbl9vbl9ib290KCl7XG5cdGxldCB2ZXJzaW9uOiBzdHJpbmcgPSBhd2FpdCBJREUuZ2V0X3hlbm9tYWlfdmVyc2lvbigpO1xuXHRpZiAoIXZlcnNpb24uaW5jbHVkZXMoJzIuNicpKXtcblx0XHRsZXQgcHJvYyA9IGNoaWxkX3Byb2Nlc3Muc3Bhd24oJ2pvdXJuYWxjdGwnLCBbJy1mdScsICdiZWxhX3N0YXJ0dXAnXSk7XG5cdFx0cHJvYy5zdGRvdXQuc2V0RW5jb2RpbmcoJ3V0ZjgnKTtcblx0XHRwcm9jLnN0ZG91dC5vbignZGF0YScsIGRhdGEgPT4gc29ja2V0X21hbmFnZXIuYnJvYWRjYXN0KCdydW4tb24tYm9vdC1sb2cnLCBkYXRhKSk7XG5cdFx0cHJvYy5zdGRlcnIuc2V0RW5jb2RpbmcoJ3V0ZjgnKTtcblx0XHRwcm9jLnN0ZGVyci5vbignZGF0YScsIGRhdGEgPT4gc29ja2V0X21hbmFnZXIuYnJvYWRjYXN0KCdydW4tb24tYm9vdC1sb2cnLCBkYXRhKSk7XG5cdH1cbn1cbiJdfQ==
