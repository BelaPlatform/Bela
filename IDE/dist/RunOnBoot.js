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
                            args.push(arg);
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,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QixFQUFFLEVBQUE7O29CQUFqRCxPQUFPLEdBQVcsU0FBK0I7b0JBQ3JELElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxFQUFDO3dCQUN4QixJQUFJLEdBQUcsYUFBYSxDQUFDLEtBQUssQ0FBQyxZQUFZLEVBQUUsQ0FBQyxLQUFLLEVBQUUsY0FBYyxDQUFDLENBQUMsQ0FBQzt3QkFDdEUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUM7d0JBQ2hDLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sRUFBRSxVQUFBLElBQUksSUFBSSxPQUFBLGNBQWMsQ0FBQyxTQUFTLENBQUMsaUJBQWlCLEVBQUUsSUFBSSxDQUFDLEVBQWpELENBQWlELENBQUMsQ0FBQzt3QkFDbEYsSUFBSSxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUM7d0JBQ2hDLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sRUFBRSxVQUFBLElBQUksSUFBSSxPQUFBLGNBQWMsQ0FBQyxTQUFTLENBQUMsaUJBQWlCLEVBQUUsSUFBSSxDQUFDLEVBQWpELENBQWlELENBQUMsQ0FBQztxQkFDbEY7Ozs7O0NBQ0QiLCJmaWxlIjoiUnVuT25Cb290LmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgZmlsZV9tYW5hZ2VyIGZyb20gJy4vRmlsZU1hbmFnZXInO1xuaW1wb3J0ICogYXMgcHJvamVjdF9zZXR0aW5ncyBmcm9tICcuL1Byb2plY3RTZXR0aW5ncyc7XG5pbXBvcnQgKiBhcyBjaGlsZF9wcm9jZXNzIGZyb20gJ2NoaWxkX3Byb2Nlc3MnO1xuaW1wb3J0ICogYXMgSURFIGZyb20gJy4vbWFpbic7XG5pbXBvcnQgKiBhcyBzb2NrZXRfbWFuYWdlciBmcm9tICcuL1NvY2tldE1hbmFnZXInO1xuaW1wb3J0ICogYXMgcGF0aHMgZnJvbSAnLi9wYXRocyc7XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZXRfYm9vdF9wcm9qZWN0KCk6IFByb21pc2U8c3RyaW5nPiB7XG5cdGxldCBzdGFydHVwX2Vudjogc3RyaW5nfHVuZGVmaW5lZCA9IGF3YWl0IGZpbGVfbWFuYWdlci5yZWFkX2ZpbGUocGF0aHMuc3RhcnR1cF9lbnYpXG5cdFx0LmNhdGNoKGUgPT4gY29uc29sZS5sb2coJ2Vycm9yOiBubyBzdGFydHVwX2VudiBmb3VuZCcpICk7XG5cdGlmICgodHlwZW9mIHN0YXJ0dXBfZW52KSA9PT0gJ3VuZGVmaW5lZCcpIHJldHVybiAnKm5vbmUqJztcblx0bGV0IGxpbmVzID0gc3RhcnR1cF9lbnYuc3BsaXQoJ1xcbicpO1xuXHRmb3IgKGxldCBsaW5lIG9mIGxpbmVzKXtcblx0XHRsZXQgc3BsaXRfbGluZTogc3RyaW5nW10gPSBsaW5lLnNwbGl0KCc9Jyk7XG5cdFx0aWYgKHNwbGl0X2xpbmVbMF0gPT09ICdBQ1RJVkUnICYmIHNwbGl0X2xpbmVbMV0gPT09ICcwJyl7XG5cdFx0XHRyZXR1cm4gJypub25lKic7XG5cdFx0fSBlbHNlIGlmIChzcGxpdF9saW5lWzBdID09PSAnUFJPSkVDVCcpe1xuXHRcdFx0bGV0IHByb2plY3Q6IHN0cmluZztcblx0XHRcdGlmIChzcGxpdF9saW5lWzFdID09PSAnJyl7XG5cdFx0XHRcdHByb2plY3QgPSAnKmxvb3AqJztcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHByb2plY3QgPSBzcGxpdF9saW5lWzFdO1xuXHRcdFx0fVxuXHRcdFx0bGlzdGVuX29uX2Jvb3QoKTtcblx0XHRcdHJldHVybiBwcm9qZWN0O1xuXHRcdH1cblx0fVxufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gc2V0X2Jvb3RfcHJvamVjdChzb2NrZXQ6IFNvY2tldElPLlNvY2tldCwgcHJvamVjdDogIHN0cmluZyl7XG5cdGlmIChwcm9qZWN0ID09PSAnKm5vbmUqJyl7XG5cdFx0cnVuX29uX2Jvb3Qoc29ja2V0LCBbXG5cdFx0XHQnLS1uby1wcmludC1kaXJlY3RvcnknLFxuXHRcdFx0Jy1DJyxcblx0XHRcdHBhdGhzLkJlbGEsXG5cdFx0XHQnbm9zdGFydHVwJ1xuXHRcdF0pO1xuXHR9IGVsc2UgaWYocHJvamVjdCA9PT0gJypsb29wKicpe1xuXHRcdHJ1bl9vbl9ib290KHNvY2tldCwgW1xuXHRcdFx0Jy0tbm8tcHJpbnQtZGlyZWN0b3J5Jyxcblx0XHRcdCctQycsXG5cdFx0XHRwYXRocy5CZWxhLFxuXHRcdFx0J3N0YXJ0dXBsb29wJyxcblx0XHRcdCdQUk9KRUNUPSdcblx0XHRdKTtcblx0fSBlbHNlIHtcblx0XHRsZXQgcHJvamVjdF9hcmdzOiB7Q0w6IHN0cmluZywgbWFrZTogc3RyaW5nW119ID0gYXdhaXQgcHJvamVjdF9zZXR0aW5ncy5nZXRBcmdzKHByb2plY3QpO1xuXHRcdGxldCBhcmdzOiBzdHJpbmdbXSA9IFtcblx0XHRcdCctLW5vLXByaW50LWRpcmVjdG9yeScsXG5cdFx0XHQnLUMnLFxuXHRcdFx0cGF0aHMuQmVsYSxcblx0XHRcdCdzdGFydHVwbG9vcCcsXG5cdFx0XHQnUFJPSkVDVD0nK3Byb2plY3QsXG5cdFx0XHQnQ0w9Jytwcm9qZWN0X2FyZ3MuQ0xcblx0XHRdO1xuXHRcdGlmIChwcm9qZWN0X2FyZ3MubWFrZSl7XG5cdFx0XHRmb3IgKGxldCBhcmcgb2YgcHJvamVjdF9hcmdzLm1ha2Upe1xuXHRcdFx0XHRhcmdzLnB1c2goYXJnKTtcblx0XHRcdH1cblx0XHR9XG5cdFx0cnVuX29uX2Jvb3Qoc29ja2V0LCBhcmdzKTtcblx0fVxufVxuXG4vLyB0aGlzIGZ1bmN0aW9uIHNob3VsZCByZWFsbHkgdXNlIE1ha2VQcm9jZXNzXG5mdW5jdGlvbiBydW5fb25fYm9vdChzb2NrZXQ6IFNvY2tldElPLlNvY2tldCwgYXJnczogc3RyaW5nW10pe1xuXHRjb25zb2xlLmxvZyhcIm1ha2UgJ1wiICsgYXJncy5qb2luKFwiJyAnXCIpICsgXCInXCIpO1xuXHRsZXQgcHJvYyA9IGNoaWxkX3Byb2Nlc3Muc3Bhd24oJ21ha2UnLCBhcmdzKTtcblx0cHJvYy5zdGRvdXQuc2V0RW5jb2RpbmcoJ3V0ZjgnKTtcblx0cHJvYy5zdGRvdXQub24oJ2RhdGEnLCBkYXRhID0+IHNvY2tldF9tYW5hZ2VyLmJyb2FkY2FzdCgncnVuLW9uLWJvb3QtbG9nJywgZGF0YSkpO1xuXHRwcm9jLnN0ZGVyci5zZXRFbmNvZGluZygndXRmOCcpO1xuXHRwcm9jLnN0ZGVyci5vbignZGF0YScsIGRhdGEgPT4gc29ja2V0X21hbmFnZXIuYnJvYWRjYXN0KCdydW4tb24tYm9vdC1sb2cnLCBkYXRhKSk7XG5cdHByb2Mub24oJ2Nsb3NlJywgKGNvZGU6IG51bWJlcikgPT4ge1xuXHRcdGlmICghY29kZSl7XG5cdFx0XHRpZiAoYXJnc1szXSA9PT0gJ25vc3RhcnR1cCcpe1xuXHRcdFx0XHRzb2NrZXQuZW1pdCgncnVuLW9uLWJvb3QtbG9nJywgJ25vIHByb2plY3Qgc2V0IHRvIHJ1biBvbiBib290IHN1Y2Nlc2Z1bGx5Jyk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRzb2NrZXQuZW1pdCgncnVuLW9uLWJvb3QtbG9nJywgJ3Byb2plY3Qgc2V0IHRvIHJ1biBvbiBib290IHN1Y2Nlc2Z1bGx5Jyk7XG5cdFx0XHR9XG5cdFx0fSBlbHNlIHtcblx0XHRcdHNvY2tldC5lbWl0KCdzdGQtd2FybicsICdlcnJvciBzZXR0aW5nIHByb2plY3QgdG8gcnVuIG9uIGJvb3QhJyk7XG5cdFx0fVxuXHR9KTtcbi8qXHRjaGlsZF9wcm9jZXNzLmV4ZWMoJ21ha2UgJythcmdzLmpvaW4oJyAnKSwgKGVyciwgc3Rkb3V0LCBzdGRlcnIpID0+IHtcblx0XHRpZiAoZXJyKSBjb25zb2xlLmxvZygnZXJyb3Igc2V0dGluZyBib290IHByb2plY3QnLCBlcnIpO1xuXHRcdGlmIChzdGRvdXQpIHNvY2tldC5lbWl0KCdydW4tb24tYm9vdC1sb2cnLCBzdGRvdXQpO1xuXHRcdGlmIChzdGRlcnIpIHNvY2tldC5lbWl0KCdydW4tb24tYm9vdC1sb2cnLCBzdGRlcnIpO1xuXHRcdHNvY2tldC5lbWl0KCdydW4tb24tYm9vdC1sb2cnLCAnZG9uZScpO1xuXHR9KTtcbiovXG59XG5cbmFzeW5jIGZ1bmN0aW9uIGxpc3Rlbl9vbl9ib290KCl7XG5cdGxldCB2ZXJzaW9uOiBzdHJpbmcgPSBhd2FpdCBJREUuZ2V0X3hlbm9tYWlfdmVyc2lvbigpO1xuXHRpZiAoIXZlcnNpb24uaW5jbHVkZXMoJzIuNicpKXtcblx0XHRsZXQgcHJvYyA9IGNoaWxkX3Byb2Nlc3Muc3Bhd24oJ2pvdXJuYWxjdGwnLCBbJy1mdScsICdiZWxhX3N0YXJ0dXAnXSk7XG5cdFx0cHJvYy5zdGRvdXQuc2V0RW5jb2RpbmcoJ3V0ZjgnKTtcblx0XHRwcm9jLnN0ZG91dC5vbignZGF0YScsIGRhdGEgPT4gc29ja2V0X21hbmFnZXIuYnJvYWRjYXN0KCdydW4tb24tYm9vdC1sb2cnLCBkYXRhKSk7XG5cdFx0cHJvYy5zdGRlcnIuc2V0RW5jb2RpbmcoJ3V0ZjgnKTtcblx0XHRwcm9jLnN0ZGVyci5vbignZGF0YScsIGRhdGEgPT4gc29ja2V0X21hbmFnZXIuYnJvYWRjYXN0KCdydW4tb24tYm9vdC1sb2cnLCBkYXRhKSk7XG5cdH1cbn1cbiJdfQ==
