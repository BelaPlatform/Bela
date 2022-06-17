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
var fs = require("fs-extra-promise");
var paths = require("./paths");
var socket_manager = require("./SocketManager");
var file_manager = require("./FileManager");
var archiver = require("archiver");
var mime = require("mime");
function download(req, res) {
    if (req.query.all) {
        download_all(res);
    }
    else if (req.query.project && req.query.file) {
        download_file(req, res);
    }
    else if (req.query.project) {
        download_project(req, res);
    }
}
exports.download = download;
// zip the entire projects directory and send back
function download_all(res) {
    send_zip(paths.projects, 'projects', res);
}
// zip a single project directory and send back
function download_project(req, res) {
    var path = paths.projects + req.query.project;
    send_zip(path, req.query.project, res, [
        "build",
        req.query.project,
    ]);
}
function send_zip(path, name, res, ignore) {
    res.setHeader('Content-disposition', 'attachment; filename=' + name + '.zip');
    res.setHeader('Content-type', 'application/zip');
    var archive = archiver('zip');
    archive.on('error', function (e) {
        socket_manager.broadcast('report-error', e);
        res.end();
    });
    archive.pipe(res);
    if (ignore)
        archive.glob("**/*", { ignore: ignore, cwd: path });
    else
        archive.directory(path, name, { name: name + '.zip' });
    archive.finalize();
}
function upload_file(req, res) {
    var file = req.query.file;
    fs.createWriteStream(paths.uploads + file);
}
//WARNING: this upload route is unused
function upload(req, res) {
    if (req.query.all) {
        console.log(res);
        upload_file(req, res);
    }
}
exports.upload = upload;
function download_file(req, res) {
    return __awaiter(this, void 0, void 0, function () {
        var file, fileName, is_a_folder;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    file = paths.projects + req.query.project + '/' + req.query.file;
                    fileName = req.query.file.split('/').pop();
                    res.setHeader('Content-disposition', 'attachment; filename=' + fileName);
                    res.setHeader('Content-type', mime.getType(file));
                    return [4 /*yield*/, file_manager.directory_exists(file)];
                case 1:
                    is_a_folder = _a.sent();
                    if (is_a_folder) // the client will error (not ideal), but the server will be fine
                        return [2 /*return*/, res.status(403).end("Requested file is a folder.")];
                    fs.createReadStream(file).pipe(res);
                    return [2 /*return*/];
            }
        });
    });
}
function doxygen(req, res) {
    res.set('Content-Type', 'text/xml');
    // this should really go through the file_manager lock - TODO
    fs.readFileAsync(paths.Bela + 'Documentation/xml/' + req.query.file + '.xml', 'utf-8')
        .then(function (xml) { return res.send(xml); })
        .catch(function () { return res.status(500).send('file ' + req.query.file + '.xml not found'); });
}
exports.doxygen = doxygen;
