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

//# sourceMappingURL=data:application/json;charset=utf8;base64,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QWlCLEVBQUUsR0FBQyxDQUFDLENBQUM7b0JBQ2xDLElBQUksQ0FBQyxLQUFLLEdBQUcsR0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDO29CQUMxQixNQUFNLENBQUMsSUFBSSxDQUFDLGNBQWMsRUFBRSxFQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLElBQUksQ0FBQyxTQUFTLEVBQUMsQ0FBQyxDQUFDO29CQUN4RSxNQUFNLENBQUMsSUFBSSxDQUFDLGNBQWMsRUFBRSxHQUFDLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQzs7Ozs7O0NBRTNDIiwiZmlsZSI6IlNvY2tldE1hbmFnZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBpbyBmcm9tICdzb2NrZXQuaW8nO1xuaW1wb3J0ICogYXMgaHR0cCBmcm9tICdodHRwJztcbmltcG9ydCAqIGFzIElERSBmcm9tICcuL21haW4nO1xuaW1wb3J0ICogYXMgcHJvamVjdF9tYW5hZ2VyIGZyb20gJy4vUHJvamVjdE1hbmFnZXInO1xuaW1wb3J0ICogYXMgcHJvY2Vzc19tYW5hZ2VyIGZyb20gJy4vUHJvY2Vzc01hbmFnZXInO1xuaW1wb3J0ICogYXMgZ2l0X21hbmFnZXIgZnJvbSAnLi9HaXRNYW5hZ2VyJztcbmltcG9ydCAqIGFzIHByb2plY3Rfc2V0dGluZ3MgZnJvbSAnLi9Qcm9qZWN0U2V0dGluZ3MnO1xuaW1wb3J0ICogYXMgaWRlX3NldHRpbmdzIGZyb20gJy4vSURFU2V0dGluZ3MnO1xuaW1wb3J0ICogYXMgYm9vdF9wcm9qZWN0IGZyb20gJy4vUnVuT25Cb290JztcbmltcG9ydCAqIGFzIHV0aWwgZnJvbSAnLi91dGlscyc7XG52YXIgVGVybWluYWxNYW5hZ2VyID0gcmVxdWlyZSgnLi9UZXJtaW5hbE1hbmFnZXInKTtcblRlcm1pbmFsTWFuYWdlci5vbignc2hlbGwtZXZlbnQnLCAoZXZ0OiBhbnksIGRhdGE6IGFueSkgPT4gaWRlX3NvY2tldHMuZW1pdCgnc2hlbGwtZXZlbnQnLCBldnQsIGRhdGEpICk7XG5cbi8vIGFsbCBjb25uZWN0ZWQgc29ja2V0c1xubGV0IGlkZV9zb2NrZXRzOiBTb2NrZXRJTy5OYW1lc3BhY2U7XG5sZXQgbnVtX2Nvbm5lY3Rpb25zOiBudW1iZXIgPSAwO1xubGV0IGludGVydmFsOiBOb2RlSlMuVGltZXI7XG5cbmV4cG9ydCBmdW5jdGlvbiBpbml0KHNlcnZlcjogaHR0cC5TZXJ2ZXIpe1xuXHRpZGVfc29ja2V0cyA9IGlvKHNlcnZlciwge1xuXHRcdHBpbmdJbnRlcnZhbDogMzAwMCxcblx0XHRwaW5nVGltZW91dDogNjUwMFxuXHR9KS5vZignL0lERScpO1xuXHRpZGVfc29ja2V0cy5vbignY29ubmVjdGlvbicsIGNvbm5lY3Rpb24pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYnJvYWRjYXN0KGV2ZW50OiBzdHJpbmcsIG1lc3NhZ2U6IGFueSl7XG5cdC8vIGNvbnNvbGUubG9nKCdicm9hZGNhc3RpbmcnLCBldmVudCwgbWVzc2FnZSk7XG5cdGlmIChpZGVfc29ja2V0cykgaWRlX3NvY2tldHMuZW1pdChldmVudCwgbWVzc2FnZSk7XG59XG5cbmZ1bmN0aW9uIGNvbm5lY3Rpb24oc29ja2V0OiBTb2NrZXRJTy5Tb2NrZXQpe1xuXHRzb2NrZXQub24oJ3NldC10aW1lJywgSURFLnNldF90aW1lKTtcblx0c29ja2V0Lm9uKCdwcm9qZWN0LWV2ZW50JywgKGRhdGE6IGFueSkgPT4gcHJvamVjdF9ldmVudChzb2NrZXQsIGRhdGEpICk7XG5cdHNvY2tldC5vbigncHJvamVjdC1zZXR0aW5ncycsIChkYXRhOiBhbnkpID0+IHByb2plY3Rfc2V0dGluZ3NfZXZlbnQoc29ja2V0LCBkYXRhKSApO1xuXHRzb2NrZXQub24oJ3Byb2Nlc3MtZXZlbnQnLCAoZGF0YTogYW55KSA9PiBwcm9jZXNzX2V2ZW50KHNvY2tldCwgZGF0YSkgKTtcblx0c29ja2V0Lm9uKCdJREUtc2V0dGluZ3MnLCAoZGF0YTogYW55KSA9PiBpZGVfc2V0dGluZ3NfZXZlbnQoc29ja2V0LCBkYXRhKSApO1xuXHRzb2NrZXQub24oJ2dpdC1ldmVudCcsIChkYXRhOiBhbnkpID0+IGdpdF9ldmVudChzb2NrZXQsIGRhdGEpICk7XG5cdHNvY2tldC5vbignc2gtY29tbWFuZCcsIGNtZCA9PiBUZXJtaW5hbE1hbmFnZXIuZXhlY3V0ZShjbWQpICk7XG5cdHNvY2tldC5vbignc2gtdGFiJywgY21kID0+IFRlcm1pbmFsTWFuYWdlci50YWIoY21kKSApO1xuXHRzb2NrZXQub24oJ2Rpc2Nvbm5lY3QnLCBkaXNjb25uZWN0KTtcblx0aW5pdF9tZXNzYWdlKHNvY2tldCk7XG5cdFRlcm1pbmFsTWFuYWdlci5wd2QoKTtcblx0bnVtX2Nvbm5lY3Rpb25zICs9IDE7XG5cdGlmIChudW1fY29ubmVjdGlvbnMgPT09IDEpe1xuXHRcdGludGVydmFsID0gc2V0SW50ZXJ2YWwoaW50ZXJ2YWxfZnVuYywgMjAwMCk7XG5cdH1cbn1cblxuZnVuY3Rpb24gZGlzY29ubmVjdCgpe1xuXHRudW1fY29ubmVjdGlvbnMgPSBudW1fY29ubmVjdGlvbnMgLSAxO1xuXHRpZiAobnVtX2Nvbm5lY3Rpb25zIDw9IDAgJiYgaW50ZXJ2YWwpe1xuXHRcdGNsZWFySW50ZXJ2YWwoaW50ZXJ2YWwpO1xuXHR9XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGludGVydmFsX2Z1bmMoKXtcblx0bGV0IHByb2plY3RzOiBzdHJpbmdbXSA9IGF3YWl0IHByb2plY3RfbWFuYWdlci5saXN0UHJvamVjdHMoKTtcblx0aWRlX3NvY2tldHMuZW1pdCgncHJvamVjdC1saXN0JywgdW5kZWZpbmVkLCBwcm9qZWN0cyk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGluaXRfbWVzc2FnZShzb2NrZXQ6IFNvY2tldElPLlNvY2tldCl7XG5cdGxldCBtZXNzYWdlOiB1dGlsLkluaXRfTWVzc2FnZSA9IHtcblx0XHRwcm9qZWN0cyA6IGF3YWl0IHByb2plY3RfbWFuYWdlci5saXN0UHJvamVjdHMoKSxcblx0XHRleGFtcGxlcyA6IGF3YWl0IHByb2plY3RfbWFuYWdlci5saXN0RXhhbXBsZXMoKSxcblx0XHRzZXR0aW5ncyA6IGF3YWl0IGlkZV9zZXR0aW5ncy5yZWFkKCksXG5cdFx0Ym9vdF9wcm9qZWN0IDogYXdhaXQgYm9vdF9wcm9qZWN0LmdldF9ib290X3Byb2plY3QoKSxcblx0XHR4ZW5vbWFpX3ZlcnNpb24gOiBhd2FpdCBJREUuZ2V0X3hlbm9tYWlfdmVyc2lvbigpXG4vL1x0c3RhdHVzIDogYXdhaXQgcHJvY2Vzc19tYW5hZ2VyLnN0YXR1cygpXG5cdH07XG5cdHNvY2tldC5lbWl0KCdpbml0JywgbWVzc2FnZSk7XG59XG5cbi8vIFByb2Nlc3MgYWxsIHdlYnNvY2tldCBldmVudHMgd2hpY2ggbmVlZCB0byBiZSBoYW5kbGVkIGJ5IHRoZSBQcm9qZWN0TWFuYWdlclxuYXN5bmMgZnVuY3Rpb24gcHJvamVjdF9ldmVudChzb2NrZXQ6IFNvY2tldElPLlNvY2tldCwgZGF0YTogYW55KXtcbi8vXHRjb25zb2xlLmxvZygncHJvamVjdC1ldmVudCcpO1xuLy9cdGNvbnNvbGUuZGlyKGRhdGEpO1xuXHQvLyByZWplY3QgYW55IG1hbGZvcm1lZCB3ZWJzb2NrZXQgbWVzc2FnZVxuXHRpZiAoKCFkYXRhLmN1cnJlbnRQcm9qZWN0ICYmICFkYXRhLm5ld1Byb2plY3QpIHx8ICFkYXRhLmZ1bmMgfHwgIShwcm9qZWN0X21hbmFnZXIgYXMgYW55KVtkYXRhLmZ1bmNdKSB7XG5cdFx0Y29uc29sZS5sb2coJ2JhZCBwcm9qZWN0LWV2ZW50Jyk7XG5cdFx0Y29uc29sZS5kaXIoZGF0YSwge2RlcHRoOm51bGx9KTtcblx0XHRyZXR1cm47XG5cdH1cblx0Ly8gY2FsbCB0aGUgcHJvamVjdF9tYW5hZ2VyIGZ1bmN0aW9uIHNwZWNpZmllZCBpbiB0aGUgZnVuYyBmaWVsZCBvZiB0aGUgd3MgbWVzc2FnZVxuXHRhd2FpdCAocHJvamVjdF9tYW5hZ2VyIGFzIGFueSlbZGF0YS5mdW5jXShkYXRhKVxuXHRcdC5jYXRjaCggKGU6IEVycm9yKSA9PiB7XG5cdFx0XHQvLyBpbiB0aGUgZXZlbnQgb2YgYW4gZXJyb3IsIGxvZyBpdCB0byB0aGUgSURFIGNvbnNvbGVcblx0XHRcdC8vIGFuZCBzZW5kIGEgc3RyaW5nIGJhY2sgdG8gdGhlIGJyb3dzZXIgZm9yIGRpc3BsYXkgdG8gdGhlIHVzZXJcblx0XHRcdGNvbnNvbGUubG9nKCdwcm9qZWN0LWV2ZW50IGVycm9yOicpO1xuXHRcdFx0Y29uc29sZS5sb2coZSk7XG5cdFx0XHRkYXRhLmVycm9yID0gZS50b1N0cmluZygpO1xuXHRcdFx0c29ja2V0LmVtaXQoJ3Byb2plY3QtZGF0YScsIGRhdGEpO1xuXHRcdH0pO1xuLy9cdGNvbnNvbGUuZGlyKGRhdGEpO1xuXHQvLyBhZnRlciBhIHN1Y2Nlc2Z1bCBvcGVyYXRpb24sIHNlbmQgdGhlIGRhdGEgYmFja1xuXHRzb2NrZXQuZW1pdCgncHJvamVjdC1kYXRhJywgZGF0YSk7XG5cdGlmIChkYXRhLmN1cnJlbnRQcm9qZWN0KXtcblx0XHQvLyBzYXZlIHRoZSBjdXJyZW50IHByb2plY3QgaW4gdGhlIElERSBzZXR0aW5nc1xuXHRcdGlkZV9zZXR0aW5ncy5zZXRJREVTZXR0aW5nKHtrZXk6ICdwcm9qZWN0JywgdmFsdWU6IGRhdGEuY3VycmVudFByb2plY3R9KTtcblx0XHQvLyBpZiBhIGZpbGVMaXN0IHdhcyBjcmVhdGVkLCBzZW5kIGl0IHRvIG90aGVyIHRhYnNcblx0XHRpZiAoZGF0YS5maWxlTGlzdClcblx0XHRcdHNvY2tldC5icm9hZGNhc3QuZW1pdCgnZmlsZS1saXN0JywgZGF0YS5jdXJyZW50UHJvamVjdCwgZGF0YS5maWxlTGlzdCk7XG5cdFx0Ly8gaWYgYSBwcm9qZWN0TGlzdCB3YXMgY3JlYXRlZCwgc2VuZCBpdCB0byBvdGhlciB0YWJzXG5cdFx0aWYgKGRhdGEucHJvamVjdExpc3QpXG5cdFx0XHRzb2NrZXQuYnJvYWRjYXN0LmVtaXQoJ3Byb2plY3QtbGlzdCcsIGRhdGEuY3VycmVudFByb2plY3QsIGRhdGEucHJvamVjdExpc3QpO1xuXHR9XG59XG5cbmFzeW5jIGZ1bmN0aW9uIHByb2plY3Rfc2V0dGluZ3NfZXZlbnQoc29ja2V0OiBTb2NrZXRJTy5Tb2NrZXQsIGRhdGE6IGFueSl7XG4vL1x0Y29uc29sZS5sb2coJ3Byb2plY3Rfc2V0dGluZ3MnKVxuLy9cdGNvbnNvbGUuZGlyKGRhdGEpO1xuXHRpZiAoIWRhdGEuY3VycmVudFByb2plY3QgfHwgIWRhdGEuZnVuYyB8fCAhKHByb2plY3Rfc2V0dGluZ3MgYXMgYW55KVtkYXRhLmZ1bmNdKSB7XG5cdFx0Y29uc29sZS5sb2coJ2JhZCBwcm9qZWN0LXNldHRpbmdzJywgZGF0YSk7XG5cdFx0cmV0dXJuO1xuXHR9XG5cdGxldCBzZXR0aW5ncyA9IGF3YWl0IChwcm9qZWN0X3NldHRpbmdzIGFzIGFueSlbZGF0YS5mdW5jXShkYXRhKVxuXHRcdC5jYXRjaCggKGU6IEVycm9yKSA9PiB7XG5cdFx0XHRjb25zb2xlLmxvZygncHJvamVjdC1zZXR0aW5ncyBlcnJvcicpO1xuXHRcdFx0Y29uc29sZS5sb2coZSk7XG5cdFx0XHRzb2NrZXQuZW1pdCgncmVwb3J0LWVycm9yJywgZS50b1N0cmluZygpKTtcblx0XHR9KTtcbi8vXHRjb25zb2xlLmxvZygncHJvamVjdF9zZXR0aW5ncycpXG4vL1x0Y29uc29sZS5kaXIoc2V0dGluZ3MpO1xuXHRpZiAoZGF0YS5mdW5jID09PSAnc2V0Q0xBcmcnKXtcblx0XHRzb2NrZXQuYnJvYWRjYXN0LmVtaXQoJ3Byb2plY3Qtc2V0dGluZ3MtZGF0YScsIGRhdGEuY3VycmVudFByb2plY3QsIHNldHRpbmdzKTtcblx0fSBlbHNlIHtcblx0XHRpZGVfc29ja2V0cy5lbWl0KCdwcm9qZWN0LXNldHRpbmdzLWRhdGEnLCBkYXRhLmN1cnJlbnRQcm9qZWN0LCBzZXR0aW5ncyk7XG5cdH1cbn1cblxuYXN5bmMgZnVuY3Rpb24gcHJvY2Vzc19ldmVudChzb2NrZXQ6IFNvY2tldElPLlNvY2tldCwgZGF0YTogYW55KXtcblx0aWYgKCFkYXRhIHx8ICFkYXRhLmN1cnJlbnRQcm9qZWN0IHx8ICFkYXRhLmV2ZW50IHx8ICEocHJvY2Vzc19tYW5hZ2VyIGFzIGFueSlbZGF0YS5ldmVudF0pe1xuXHRcdGNvbnNvbGUubG9nKCdiYWQgcHJvY2Vzcy1ldmVudCcsIGRhdGEpO1xuXHRcdHJldHVybjtcblx0fVxuXHRhd2FpdCAocHJvY2Vzc19tYW5hZ2VyIGFzIGFueSlbZGF0YS5ldmVudF0oZGF0YSk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGlkZV9zZXR0aW5nc19ldmVudChzb2NrZXQ6IFNvY2tldElPLlNvY2tldCwgZGF0YTogYW55KXtcblx0aWYgKCFkYXRhIHx8ICFkYXRhLmZ1bmMgfHwgIShpZGVfc2V0dGluZ3MgYXMgYW55KVtkYXRhLmZ1bmNdKXtcblx0XHRjb25zb2xlLmxvZygnYmFkIGlkZV9zZXR0aW5ncyBldmVudCcsIGRhdGEpO1xuXHRcdHJldHVybjtcblx0fVxuXHRsZXQgcmVzdWx0ID0gYXdhaXQgKGlkZV9zZXR0aW5ncyBhcyBhbnkpW2RhdGEuZnVuY10oZGF0YSlcblx0XHQuY2F0Y2goIChlOiBFcnJvcikgPT4gY29uc29sZS5sb2coJ2lkZV9zZXR0aW5ncyBlcnJvcicsIGUpICk7XG5cdGJyb2FkY2FzdCgnSURFLXNldHRpbmdzLWRhdGEnLCByZXN1bHQpO1xufVxuXG5hc3luYyBmdW5jdGlvbiBnaXRfZXZlbnQoc29ja2V0OiBTb2NrZXRJTy5Tb2NrZXQsIGRhdGE6IGFueSl7XG5cdGlmICghZGF0YS5jdXJyZW50UHJvamVjdCB8fCAhZGF0YS5mdW5jIHx8ICEoZ2l0X21hbmFnZXIgYXMgYW55KVtkYXRhLmZ1bmNdKSB7XG5cdFx0Y29uc29sZS5sb2coJ2JhZCBnaXQtZXZlbnQnLCBkYXRhKTtcblx0XHRyZXR1cm47XG5cdH1cblx0dHJ5e1xuXHRcdGF3YWl0IChnaXRfbWFuYWdlciBhcyBhbnkpW2RhdGEuZnVuY10oZGF0YSk7XG5cdFx0bGV0IGRhdGEyOiBhbnkgPSB7XG5cdFx0XHRjdXJyZW50UHJvamVjdDogZGF0YS5jdXJyZW50UHJvamVjdCxcblx0XHRcdHRpbWVzdGFtcDpcdGRhdGEudGltZXN0YW1wLFxuXHRcdFx0Z2l0RGF0YTpcdGRhdGFcblx0XHR9O1xuXHRcdGF3YWl0IHByb2plY3RfbWFuYWdlci5vcGVuUHJvamVjdChkYXRhMik7XG5cdFx0c29ja2V0LmVtaXQoJ3Byb2plY3QtZGF0YScsIGRhdGEyKTtcblx0XHRpZiAoZGF0YTIuY3VycmVudFByb2plY3Qpe1xuXHRcdFx0aWYgKGRhdGEyLnByb2plY3RMaXN0KXtcblx0XHRcdFx0c29ja2V0LmJyb2FkY2FzdC5lbWl0KCdwcm9qZWN0LWxpc3QnLCBkYXRhMi5jdXJyZW50UHJvamVjdCwgZGF0YTIucHJvamVjdExpc3QpO1xuXHRcdFx0fVxuXHRcdFx0aWYgKGRhdGEyLmZpbGVMaXN0KXtcblx0XHRcdFx0c29ja2V0LmJyb2FkY2FzdC5lbWl0KCdmaWxlLWxpc3QnLCBkYXRhMi5jdXJyZW50UHJvamVjdCwgZGF0YTIuZmlsZUxpc3QpO1xuXHRcdFx0fVxuXHRcdFx0aWRlX3NldHRpbmdzLnNldElERVNldHRpbmcoe2tleTogJ3Byb2plY3QnLCB2YWx1ZTogZGF0YTIuY3VycmVudFByb2plY3R9KTtcblx0XHR9XG5cdH1cblx0Y2F0Y2goZSl7XG5cdFx0Y29uc29sZS5sb2coJ2dpdC1ldmVudCBlcnJvcicsIGUpO1xuXHRcdGRhdGEuZXJyb3IgPSBlLnRvU3RyaW5nKCk7XG5cdFx0c29ja2V0LmVtaXQoJ3Byb2plY3QtZGF0YScsIHtnaXREYXRhOiBkYXRhLCB0aW1lc3RhbXA6IGRhdGEudGltZXN0YW1wfSk7XG5cdFx0c29ja2V0LmVtaXQoJ3JlcG9ydC1lcnJvcicsIGUudG9TdHJpbmcoKSk7XG5cdH1cbn1cbiJdfQ==
