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
var io = require("socket.io");
var IDE = require("./main");
var project_manager = require("./ProjectManager");
var process_manager = require("./ProcessManager");
var git_manager = require("./GitManager");
var update_manager = require("./UpdateManager");
var project_settings = require("./ProjectSettings");
var ide_settings = require("./IDESettings");
var boot_project = require("./RunOnBoot");
var TerminalManager = require('./TerminalManager');
TerminalManager.on('shell-event', function (evt, data) { return ide_sockets.emit('shell-event', evt, data); });
// all connected sockets
var ide_sockets;
var num_connections = 0;
var interval;
function init(server) {
    ide_sockets = io(server, {
        pingInterval: 3000,
        pingTimeout: 6500
    }).of('/IDE');
    ide_sockets.on('connection', connection);
}
exports.init = init;
function broadcast(event, message) {
    // console.log('broadcasting', event, message);
    if (ide_sockets)
        ide_sockets.emit(event, message);
}
exports.broadcast = broadcast;
function connection(socket) {
    socket.on('set-time', IDE.set_time);
    socket.on('project-event', function (data) { return project_event(socket, data); });
    socket.on('project-settings', function (data) { return project_settings_event(socket, data); });
    socket.on('process-event', function (data) { return process_event(socket, data); });
    socket.on('IDE-settings', function (data) { return ide_settings_event(socket, data); });
    socket.on('git-event', function (data) { return git_event(socket, data); });
    socket.on('list-files', function (project) { return list_files(socket, project); });
    socket.on('run-on-boot', function (project) { return boot_project.set_boot_project(socket, project); });
    socket.on('sh-command', function (cmd) { return TerminalManager.execute(cmd); });
    socket.on('sh-tab', function (cmd) { return TerminalManager.tab(cmd); });
    socket.on('upload-update', function (data) { return update_manager.upload(data); });
    socket.on('shutdown', IDE.shutdown);
    socket.on('disconnect', disconnect);
    init_message(socket);
    TerminalManager.pwd();
    num_connections += 1;
    if (num_connections === 1) {
        interval = setInterval(interval_func, 2000);
    }
}
function disconnect() {
    num_connections = num_connections - 1;
    if (num_connections <= 0 && interval) {
        clearInterval(interval);
    }
}
function interval_func() {
    return __awaiter(this, void 0, void 0, function () {
        var projects;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, project_manager.listProjects()];
                case 1:
                    projects = _a.sent();
                    ide_sockets.emit('project-list', undefined, projects);
                    return [2 /*return*/];
            }
        });
    });
}
function init_message(socket) {
    return __awaiter(this, void 0, void 0, function () {
        var message, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _a = {};
                    return [4 /*yield*/, project_manager.listProjects()];
                case 1:
                    _a.projects = _b.sent();
                    return [4 /*yield*/, project_manager.listExamples()];
                case 2:
                    _a.examples = _b.sent();
                    return [4 /*yield*/, ide_settings.read()];
                case 3:
                    _a.settings = _b.sent();
                    return [4 /*yield*/, boot_project.get_boot_project()];
                case 4:
                    _a.boot_project = _b.sent();
                    return [4 /*yield*/, IDE.board_detect()];
                case 5:
                    _a.board_string = _b.sent();
                    return [4 /*yield*/, IDE.get_xenomai_version()
                        //	status : await process_manager.status()
                    ];
                case 6:
                    message = (_a.xenomai_version = _b.sent(),
                        _a);
                    socket.emit('init', message);
                    return [2 /*return*/];
            }
        });
    });
}
// Process all websocket events which need to be handled by the ProjectManager
function project_event(socket, data) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    //	console.log('project-event');
                    //	console.dir(data);
                    // reject any malformed websocket message
                    if ((!data.currentProject && !data.newProject) || !data.func || !project_manager[data.func]) {
                        console.log('bad project-event');
                        console.dir(data, { depth: null });
                        return [2 /*return*/];
                    }
                    // call the project_manager function specified in the func field of the ws message
                    return [4 /*yield*/, project_manager[data.func](data)
                            .catch(function (e) {
                            // in the event of an error, log it to the IDE console
                            // and send a string back to the browser for display to the user
                            console.log('project-event error:');
                            console.log(e);
                            data.error = e.toString();
                            socket.emit('project-data', data);
                        })];
                case 1:
                    // call the project_manager function specified in the func field of the ws message
                    _a.sent();
                    //	console.dir(data);
                    // after a succesful operation, send the data back
                    socket.emit('project-data', data);
                    if (data.currentProject) {
                        // save the current project in the IDE settings
                        ide_settings.setIDESetting({ key: 'project', value: data.currentProject });
                        // if a fileList was created, send it to other tabs
                        if (data.fileList)
                            socket.broadcast.emit('file-list', data.currentProject, data.fileList);
                        // if a projectList was created, send it to other tabs
                        if (data.projectList)
                            socket.broadcast.emit('project-list', data.currentProject, data.projectList);
                        // if a file was opened save this in the project settings
                        if (data.fileName)
                            project_settings.set_fileName(data.currentProject, data.fileName);
                    }
                    return [2 /*return*/];
            }
        });
    });
}
function project_settings_event(socket, data) {
    return __awaiter(this, void 0, void 0, function () {
        var settings;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    //	console.log('project_settings')
                    //	console.dir(data);
                    if (!data.currentProject || !data.func || !project_settings[data.func]) {
                        console.log('bad project-settings', data);
                        return [2 /*return*/];
                    }
                    return [4 /*yield*/, project_settings[data.func](data)
                            .catch(function (e) {
                            console.log('project-settings error');
                            console.log(e);
                            socket.emit('report-error', e.toString());
                        })];
                case 1:
                    settings = _a.sent();
                    //	console.log('project_settings')
                    //	console.dir(settings);
                    if (data.func === 'setCLArg') {
                        socket.broadcast.emit('project-settings-data', data.currentProject, settings);
                    }
                    else {
                        ide_sockets.emit('project-settings-data', data.currentProject, settings);
                    }
                    return [2 /*return*/];
            }
        });
    });
}
function process_event(socket, data) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!data || !data.currentProject || !data.event || !process_manager[data.event]) {
                        console.log('bad process-event', data);
                        return [2 /*return*/];
                    }
                    return [4 /*yield*/, process_manager[data.event](data)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
function ide_settings_event(socket, data) {
    return __awaiter(this, void 0, void 0, function () {
        var result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!data || !data.func || !ide_settings[data.func]) {
                        console.log('bad ide_settings event', data);
                        return [2 /*return*/];
                    }
                    return [4 /*yield*/, ide_settings[data.func](data)
                            .catch(function (e) { return console.log('ide_settings error', e); })];
                case 1:
                    result = _a.sent();
                    broadcast('IDE-settings-data', result);
                    return [2 /*return*/];
            }
        });
    });
}
function git_event(socket, data) {
    return __awaiter(this, void 0, void 0, function () {
        var data2, e_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!data.currentProject || !data.func || !git_manager[data.func]) {
                        console.log('bad git-event', data);
                        return [2 /*return*/];
                    }
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, , 5]);
                    return [4 /*yield*/, git_manager[data.func](data)];
                case 2:
                    _a.sent();
                    data2 = {
                        currentProject: data.currentProject,
                        timestamp: data.timestamp,
                        gitData: data
                    };
                    return [4 /*yield*/, project_manager.openProject(data2)];
                case 3:
                    _a.sent();
                    socket.emit('project-data', data2);
                    if (data2.currentProject) {
                        if (data2.projectList) {
                            socket.broadcast.emit('project-list', data2.currentProject, data2.projectList);
                        }
                        if (data2.fileList) {
                            socket.broadcast.emit('file-list', data2.currentProject, data2.fileList);
                        }
                        ide_settings.setIDESetting({ key: 'project', value: data2.currentProject });
                    }
                    return [3 /*break*/, 5];
                case 4:
                    e_1 = _a.sent();
                    console.log('git-event error', e_1);
                    data.error = e_1.toString();
                    socket.emit('project-data', { gitData: data, timestamp: data.timestamp });
                    socket.emit('report-error', e_1.toString());
                    return [3 /*break*/, 5];
                case 5: return [2 /*return*/];
            }
        });
    });
}
function list_files(socket, project) {
    return __awaiter(this, void 0, void 0, function () {
        var files;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, project_manager.listFiles(project)
                        .catch(function (e) { return console.log('error refreshing file list', e.toString()); })];
                case 1:
                    files = _a.sent();
                    socket.emit('file-list', project, files);
                    return [2 /*return*/];
            }
        });
    });
}

