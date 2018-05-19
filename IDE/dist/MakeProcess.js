"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
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
var Event_Emitter = require("events");
var paths = require("./paths");
var project_settings = require("./ProjectSettings");
var pidtree = require("pidtree");
var pidusage = require("pidusage");
var MakeProcess = /** @class */ (function (_super) {
    __extends(MakeProcess, _super);
    function MakeProcess(make_target) {
        var _this = _super.call(this) || this;
        _this.active = false;
        _this.killed = false;
        _this.callback_queued = false;
        _this.make_target = make_target;
        return _this;
    }
    MakeProcess.prototype.start = function (project) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            var project_args, args;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.active = true;
                        this.project = project;
                        this.stderr = '';
                        this.killed = false;
                        return [4 /*yield*/, project_settings.getArgs(project)];
                    case 1:
                        project_args = _a.sent();
                        args = [
                            '--no-print-directory',
                            '-C',
                            paths.Bela,
                            this.make_target,
                            'PROJECT=' + project,
                            'CL="' + project_args.CL + '"'
                        ];
                        if (project_args.make !== '')
                            args.push(project_args.make);
                        console.log('make', args.join(' '));
                        this.proc = child_process.spawn('make', args, { detached: true });
                        this.emit('start', project);
                        this.proc.stdout.setEncoding('utf-8');
                        this.proc.stderr.setEncoding('utf-8');
                        this.proc.stdout.on('data', function (data) {
                            _this.emit('stdout', data);
                        });
                        this.proc.stderr.on('data', function (data) {
                            _this.stderr += data;
                            _this.emit('stderr', data);
                        });
                        // this.proc.on('exit', () => this.emit('exit') );
                        this.proc.on('close', function () {
                            _this.active = false;
                            _this.emit('finish', _this.stderr, _this.killed);
                            _this.dequeue();
                        });
                        return [2 /*return*/];
                }
            });
        });
    };
    MakeProcess.prototype.stop = function () {
        if (this.active && !this.killed && this.proc.pid) {
            this.killed = true;
            // console.log('killing');
            try {
                process.kill(-this.proc.pid);
            }
            catch (e) {
                // console.log('could not kill make', this.make_target, ':', e.code);
            }
        }
    };
    MakeProcess.prototype.get_status = function () {
        return this.active;
    };
    MakeProcess.prototype.queue = function (queue_callback) {
        // console.log('queueing', this.make_target);
        this.queue_callback = queue_callback;
        this.callback_queued = true;
    };
    MakeProcess.prototype.dequeue = function () {
        if (this.callback_queued) {
            // console.log('dequeueing', this.make_target);
            this.callback_queued = false;
            this.queue_callback(this.stderr, this.killed);
        }
    };
    MakeProcess.prototype.CPU = function () {
        return __awaiter(this, void 0, void 0, function () {
            var pids, out, cpu, _i, pids_1, pid;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.get_status() || !this.proc.pid)
                            return [2 /*return*/, '0'];
                        return [4 /*yield*/, pidtree(this.proc.pid, { root: true })];
                    case 1:
                        pids = _a.sent();
                        return [4 /*yield*/, pidusage(pids)];
                    case 2:
                        out = _a.sent();
                        cpu = 0;
                        for (_i = 0, pids_1 = pids; _i < pids_1.length; _i++) {
                            pid = pids_1[_i];
                            cpu += out[pid].cpu;
                        }
                        return [2 /*return*/, cpu];
                }
            });
        });
    };
    return MakeProcess;
}(Event_Emitter));
exports.MakeProcess = MakeProcess;

