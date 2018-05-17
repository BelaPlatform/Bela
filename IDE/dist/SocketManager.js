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
    ide_sockets.emit(event, message);
}
exports.broadcast = broadcast;
function connection(socket) {
    socket.on('set-time', IDE.set_time);
    socket.on('project-event', function (data) { return project_event(socket, data); });
    socket.on('project-settings', function (data) { return project_settings_event(socket, data); });
    socket.on('process-event', function (data) { return process_event(socket, data); });
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
                    console.log('done');
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,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Q0FBQyxjQUFjLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxJQUFJLENBQUUsZUFBdUIsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUM7d0JBQ3pGLE9BQU8sQ0FBQyxHQUFHLENBQUMsbUJBQW1CLEVBQUUsSUFBSSxDQUFDLENBQUM7d0JBQ3ZDLHNCQUFPO3FCQUNQO29CQUNELHFCQUFPLGVBQXVCLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFBOztvQkFBaEQsU0FBZ0QsQ0FBQzs7Ozs7Q0FDakQiLCJmaWxlIjoiU29ja2V0TWFuYWdlci5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGlvIGZyb20gJ3NvY2tldC5pbyc7XG5pbXBvcnQgKiBhcyBodHRwIGZyb20gJ2h0dHAnO1xuaW1wb3J0ICogYXMgSURFIGZyb20gJy4vbWFpbic7XG5pbXBvcnQgKiBhcyBwcm9qZWN0X21hbmFnZXIgZnJvbSAnLi9Qcm9qZWN0TWFuYWdlcic7XG5pbXBvcnQgKiBhcyBwcm9jZXNzX21hbmFnZXIgZnJvbSAnLi9Qcm9jZXNzTWFuYWdlcic7XG5pbXBvcnQgKiBhcyBwcm9qZWN0X3NldHRpbmdzIGZyb20gJy4vUHJvamVjdFNldHRpbmdzJztcbmltcG9ydCAqIGFzIGlkZV9zZXR0aW5ncyBmcm9tICcuL0lERVNldHRpbmdzJztcbmltcG9ydCAqIGFzIGJvb3RfcHJvamVjdCBmcm9tICcuL1J1bk9uQm9vdCc7XG5pbXBvcnQgKiBhcyB1dGlsIGZyb20gJy4vdXRpbHMnO1xuXG4vL3JlbW92ZSB0aGlzXG5pbXBvcnQgKiBhcyBNYWtlIGZyb20gJy4vTWFrZVByb2Nlc3MnO1xubGV0IG1ha2UgPSBuZXcgTWFrZS5NYWtlUHJvY2Vzcygnc3ludGF4Jyk7XG5cbi8vIGFsbCBjb25uZWN0ZWQgc29ja2V0c1xubGV0IGlkZV9zb2NrZXRzOiBTb2NrZXRJTy5OYW1lc3BhY2U7XG5cbmV4cG9ydCBmdW5jdGlvbiBpbml0KHNlcnZlcjogaHR0cC5TZXJ2ZXIpe1xuXHRpZGVfc29ja2V0cyA9IGlvKHNlcnZlciwge1xuXHRcdHBpbmdJbnRlcnZhbDogMzAwMCxcblx0XHRwaW5nVGltZW91dDogNjUwMFxuXHR9KS5vZignL0lERScpO1xuXHRpZGVfc29ja2V0cy5vbignY29ubmVjdGlvbicsIGNvbm5lY3Rpb24pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYnJvYWRjYXN0KGV2ZW50OiBzdHJpbmcsIG1lc3NhZ2U6IGFueSl7XG5cdC8vIGNvbnNvbGUubG9nKCdicm9hZGNhc3RpbmcnLCBldmVudCwgbWVzc2FnZSk7XG5cdGlkZV9zb2NrZXRzLmVtaXQoZXZlbnQsIG1lc3NhZ2UpO1xufVxuXG5mdW5jdGlvbiBjb25uZWN0aW9uKHNvY2tldDogU29ja2V0SU8uU29ja2V0KXtcblx0c29ja2V0Lm9uKCdzZXQtdGltZScsIElERS5zZXRfdGltZSk7XG5cdHNvY2tldC5vbigncHJvamVjdC1ldmVudCcsIChkYXRhOiBhbnkpID0+IHByb2plY3RfZXZlbnQoc29ja2V0LCBkYXRhKSApO1xuXHRzb2NrZXQub24oJ3Byb2plY3Qtc2V0dGluZ3MnLCAoZGF0YTogYW55KSA9PiBwcm9qZWN0X3NldHRpbmdzX2V2ZW50KHNvY2tldCwgZGF0YSkgKTtcblx0c29ja2V0Lm9uKCdwcm9jZXNzLWV2ZW50JywgKGRhdGE6IGFueSkgPT4gcHJvY2Vzc19ldmVudChzb2NrZXQsIGRhdGEpICk7XG5cdGluaXRfbWVzc2FnZShzb2NrZXQpO1xufVxuXG5hc3luYyBmdW5jdGlvbiBpbml0X21lc3NhZ2Uoc29ja2V0OiBTb2NrZXRJTy5Tb2NrZXQpe1xuXHRsZXQgbWVzc2FnZTogdXRpbC5Jbml0X01lc3NhZ2UgPSB7XG5cdFx0cHJvamVjdHMgOiBhd2FpdCBwcm9qZWN0X21hbmFnZXIubGlzdFByb2plY3RzKCksXG5cdFx0ZXhhbXBsZXMgOiBhd2FpdCBwcm9qZWN0X21hbmFnZXIubGlzdEV4YW1wbGVzKCksXG5cdFx0c2V0dGluZ3MgOiBhd2FpdCBpZGVfc2V0dGluZ3MucmVhZCgpLFxuXHRcdGJvb3RfcHJvamVjdCA6IGF3YWl0IGJvb3RfcHJvamVjdC5nZXRfYm9vdF9wcm9qZWN0KCksXG5cdFx0eGVub21haV92ZXJzaW9uIDogYXdhaXQgSURFLmdldF94ZW5vbWFpX3ZlcnNpb24oKVxuLy9cdHN0YXR1cyA6IGF3YWl0IHByb2Nlc3NfbWFuYWdlci5zdGF0dXMoKVxuXHR9O1xuXHRzb2NrZXQuZW1pdCgnaW5pdCcsIG1lc3NhZ2UpO1xufVxuXG4vLyBQcm9jZXNzIGFsbCB3ZWJzb2NrZXQgZXZlbnRzIHdoaWNoIG5lZWQgdG8gYmUgaGFuZGxlZCBieSB0aGUgUHJvamVjdE1hbmFnZXJcbmFzeW5jIGZ1bmN0aW9uIHByb2plY3RfZXZlbnQoc29ja2V0OiBTb2NrZXRJTy5Tb2NrZXQsIGRhdGE6IGFueSl7XG4vL1x0Y29uc29sZS5sb2coJ3Byb2plY3QtZXZlbnQnKTtcbi8vXHRjb25zb2xlLmRpcihkYXRhKTtcblx0Ly8gcmVqZWN0IGFueSBtYWxmb3JtZWQgd2Vic29ja2V0IG1lc3NhZ2Vcblx0aWYgKCghZGF0YS5jdXJyZW50UHJvamVjdCAmJiAhZGF0YS5uZXdQcm9qZWN0KSB8fCAhZGF0YS5mdW5jIHx8ICEocHJvamVjdF9tYW5hZ2VyIGFzIGFueSlbZGF0YS5mdW5jXSkge1xuXHRcdGNvbnNvbGUubG9nKCdiYWQgcHJvamVjdC1ldmVudCcpO1xuXHRcdGNvbnNvbGUuZGlyKGRhdGEsIHtkZXB0aDpudWxsfSk7XG5cdFx0cmV0dXJuO1xuXHR9XG5cdC8vIGNhbGwgdGhlIHByb2plY3RfbWFuYWdlciBmdW5jdGlvbiBzcGVjaWZpZWQgaW4gdGhlIGZ1bmMgZmllbGQgb2YgdGhlIHdzIG1lc3NhZ2Vcblx0YXdhaXQgKHByb2plY3RfbWFuYWdlciBhcyBhbnkpW2RhdGEuZnVuY10oZGF0YSlcblx0XHQuY2F0Y2goIChlOiBFcnJvcikgPT4ge1xuXHRcdFx0Ly8gaW4gdGhlIGV2ZW50IG9mIGFuIGVycm9yLCBsb2cgaXQgdG8gdGhlIElERSBjb25zb2xlXG5cdFx0XHQvLyBhbmQgc2VuZCBhIHN0cmluZyBiYWNrIHRvIHRoZSBicm93c2VyIGZvciBkaXNwbGF5IHRvIHRoZSB1c2VyXG5cdFx0XHRjb25zb2xlLmxvZygncHJvamVjdC1ldmVudCBlcnJvcjonKTtcblx0XHRcdGNvbnNvbGUubG9nKGUpO1xuXHRcdFx0ZGF0YS5lcnJvciA9IGUudG9TdHJpbmcoKTtcblx0XHRcdHNvY2tldC5lbWl0KCdwcm9qZWN0LWRhdGEnLCBkYXRhKTtcblx0XHR9KTtcblx0Y29uc29sZS5sb2coJ2RvbmUnKTtcbi8vXHRjb25zb2xlLmRpcihkYXRhKTtcblx0Ly8gYWZ0ZXIgYSBzdWNjZXNmdWwgb3BlcmF0aW9uLCBzZW5kIHRoZSBkYXRhIGJhY2tcblx0c29ja2V0LmVtaXQoJ3Byb2plY3QtZGF0YScsIGRhdGEpO1xuXHRpZiAoZGF0YS5jdXJyZW50UHJvamVjdCl7XG5cdFx0Ly8gc2F2ZSB0aGUgY3VycmVudCBwcm9qZWN0IGluIHRoZSBJREUgc2V0dGluZ3Ncblx0XHRpZGVfc2V0dGluZ3Muc2V0X3NldHRpbmcoJ3Byb2plY3QnLCBkYXRhLmN1cnJlbnRQcm9qZWN0KTtcblx0XHQvLyBpZiBhIGZpbGVMaXN0IHdhcyBjcmVhdGVkLCBzZW5kIGl0IHRvIG90aGVyIHRhYnNcblx0XHRpZiAoZGF0YS5maWxlTGlzdClcblx0XHRcdHNvY2tldC5icm9hZGNhc3QuZW1pdCgnZmlsZS1saXN0JywgZGF0YS5jdXJyZW50UHJvamVjdCwgZGF0YS5maWxlTGlzdCk7XG5cdFx0Ly8gaWYgYSBwcm9qZWN0TGlzdCB3YXMgY3JlYXRlZCwgc2VuZCBpdCB0byBvdGhlciB0YWJzXG5cdFx0aWYgKGRhdGEucHJvamVjdExpc3QpXG5cdFx0XHRzb2NrZXQuYnJvYWRjYXN0LmVtaXQoJ3Byb2plY3QtbGlzdCcsIGRhdGEuY3VycmVudFByb2plY3QsIGRhdGEucHJvamVjdExpc3QpO1xuXHR9XG59XG5cbmFzeW5jIGZ1bmN0aW9uIHByb2plY3Rfc2V0dGluZ3NfZXZlbnQoc29ja2V0OiBTb2NrZXRJTy5Tb2NrZXQsIGRhdGE6IGFueSl7XG4vL1x0Y29uc29sZS5sb2coJ3Byb2plY3Rfc2V0dGluZ3MnKVxuLy9cdGNvbnNvbGUuZGlyKGRhdGEpO1xuXHRpZiAoIWRhdGEuY3VycmVudFByb2plY3QgfHwgIWRhdGEuZnVuYyB8fCAhKHByb2plY3Rfc2V0dGluZ3MgYXMgYW55KVtkYXRhLmZ1bmNdKSB7XG5cdFx0Y29uc29sZS5sb2coJ2JhZCBwcm9qZWN0LXNldHRpbmdzJywgZGF0YSk7XG5cdFx0cmV0dXJuO1xuXHR9XG5cdGxldCBzZXR0aW5ncyA9IGF3YWl0IChwcm9qZWN0X3NldHRpbmdzIGFzIGFueSlbZGF0YS5mdW5jXShkYXRhKVxuXHRcdC5jYXRjaCggKGU6IEVycm9yKSA9PiB7XG5cdFx0XHRjb25zb2xlLmxvZygncHJvamVjdC1zZXR0aW5ncyBlcnJvcicpO1xuXHRcdFx0Y29uc29sZS5sb2coZSk7XG5cdFx0XHRzb2NrZXQuZW1pdCgncmVwb3J0LWVycm9yJywgZS50b1N0cmluZygpKTtcblx0XHR9KTtcbi8vXHRjb25zb2xlLmxvZygncHJvamVjdF9zZXR0aW5ncycpXG4vL1x0Y29uc29sZS5kaXIoc2V0dGluZ3MpO1xuXHRpZiAoZGF0YS5mdW5jID09PSAnc2V0Q0xBcmcnKXtcblx0XHRzb2NrZXQuYnJvYWRjYXN0LmVtaXQoJ3Byb2plY3Qtc2V0dGluZ3MtZGF0YScsIGRhdGEuY3VycmVudFByb2plY3QsIHNldHRpbmdzKTtcblx0fSBlbHNlIHtcblx0XHRpZGVfc29ja2V0cy5lbWl0KCdwcm9qZWN0LXNldHRpbmdzLWRhdGEnLCBkYXRhLmN1cnJlbnRQcm9qZWN0LCBzZXR0aW5ncyk7XG5cdH1cbn1cblxuYXN5bmMgZnVuY3Rpb24gcHJvY2Vzc19ldmVudChzb2NrZXQ6IFNvY2tldElPLlNvY2tldCwgZGF0YTogYW55KXtcblx0aWYgKCFkYXRhIHx8ICFkYXRhLmN1cnJlbnRQcm9qZWN0IHx8ICFkYXRhLmV2ZW50IHx8ICEocHJvY2Vzc19tYW5hZ2VyIGFzIGFueSlbZGF0YS5ldmVudF0pe1xuXHRcdGNvbnNvbGUubG9nKCdiYWQgcHJvY2Vzcy1ldmVudCcsIGRhdGEpO1xuXHRcdHJldHVybjtcblx0fVxuXHRhd2FpdCAocHJvY2Vzc19tYW5hZ2VyIGFzIGFueSlbZGF0YS5ldmVudF0oZGF0YSk7XG59XG4iXX0=
