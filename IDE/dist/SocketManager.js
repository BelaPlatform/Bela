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
    init_message(socket);
}
function init_message(socket) {
    return __awaiter(this, void 0, void 0, function () {
        var message, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    console.log('constructing');
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
                    console.log('done');
                    //	console.dir(message, {depth:null});
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,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QixNQUFNLENBQUMsSUFBSSxDQUFDLGNBQWMsRUFBRSxJQUFJLENBQUMsQ0FBQzt3QkFDbkMsQ0FBQyxDQUFDLEVBQUE7O29CQVRILGtGQUFrRjtvQkFDbEYsU0FRRyxDQUFDO29CQUNMLHVCQUF1QjtvQkFDdkIscUJBQXFCO29CQUNwQixrREFBa0Q7b0JBQ2xELE1BQU0sQ0FBQyxJQUFJLENBQUMsY0FBYyxFQUFFLElBQUksQ0FBQyxDQUFDO29CQUNsQyxJQUFJLElBQUksQ0FBQyxjQUFjLEVBQUM7d0JBQ3ZCLCtDQUErQzt3QkFDL0MsWUFBWSxDQUFDLFdBQVcsQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDO3dCQUN6RCxtREFBbUQ7d0JBQ25ELElBQUksSUFBSSxDQUFDLFFBQVE7NEJBQ2hCLE1BQU0sQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsY0FBYyxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQzt3QkFDeEUsc0RBQXNEO3dCQUN0RCxJQUFJLElBQUksQ0FBQyxXQUFXOzRCQUNuQixNQUFNLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxjQUFjLEVBQUUsSUFBSSxDQUFDLGNBQWMsRUFBRSxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7cUJBQzlFOzs7OztDQUNEIiwiZmlsZSI6IlNvY2tldE1hbmFnZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBpbyBmcm9tICdzb2NrZXQuaW8nO1xuaW1wb3J0ICogYXMgaHR0cCBmcm9tICdodHRwJztcbmltcG9ydCAqIGFzIElERSBmcm9tICcuL21haW4nO1xuaW1wb3J0ICogYXMgcHJvamVjdF9tYW5hZ2VyIGZyb20gJy4vUHJvamVjdE1hbmFnZXInO1xuaW1wb3J0ICogYXMgaWRlX3NldHRpbmdzIGZyb20gJy4vSURFU2V0dGluZ3MnO1xuaW1wb3J0ICogYXMgYm9vdF9wcm9qZWN0IGZyb20gJy4vUnVuT25Cb290JztcbmltcG9ydCAqIGFzIHV0aWwgZnJvbSAnLi91dGlscyc7XG5cbi8vIGFsbCBjb25uZWN0ZWQgc29ja2V0c1xubGV0IGlkZV9zb2NrZXRzOiBTb2NrZXRJTy5OYW1lc3BhY2U7XG5cbmV4cG9ydCBmdW5jdGlvbiBpbml0KHNlcnZlcjogaHR0cC5TZXJ2ZXIpe1xuXHRpZGVfc29ja2V0cyA9IGlvKHNlcnZlciwge1xuXHRcdHBpbmdJbnRlcnZhbDogMzAwMCxcblx0XHRwaW5nVGltZW91dDogNjUwMFxuXHR9KS5vZignL0lERScpO1xuXHRpZGVfc29ja2V0cy5vbignY29ubmVjdGlvbicsIGNvbm5lY3Rpb24pO1xufVxuXG5mdW5jdGlvbiBjb25uZWN0aW9uKHNvY2tldDogU29ja2V0SU8uU29ja2V0KXtcblx0c29ja2V0Lm9uKCdzZXQtdGltZScsIElERS5zZXRfdGltZSk7XG5cdHNvY2tldC5vbigncHJvamVjdC1ldmVudCcsIChkYXRhOiBhbnkpID0+IHByb2plY3RfZXZlbnQoc29ja2V0LCBkYXRhKSApO1xuXHRpbml0X21lc3NhZ2Uoc29ja2V0KTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gaW5pdF9tZXNzYWdlKHNvY2tldDogU29ja2V0SU8uU29ja2V0KXtcblx0Y29uc29sZS5sb2coJ2NvbnN0cnVjdGluZycpO1xuXHRsZXQgbWVzc2FnZTogdXRpbC5Jbml0X01lc3NhZ2UgPSB7XG5cdFx0cHJvamVjdHMgOiBhd2FpdCBwcm9qZWN0X21hbmFnZXIubGlzdFByb2plY3RzKCksXG5cdFx0ZXhhbXBsZXMgOiBhd2FpdCBwcm9qZWN0X21hbmFnZXIubGlzdEV4YW1wbGVzKCksXG5cdFx0c2V0dGluZ3MgOiBhd2FpdCBpZGVfc2V0dGluZ3MucmVhZCgpLFxuXHRcdGJvb3RfcHJvamVjdCA6IGF3YWl0IGJvb3RfcHJvamVjdC5nZXRfYm9vdF9wcm9qZWN0KCksXG5cdFx0eGVub21haV92ZXJzaW9uIDogYXdhaXQgSURFLmdldF94ZW5vbWFpX3ZlcnNpb24oKVxuLy9cdHN0YXR1cyA6IGF3YWl0IHByb2Nlc3NfbWFuYWdlci5zdGF0dXMoKVxuXHR9O1xuXHRjb25zb2xlLmxvZygnZG9uZScpO1xuLy9cdGNvbnNvbGUuZGlyKG1lc3NhZ2UsIHtkZXB0aDpudWxsfSk7XG5cdHNvY2tldC5lbWl0KCdpbml0JywgbWVzc2FnZSk7XG59XG5cbi8vIFByb2Nlc3MgYWxsIHdlYnNvY2tldCBldmVudHMgd2hpY2ggbmVlZCB0byBiZSBoYW5kbGVkIGJ5IHRoZSBQcm9qZWN0TWFuYWdlclxuYXN5bmMgZnVuY3Rpb24gcHJvamVjdF9ldmVudChzb2NrZXQ6IFNvY2tldElPLlNvY2tldCwgZGF0YTogYW55KXtcbi8vXHRjb25zb2xlLmxvZygncHJvamVjdC1ldmVudCcpO1xuLy9cdGNvbnNvbGUuZGlyKGRhdGEpO1xuXHQvLyByZWplY3QgYW55IG1hbGZvcm1lZCB3ZWJzb2NrZXQgbWVzc2FnZVxuXHRpZiAoKCFkYXRhLmN1cnJlbnRQcm9qZWN0ICYmICFkYXRhLm5ld1Byb2plY3QpIHx8ICFkYXRhLmZ1bmMgfHwgIShwcm9qZWN0X21hbmFnZXIgYXMgYW55KVtkYXRhLmZ1bmNdKSB7XG5cdFx0Y29uc29sZS5sb2coJ2JhZCBwcm9qZWN0LWV2ZW50Jyk7XG5cdFx0Y29uc29sZS5kaXIoZGF0YSwge2RlcHRoOm51bGx9KTtcblx0XHRyZXR1cm47XG5cdH1cblx0Ly8gY2FsbCB0aGUgcHJvamVjdF9tYW5hZ2VyIGZ1bmN0aW9uIHNwZWNpZmllZCBpbiB0aGUgZnVuYyBmaWVsZCBvZiB0aGUgd3MgbWVzc2FnZVxuXHRhd2FpdCAocHJvamVjdF9tYW5hZ2VyIGFzIGFueSlbZGF0YS5mdW5jXShkYXRhKVxuXHRcdC5jYXRjaCggKGU6IEVycm9yKSA9PiB7XG5cdFx0XHQvLyBpbiB0aGUgZXZlbnQgb2YgYW4gZXJyb3IsIGxvZyBpdCB0byB0aGUgSURFIGNvbnNvbGVcblx0XHRcdC8vIGFuZCBzZW5kIGEgc3RyaW5nIGJhY2sgdG8gdGhlIGJyb3dzZXIgZm9yIGRpc3BsYXkgdG8gdGhlIHVzZXJcblx0XHRcdGNvbnNvbGUubG9nKCdwcm9qZWN0LWV2ZW50IGVycm9yOicpO1xuXHRcdFx0Y29uc29sZS5sb2coZSk7XG5cdFx0XHRkYXRhLmVycm9yID0gZS50b1N0cmluZygpO1xuXHRcdFx0c29ja2V0LmVtaXQoJ3Byb2plY3QtZGF0YScsIGRhdGEpO1xuXHRcdH0pO1xuLy9cdGNvbnNvbGUubG9nKCdkb25lJyk7XG4vL1x0Y29uc29sZS5kaXIoZGF0YSk7XG5cdC8vIGFmdGVyIGEgc3VjY2VzZnVsIG9wZXJhdGlvbiwgc2VuZCB0aGUgZGF0YSBiYWNrXG5cdHNvY2tldC5lbWl0KCdwcm9qZWN0LWRhdGEnLCBkYXRhKTtcblx0aWYgKGRhdGEuY3VycmVudFByb2plY3Qpe1xuXHRcdC8vIHNhdmUgdGhlIGN1cnJlbnQgcHJvamVjdCBpbiB0aGUgSURFIHNldHRpbmdzXG5cdFx0aWRlX3NldHRpbmdzLnNldF9zZXR0aW5nKCdwcm9qZWN0JywgZGF0YS5jdXJyZW50UHJvamVjdCk7XG5cdFx0Ly8gaWYgYSBmaWxlTGlzdCB3YXMgY3JlYXRlZCwgc2VuZCBpdCB0byBvdGhlciB0YWJzXG5cdFx0aWYgKGRhdGEuZmlsZUxpc3QpXG5cdFx0XHRzb2NrZXQuYnJvYWRjYXN0LmVtaXQoJ2ZpbGUtbGlzdCcsIGRhdGEuY3VycmVudFByb2plY3QsIGRhdGEuZmlsZUxpc3QpO1xuXHRcdC8vIGlmIGEgcHJvamVjdExpc3Qgd2FzIGNyZWF0ZWQsIHNlbmQgaXQgdG8gb3RoZXIgdGFic1xuXHRcdGlmIChkYXRhLnByb2plY3RMaXN0KVxuXHRcdFx0c29ja2V0LmJyb2FkY2FzdC5lbWl0KCdwcm9qZWN0LWxpc3QnLCBkYXRhLmN1cnJlbnRQcm9qZWN0LCBkYXRhLnByb2plY3RMaXN0KTtcblx0fVxufVxuIl19
