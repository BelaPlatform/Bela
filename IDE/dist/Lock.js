"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var EventEmitter = require("events");
var Lock = /** @class */ (function () {
    function Lock() {
        this.locked = false;
        this.ee = new EventEmitter();
        // without this we sometimes get a warning when more than 10 threads hold the lock
        this.ee.setMaxListeners(100);
    }
    Lock.prototype.acquire = function () {
        var _this = this;
        return new Promise(function (resolve) {
            // if the lock is free, lock it immediately
            if (!_this.locked) {
                _this.locked = true;
                // console.log('lock acquired');
                return resolve();
            }
            // otherwise sleep the thread and register a callback for when the lock is released
            var reacquire = function () {
                if (!_this.locked) {
                    _this.locked = true;
                    // console.log('lock acquired');
                    _this.ee.removeListener('release', reacquire);
                    return resolve();
                }
            };
            _this.ee.on('release', reacquire);
        });
    };
    Lock.prototype.release = function () {
        var _this = this;
        // unlock and call any queued callbacks
        this.locked = false;
        // console.log('lock released');
        setImmediate(function () { return _this.ee.emit('release'); });
    };
    return Lock;
}());
exports.Lock = Lock;
