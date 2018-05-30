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
                        return [2 /*return*/, 'none'];
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
                        'CL="' + project_args.CL + '"'
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,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LElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sRUFBRSxVQUFBLElBQUksSUFBSSxPQUFBLGNBQWMsQ0FBQyxTQUFTLENBQUMsaUJBQWlCLEVBQUUsSUFBSSxDQUFDLEVBQWpELENBQWlELENBQUMsQ0FBQztxQkFDbEY7Ozs7O0NBQ0QiLCJmaWxlIjoiUnVuT25Cb290LmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgZmlsZV9tYW5hZ2VyIGZyb20gJy4vRmlsZU1hbmFnZXInO1xuaW1wb3J0ICogYXMgcHJvamVjdF9zZXR0aW5ncyBmcm9tICcuL1Byb2plY3RTZXR0aW5ncyc7XG5pbXBvcnQgKiBhcyBjaGlsZF9wcm9jZXNzIGZyb20gJ2NoaWxkX3Byb2Nlc3MnO1xuaW1wb3J0ICogYXMgSURFIGZyb20gJy4vbWFpbic7XG5pbXBvcnQgKiBhcyBzb2NrZXRfbWFuYWdlciBmcm9tICcuL1NvY2tldE1hbmFnZXInO1xuaW1wb3J0ICogYXMgcGF0aHMgZnJvbSAnLi9wYXRocyc7XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZXRfYm9vdF9wcm9qZWN0KCk6IFByb21pc2U8c3RyaW5nPiB7XG5cdGxldCBzdGFydHVwX2Vudjogc3RyaW5nfHVuZGVmaW5lZCA9IGF3YWl0IGZpbGVfbWFuYWdlci5yZWFkX2ZpbGUocGF0aHMuc3RhcnR1cF9lbnYpXG5cdFx0LmNhdGNoKGUgPT4gY29uc29sZS5sb2coJ2Vycm9yOiBubyBzdGFydHVwX2VudiBmb3VuZCcpICk7XG5cdGlmICgodHlwZW9mIHN0YXJ0dXBfZW52KSA9PT0gJ3VuZGVmaW5lZCcpIHJldHVybiAnbm9uZSc7XG5cdGxldCBsaW5lcyA9IHN0YXJ0dXBfZW52LnNwbGl0KCdcXG4nKTtcblx0Zm9yIChsZXQgbGluZSBvZiBsaW5lcyl7XG5cdFx0bGV0IHNwbGl0X2xpbmU6IHN0cmluZ1tdID0gbGluZS5zcGxpdCgnPScpO1xuXHRcdGlmIChzcGxpdF9saW5lWzBdID09PSAnQUNUSVZFJyAmJiBzcGxpdF9saW5lWzFdID09PSAnMCcpe1xuXHRcdFx0cmV0dXJuICcqbm9uZSonO1xuXHRcdH0gZWxzZSBpZiAoc3BsaXRfbGluZVswXSA9PT0gJ1BST0pFQ1QnKXtcblx0XHRcdGxldCBwcm9qZWN0OiBzdHJpbmc7XG5cdFx0XHRpZiAoc3BsaXRfbGluZVsxXSA9PT0gJycpe1xuXHRcdFx0XHRwcm9qZWN0ID0gJypsb29wKic7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRwcm9qZWN0ID0gc3BsaXRfbGluZVsxXTtcblx0XHRcdH1cblx0XHRcdGxpc3Rlbl9vbl9ib290KCk7XG5cdFx0XHRyZXR1cm4gcHJvamVjdDtcblx0XHR9XG5cdH1cbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHNldF9ib290X3Byb2plY3Qoc29ja2V0OiBTb2NrZXRJTy5Tb2NrZXQsIHByb2plY3Q6ICBzdHJpbmcpe1xuXHRpZiAocHJvamVjdCA9PT0gJypub25lKicpe1xuXHRcdHJ1bl9vbl9ib290KHNvY2tldCwgW1xuXHRcdFx0Jy0tbm8tcHJpbnQtZGlyZWN0b3J5Jyxcblx0XHRcdCctQycsXG5cdFx0XHRwYXRocy5CZWxhLFxuXHRcdFx0J25vc3RhcnR1cCdcblx0XHRdKTtcblx0fSBlbHNlIGlmKHByb2plY3QgPT09ICcqbG9vcConKXtcblx0XHRydW5fb25fYm9vdChzb2NrZXQsIFtcblx0XHRcdCctLW5vLXByaW50LWRpcmVjdG9yeScsXG5cdFx0XHQnLUMnLFxuXHRcdFx0cGF0aHMuQmVsYSxcblx0XHRcdCdzdGFydHVwbG9vcCcsXG5cdFx0XHQnUFJPSkVDVD0nXG5cdFx0XSk7XG5cdH0gZWxzZSB7XG5cdFx0bGV0IHByb2plY3RfYXJnczoge0NMOiBzdHJpbmcsIG1ha2U6IHN0cmluZ1tdfSA9IGF3YWl0IHByb2plY3Rfc2V0dGluZ3MuZ2V0QXJncyhwcm9qZWN0KTtcblx0XHRsZXQgYXJnczogc3RyaW5nW10gPSBbXG5cdFx0XHQnLS1uby1wcmludC1kaXJlY3RvcnknLFxuXHRcdFx0Jy1DJyxcblx0XHRcdHBhdGhzLkJlbGEsXG5cdFx0XHQnc3RhcnR1cGxvb3AnLFxuXHRcdFx0J1BST0pFQ1Q9Jytwcm9qZWN0LFxuXHRcdFx0J0NMPVwiJytwcm9qZWN0X2FyZ3MuQ0wrJ1wiJ1xuXHRcdF07XG5cdFx0aWYgKHByb2plY3RfYXJncy5tYWtlKXtcblx0XHRcdGZvciAobGV0IGFyZyBvZiBwcm9qZWN0X2FyZ3MubWFrZSl7XG5cdFx0XHRcdGFyZ3MucHVzaChhcmcpO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRydW5fb25fYm9vdChzb2NrZXQsIGFyZ3MpO1xuXHR9XG59XG5cbmZ1bmN0aW9uIHJ1bl9vbl9ib290KHNvY2tldDogU29ja2V0SU8uU29ja2V0LCBhcmdzOiBzdHJpbmdbXSl7XG5cdGNvbnNvbGUubG9nKCdtYWtlICcrYXJncy5qb2luKCcgJykpO1xuXHRjaGlsZF9wcm9jZXNzLmV4ZWMoJ21ha2UgJythcmdzLmpvaW4oJyAnKSwgKGVyciwgc3Rkb3V0LCBzdGRlcnIpID0+IHtcblx0XHRpZiAoZXJyKSBjb25zb2xlLmxvZygnZXJyb3Igc2V0dGluZyBib290IHByb2plY3QnLCBlcnIpO1xuXHRcdGlmIChzdGRvdXQpIHNvY2tldC5lbWl0KCdydW4tb24tYm9vdC1sb2cnLCBzdGRvdXQpO1xuXHRcdGlmIChzdGRlcnIpIHNvY2tldC5lbWl0KCdydW4tb24tYm9vdC1sb2cnLCBzdGRlcnIpO1xuXHRcdHNvY2tldC5lbWl0KCdydW4tb24tYm9vdC1sb2cnLCAnZG9uZScpO1xuXHR9KTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gbGlzdGVuX29uX2Jvb3QoKXtcblx0bGV0IHZlcnNpb246IHN0cmluZyA9IGF3YWl0IElERS5nZXRfeGVub21haV92ZXJzaW9uKCk7XG5cdGlmICghdmVyc2lvbi5pbmNsdWRlcygnMi42Jykpe1xuXHRcdGxldCBwcm9jID0gY2hpbGRfcHJvY2Vzcy5zcGF3bignam91cm5hbGN0bCcsIFsnLWZ1JywgJ2JlbGFfc3RhcnR1cCddKTtcblx0XHRwcm9jLnN0ZG91dC5zZXRFbmNvZGluZygndXRmOCcpO1xuXHRcdHByb2Muc3Rkb3V0Lm9uKCdkYXRhJywgZGF0YSA9PiBzb2NrZXRfbWFuYWdlci5icm9hZGNhc3QoJ3J1bi1vbi1ib290LWxvZycsIGRhdGEpKTtcblx0XHRwcm9jLnN0ZGVyci5zZXRFbmNvZGluZygndXRmOCcpO1xuXHRcdHByb2Muc3RkZXJyLm9uKCdkYXRhJywgZGF0YSA9PiBzb2NrZXRfbWFuYWdlci5icm9hZGNhc3QoJ3J1bi1vbi1ib290LWxvZycsIGRhdGEpKTtcblx0fVxufVxuIl19