//# sourceMappingURL=data:application/json;charset=utf8;base64,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RUFBQTs7d0JBQTFCLEdBQUcsR0FBRyxTQUFvQjt3QkFDMUIsR0FBRyxHQUFHLENBQUMsQ0FBQzt3QkFDWixXQUFvQixFQUFKLGFBQUksRUFBSixrQkFBSSxFQUFKLElBQUk7NEJBQVgsR0FBRzs0QkFDWCxHQUFHLElBQUksR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQzt5QkFDcEI7d0JBQ0Qsc0JBQU8sR0FBRyxFQUFDOzs7O0tBQ1g7SUFDRixrQkFBQztBQUFELENBNUZBLEFBNEZDLENBNUZnQyxhQUFhLEdBNEY3QztBQTVGWSxrQ0FBVyIsImZpbGUiOiJNYWtlUHJvY2Vzcy5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNoaWxkX3Byb2Nlc3MgZnJvbSAnY2hpbGRfcHJvY2Vzcyc7XG5pbXBvcnQgKiBhcyBFdmVudF9FbWl0dGVyIGZyb20gJ2V2ZW50cyc7XG5pbXBvcnQgKiBhcyBwYXRocyBmcm9tICcuL3BhdGhzJztcbmltcG9ydCAqIGFzIHByb2plY3Rfc2V0dGluZ3MgZnJvbSAnLi9Qcm9qZWN0U2V0dGluZ3MnO1xuaW1wb3J0ICogYXMgcGlkdHJlZSBmcm9tICdwaWR0cmVlJztcbmltcG9ydCAqIGFzIHBpZHVzYWdlIGZyb20gJ3BpZHVzYWdlJztcbmltcG9ydCB7IExvY2sgfSBmcm9tICcuL0xvY2snO1xuXG5leHBvcnQgY2xhc3MgTWFrZVByb2Nlc3MgZXh0ZW5kcyBFdmVudF9FbWl0dGVye1xuXHRwcml2YXRlIHByb2M6IGNoaWxkX3Byb2Nlc3MuQ2hpbGRQcm9jZXNzO1xuXHRwcml2YXRlIG1ha2VfdGFyZ2V0OiBzdHJpbmc7XG5cdHByb2plY3Q6IHN0cmluZztcblx0cHJpdmF0ZSBzdGRlcnI6IHN0cmluZztcblx0cHJpdmF0ZSBhY3RpdmU6IGJvb2xlYW4gPSBmYWxzZTtcblx0cHJpdmF0ZSBraWxsZWQ6IGJvb2xlYW4gPSBmYWxzZTtcblx0cHJpdmF0ZSBjYWxsYmFja19xdWV1ZWQ6IGJvb2xlYW4gPSBmYWxzZTtcblx0cHJpdmF0ZSBxdWV1ZV9jYWxsYmFjazogKHN0ZGVycjogc3RyaW5nLCBraWxsZWQ6IGJvb2xlYW4pID0+IHZvaWQ7XG5cblx0Y29uc3RydWN0b3IobWFrZV90YXJnZXQ6IHN0cmluZyl7XG5cdFx0c3VwZXIoKTtcblx0XHR0aGlzLm1ha2VfdGFyZ2V0ID0gbWFrZV90YXJnZXQ7XG5cdH1cblxuXHRhc3luYyBzdGFydChwcm9qZWN0OiBzdHJpbmcpe1xuXHRcdHRoaXMuYWN0aXZlID0gdHJ1ZTtcblx0XHR0aGlzLnByb2plY3QgPSBwcm9qZWN0O1xuXHRcdHRoaXMuc3RkZXJyID0gJyc7XG5cdFx0dGhpcy5raWxsZWQgPSBmYWxzZTtcblx0XHRsZXQgcHJvamVjdF9hcmdzOiB7Q0w6c3RyaW5nLCBtYWtlOnN0cmluZ30gPSBhd2FpdCBwcm9qZWN0X3NldHRpbmdzLmdldEFyZ3MocHJvamVjdCk7XG5cdFx0bGV0IGFyZ3M6IHN0cmluZ1tdID0gW1xuXHRcdFx0Jy0tbm8tcHJpbnQtZGlyZWN0b3J5Jyxcblx0XHRcdCctQycsXG5cdFx0XHRwYXRocy5CZWxhLFxuXHRcdFx0dGhpcy5tYWtlX3RhcmdldCxcblx0XHRcdCdQUk9KRUNUPScrcHJvamVjdCxcblx0XHRcdCdDTD1cIicrcHJvamVjdF9hcmdzLkNMKydcIidcblx0XHRdO1xuXHRcdGlmIChwcm9qZWN0X2FyZ3MubWFrZSAhPT0gJycpXG5cdFx0XHRhcmdzLnB1c2gocHJvamVjdF9hcmdzLm1ha2UpO1xuXHRcdGNvbnNvbGUubG9nKCdtYWtlJywgYXJncy5qb2luKCcgJykpO1xuXHRcdHRoaXMucHJvYyA9IGNoaWxkX3Byb2Nlc3Muc3Bhd24oJ21ha2UnLCBhcmdzLCB7ZGV0YWNoZWQ6IHRydWV9KTtcblx0XHR0aGlzLmVtaXQoJ3N0YXJ0JywgcHJvamVjdCk7XG5cdFx0dGhpcy5wcm9jLnN0ZG91dC5zZXRFbmNvZGluZygndXRmLTgnKTtcblx0XHR0aGlzLnByb2Muc3RkZXJyLnNldEVuY29kaW5nKCd1dGYtOCcpO1xuXHRcdHRoaXMucHJvYy5zdGRvdXQub24oJ2RhdGEnLCAoZGF0YTogc3RyaW5nKSA9PiB7XG5cdFx0XHR0aGlzLmVtaXQoJ3N0ZG91dCcsIGRhdGEpO1xuXHRcdH0pO1xuXHRcdHRoaXMucHJvYy5zdGRlcnIub24oJ2RhdGEnLCAoZGF0YTogc3RyaW5nKSA9PiB7XG5cdFx0XHR0aGlzLnN0ZGVyciArPSBkYXRhO1xuXHRcdFx0dGhpcy5lbWl0KCdzdGRlcnInLCBkYXRhKTtcblx0XHR9KTtcblx0XHQvLyB0aGlzLnByb2Mub24oJ2V4aXQnLCAoKSA9PiB0aGlzLmVtaXQoJ2V4aXQnKSApO1xuXHRcdHRoaXMucHJvYy5vbignY2xvc2UnLCAoKSA9PiB7XG5cdFx0XHR0aGlzLmFjdGl2ZSA9IGZhbHNlO1xuXHRcdFx0dGhpcy5lbWl0KCdmaW5pc2gnLCB0aGlzLnN0ZGVyciwgdGhpcy5raWxsZWQpO1xuXHRcdFx0dGhpcy5kZXF1ZXVlKCk7XG5cdFx0fSk7XG5cdH1cblxuXHRzdG9wKCl7XG5cdFx0aWYgKHRoaXMuYWN0aXZlICYmICF0aGlzLmtpbGxlZCAmJiB0aGlzLnByb2MucGlkKXtcblx0XHRcdHRoaXMua2lsbGVkID0gdHJ1ZTtcblx0XHRcdC8vIGNvbnNvbGUubG9nKCdraWxsaW5nJyk7XG5cdFx0XHR0cnl7XG5cdFx0XHRcdHByb2Nlc3Mua2lsbCgtdGhpcy5wcm9jLnBpZCk7XG5cdFx0XHR9XG5cdFx0XHRjYXRjaChlKXtcblx0XHRcdFx0Ly8gY29uc29sZS5sb2coJ2NvdWxkIG5vdCBraWxsIG1ha2UnLCB0aGlzLm1ha2VfdGFyZ2V0LCAnOicsIGUuY29kZSk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0Z2V0X3N0YXR1cygpOiBib29sZWFuIHtcblx0XHRyZXR1cm4gdGhpcy5hY3RpdmU7XG5cdH1cblxuXHRxdWV1ZShxdWV1ZV9jYWxsYmFjazogKHN0ZGVycjogc3RyaW5nLCBraWxsZWQ6IGJvb2xlYW4pID0+IHZvaWQgKXtcblx0XHQvLyBjb25zb2xlLmxvZygncXVldWVpbmcnLCB0aGlzLm1ha2VfdGFyZ2V0KTtcblx0XHR0aGlzLnF1ZXVlX2NhbGxiYWNrID0gcXVldWVfY2FsbGJhY2s7XG5cdFx0dGhpcy5jYWxsYmFja19xdWV1ZWQgPSB0cnVlO1xuXHR9XG5cblx0cHJpdmF0ZSBkZXF1ZXVlKCl7XG5cdFx0aWYgKHRoaXMuY2FsbGJhY2tfcXVldWVkKXtcblx0XHRcdC8vIGNvbnNvbGUubG9nKCdkZXF1ZXVlaW5nJywgdGhpcy5tYWtlX3RhcmdldCk7XG5cdFx0XHR0aGlzLmNhbGxiYWNrX3F1ZXVlZCA9IGZhbHNlO1xuXHRcdFx0dGhpcy5xdWV1ZV9jYWxsYmFjayh0aGlzLnN0ZGVyciwgdGhpcy5raWxsZWQpO1xuXHRcdH1cblx0fVxuXG5cdGFzeW5jIENQVSgpOiBQcm9taXNlPGFueT57XG5cdFx0aWYgKCF0aGlzLmdldF9zdGF0dXMoKSB8fCAhdGhpcy5wcm9jLnBpZCkgcmV0dXJuICcwJztcblx0XHRsZXQgcGlkcyA9IGF3YWl0IHBpZHRyZWUodGhpcy5wcm9jLnBpZCwge3Jvb3Q6IHRydWV9KTtcblx0XHRsZXQgb3V0ID0gYXdhaXQgcGlkdXNhZ2UocGlkcyk7XG5cdFx0bGV0IGNwdSA9IDA7XG5cdFx0Zm9yIChsZXQgcGlkIG9mIHBpZHMpe1xuXHRcdFx0Y3B1ICs9IG91dFtwaWRdLmNwdTtcblx0XHR9XG5cdFx0cmV0dXJuIGNwdTtcblx0fVxufVxuIl19
