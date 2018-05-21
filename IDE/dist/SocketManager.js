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
    init_message(socket);
    TerminalManager.pwd();
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIlNvY2tldE1hbmFnZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDhCQUFnQztBQUVoQyw0QkFBOEI7QUFDOUIsa0RBQW9EO0FBQ3BELGtEQUFvRDtBQUNwRCwwQ0FBNEM7QUFDNUMsb0RBQXNEO0FBQ3RELDRDQUE4QztBQUM5QywwQ0FBNEM7QUFFNUMsSUFBSSxlQUFlLEdBQUcsT0FBTyxDQUFDLG1CQUFtQixDQUFDLENBQUM7QUFDbkQsZUFBZSxDQUFDLEVBQUUsQ0FBQyxhQUFhLEVBQUUsVUFBQyxHQUFRLEVBQUUsSUFBUyxJQUFLLE9BQUEsV0FBVyxDQUFDLElBQUksQ0FBQyxhQUFhLEVBQUUsR0FBRyxFQUFFLElBQUksQ0FBQyxFQUExQyxDQUEwQyxDQUFFLENBQUM7QUFFeEcsd0JBQXdCO0FBQ3hCLElBQUksV0FBK0IsQ0FBQztBQUVwQyxjQUFxQixNQUFtQjtJQUN2QyxXQUFXLEdBQUcsRUFBRSxDQUFDLE1BQU0sRUFBRTtRQUN4QixZQUFZLEVBQUUsSUFBSTtRQUNsQixXQUFXLEVBQUUsSUFBSTtLQUNqQixDQUFDLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ2QsV0FBVyxDQUFDLEVBQUUsQ0FBQyxZQUFZLEVBQUUsVUFBVSxDQUFDLENBQUM7QUFDMUMsQ0FBQztBQU5ELG9CQU1DO0FBRUQsbUJBQTBCLEtBQWEsRUFBRSxPQUFZO0lBQ3BELCtDQUErQztJQUMvQyxJQUFJLFdBQVc7UUFBRSxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxPQUFPLENBQUMsQ0FBQztBQUNuRCxDQUFDO0FBSEQsOEJBR0M7QUFFRCxvQkFBb0IsTUFBdUI7SUFDMUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxVQUFVLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQ3BDLE1BQU0sQ0FBQyxFQUFFLENBQUMsZUFBZSxFQUFFLFVBQUMsSUFBUyxJQUFLLE9BQUEsYUFBYSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsRUFBM0IsQ0FBMkIsQ0FBRSxDQUFDO0lBQ3hFLE1BQU0sQ0FBQyxFQUFFLENBQUMsa0JBQWtCLEVBQUUsVUFBQyxJQUFTLElBQUssT0FBQSxzQkFBc0IsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLEVBQXBDLENBQW9DLENBQUUsQ0FBQztJQUNwRixNQUFNLENBQUMsRUFBRSxDQUFDLGVBQWUsRUFBRSxVQUFDLElBQVMsSUFBSyxPQUFBLGFBQWEsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLEVBQTNCLENBQTJCLENBQUUsQ0FBQztJQUN4RSxNQUFNLENBQUMsRUFBRSxDQUFDLGNBQWMsRUFBRSxVQUFDLElBQVMsSUFBSyxPQUFBLGtCQUFrQixDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsRUFBaEMsQ0FBZ0MsQ0FBRSxDQUFDO0lBQzVFLE1BQU0sQ0FBQyxFQUFFLENBQUMsV0FBVyxFQUFFLFVBQUMsSUFBUyxJQUFLLE9BQUEsU0FBUyxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsRUFBdkIsQ0FBdUIsQ0FBRSxDQUFDO0lBQ2hFLE1BQU0sQ0FBQyxFQUFFLENBQUMsWUFBWSxFQUFFLFVBQUEsR0FBRyxJQUFJLE9BQUEsZUFBZSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsRUFBNUIsQ0FBNEIsQ0FBRSxDQUFDO0lBQzlELE1BQU0sQ0FBQyxFQUFFLENBQUMsUUFBUSxFQUFFLFVBQUEsR0FBRyxJQUFJLE9BQUEsZUFBZSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBeEIsQ0FBd0IsQ0FBRSxDQUFDO0lBQ3RELFlBQVksQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUNyQixlQUFlLENBQUMsR0FBRyxFQUFFLENBQUM7QUFDdkIsQ0FBQztBQUVELHNCQUE0QixNQUF1Qjs7Ozs7OztvQkFFdEMscUJBQU0sZUFBZSxDQUFDLFlBQVksRUFBRSxFQUFBOztvQkFBL0MsV0FBUSxHQUFHLFNBQW9DO29CQUNwQyxxQkFBTSxlQUFlLENBQUMsWUFBWSxFQUFFLEVBQUE7O29CQUEvQyxXQUFRLEdBQUcsU0FBb0M7b0JBQ3BDLHFCQUFNLFlBQVksQ0FBQyxJQUFJLEVBQUUsRUFBQTs7b0JBQXBDLFdBQVEsR0FBRyxTQUF5QjtvQkFDckIscUJBQU0sWUFBWSxDQUFDLGdCQUFnQixFQUFFLEVBQUE7O29CQUFwRCxlQUFZLEdBQUcsU0FBcUM7b0JBQ2xDLHFCQUFNLEdBQUcsQ0FBQyxtQkFBbUIsRUFBRTt3QkFDbkQsMENBQTBDO3NCQURTOztvQkFMOUMsT0FBTyxJQUtWLGtCQUFlLEdBQUcsU0FBK0I7MkJBRWpEO29CQUNELE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxDQUFDOzs7OztDQUM3QjtBQUVELDhFQUE4RTtBQUM5RSx1QkFBNkIsTUFBdUIsRUFBRSxJQUFTOzs7OztvQkFDL0QsZ0NBQWdDO29CQUNoQyxxQkFBcUI7b0JBQ3BCLHlDQUF5QztvQkFDekMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLGNBQWMsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLElBQUksQ0FBRSxlQUF1QixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRTt3QkFDckcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO3dCQUNqQyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxFQUFDLEtBQUssRUFBQyxJQUFJLEVBQUMsQ0FBQyxDQUFDO3dCQUNoQyxzQkFBTztxQkFDUDtvQkFDRCxrRkFBa0Y7b0JBQ2xGLHFCQUFPLGVBQXVCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQzs2QkFDN0MsS0FBSyxDQUFFLFVBQUMsQ0FBUTs0QkFDaEIsc0RBQXNEOzRCQUN0RCxnRUFBZ0U7NEJBQ2hFLE9BQU8sQ0FBQyxHQUFHLENBQUMsc0JBQXNCLENBQUMsQ0FBQzs0QkFDcEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQzs0QkFDZixJQUFJLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQzs0QkFDMUIsTUFBTSxDQUFDLElBQUksQ0FBQyxjQUFjLEVBQUUsSUFBSSxDQUFDLENBQUM7d0JBQ25DLENBQUMsQ0FBQyxFQUFBOztvQkFUSCxrRkFBa0Y7b0JBQ2xGLFNBUUcsQ0FBQztvQkFDTCxxQkFBcUI7b0JBQ3BCLGtEQUFrRDtvQkFDbEQsTUFBTSxDQUFDLElBQUksQ0FBQyxjQUFjLEVBQUUsSUFBSSxDQUFDLENBQUM7b0JBQ2xDLElBQUksSUFBSSxDQUFDLGNBQWMsRUFBQzt3QkFDdkIsK0NBQStDO3dCQUMvQyxZQUFZLENBQUMsYUFBYSxDQUFDLEVBQUMsR0FBRyxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLGNBQWMsRUFBQyxDQUFDLENBQUM7d0JBQ3pFLG1EQUFtRDt3QkFDbkQsSUFBSSxJQUFJLENBQUMsUUFBUTs0QkFDaEIsTUFBTSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxjQUFjLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO3dCQUN4RSxzREFBc0Q7d0JBQ3RELElBQUksSUFBSSxDQUFDLFdBQVc7NEJBQ25CLE1BQU0sQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLGNBQWMsRUFBRSxJQUFJLENBQUMsY0FBYyxFQUFFLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztxQkFDOUU7Ozs7O0NBQ0Q7QUFFRCxnQ0FBc0MsTUFBdUIsRUFBRSxJQUFTOzs7Ozs7b0JBQ3hFLGtDQUFrQztvQkFDbEMscUJBQXFCO29CQUNwQixJQUFJLENBQUMsSUFBSSxDQUFDLGNBQWMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLElBQUksQ0FBRSxnQkFBd0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUU7d0JBQ2hGLE9BQU8sQ0FBQyxHQUFHLENBQUMsc0JBQXNCLEVBQUUsSUFBSSxDQUFDLENBQUM7d0JBQzFDLHNCQUFPO3FCQUNQO29CQUNjLHFCQUFPLGdCQUF3QixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUM7NkJBQzdELEtBQUssQ0FBRSxVQUFDLENBQVE7NEJBQ2hCLE9BQU8sQ0FBQyxHQUFHLENBQUMsd0JBQXdCLENBQUMsQ0FBQzs0QkFDdEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQzs0QkFDZixNQUFNLENBQUMsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQzt3QkFDM0MsQ0FBQyxDQUFDLEVBQUE7O29CQUxDLFFBQVEsR0FBRyxTQUtaO29CQUNKLGtDQUFrQztvQkFDbEMseUJBQXlCO29CQUN4QixJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssVUFBVSxFQUFDO3dCQUM1QixNQUFNLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyx1QkFBdUIsRUFBRSxJQUFJLENBQUMsY0FBYyxFQUFFLFFBQVEsQ0FBQyxDQUFDO3FCQUM5RTt5QkFBTTt3QkFDTixXQUFXLENBQUMsSUFBSSxDQUFDLHVCQUF1QixFQUFFLElBQUksQ0FBQyxjQUFjLEVBQUUsUUFBUSxDQUFDLENBQUM7cUJBQ3pFOzs7OztDQUNEO0FBRUQsdUJBQTZCLE1BQXVCLEVBQUUsSUFBUzs7Ozs7b0JBQzlELElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsY0FBYyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssSUFBSSxDQUFFLGVBQXVCLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFDO3dCQUN6RixPQUFPLENBQUMsR0FBRyxDQUFDLG1CQUFtQixFQUFFLElBQUksQ0FBQyxDQUFDO3dCQUN2QyxzQkFBTztxQkFDUDtvQkFDRCxxQkFBTyxlQUF1QixDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBQTs7b0JBQWhELFNBQWdELENBQUM7Ozs7O0NBQ2pEO0FBRUQsNEJBQWtDLE1BQXVCLEVBQUUsSUFBUzs7Ozs7O29CQUNuRSxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksSUFBSSxDQUFFLFlBQW9CLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFDO3dCQUM1RCxPQUFPLENBQUMsR0FBRyxDQUFDLHdCQUF3QixFQUFFLElBQUksQ0FBQyxDQUFDO3dCQUM1QyxzQkFBTztxQkFDUDtvQkFDWSxxQkFBTyxZQUFvQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUM7NkJBQ3ZELEtBQUssQ0FBRSxVQUFDLENBQVEsSUFBSyxPQUFBLE9BQU8sQ0FBQyxHQUFHLENBQUMsb0JBQW9CLEVBQUUsQ0FBQyxDQUFDLEVBQXBDLENBQW9DLENBQUUsRUFBQTs7b0JBRHpELE1BQU0sR0FBRyxTQUNnRDtvQkFDN0QsU0FBUyxDQUFDLG1CQUFtQixFQUFFLE1BQU0sQ0FBQyxDQUFDOzs7OztDQUN2QztBQUVELG1CQUF5QixNQUF1QixFQUFFLElBQVM7Ozs7OztvQkFDMUQsSUFBSSxDQUFDLElBQUksQ0FBQyxjQUFjLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUUsV0FBbUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUU7d0JBQzNFLE9BQU8sQ0FBQyxHQUFHLENBQUMsZUFBZSxFQUFFLElBQUksQ0FBQyxDQUFDO3dCQUNuQyxzQkFBTztxQkFDUDs7OztvQkFFQSxxQkFBTyxXQUFtQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBQTs7b0JBQTNDLFNBQTJDLENBQUM7b0JBQ3hDLEtBQUssR0FBUTt3QkFDaEIsY0FBYyxFQUFFLElBQUksQ0FBQyxjQUFjO3dCQUNuQyxTQUFTLEVBQUUsSUFBSSxDQUFDLFNBQVM7d0JBQ3pCLE9BQU8sRUFBRSxJQUFJO3FCQUNiLENBQUM7b0JBQ0YscUJBQU0sZUFBZSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsRUFBQTs7b0JBQXhDLFNBQXdDLENBQUM7b0JBQ3pDLE1BQU0sQ0FBQyxJQUFJLENBQUMsY0FBYyxFQUFFLEtBQUssQ0FBQyxDQUFDO29CQUNuQyxJQUFJLEtBQUssQ0FBQyxjQUFjLEVBQUM7d0JBQ3hCLElBQUksS0FBSyxDQUFDLFdBQVcsRUFBQzs0QkFDckIsTUFBTSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsY0FBYyxFQUFFLEtBQUssQ0FBQyxjQUFjLEVBQUUsS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFDO3lCQUMvRTt3QkFDRCxJQUFJLEtBQUssQ0FBQyxRQUFRLEVBQUM7NEJBQ2xCLE1BQU0sQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxLQUFLLENBQUMsY0FBYyxFQUFFLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQzt5QkFDekU7d0JBQ0QsWUFBWSxDQUFDLGFBQWEsQ0FBQyxFQUFDLEdBQUcsRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQyxjQUFjLEVBQUMsQ0FBQyxDQUFDO3FCQUMxRTs7OztvQkFHRCxPQUFPLENBQUMsR0FBRyxDQUFDLGlCQUFpQixFQUFFLEdBQUMsQ0FBQyxDQUFDO29CQUNsQyxJQUFJLENBQUMsS0FBSyxHQUFHLEdBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQztvQkFDMUIsTUFBTSxDQUFDLElBQUksQ0FBQyxjQUFjLEVBQUUsRUFBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxJQUFJLENBQUMsU0FBUyxFQUFDLENBQUMsQ0FBQztvQkFDeEUsTUFBTSxDQUFDLElBQUksQ0FBQyxjQUFjLEVBQUUsR0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7Ozs7OztDQUUzQyIsImZpbGUiOiJTb2NrZXRNYW5hZ2VyLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgaW8gZnJvbSAnc29ja2V0LmlvJztcbmltcG9ydCAqIGFzIGh0dHAgZnJvbSAnaHR0cCc7XG5pbXBvcnQgKiBhcyBJREUgZnJvbSAnLi9tYWluJztcbmltcG9ydCAqIGFzIHByb2plY3RfbWFuYWdlciBmcm9tICcuL1Byb2plY3RNYW5hZ2VyJztcbmltcG9ydCAqIGFzIHByb2Nlc3NfbWFuYWdlciBmcm9tICcuL1Byb2Nlc3NNYW5hZ2VyJztcbmltcG9ydCAqIGFzIGdpdF9tYW5hZ2VyIGZyb20gJy4vR2l0TWFuYWdlcic7XG5pbXBvcnQgKiBhcyBwcm9qZWN0X3NldHRpbmdzIGZyb20gJy4vUHJvamVjdFNldHRpbmdzJztcbmltcG9ydCAqIGFzIGlkZV9zZXR0aW5ncyBmcm9tICcuL0lERVNldHRpbmdzJztcbmltcG9ydCAqIGFzIGJvb3RfcHJvamVjdCBmcm9tICcuL1J1bk9uQm9vdCc7XG5pbXBvcnQgKiBhcyB1dGlsIGZyb20gJy4vdXRpbHMnO1xudmFyIFRlcm1pbmFsTWFuYWdlciA9IHJlcXVpcmUoJy4vVGVybWluYWxNYW5hZ2VyJyk7XG5UZXJtaW5hbE1hbmFnZXIub24oJ3NoZWxsLWV2ZW50JywgKGV2dDogYW55LCBkYXRhOiBhbnkpID0+IGlkZV9zb2NrZXRzLmVtaXQoJ3NoZWxsLWV2ZW50JywgZXZ0LCBkYXRhKSApO1xuXG4vLyBhbGwgY29ubmVjdGVkIHNvY2tldHNcbmxldCBpZGVfc29ja2V0czogU29ja2V0SU8uTmFtZXNwYWNlO1xuXG5leHBvcnQgZnVuY3Rpb24gaW5pdChzZXJ2ZXI6IGh0dHAuU2VydmVyKXtcblx0aWRlX3NvY2tldHMgPSBpbyhzZXJ2ZXIsIHtcblx0XHRwaW5nSW50ZXJ2YWw6IDMwMDAsXG5cdFx0cGluZ1RpbWVvdXQ6IDY1MDBcblx0fSkub2YoJy9JREUnKTtcblx0aWRlX3NvY2tldHMub24oJ2Nvbm5lY3Rpb24nLCBjb25uZWN0aW9uKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGJyb2FkY2FzdChldmVudDogc3RyaW5nLCBtZXNzYWdlOiBhbnkpe1xuXHQvLyBjb25zb2xlLmxvZygnYnJvYWRjYXN0aW5nJywgZXZlbnQsIG1lc3NhZ2UpO1xuXHRpZiAoaWRlX3NvY2tldHMpIGlkZV9zb2NrZXRzLmVtaXQoZXZlbnQsIG1lc3NhZ2UpO1xufVxuXG5mdW5jdGlvbiBjb25uZWN0aW9uKHNvY2tldDogU29ja2V0SU8uU29ja2V0KXtcblx0c29ja2V0Lm9uKCdzZXQtdGltZScsIElERS5zZXRfdGltZSk7XG5cdHNvY2tldC5vbigncHJvamVjdC1ldmVudCcsIChkYXRhOiBhbnkpID0+IHByb2plY3RfZXZlbnQoc29ja2V0LCBkYXRhKSApO1xuXHRzb2NrZXQub24oJ3Byb2plY3Qtc2V0dGluZ3MnLCAoZGF0YTogYW55KSA9PiBwcm9qZWN0X3NldHRpbmdzX2V2ZW50KHNvY2tldCwgZGF0YSkgKTtcblx0c29ja2V0Lm9uKCdwcm9jZXNzLWV2ZW50JywgKGRhdGE6IGFueSkgPT4gcHJvY2Vzc19ldmVudChzb2NrZXQsIGRhdGEpICk7XG5cdHNvY2tldC5vbignSURFLXNldHRpbmdzJywgKGRhdGE6IGFueSkgPT4gaWRlX3NldHRpbmdzX2V2ZW50KHNvY2tldCwgZGF0YSkgKTtcblx0c29ja2V0Lm9uKCdnaXQtZXZlbnQnLCAoZGF0YTogYW55KSA9PiBnaXRfZXZlbnQoc29ja2V0LCBkYXRhKSApO1xuXHRzb2NrZXQub24oJ3NoLWNvbW1hbmQnLCBjbWQgPT4gVGVybWluYWxNYW5hZ2VyLmV4ZWN1dGUoY21kKSApO1xuXHRzb2NrZXQub24oJ3NoLXRhYicsIGNtZCA9PiBUZXJtaW5hbE1hbmFnZXIudGFiKGNtZCkgKTtcblx0aW5pdF9tZXNzYWdlKHNvY2tldCk7XG5cdFRlcm1pbmFsTWFuYWdlci5wd2QoKTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gaW5pdF9tZXNzYWdlKHNvY2tldDogU29ja2V0SU8uU29ja2V0KXtcblx0bGV0IG1lc3NhZ2U6IHV0aWwuSW5pdF9NZXNzYWdlID0ge1xuXHRcdHByb2plY3RzIDogYXdhaXQgcHJvamVjdF9tYW5hZ2VyLmxpc3RQcm9qZWN0cygpLFxuXHRcdGV4YW1wbGVzIDogYXdhaXQgcHJvamVjdF9tYW5hZ2VyLmxpc3RFeGFtcGxlcygpLFxuXHRcdHNldHRpbmdzIDogYXdhaXQgaWRlX3NldHRpbmdzLnJlYWQoKSxcblx0XHRib290X3Byb2plY3QgOiBhd2FpdCBib290X3Byb2plY3QuZ2V0X2Jvb3RfcHJvamVjdCgpLFxuXHRcdHhlbm9tYWlfdmVyc2lvbiA6IGF3YWl0IElERS5nZXRfeGVub21haV92ZXJzaW9uKClcbi8vXHRzdGF0dXMgOiBhd2FpdCBwcm9jZXNzX21hbmFnZXIuc3RhdHVzKClcblx0fTtcblx0c29ja2V0LmVtaXQoJ2luaXQnLCBtZXNzYWdlKTtcbn1cblxuLy8gUHJvY2VzcyBhbGwgd2Vic29ja2V0IGV2ZW50cyB3aGljaCBuZWVkIHRvIGJlIGhhbmRsZWQgYnkgdGhlIFByb2plY3RNYW5hZ2VyXG5hc3luYyBmdW5jdGlvbiBwcm9qZWN0X2V2ZW50KHNvY2tldDogU29ja2V0SU8uU29ja2V0LCBkYXRhOiBhbnkpe1xuLy9cdGNvbnNvbGUubG9nKCdwcm9qZWN0LWV2ZW50Jyk7XG4vL1x0Y29uc29sZS5kaXIoZGF0YSk7XG5cdC8vIHJlamVjdCBhbnkgbWFsZm9ybWVkIHdlYnNvY2tldCBtZXNzYWdlXG5cdGlmICgoIWRhdGEuY3VycmVudFByb2plY3QgJiYgIWRhdGEubmV3UHJvamVjdCkgfHwgIWRhdGEuZnVuYyB8fCAhKHByb2plY3RfbWFuYWdlciBhcyBhbnkpW2RhdGEuZnVuY10pIHtcblx0XHRjb25zb2xlLmxvZygnYmFkIHByb2plY3QtZXZlbnQnKTtcblx0XHRjb25zb2xlLmRpcihkYXRhLCB7ZGVwdGg6bnVsbH0pO1xuXHRcdHJldHVybjtcblx0fVxuXHQvLyBjYWxsIHRoZSBwcm9qZWN0X21hbmFnZXIgZnVuY3Rpb24gc3BlY2lmaWVkIGluIHRoZSBmdW5jIGZpZWxkIG9mIHRoZSB3cyBtZXNzYWdlXG5cdGF3YWl0IChwcm9qZWN0X21hbmFnZXIgYXMgYW55KVtkYXRhLmZ1bmNdKGRhdGEpXG5cdFx0LmNhdGNoKCAoZTogRXJyb3IpID0+IHtcblx0XHRcdC8vIGluIHRoZSBldmVudCBvZiBhbiBlcnJvciwgbG9nIGl0IHRvIHRoZSBJREUgY29uc29sZVxuXHRcdFx0Ly8gYW5kIHNlbmQgYSBzdHJpbmcgYmFjayB0byB0aGUgYnJvd3NlciBmb3IgZGlzcGxheSB0byB0aGUgdXNlclxuXHRcdFx0Y29uc29sZS5sb2coJ3Byb2plY3QtZXZlbnQgZXJyb3I6Jyk7XG5cdFx0XHRjb25zb2xlLmxvZyhlKTtcblx0XHRcdGRhdGEuZXJyb3IgPSBlLnRvU3RyaW5nKCk7XG5cdFx0XHRzb2NrZXQuZW1pdCgncHJvamVjdC1kYXRhJywgZGF0YSk7XG5cdFx0fSk7XG4vL1x0Y29uc29sZS5kaXIoZGF0YSk7XG5cdC8vIGFmdGVyIGEgc3VjY2VzZnVsIG9wZXJhdGlvbiwgc2VuZCB0aGUgZGF0YSBiYWNrXG5cdHNvY2tldC5lbWl0KCdwcm9qZWN0LWRhdGEnLCBkYXRhKTtcblx0aWYgKGRhdGEuY3VycmVudFByb2plY3Qpe1xuXHRcdC8vIHNhdmUgdGhlIGN1cnJlbnQgcHJvamVjdCBpbiB0aGUgSURFIHNldHRpbmdzXG5cdFx0aWRlX3NldHRpbmdzLnNldElERVNldHRpbmcoe2tleTogJ3Byb2plY3QnLCB2YWx1ZTogZGF0YS5jdXJyZW50UHJvamVjdH0pO1xuXHRcdC8vIGlmIGEgZmlsZUxpc3Qgd2FzIGNyZWF0ZWQsIHNlbmQgaXQgdG8gb3RoZXIgdGFic1xuXHRcdGlmIChkYXRhLmZpbGVMaXN0KVxuXHRcdFx0c29ja2V0LmJyb2FkY2FzdC5lbWl0KCdmaWxlLWxpc3QnLCBkYXRhLmN1cnJlbnRQcm9qZWN0LCBkYXRhLmZpbGVMaXN0KTtcblx0XHQvLyBpZiBhIHByb2plY3RMaXN0IHdhcyBjcmVhdGVkLCBzZW5kIGl0IHRvIG90aGVyIHRhYnNcblx0XHRpZiAoZGF0YS5wcm9qZWN0TGlzdClcblx0XHRcdHNvY2tldC5icm9hZGNhc3QuZW1pdCgncHJvamVjdC1saXN0JywgZGF0YS5jdXJyZW50UHJvamVjdCwgZGF0YS5wcm9qZWN0TGlzdCk7XG5cdH1cbn1cblxuYXN5bmMgZnVuY3Rpb24gcHJvamVjdF9zZXR0aW5nc19ldmVudChzb2NrZXQ6IFNvY2tldElPLlNvY2tldCwgZGF0YTogYW55KXtcbi8vXHRjb25zb2xlLmxvZygncHJvamVjdF9zZXR0aW5ncycpXG4vL1x0Y29uc29sZS5kaXIoZGF0YSk7XG5cdGlmICghZGF0YS5jdXJyZW50UHJvamVjdCB8fCAhZGF0YS5mdW5jIHx8ICEocHJvamVjdF9zZXR0aW5ncyBhcyBhbnkpW2RhdGEuZnVuY10pIHtcblx0XHRjb25zb2xlLmxvZygnYmFkIHByb2plY3Qtc2V0dGluZ3MnLCBkYXRhKTtcblx0XHRyZXR1cm47XG5cdH1cblx0bGV0IHNldHRpbmdzID0gYXdhaXQgKHByb2plY3Rfc2V0dGluZ3MgYXMgYW55KVtkYXRhLmZ1bmNdKGRhdGEpXG5cdFx0LmNhdGNoKCAoZTogRXJyb3IpID0+IHtcblx0XHRcdGNvbnNvbGUubG9nKCdwcm9qZWN0LXNldHRpbmdzIGVycm9yJyk7XG5cdFx0XHRjb25zb2xlLmxvZyhlKTtcblx0XHRcdHNvY2tldC5lbWl0KCdyZXBvcnQtZXJyb3InLCBlLnRvU3RyaW5nKCkpO1xuXHRcdH0pO1xuLy9cdGNvbnNvbGUubG9nKCdwcm9qZWN0X3NldHRpbmdzJylcbi8vXHRjb25zb2xlLmRpcihzZXR0aW5ncyk7XG5cdGlmIChkYXRhLmZ1bmMgPT09ICdzZXRDTEFyZycpe1xuXHRcdHNvY2tldC5icm9hZGNhc3QuZW1pdCgncHJvamVjdC1zZXR0aW5ncy1kYXRhJywgZGF0YS5jdXJyZW50UHJvamVjdCwgc2V0dGluZ3MpO1xuXHR9IGVsc2Uge1xuXHRcdGlkZV9zb2NrZXRzLmVtaXQoJ3Byb2plY3Qtc2V0dGluZ3MtZGF0YScsIGRhdGEuY3VycmVudFByb2plY3QsIHNldHRpbmdzKTtcblx0fVxufVxuXG5hc3luYyBmdW5jdGlvbiBwcm9jZXNzX2V2ZW50KHNvY2tldDogU29ja2V0SU8uU29ja2V0LCBkYXRhOiBhbnkpe1xuXHRpZiAoIWRhdGEgfHwgIWRhdGEuY3VycmVudFByb2plY3QgfHwgIWRhdGEuZXZlbnQgfHwgIShwcm9jZXNzX21hbmFnZXIgYXMgYW55KVtkYXRhLmV2ZW50XSl7XG5cdFx0Y29uc29sZS5sb2coJ2JhZCBwcm9jZXNzLWV2ZW50JywgZGF0YSk7XG5cdFx0cmV0dXJuO1xuXHR9XG5cdGF3YWl0IChwcm9jZXNzX21hbmFnZXIgYXMgYW55KVtkYXRhLmV2ZW50XShkYXRhKTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gaWRlX3NldHRpbmdzX2V2ZW50KHNvY2tldDogU29ja2V0SU8uU29ja2V0LCBkYXRhOiBhbnkpe1xuXHRpZiAoIWRhdGEgfHwgIWRhdGEuZnVuYyB8fCAhKGlkZV9zZXR0aW5ncyBhcyBhbnkpW2RhdGEuZnVuY10pe1xuXHRcdGNvbnNvbGUubG9nKCdiYWQgaWRlX3NldHRpbmdzIGV2ZW50JywgZGF0YSk7XG5cdFx0cmV0dXJuO1xuXHR9XG5cdGxldCByZXN1bHQgPSBhd2FpdCAoaWRlX3NldHRpbmdzIGFzIGFueSlbZGF0YS5mdW5jXShkYXRhKVxuXHRcdC5jYXRjaCggKGU6IEVycm9yKSA9PiBjb25zb2xlLmxvZygnaWRlX3NldHRpbmdzIGVycm9yJywgZSkgKTtcblx0YnJvYWRjYXN0KCdJREUtc2V0dGluZ3MtZGF0YScsIHJlc3VsdCk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGdpdF9ldmVudChzb2NrZXQ6IFNvY2tldElPLlNvY2tldCwgZGF0YTogYW55KXtcblx0aWYgKCFkYXRhLmN1cnJlbnRQcm9qZWN0IHx8ICFkYXRhLmZ1bmMgfHwgIShnaXRfbWFuYWdlciBhcyBhbnkpW2RhdGEuZnVuY10pIHtcblx0XHRjb25zb2xlLmxvZygnYmFkIGdpdC1ldmVudCcsIGRhdGEpO1xuXHRcdHJldHVybjtcblx0fVxuXHR0cnl7XG5cdFx0YXdhaXQgKGdpdF9tYW5hZ2VyIGFzIGFueSlbZGF0YS5mdW5jXShkYXRhKTtcblx0XHRsZXQgZGF0YTI6IGFueSA9IHtcblx0XHRcdGN1cnJlbnRQcm9qZWN0OiBkYXRhLmN1cnJlbnRQcm9qZWN0LFxuXHRcdFx0dGltZXN0YW1wOlx0ZGF0YS50aW1lc3RhbXAsXG5cdFx0XHRnaXREYXRhOlx0ZGF0YVxuXHRcdH07XG5cdFx0YXdhaXQgcHJvamVjdF9tYW5hZ2VyLm9wZW5Qcm9qZWN0KGRhdGEyKTtcblx0XHRzb2NrZXQuZW1pdCgncHJvamVjdC1kYXRhJywgZGF0YTIpO1xuXHRcdGlmIChkYXRhMi5jdXJyZW50UHJvamVjdCl7XG5cdFx0XHRpZiAoZGF0YTIucHJvamVjdExpc3Qpe1xuXHRcdFx0XHRzb2NrZXQuYnJvYWRjYXN0LmVtaXQoJ3Byb2plY3QtbGlzdCcsIGRhdGEyLmN1cnJlbnRQcm9qZWN0LCBkYXRhMi5wcm9qZWN0TGlzdCk7XG5cdFx0XHR9XG5cdFx0XHRpZiAoZGF0YTIuZmlsZUxpc3Qpe1xuXHRcdFx0XHRzb2NrZXQuYnJvYWRjYXN0LmVtaXQoJ2ZpbGUtbGlzdCcsIGRhdGEyLmN1cnJlbnRQcm9qZWN0LCBkYXRhMi5maWxlTGlzdCk7XG5cdFx0XHR9XG5cdFx0XHRpZGVfc2V0dGluZ3Muc2V0SURFU2V0dGluZyh7a2V5OiAncHJvamVjdCcsIHZhbHVlOiBkYXRhMi5jdXJyZW50UHJvamVjdH0pO1xuXHRcdH1cblx0fVxuXHRjYXRjaChlKXtcblx0XHRjb25zb2xlLmxvZygnZ2l0LWV2ZW50IGVycm9yJywgZSk7XG5cdFx0ZGF0YS5lcnJvciA9IGUudG9TdHJpbmcoKTtcblx0XHRzb2NrZXQuZW1pdCgncHJvamVjdC1kYXRhJywge2dpdERhdGE6IGRhdGEsIHRpbWVzdGFtcDogZGF0YS50aW1lc3RhbXB9KTtcblx0XHRzb2NrZXQuZW1pdCgncmVwb3J0LWVycm9yJywgZS50b1N0cmluZygpKTtcblx0fVxufVxuIl19
