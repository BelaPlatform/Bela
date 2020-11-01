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
            console.log(this.arg, "FAST Acquire: ", this.lock._waitingResolvers.length);
            return new Promise(function (resolve) { return resolve(); });
        }
        else {
            var p = this.lock.acquireAsync();
            console.log(this.arg, "SLOW Acquire: ", this.lock._waitingResolvers.length);
            return p;
        }
    };
    Lock.prototype.release = function () {
        this.lock.release();
        console.log(this.arg, "Release: ", this.lock._waitingResolvers.length);
    };
    return Lock;
}());
exports.Lock = Lock;
