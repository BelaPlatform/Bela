"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs-extra-promise");
var paths = require("./paths");
var socket_manager = require("./SocketManager");
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
    send_zip(paths.projects + req.query.project, req.query.project, res);
}
function send_zip(path, name, res) {
    res.setHeader('Content-disposition', 'attachment; filename=' + name + '.zip');
    res.setHeader('Content-type', 'application/zip');
    var archive = archiver('zip');
    archive.on('error', function (e) {
        socket_manager.broadcast('report-error', e);
        res.end();
    });
    archive.pipe(res);
    archive.directory(path, name, { name: name + '.zip' });
    archive.finalize();
}
function upload_file(req, res) {
    var file = req.query.file;
    fs.createWriteStream(paths.uploads + file);
}
function upload(req, res) {
    if (req.query.all) {
        console.log(res);
        upload_file(req, res);
    }
}
exports.upload = upload;
function download_file(req, res) {
    var file = paths.projects + req.query.project + '/' + req.query.file;
    var fileName = req.query.file.split('/').pop();
    res.setHeader('Content-disposition', 'attachment; filename=' + fileName);
    res.setHeader('Content-type', mime.getType(file));
    // this should really go through the file_manager lock - TODO
    fs.createReadStream(file).pipe(res);
}
function doxygen(req, res) {
    res.set('Content-Type', 'text/xml');
    // this should really go through the file_manager lock - TODO
    fs.readFileAsync(paths.Bela + 'Documentation/xml/' + req.query.file + '.xml', 'utf-8')
        .then(function (xml) { return res.send(xml); })
        .catch(function () { return res.status(500).send('file ' + req.query.file + '.xml not found'); });
}
exports.doxygen = doxygen;
