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
var child_process = require("child_process");
var file_manager = require("./FileManager");
var socket_manager = require("./SocketManager");
var processes = require("./IDEProcesses");
var paths = require("./paths");
var Lock_1 = require("./Lock");
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
        if (line.length > 4) {
            if (line[3] === ' error' || line[3] === ' fatal error') {
                return true;
            }
            else if (line[3] === ' warning') {
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
processes.run.on('start', function (project) { return socket_manager.broadcast('status', get_status()); });
processes.run.on('finish', function (project) { return socket_manager.broadcast('status', get_status()); });
processes.run.on('stdout', function (data) { return socket_manager.broadcast('status', { belaLog: data }); });
processes.run.on('stderr', function (data) { return socket_manager.broadcast('status', { belaLogErr: data }); });

//# sourceMappingURL=data:application/json;charset=utf8;base64,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QUssT0FBQSxjQUFjLENBQUMsU0FBUyxDQUFDLFFBQVEsRUFBRSxFQUFDLFFBQVEsRUFBRSxJQUFJLEVBQUMsQ0FBQyxFQUFwRCxDQUFvRCxDQUFFLENBQUM7QUFFOUYsU0FBUyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsT0FBTyxFQUFFLFVBQUMsT0FBZSxJQUFLLE9BQUEsY0FBYyxDQUFDLFNBQVMsQ0FBQyxRQUFRLEVBQUUsVUFBVSxFQUFFLENBQUMsRUFBaEQsQ0FBZ0QsQ0FBRSxDQUFDO0FBQ2xHLFNBQVMsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLFFBQVEsRUFBRSxVQUFDLE9BQWUsSUFBSyxPQUFBLGNBQWMsQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLFVBQVUsRUFBRSxDQUFDLEVBQWhELENBQWdELENBQUUsQ0FBQztBQUNuRyxTQUFTLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUUsVUFBQyxJQUFJLElBQUssT0FBQSxjQUFjLENBQUMsU0FBUyxDQUFDLFFBQVEsRUFBRSxFQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUMsQ0FBQyxFQUFuRCxDQUFtRCxDQUFFLENBQUM7QUFDM0YsU0FBUyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsUUFBUSxFQUFFLFVBQUMsSUFBSSxJQUFLLE9BQUEsY0FBYyxDQUFDLFNBQVMsQ0FBQyxRQUFRLEVBQUUsRUFBQyxVQUFVLEVBQUUsSUFBSSxFQUFDLENBQUMsRUFBdEQsQ0FBc0QsQ0FBRSxDQUFDIiwiZmlsZSI6IlByb2Nlc3NNYW5hZ2VyLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2hpbGRfcHJvY2VzcyBmcm9tICdjaGlsZF9wcm9jZXNzJztcbmltcG9ydCAqIGFzIGZpbGVfbWFuYWdlciBmcm9tICcuL0ZpbGVNYW5hZ2VyJztcbmltcG9ydCAqIGFzIHNvY2tldF9tYW5hZ2VyIGZyb20gJy4vU29ja2V0TWFuYWdlcic7XG5pbXBvcnQgKiBhcyBwcm9jZXNzZXMgZnJvbSAnLi9JREVQcm9jZXNzZXMnO1xuaW1wb3J0ICogYXMgcGF0aHMgZnJvbSAnLi9wYXRocyc7XG5pbXBvcnQgeyBMb2NrIH0gZnJvbSAnLi9Mb2NrJztcblxuY29uc3QgbG9jazogTG9jayA9IG5ldyBMb2NrKCk7XG5cbi8vIHRoaXMgZnVuY3Rpb24gZ2V0cyBjYWxsZWQgd2hlbmV2ZXIgdGhlIGFjZSBlZGl0b3IgaXMgbW9kaWZpZWRcbi8vIHRoZSBmaWxlIGRhdGEgaXMgc2F2ZWQgcm9idXN0bHkgdXNpbmcgYSBsb2NrZmlsZSwgYW5kIGEgc3ludGF4XG4vLyBjaGVjayBzdGFydGVkIGlmIHRoZSBmbGFnIGlzIHNldFxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHVwbG9hZChkYXRhOiBhbnkpe1xuXHRhd2FpdCBsb2NrLmFjcXVpcmUoKTtcblx0dHJ5e1xuXHRcdGF3YWl0IGZpbGVfbWFuYWdlci5zYXZlX2ZpbGUocGF0aHMucHJvamVjdHMrZGF0YS5jdXJyZW50UHJvamVjdCsnLycrZGF0YS5uZXdGaWxlLCBkYXRhLmZpbGVEYXRhLCBwYXRocy5sb2NrZmlsZSk7XG5cdFx0aWYgKGRhdGEuY2hlY2tTeW50YXgpe1xuXHRcdFx0Y2hlY2tTeW50YXgoZGF0YSk7XG5cdFx0fVxuXHR9XG5cdGNhdGNoKGUpe1xuXHRcdGxvY2sucmVsZWFzZSgpO1xuXHRcdHRocm93IGU7XG5cdH1cblx0bG9jay5yZWxlYXNlKCk7XG59XG5cbi8vIHRoaXMgZnVuY3Rpb24gc3RhcnRzIGEgc3ludGF4IGNoZWNrXG4vLyBpZiBhIHN5bnRheCBjaGVjayBvciBidWlsZCBwcm9jZXNzIGlzIGluIHByb2dyZXNzIHRoZXkgYXJlIHN0b3BwZWRcbi8vIGEgcnVubmluZyBwcm9ncmFtIGlzIG5vdCBzdG9wcGVkXG5leHBvcnQgZnVuY3Rpb24gY2hlY2tTeW50YXgoZGF0YTogYW55KXtcblx0aWYgKHByb2Nlc3Nlcy5zeW50YXguZ2V0X3N0YXR1cygpKXtcblx0XHRwcm9jZXNzZXMuc3ludGF4LnN0b3AoKTtcblx0XHRwcm9jZXNzZXMuc3ludGF4LnF1ZXVlKCgpID0+IHByb2Nlc3Nlcy5zeW50YXguc3RhcnQoZGF0YS5jdXJyZW50UHJvamVjdCkpO1xuXHR9IGVsc2UgaWYgKHByb2Nlc3Nlcy5idWlsZC5nZXRfc3RhdHVzKCkpe1xuXHRcdHByb2Nlc3Nlcy5idWlsZC5zdG9wKCk7XG5cdFx0cHJvY2Vzc2VzLmJ1aWxkLnF1ZXVlKCAoKSA9PiBwcm9jZXNzZXMuc3ludGF4LnN0YXJ0KGRhdGEuY3VycmVudFByb2plY3QpICk7XG5cdH0gZWxzZSB7XG5cdFx0cHJvY2Vzc2VzLnN5bnRheC5zdGFydChkYXRhLmN1cnJlbnRQcm9qZWN0KTtcblx0fVxufVxuXG4vLyB0aGlzIGZ1bmN0aW9uIGlzIGNhbGxlZCB3aGVuIHRoZSBydW4gYnV0dG9uIGlzIGNsaWNrZWRcbi8vIGlmIGEgcHJvZ3JhbSBpcyBhbHJlYWR5IGJ1aWxkaW5nIG9yIHJ1bm5pbmcgaXQgaXMgc3RvcHBlZCBhbmQgcmVzdGFydGVkXG4vLyBhbnkgc3ludGF4IGNoZWNrIGluIHByb2dyZXNzIGlzIHN0b3BwZWRcbmV4cG9ydCBmdW5jdGlvbiBydW4oZGF0YTogYW55KXtcblx0aWYgKHByb2Nlc3Nlcy5ydW4uZ2V0X3N0YXR1cygpKXtcblx0XHRwcm9jZXNzZXMucnVuLnN0b3AoKTtcblx0XHRwcm9jZXNzZXMucnVuLnF1ZXVlKCAoKSA9PiBidWlsZF9ydW4oZGF0YS5jdXJyZW50UHJvamVjdCkgKTtcblx0fSBlbHNlIGlmIChwcm9jZXNzZXMuYnVpbGQuZ2V0X3N0YXR1cygpKXtcblx0XHRwcm9jZXNzZXMuYnVpbGQuc3RvcCgpO1xuXHRcdHByb2Nlc3Nlcy5idWlsZC5xdWV1ZSggKCkgPT4gYnVpbGRfcnVuKGRhdGEuY3VycmVudFByb2plY3QpICk7XG5cdH0gZWxzZSBpZiAocHJvY2Vzc2VzLnN5bnRheC5nZXRfc3RhdHVzKCkpe1xuXHRcdHByb2Nlc3Nlcy5zeW50YXguc3RvcCgpO1xuXHRcdHByb2Nlc3Nlcy5zeW50YXgucXVldWUoICgpID0+IGJ1aWxkX3J1bihkYXRhLmN1cnJlbnRQcm9qZWN0KSApO1x0XG5cdH0gZWxzZSB7XG5cdFx0YnVpbGRfcnVuKGRhdGEuY3VycmVudFByb2plY3QpO1xuXHR9XG59XG5cbi8vIHRoaXMgZnVuY3Rpb24gc3RhcnRzIGEgYnVpbGQgcHJvY2VzcyBhbmQgd2hlbiBpdCBlbmRzIGl0IGNoZWNrc1xuLy8gaWYgaXQgd2FzIHN0b3BwZWQgYnkgYSBjYWxsIHRvIHN0b3AoKSBvciBpZiB0aGVyZSB3ZXJlIGJ1aWxkIGVycm9yc1xuLy8gaWYgbmVpdGhlciBvZiB0aGVzZSBhcmUgdHJ1ZSB0aGUgcHJvamVjdCBpcyBpbW1lZGlhdGVseSBydW5cbmZ1bmN0aW9uIGJ1aWxkX3J1bihwcm9qZWN0OiBzdHJpbmcpe1xuXHRwcm9jZXNzZXMuYnVpbGQuc3RhcnQocHJvamVjdCk7XG5cdHByb2Nlc3Nlcy5idWlsZC5xdWV1ZSggKHN0ZGVycjogc3RyaW5nLCBraWxsZWQ6IGJvb2xlYW4pID0+IHtcblx0XHRpZiAoIWtpbGxlZCAmJiAhYnVpbGRfZXJyb3Ioc3RkZXJyKSl7XG5cdFx0XHRwcm9jZXNzZXMucnVuLnN0YXJ0KHByb2plY3QpOyBcblx0XHR9XG5cdH0pO1xufVxuXG4vLyB0aGlzIGZ1bmN0aW9uIHBhcnNlcyB0aGUgc3RkZXJyIG91dHB1dCBvZiB0aGUgYnVpbGQgcHJvY2VzcyBcbi8vIHJldHVybmluZyB0cnVlIGlmIGJ1aWxkIGVycm9ycyAobm90IHdhcm5pbmdzKSBhcmUgZm91bmRcbmZ1bmN0aW9uIGJ1aWxkX2Vycm9yKHN0ZGVycjogc3RyaW5nKTogYm9vbGVhbiB7XG5cdGxldCBsaW5lczogc3RyaW5nW10gPSBzdGRlcnIuc3BsaXQoJ1xcbicpO1xuXHRmb3IgKGxldCBsaW5lIG9mIGxpbmVzKXtcblx0XHRsZXQgc3BsaXRfbGluZTogc3RyaW5nW10gPSBsaW5lLnNwbGl0KCc6Jyk7XG5cdFx0aWYgKGxpbmUubGVuZ3RoID4gNCl7XG5cdFx0XHRpZiAobGluZVszXSA9PT0gJyBlcnJvcicgfHwgbGluZVszXSA9PT0gJyBmYXRhbCBlcnJvcicpe1xuXHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdH0gZWxzZSBpZiAobGluZVszXSA9PT0gJyB3YXJuaW5nJyl7XG5cdFx0XHRcdC8vY29uc29sZS5sb2coJ3dhcm5pbmcnKTtcblx0XHRcdH1cblx0XHR9XG5cdH1cblx0cmV0dXJuIGZhbHNlO1xufVxuXG5cbi8vIHRoaXMgZnVuY3Rpb24gaXMgY2FsbGVkIHdoZW4gdGhlIHN0b3AgYnV0dG9uIGlzIGNsaWNrZWRcbi8vIGl0IGNhbGxzIHRoZSBzdG9wKCkgbWV0aG9kIG9mIGFueSBydW5uaW5nIHByb2Nlc3Ncbi8vIGlmIHRoZXJlIGlzIG5vIHJ1bm5pbmcgcHJvY2VzcywgJ21ha2Ugc3RvcCcgaXMgY2FsbGVkXG5leHBvcnQgZnVuY3Rpb24gc3RvcCgpe1xuXHRsZXQgc3RvcHBlZDogYm9vbGVhbiA9IGZhbHNlO1xuXHRpZiAocHJvY2Vzc2VzLnJ1bi5nZXRfc3RhdHVzKCkpe1xuXHRcdHByb2Nlc3Nlcy5ydW4uc3RvcCgpO1xuXHRcdHN0b3BwZWQgPSB0cnVlO1xuXHR9XG5cdGlmIChwcm9jZXNzZXMuYnVpbGQuZ2V0X3N0YXR1cygpKXtcblx0XHRwcm9jZXNzZXMuYnVpbGQuc3RvcCgpO1xuXHRcdHN0b3BwZWQgPSB0cnVlO1xuXHR9XG5cdGlmIChwcm9jZXNzZXMuc3ludGF4LmdldF9zdGF0dXMoKSl7XG5cdFx0cHJvY2Vzc2VzLnN5bnRheC5zdG9wKCk7XG5cdFx0c3RvcHBlZCA9IHRydWU7XG5cdH1cblx0aWYgKCFzdG9wcGVkKXtcblx0XHRjb25zb2xlLmxvZygnbWFrZSAtQyAnK3BhdGhzLkJlbGErJyBzdG9wJyk7XG5cdFx0Y2hpbGRfcHJvY2Vzcy5leGVjKCdtYWtlIC1DICcrcGF0aHMuQmVsYSsnIHN0b3AnKTtcdFxuXHR9XG59XG5cbmZ1bmN0aW9uIGdldF9zdGF0dXMoKXtcblx0cmV0dXJuIHtcblx0XHRjaGVja2luZ1N5bnRheFx0OiBwcm9jZXNzZXMuc3ludGF4LmdldF9zdGF0dXMoKSxcblx0XHRidWlsZGluZ1x0OiBwcm9jZXNzZXMuYnVpbGQuZ2V0X3N0YXR1cygpLFxuXHRcdGJ1aWxkUHJvamVjdFx0OiAocHJvY2Vzc2VzLmJ1aWxkLmdldF9zdGF0dXMoKSA/IHByb2Nlc3Nlcy5idWlsZC5wcm9qZWN0IDogJycpLFxuXHRcdHJ1bm5pbmdcdFx0OiBwcm9jZXNzZXMucnVuLmdldF9zdGF0dXMoKSxcblx0XHRydW5Qcm9qZWN0XHQ6IChwcm9jZXNzZXMucnVuLmdldF9zdGF0dXMoKSA/IHByb2Nlc3Nlcy5ydW4ucHJvamVjdCA6ICcnKVxuXHR9O1xufVxuXG4vLyBlYWNoIHByb2Nlc3MgZW1pdHMgc3RhcnQgYW5kIGZpbmlzaCBldmVudHMsIHdoaWNoIGFyZSBoYW5kbGVkIGhlcmVcbnByb2Nlc3Nlcy5zeW50YXgub24oJ3N0YXJ0JywgKHByb2plY3Q6IHN0cmluZykgPT4gc29ja2V0X21hbmFnZXIuYnJvYWRjYXN0KCdzdGF0dXMnLCBnZXRfc3RhdHVzKCkpICk7XG5wcm9jZXNzZXMuc3ludGF4Lm9uKCdmaW5pc2gnLCAoc3RkZXJyOiBzdHJpbmcpID0+IHtcblx0bGV0IHN0YXR1cyA9IGdldF9zdGF0dXMoKTtcblx0c3RhdHVzLnN5bnRheEVycm9yID0gc3RkZXJyO1xuXHRzb2NrZXRfbWFuYWdlci5icm9hZGNhc3QoJ3N0YXR1cycsIHN0YXR1cyk7XG59KTtcblxucHJvY2Vzc2VzLmJ1aWxkLm9uKCdzdGFydCcsIChwcm9qZWN0OiBzdHJpbmcpID0+IHNvY2tldF9tYW5hZ2VyLmJyb2FkY2FzdCgnc3RhdHVzJywgZ2V0X3N0YXR1cygpKSApO1xucHJvY2Vzc2VzLmJ1aWxkLm9uKCdmaW5pc2gnLCAoc3RkZXJyOiBzdHJpbmcpID0+IHtcblx0bGV0IHN0YXR1cyA9IGdldF9zdGF0dXMoKTtcblx0c3RhdHVzLnN5bnRheEVycm9yID0gc3RkZXJyO1xuXHRzb2NrZXRfbWFuYWdlci5icm9hZGNhc3QoJ3N0YXR1cycsIHN0YXR1cyk7XG59KTtcbnByb2Nlc3Nlcy5idWlsZC5vbignc3Rkb3V0JywgKGRhdGEpID0+IHNvY2tldF9tYW5hZ2VyLmJyb2FkY2FzdCgnc3RhdHVzJywge2J1aWxkTG9nOiBkYXRhfSkgKTtcblxucHJvY2Vzc2VzLnJ1bi5vbignc3RhcnQnLCAocHJvamVjdDogc3RyaW5nKSA9PiBzb2NrZXRfbWFuYWdlci5icm9hZGNhc3QoJ3N0YXR1cycsIGdldF9zdGF0dXMoKSkgKTtcbnByb2Nlc3Nlcy5ydW4ub24oJ2ZpbmlzaCcsIChwcm9qZWN0OiBzdHJpbmcpID0+IHNvY2tldF9tYW5hZ2VyLmJyb2FkY2FzdCgnc3RhdHVzJywgZ2V0X3N0YXR1cygpKSApO1xucHJvY2Vzc2VzLnJ1bi5vbignc3Rkb3V0JywgKGRhdGEpID0+IHNvY2tldF9tYW5hZ2VyLmJyb2FkY2FzdCgnc3RhdHVzJywge2JlbGFMb2c6IGRhdGF9KSApO1xucHJvY2Vzc2VzLnJ1bi5vbignc3RkZXJyJywgKGRhdGEpID0+IHNvY2tldF9tYW5hZ2VyLmJyb2FkY2FzdCgnc3RhdHVzJywge2JlbGFMb2dFcnI6IGRhdGF9KSApO1xuIl19
