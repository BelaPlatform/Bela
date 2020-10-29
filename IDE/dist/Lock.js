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
                console.log("FAST Acquire: ", this.arg, this.lock._waitingResolvers.length);
            return new Promise(function (resolve) { return resolve(); });
        }
        else {
            var p = this.lock.acquireAsync();
            if ("ProcessManager" === this.arg)
                console.log("SLOW Acquire: ", this.arg, this.lock._waitingResolvers.length);
            return p;
        }
    };
    Lock.prototype.release = function () {
        this.lock.release();
        if ("ProcessManager" === this.arg)
            console.log("Release: ", this.arg, this.lock._waitingResolvers.length);
    };
    return Lock;
}());
exports.Lock = Lock;
