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
var _this = this;
Object.defineProperty(exports, "__esModule", { value: true });
var child_process = require("child_process");
var file_manager = require("./FileManager");
var socket_manager = require("./SocketManager");
var processes = require("./IDEProcesses");
var paths = require("./paths");
var Lock_1 = require("./Lock");
var cpu_monitor = require("./CPUMonitor");
var lock = new Lock_1.Lock();
// this function gets called whenever the ace editor is modified
// the file data is saved robustly using a lockfile, and a syntax
// check started if the flag is set
function upload(data) {
    return __awaiter(this, void 0, void 0, function () {
        var e_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, lock.acquire()];
                case 1:
                    _a.sent();
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 4, , 5]);
                    return [4 /*yield*/, file_manager.save_file(paths.projects + data.currentProject + '/' + data.newFile, data.fileData, paths.lockfile)];
                case 3:
                    _a.sent();
                    if (data.checkSyntax) {
                        checkSyntax(data);
                    }
                    return [3 /*break*/, 5];
                case 4:
                    e_1 = _a.sent();
                    lock.release();
                    throw e_1;
                case 5:
                    lock.release();
                    return [2 /*return*/];
            }
        });
    });
}
exports.upload = upload;
// this function starts a syntax check
// if a syntax check or build process is in progress they are stopped
// a running program is not stopped
function checkSyntax(data) {
    if (processes.syntax.get_status()) {
        processes.syntax.stop();
        processes.syntax.queue(function () { return processes.syntax.start(data.currentProject); });
    }
    else if (processes.build.get_status()) {
        processes.build.stop();
        processes.build.queue(function () { return processes.syntax.start(data.currentProject); });
    }
    else {
        processes.syntax.start(data.currentProject);
    }
}
exports.checkSyntax = checkSyntax;
// this function is called when the run button is clicked
// if a program is already building or running it is stopped and restarted
// any syntax check in progress is stopped
function run(data) {
    if (processes.run.get_status()) {
        processes.run.stop();
        processes.run.queue(function () { return build_run(data.currentProject); });
    }
    else if (processes.build.get_status()) {
        processes.build.stop();
        processes.build.queue(function () { return build_run(data.currentProject); });
    }
    else if (processes.syntax.get_status()) {
        processes.syntax.stop();
        processes.syntax.queue(function () { return build_run(data.currentProject); });
    }
    else {
        build_run(data.currentProject);
    }
}
exports.run = run;
// this function starts a build process and when it ends it checks
// if it was stopped by a call to stop() or if there were build errors
// if neither of these are true the project is immediately run
function build_run(project) {
    processes.build.start(project);
    processes.build.queue(function (stderr, killed) {
        if (!killed && !build_error(stderr)) {
            processes.run.start(project);
        }
    });
}
// this function parses the stderr output of the build process 
// returning true if build errors (not warnings) are found
function build_error(stderr) {
    var lines = stderr.split('\n');
    for (var _i = 0, lines_1 = lines; _i < lines_1.length; _i++) {
        var line = lines_1[_i];
        var split_line = line.split(':');
        if (split_line.length >= 4) {
            if (split_line[3] === ' error' || split_line[3] === ' fatal error') {
                return true;
            }
            else if (split_line[3] === ' warning') {
                //console.log('warning');
            }
        }
    }
    return false;
}
// this function is called when the stop button is clicked
// it calls the stop() method of any running process
// if there is no running process, 'make stop' is called
function stop() {
    var stopped = false;
    if (processes.run.get_status()) {
        processes.run.stop();
        stopped = true;
    }
    if (processes.build.get_status()) {
        processes.build.stop();
        stopped = true;
    }
    if (processes.syntax.get_status()) {
        processes.syntax.stop();
        stopped = true;
    }
    if (!stopped) {
        console.log('make -C ' + paths.Bela + ' stop');
        child_process.exec('make -C ' + paths.Bela + ' stop');
    }
}
exports.stop = stop;
function get_status() {
    return {
        checkingSyntax: processes.syntax.get_status(),
        building: processes.build.get_status(),
        buildProject: (processes.build.get_status() ? processes.build.project : ''),
        running: processes.run.get_status(),
        runProject: (processes.run.get_status() ? processes.run.project : '')
    };
}
// each process emits start and finish events, which are handled here
processes.syntax.on('start', function (project) { return socket_manager.broadcast('status', get_status()); });
processes.syntax.on('finish', function (stderr) {
    var status = get_status();
    status.syntaxError = stderr;
    socket_manager.broadcast('status', status);
});
processes.build.on('start', function (project) { return socket_manager.broadcast('status', get_status()); });
processes.build.on('finish', function (stderr) {
    var status = get_status();
    status.syntaxError = stderr;
    socket_manager.broadcast('status', status);
});
processes.build.on('stdout', function (data) { return socket_manager.broadcast('status', { buildLog: data }); });
processes.run.on('start', function (pid, project) {
    socket_manager.broadcast('status', get_status());
    cpu_monitor.start(pid, project, function (cpu) { return __awaiter(_this, void 0, void 0, function () {
        var _a, _b, _c, _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    _b = (_a = socket_manager).broadcast;
                    _c = ['cpu-usage'];
                    _d = {};
                    return [4 /*yield*/, file_manager.read_file(paths.xenomai_stat).catch()];
                case 1:
                    _b.apply(_a, _c.concat([(_d.bela = _e.sent(),
                            _d.belaLinux = cpu,
                            _d)]));
                    return [2 /*return*/];
            }
        });
    }); });
});
processes.run.on('finish', function (project) {
    socket_manager.broadcast('status', get_status());
    cpu_monitor.stop();
});
processes.run.on('stdout', function (data) { return socket_manager.broadcast('status', { belaLog: data }); });
processes.run.on('stderr', function (data) { return socket_manager.broadcast('status', { belaLogErr: data }); });

