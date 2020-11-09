"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var await_lock_1 = require("await-lock");
// Simplified stacktrace function
function stacktrace() {
    return new Error().stack
        .replace("Error", "")
        .replace(/^.*stacktrace.*\n/gm, "")
        .replace(/^.*Lock.*\n/gm, "")
        .replace(/\/Users\/giulio\/Dropbox\/matlab\/phd\/workspace\/Bela\/IDE\/dist\//g, "")
        .replace(/\/root\/Bela\/IDE\/dist\//g, "")
        .replace(/^.*new Promise \(<anonymous>\).*$/gm, "")
        .replace(/^.*__awaiter.*$/gm, "")
        .replace(/^\s*at <anonymous>$/gm, "")
        .replace(/^\s*at step \(.*$/gm, "")
        .replace(/^\s*at Object.next \(.*$/gm, "")
        .replace(/^\s*at Object.<anonymous>.*\(.*$/gm, "")
        .replace(/^\s*at fulfilled \(.*$/gm, "")
        .replace(/^\s*at [/A-Za-z]+\.js:7:.*$/gm, "")
        .replace(/Object./g, "")
        .replace(/\n/g, "__")
        .replace(/_[_]+/g, "__")
        .replace(/\s+/gm, " ");
}
var toLog = ["aaaaa"]; //"ProcessManager", "FileManager" ];
function shouldLog(s) {
    return toLog.indexOf(s) != -1;
}
var Lock = /** @class */ (function () {
    function Lock(arg) {
        this.lock = new await_lock_1.default();
        this.arg = arg;
    }
    Object.defineProperty(Lock.prototype, "acquired", {
        get: function () {
            return this.lock.acquired;
        },
        enumerable: true,
        configurable: true
    });
    Lock.prototype.tryAcquire = function () {
        return this.lock.tryAcquire();
    };
    Lock.prototype.acquire = function () {
        var ret = this.lock.tryAcquire();
        if (ret) {
            if (shouldLog(this.arg))
                console.log(this.arg, "FAST Acquire: ", this.lock._waitingResolvers.length, stacktrace());
            return new Promise(function (resolve) { return resolve(); });
        }
        else {
            if (shouldLog(this.arg))
                console.log(this.arg, "SLOW Acquiring: ", this.lock._waitingResolvers.length, stacktrace());
            var p = this.lock.acquireAsync();
            if (shouldLog(this.arg))
                console.log(this.arg, "SLOW Acquired: ", this.lock._waitingResolvers.length, stacktrace());
            return p;
        }
    };
    Lock.prototype.release = function () {
        this.lock.release();
        if (shouldLog(this.arg))
            console.log(this.arg, "Release: ", this.lock._waitingResolvers.length, stacktrace());
    };
    return Lock;
}());
exports.Lock = Lock;
