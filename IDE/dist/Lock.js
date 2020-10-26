"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var await_lock_1 = require("await-lock");
var Lock = /** @class */ (function () {
    function Lock(arg) {
        this.lock = new await_lock_1.default();
        this.arg = arg;
    }
    Lock.prototype.acquire = function () {
        var ret = this.lock.tryAcquire();
        if (ret) {
            if ("ProcessManager" === this.arg)
                console.log("FAST Acquire: ", this.arg);
            return new Promise(function (resolve) { return resolve(); });
        }
        else {
            if ("ProcessManager" === this.arg)
                console.log("SLOW Acquire: ", this.arg);
            return this.lock.acquireAsync();
        }
    };
    Lock.prototype.release = function () {
        if ("ProcessManager" === this.arg)
            console.log("Release: ", this.arg);
        this.lock.release();
    };
    return Lock;
}());
exports.Lock = Lock;
