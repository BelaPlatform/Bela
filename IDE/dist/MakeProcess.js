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
            var project_args, args, _i, _a, arg;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        this.active = true;
                        this.project = project;
                        this.stderr = '';
                        this.killed = false;
                        return [4 /*yield*/, project_settings.getArgs(project)];
                    case 1:
                        project_args = _b.sent();
                        args = [
                            '--no-print-directory',
                            '-C',
                            paths.Bela,
                            this.make_target,
                            'PROJECT=' + project,
                            'CL="' + project_args.CL + '"'
                        ];
                        if (project_args.make) {
                            for (_i = 0, _a = project_args.make; _i < _a.length; _i++) {
                                arg = _a[_i];
                                args.push(arg);
                            }
                        }
                        console.log('make', args.join(' '));
                        this.proc = child_process.spawn('make', args, { detached: true });
                        this.emit('start', this.proc.pid, project);
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
    return MakeProcess;
}(Event_Emitter));
exports.MakeProcess = MakeProcess;

//# sourceMappingURL=data:application/json;charset=utf8;base64,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QUM7NEJBQzlDLEtBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQzt3QkFDaEIsQ0FBQyxDQUFDLENBQUM7Ozs7O0tBQ0g7SUFFRCwwQkFBSSxHQUFKO1FBQ0MsSUFBSSxJQUFJLENBQUMsTUFBTSxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBQztZQUNoRCxJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQztZQUNuQiwwQkFBMEI7WUFDMUIsSUFBRztnQkFDRixPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQzthQUM3QjtZQUNELE9BQU0sQ0FBQyxFQUFDO2dCQUNQLHFFQUFxRTthQUNyRTtTQUNEO0lBQ0YsQ0FBQztJQUVELGdDQUFVLEdBQVY7UUFDQyxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUM7SUFDcEIsQ0FBQztJQUVELDJCQUFLLEdBQUwsVUFBTSxjQUF5RDtRQUM5RCw2Q0FBNkM7UUFDN0MsSUFBSSxDQUFDLGNBQWMsR0FBRyxjQUFjLENBQUM7UUFDckMsSUFBSSxDQUFDLGVBQWUsR0FBRyxJQUFJLENBQUM7SUFDN0IsQ0FBQztJQUVPLDZCQUFPLEdBQWY7UUFDQyxJQUFJLElBQUksQ0FBQyxlQUFlLEVBQUM7WUFDeEIsK0NBQStDO1lBQy9DLElBQUksQ0FBQyxlQUFlLEdBQUcsS0FBSyxDQUFDO1lBQzdCLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7U0FDOUM7SUFDRixDQUFDO0lBZUYsa0JBQUM7QUFBRCxDQWxHQSxBQWtHQyxDQWxHZ0MsYUFBYSxHQWtHN0M7QUFsR1ksa0NBQVciLCJmaWxlIjoiTWFrZVByb2Nlc3MuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjaGlsZF9wcm9jZXNzIGZyb20gJ2NoaWxkX3Byb2Nlc3MnO1xuaW1wb3J0ICogYXMgRXZlbnRfRW1pdHRlciBmcm9tICdldmVudHMnO1xuaW1wb3J0ICogYXMgcGF0aHMgZnJvbSAnLi9wYXRocyc7XG5pbXBvcnQgKiBhcyBwcm9qZWN0X3NldHRpbmdzIGZyb20gJy4vUHJvamVjdFNldHRpbmdzJztcbmltcG9ydCB7IExvY2sgfSBmcm9tICcuL0xvY2snO1xuXG5leHBvcnQgY2xhc3MgTWFrZVByb2Nlc3MgZXh0ZW5kcyBFdmVudF9FbWl0dGVye1xuXHRwcml2YXRlIHByb2M6IGNoaWxkX3Byb2Nlc3MuQ2hpbGRQcm9jZXNzO1xuXHRwcml2YXRlIG1ha2VfdGFyZ2V0OiBzdHJpbmc7XG5cdHByb2plY3Q6IHN0cmluZztcblx0cHJpdmF0ZSBzdGRlcnI6IHN0cmluZztcblx0cHJpdmF0ZSBhY3RpdmU6IGJvb2xlYW4gPSBmYWxzZTtcblx0cHJpdmF0ZSBraWxsZWQ6IGJvb2xlYW4gPSBmYWxzZTtcblx0cHJpdmF0ZSBjYWxsYmFja19xdWV1ZWQ6IGJvb2xlYW4gPSBmYWxzZTtcblx0cHJpdmF0ZSBxdWV1ZV9jYWxsYmFjazogKHN0ZGVycjogc3RyaW5nLCBraWxsZWQ6IGJvb2xlYW4pID0+IHZvaWQ7XG5cblx0Y29uc3RydWN0b3IobWFrZV90YXJnZXQ6IHN0cmluZyl7XG5cdFx0c3VwZXIoKTtcblx0XHR0aGlzLm1ha2VfdGFyZ2V0ID0gbWFrZV90YXJnZXQ7XG5cdH1cblxuXHRhc3luYyBzdGFydChwcm9qZWN0OiBzdHJpbmcpe1xuXHRcdHRoaXMuYWN0aXZlID0gdHJ1ZTtcblx0XHR0aGlzLnByb2plY3QgPSBwcm9qZWN0O1xuXHRcdHRoaXMuc3RkZXJyID0gJyc7XG5cdFx0dGhpcy5raWxsZWQgPSBmYWxzZTtcblx0XHRsZXQgcHJvamVjdF9hcmdzOiB7Q0w6c3RyaW5nLCBtYWtlOnN0cmluZ1tdfSA9IGF3YWl0IHByb2plY3Rfc2V0dGluZ3MuZ2V0QXJncyhwcm9qZWN0KTtcblx0XHRsZXQgYXJnczogc3RyaW5nW10gPSBbXG5cdFx0XHQnLS1uby1wcmludC1kaXJlY3RvcnknLFxuXHRcdFx0Jy1DJyxcblx0XHRcdHBhdGhzLkJlbGEsXG5cdFx0XHR0aGlzLm1ha2VfdGFyZ2V0LFxuXHRcdFx0J1BST0pFQ1Q9Jytwcm9qZWN0LFxuXHRcdFx0J0NMPVwiJytwcm9qZWN0X2FyZ3MuQ0wrJ1wiJ1xuXHRcdF07XG5cdFx0aWYgKHByb2plY3RfYXJncy5tYWtlKXtcblx0XHRcdGZvciAobGV0IGFyZyBvZiBwcm9qZWN0X2FyZ3MubWFrZSl7XG5cdFx0XHRcdGFyZ3MucHVzaChhcmcpO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRjb25zb2xlLmxvZygnbWFrZScsIGFyZ3Muam9pbignICcpKTtcblx0XHR0aGlzLnByb2MgPSBjaGlsZF9wcm9jZXNzLnNwYXduKCdtYWtlJywgYXJncywge2RldGFjaGVkOiB0cnVlfSk7XG5cdFx0dGhpcy5lbWl0KCdzdGFydCcsIHRoaXMucHJvYy5waWQsIHByb2plY3QpO1xuXHRcdHRoaXMucHJvYy5zdGRvdXQuc2V0RW5jb2RpbmcoJ3V0Zi04Jyk7XG5cdFx0dGhpcy5wcm9jLnN0ZGVyci5zZXRFbmNvZGluZygndXRmLTgnKTtcblx0XHR0aGlzLnByb2Muc3Rkb3V0Lm9uKCdkYXRhJywgKGRhdGE6IHN0cmluZykgPT4ge1xuXHRcdFx0dGhpcy5lbWl0KCdzdGRvdXQnLCBkYXRhKTtcblx0XHR9KTtcblx0XHR0aGlzLnByb2Muc3RkZXJyLm9uKCdkYXRhJywgKGRhdGE6IHN0cmluZykgPT4ge1xuXHRcdFx0dGhpcy5zdGRlcnIgKz0gZGF0YTtcblx0XHRcdHRoaXMuZW1pdCgnc3RkZXJyJywgZGF0YSk7XG5cdFx0fSk7XG5cdFx0Ly8gdGhpcy5wcm9jLm9uKCdleGl0JywgKCkgPT4gdGhpcy5lbWl0KCdleGl0JykgKTtcblx0XHR0aGlzLnByb2Mub24oJ2Nsb3NlJywgKCkgPT4ge1xuXHRcdFx0dGhpcy5hY3RpdmUgPSBmYWxzZTtcblx0XHRcdHRoaXMuZW1pdCgnZmluaXNoJywgdGhpcy5zdGRlcnIsIHRoaXMua2lsbGVkKTtcblx0XHRcdHRoaXMuZGVxdWV1ZSgpO1xuXHRcdH0pO1xuXHR9XG5cblx0c3RvcCgpe1xuXHRcdGlmICh0aGlzLmFjdGl2ZSAmJiAhdGhpcy5raWxsZWQgJiYgdGhpcy5wcm9jLnBpZCl7XG5cdFx0XHR0aGlzLmtpbGxlZCA9IHRydWU7XG5cdFx0XHQvLyBjb25zb2xlLmxvZygna2lsbGluZycpO1xuXHRcdFx0dHJ5e1xuXHRcdFx0XHRwcm9jZXNzLmtpbGwoLXRoaXMucHJvYy5waWQpO1xuXHRcdFx0fVxuXHRcdFx0Y2F0Y2goZSl7XG5cdFx0XHRcdC8vIGNvbnNvbGUubG9nKCdjb3VsZCBub3Qga2lsbCBtYWtlJywgdGhpcy5tYWtlX3RhcmdldCwgJzonLCBlLmNvZGUpO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdGdldF9zdGF0dXMoKTogYm9vbGVhbiB7XG5cdFx0cmV0dXJuIHRoaXMuYWN0aXZlO1xuXHR9XG5cblx0cXVldWUocXVldWVfY2FsbGJhY2s6IChzdGRlcnI6IHN0cmluZywga2lsbGVkOiBib29sZWFuKSA9PiB2b2lkICl7XG5cdFx0Ly8gY29uc29sZS5sb2coJ3F1ZXVlaW5nJywgdGhpcy5tYWtlX3RhcmdldCk7XG5cdFx0dGhpcy5xdWV1ZV9jYWxsYmFjayA9IHF1ZXVlX2NhbGxiYWNrO1xuXHRcdHRoaXMuY2FsbGJhY2tfcXVldWVkID0gdHJ1ZTtcblx0fVxuXG5cdHByaXZhdGUgZGVxdWV1ZSgpe1xuXHRcdGlmICh0aGlzLmNhbGxiYWNrX3F1ZXVlZCl7XG5cdFx0XHQvLyBjb25zb2xlLmxvZygnZGVxdWV1ZWluZycsIHRoaXMubWFrZV90YXJnZXQpO1xuXHRcdFx0dGhpcy5jYWxsYmFja19xdWV1ZWQgPSBmYWxzZTtcblx0XHRcdHRoaXMucXVldWVfY2FsbGJhY2sodGhpcy5zdGRlcnIsIHRoaXMua2lsbGVkKTtcblx0XHR9XG5cdH1cblxuXHQvLyB0aGlzIGZ1bmN0aW9uIHJldHVybnMgdGhlIGxpbnV4LWRvbWFpbiBjcHUgdXNhZ2Ugb2YgYWxsIGNoaWxkIHByb2Nlc3Nlc1xuXHQvLyBpdCB3b3JrcyBmb3IgYWxsIHRocmVlIG1ha2UgcHJvY2Vzc2VzIGJ1dCBpcyB2ZXJ5IGV4cGVuc2l2ZVxuXHQvLyBDUFVNb25pdG9yIG9ubHkgd29ya3MgZm9yIHRoZSBydW4gcHJvY2VzcywgYnV0IGlzIG1vcmUgZWZmaWNpZW50XG5cdC8qYXN5bmMgQ1BVKCk6IFByb21pc2U8YW55Pntcblx0XHRpZiAoIXRoaXMuZ2V0X3N0YXR1cygpIHx8ICF0aGlzLnByb2MucGlkKSByZXR1cm4gJzAnO1xuXHRcdGxldCBwaWRzID0gYXdhaXQgcGlkdHJlZSh0aGlzLnByb2MucGlkLCB7cm9vdDogdHJ1ZX0pO1xuXHRcdGxldCBvdXQgPSBhd2FpdCBwaWR1c2FnZShwaWRzKTtcblx0XHRsZXQgY3B1ID0gMDtcblx0XHRmb3IgKGxldCBwaWQgb2YgcGlkcyl7XG5cdFx0XHRjcHUgKz0gb3V0W3BpZF0uY3B1O1xuXHRcdH1cblx0XHRyZXR1cm4gY3B1O1xuXHR9Ki9cbn1cbiJdfQ==
