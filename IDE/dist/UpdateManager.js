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

//# sourceMappingURL=data:application/json;charset=utf8;base64,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LENBQUMsQ0FBQztJQUNoQyxJQUFJLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUNoQyxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLEVBQUUsVUFBQyxJQUFZO1FBQ25DLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQzVCLGNBQWMsQ0FBQyxTQUFTLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQzNDLENBQUMsQ0FBQyxDQUFDO0lBQ0gsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxFQUFFLFVBQUMsSUFBWTtRQUNuQyxPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUM1QixjQUFjLENBQUMsU0FBUyxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUM1QyxDQUFDLENBQUMsQ0FBQztJQUNILE9BQU8sSUFBSSxDQUFDO0FBQ2IsQ0FBQyIsImZpbGUiOiJVcGRhdGVNYW5hZ2VyLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgZmlsZV9tYW5hZ2VyIGZyb20gJy4vRmlsZU1hbmFnZXInO1xuaW1wb3J0ICogYXMgc29ja2V0X21hbmFnZXIgZnJvbSAnLi9Tb2NrZXRNYW5hZ2VyJztcbmltcG9ydCAqIGFzIGNoaWxkX3Byb2Nlc3MgZnJvbSAnY2hpbGRfcHJvY2Vzcyc7XG5pbXBvcnQgKiBhcyBwYXRocyBmcm9tICcuL3BhdGhzJztcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHVwbG9hZChkYXRhOiBhbnkpe1xuXHR0cnl7XG5cdFx0c29ja2V0X21hbmFnZXIuYnJvYWRjYXN0KCdzdGQtbG9nJywgJ1VwbG9hZCBjb21wbGV0ZWQsIHNhdmluZyB1cGRhdGUgZmlsZS4uLicpO1xuXHRcdGF3YWl0IGZpbGVfbWFuYWdlci5lbXB0eV9kaXJlY3RvcnkocGF0aHMudXBkYXRlKTtcblx0XHRhd2FpdCBmaWxlX21hbmFnZXIud3JpdGVfZmlsZShwYXRocy51cGRhdGUrZGF0YS5uYW1lLCBkYXRhLmZpbGUpO1xuXHRcdHNvY2tldF9tYW5hZ2VyLmJyb2FkY2FzdCgnc3RkLWxvZycsICd1bnppcHBpbmcgYW5kIHZhbGlkYXRpbmcgdXBkYXRlLi4uJyk7XG5cdFx0YXdhaXQgY2hlY2tfdXBkYXRlKCk7XG5cdFx0c29ja2V0X21hbmFnZXIuYnJvYWRjYXN0KCdzdGQtbG9nJywgJ0FwcGx5aW5nIHVwZGF0ZS4uLicpO1xuXHRcdGF3YWl0IGFwcGx5X3VwZGF0ZSgpO1xuXHRcdHNvY2tldF9tYW5hZ2VyLmJyb2FkY2FzdCgnc3RkLWxvZycsICdVcGRhdGUgY29tcGxldGUhJyk7XG5cdFx0c29ja2V0X21hbmFnZXIuYnJvYWRjYXN0KCdmb3JjZS1yZWxvYWQnLCAnJyk7XG5cdH1cblx0Y2F0Y2goZSl7XG5cdFx0Y29uc29sZS5sb2coJ3VwZGF0ZSBmYWlsZWQnLCBlLnRvU3RyaW5nKCkpO1xuXHRcdHNvY2tldF9tYW5hZ2VyLmJyb2FkY2FzdCgndXBkYXRlLWVycm9yJywgZS50b1N0cmluZygpKTtcblx0fVxufVxuXG5mdW5jdGlvbiBjaGVja191cGRhdGUoKXtcblx0cmV0dXJuIG5ldyBQcm9taXNlKCAocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG5cdFx0bGV0IHByb2MgPSBzcGF3bl9wcm9jZXNzKCdjaGVja3VwZGF0ZScpO1xuXHRcdHByb2Mub24oJ2Nsb3NlJywgKGNvZGU6IG51bWJlcikgPT4ge1xuXHRcdFx0aWYgKGNvZGUgPT09IDApe1xuXHRcdFx0XHRyZXNvbHZlKCk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRyZWplY3QobmV3IEVycm9yKCdjaGVja3VwYXRlIGZhaWxlZCB3aXRoIGNvZGUgJytjb2RlKSlcblx0XHRcdH07XG5cdFx0fSk7XG5cdFx0cHJvYy5vbignZXJyb3InLCAoZTogRXJyb3IpID0+IHJlamVjdChlKSApO1xuXHR9KTtcbn1cblxuZnVuY3Rpb24gYXBwbHlfdXBkYXRlKCl7XG5cdHJldHVybiBuZXcgUHJvbWlzZSggKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuXHRcdGxldCBwcm9jID0gc3Bhd25fcHJvY2VzcygndXBkYXRlJyk7XG5cdFx0cHJvYy5vbignY2xvc2UnLCAoKSA9PiByZXNvbHZlKCkgKTtcblx0XHRwcm9jLm9uKCdlcnJvcicsIChlOiBFcnJvcikgPT4gcmVqZWN0KGUpICk7XG5cdH0pO1xufVxuXG5mdW5jdGlvbiBzcGF3bl9wcm9jZXNzKHRhcmdldDogc3RyaW5nKTogY2hpbGRfcHJvY2Vzcy5DaGlsZFByb2Nlc3N7XG5cdGxldCBwcm9jID0gY2hpbGRfcHJvY2Vzcy5zcGF3bignbWFrZScsIFsnLS1uby1wcmludC1kaXJlY3RvcnknLCAnLUMnLCBwYXRocy5CZWxhLCB0YXJnZXRdKTtcblx0cHJvYy5zdGRvdXQuc2V0RW5jb2RpbmcoJ3V0ZjgnKTtcblx0cHJvYy5zdGRlcnIuc2V0RW5jb2RpbmcoJ3V0ZjgnKTtcblx0cHJvYy5zdGRvdXQub24oJ2RhdGEnLCAoZGF0YTogc3RyaW5nKSA9PiB7XG5cdFx0Y29uc29sZS5sb2coJ3N0ZG91dCcsIGRhdGEpO1xuXHRcdHNvY2tldF9tYW5hZ2VyLmJyb2FkY2FzdCgnc3RkLWxvZycsIGRhdGEpO1xuXHR9KTtcblx0cHJvYy5zdGRlcnIub24oJ2RhdGEnLCAoZGF0YTogc3RyaW5nKSA9PiB7XG5cdFx0Y29uc29sZS5sb2coJ3N0ZGVycicsIGRhdGEpO1xuXHRcdHNvY2tldF9tYW5hZ2VyLmJyb2FkY2FzdCgnc3RkLXdhcm4nLCBkYXRhKTtcblx0fSk7XG5cdHJldHVybiBwcm9jO1xufVxuIl19
