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
var socket_manager = require("./SocketManager");
var paths = require("./paths");
var MakeProcess_1 = require("./MakeProcess");
var Lock_1 = require("./Lock");
var lock = new Lock_1.Lock();
var syntax_process = new MakeProcess_1.MakeProcess('syntax');
var build_process = new MakeProcess_1.MakeProcess('all');
var run_process = new MakeProcess_1.MakeProcess('runide');
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
    if (syntax_process.get_status()) {
        syntax_process.stop();
        syntax_process.queue(function () { return syntax_process.start(data.currentProject); });
    }
    else if (build_process.get_status()) {
        build_process.stop();
        build_process.queue(function () { return syntax_process.start(data.currentProject); });
    }
    else {
        syntax_process.start(data.currentProject);
    }
}
exports.checkSyntax = checkSyntax;
// this function is called when the run button is clicked
// if a program is already building or running it is stopped and restarted
// any syntax check in progress is stopped
function run(data) {
    if (run_process.get_status()) {
        run_process.stop();
        run_process.queue(function () { return build_run(data.currentProject); });
    }
    else if (build_process.get_status()) {
        build_process.stop();
        build_process.queue(function () { return build_run(data.currentProject); });
    }
    else if (syntax_process.get_status()) {
        syntax_process.stop();
        syntax_process.queue(function () { return build_run(data.currentProject); });
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
    build_process.start(project);
    build_process.queue(function (stderr, killed) {
        if (!killed && !build_error(stderr)) {
            run_process.start(project);
        }
    });
}
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
function stop() {
    //	console.log('make -C '+paths.Bela+' stop');
    //	child_process.exec('make -C '+paths.Bela+' stop');	
    if (run_process.get_status()) {
        run_process.stop();
    }
    if (build_process.get_status()) {
        build_process.stop();
    }
    if (syntax_process.get_status()) {
        syntax_process.stop();
    }
}
exports.stop = stop;
function get_status() {
    return {
        checkingSyntax: syntax_process.get_status(),
        building: build_process.get_status(),
        buildProject: (build_process.get_status() ? build_process.project : ''),
        running: run_process.get_status(),
        runProject: (run_process.get_status() ? run_process.project : '')
    };
}
// each process emits start and finish events, which are handled here
syntax_process.on('start', function (project) { return socket_manager.broadcast('status', get_status()); });
syntax_process.on('finish', function (stderr) {
    var status = get_status();
    status.syntaxError = stderr;
    socket_manager.broadcast('status', status);
});
build_process.on('start', function (project) { return socket_manager.broadcast('status', get_status()); });
build_process.on('finish', function (stderr) {
    var status = get_status();
    status.syntaxError = stderr;
    socket_manager.broadcast('status', status);
});
build_process.on('stdout', function (data) { return socket_manager.broadcast('status', { buildLog: data }); });
run_process.on('start', function (project) { return socket_manager.broadcast('status', get_status()); });
run_process.on('finish', function (project) { return socket_manager.broadcast('status', get_status()); });
run_process.on('stdout', function (data) { return socket_manager.broadcast('status', { belaLog: data }); });
run_process.on('stderr', function (data) { return socket_manager.broadcast('status', { belaLogErr: data }); });

//# sourceMappingURL=data:application/json;charset=utf8;base64,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QUMsU0FBUyxDQUFDLFFBQVEsRUFBRSxFQUFDLFVBQVUsRUFBRSxJQUFJLEVBQUMsQ0FBQyxFQUF0RCxDQUFzRCxDQUFFLENBQUMiLCJmaWxlIjoiUHJvY2Vzc01hbmFnZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjaGlsZF9wcm9jZXNzIGZyb20gJ2NoaWxkX3Byb2Nlc3MnO1xuaW1wb3J0ICogYXMgZmlsZV9tYW5hZ2VyIGZyb20gJy4vRmlsZU1hbmFnZXInO1xuaW1wb3J0ICogYXMgc29ja2V0X21hbmFnZXIgZnJvbSAnLi9Tb2NrZXRNYW5hZ2VyJztcbmltcG9ydCAqIGFzIHBhdGhzIGZyb20gJy4vcGF0aHMnO1xuaW1wb3J0IHsgTWFrZVByb2Nlc3MgfSBmcm9tICcuL01ha2VQcm9jZXNzJztcbmltcG9ydCB7IExvY2sgfSBmcm9tICcuL0xvY2snO1xuXG5jb25zdCBsb2NrOiBMb2NrID0gbmV3IExvY2soKTtcblxubGV0IHN5bnRheF9wcm9jZXNzOiBNYWtlUHJvY2VzcyA9IG5ldyBNYWtlUHJvY2Vzcygnc3ludGF4Jyk7XG5sZXQgYnVpbGRfcHJvY2VzczogTWFrZVByb2Nlc3MgPSBuZXcgTWFrZVByb2Nlc3MoJ2FsbCcpO1xubGV0IHJ1bl9wcm9jZXNzOiBNYWtlUHJvY2VzcyA9IG5ldyBNYWtlUHJvY2VzcygncnVuaWRlJyk7XG5cbi8vIHRoaXMgZnVuY3Rpb24gZ2V0cyBjYWxsZWQgd2hlbmV2ZXIgdGhlIGFjZSBlZGl0b3IgaXMgbW9kaWZpZWRcbi8vIHRoZSBmaWxlIGRhdGEgaXMgc2F2ZWQgcm9idXN0bHkgdXNpbmcgYSBsb2NrZmlsZSwgYW5kIGEgc3ludGF4XG4vLyBjaGVjayBzdGFydGVkIGlmIHRoZSBmbGFnIGlzIHNldFxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHVwbG9hZChkYXRhOiBhbnkpe1xuXHRhd2FpdCBsb2NrLmFjcXVpcmUoKTtcblx0dHJ5e1xuXHRcdGF3YWl0IGZpbGVfbWFuYWdlci5zYXZlX2ZpbGUocGF0aHMucHJvamVjdHMrZGF0YS5jdXJyZW50UHJvamVjdCsnLycrZGF0YS5uZXdGaWxlLCBkYXRhLmZpbGVEYXRhLCBwYXRocy5sb2NrZmlsZSk7XG5cdFx0aWYgKGRhdGEuY2hlY2tTeW50YXgpe1xuXHRcdFx0Y2hlY2tTeW50YXgoZGF0YSk7XG5cdFx0fVxuXHR9XG5cdGNhdGNoKGUpe1xuXHRcdGxvY2sucmVsZWFzZSgpO1xuXHRcdHRocm93IGU7XG5cdH1cblx0bG9jay5yZWxlYXNlKCk7XG59XG5cbi8vIHRoaXMgZnVuY3Rpb24gc3RhcnRzIGEgc3ludGF4IGNoZWNrXG4vLyBpZiBhIHN5bnRheCBjaGVjayBvciBidWlsZCBwcm9jZXNzIGlzIGluIHByb2dyZXNzIHRoZXkgYXJlIHN0b3BwZWRcbi8vIGEgcnVubmluZyBwcm9ncmFtIGlzIG5vdCBzdG9wcGVkXG5leHBvcnQgZnVuY3Rpb24gY2hlY2tTeW50YXgoZGF0YTogYW55KXtcblx0aWYgKHN5bnRheF9wcm9jZXNzLmdldF9zdGF0dXMoKSl7XG5cdFx0c3ludGF4X3Byb2Nlc3Muc3RvcCgpO1xuXHRcdHN5bnRheF9wcm9jZXNzLnF1ZXVlKCgpID0+IHN5bnRheF9wcm9jZXNzLnN0YXJ0KGRhdGEuY3VycmVudFByb2plY3QpKTtcblx0fSBlbHNlIGlmIChidWlsZF9wcm9jZXNzLmdldF9zdGF0dXMoKSl7XG5cdFx0YnVpbGRfcHJvY2Vzcy5zdG9wKCk7XG5cdFx0YnVpbGRfcHJvY2Vzcy5xdWV1ZSggKCkgPT4gc3ludGF4X3Byb2Nlc3Muc3RhcnQoZGF0YS5jdXJyZW50UHJvamVjdCkgKTtcblx0fSBlbHNlIHtcblx0XHRzeW50YXhfcHJvY2Vzcy5zdGFydChkYXRhLmN1cnJlbnRQcm9qZWN0KTtcblx0fVxufVxuXG4vLyB0aGlzIGZ1bmN0aW9uIGlzIGNhbGxlZCB3aGVuIHRoZSBydW4gYnV0dG9uIGlzIGNsaWNrZWRcbi8vIGlmIGEgcHJvZ3JhbSBpcyBhbHJlYWR5IGJ1aWxkaW5nIG9yIHJ1bm5pbmcgaXQgaXMgc3RvcHBlZCBhbmQgcmVzdGFydGVkXG4vLyBhbnkgc3ludGF4IGNoZWNrIGluIHByb2dyZXNzIGlzIHN0b3BwZWRcbmV4cG9ydCBmdW5jdGlvbiBydW4oZGF0YTogYW55KXtcblx0aWYgKHJ1bl9wcm9jZXNzLmdldF9zdGF0dXMoKSl7XG5cdFx0cnVuX3Byb2Nlc3Muc3RvcCgpO1xuXHRcdHJ1bl9wcm9jZXNzLnF1ZXVlKCAoKSA9PiBidWlsZF9ydW4oZGF0YS5jdXJyZW50UHJvamVjdCkgKTtcblx0fSBlbHNlIGlmIChidWlsZF9wcm9jZXNzLmdldF9zdGF0dXMoKSl7XG5cdFx0YnVpbGRfcHJvY2Vzcy5zdG9wKCk7XG5cdFx0YnVpbGRfcHJvY2Vzcy5xdWV1ZSggKCkgPT4gYnVpbGRfcnVuKGRhdGEuY3VycmVudFByb2plY3QpICk7XG5cdH0gZWxzZSBpZiAoc3ludGF4X3Byb2Nlc3MuZ2V0X3N0YXR1cygpKXtcblx0XHRzeW50YXhfcHJvY2Vzcy5zdG9wKCk7XG5cdFx0c3ludGF4X3Byb2Nlc3MucXVldWUoICgpID0+IGJ1aWxkX3J1bihkYXRhLmN1cnJlbnRQcm9qZWN0KSApO1x0XG5cdH0gZWxzZSB7XG5cdFx0YnVpbGRfcnVuKGRhdGEuY3VycmVudFByb2plY3QpO1xuXHR9XG59XG5cbi8vIHRoaXMgZnVuY3Rpb24gc3RhcnRzIGEgYnVpbGQgcHJvY2VzcyBhbmQgd2hlbiBpdCBlbmRzIGl0IGNoZWNrc1xuLy8gaWYgaXQgd2FzIHN0b3BwZWQgYnkgYSBjYWxsIHRvIHN0b3AoKSBvciBpZiB0aGVyZSB3ZXJlIGJ1aWxkIGVycm9yc1xuLy8gaWYgbmVpdGhlciBvZiB0aGVzZSBhcmUgdHJ1ZSB0aGUgcHJvamVjdCBpcyBpbW1lZGlhdGVseSBydW5cbmZ1bmN0aW9uIGJ1aWxkX3J1bihwcm9qZWN0OiBzdHJpbmcpe1xuXHRidWlsZF9wcm9jZXNzLnN0YXJ0KHByb2plY3QpO1xuXHRidWlsZF9wcm9jZXNzLnF1ZXVlKCAoc3RkZXJyOiBzdHJpbmcsIGtpbGxlZDogYm9vbGVhbikgPT4ge1xuXHRcdGlmICgha2lsbGVkICYmICFidWlsZF9lcnJvcihzdGRlcnIpKXtcblx0XHRcdHJ1bl9wcm9jZXNzLnN0YXJ0KHByb2plY3QpOyBcblx0XHR9XG5cdH0pO1xufVxuXG5mdW5jdGlvbiBidWlsZF9lcnJvcihzdGRlcnI6IHN0cmluZyk6IGJvb2xlYW4ge1xuXHRsZXQgbGluZXM6IHN0cmluZ1tdID0gc3RkZXJyLnNwbGl0KCdcXG4nKTtcblx0Zm9yIChsZXQgbGluZSBvZiBsaW5lcyl7XG5cdFx0bGV0IHNwbGl0X2xpbmU6IHN0cmluZ1tdID0gbGluZS5zcGxpdCgnOicpO1xuXHRcdGlmIChsaW5lLmxlbmd0aCA+IDQpe1xuXHRcdFx0aWYgKGxpbmVbM10gPT09ICcgZXJyb3InIHx8IGxpbmVbM10gPT09ICcgZmF0YWwgZXJyb3InKXtcblx0XHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0XHR9IGVsc2UgaWYgKGxpbmVbM10gPT09ICcgd2FybmluZycpe1xuXHRcdFx0XHQvL2NvbnNvbGUubG9nKCd3YXJuaW5nJyk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cdHJldHVybiBmYWxzZTtcbn1cblxuXG4vLyB0aGlzIGZ1bmN0aW9uIGlzIGNhbGxlZCB3aGVuIHRoZSBzdG9wIGJ1dHRvbiBpcyBjbGlja2VkXG4vLyBpdCBjYWxscyB0aGUgc3RvcCgpIG1ldGhvZCBvZiBhbnkgcnVubmluZyBwcm9jZXNzXG5leHBvcnQgZnVuY3Rpb24gc3RvcCgpe1xuLy9cdGNvbnNvbGUubG9nKCdtYWtlIC1DICcrcGF0aHMuQmVsYSsnIHN0b3AnKTtcbi8vXHRjaGlsZF9wcm9jZXNzLmV4ZWMoJ21ha2UgLUMgJytwYXRocy5CZWxhKycgc3RvcCcpO1x0XG5cdGlmIChydW5fcHJvY2Vzcy5nZXRfc3RhdHVzKCkpe1xuXHRcdHJ1bl9wcm9jZXNzLnN0b3AoKTtcblx0fVxuXHRpZiAoYnVpbGRfcHJvY2Vzcy5nZXRfc3RhdHVzKCkpe1xuXHRcdGJ1aWxkX3Byb2Nlc3Muc3RvcCgpO1xuXHR9XG5cdGlmIChzeW50YXhfcHJvY2Vzcy5nZXRfc3RhdHVzKCkpe1xuXHRcdHN5bnRheF9wcm9jZXNzLnN0b3AoKTtcblx0fVxufVxuXG5mdW5jdGlvbiBnZXRfc3RhdHVzKCl7XG5cdHJldHVybiB7XG5cdFx0Y2hlY2tpbmdTeW50YXhcdDogc3ludGF4X3Byb2Nlc3MuZ2V0X3N0YXR1cygpLFxuXHRcdGJ1aWxkaW5nXHQ6IGJ1aWxkX3Byb2Nlc3MuZ2V0X3N0YXR1cygpLFxuXHRcdGJ1aWxkUHJvamVjdFx0OiAoYnVpbGRfcHJvY2Vzcy5nZXRfc3RhdHVzKCkgPyBidWlsZF9wcm9jZXNzLnByb2plY3QgOiAnJyksXG5cdFx0cnVubmluZ1x0XHQ6IHJ1bl9wcm9jZXNzLmdldF9zdGF0dXMoKSxcblx0XHRydW5Qcm9qZWN0XHQ6IChydW5fcHJvY2Vzcy5nZXRfc3RhdHVzKCkgPyBydW5fcHJvY2Vzcy5wcm9qZWN0IDogJycpXG5cdH07XG59XG5cbi8vIGVhY2ggcHJvY2VzcyBlbWl0cyBzdGFydCBhbmQgZmluaXNoIGV2ZW50cywgd2hpY2ggYXJlIGhhbmRsZWQgaGVyZVxuc3ludGF4X3Byb2Nlc3Mub24oJ3N0YXJ0JywgKHByb2plY3Q6IHN0cmluZykgPT4gc29ja2V0X21hbmFnZXIuYnJvYWRjYXN0KCdzdGF0dXMnLCBnZXRfc3RhdHVzKCkpICk7XG5zeW50YXhfcHJvY2Vzcy5vbignZmluaXNoJywgKHN0ZGVycjogc3RyaW5nKSA9PiB7XG5cdGxldCBzdGF0dXMgPSBnZXRfc3RhdHVzKCk7XG5cdHN0YXR1cy5zeW50YXhFcnJvciA9IHN0ZGVycjtcblx0c29ja2V0X21hbmFnZXIuYnJvYWRjYXN0KCdzdGF0dXMnLCBzdGF0dXMpO1xufSk7XG5cbmJ1aWxkX3Byb2Nlc3Mub24oJ3N0YXJ0JywgKHByb2plY3Q6IHN0cmluZykgPT4gc29ja2V0X21hbmFnZXIuYnJvYWRjYXN0KCdzdGF0dXMnLCBnZXRfc3RhdHVzKCkpICk7XG5idWlsZF9wcm9jZXNzLm9uKCdmaW5pc2gnLCAoc3RkZXJyOiBzdHJpbmcpID0+IHtcblx0bGV0IHN0YXR1cyA9IGdldF9zdGF0dXMoKTtcblx0c3RhdHVzLnN5bnRheEVycm9yID0gc3RkZXJyO1xuXHRzb2NrZXRfbWFuYWdlci5icm9hZGNhc3QoJ3N0YXR1cycsIHN0YXR1cyk7XG59KTtcbmJ1aWxkX3Byb2Nlc3Mub24oJ3N0ZG91dCcsIChkYXRhKSA9PiBzb2NrZXRfbWFuYWdlci5icm9hZGNhc3QoJ3N0YXR1cycsIHtidWlsZExvZzogZGF0YX0pICk7XG5cbnJ1bl9wcm9jZXNzLm9uKCdzdGFydCcsIChwcm9qZWN0OiBzdHJpbmcpID0+IHNvY2tldF9tYW5hZ2VyLmJyb2FkY2FzdCgnc3RhdHVzJywgZ2V0X3N0YXR1cygpKSApO1xucnVuX3Byb2Nlc3Mub24oJ2ZpbmlzaCcsIChwcm9qZWN0OiBzdHJpbmcpID0+IHNvY2tldF9tYW5hZ2VyLmJyb2FkY2FzdCgnc3RhdHVzJywgZ2V0X3N0YXR1cygpKSApO1xucnVuX3Byb2Nlc3Mub24oJ3N0ZG91dCcsIChkYXRhKSA9PiBzb2NrZXRfbWFuYWdlci5icm9hZGNhc3QoJ3N0YXR1cycsIHtiZWxhTG9nOiBkYXRhfSkgKTtcbnJ1bl9wcm9jZXNzLm9uKCdzdGRlcnInLCAoZGF0YSkgPT4gc29ja2V0X21hbmFnZXIuYnJvYWRjYXN0KCdzdGF0dXMnLCB7YmVsYUxvZ0VycjogZGF0YX0pICk7XG4iXX0=
