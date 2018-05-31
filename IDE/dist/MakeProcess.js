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
                        this.proc.on('close', function (code, signal) {
                            _this.active = false;
                            _this.return_code = code;
                            _this.emit('finish', _this.stderr, _this.killed, code);
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
            this.queue_callback(this.stderr, this.killed, this.return_code);
        }
    };
    return MakeProcess;
}(Event_Emitter));
exports.MakeProcess = MakeProcess;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIk1ha2VQcm9jZXNzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsNkNBQStDO0FBQy9DLHNDQUF3QztBQUN4QywrQkFBaUM7QUFDakMsb0RBQXNEO0FBR3REO0lBQWlDLCtCQUFhO0lBVzdDLHFCQUFZLFdBQW1CO1FBQS9CLFlBQ0MsaUJBQU8sU0FFUDtRQVRPLFlBQU0sR0FBWSxLQUFLLENBQUM7UUFDeEIsWUFBTSxHQUFZLEtBQUssQ0FBQztRQUN4QixxQkFBZSxHQUFZLEtBQUssQ0FBQztRQU14QyxLQUFJLENBQUMsV0FBVyxHQUFHLFdBQVcsQ0FBQzs7SUFDaEMsQ0FBQztJQUVLLDJCQUFLLEdBQVgsVUFBWSxPQUFlOzs7Ozs7O3dCQUMxQixJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQzt3QkFDbkIsSUFBSSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUM7d0JBQ3ZCLElBQUksQ0FBQyxNQUFNLEdBQUcsRUFBRSxDQUFDO3dCQUNqQixJQUFJLENBQUMsTUFBTSxHQUFHLEtBQUssQ0FBQzt3QkFDMkIscUJBQU0sZ0JBQWdCLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxFQUFBOzt3QkFBbEYsWUFBWSxHQUErQixTQUF1Qzt3QkFDbEYsSUFBSSxHQUFhOzRCQUNwQixzQkFBc0I7NEJBQ3RCLElBQUk7NEJBQ0osS0FBSyxDQUFDLElBQUk7NEJBQ1YsSUFBSSxDQUFDLFdBQVc7NEJBQ2hCLFVBQVUsR0FBQyxPQUFPOzRCQUNsQixLQUFLLEdBQUMsWUFBWSxDQUFDLEVBQUU7eUJBQ3JCLENBQUM7d0JBQ0YsSUFBSSxZQUFZLENBQUMsSUFBSSxFQUFDOzRCQUNyQixXQUFpQyxFQUFqQixLQUFBLFlBQVksQ0FBQyxJQUFJLEVBQWpCLGNBQWlCLEVBQWpCLElBQWlCO2dDQUF4QixHQUFHO2dDQUNYLElBQUksR0FBRyxDQUFDLE1BQU0sR0FBRyxDQUFDO29DQUNqQixJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDOzZCQUNoQjt5QkFDRDt3QkFDRCxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7d0JBQ3BDLElBQUksQ0FBQyxJQUFJLEdBQUcsYUFBYSxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLEVBQUMsUUFBUSxFQUFFLElBQUksRUFBQyxDQUFDLENBQUM7d0JBQ2hFLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLE9BQU8sQ0FBQyxDQUFDO3dCQUMzQyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUM7d0JBQ3RDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQzt3QkFDdEMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sRUFBRSxVQUFDLElBQVk7NEJBQ3hDLEtBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxDQUFDO3dCQUMzQixDQUFDLENBQUMsQ0FBQzt3QkFDSCxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxFQUFFLFVBQUMsSUFBWTs0QkFDeEMsS0FBSSxDQUFDLE1BQU0sSUFBSSxJQUFJLENBQUM7NEJBQ3BCLEtBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxDQUFDO3dCQUMzQixDQUFDLENBQUMsQ0FBQzt3QkFDSCxrREFBa0Q7d0JBQ2xELElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLE9BQU8sRUFBRSxVQUFDLElBQVksRUFBRSxNQUFjOzRCQUNsRCxLQUFJLENBQUMsTUFBTSxHQUFHLEtBQUssQ0FBQzs0QkFDcEIsS0FBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUM7NEJBQ3hCLEtBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLEtBQUksQ0FBQyxNQUFNLEVBQUUsS0FBSSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQzs0QkFDcEQsS0FBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO3dCQUNoQixDQUFDLENBQUMsQ0FBQzs7Ozs7S0FDSDtJQUVELDBCQUFJLEdBQUo7UUFDQyxJQUFJLElBQUksQ0FBQyxNQUFNLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFDO1lBQ2hELElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDO1lBQ25CLDBCQUEwQjtZQUMxQixJQUFHO2dCQUNGLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO2FBQzdCO1lBQ0QsT0FBTSxDQUFDLEVBQUM7Z0JBQ1AscUVBQXFFO2FBQ3JFO1NBQ0Q7SUFDRixDQUFDO0lBRUQsZ0NBQVUsR0FBVjtRQUNDLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQztJQUNwQixDQUFDO0lBRUQsMkJBQUssR0FBTCxVQUFNLGNBQXVFO1FBQzVFLDZDQUE2QztRQUM3QyxJQUFJLENBQUMsY0FBYyxHQUFHLGNBQWMsQ0FBQztRQUNyQyxJQUFJLENBQUMsZUFBZSxHQUFHLElBQUksQ0FBQztJQUM3QixDQUFDO0lBRU8sNkJBQU8sR0FBZjtRQUNDLElBQUksSUFBSSxDQUFDLGVBQWUsRUFBQztZQUN4QiwrQ0FBK0M7WUFDL0MsSUFBSSxDQUFDLGVBQWUsR0FBRyxLQUFLLENBQUM7WUFDN0IsSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1NBQ2hFO0lBQ0YsQ0FBQztJQWVGLGtCQUFDO0FBQUQsQ0FyR0EsQUFxR0MsQ0FyR2dDLGFBQWEsR0FxRzdDO0FBckdZLGtDQUFXIiwiZmlsZSI6Ik1ha2VQcm9jZXNzLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2hpbGRfcHJvY2VzcyBmcm9tICdjaGlsZF9wcm9jZXNzJztcbmltcG9ydCAqIGFzIEV2ZW50X0VtaXR0ZXIgZnJvbSAnZXZlbnRzJztcbmltcG9ydCAqIGFzIHBhdGhzIGZyb20gJy4vcGF0aHMnO1xuaW1wb3J0ICogYXMgcHJvamVjdF9zZXR0aW5ncyBmcm9tICcuL1Byb2plY3RTZXR0aW5ncyc7XG5pbXBvcnQgeyBMb2NrIH0gZnJvbSAnLi9Mb2NrJztcblxuZXhwb3J0IGNsYXNzIE1ha2VQcm9jZXNzIGV4dGVuZHMgRXZlbnRfRW1pdHRlcntcblx0cHJpdmF0ZSBwcm9jOiBjaGlsZF9wcm9jZXNzLkNoaWxkUHJvY2Vzcztcblx0cHJpdmF0ZSBtYWtlX3RhcmdldDogc3RyaW5nO1xuXHRwcm9qZWN0OiBzdHJpbmc7XG5cdHByaXZhdGUgc3RkZXJyOiBzdHJpbmc7XG5cdHByaXZhdGUgYWN0aXZlOiBib29sZWFuID0gZmFsc2U7XG5cdHByaXZhdGUga2lsbGVkOiBib29sZWFuID0gZmFsc2U7XG5cdHByaXZhdGUgY2FsbGJhY2tfcXVldWVkOiBib29sZWFuID0gZmFsc2U7XG5cdHByaXZhdGUgcXVldWVfY2FsbGJhY2s6IChzdGRlcnI6IHN0cmluZywga2lsbGVkOiBib29sZWFuLCBjb2RlOiBudW1iZXIpID0+IHZvaWQ7XG5cdHByaXZhdGUgcmV0dXJuX2NvZGU6IG51bWJlcjtcblxuXHRjb25zdHJ1Y3RvcihtYWtlX3RhcmdldDogc3RyaW5nKXtcblx0XHRzdXBlcigpO1xuXHRcdHRoaXMubWFrZV90YXJnZXQgPSBtYWtlX3RhcmdldDtcblx0fVxuXG5cdGFzeW5jIHN0YXJ0KHByb2plY3Q6IHN0cmluZyl7XG5cdFx0dGhpcy5hY3RpdmUgPSB0cnVlO1xuXHRcdHRoaXMucHJvamVjdCA9IHByb2plY3Q7XG5cdFx0dGhpcy5zdGRlcnIgPSAnJztcblx0XHR0aGlzLmtpbGxlZCA9IGZhbHNlO1xuXHRcdGxldCBwcm9qZWN0X2FyZ3M6IHtDTDpzdHJpbmcsIG1ha2U6c3RyaW5nW119ID0gYXdhaXQgcHJvamVjdF9zZXR0aW5ncy5nZXRBcmdzKHByb2plY3QpO1xuXHRcdGxldCBhcmdzOiBzdHJpbmdbXSA9IFtcblx0XHRcdCctLW5vLXByaW50LWRpcmVjdG9yeScsXG5cdFx0XHQnLUMnLFxuXHRcdFx0cGF0aHMuQmVsYSxcblx0XHRcdHRoaXMubWFrZV90YXJnZXQsXG5cdFx0XHQnUFJPSkVDVD0nK3Byb2plY3QsXG5cdFx0XHQnQ0w9Jytwcm9qZWN0X2FyZ3MuQ0xcblx0XHRdO1xuXHRcdGlmIChwcm9qZWN0X2FyZ3MubWFrZSl7XG5cdFx0XHRmb3IgKGxldCBhcmcgb2YgcHJvamVjdF9hcmdzLm1ha2Upe1xuXHRcdFx0XHRpZiAoYXJnLmxlbmd0aCA+IDApXG5cdFx0XHRcdFx0YXJncy5wdXNoKGFyZyk7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdGNvbnNvbGUubG9nKCdtYWtlJywgYXJncy5qb2luKCcgJykpO1xuXHRcdHRoaXMucHJvYyA9IGNoaWxkX3Byb2Nlc3Muc3Bhd24oJ21ha2UnLCBhcmdzLCB7ZGV0YWNoZWQ6IHRydWV9KTtcblx0XHR0aGlzLmVtaXQoJ3N0YXJ0JywgdGhpcy5wcm9jLnBpZCwgcHJvamVjdCk7XG5cdFx0dGhpcy5wcm9jLnN0ZG91dC5zZXRFbmNvZGluZygndXRmLTgnKTtcblx0XHR0aGlzLnByb2Muc3RkZXJyLnNldEVuY29kaW5nKCd1dGYtOCcpO1xuXHRcdHRoaXMucHJvYy5zdGRvdXQub24oJ2RhdGEnLCAoZGF0YTogc3RyaW5nKSA9PiB7XG5cdFx0XHR0aGlzLmVtaXQoJ3N0ZG91dCcsIGRhdGEpO1xuXHRcdH0pO1xuXHRcdHRoaXMucHJvYy5zdGRlcnIub24oJ2RhdGEnLCAoZGF0YTogc3RyaW5nKSA9PiB7XG5cdFx0XHR0aGlzLnN0ZGVyciArPSBkYXRhO1xuXHRcdFx0dGhpcy5lbWl0KCdzdGRlcnInLCBkYXRhKTtcblx0XHR9KTtcblx0XHQvLyB0aGlzLnByb2Mub24oJ2V4aXQnLCAoKSA9PiB0aGlzLmVtaXQoJ2V4aXQnKSApO1xuXHRcdHRoaXMucHJvYy5vbignY2xvc2UnLCAoY29kZTogbnVtYmVyLCBzaWduYWw6IHN0cmluZykgPT4ge1xuXHRcdFx0dGhpcy5hY3RpdmUgPSBmYWxzZTtcblx0XHRcdHRoaXMucmV0dXJuX2NvZGUgPSBjb2RlO1xuXHRcdFx0dGhpcy5lbWl0KCdmaW5pc2gnLCB0aGlzLnN0ZGVyciwgdGhpcy5raWxsZWQsIGNvZGUpO1xuXHRcdFx0dGhpcy5kZXF1ZXVlKCk7XG5cdFx0fSk7XG5cdH1cblxuXHRzdG9wKCl7XG5cdFx0aWYgKHRoaXMuYWN0aXZlICYmICF0aGlzLmtpbGxlZCAmJiB0aGlzLnByb2MucGlkKXtcblx0XHRcdHRoaXMua2lsbGVkID0gdHJ1ZTtcblx0XHRcdC8vIGNvbnNvbGUubG9nKCdraWxsaW5nJyk7XG5cdFx0XHR0cnl7XG5cdFx0XHRcdHByb2Nlc3Mua2lsbCgtdGhpcy5wcm9jLnBpZCk7XG5cdFx0XHR9XG5cdFx0XHRjYXRjaChlKXtcblx0XHRcdFx0Ly8gY29uc29sZS5sb2coJ2NvdWxkIG5vdCBraWxsIG1ha2UnLCB0aGlzLm1ha2VfdGFyZ2V0LCAnOicsIGUuY29kZSk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0Z2V0X3N0YXR1cygpOiBib29sZWFuIHtcblx0XHRyZXR1cm4gdGhpcy5hY3RpdmU7XG5cdH1cblxuXHRxdWV1ZShxdWV1ZV9jYWxsYmFjazogKHN0ZGVycjogc3RyaW5nLCBraWxsZWQ6IGJvb2xlYW4sIGNvZGU6IG51bWJlcikgPT4gdm9pZCApe1xuXHRcdC8vIGNvbnNvbGUubG9nKCdxdWV1ZWluZycsIHRoaXMubWFrZV90YXJnZXQpO1xuXHRcdHRoaXMucXVldWVfY2FsbGJhY2sgPSBxdWV1ZV9jYWxsYmFjaztcblx0XHR0aGlzLmNhbGxiYWNrX3F1ZXVlZCA9IHRydWU7XG5cdH1cblxuXHRwcml2YXRlIGRlcXVldWUoKXtcblx0XHRpZiAodGhpcy5jYWxsYmFja19xdWV1ZWQpe1xuXHRcdFx0Ly8gY29uc29sZS5sb2coJ2RlcXVldWVpbmcnLCB0aGlzLm1ha2VfdGFyZ2V0KTtcblx0XHRcdHRoaXMuY2FsbGJhY2tfcXVldWVkID0gZmFsc2U7XG5cdFx0XHR0aGlzLnF1ZXVlX2NhbGxiYWNrKHRoaXMuc3RkZXJyLCB0aGlzLmtpbGxlZCwgdGhpcy5yZXR1cm5fY29kZSk7XG5cdFx0fVxuXHR9XG5cblx0Ly8gdGhpcyBmdW5jdGlvbiByZXR1cm5zIHRoZSBsaW51eC1kb21haW4gY3B1IHVzYWdlIG9mIGFsbCBjaGlsZCBwcm9jZXNzZXNcblx0Ly8gaXQgd29ya3MgZm9yIGFsbCB0aHJlZSBtYWtlIHByb2Nlc3NlcyBidXQgaXMgdmVyeSBleHBlbnNpdmVcblx0Ly8gQ1BVTW9uaXRvciBvbmx5IHdvcmtzIGZvciB0aGUgcnVuIHByb2Nlc3MsIGJ1dCBpcyBtb3JlIGVmZmljaWVudFxuXHQvKmFzeW5jIENQVSgpOiBQcm9taXNlPGFueT57XG5cdFx0aWYgKCF0aGlzLmdldF9zdGF0dXMoKSB8fCAhdGhpcy5wcm9jLnBpZCkgcmV0dXJuICcwJztcblx0XHRsZXQgcGlkcyA9IGF3YWl0IHBpZHRyZWUodGhpcy5wcm9jLnBpZCwge3Jvb3Q6IHRydWV9KTtcblx0XHRsZXQgb3V0ID0gYXdhaXQgcGlkdXNhZ2UocGlkcyk7XG5cdFx0bGV0IGNwdSA9IDA7XG5cdFx0Zm9yIChsZXQgcGlkIG9mIHBpZHMpe1xuXHRcdFx0Y3B1ICs9IG91dFtwaWRdLmNwdTtcblx0XHR9XG5cdFx0cmV0dXJuIGNwdTtcblx0fSovXG59XG4iXX0=
