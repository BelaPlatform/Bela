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
var project_settings = require("./ProjectSettings");
var ide_settings = require("./IDESettings");
var boot_project = require("./RunOnBoot");
// all connected sockets
var ide_sockets;
function init(server) {
    ide_sockets = io(server, {
        pingInterval: 3000,
        pingTimeout: 6500
    }).of('/IDE');
    ide_sockets.on('connection', connection);
}
exports.init = init;
function connection(socket) {
    socket.on('set-time', IDE.set_time);
    socket.on('project-event', function (data) { return project_event(socket, data); });
    socket.on('project-settings', function (data) { return project_settings_event(socket, data); });
    init_message(socket);
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
                    //	console.log('done');
                    //	console.dir(data);
                    // after a succesful operation, send the data back
                    socket.emit('project-data', data);
                    if (data.currentProject) {
                        // save the current project in the IDE settings
                        ide_settings.set_setting('project', data.currentProject);
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
                    console.log('project_settings');
                    console.dir(data);
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
                    console.log('project_settings');
                    console.dir(settings);
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,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cUJBQ1A7b0JBQ2MscUJBQU8sZ0JBQXdCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQzs2QkFDN0QsS0FBSyxDQUFFLFVBQUMsQ0FBUTs0QkFDaEIsT0FBTyxDQUFDLEdBQUcsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDOzRCQUN0QyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDOzRCQUNmLE1BQU0sQ0FBQyxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO3dCQUMzQyxDQUFDLENBQUMsRUFBQTs7b0JBTEMsUUFBUSxHQUFHLFNBS1o7b0JBQ0gsT0FBTyxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFBO29CQUMvQixPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDO29CQUN0QixJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssVUFBVSxFQUFDO3dCQUM1QixNQUFNLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyx1QkFBdUIsRUFBRSxJQUFJLENBQUMsY0FBYyxFQUFFLFFBQVEsQ0FBQyxDQUFDO3FCQUM5RTt5QkFBTTt3QkFDTixXQUFXLENBQUMsSUFBSSxDQUFDLHVCQUF1QixFQUFFLElBQUksQ0FBQyxjQUFjLEVBQUUsUUFBUSxDQUFDLENBQUM7cUJBQ3pFOzs7OztDQUNEIiwiZmlsZSI6IlNvY2tldE1hbmFnZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBpbyBmcm9tICdzb2NrZXQuaW8nO1xuaW1wb3J0ICogYXMgaHR0cCBmcm9tICdodHRwJztcbmltcG9ydCAqIGFzIElERSBmcm9tICcuL21haW4nO1xuaW1wb3J0ICogYXMgcHJvamVjdF9tYW5hZ2VyIGZyb20gJy4vUHJvamVjdE1hbmFnZXInO1xuaW1wb3J0ICogYXMgcHJvamVjdF9zZXR0aW5ncyBmcm9tICcuL1Byb2plY3RTZXR0aW5ncyc7XG5pbXBvcnQgKiBhcyBpZGVfc2V0dGluZ3MgZnJvbSAnLi9JREVTZXR0aW5ncyc7XG5pbXBvcnQgKiBhcyBib290X3Byb2plY3QgZnJvbSAnLi9SdW5PbkJvb3QnO1xuaW1wb3J0ICogYXMgdXRpbCBmcm9tICcuL3V0aWxzJztcblxuLy8gYWxsIGNvbm5lY3RlZCBzb2NrZXRzXG5sZXQgaWRlX3NvY2tldHM6IFNvY2tldElPLk5hbWVzcGFjZTtcblxuZXhwb3J0IGZ1bmN0aW9uIGluaXQoc2VydmVyOiBodHRwLlNlcnZlcil7XG5cdGlkZV9zb2NrZXRzID0gaW8oc2VydmVyLCB7XG5cdFx0cGluZ0ludGVydmFsOiAzMDAwLFxuXHRcdHBpbmdUaW1lb3V0OiA2NTAwXG5cdH0pLm9mKCcvSURFJyk7XG5cdGlkZV9zb2NrZXRzLm9uKCdjb25uZWN0aW9uJywgY29ubmVjdGlvbik7XG59XG5cbmZ1bmN0aW9uIGNvbm5lY3Rpb24oc29ja2V0OiBTb2NrZXRJTy5Tb2NrZXQpe1xuXHRzb2NrZXQub24oJ3NldC10aW1lJywgSURFLnNldF90aW1lKTtcblx0c29ja2V0Lm9uKCdwcm9qZWN0LWV2ZW50JywgKGRhdGE6IGFueSkgPT4gcHJvamVjdF9ldmVudChzb2NrZXQsIGRhdGEpICk7XG5cdHNvY2tldC5vbigncHJvamVjdC1zZXR0aW5ncycsIChkYXRhOiBhbnkpID0+IHByb2plY3Rfc2V0dGluZ3NfZXZlbnQoc29ja2V0LCBkYXRhKSApO1xuXHRpbml0X21lc3NhZ2Uoc29ja2V0KTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gaW5pdF9tZXNzYWdlKHNvY2tldDogU29ja2V0SU8uU29ja2V0KXtcblx0bGV0IG1lc3NhZ2U6IHV0aWwuSW5pdF9NZXNzYWdlID0ge1xuXHRcdHByb2plY3RzIDogYXdhaXQgcHJvamVjdF9tYW5hZ2VyLmxpc3RQcm9qZWN0cygpLFxuXHRcdGV4YW1wbGVzIDogYXdhaXQgcHJvamVjdF9tYW5hZ2VyLmxpc3RFeGFtcGxlcygpLFxuXHRcdHNldHRpbmdzIDogYXdhaXQgaWRlX3NldHRpbmdzLnJlYWQoKSxcblx0XHRib290X3Byb2plY3QgOiBhd2FpdCBib290X3Byb2plY3QuZ2V0X2Jvb3RfcHJvamVjdCgpLFxuXHRcdHhlbm9tYWlfdmVyc2lvbiA6IGF3YWl0IElERS5nZXRfeGVub21haV92ZXJzaW9uKClcbi8vXHRzdGF0dXMgOiBhd2FpdCBwcm9jZXNzX21hbmFnZXIuc3RhdHVzKClcblx0fTtcblx0c29ja2V0LmVtaXQoJ2luaXQnLCBtZXNzYWdlKTtcbn1cblxuLy8gUHJvY2VzcyBhbGwgd2Vic29ja2V0IGV2ZW50cyB3aGljaCBuZWVkIHRvIGJlIGhhbmRsZWQgYnkgdGhlIFByb2plY3RNYW5hZ2VyXG5hc3luYyBmdW5jdGlvbiBwcm9qZWN0X2V2ZW50KHNvY2tldDogU29ja2V0SU8uU29ja2V0LCBkYXRhOiBhbnkpe1xuLy9cdGNvbnNvbGUubG9nKCdwcm9qZWN0LWV2ZW50Jyk7XG4vL1x0Y29uc29sZS5kaXIoZGF0YSk7XG5cdC8vIHJlamVjdCBhbnkgbWFsZm9ybWVkIHdlYnNvY2tldCBtZXNzYWdlXG5cdGlmICgoIWRhdGEuY3VycmVudFByb2plY3QgJiYgIWRhdGEubmV3UHJvamVjdCkgfHwgIWRhdGEuZnVuYyB8fCAhKHByb2plY3RfbWFuYWdlciBhcyBhbnkpW2RhdGEuZnVuY10pIHtcblx0XHRjb25zb2xlLmxvZygnYmFkIHByb2plY3QtZXZlbnQnKTtcblx0XHRjb25zb2xlLmRpcihkYXRhLCB7ZGVwdGg6bnVsbH0pO1xuXHRcdHJldHVybjtcblx0fVxuXHQvLyBjYWxsIHRoZSBwcm9qZWN0X21hbmFnZXIgZnVuY3Rpb24gc3BlY2lmaWVkIGluIHRoZSBmdW5jIGZpZWxkIG9mIHRoZSB3cyBtZXNzYWdlXG5cdGF3YWl0IChwcm9qZWN0X21hbmFnZXIgYXMgYW55KVtkYXRhLmZ1bmNdKGRhdGEpXG5cdFx0LmNhdGNoKCAoZTogRXJyb3IpID0+IHtcblx0XHRcdC8vIGluIHRoZSBldmVudCBvZiBhbiBlcnJvciwgbG9nIGl0IHRvIHRoZSBJREUgY29uc29sZVxuXHRcdFx0Ly8gYW5kIHNlbmQgYSBzdHJpbmcgYmFjayB0byB0aGUgYnJvd3NlciBmb3IgZGlzcGxheSB0byB0aGUgdXNlclxuXHRcdFx0Y29uc29sZS5sb2coJ3Byb2plY3QtZXZlbnQgZXJyb3I6Jyk7XG5cdFx0XHRjb25zb2xlLmxvZyhlKTtcblx0XHRcdGRhdGEuZXJyb3IgPSBlLnRvU3RyaW5nKCk7XG5cdFx0XHRzb2NrZXQuZW1pdCgncHJvamVjdC1kYXRhJywgZGF0YSk7XG5cdFx0fSk7XG4vL1x0Y29uc29sZS5sb2coJ2RvbmUnKTtcbi8vXHRjb25zb2xlLmRpcihkYXRhKTtcblx0Ly8gYWZ0ZXIgYSBzdWNjZXNmdWwgb3BlcmF0aW9uLCBzZW5kIHRoZSBkYXRhIGJhY2tcblx0c29ja2V0LmVtaXQoJ3Byb2plY3QtZGF0YScsIGRhdGEpO1xuXHRpZiAoZGF0YS5jdXJyZW50UHJvamVjdCl7XG5cdFx0Ly8gc2F2ZSB0aGUgY3VycmVudCBwcm9qZWN0IGluIHRoZSBJREUgc2V0dGluZ3Ncblx0XHRpZGVfc2V0dGluZ3Muc2V0X3NldHRpbmcoJ3Byb2plY3QnLCBkYXRhLmN1cnJlbnRQcm9qZWN0KTtcblx0XHQvLyBpZiBhIGZpbGVMaXN0IHdhcyBjcmVhdGVkLCBzZW5kIGl0IHRvIG90aGVyIHRhYnNcblx0XHRpZiAoZGF0YS5maWxlTGlzdClcblx0XHRcdHNvY2tldC5icm9hZGNhc3QuZW1pdCgnZmlsZS1saXN0JywgZGF0YS5jdXJyZW50UHJvamVjdCwgZGF0YS5maWxlTGlzdCk7XG5cdFx0Ly8gaWYgYSBwcm9qZWN0TGlzdCB3YXMgY3JlYXRlZCwgc2VuZCBpdCB0byBvdGhlciB0YWJzXG5cdFx0aWYgKGRhdGEucHJvamVjdExpc3QpXG5cdFx0XHRzb2NrZXQuYnJvYWRjYXN0LmVtaXQoJ3Byb2plY3QtbGlzdCcsIGRhdGEuY3VycmVudFByb2plY3QsIGRhdGEucHJvamVjdExpc3QpO1xuXHR9XG59XG5cbmFzeW5jIGZ1bmN0aW9uIHByb2plY3Rfc2V0dGluZ3NfZXZlbnQoc29ja2V0OiBTb2NrZXRJTy5Tb2NrZXQsIGRhdGE6IGFueSl7XG5cdGNvbnNvbGUubG9nKCdwcm9qZWN0X3NldHRpbmdzJylcblx0Y29uc29sZS5kaXIoZGF0YSk7XG5cdGlmICghZGF0YS5jdXJyZW50UHJvamVjdCB8fCAhZGF0YS5mdW5jIHx8ICEocHJvamVjdF9zZXR0aW5ncyBhcyBhbnkpW2RhdGEuZnVuY10pIHtcblx0XHRjb25zb2xlLmxvZygnYmFkIHByb2plY3Qtc2V0dGluZ3MnLCBkYXRhKTtcblx0XHRyZXR1cm47XG5cdH1cblx0bGV0IHNldHRpbmdzID0gYXdhaXQgKHByb2plY3Rfc2V0dGluZ3MgYXMgYW55KVtkYXRhLmZ1bmNdKGRhdGEpXG5cdFx0LmNhdGNoKCAoZTogRXJyb3IpID0+IHtcblx0XHRcdGNvbnNvbGUubG9nKCdwcm9qZWN0LXNldHRpbmdzIGVycm9yJyk7XG5cdFx0XHRjb25zb2xlLmxvZyhlKTtcblx0XHRcdHNvY2tldC5lbWl0KCdyZXBvcnQtZXJyb3InLCBlLnRvU3RyaW5nKCkpO1xuXHRcdH0pO1xuXHRjb25zb2xlLmxvZygncHJvamVjdF9zZXR0aW5ncycpXG5cdGNvbnNvbGUuZGlyKHNldHRpbmdzKTtcblx0aWYgKGRhdGEuZnVuYyA9PT0gJ3NldENMQXJnJyl7XG5cdFx0c29ja2V0LmJyb2FkY2FzdC5lbWl0KCdwcm9qZWN0LXNldHRpbmdzLWRhdGEnLCBkYXRhLmN1cnJlbnRQcm9qZWN0LCBzZXR0aW5ncyk7XG5cdH0gZWxzZSB7XG5cdFx0aWRlX3NvY2tldHMuZW1pdCgncHJvamVjdC1zZXR0aW5ncy1kYXRhJywgZGF0YS5jdXJyZW50UHJvamVjdCwgc2V0dGluZ3MpO1xuXHR9XG59XG5cbiJdfQ==