//# sourceMappingURL=data:application/json;charset=utf8;base64,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QVMsQ0FBQyxPQUFPLENBQUM7eUJBQzFFLEtBQUssQ0FBQyxVQUFDLENBQVEsSUFBSyxPQUFBLE9BQU8sQ0FBQyxHQUFHLENBQUMsNEJBQTRCLEVBQUUsQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDLEVBQXZELENBQXVELENBQUUsRUFBQTs7b0JBRDNFLEtBQUssR0FBMkIsU0FDMkM7b0JBQy9FLE1BQU0sQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLE9BQU8sRUFBRSxLQUFLLENBQUMsQ0FBQzs7Ozs7Q0FDekMiLCJmaWxlIjoiU29ja2V0TWFuYWdlci5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGlvIGZyb20gJ3NvY2tldC5pbyc7XG5pbXBvcnQgKiBhcyBodHRwIGZyb20gJ2h0dHAnO1xuaW1wb3J0ICogYXMgSURFIGZyb20gJy4vbWFpbic7XG5pbXBvcnQgKiBhcyBwcm9qZWN0X21hbmFnZXIgZnJvbSAnLi9Qcm9qZWN0TWFuYWdlcic7XG5pbXBvcnQgKiBhcyBwcm9jZXNzX21hbmFnZXIgZnJvbSAnLi9Qcm9jZXNzTWFuYWdlcic7XG5pbXBvcnQgKiBhcyBnaXRfbWFuYWdlciBmcm9tICcuL0dpdE1hbmFnZXInO1xuaW1wb3J0ICogYXMgdXBkYXRlX21hbmFnZXIgZnJvbSAnLi9VcGRhdGVNYW5hZ2VyJztcbmltcG9ydCAqIGFzIHByb2plY3Rfc2V0dGluZ3MgZnJvbSAnLi9Qcm9qZWN0U2V0dGluZ3MnO1xuaW1wb3J0ICogYXMgaWRlX3NldHRpbmdzIGZyb20gJy4vSURFU2V0dGluZ3MnO1xuaW1wb3J0ICogYXMgYm9vdF9wcm9qZWN0IGZyb20gJy4vUnVuT25Cb290JztcbmltcG9ydCAqIGFzIHV0aWwgZnJvbSAnLi91dGlscyc7XG52YXIgVGVybWluYWxNYW5hZ2VyID0gcmVxdWlyZSgnLi9UZXJtaW5hbE1hbmFnZXInKTtcblRlcm1pbmFsTWFuYWdlci5vbignc2hlbGwtZXZlbnQnLCAoZXZ0OiBhbnksIGRhdGE6IGFueSkgPT4gaWRlX3NvY2tldHMuZW1pdCgnc2hlbGwtZXZlbnQnLCBldnQsIGRhdGEpICk7XG5cbi8vIGFsbCBjb25uZWN0ZWQgc29ja2V0c1xubGV0IGlkZV9zb2NrZXRzOiBTb2NrZXRJTy5OYW1lc3BhY2U7XG5sZXQgbnVtX2Nvbm5lY3Rpb25zOiBudW1iZXIgPSAwO1xubGV0IGludGVydmFsOiBOb2RlSlMuVGltZXI7XG5cbmV4cG9ydCBmdW5jdGlvbiBpbml0KHNlcnZlcjogaHR0cC5TZXJ2ZXIpe1xuXHRpZGVfc29ja2V0cyA9IGlvKHNlcnZlciwge1xuXHRcdHBpbmdJbnRlcnZhbDogMzAwMCxcblx0XHRwaW5nVGltZW91dDogNjUwMFxuXHR9KS5vZignL0lERScpO1xuXHRpZGVfc29ja2V0cy5vbignY29ubmVjdGlvbicsIGNvbm5lY3Rpb24pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYnJvYWRjYXN0KGV2ZW50OiBzdHJpbmcsIG1lc3NhZ2U6IGFueSl7XG5cdC8vIGNvbnNvbGUubG9nKCdicm9hZGNhc3RpbmcnLCBldmVudCwgbWVzc2FnZSk7XG5cdGlmIChpZGVfc29ja2V0cykgaWRlX3NvY2tldHMuZW1pdChldmVudCwgbWVzc2FnZSk7XG59XG5cbmZ1bmN0aW9uIGNvbm5lY3Rpb24oc29ja2V0OiBTb2NrZXRJTy5Tb2NrZXQpe1xuXHRzb2NrZXQub24oJ3NldC10aW1lJywgSURFLnNldF90aW1lKTtcblx0c29ja2V0Lm9uKCdwcm9qZWN0LWV2ZW50JywgKGRhdGE6IGFueSkgPT4gcHJvamVjdF9ldmVudChzb2NrZXQsIGRhdGEpICk7XG5cdHNvY2tldC5vbigncHJvamVjdC1zZXR0aW5ncycsIChkYXRhOiBhbnkpID0+IHByb2plY3Rfc2V0dGluZ3NfZXZlbnQoc29ja2V0LCBkYXRhKSApO1xuXHRzb2NrZXQub24oJ3Byb2Nlc3MtZXZlbnQnLCAoZGF0YTogYW55KSA9PiBwcm9jZXNzX2V2ZW50KHNvY2tldCwgZGF0YSkgKTtcblx0c29ja2V0Lm9uKCdJREUtc2V0dGluZ3MnLCAoZGF0YTogYW55KSA9PiBpZGVfc2V0dGluZ3NfZXZlbnQoc29ja2V0LCBkYXRhKSApO1xuXHRzb2NrZXQub24oJ2dpdC1ldmVudCcsIChkYXRhOiBhbnkpID0+IGdpdF9ldmVudChzb2NrZXQsIGRhdGEpICk7XG5cdHNvY2tldC5vbignbGlzdC1maWxlcycsIChwcm9qZWN0OiBzdHJpbmcpID0+IGxpc3RfZmlsZXMoc29ja2V0LCBwcm9qZWN0KSApO1xuXHRzb2NrZXQub24oJ3J1bi1vbi1ib290JywgKHByb2plY3Q6IHN0cmluZykgPT4gYm9vdF9wcm9qZWN0LnNldF9ib290X3Byb2plY3Qoc29ja2V0LCBwcm9qZWN0KSApO1xuXHRzb2NrZXQub24oJ3NoLWNvbW1hbmQnLCBjbWQgPT4gVGVybWluYWxNYW5hZ2VyLmV4ZWN1dGUoY21kKSApO1xuXHRzb2NrZXQub24oJ3NoLXRhYicsIGNtZCA9PiBUZXJtaW5hbE1hbmFnZXIudGFiKGNtZCkgKTtcblx0c29ja2V0Lm9uKCd1cGxvYWQtdXBkYXRlJywgKGRhdGE6IGFueSkgPT4gdXBkYXRlX21hbmFnZXIudXBsb2FkKGRhdGEpICk7XG5cdHNvY2tldC5vbignc2h1dGRvd24nLCBJREUuc2h1dGRvd24pO1xuXHRzb2NrZXQub24oJ2Rpc2Nvbm5lY3QnLCBkaXNjb25uZWN0KTtcblx0aW5pdF9tZXNzYWdlKHNvY2tldCk7XG5cdFRlcm1pbmFsTWFuYWdlci5wd2QoKTtcblx0bnVtX2Nvbm5lY3Rpb25zICs9IDE7XG5cdGlmIChudW1fY29ubmVjdGlvbnMgPT09IDEpe1xuXHRcdGludGVydmFsID0gc2V0SW50ZXJ2YWwoaW50ZXJ2YWxfZnVuYywgMjAwMCk7XG5cdH1cbn1cblxuZnVuY3Rpb24gZGlzY29ubmVjdCgpe1xuXHRudW1fY29ubmVjdGlvbnMgPSBudW1fY29ubmVjdGlvbnMgLSAxO1xuXHRpZiAobnVtX2Nvbm5lY3Rpb25zIDw9IDAgJiYgaW50ZXJ2YWwpe1xuXHRcdGNsZWFySW50ZXJ2YWwoaW50ZXJ2YWwpO1xuXHR9XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGludGVydmFsX2Z1bmMoKXtcblx0bGV0IHByb2plY3RzOiBzdHJpbmdbXSA9IGF3YWl0IHByb2plY3RfbWFuYWdlci5saXN0UHJvamVjdHMoKTtcblx0aWRlX3NvY2tldHMuZW1pdCgncHJvamVjdC1saXN0JywgdW5kZWZpbmVkLCBwcm9qZWN0cyk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGluaXRfbWVzc2FnZShzb2NrZXQ6IFNvY2tldElPLlNvY2tldCl7XG5cdGxldCBtZXNzYWdlOiB1dGlsLkluaXRfTWVzc2FnZSA9IHtcblx0XHRwcm9qZWN0cyBcdDogYXdhaXQgcHJvamVjdF9tYW5hZ2VyLmxpc3RQcm9qZWN0cygpLFxuXHRcdGV4YW1wbGVzIFx0OiBhd2FpdCBwcm9qZWN0X21hbmFnZXIubGlzdEV4YW1wbGVzKCksXG5cdFx0c2V0dGluZ3MgXHQ6IGF3YWl0IGlkZV9zZXR0aW5ncy5yZWFkKCksXG5cdFx0Ym9vdF9wcm9qZWN0IFx0OiBhd2FpdCBib290X3Byb2plY3QuZ2V0X2Jvb3RfcHJvamVjdCgpLFxuXHRcdGJvYXJkX3N0cmluZ1x0OiBhd2FpdCBJREUuYm9hcmRfZGV0ZWN0KCksXG5cdFx0eGVub21haV92ZXJzaW9uIDogYXdhaXQgSURFLmdldF94ZW5vbWFpX3ZlcnNpb24oKVxuLy9cdHN0YXR1cyA6IGF3YWl0IHByb2Nlc3NfbWFuYWdlci5zdGF0dXMoKVxuXHR9O1xuXHRzb2NrZXQuZW1pdCgnaW5pdCcsIG1lc3NhZ2UpO1xufVxuXG4vLyBQcm9jZXNzIGFsbCB3ZWJzb2NrZXQgZXZlbnRzIHdoaWNoIG5lZWQgdG8gYmUgaGFuZGxlZCBieSB0aGUgUHJvamVjdE1hbmFnZXJcbmFzeW5jIGZ1bmN0aW9uIHByb2plY3RfZXZlbnQoc29ja2V0OiBTb2NrZXRJTy5Tb2NrZXQsIGRhdGE6IGFueSl7XG4vL1x0Y29uc29sZS5sb2coJ3Byb2plY3QtZXZlbnQnKTtcbi8vXHRjb25zb2xlLmRpcihkYXRhKTtcblx0Ly8gcmVqZWN0IGFueSBtYWxmb3JtZWQgd2Vic29ja2V0IG1lc3NhZ2Vcblx0aWYgKCghZGF0YS5jdXJyZW50UHJvamVjdCAmJiAhZGF0YS5uZXdQcm9qZWN0KSB8fCAhZGF0YS5mdW5jIHx8ICEocHJvamVjdF9tYW5hZ2VyIGFzIGFueSlbZGF0YS5mdW5jXSkge1xuXHRcdGNvbnNvbGUubG9nKCdiYWQgcHJvamVjdC1ldmVudCcpO1xuXHRcdGNvbnNvbGUuZGlyKGRhdGEsIHtkZXB0aDpudWxsfSk7XG5cdFx0cmV0dXJuO1xuXHR9XG5cdC8vIGNhbGwgdGhlIHByb2plY3RfbWFuYWdlciBmdW5jdGlvbiBzcGVjaWZpZWQgaW4gdGhlIGZ1bmMgZmllbGQgb2YgdGhlIHdzIG1lc3NhZ2Vcblx0YXdhaXQgKHByb2plY3RfbWFuYWdlciBhcyBhbnkpW2RhdGEuZnVuY10oZGF0YSlcblx0XHQuY2F0Y2goIChlOiBFcnJvcikgPT4ge1xuXHRcdFx0Ly8gaW4gdGhlIGV2ZW50IG9mIGFuIGVycm9yLCBsb2cgaXQgdG8gdGhlIElERSBjb25zb2xlXG5cdFx0XHQvLyBhbmQgc2VuZCBhIHN0cmluZyBiYWNrIHRvIHRoZSBicm93c2VyIGZvciBkaXNwbGF5IHRvIHRoZSB1c2VyXG5cdFx0XHRjb25zb2xlLmxvZygncHJvamVjdC1ldmVudCBlcnJvcjonKTtcblx0XHRcdGNvbnNvbGUubG9nKGUpO1xuXHRcdFx0ZGF0YS5lcnJvciA9IGUudG9TdHJpbmcoKTtcblx0XHRcdHNvY2tldC5lbWl0KCdwcm9qZWN0LWRhdGEnLCBkYXRhKTtcblx0XHR9KTtcbi8vXHRjb25zb2xlLmRpcihkYXRhKTtcblx0Ly8gYWZ0ZXIgYSBzdWNjZXNmdWwgb3BlcmF0aW9uLCBzZW5kIHRoZSBkYXRhIGJhY2tcblx0c29ja2V0LmVtaXQoJ3Byb2plY3QtZGF0YScsIGRhdGEpO1xuXHRpZiAoZGF0YS5jdXJyZW50UHJvamVjdCl7XG5cdFx0Ly8gc2F2ZSB0aGUgY3VycmVudCBwcm9qZWN0IGluIHRoZSBJREUgc2V0dGluZ3Ncblx0XHRpZGVfc2V0dGluZ3Muc2V0SURFU2V0dGluZyh7a2V5OiAncHJvamVjdCcsIHZhbHVlOiBkYXRhLmN1cnJlbnRQcm9qZWN0fSk7XG5cdFx0Ly8gaWYgYSBmaWxlTGlzdCB3YXMgY3JlYXRlZCwgc2VuZCBpdCB0byBvdGhlciB0YWJzXG5cdFx0aWYgKGRhdGEuZmlsZUxpc3QpXG5cdFx0XHRzb2NrZXQuYnJvYWRjYXN0LmVtaXQoJ2ZpbGUtbGlzdCcsIGRhdGEuY3VycmVudFByb2plY3QsIGRhdGEuZmlsZUxpc3QpO1xuXHRcdC8vIGlmIGEgcHJvamVjdExpc3Qgd2FzIGNyZWF0ZWQsIHNlbmQgaXQgdG8gb3RoZXIgdGFic1xuXHRcdGlmIChkYXRhLnByb2plY3RMaXN0KVxuXHRcdFx0c29ja2V0LmJyb2FkY2FzdC5lbWl0KCdwcm9qZWN0LWxpc3QnLCBkYXRhLmN1cnJlbnRQcm9qZWN0LCBkYXRhLnByb2plY3RMaXN0KTtcblx0XHQvLyBpZiBhIGZpbGUgd2FzIG9wZW5lZCBzYXZlIHRoaXMgaW4gdGhlIHByb2plY3Qgc2V0dGluZ3Ncblx0XHRpZiAoZGF0YS5maWxlTmFtZSlcblx0XHRcdHByb2plY3Rfc2V0dGluZ3Muc2V0X2ZpbGVOYW1lKGRhdGEuY3VycmVudFByb2plY3QsIGRhdGEuZmlsZU5hbWUpO1xuXHR9XG59XG5cbmFzeW5jIGZ1bmN0aW9uIHByb2plY3Rfc2V0dGluZ3NfZXZlbnQoc29ja2V0OiBTb2NrZXRJTy5Tb2NrZXQsIGRhdGE6IGFueSl7XG4vL1x0Y29uc29sZS5sb2coJ3Byb2plY3Rfc2V0dGluZ3MnKVxuLy9cdGNvbnNvbGUuZGlyKGRhdGEpO1xuXHRpZiAoIWRhdGEuY3VycmVudFByb2plY3QgfHwgIWRhdGEuZnVuYyB8fCAhKHByb2plY3Rfc2V0dGluZ3MgYXMgYW55KVtkYXRhLmZ1bmNdKSB7XG5cdFx0Y29uc29sZS5sb2coJ2JhZCBwcm9qZWN0LXNldHRpbmdzJywgZGF0YSk7XG5cdFx0cmV0dXJuO1xuXHR9XG5cdGxldCBzZXR0aW5ncyA9IGF3YWl0IChwcm9qZWN0X3NldHRpbmdzIGFzIGFueSlbZGF0YS5mdW5jXShkYXRhKVxuXHRcdC5jYXRjaCggKGU6IEVycm9yKSA9PiB7XG5cdFx0XHRjb25zb2xlLmxvZygncHJvamVjdC1zZXR0aW5ncyBlcnJvcicpO1xuXHRcdFx0Y29uc29sZS5sb2coZSk7XG5cdFx0XHRzb2NrZXQuZW1pdCgncmVwb3J0LWVycm9yJywgZS50b1N0cmluZygpKTtcblx0XHR9KTtcbi8vXHRjb25zb2xlLmxvZygncHJvamVjdF9zZXR0aW5ncycpXG4vL1x0Y29uc29sZS5kaXIoc2V0dGluZ3MpO1xuXHRpZiAoZGF0YS5mdW5jID09PSAnc2V0Q0xBcmcnKXtcblx0XHRzb2NrZXQuYnJvYWRjYXN0LmVtaXQoJ3Byb2plY3Qtc2V0dGluZ3MtZGF0YScsIGRhdGEuY3VycmVudFByb2plY3QsIHNldHRpbmdzKTtcblx0fSBlbHNlIHtcblx0XHRpZGVfc29ja2V0cy5lbWl0KCdwcm9qZWN0LXNldHRpbmdzLWRhdGEnLCBkYXRhLmN1cnJlbnRQcm9qZWN0LCBzZXR0aW5ncyk7XG5cdH1cbn1cblxuYXN5bmMgZnVuY3Rpb24gcHJvY2Vzc19ldmVudChzb2NrZXQ6IFNvY2tldElPLlNvY2tldCwgZGF0YTogYW55KXtcblx0aWYgKCFkYXRhIHx8ICFkYXRhLmN1cnJlbnRQcm9qZWN0IHx8ICFkYXRhLmV2ZW50IHx8ICEocHJvY2Vzc19tYW5hZ2VyIGFzIGFueSlbZGF0YS5ldmVudF0pe1xuXHRcdGNvbnNvbGUubG9nKCdiYWQgcHJvY2Vzcy1ldmVudCcsIGRhdGEpO1xuXHRcdHJldHVybjtcblx0fVxuXHRhd2FpdCAocHJvY2Vzc19tYW5hZ2VyIGFzIGFueSlbZGF0YS5ldmVudF0oZGF0YSk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGlkZV9zZXR0aW5nc19ldmVudChzb2NrZXQ6IFNvY2tldElPLlNvY2tldCwgZGF0YTogYW55KXtcblx0aWYgKCFkYXRhIHx8ICFkYXRhLmZ1bmMgfHwgIShpZGVfc2V0dGluZ3MgYXMgYW55KVtkYXRhLmZ1bmNdKXtcblx0XHRjb25zb2xlLmxvZygnYmFkIGlkZV9zZXR0aW5ncyBldmVudCcsIGRhdGEpO1xuXHRcdHJldHVybjtcblx0fVxuXHRsZXQgcmVzdWx0ID0gYXdhaXQgKGlkZV9zZXR0aW5ncyBhcyBhbnkpW2RhdGEuZnVuY10oZGF0YSlcblx0XHQuY2F0Y2goIChlOiBFcnJvcikgPT4gY29uc29sZS5sb2coJ2lkZV9zZXR0aW5ncyBlcnJvcicsIGUpICk7XG5cdGJyb2FkY2FzdCgnSURFLXNldHRpbmdzLWRhdGEnLCByZXN1bHQpO1xufVxuXG5hc3luYyBmdW5jdGlvbiBnaXRfZXZlbnQoc29ja2V0OiBTb2NrZXRJTy5Tb2NrZXQsIGRhdGE6IGFueSl7XG5cdGlmICghZGF0YS5jdXJyZW50UHJvamVjdCB8fCAhZGF0YS5mdW5jIHx8ICEoZ2l0X21hbmFnZXIgYXMgYW55KVtkYXRhLmZ1bmNdKSB7XG5cdFx0Y29uc29sZS5sb2coJ2JhZCBnaXQtZXZlbnQnLCBkYXRhKTtcblx0XHRyZXR1cm47XG5cdH1cblx0dHJ5e1xuXHRcdGF3YWl0IChnaXRfbWFuYWdlciBhcyBhbnkpW2RhdGEuZnVuY10oZGF0YSk7XG5cdFx0bGV0IGRhdGEyOiBhbnkgPSB7XG5cdFx0XHRjdXJyZW50UHJvamVjdDogZGF0YS5jdXJyZW50UHJvamVjdCxcblx0XHRcdHRpbWVzdGFtcDpcdGRhdGEudGltZXN0YW1wLFxuXHRcdFx0Z2l0RGF0YTpcdGRhdGFcblx0XHR9O1xuXHRcdGF3YWl0IHByb2plY3RfbWFuYWdlci5vcGVuUHJvamVjdChkYXRhMik7XG5cdFx0c29ja2V0LmVtaXQoJ3Byb2plY3QtZGF0YScsIGRhdGEyKTtcblx0XHRpZiAoZGF0YTIuY3VycmVudFByb2plY3Qpe1xuXHRcdFx0aWYgKGRhdGEyLnByb2plY3RMaXN0KXtcblx0XHRcdFx0c29ja2V0LmJyb2FkY2FzdC5lbWl0KCdwcm9qZWN0LWxpc3QnLCBkYXRhMi5jdXJyZW50UHJvamVjdCwgZGF0YTIucHJvamVjdExpc3QpO1xuXHRcdFx0fVxuXHRcdFx0aWYgKGRhdGEyLmZpbGVMaXN0KXtcblx0XHRcdFx0c29ja2V0LmJyb2FkY2FzdC5lbWl0KCdmaWxlLWxpc3QnLCBkYXRhMi5jdXJyZW50UHJvamVjdCwgZGF0YTIuZmlsZUxpc3QpO1xuXHRcdFx0fVxuXHRcdFx0aWRlX3NldHRpbmdzLnNldElERVNldHRpbmcoe2tleTogJ3Byb2plY3QnLCB2YWx1ZTogZGF0YTIuY3VycmVudFByb2plY3R9KTtcblx0XHR9XG5cdH1cblx0Y2F0Y2goZSl7XG5cdFx0Y29uc29sZS5sb2coJ2dpdC1ldmVudCBlcnJvcicsIGUpO1xuXHRcdGRhdGEuZXJyb3IgPSBlLnRvU3RyaW5nKCk7XG5cdFx0c29ja2V0LmVtaXQoJ3Byb2plY3QtZGF0YScsIHtnaXREYXRhOiBkYXRhLCB0aW1lc3RhbXA6IGRhdGEudGltZXN0YW1wfSk7XG5cdFx0c29ja2V0LmVtaXQoJ3JlcG9ydC1lcnJvcicsIGUudG9TdHJpbmcoKSk7XG5cdH1cbn1cblxuYXN5bmMgZnVuY3Rpb24gbGlzdF9maWxlcyhzb2NrZXQ6IFNvY2tldElPLlNvY2tldCwgcHJvamVjdDogc3RyaW5nKXtcblx0bGV0IGZpbGVzOiB1dGlsLkZpbGVfRGVzY3JpcHRvcltdID0gYXdhaXQgcHJvamVjdF9tYW5hZ2VyLmxpc3RGaWxlcyhwcm9qZWN0KVxuXHRcdC5jYXRjaCgoZTogRXJyb3IpID0+IGNvbnNvbGUubG9nKCdlcnJvciByZWZyZXNoaW5nIGZpbGUgbGlzdCcsIGUudG9TdHJpbmcoKSkgKTtcblx0c29ja2V0LmVtaXQoJ2ZpbGUtbGlzdCcsIHByb2plY3QsIGZpbGVzKTtcbn1cbiJdfQ==
