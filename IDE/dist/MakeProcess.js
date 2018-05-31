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
                            'CL=' + project_args.CL
                        ];
                        if (project_args.make) {
                            for (_i = 0, _a = project_args.make; _i < _a.length; _i++) {
                                arg = _a[_i];
                                if (arg.length > 0)
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,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LEVBQUUsS0FBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDOzRCQUM5QyxLQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7d0JBQ2hCLENBQUMsQ0FBQyxDQUFDOzs7OztLQUNIO0lBRUQsMEJBQUksR0FBSjtRQUNDLElBQUksSUFBSSxDQUFDLE1BQU0sSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUM7WUFDaEQsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUM7WUFDbkIsMEJBQTBCO1lBQzFCLElBQUc7Z0JBQ0YsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7YUFDN0I7WUFDRCxPQUFNLENBQUMsRUFBQztnQkFDUCxxRUFBcUU7YUFDckU7U0FDRDtJQUNGLENBQUM7SUFFRCxnQ0FBVSxHQUFWO1FBQ0MsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDO0lBQ3BCLENBQUM7SUFFRCwyQkFBSyxHQUFMLFVBQU0sY0FBeUQ7UUFDOUQsNkNBQTZDO1FBQzdDLElBQUksQ0FBQyxjQUFjLEdBQUcsY0FBYyxDQUFDO1FBQ3JDLElBQUksQ0FBQyxlQUFlLEdBQUcsSUFBSSxDQUFDO0lBQzdCLENBQUM7SUFFTyw2QkFBTyxHQUFmO1FBQ0MsSUFBSSxJQUFJLENBQUMsZUFBZSxFQUFDO1lBQ3hCLCtDQUErQztZQUMvQyxJQUFJLENBQUMsZUFBZSxHQUFHLEtBQUssQ0FBQztZQUM3QixJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1NBQzlDO0lBQ0YsQ0FBQztJQWVGLGtCQUFDO0FBQUQsQ0FuR0EsQUFtR0MsQ0FuR2dDLGFBQWEsR0FtRzdDO0FBbkdZLGtDQUFXIiwiZmlsZSI6Ik1ha2VQcm9jZXNzLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2hpbGRfcHJvY2VzcyBmcm9tICdjaGlsZF9wcm9jZXNzJztcbmltcG9ydCAqIGFzIEV2ZW50X0VtaXR0ZXIgZnJvbSAnZXZlbnRzJztcbmltcG9ydCAqIGFzIHBhdGhzIGZyb20gJy4vcGF0aHMnO1xuaW1wb3J0ICogYXMgcHJvamVjdF9zZXR0aW5ncyBmcm9tICcuL1Byb2plY3RTZXR0aW5ncyc7XG5pbXBvcnQgeyBMb2NrIH0gZnJvbSAnLi9Mb2NrJztcblxuZXhwb3J0IGNsYXNzIE1ha2VQcm9jZXNzIGV4dGVuZHMgRXZlbnRfRW1pdHRlcntcblx0cHJpdmF0ZSBwcm9jOiBjaGlsZF9wcm9jZXNzLkNoaWxkUHJvY2Vzcztcblx0cHJpdmF0ZSBtYWtlX3RhcmdldDogc3RyaW5nO1xuXHRwcm9qZWN0OiBzdHJpbmc7XG5cdHByaXZhdGUgc3RkZXJyOiBzdHJpbmc7XG5cdHByaXZhdGUgYWN0aXZlOiBib29sZWFuID0gZmFsc2U7XG5cdHByaXZhdGUga2lsbGVkOiBib29sZWFuID0gZmFsc2U7XG5cdHByaXZhdGUgY2FsbGJhY2tfcXVldWVkOiBib29sZWFuID0gZmFsc2U7XG5cdHByaXZhdGUgcXVldWVfY2FsbGJhY2s6IChzdGRlcnI6IHN0cmluZywga2lsbGVkOiBib29sZWFuKSA9PiB2b2lkO1xuXG5cdGNvbnN0cnVjdG9yKG1ha2VfdGFyZ2V0OiBzdHJpbmcpe1xuXHRcdHN1cGVyKCk7XG5cdFx0dGhpcy5tYWtlX3RhcmdldCA9IG1ha2VfdGFyZ2V0O1xuXHR9XG5cblx0YXN5bmMgc3RhcnQocHJvamVjdDogc3RyaW5nKXtcblx0XHR0aGlzLmFjdGl2ZSA9IHRydWU7XG5cdFx0dGhpcy5wcm9qZWN0ID0gcHJvamVjdDtcblx0XHR0aGlzLnN0ZGVyciA9ICcnO1xuXHRcdHRoaXMua2lsbGVkID0gZmFsc2U7XG5cdFx0bGV0IHByb2plY3RfYXJnczoge0NMOnN0cmluZywgbWFrZTpzdHJpbmdbXX0gPSBhd2FpdCBwcm9qZWN0X3NldHRpbmdzLmdldEFyZ3MocHJvamVjdCk7XG5cdFx0bGV0IGFyZ3M6IHN0cmluZ1tdID0gW1xuXHRcdFx0Jy0tbm8tcHJpbnQtZGlyZWN0b3J5Jyxcblx0XHRcdCctQycsXG5cdFx0XHRwYXRocy5CZWxhLFxuXHRcdFx0dGhpcy5tYWtlX3RhcmdldCxcblx0XHRcdCdQUk9KRUNUPScrcHJvamVjdCxcblx0XHRcdCdDTD0nK3Byb2plY3RfYXJncy5DTFxuXHRcdF07XG5cdFx0aWYgKHByb2plY3RfYXJncy5tYWtlKXtcblx0XHRcdGZvciAobGV0IGFyZyBvZiBwcm9qZWN0X2FyZ3MubWFrZSl7XG5cdFx0XHRcdGlmIChhcmcubGVuZ3RoID4gMClcblx0XHRcdFx0XHRhcmdzLnB1c2goYXJnKTtcblx0XHRcdH1cblx0XHR9XG5cdFx0Y29uc29sZS5sb2coJ21ha2UnLCBhcmdzLmpvaW4oJyAnKSk7XG5cdFx0dGhpcy5wcm9jID0gY2hpbGRfcHJvY2Vzcy5zcGF3bignbWFrZScsIGFyZ3MsIHtkZXRhY2hlZDogdHJ1ZX0pO1xuXHRcdHRoaXMuZW1pdCgnc3RhcnQnLCB0aGlzLnByb2MucGlkLCBwcm9qZWN0KTtcblx0XHR0aGlzLnByb2Muc3Rkb3V0LnNldEVuY29kaW5nKCd1dGYtOCcpO1xuXHRcdHRoaXMucHJvYy5zdGRlcnIuc2V0RW5jb2RpbmcoJ3V0Zi04Jyk7XG5cdFx0dGhpcy5wcm9jLnN0ZG91dC5vbignZGF0YScsIChkYXRhOiBzdHJpbmcpID0+IHtcblx0XHRcdHRoaXMuZW1pdCgnc3Rkb3V0JywgZGF0YSk7XG5cdFx0fSk7XG5cdFx0dGhpcy5wcm9jLnN0ZGVyci5vbignZGF0YScsIChkYXRhOiBzdHJpbmcpID0+IHtcblx0XHRcdHRoaXMuc3RkZXJyICs9IGRhdGE7XG5cdFx0XHR0aGlzLmVtaXQoJ3N0ZGVycicsIGRhdGEpO1xuXHRcdH0pO1xuXHRcdC8vIHRoaXMucHJvYy5vbignZXhpdCcsICgpID0+IHRoaXMuZW1pdCgnZXhpdCcpICk7XG5cdFx0dGhpcy5wcm9jLm9uKCdjbG9zZScsICgpID0+IHtcblx0XHRcdHRoaXMuYWN0aXZlID0gZmFsc2U7XG5cdFx0XHR0aGlzLmVtaXQoJ2ZpbmlzaCcsIHRoaXMuc3RkZXJyLCB0aGlzLmtpbGxlZCk7XG5cdFx0XHR0aGlzLmRlcXVldWUoKTtcblx0XHR9KTtcblx0fVxuXG5cdHN0b3AoKXtcblx0XHRpZiAodGhpcy5hY3RpdmUgJiYgIXRoaXMua2lsbGVkICYmIHRoaXMucHJvYy5waWQpe1xuXHRcdFx0dGhpcy5raWxsZWQgPSB0cnVlO1xuXHRcdFx0Ly8gY29uc29sZS5sb2coJ2tpbGxpbmcnKTtcblx0XHRcdHRyeXtcblx0XHRcdFx0cHJvY2Vzcy5raWxsKC10aGlzLnByb2MucGlkKTtcblx0XHRcdH1cblx0XHRcdGNhdGNoKGUpe1xuXHRcdFx0XHQvLyBjb25zb2xlLmxvZygnY291bGQgbm90IGtpbGwgbWFrZScsIHRoaXMubWFrZV90YXJnZXQsICc6JywgZS5jb2RlKTtcblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHRnZXRfc3RhdHVzKCk6IGJvb2xlYW4ge1xuXHRcdHJldHVybiB0aGlzLmFjdGl2ZTtcblx0fVxuXG5cdHF1ZXVlKHF1ZXVlX2NhbGxiYWNrOiAoc3RkZXJyOiBzdHJpbmcsIGtpbGxlZDogYm9vbGVhbikgPT4gdm9pZCApe1xuXHRcdC8vIGNvbnNvbGUubG9nKCdxdWV1ZWluZycsIHRoaXMubWFrZV90YXJnZXQpO1xuXHRcdHRoaXMucXVldWVfY2FsbGJhY2sgPSBxdWV1ZV9jYWxsYmFjaztcblx0XHR0aGlzLmNhbGxiYWNrX3F1ZXVlZCA9IHRydWU7XG5cdH1cblxuXHRwcml2YXRlIGRlcXVldWUoKXtcblx0XHRpZiAodGhpcy5jYWxsYmFja19xdWV1ZWQpe1xuXHRcdFx0Ly8gY29uc29sZS5sb2coJ2RlcXVldWVpbmcnLCB0aGlzLm1ha2VfdGFyZ2V0KTtcblx0XHRcdHRoaXMuY2FsbGJhY2tfcXVldWVkID0gZmFsc2U7XG5cdFx0XHR0aGlzLnF1ZXVlX2NhbGxiYWNrKHRoaXMuc3RkZXJyLCB0aGlzLmtpbGxlZCk7XG5cdFx0fVxuXHR9XG5cblx0Ly8gdGhpcyBmdW5jdGlvbiByZXR1cm5zIHRoZSBsaW51eC1kb21haW4gY3B1IHVzYWdlIG9mIGFsbCBjaGlsZCBwcm9jZXNzZXNcblx0Ly8gaXQgd29ya3MgZm9yIGFsbCB0aHJlZSBtYWtlIHByb2Nlc3NlcyBidXQgaXMgdmVyeSBleHBlbnNpdmVcblx0Ly8gQ1BVTW9uaXRvciBvbmx5IHdvcmtzIGZvciB0aGUgcnVuIHByb2Nlc3MsIGJ1dCBpcyBtb3JlIGVmZmljaWVudFxuXHQvKmFzeW5jIENQVSgpOiBQcm9taXNlPGFueT57XG5cdFx0aWYgKCF0aGlzLmdldF9zdGF0dXMoKSB8fCAhdGhpcy5wcm9jLnBpZCkgcmV0dXJuICcwJztcblx0XHRsZXQgcGlkcyA9IGF3YWl0IHBpZHRyZWUodGhpcy5wcm9jLnBpZCwge3Jvb3Q6IHRydWV9KTtcblx0XHRsZXQgb3V0ID0gYXdhaXQgcGlkdXNhZ2UocGlkcyk7XG5cdFx0bGV0IGNwdSA9IDA7XG5cdFx0Zm9yIChsZXQgcGlkIG9mIHBpZHMpe1xuXHRcdFx0Y3B1ICs9IG91dFtwaWRdLmNwdTtcblx0XHR9XG5cdFx0cmV0dXJuIGNwdTtcblx0fSovXG59XG4iXX0=