//# sourceMappingURL=data:application/json;charset=utf8;base64,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QUFFLENBQUM7UUFDNUUsT0FBTyxFQUFJLFNBQVMsQ0FBQyxHQUFHLENBQUMsVUFBVSxFQUFFO1FBQ3JDLFVBQVUsRUFBRyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7S0FDdEUsQ0FBQztBQUNILENBQUM7QUFFRCxxRUFBcUU7QUFDckUsU0FBUyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsT0FBTyxFQUFFLFVBQUMsT0FBZSxJQUFLLE9BQUEsY0FBYyxDQUFDLFNBQVMsQ0FBQyxRQUFRLEVBQUUsVUFBVSxFQUFFLENBQUMsRUFBaEQsQ0FBZ0QsQ0FBRSxDQUFDO0FBQ3JHLFNBQVMsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLFFBQVEsRUFBRSxVQUFDLE1BQWM7SUFDNUMsSUFBSSxNQUFNLEdBQXdCLFVBQVUsRUFBRSxDQUFDO0lBQy9DLE1BQU0sQ0FBQyxXQUFXLEdBQUcsTUFBTSxDQUFDO0lBQzVCLGNBQWMsQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLE1BQU0sQ0FBQyxDQUFDO0FBQzVDLENBQUMsQ0FBQyxDQUFDO0FBRUgsU0FBUyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsT0FBTyxFQUFFLFVBQUMsT0FBZSxJQUFLLE9BQUEsY0FBYyxDQUFDLFNBQVMsQ0FBQyxRQUFRLEVBQUUsVUFBVSxFQUFFLENBQUMsRUFBaEQsQ0FBZ0QsQ0FBRSxDQUFDO0FBQ3BHLFNBQVMsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLFFBQVEsRUFBRSxVQUFDLE1BQWM7SUFDM0MsSUFBSSxNQUFNLEdBQXdCLFVBQVUsRUFBRSxDQUFDO0lBQy9DLE1BQU0sQ0FBQyxXQUFXLEdBQUcsTUFBTSxDQUFDO0lBQzVCLGNBQWMsQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLE1BQU0sQ0FBQyxDQUFDO0FBQzVDLENBQUMsQ0FBQyxDQUFDO0FBQ0gsU0FBUyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsUUFBUSxFQUFFLFVBQUMsSUFBSSxJQUFLLE9BQUEsY0FBYyxDQUFDLFNBQVMsQ0FBQyxRQUFRLEVBQUUsRUFBQyxRQUFRLEVBQUUsSUFBSSxFQUFDLENBQUMsRUFBcEQsQ0FBb0QsQ0FBRSxDQUFDO0FBRTlGLFNBQVMsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLE9BQU8sRUFBRSxVQUFDLEdBQVcsRUFBRSxPQUFlO0lBQ3RELGNBQWMsQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLFVBQVUsRUFBRSxDQUFDLENBQUM7SUFDakQsV0FBVyxDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUUsT0FBTyxFQUFFLFVBQU0sR0FBRzs7Ozs7b0JBQ3hDLEtBQUEsQ0FBQSxLQUFBLGNBQWMsQ0FBQSxDQUFDLFNBQVMsQ0FBQTswQkFBQyxXQUFXOztvQkFDN0IscUJBQU0sWUFBWSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUE7O29CQUQvRCx5QkFDQyxPQUFJLEdBQUUsU0FBd0Q7NEJBQzlELFlBQVMsR0FBRSxHQUFHO2tDQUNiLENBQUM7Ozs7U0FDSCxDQUFDLENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQztBQUNILFNBQVMsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLFFBQVEsRUFBRSxVQUFDLE9BQWU7SUFDMUMsY0FBYyxDQUFDLFNBQVMsQ0FBQyxRQUFRLEVBQUUsVUFBVSxFQUFFLENBQUMsQ0FBQztJQUNqRCxXQUFXLENBQUMsSUFBSSxFQUFFLENBQUM7QUFDcEIsQ0FBQyxDQUFDLENBQUM7QUFDSCxTQUFTLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUUsVUFBQyxJQUFJLElBQUssT0FBQSxjQUFjLENBQUMsU0FBUyxDQUFDLFFBQVEsRUFBRSxFQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUMsQ0FBQyxFQUFuRCxDQUFtRCxDQUFFLENBQUM7QUFDM0YsU0FBUyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsUUFBUSxFQUFFLFVBQUMsSUFBSSxJQUFLLE9BQUEsY0FBYyxDQUFDLFNBQVMsQ0FBQyxRQUFRLEVBQUUsRUFBQyxVQUFVLEVBQUUsSUFBSSxFQUFDLENBQUMsRUFBdEQsQ0FBc0QsQ0FBRSxDQUFDIiwiZmlsZSI6IlByb2Nlc3NNYW5hZ2VyLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2hpbGRfcHJvY2VzcyBmcm9tICdjaGlsZF9wcm9jZXNzJztcbmltcG9ydCAqIGFzIGZpbGVfbWFuYWdlciBmcm9tICcuL0ZpbGVNYW5hZ2VyJztcbmltcG9ydCAqIGFzIHNvY2tldF9tYW5hZ2VyIGZyb20gJy4vU29ja2V0TWFuYWdlcic7XG5pbXBvcnQgKiBhcyBwcm9jZXNzZXMgZnJvbSAnLi9JREVQcm9jZXNzZXMnO1xuaW1wb3J0ICogYXMgcGF0aHMgZnJvbSAnLi9wYXRocyc7XG5pbXBvcnQgKiBhcyB1dGlsIGZyb20gJy4vdXRpbHMnO1xuaW1wb3J0IHsgTG9jayB9IGZyb20gJy4vTG9jayc7XG5pbXBvcnQgKiBhcyBjcHVfbW9uaXRvciBmcm9tICcuL0NQVU1vbml0b3InO1xuXG5jb25zdCBsb2NrOiBMb2NrID0gbmV3IExvY2soKTtcblxuLy8gdGhpcyBmdW5jdGlvbiBnZXRzIGNhbGxlZCB3aGVuZXZlciB0aGUgYWNlIGVkaXRvciBpcyBtb2RpZmllZFxuLy8gdGhlIGZpbGUgZGF0YSBpcyBzYXZlZCByb2J1c3RseSB1c2luZyBhIGxvY2tmaWxlLCBhbmQgYSBzeW50YXhcbi8vIGNoZWNrIHN0YXJ0ZWQgaWYgdGhlIGZsYWcgaXMgc2V0XG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gdXBsb2FkKGRhdGE6IGFueSl7XG5cdGF3YWl0IGxvY2suYWNxdWlyZSgpO1xuXHR0cnl7XG5cdFx0YXdhaXQgZmlsZV9tYW5hZ2VyLnNhdmVfZmlsZShwYXRocy5wcm9qZWN0cytkYXRhLmN1cnJlbnRQcm9qZWN0KycvJytkYXRhLm5ld0ZpbGUsIGRhdGEuZmlsZURhdGEsIHBhdGhzLmxvY2tmaWxlKTtcblx0XHRpZiAoZGF0YS5jaGVja1N5bnRheCl7XG5cdFx0XHRjaGVja1N5bnRheChkYXRhKTtcblx0XHR9XG5cdH1cblx0Y2F0Y2goZSl7XG5cdFx0bG9jay5yZWxlYXNlKCk7XG5cdFx0dGhyb3cgZTtcblx0fVxuXHRsb2NrLnJlbGVhc2UoKTtcbn1cblxuLy8gdGhpcyBmdW5jdGlvbiBzdGFydHMgYSBzeW50YXggY2hlY2tcbi8vIGlmIGEgc3ludGF4IGNoZWNrIG9yIGJ1aWxkIHByb2Nlc3MgaXMgaW4gcHJvZ3Jlc3MgdGhleSBhcmUgc3RvcHBlZFxuLy8gYSBydW5uaW5nIHByb2dyYW0gaXMgbm90IHN0b3BwZWRcbmV4cG9ydCBmdW5jdGlvbiBjaGVja1N5bnRheChkYXRhOiBhbnkpe1xuXHRpZiAocHJvY2Vzc2VzLnN5bnRheC5nZXRfc3RhdHVzKCkpe1xuXHRcdHByb2Nlc3Nlcy5zeW50YXguc3RvcCgpO1xuXHRcdHByb2Nlc3Nlcy5zeW50YXgucXVldWUoKCkgPT4gcHJvY2Vzc2VzLnN5bnRheC5zdGFydChkYXRhLmN1cnJlbnRQcm9qZWN0KSk7XG5cdH0gZWxzZSBpZiAocHJvY2Vzc2VzLmJ1aWxkLmdldF9zdGF0dXMoKSl7XG5cdFx0cHJvY2Vzc2VzLmJ1aWxkLnN0b3AoKTtcblx0XHRwcm9jZXNzZXMuYnVpbGQucXVldWUoICgpID0+IHByb2Nlc3Nlcy5zeW50YXguc3RhcnQoZGF0YS5jdXJyZW50UHJvamVjdCkgKTtcblx0fSBlbHNlIHtcblx0XHRwcm9jZXNzZXMuc3ludGF4LnN0YXJ0KGRhdGEuY3VycmVudFByb2plY3QpO1xuXHR9XG59XG5cbi8vIHRoaXMgZnVuY3Rpb24gaXMgY2FsbGVkIHdoZW4gdGhlIHJ1biBidXR0b24gaXMgY2xpY2tlZFxuLy8gaWYgYSBwcm9ncmFtIGlzIGFscmVhZHkgYnVpbGRpbmcgb3IgcnVubmluZyBpdCBpcyBzdG9wcGVkIGFuZCByZXN0YXJ0ZWRcbi8vIGFueSBzeW50YXggY2hlY2sgaW4gcHJvZ3Jlc3MgaXMgc3RvcHBlZFxuZXhwb3J0IGZ1bmN0aW9uIHJ1bihkYXRhOiBhbnkpe1xuXHRpZiAocHJvY2Vzc2VzLnJ1bi5nZXRfc3RhdHVzKCkpe1xuXHRcdHByb2Nlc3Nlcy5ydW4uc3RvcCgpO1xuXHRcdHByb2Nlc3Nlcy5ydW4ucXVldWUoICgpID0+IGJ1aWxkX3J1bihkYXRhLmN1cnJlbnRQcm9qZWN0KSApO1xuXHR9IGVsc2UgaWYgKHByb2Nlc3Nlcy5idWlsZC5nZXRfc3RhdHVzKCkpe1xuXHRcdHByb2Nlc3Nlcy5idWlsZC5zdG9wKCk7XG5cdFx0cHJvY2Vzc2VzLmJ1aWxkLnF1ZXVlKCAoKSA9PiBidWlsZF9ydW4oZGF0YS5jdXJyZW50UHJvamVjdCkgKTtcblx0fSBlbHNlIGlmIChwcm9jZXNzZXMuc3ludGF4LmdldF9zdGF0dXMoKSl7XG5cdFx0cHJvY2Vzc2VzLnN5bnRheC5zdG9wKCk7XG5cdFx0cHJvY2Vzc2VzLnN5bnRheC5xdWV1ZSggKCkgPT4gYnVpbGRfcnVuKGRhdGEuY3VycmVudFByb2plY3QpICk7XHRcblx0fSBlbHNlIHtcblx0XHRidWlsZF9ydW4oZGF0YS5jdXJyZW50UHJvamVjdCk7XG5cdH1cbn1cblxuLy8gdGhpcyBmdW5jdGlvbiBzdGFydHMgYSBidWlsZCBwcm9jZXNzIGFuZCB3aGVuIGl0IGVuZHMgaXQgY2hlY2tzXG4vLyBpZiBpdCB3YXMgc3RvcHBlZCBieSBhIGNhbGwgdG8gc3RvcCgpIG9yIGlmIHRoZXJlIHdlcmUgYnVpbGQgZXJyb3JzXG4vLyBpZiBuZWl0aGVyIG9mIHRoZXNlIGFyZSB0cnVlIHRoZSBwcm9qZWN0IGlzIGltbWVkaWF0ZWx5IHJ1blxuZnVuY3Rpb24gYnVpbGRfcnVuKHByb2plY3Q6IHN0cmluZyl7XG5cdHByb2Nlc3Nlcy5idWlsZC5zdGFydChwcm9qZWN0KTtcblx0cHJvY2Vzc2VzLmJ1aWxkLnF1ZXVlKCAoc3RkZXJyOiBzdHJpbmcsIGtpbGxlZDogYm9vbGVhbikgPT4ge1xuXHRcdGlmICgha2lsbGVkICYmICFidWlsZF9lcnJvcihzdGRlcnIpKXtcblx0XHRcdHByb2Nlc3Nlcy5ydW4uc3RhcnQocHJvamVjdCk7IFxuXHRcdH1cblx0fSk7XG59XG5cbi8vIHRoaXMgZnVuY3Rpb24gcGFyc2VzIHRoZSBzdGRlcnIgb3V0cHV0IG9mIHRoZSBidWlsZCBwcm9jZXNzIFxuLy8gcmV0dXJuaW5nIHRydWUgaWYgYnVpbGQgZXJyb3JzIChub3Qgd2FybmluZ3MpIGFyZSBmb3VuZFxuZnVuY3Rpb24gYnVpbGRfZXJyb3Ioc3RkZXJyOiBzdHJpbmcpOiBib29sZWFuIHtcblx0bGV0IGxpbmVzOiBzdHJpbmdbXSA9IHN0ZGVyci5zcGxpdCgnXFxuJyk7XG5cdGZvciAobGV0IGxpbmUgb2YgbGluZXMpe1xuXHRcdGxldCBzcGxpdF9saW5lOiBzdHJpbmdbXSA9IGxpbmUuc3BsaXQoJzonKTtcblx0XHRpZiAoc3BsaXRfbGluZS5sZW5ndGggPj0gNCl7XG5cdFx0XHRpZiAoc3BsaXRfbGluZVszXSA9PT0gJyBlcnJvcicgfHwgc3BsaXRfbGluZVszXSA9PT0gJyBmYXRhbCBlcnJvcicpe1xuXHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdH0gZWxzZSBpZiAoc3BsaXRfbGluZVszXSA9PT0gJyB3YXJuaW5nJyl7XG5cdFx0XHRcdC8vY29uc29sZS5sb2coJ3dhcm5pbmcnKTtcblx0XHRcdH1cblx0XHR9XG5cdH1cblx0cmV0dXJuIGZhbHNlO1xufVxuXG5cbi8vIHRoaXMgZnVuY3Rpb24gaXMgY2FsbGVkIHdoZW4gdGhlIHN0b3AgYnV0dG9uIGlzIGNsaWNrZWRcbi8vIGl0IGNhbGxzIHRoZSBzdG9wKCkgbWV0aG9kIG9mIGFueSBydW5uaW5nIHByb2Nlc3Ncbi8vIGlmIHRoZXJlIGlzIG5vIHJ1bm5pbmcgcHJvY2VzcywgJ21ha2Ugc3RvcCcgaXMgY2FsbGVkXG5leHBvcnQgZnVuY3Rpb24gc3RvcCgpe1xuXHRsZXQgc3RvcHBlZDogYm9vbGVhbiA9IGZhbHNlO1xuXHRpZiAocHJvY2Vzc2VzLnJ1bi5nZXRfc3RhdHVzKCkpe1xuXHRcdHByb2Nlc3Nlcy5ydW4uc3RvcCgpO1xuXHRcdHN0b3BwZWQgPSB0cnVlO1xuXHR9XG5cdGlmIChwcm9jZXNzZXMuYnVpbGQuZ2V0X3N0YXR1cygpKXtcblx0XHRwcm9jZXNzZXMuYnVpbGQuc3RvcCgpO1xuXHRcdHN0b3BwZWQgPSB0cnVlO1xuXHR9XG5cdGlmIChwcm9jZXNzZXMuc3ludGF4LmdldF9zdGF0dXMoKSl7XG5cdFx0cHJvY2Vzc2VzLnN5bnRheC5zdG9wKCk7XG5cdFx0c3RvcHBlZCA9IHRydWU7XG5cdH1cblx0aWYgKCFzdG9wcGVkKXtcblx0XHRjb25zb2xlLmxvZygnbWFrZSAtQyAnK3BhdGhzLkJlbGErJyBzdG9wJyk7XG5cdFx0Y2hpbGRfcHJvY2Vzcy5leGVjKCdtYWtlIC1DICcrcGF0aHMuQmVsYSsnIHN0b3AnKTtcdFxuXHR9XG59XG5cbmZ1bmN0aW9uIGdldF9zdGF0dXMoKTogdXRpbC5Qcm9jZXNzX1N0YXR1cyB7XG5cdHJldHVybiB7XG5cdFx0Y2hlY2tpbmdTeW50YXhcdDogcHJvY2Vzc2VzLnN5bnRheC5nZXRfc3RhdHVzKCksXG5cdFx0YnVpbGRpbmdcdDogcHJvY2Vzc2VzLmJ1aWxkLmdldF9zdGF0dXMoKSxcblx0XHRidWlsZFByb2plY3RcdDogKHByb2Nlc3Nlcy5idWlsZC5nZXRfc3RhdHVzKCkgPyBwcm9jZXNzZXMuYnVpbGQucHJvamVjdCA6ICcnKSxcblx0XHRydW5uaW5nXHRcdDogcHJvY2Vzc2VzLnJ1bi5nZXRfc3RhdHVzKCksXG5cdFx0cnVuUHJvamVjdFx0OiAocHJvY2Vzc2VzLnJ1bi5nZXRfc3RhdHVzKCkgPyBwcm9jZXNzZXMucnVuLnByb2plY3QgOiAnJylcblx0fTtcbn1cblxuLy8gZWFjaCBwcm9jZXNzIGVtaXRzIHN0YXJ0IGFuZCBmaW5pc2ggZXZlbnRzLCB3aGljaCBhcmUgaGFuZGxlZCBoZXJlXG5wcm9jZXNzZXMuc3ludGF4Lm9uKCdzdGFydCcsIChwcm9qZWN0OiBzdHJpbmcpID0+IHNvY2tldF9tYW5hZ2VyLmJyb2FkY2FzdCgnc3RhdHVzJywgZ2V0X3N0YXR1cygpKSApO1xucHJvY2Vzc2VzLnN5bnRheC5vbignZmluaXNoJywgKHN0ZGVycjogc3RyaW5nKSA9PiB7XG5cdGxldCBzdGF0dXM6IHV0aWwuUHJvY2Vzc19TdGF0dXMgPSBnZXRfc3RhdHVzKCk7XG5cdHN0YXR1cy5zeW50YXhFcnJvciA9IHN0ZGVycjtcblx0c29ja2V0X21hbmFnZXIuYnJvYWRjYXN0KCdzdGF0dXMnLCBzdGF0dXMpO1xufSk7XG5cbnByb2Nlc3Nlcy5idWlsZC5vbignc3RhcnQnLCAocHJvamVjdDogc3RyaW5nKSA9PiBzb2NrZXRfbWFuYWdlci5icm9hZGNhc3QoJ3N0YXR1cycsIGdldF9zdGF0dXMoKSkgKTtcbnByb2Nlc3Nlcy5idWlsZC5vbignZmluaXNoJywgKHN0ZGVycjogc3RyaW5nKSA9PiB7XG5cdGxldCBzdGF0dXM6IHV0aWwuUHJvY2Vzc19TdGF0dXMgPSBnZXRfc3RhdHVzKCk7XG5cdHN0YXR1cy5zeW50YXhFcnJvciA9IHN0ZGVycjtcblx0c29ja2V0X21hbmFnZXIuYnJvYWRjYXN0KCdzdGF0dXMnLCBzdGF0dXMpO1xufSk7XG5wcm9jZXNzZXMuYnVpbGQub24oJ3N0ZG91dCcsIChkYXRhKSA9PiBzb2NrZXRfbWFuYWdlci5icm9hZGNhc3QoJ3N0YXR1cycsIHtidWlsZExvZzogZGF0YX0pICk7XG5cbnByb2Nlc3Nlcy5ydW4ub24oJ3N0YXJ0JywgKHBpZDogbnVtYmVyLCBwcm9qZWN0OiBzdHJpbmcpID0+IHtcblx0c29ja2V0X21hbmFnZXIuYnJvYWRjYXN0KCdzdGF0dXMnLCBnZXRfc3RhdHVzKCkpO1xuXHRjcHVfbW9uaXRvci5zdGFydChwaWQsIHByb2plY3QsIGFzeW5jIGNwdSA9PiB7XG5cdFx0c29ja2V0X21hbmFnZXIuYnJvYWRjYXN0KCdjcHUtdXNhZ2UnLCB7XG5cdFx0XHRiZWxhOiBhd2FpdCBmaWxlX21hbmFnZXIucmVhZF9maWxlKHBhdGhzLnhlbm9tYWlfc3RhdCkuY2F0Y2goKSxcblx0XHRcdGJlbGFMaW51eDogY3B1XG5cdFx0fSk7XG5cdH0pO1xufSk7XG5wcm9jZXNzZXMucnVuLm9uKCdmaW5pc2gnLCAocHJvamVjdDogc3RyaW5nKSA9PiB7XG5cdHNvY2tldF9tYW5hZ2VyLmJyb2FkY2FzdCgnc3RhdHVzJywgZ2V0X3N0YXR1cygpKTtcblx0Y3B1X21vbml0b3Iuc3RvcCgpO1xufSk7XG5wcm9jZXNzZXMucnVuLm9uKCdzdGRvdXQnLCAoZGF0YSkgPT4gc29ja2V0X21hbmFnZXIuYnJvYWRjYXN0KCdzdGF0dXMnLCB7YmVsYUxvZzogZGF0YX0pICk7XG5wcm9jZXNzZXMucnVuLm9uKCdzdGRlcnInLCAoZGF0YSkgPT4gc29ja2V0X21hbmFnZXIuYnJvYWRjYXN0KCdzdGF0dXMnLCB7YmVsYUxvZ0VycjogZGF0YX0pICk7XG4iXX0=
