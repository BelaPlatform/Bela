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
                    _a.trys.push([0, 4, , 5]);
                    socket_manager.broadcast('std-log', 'Upload completed, saving update file...');
                    return [4 /*yield*/, file_manager.write_file(paths.update + data.name, data.file)];
                case 1:
                    _a.sent();
                    socket_manager.broadcast('std-log', 'unzipping and validating update...');
                    return [4 /*yield*/, check_update()];
                case 2:
                    _a.sent();
                    socket_manager.broadcast('std-log', 'Applying update...');
                    return [4 /*yield*/, apply_update()];
                case 3:
                    _a.sent();
                    socket_manager.broadcast('std-log', 'Update complete!');
                    socket_manager.broadcast('force-reload', '');
                    return [3 /*break*/, 5];
                case 4:
                    e_1 = _a.sent();
                    console.log('update failed', e_1.toString());
                    socket_manager.broadcast('update-error', e_1.toString());
                    return [3 /*break*/, 5];
                case 5: return [2 /*return*/];
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,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QUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sRUFBRSxVQUFDLElBQVk7UUFDbkMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDNUIsY0FBYyxDQUFDLFNBQVMsQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDM0MsQ0FBQyxDQUFDLENBQUM7SUFDSCxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLEVBQUUsVUFBQyxJQUFZO1FBQ25DLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQzVCLGNBQWMsQ0FBQyxTQUFTLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQzVDLENBQUMsQ0FBQyxDQUFDO0lBQ0gsT0FBTyxJQUFJLENBQUM7QUFDYixDQUFDIiwiZmlsZSI6IlVwZGF0ZU1hbmFnZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBmaWxlX21hbmFnZXIgZnJvbSAnLi9GaWxlTWFuYWdlcic7XG5pbXBvcnQgKiBhcyBzb2NrZXRfbWFuYWdlciBmcm9tICcuL1NvY2tldE1hbmFnZXInO1xuaW1wb3J0ICogYXMgY2hpbGRfcHJvY2VzcyBmcm9tICdjaGlsZF9wcm9jZXNzJztcbmltcG9ydCAqIGFzIHBhdGhzIGZyb20gJy4vcGF0aHMnO1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gdXBsb2FkKGRhdGE6IGFueSl7XG5cdHRyeXtcblx0XHRzb2NrZXRfbWFuYWdlci5icm9hZGNhc3QoJ3N0ZC1sb2cnLCAnVXBsb2FkIGNvbXBsZXRlZCwgc2F2aW5nIHVwZGF0ZSBmaWxlLi4uJyk7XG5cdFx0YXdhaXQgZmlsZV9tYW5hZ2VyLndyaXRlX2ZpbGUocGF0aHMudXBkYXRlK2RhdGEubmFtZSwgZGF0YS5maWxlKTtcblx0XHRzb2NrZXRfbWFuYWdlci5icm9hZGNhc3QoJ3N0ZC1sb2cnLCAndW56aXBwaW5nIGFuZCB2YWxpZGF0aW5nIHVwZGF0ZS4uLicpO1xuXHRcdGF3YWl0IGNoZWNrX3VwZGF0ZSgpO1xuXHRcdHNvY2tldF9tYW5hZ2VyLmJyb2FkY2FzdCgnc3RkLWxvZycsICdBcHBseWluZyB1cGRhdGUuLi4nKTtcblx0XHRhd2FpdCBhcHBseV91cGRhdGUoKTtcblx0XHRzb2NrZXRfbWFuYWdlci5icm9hZGNhc3QoJ3N0ZC1sb2cnLCAnVXBkYXRlIGNvbXBsZXRlIScpO1xuXHRcdHNvY2tldF9tYW5hZ2VyLmJyb2FkY2FzdCgnZm9yY2UtcmVsb2FkJywgJycpO1xuXHR9XG5cdGNhdGNoKGUpe1xuXHRcdGNvbnNvbGUubG9nKCd1cGRhdGUgZmFpbGVkJywgZS50b1N0cmluZygpKTtcblx0XHRzb2NrZXRfbWFuYWdlci5icm9hZGNhc3QoJ3VwZGF0ZS1lcnJvcicsIGUudG9TdHJpbmcoKSk7XG5cdH1cbn1cblxuZnVuY3Rpb24gY2hlY2tfdXBkYXRlKCl7XG5cdHJldHVybiBuZXcgUHJvbWlzZSggKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuXHRcdGxldCBwcm9jID0gc3Bhd25fcHJvY2VzcygnY2hlY2t1cGRhdGUnKTtcblx0XHRwcm9jLm9uKCdjbG9zZScsIChjb2RlOiBudW1iZXIpID0+IHtcblx0XHRcdGlmIChjb2RlID09PSAwKXtcblx0XHRcdFx0cmVzb2x2ZSgpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0cmVqZWN0KG5ldyBFcnJvcignY2hlY2t1cGF0ZSBmYWlsZWQgd2l0aCBjb2RlICcrY29kZSkpXG5cdFx0XHR9O1xuXHRcdH0pO1xuXHRcdHByb2Mub24oJ2Vycm9yJywgKGU6IEVycm9yKSA9PiByZWplY3QoZSkgKTtcblx0fSk7XG59XG5cbmZ1bmN0aW9uIGFwcGx5X3VwZGF0ZSgpe1xuXHRyZXR1cm4gbmV3IFByb21pc2UoIChyZXNvbHZlLCByZWplY3QpID0+IHtcblx0XHRsZXQgcHJvYyA9IHNwYXduX3Byb2Nlc3MoJ3VwZGF0ZScpO1xuXHRcdHByb2Mub24oJ2Nsb3NlJywgKCkgPT4gcmVzb2x2ZSgpICk7XG5cdFx0cHJvYy5vbignZXJyb3InLCAoZTogRXJyb3IpID0+IHJlamVjdChlKSApO1xuXHR9KTtcbn1cblxuZnVuY3Rpb24gc3Bhd25fcHJvY2Vzcyh0YXJnZXQ6IHN0cmluZyk6IGNoaWxkX3Byb2Nlc3MuQ2hpbGRQcm9jZXNze1xuXHRsZXQgcHJvYyA9IGNoaWxkX3Byb2Nlc3Muc3Bhd24oJ21ha2UnLCBbJy0tbm8tcHJpbnQtZGlyZWN0b3J5JywgJy1DJywgcGF0aHMuQmVsYSwgdGFyZ2V0XSk7XG5cdHByb2Muc3Rkb3V0LnNldEVuY29kaW5nKCd1dGY4Jyk7XG5cdHByb2Muc3RkZXJyLnNldEVuY29kaW5nKCd1dGY4Jyk7XG5cdHByb2Muc3Rkb3V0Lm9uKCdkYXRhJywgKGRhdGE6IHN0cmluZykgPT4ge1xuXHRcdGNvbnNvbGUubG9nKCdzdGRvdXQnLCBkYXRhKTtcblx0XHRzb2NrZXRfbWFuYWdlci5icm9hZGNhc3QoJ3N0ZC1sb2cnLCBkYXRhKTtcblx0fSk7XG5cdHByb2Muc3RkZXJyLm9uKCdkYXRhJywgKGRhdGE6IHN0cmluZykgPT4ge1xuXHRcdGNvbnNvbGUubG9nKCdzdGRlcnInLCBkYXRhKTtcblx0XHRzb2NrZXRfbWFuYWdlci5icm9hZGNhc3QoJ3N0ZC13YXJuJywgZGF0YSk7XG5cdH0pO1xuXHRyZXR1cm4gcHJvYztcbn1cbiJdfQ==
