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
var project_settings = require("./ProjectSettings");
var ide_settings = require("./IDESettings");
var boot_project = require("./RunOnBoot");
//remove this
var Make = require("./MakeProcess");
var make = new Make.MakeProcess('syntax');
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,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QUMsY0FBYyxFQUFFLFFBQVEsQ0FBQyxDQUFDO3FCQUN6RTs7Ozs7Q0FDRDtBQUVELHVCQUE2QixNQUF1QixFQUFFLElBQVM7Ozs7O29CQUM5RCxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLGNBQWMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLElBQUksQ0FBRSxlQUF1QixDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBQzt3QkFDekYsT0FBTyxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsRUFBRSxJQUFJLENBQUMsQ0FBQzt3QkFDdkMsc0JBQU87cUJBQ1A7b0JBQ0QscUJBQU8sZUFBdUIsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUE7O29CQUFoRCxTQUFnRCxDQUFDOzs7OztDQUNqRDtBQUVELDRCQUFrQyxNQUF1QixFQUFFLElBQVM7Ozs7OztvQkFDbkUsSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLElBQUksQ0FBRSxZQUFvQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBQzt3QkFDNUQsT0FBTyxDQUFDLEdBQUcsQ0FBQyx3QkFBd0IsRUFBRSxJQUFJLENBQUMsQ0FBQzt3QkFDNUMsc0JBQU87cUJBQ1A7b0JBQ1kscUJBQU8sWUFBb0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDOzZCQUN2RCxLQUFLLENBQUUsVUFBQyxDQUFRLElBQUssT0FBQSxPQUFPLENBQUMsR0FBRyxDQUFDLG9CQUFvQixFQUFFLENBQUMsQ0FBQyxFQUFwQyxDQUFvQyxDQUFFLEVBQUE7O29CQUR6RCxNQUFNLEdBQUcsU0FDZ0Q7b0JBQzdELFNBQVMsQ0FBQyxtQkFBbUIsRUFBRSxNQUFNLENBQUMsQ0FBQzs7Ozs7Q0FDdkMiLCJmaWxlIjoiU29ja2V0TWFuYWdlci5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGlvIGZyb20gJ3NvY2tldC5pbyc7XG5pbXBvcnQgKiBhcyBodHRwIGZyb20gJ2h0dHAnO1xuaW1wb3J0ICogYXMgSURFIGZyb20gJy4vbWFpbic7XG5pbXBvcnQgKiBhcyBwcm9qZWN0X21hbmFnZXIgZnJvbSAnLi9Qcm9qZWN0TWFuYWdlcic7XG5pbXBvcnQgKiBhcyBwcm9jZXNzX21hbmFnZXIgZnJvbSAnLi9Qcm9jZXNzTWFuYWdlcic7XG5pbXBvcnQgKiBhcyBwcm9qZWN0X3NldHRpbmdzIGZyb20gJy4vUHJvamVjdFNldHRpbmdzJztcbmltcG9ydCAqIGFzIGlkZV9zZXR0aW5ncyBmcm9tICcuL0lERVNldHRpbmdzJztcbmltcG9ydCAqIGFzIGJvb3RfcHJvamVjdCBmcm9tICcuL1J1bk9uQm9vdCc7XG5pbXBvcnQgKiBhcyB1dGlsIGZyb20gJy4vdXRpbHMnO1xuXG4vL3JlbW92ZSB0aGlzXG5pbXBvcnQgKiBhcyBNYWtlIGZyb20gJy4vTWFrZVByb2Nlc3MnO1xubGV0IG1ha2UgPSBuZXcgTWFrZS5NYWtlUHJvY2Vzcygnc3ludGF4Jyk7XG5cbi8vIGFsbCBjb25uZWN0ZWQgc29ja2V0c1xubGV0IGlkZV9zb2NrZXRzOiBTb2NrZXRJTy5OYW1lc3BhY2U7XG5cbmV4cG9ydCBmdW5jdGlvbiBpbml0KHNlcnZlcjogaHR0cC5TZXJ2ZXIpe1xuXHRpZGVfc29ja2V0cyA9IGlvKHNlcnZlciwge1xuXHRcdHBpbmdJbnRlcnZhbDogMzAwMCxcblx0XHRwaW5nVGltZW91dDogNjUwMFxuXHR9KS5vZignL0lERScpO1xuXHRpZGVfc29ja2V0cy5vbignY29ubmVjdGlvbicsIGNvbm5lY3Rpb24pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYnJvYWRjYXN0KGV2ZW50OiBzdHJpbmcsIG1lc3NhZ2U6IGFueSl7XG5cdC8vIGNvbnNvbGUubG9nKCdicm9hZGNhc3RpbmcnLCBldmVudCwgbWVzc2FnZSk7XG5cdGlmIChpZGVfc29ja2V0cykgaWRlX3NvY2tldHMuZW1pdChldmVudCwgbWVzc2FnZSk7XG59XG5cbmZ1bmN0aW9uIGNvbm5lY3Rpb24oc29ja2V0OiBTb2NrZXRJTy5Tb2NrZXQpe1xuXHRzb2NrZXQub24oJ3NldC10aW1lJywgSURFLnNldF90aW1lKTtcblx0c29ja2V0Lm9uKCdwcm9qZWN0LWV2ZW50JywgKGRhdGE6IGFueSkgPT4gcHJvamVjdF9ldmVudChzb2NrZXQsIGRhdGEpICk7XG5cdHNvY2tldC5vbigncHJvamVjdC1zZXR0aW5ncycsIChkYXRhOiBhbnkpID0+IHByb2plY3Rfc2V0dGluZ3NfZXZlbnQoc29ja2V0LCBkYXRhKSApO1xuXHRzb2NrZXQub24oJ3Byb2Nlc3MtZXZlbnQnLCAoZGF0YTogYW55KSA9PiBwcm9jZXNzX2V2ZW50KHNvY2tldCwgZGF0YSkgKTtcblx0c29ja2V0Lm9uKCdJREUtc2V0dGluZ3MnLCAoZGF0YTogYW55KSA9PiBpZGVfc2V0dGluZ3NfZXZlbnQoc29ja2V0LCBkYXRhKSApO1xuXHRpbml0X21lc3NhZ2Uoc29ja2V0KTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gaW5pdF9tZXNzYWdlKHNvY2tldDogU29ja2V0SU8uU29ja2V0KXtcblx0bGV0IG1lc3NhZ2U6IHV0aWwuSW5pdF9NZXNzYWdlID0ge1xuXHRcdHByb2plY3RzIDogYXdhaXQgcHJvamVjdF9tYW5hZ2VyLmxpc3RQcm9qZWN0cygpLFxuXHRcdGV4YW1wbGVzIDogYXdhaXQgcHJvamVjdF9tYW5hZ2VyLmxpc3RFeGFtcGxlcygpLFxuXHRcdHNldHRpbmdzIDogYXdhaXQgaWRlX3NldHRpbmdzLnJlYWQoKSxcblx0XHRib290X3Byb2plY3QgOiBhd2FpdCBib290X3Byb2plY3QuZ2V0X2Jvb3RfcHJvamVjdCgpLFxuXHRcdHhlbm9tYWlfdmVyc2lvbiA6IGF3YWl0IElERS5nZXRfeGVub21haV92ZXJzaW9uKClcbi8vXHRzdGF0dXMgOiBhd2FpdCBwcm9jZXNzX21hbmFnZXIuc3RhdHVzKClcblx0fTtcblx0c29ja2V0LmVtaXQoJ2luaXQnLCBtZXNzYWdlKTtcbn1cblxuLy8gUHJvY2VzcyBhbGwgd2Vic29ja2V0IGV2ZW50cyB3aGljaCBuZWVkIHRvIGJlIGhhbmRsZWQgYnkgdGhlIFByb2plY3RNYW5hZ2VyXG5hc3luYyBmdW5jdGlvbiBwcm9qZWN0X2V2ZW50KHNvY2tldDogU29ja2V0SU8uU29ja2V0LCBkYXRhOiBhbnkpe1xuLy9cdGNvbnNvbGUubG9nKCdwcm9qZWN0LWV2ZW50Jyk7XG4vL1x0Y29uc29sZS5kaXIoZGF0YSk7XG5cdC8vIHJlamVjdCBhbnkgbWFsZm9ybWVkIHdlYnNvY2tldCBtZXNzYWdlXG5cdGlmICgoIWRhdGEuY3VycmVudFByb2plY3QgJiYgIWRhdGEubmV3UHJvamVjdCkgfHwgIWRhdGEuZnVuYyB8fCAhKHByb2plY3RfbWFuYWdlciBhcyBhbnkpW2RhdGEuZnVuY10pIHtcblx0XHRjb25zb2xlLmxvZygnYmFkIHByb2plY3QtZXZlbnQnKTtcblx0XHRjb25zb2xlLmRpcihkYXRhLCB7ZGVwdGg6bnVsbH0pO1xuXHRcdHJldHVybjtcblx0fVxuXHQvLyBjYWxsIHRoZSBwcm9qZWN0X21hbmFnZXIgZnVuY3Rpb24gc3BlY2lmaWVkIGluIHRoZSBmdW5jIGZpZWxkIG9mIHRoZSB3cyBtZXNzYWdlXG5cdGF3YWl0IChwcm9qZWN0X21hbmFnZXIgYXMgYW55KVtkYXRhLmZ1bmNdKGRhdGEpXG5cdFx0LmNhdGNoKCAoZTogRXJyb3IpID0+IHtcblx0XHRcdC8vIGluIHRoZSBldmVudCBvZiBhbiBlcnJvciwgbG9nIGl0IHRvIHRoZSBJREUgY29uc29sZVxuXHRcdFx0Ly8gYW5kIHNlbmQgYSBzdHJpbmcgYmFjayB0byB0aGUgYnJvd3NlciBmb3IgZGlzcGxheSB0byB0aGUgdXNlclxuXHRcdFx0Y29uc29sZS5sb2coJ3Byb2plY3QtZXZlbnQgZXJyb3I6Jyk7XG5cdFx0XHRjb25zb2xlLmxvZyhlKTtcblx0XHRcdGRhdGEuZXJyb3IgPSBlLnRvU3RyaW5nKCk7XG5cdFx0XHRzb2NrZXQuZW1pdCgncHJvamVjdC1kYXRhJywgZGF0YSk7XG5cdFx0fSk7XG4vL1x0Y29uc29sZS5kaXIoZGF0YSk7XG5cdC8vIGFmdGVyIGEgc3VjY2VzZnVsIG9wZXJhdGlvbiwgc2VuZCB0aGUgZGF0YSBiYWNrXG5cdHNvY2tldC5lbWl0KCdwcm9qZWN0LWRhdGEnLCBkYXRhKTtcblx0aWYgKGRhdGEuY3VycmVudFByb2plY3Qpe1xuXHRcdC8vIHNhdmUgdGhlIGN1cnJlbnQgcHJvamVjdCBpbiB0aGUgSURFIHNldHRpbmdzXG5cdFx0aWRlX3NldHRpbmdzLnNldElERVNldHRpbmcoe2tleTogJ3Byb2plY3QnLCB2YWx1ZTogZGF0YS5jdXJyZW50UHJvamVjdH0pO1xuXHRcdC8vIGlmIGEgZmlsZUxpc3Qgd2FzIGNyZWF0ZWQsIHNlbmQgaXQgdG8gb3RoZXIgdGFic1xuXHRcdGlmIChkYXRhLmZpbGVMaXN0KVxuXHRcdFx0c29ja2V0LmJyb2FkY2FzdC5lbWl0KCdmaWxlLWxpc3QnLCBkYXRhLmN1cnJlbnRQcm9qZWN0LCBkYXRhLmZpbGVMaXN0KTtcblx0XHQvLyBpZiBhIHByb2plY3RMaXN0IHdhcyBjcmVhdGVkLCBzZW5kIGl0IHRvIG90aGVyIHRhYnNcblx0XHRpZiAoZGF0YS5wcm9qZWN0TGlzdClcblx0XHRcdHNvY2tldC5icm9hZGNhc3QuZW1pdCgncHJvamVjdC1saXN0JywgZGF0YS5jdXJyZW50UHJvamVjdCwgZGF0YS5wcm9qZWN0TGlzdCk7XG5cdH1cbn1cblxuYXN5bmMgZnVuY3Rpb24gcHJvamVjdF9zZXR0aW5nc19ldmVudChzb2NrZXQ6IFNvY2tldElPLlNvY2tldCwgZGF0YTogYW55KXtcbi8vXHRjb25zb2xlLmxvZygncHJvamVjdF9zZXR0aW5ncycpXG4vL1x0Y29uc29sZS5kaXIoZGF0YSk7XG5cdGlmICghZGF0YS5jdXJyZW50UHJvamVjdCB8fCAhZGF0YS5mdW5jIHx8ICEocHJvamVjdF9zZXR0aW5ncyBhcyBhbnkpW2RhdGEuZnVuY10pIHtcblx0XHRjb25zb2xlLmxvZygnYmFkIHByb2plY3Qtc2V0dGluZ3MnLCBkYXRhKTtcblx0XHRyZXR1cm47XG5cdH1cblx0bGV0IHNldHRpbmdzID0gYXdhaXQgKHByb2plY3Rfc2V0dGluZ3MgYXMgYW55KVtkYXRhLmZ1bmNdKGRhdGEpXG5cdFx0LmNhdGNoKCAoZTogRXJyb3IpID0+IHtcblx0XHRcdGNvbnNvbGUubG9nKCdwcm9qZWN0LXNldHRpbmdzIGVycm9yJyk7XG5cdFx0XHRjb25zb2xlLmxvZyhlKTtcblx0XHRcdHNvY2tldC5lbWl0KCdyZXBvcnQtZXJyb3InLCBlLnRvU3RyaW5nKCkpO1xuXHRcdH0pO1xuLy9cdGNvbnNvbGUubG9nKCdwcm9qZWN0X3NldHRpbmdzJylcbi8vXHRjb25zb2xlLmRpcihzZXR0aW5ncyk7XG5cdGlmIChkYXRhLmZ1bmMgPT09ICdzZXRDTEFyZycpe1xuXHRcdHNvY2tldC5icm9hZGNhc3QuZW1pdCgncHJvamVjdC1zZXR0aW5ncy1kYXRhJywgZGF0YS5jdXJyZW50UHJvamVjdCwgc2V0dGluZ3MpO1xuXHR9IGVsc2Uge1xuXHRcdGlkZV9zb2NrZXRzLmVtaXQoJ3Byb2plY3Qtc2V0dGluZ3MtZGF0YScsIGRhdGEuY3VycmVudFByb2plY3QsIHNldHRpbmdzKTtcblx0fVxufVxuXG5hc3luYyBmdW5jdGlvbiBwcm9jZXNzX2V2ZW50KHNvY2tldDogU29ja2V0SU8uU29ja2V0LCBkYXRhOiBhbnkpe1xuXHRpZiAoIWRhdGEgfHwgIWRhdGEuY3VycmVudFByb2plY3QgfHwgIWRhdGEuZXZlbnQgfHwgIShwcm9jZXNzX21hbmFnZXIgYXMgYW55KVtkYXRhLmV2ZW50XSl7XG5cdFx0Y29uc29sZS5sb2coJ2JhZCBwcm9jZXNzLWV2ZW50JywgZGF0YSk7XG5cdFx0cmV0dXJuO1xuXHR9XG5cdGF3YWl0IChwcm9jZXNzX21hbmFnZXIgYXMgYW55KVtkYXRhLmV2ZW50XShkYXRhKTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gaWRlX3NldHRpbmdzX2V2ZW50KHNvY2tldDogU29ja2V0SU8uU29ja2V0LCBkYXRhOiBhbnkpe1xuXHRpZiAoIWRhdGEgfHwgIWRhdGEuZnVuYyB8fCAhKGlkZV9zZXR0aW5ncyBhcyBhbnkpW2RhdGEuZnVuY10pe1xuXHRcdGNvbnNvbGUubG9nKCdiYWQgaWRlX3NldHRpbmdzIGV2ZW50JywgZGF0YSk7XG5cdFx0cmV0dXJuO1xuXHR9XG5cdGxldCByZXN1bHQgPSBhd2FpdCAoaWRlX3NldHRpbmdzIGFzIGFueSlbZGF0YS5mdW5jXShkYXRhKVxuXHRcdC5jYXRjaCggKGU6IEVycm9yKSA9PiBjb25zb2xlLmxvZygnaWRlX3NldHRpbmdzIGVycm9yJywgZSkgKTtcblx0YnJvYWRjYXN0KCdJREUtc2V0dGluZ3MtZGF0YScsIHJlc3VsdCk7XG59XG4iXX0=
