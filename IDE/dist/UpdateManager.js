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
var child_process = require("child_process");
var paths = require("./paths");
function upload(data) {
    return __awaiter(this, void 0, void 0, function () {
        var e_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 5, , 6]);
                    socket_manager.broadcast('std-log', 'Upload completed, saving update file...');
                    return [4 /*yield*/, file_manager.empty_directory(paths.update)];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, file_manager.write_file(paths.update + data.name, data.file)];
                case 2:
                    _a.sent();
                    socket_manager.broadcast('std-log', 'unzipping and validating update...');
                    return [4 /*yield*/, check_update()];
                case 3:
                    _a.sent();
                    socket_manager.broadcast('std-log', 'Applying update...');
                    return [4 /*yield*/, apply_update()];
                case 4:
                    _a.sent();
                    socket_manager.broadcast('std-log', 'Update complete!');
                    socket_manager.broadcast('force-reload', '');
                    return [3 /*break*/, 6];
                case 5:
                    e_1 = _a.sent();
                    console.log('update failed', e_1.toString());
                    socket_manager.broadcast('update-error', e_1.toString());
                    return [3 /*break*/, 6];
                case 6: return [2 /*return*/];
            }
        });
    });
}
exports.upload = upload;
function check_update() {
    return new Promise(function (resolve, reject) {
        var proc = spawn_process('checkupdate');
        proc.on('close', function (code) {
            if (code === 0) {
                resolve();
            }
            else {
                reject(new Error('checkupate failed with code ' + code));
            }
            ;
        });
        proc.on('error', function (e) { return reject(e); });
    });
}
function apply_update() {
    return new Promise(function (resolve, reject) {
        var proc = spawn_process('update');
        proc.on('close', function () { return resolve(); });
        proc.on('error', function (e) { return reject(e); });
    });
}
function spawn_process(target) {
    var proc = child_process.spawn('make', ['--no-print-directory', '-C', paths.Bela, target]);
    proc.stdout.setEncoding('utf8');
    proc.stderr.setEncoding('utf8');
    proc.stdout.on('data', function (data) {
        console.log('stdout', data);
        socket_manager.broadcast('std-log', data);
    });
    proc.stderr.on('data', function (data) {
        console.log('stderr', data);
        socket_manager.broadcast('std-warn', data);
    });
    return proc;
}
