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
    ide_sockets = io(server).of('/IDE');
    ide_sockets.on('connection', connection);
}
exports.init = init;
function connection(socket) {
    init_message(socket);
    socket.on('set-time', IDE.set_time);
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIlNvY2tldE1hbmFnZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDhCQUFnQztBQUVoQyw0QkFBOEI7QUFDOUIsa0RBQW9EO0FBQ3BELDRDQUE4QztBQUM5QywwQ0FBNEM7QUFHNUMsd0JBQXdCO0FBQ3hCLElBQUksV0FBK0IsQ0FBQztBQUVwQyxjQUFxQixNQUFtQjtJQUN2QyxXQUFXLEdBQUcsRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUNwQyxXQUFXLENBQUMsRUFBRSxDQUFDLFlBQVksRUFBRSxVQUFVLENBQUMsQ0FBQztBQUMxQyxDQUFDO0FBSEQsb0JBR0M7QUFFRCxvQkFBb0IsTUFBdUI7SUFDMUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ3JCLE1BQU0sQ0FBQyxFQUFFLENBQUMsVUFBVSxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUNyQyxDQUFDO0FBRUQsc0JBQTRCLE1BQXVCOzs7Ozs7b0JBQ2xELE9BQU8sQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUM7O29CQUVoQixxQkFBTSxlQUFlLENBQUMsWUFBWSxFQUFFLEVBQUE7O29CQUEvQyxXQUFRLEdBQUcsU0FBb0M7b0JBQ3BDLHFCQUFNLGVBQWUsQ0FBQyxZQUFZLEVBQUUsRUFBQTs7b0JBQS9DLFdBQVEsR0FBRyxTQUFvQztvQkFDcEMscUJBQU0sWUFBWSxDQUFDLElBQUksRUFBRSxFQUFBOztvQkFBcEMsV0FBUSxHQUFHLFNBQXlCO29CQUNyQixxQkFBTSxZQUFZLENBQUMsZ0JBQWdCLEVBQUUsRUFBQTs7b0JBQXBELGVBQVksR0FBRyxTQUFxQztvQkFDbEMscUJBQU0sR0FBRyxDQUFDLG1CQUFtQixFQUFFO3dCQUNuRCwwQ0FBMEM7c0JBRFM7O29CQUw5QyxPQUFPLElBS1Ysa0JBQWUsR0FBRyxTQUErQjsyQkFFakQ7b0JBQ0QsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQztvQkFDckIsc0NBQXNDO29CQUNyQyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxPQUFPLENBQUMsQ0FBQzs7Ozs7Q0FDN0IiLCJmaWxlIjoiU29ja2V0TWFuYWdlci5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGlvIGZyb20gJ3NvY2tldC5pbyc7XG5pbXBvcnQgKiBhcyBodHRwIGZyb20gJ2h0dHAnO1xuaW1wb3J0ICogYXMgSURFIGZyb20gJy4vbWFpbic7XG5pbXBvcnQgKiBhcyBwcm9qZWN0X21hbmFnZXIgZnJvbSAnLi9Qcm9qZWN0TWFuYWdlcic7XG5pbXBvcnQgKiBhcyBpZGVfc2V0dGluZ3MgZnJvbSAnLi9JREVTZXR0aW5ncyc7XG5pbXBvcnQgKiBhcyBib290X3Byb2plY3QgZnJvbSAnLi9SdW5PbkJvb3QnO1xuaW1wb3J0ICogYXMgdXRpbCBmcm9tICcuL3V0aWxzJztcblxuLy8gYWxsIGNvbm5lY3RlZCBzb2NrZXRzXG5sZXQgaWRlX3NvY2tldHM6IFNvY2tldElPLk5hbWVzcGFjZTtcblxuZXhwb3J0IGZ1bmN0aW9uIGluaXQoc2VydmVyOiBodHRwLlNlcnZlcil7XG5cdGlkZV9zb2NrZXRzID0gaW8oc2VydmVyKS5vZignL0lERScpO1xuXHRpZGVfc29ja2V0cy5vbignY29ubmVjdGlvbicsIGNvbm5lY3Rpb24pO1xufVxuXG5mdW5jdGlvbiBjb25uZWN0aW9uKHNvY2tldDogU29ja2V0SU8uU29ja2V0KXtcblx0aW5pdF9tZXNzYWdlKHNvY2tldCk7XG5cdHNvY2tldC5vbignc2V0LXRpbWUnLCBJREUuc2V0X3RpbWUpO1xufVxuXG5hc3luYyBmdW5jdGlvbiBpbml0X21lc3NhZ2Uoc29ja2V0OiBTb2NrZXRJTy5Tb2NrZXQpe1xuXHRjb25zb2xlLmxvZygnY29uc3RydWN0aW5nJyk7XG5cdGxldCBtZXNzYWdlOiB1dGlsLkluaXRfTWVzc2FnZSA9IHtcblx0XHRwcm9qZWN0cyA6IGF3YWl0IHByb2plY3RfbWFuYWdlci5saXN0UHJvamVjdHMoKSxcblx0XHRleGFtcGxlcyA6IGF3YWl0IHByb2plY3RfbWFuYWdlci5saXN0RXhhbXBsZXMoKSxcblx0XHRzZXR0aW5ncyA6IGF3YWl0IGlkZV9zZXR0aW5ncy5yZWFkKCksXG5cdFx0Ym9vdF9wcm9qZWN0IDogYXdhaXQgYm9vdF9wcm9qZWN0LmdldF9ib290X3Byb2plY3QoKSxcblx0XHR4ZW5vbWFpX3ZlcnNpb24gOiBhd2FpdCBJREUuZ2V0X3hlbm9tYWlfdmVyc2lvbigpXG4vL1x0c3RhdHVzIDogYXdhaXQgcHJvY2Vzc19tYW5hZ2VyLnN0YXR1cygpXG5cdH07XG5cdGNvbnNvbGUubG9nKCdkb25lJyk7XG4vL1x0Y29uc29sZS5kaXIobWVzc2FnZSwge2RlcHRoOm51bGx9KTtcblx0c29ja2V0LmVtaXQoJ2luaXQnLCBtZXNzYWdlKTtcbn1cbiJdfQ==
