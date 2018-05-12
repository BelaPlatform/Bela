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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIlNvY2tldE1hbmFnZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDhCQUFnQztBQUVoQyw0QkFBOEI7QUFDOUIsa0RBQW9EO0FBQ3BELDRDQUE4QztBQUM5QywwQ0FBNEM7QUFHNUMsd0JBQXdCO0FBQ3hCLElBQUksV0FBK0IsQ0FBQztBQUVwQyxjQUFxQixNQUFtQjtJQUN2QyxXQUFXLEdBQUcsRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUNwQyxXQUFXLENBQUMsRUFBRSxDQUFDLFlBQVksRUFBRSxVQUFVLENBQUMsQ0FBQztBQUMxQyxDQUFDO0FBSEQsb0JBR0M7QUFFRCxvQkFBb0IsTUFBdUI7SUFDMUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQ3RCLENBQUM7QUFFRCxzQkFBNEIsTUFBdUI7Ozs7OztvQkFDbEQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQzs7b0JBRWhCLHFCQUFNLGVBQWUsQ0FBQyxZQUFZLEVBQUUsRUFBQTs7b0JBQS9DLFdBQVEsR0FBRyxTQUFvQztvQkFDcEMscUJBQU0sZUFBZSxDQUFDLFlBQVksRUFBRSxFQUFBOztvQkFBL0MsV0FBUSxHQUFHLFNBQW9DO29CQUNwQyxxQkFBTSxZQUFZLENBQUMsSUFBSSxFQUFFLEVBQUE7O29CQUFwQyxXQUFRLEdBQUcsU0FBeUI7b0JBQ3JCLHFCQUFNLFlBQVksQ0FBQyxnQkFBZ0IsRUFBRSxFQUFBOztvQkFBcEQsZUFBWSxHQUFHLFNBQXFDO29CQUNsQyxxQkFBTSxHQUFHLENBQUMsbUJBQW1CLEVBQUU7d0JBQ25ELDBDQUEwQztzQkFEUzs7b0JBTDlDLE9BQU8sSUFLVixrQkFBZSxHQUFHLFNBQStCOzJCQUVqRDtvQkFDRCxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDO29CQUNyQixzQ0FBc0M7b0JBQ3JDLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxDQUFDOzs7OztDQUM3QiIsImZpbGUiOiJTb2NrZXRNYW5hZ2VyLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgaW8gZnJvbSAnc29ja2V0LmlvJztcbmltcG9ydCAqIGFzIGh0dHAgZnJvbSAnaHR0cCc7XG5pbXBvcnQgKiBhcyBJREUgZnJvbSAnLi9tYWluJztcbmltcG9ydCAqIGFzIHByb2plY3RfbWFuYWdlciBmcm9tICcuL1Byb2plY3RNYW5hZ2VyJztcbmltcG9ydCAqIGFzIGlkZV9zZXR0aW5ncyBmcm9tICcuL0lERVNldHRpbmdzJztcbmltcG9ydCAqIGFzIGJvb3RfcHJvamVjdCBmcm9tICcuL1J1bk9uQm9vdCc7XG5pbXBvcnQgKiBhcyB1dGlsIGZyb20gJy4vdXRpbHMnO1xuXG4vLyBhbGwgY29ubmVjdGVkIHNvY2tldHNcbmxldCBpZGVfc29ja2V0czogU29ja2V0SU8uTmFtZXNwYWNlO1xuXG5leHBvcnQgZnVuY3Rpb24gaW5pdChzZXJ2ZXI6IGh0dHAuU2VydmVyKXtcblx0aWRlX3NvY2tldHMgPSBpbyhzZXJ2ZXIpLm9mKCcvSURFJyk7XG5cdGlkZV9zb2NrZXRzLm9uKCdjb25uZWN0aW9uJywgY29ubmVjdGlvbik7XG59XG5cbmZ1bmN0aW9uIGNvbm5lY3Rpb24oc29ja2V0OiBTb2NrZXRJTy5Tb2NrZXQpe1xuXHRpbml0X21lc3NhZ2Uoc29ja2V0KTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gaW5pdF9tZXNzYWdlKHNvY2tldDogU29ja2V0SU8uU29ja2V0KXtcblx0Y29uc29sZS5sb2coJ2NvbnN0cnVjdGluZycpO1xuXHRsZXQgbWVzc2FnZTogdXRpbC5Jbml0X01lc3NhZ2UgPSB7XG5cdFx0cHJvamVjdHMgOiBhd2FpdCBwcm9qZWN0X21hbmFnZXIubGlzdFByb2plY3RzKCksXG5cdFx0ZXhhbXBsZXMgOiBhd2FpdCBwcm9qZWN0X21hbmFnZXIubGlzdEV4YW1wbGVzKCksXG5cdFx0c2V0dGluZ3MgOiBhd2FpdCBpZGVfc2V0dGluZ3MucmVhZCgpLFxuXHRcdGJvb3RfcHJvamVjdCA6IGF3YWl0IGJvb3RfcHJvamVjdC5nZXRfYm9vdF9wcm9qZWN0KCksXG5cdFx0eGVub21haV92ZXJzaW9uIDogYXdhaXQgSURFLmdldF94ZW5vbWFpX3ZlcnNpb24oKVxuLy9cdHN0YXR1cyA6IGF3YWl0IHByb2Nlc3NfbWFuYWdlci5zdGF0dXMoKVxuXHR9O1xuXHRjb25zb2xlLmxvZygnZG9uZScpO1xuLy9cdGNvbnNvbGUuZGlyKG1lc3NhZ2UsIHtkZXB0aDpudWxsfSk7XG5cdHNvY2tldC5lbWl0KCdpbml0JywgbWVzc2FnZSk7XG59XG4iXX0=
