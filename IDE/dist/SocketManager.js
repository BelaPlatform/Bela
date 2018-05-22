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
    socket.on('sh-command', function (cmd) { return TerminalManager.execute(cmd); });
    socket.on('sh-tab', function (cmd) { return TerminalManager.tab(cmd); });
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
                    return [4 /*yield*/, IDE.get_xenomai_version()
                        //	status : await process_manager.status()
                    ];
                case 5:
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,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QUFDLEVBQUMsR0FBRyxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDLGNBQWMsRUFBQyxDQUFDLENBQUM7cUJBQzFFOzs7O29CQUdELE9BQU8sQ0FBQyxHQUFHLENBQUMsaUJBQWlCLEVBQUUsR0FBQyxDQUFDLENBQUM7b0JBQ2xDLElBQUksQ0FBQyxLQUFLLEdBQUcsR0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDO29CQUMxQixNQUFNLENBQUMsSUFBSSxDQUFDLGNBQWMsRUFBRSxFQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLElBQUksQ0FBQyxTQUFTLEVBQUMsQ0FBQyxDQUFDO29CQUN4RSxNQUFNLENBQUMsSUFBSSxDQUFDLGNBQWMsRUFBRSxHQUFDLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQzs7Ozs7O0NBRTNDO0FBRUQsb0JBQTBCLE1BQXVCLEVBQUUsT0FBZTs7Ozs7d0JBQzdCLHFCQUFNLGVBQWUsQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDO3lCQUMxRSxLQUFLLENBQUMsVUFBQyxDQUFRLElBQUssT0FBQSxPQUFPLENBQUMsR0FBRyxDQUFDLDRCQUE0QixFQUFFLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxFQUF2RCxDQUF1RCxDQUFFLEVBQUE7O29CQUQzRSxLQUFLLEdBQTJCLFNBQzJDO29CQUMvRSxNQUFNLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxPQUFPLEVBQUUsS0FBSyxDQUFDLENBQUM7Ozs7O0NBQ3pDIiwiZmlsZSI6IlNvY2tldE1hbmFnZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBpbyBmcm9tICdzb2NrZXQuaW8nO1xuaW1wb3J0ICogYXMgaHR0cCBmcm9tICdodHRwJztcbmltcG9ydCAqIGFzIElERSBmcm9tICcuL21haW4nO1xuaW1wb3J0ICogYXMgcHJvamVjdF9tYW5hZ2VyIGZyb20gJy4vUHJvamVjdE1hbmFnZXInO1xuaW1wb3J0ICogYXMgcHJvY2Vzc19tYW5hZ2VyIGZyb20gJy4vUHJvY2Vzc01hbmFnZXInO1xuaW1wb3J0ICogYXMgZ2l0X21hbmFnZXIgZnJvbSAnLi9HaXRNYW5hZ2VyJztcbmltcG9ydCAqIGFzIHByb2plY3Rfc2V0dGluZ3MgZnJvbSAnLi9Qcm9qZWN0U2V0dGluZ3MnO1xuaW1wb3J0ICogYXMgaWRlX3NldHRpbmdzIGZyb20gJy4vSURFU2V0dGluZ3MnO1xuaW1wb3J0ICogYXMgYm9vdF9wcm9qZWN0IGZyb20gJy4vUnVuT25Cb290JztcbmltcG9ydCAqIGFzIHV0aWwgZnJvbSAnLi91dGlscyc7XG52YXIgVGVybWluYWxNYW5hZ2VyID0gcmVxdWlyZSgnLi9UZXJtaW5hbE1hbmFnZXInKTtcblRlcm1pbmFsTWFuYWdlci5vbignc2hlbGwtZXZlbnQnLCAoZXZ0OiBhbnksIGRhdGE6IGFueSkgPT4gaWRlX3NvY2tldHMuZW1pdCgnc2hlbGwtZXZlbnQnLCBldnQsIGRhdGEpICk7XG5cbi8vIGFsbCBjb25uZWN0ZWQgc29ja2V0c1xubGV0IGlkZV9zb2NrZXRzOiBTb2NrZXRJTy5OYW1lc3BhY2U7XG5sZXQgbnVtX2Nvbm5lY3Rpb25zOiBudW1iZXIgPSAwO1xubGV0IGludGVydmFsOiBOb2RlSlMuVGltZXI7XG5cbmV4cG9ydCBmdW5jdGlvbiBpbml0KHNlcnZlcjogaHR0cC5TZXJ2ZXIpe1xuXHRpZGVfc29ja2V0cyA9IGlvKHNlcnZlciwge1xuXHRcdHBpbmdJbnRlcnZhbDogMzAwMCxcblx0XHRwaW5nVGltZW91dDogNjUwMFxuXHR9KS5vZignL0lERScpO1xuXHRpZGVfc29ja2V0cy5vbignY29ubmVjdGlvbicsIGNvbm5lY3Rpb24pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYnJvYWRjYXN0KGV2ZW50OiBzdHJpbmcsIG1lc3NhZ2U6IGFueSl7XG5cdC8vIGNvbnNvbGUubG9nKCdicm9hZGNhc3RpbmcnLCBldmVudCwgbWVzc2FnZSk7XG5cdGlmIChpZGVfc29ja2V0cykgaWRlX3NvY2tldHMuZW1pdChldmVudCwgbWVzc2FnZSk7XG59XG5cbmZ1bmN0aW9uIGNvbm5lY3Rpb24oc29ja2V0OiBTb2NrZXRJTy5Tb2NrZXQpe1xuXHRzb2NrZXQub24oJ3NldC10aW1lJywgSURFLnNldF90aW1lKTtcblx0c29ja2V0Lm9uKCdwcm9qZWN0LWV2ZW50JywgKGRhdGE6IGFueSkgPT4gcHJvamVjdF9ldmVudChzb2NrZXQsIGRhdGEpICk7XG5cdHNvY2tldC5vbigncHJvamVjdC1zZXR0aW5ncycsIChkYXRhOiBhbnkpID0+IHByb2plY3Rfc2V0dGluZ3NfZXZlbnQoc29ja2V0LCBkYXRhKSApO1xuXHRzb2NrZXQub24oJ3Byb2Nlc3MtZXZlbnQnLCAoZGF0YTogYW55KSA9PiBwcm9jZXNzX2V2ZW50KHNvY2tldCwgZGF0YSkgKTtcblx0c29ja2V0Lm9uKCdJREUtc2V0dGluZ3MnLCAoZGF0YTogYW55KSA9PiBpZGVfc2V0dGluZ3NfZXZlbnQoc29ja2V0LCBkYXRhKSApO1xuXHRzb2NrZXQub24oJ2dpdC1ldmVudCcsIChkYXRhOiBhbnkpID0+IGdpdF9ldmVudChzb2NrZXQsIGRhdGEpICk7XG5cdHNvY2tldC5vbignbGlzdC1maWxlcycsIChwcm9qZWN0OiBhbnkpID0+IGxpc3RfZmlsZXMoc29ja2V0LCBwcm9qZWN0KSApO1xuXHRzb2NrZXQub24oJ3NoLWNvbW1hbmQnLCBjbWQgPT4gVGVybWluYWxNYW5hZ2VyLmV4ZWN1dGUoY21kKSApO1xuXHRzb2NrZXQub24oJ3NoLXRhYicsIGNtZCA9PiBUZXJtaW5hbE1hbmFnZXIudGFiKGNtZCkgKTtcblx0c29ja2V0Lm9uKCdkaXNjb25uZWN0JywgZGlzY29ubmVjdCk7XG5cdGluaXRfbWVzc2FnZShzb2NrZXQpO1xuXHRUZXJtaW5hbE1hbmFnZXIucHdkKCk7XG5cdG51bV9jb25uZWN0aW9ucyArPSAxO1xuXHRpZiAobnVtX2Nvbm5lY3Rpb25zID09PSAxKXtcblx0XHRpbnRlcnZhbCA9IHNldEludGVydmFsKGludGVydmFsX2Z1bmMsIDIwMDApO1xuXHR9XG59XG5cbmZ1bmN0aW9uIGRpc2Nvbm5lY3QoKXtcblx0bnVtX2Nvbm5lY3Rpb25zID0gbnVtX2Nvbm5lY3Rpb25zIC0gMTtcblx0aWYgKG51bV9jb25uZWN0aW9ucyA8PSAwICYmIGludGVydmFsKXtcblx0XHRjbGVhckludGVydmFsKGludGVydmFsKTtcblx0fVxufVxuXG5hc3luYyBmdW5jdGlvbiBpbnRlcnZhbF9mdW5jKCl7XG5cdGxldCBwcm9qZWN0czogc3RyaW5nW10gPSBhd2FpdCBwcm9qZWN0X21hbmFnZXIubGlzdFByb2plY3RzKCk7XG5cdGlkZV9zb2NrZXRzLmVtaXQoJ3Byb2plY3QtbGlzdCcsIHVuZGVmaW5lZCwgcHJvamVjdHMpO1xufVxuXG5hc3luYyBmdW5jdGlvbiBpbml0X21lc3NhZ2Uoc29ja2V0OiBTb2NrZXRJTy5Tb2NrZXQpe1xuXHRsZXQgbWVzc2FnZTogdXRpbC5Jbml0X01lc3NhZ2UgPSB7XG5cdFx0cHJvamVjdHMgOiBhd2FpdCBwcm9qZWN0X21hbmFnZXIubGlzdFByb2plY3RzKCksXG5cdFx0ZXhhbXBsZXMgOiBhd2FpdCBwcm9qZWN0X21hbmFnZXIubGlzdEV4YW1wbGVzKCksXG5cdFx0c2V0dGluZ3MgOiBhd2FpdCBpZGVfc2V0dGluZ3MucmVhZCgpLFxuXHRcdGJvb3RfcHJvamVjdCA6IGF3YWl0IGJvb3RfcHJvamVjdC5nZXRfYm9vdF9wcm9qZWN0KCksXG5cdFx0eGVub21haV92ZXJzaW9uIDogYXdhaXQgSURFLmdldF94ZW5vbWFpX3ZlcnNpb24oKVxuLy9cdHN0YXR1cyA6IGF3YWl0IHByb2Nlc3NfbWFuYWdlci5zdGF0dXMoKVxuXHR9O1xuXHRzb2NrZXQuZW1pdCgnaW5pdCcsIG1lc3NhZ2UpO1xufVxuXG4vLyBQcm9jZXNzIGFsbCB3ZWJzb2NrZXQgZXZlbnRzIHdoaWNoIG5lZWQgdG8gYmUgaGFuZGxlZCBieSB0aGUgUHJvamVjdE1hbmFnZXJcbmFzeW5jIGZ1bmN0aW9uIHByb2plY3RfZXZlbnQoc29ja2V0OiBTb2NrZXRJTy5Tb2NrZXQsIGRhdGE6IGFueSl7XG4vL1x0Y29uc29sZS5sb2coJ3Byb2plY3QtZXZlbnQnKTtcbi8vXHRjb25zb2xlLmRpcihkYXRhKTtcblx0Ly8gcmVqZWN0IGFueSBtYWxmb3JtZWQgd2Vic29ja2V0IG1lc3NhZ2Vcblx0aWYgKCghZGF0YS5jdXJyZW50UHJvamVjdCAmJiAhZGF0YS5uZXdQcm9qZWN0KSB8fCAhZGF0YS5mdW5jIHx8ICEocHJvamVjdF9tYW5hZ2VyIGFzIGFueSlbZGF0YS5mdW5jXSkge1xuXHRcdGNvbnNvbGUubG9nKCdiYWQgcHJvamVjdC1ldmVudCcpO1xuXHRcdGNvbnNvbGUuZGlyKGRhdGEsIHtkZXB0aDpudWxsfSk7XG5cdFx0cmV0dXJuO1xuXHR9XG5cdC8vIGNhbGwgdGhlIHByb2plY3RfbWFuYWdlciBmdW5jdGlvbiBzcGVjaWZpZWQgaW4gdGhlIGZ1bmMgZmllbGQgb2YgdGhlIHdzIG1lc3NhZ2Vcblx0YXdhaXQgKHByb2plY3RfbWFuYWdlciBhcyBhbnkpW2RhdGEuZnVuY10oZGF0YSlcblx0XHQuY2F0Y2goIChlOiBFcnJvcikgPT4ge1xuXHRcdFx0Ly8gaW4gdGhlIGV2ZW50IG9mIGFuIGVycm9yLCBsb2cgaXQgdG8gdGhlIElERSBjb25zb2xlXG5cdFx0XHQvLyBhbmQgc2VuZCBhIHN0cmluZyBiYWNrIHRvIHRoZSBicm93c2VyIGZvciBkaXNwbGF5IHRvIHRoZSB1c2VyXG5cdFx0XHRjb25zb2xlLmxvZygncHJvamVjdC1ldmVudCBlcnJvcjonKTtcblx0XHRcdGNvbnNvbGUubG9nKGUpO1xuXHRcdFx0ZGF0YS5lcnJvciA9IGUudG9TdHJpbmcoKTtcblx0XHRcdHNvY2tldC5lbWl0KCdwcm9qZWN0LWRhdGEnLCBkYXRhKTtcblx0XHR9KTtcbi8vXHRjb25zb2xlLmRpcihkYXRhKTtcblx0Ly8gYWZ0ZXIgYSBzdWNjZXNmdWwgb3BlcmF0aW9uLCBzZW5kIHRoZSBkYXRhIGJhY2tcblx0c29ja2V0LmVtaXQoJ3Byb2plY3QtZGF0YScsIGRhdGEpO1xuXHRpZiAoZGF0YS5jdXJyZW50UHJvamVjdCl7XG5cdFx0Ly8gc2F2ZSB0aGUgY3VycmVudCBwcm9qZWN0IGluIHRoZSBJREUgc2V0dGluZ3Ncblx0XHRpZGVfc2V0dGluZ3Muc2V0SURFU2V0dGluZyh7a2V5OiAncHJvamVjdCcsIHZhbHVlOiBkYXRhLmN1cnJlbnRQcm9qZWN0fSk7XG5cdFx0Ly8gaWYgYSBmaWxlTGlzdCB3YXMgY3JlYXRlZCwgc2VuZCBpdCB0byBvdGhlciB0YWJzXG5cdFx0aWYgKGRhdGEuZmlsZUxpc3QpXG5cdFx0XHRzb2NrZXQuYnJvYWRjYXN0LmVtaXQoJ2ZpbGUtbGlzdCcsIGRhdGEuY3VycmVudFByb2plY3QsIGRhdGEuZmlsZUxpc3QpO1xuXHRcdC8vIGlmIGEgcHJvamVjdExpc3Qgd2FzIGNyZWF0ZWQsIHNlbmQgaXQgdG8gb3RoZXIgdGFic1xuXHRcdGlmIChkYXRhLnByb2plY3RMaXN0KVxuXHRcdFx0c29ja2V0LmJyb2FkY2FzdC5lbWl0KCdwcm9qZWN0LWxpc3QnLCBkYXRhLmN1cnJlbnRQcm9qZWN0LCBkYXRhLnByb2plY3RMaXN0KTtcblx0fVxufVxuXG5hc3luYyBmdW5jdGlvbiBwcm9qZWN0X3NldHRpbmdzX2V2ZW50KHNvY2tldDogU29ja2V0SU8uU29ja2V0LCBkYXRhOiBhbnkpe1xuLy9cdGNvbnNvbGUubG9nKCdwcm9qZWN0X3NldHRpbmdzJylcbi8vXHRjb25zb2xlLmRpcihkYXRhKTtcblx0aWYgKCFkYXRhLmN1cnJlbnRQcm9qZWN0IHx8ICFkYXRhLmZ1bmMgfHwgIShwcm9qZWN0X3NldHRpbmdzIGFzIGFueSlbZGF0YS5mdW5jXSkge1xuXHRcdGNvbnNvbGUubG9nKCdiYWQgcHJvamVjdC1zZXR0aW5ncycsIGRhdGEpO1xuXHRcdHJldHVybjtcblx0fVxuXHRsZXQgc2V0dGluZ3MgPSBhd2FpdCAocHJvamVjdF9zZXR0aW5ncyBhcyBhbnkpW2RhdGEuZnVuY10oZGF0YSlcblx0XHQuY2F0Y2goIChlOiBFcnJvcikgPT4ge1xuXHRcdFx0Y29uc29sZS5sb2coJ3Byb2plY3Qtc2V0dGluZ3MgZXJyb3InKTtcblx0XHRcdGNvbnNvbGUubG9nKGUpO1xuXHRcdFx0c29ja2V0LmVtaXQoJ3JlcG9ydC1lcnJvcicsIGUudG9TdHJpbmcoKSk7XG5cdFx0fSk7XG4vL1x0Y29uc29sZS5sb2coJ3Byb2plY3Rfc2V0dGluZ3MnKVxuLy9cdGNvbnNvbGUuZGlyKHNldHRpbmdzKTtcblx0aWYgKGRhdGEuZnVuYyA9PT0gJ3NldENMQXJnJyl7XG5cdFx0c29ja2V0LmJyb2FkY2FzdC5lbWl0KCdwcm9qZWN0LXNldHRpbmdzLWRhdGEnLCBkYXRhLmN1cnJlbnRQcm9qZWN0LCBzZXR0aW5ncyk7XG5cdH0gZWxzZSB7XG5cdFx0aWRlX3NvY2tldHMuZW1pdCgncHJvamVjdC1zZXR0aW5ncy1kYXRhJywgZGF0YS5jdXJyZW50UHJvamVjdCwgc2V0dGluZ3MpO1xuXHR9XG59XG5cbmFzeW5jIGZ1bmN0aW9uIHByb2Nlc3NfZXZlbnQoc29ja2V0OiBTb2NrZXRJTy5Tb2NrZXQsIGRhdGE6IGFueSl7XG5cdGlmICghZGF0YSB8fCAhZGF0YS5jdXJyZW50UHJvamVjdCB8fCAhZGF0YS5ldmVudCB8fCAhKHByb2Nlc3NfbWFuYWdlciBhcyBhbnkpW2RhdGEuZXZlbnRdKXtcblx0XHRjb25zb2xlLmxvZygnYmFkIHByb2Nlc3MtZXZlbnQnLCBkYXRhKTtcblx0XHRyZXR1cm47XG5cdH1cblx0YXdhaXQgKHByb2Nlc3NfbWFuYWdlciBhcyBhbnkpW2RhdGEuZXZlbnRdKGRhdGEpO1xufVxuXG5hc3luYyBmdW5jdGlvbiBpZGVfc2V0dGluZ3NfZXZlbnQoc29ja2V0OiBTb2NrZXRJTy5Tb2NrZXQsIGRhdGE6IGFueSl7XG5cdGlmICghZGF0YSB8fCAhZGF0YS5mdW5jIHx8ICEoaWRlX3NldHRpbmdzIGFzIGFueSlbZGF0YS5mdW5jXSl7XG5cdFx0Y29uc29sZS5sb2coJ2JhZCBpZGVfc2V0dGluZ3MgZXZlbnQnLCBkYXRhKTtcblx0XHRyZXR1cm47XG5cdH1cblx0bGV0IHJlc3VsdCA9IGF3YWl0IChpZGVfc2V0dGluZ3MgYXMgYW55KVtkYXRhLmZ1bmNdKGRhdGEpXG5cdFx0LmNhdGNoKCAoZTogRXJyb3IpID0+IGNvbnNvbGUubG9nKCdpZGVfc2V0dGluZ3MgZXJyb3InLCBlKSApO1xuXHRicm9hZGNhc3QoJ0lERS1zZXR0aW5ncy1kYXRhJywgcmVzdWx0KTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gZ2l0X2V2ZW50KHNvY2tldDogU29ja2V0SU8uU29ja2V0LCBkYXRhOiBhbnkpe1xuXHRpZiAoIWRhdGEuY3VycmVudFByb2plY3QgfHwgIWRhdGEuZnVuYyB8fCAhKGdpdF9tYW5hZ2VyIGFzIGFueSlbZGF0YS5mdW5jXSkge1xuXHRcdGNvbnNvbGUubG9nKCdiYWQgZ2l0LWV2ZW50JywgZGF0YSk7XG5cdFx0cmV0dXJuO1xuXHR9XG5cdHRyeXtcblx0XHRhd2FpdCAoZ2l0X21hbmFnZXIgYXMgYW55KVtkYXRhLmZ1bmNdKGRhdGEpO1xuXHRcdGxldCBkYXRhMjogYW55ID0ge1xuXHRcdFx0Y3VycmVudFByb2plY3Q6IGRhdGEuY3VycmVudFByb2plY3QsXG5cdFx0XHR0aW1lc3RhbXA6XHRkYXRhLnRpbWVzdGFtcCxcblx0XHRcdGdpdERhdGE6XHRkYXRhXG5cdFx0fTtcblx0XHRhd2FpdCBwcm9qZWN0X21hbmFnZXIub3BlblByb2plY3QoZGF0YTIpO1xuXHRcdHNvY2tldC5lbWl0KCdwcm9qZWN0LWRhdGEnLCBkYXRhMik7XG5cdFx0aWYgKGRhdGEyLmN1cnJlbnRQcm9qZWN0KXtcblx0XHRcdGlmIChkYXRhMi5wcm9qZWN0TGlzdCl7XG5cdFx0XHRcdHNvY2tldC5icm9hZGNhc3QuZW1pdCgncHJvamVjdC1saXN0JywgZGF0YTIuY3VycmVudFByb2plY3QsIGRhdGEyLnByb2plY3RMaXN0KTtcblx0XHRcdH1cblx0XHRcdGlmIChkYXRhMi5maWxlTGlzdCl7XG5cdFx0XHRcdHNvY2tldC5icm9hZGNhc3QuZW1pdCgnZmlsZS1saXN0JywgZGF0YTIuY3VycmVudFByb2plY3QsIGRhdGEyLmZpbGVMaXN0KTtcblx0XHRcdH1cblx0XHRcdGlkZV9zZXR0aW5ncy5zZXRJREVTZXR0aW5nKHtrZXk6ICdwcm9qZWN0JywgdmFsdWU6IGRhdGEyLmN1cnJlbnRQcm9qZWN0fSk7XG5cdFx0fVxuXHR9XG5cdGNhdGNoKGUpe1xuXHRcdGNvbnNvbGUubG9nKCdnaXQtZXZlbnQgZXJyb3InLCBlKTtcblx0XHRkYXRhLmVycm9yID0gZS50b1N0cmluZygpO1xuXHRcdHNvY2tldC5lbWl0KCdwcm9qZWN0LWRhdGEnLCB7Z2l0RGF0YTogZGF0YSwgdGltZXN0YW1wOiBkYXRhLnRpbWVzdGFtcH0pO1xuXHRcdHNvY2tldC5lbWl0KCdyZXBvcnQtZXJyb3InLCBlLnRvU3RyaW5nKCkpO1xuXHR9XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGxpc3RfZmlsZXMoc29ja2V0OiBTb2NrZXRJTy5Tb2NrZXQsIHByb2plY3Q6IHN0cmluZyl7XG5cdGxldCBmaWxlczogdXRpbC5GaWxlX0Rlc2NyaXB0b3JbXSA9IGF3YWl0IHByb2plY3RfbWFuYWdlci5saXN0RmlsZXMocHJvamVjdClcblx0XHQuY2F0Y2goKGU6IEVycm9yKSA9PiBjb25zb2xlLmxvZygnZXJyb3IgcmVmcmVzaGluZyBmaWxlIGxpc3QnLCBlLnRvU3RyaW5nKCkpICk7XG5cdHNvY2tldC5lbWl0KCdmaWxlLWxpc3QnLCBwcm9qZWN0LCBmaWxlcyk7XG59XG4iXX0=
