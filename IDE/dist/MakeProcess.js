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
            var project_args, args, _i, _a, arg;
            var _this = this;
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
                                arg = arg.trim();
                                if (arg.length > 0)
                                    args.push(arg);
                            }
                        }
                        console.log("make '" + args.join("' '") + "'");
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
