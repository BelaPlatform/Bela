"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var EventEmitter = require("events");
var Lock = /** @class */ (function () {
    function Lock() {
        this.locked = false;
        this.ee = new EventEmitter();
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIkxvY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSxxQ0FBdUM7QUFFdkM7SUFHQztRQUNDLElBQUksQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFDO1FBQ3BCLElBQUksQ0FBQyxFQUFFLEdBQUcsSUFBSSxZQUFZLEVBQUUsQ0FBQztJQUM5QixDQUFDO0lBQ0Qsc0JBQU8sR0FBUDtRQUFBLGlCQW1CQztRQWxCQSxPQUFPLElBQUksT0FBTyxDQUFFLFVBQUEsT0FBTztZQUMxQiwyQ0FBMkM7WUFDM0MsSUFBSSxDQUFDLEtBQUksQ0FBQyxNQUFNLEVBQUM7Z0JBQ2hCLEtBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDO2dCQUNuQixnQ0FBZ0M7Z0JBQ2hDLE9BQU8sT0FBTyxFQUFFLENBQUM7YUFDakI7WUFDRCxtRkFBbUY7WUFDbkYsSUFBSSxTQUFTLEdBQUc7Z0JBQ2YsSUFBSSxDQUFDLEtBQUksQ0FBQyxNQUFNLEVBQUM7b0JBQ2hCLEtBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDO29CQUNuQixnQ0FBZ0M7b0JBQ2hDLEtBQUksQ0FBQyxFQUFFLENBQUMsY0FBYyxDQUFDLFNBQVMsRUFBRSxTQUFTLENBQUMsQ0FBQztvQkFDN0MsT0FBTyxPQUFPLEVBQUUsQ0FBQztpQkFDakI7WUFDRixDQUFDLENBQUM7WUFDRixLQUFJLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxTQUFTLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDbEMsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDO0lBQ0Qsc0JBQU8sR0FBUDtRQUFBLGlCQUtDO1FBSkEsdUNBQXVDO1FBQ3ZDLElBQUksQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFDO1FBQ3BCLGdDQUFnQztRQUNoQyxZQUFZLENBQUUsY0FBTSxPQUFBLEtBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUF2QixDQUF1QixDQUFFLENBQUM7SUFDL0MsQ0FBQztJQUNGLFdBQUM7QUFBRCxDQWpDQSxBQWlDQyxJQUFBO0FBakNZLG9CQUFJIiwiZmlsZSI6IkxvY2suanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBFdmVudEVtaXR0ZXIgZnJvbSAnZXZlbnRzJztcblxuZXhwb3J0IGNsYXNzIExvY2sge1xuXHRwcml2YXRlIGxvY2tlZDogYm9vbGVhbjtcblx0cHJpdmF0ZSBlZTogRXZlbnRFbWl0dGVyO1xuXHRjb25zdHJ1Y3Rvcigpe1xuXHRcdHRoaXMubG9ja2VkID0gZmFsc2U7XG5cdFx0dGhpcy5lZSA9IG5ldyBFdmVudEVtaXR0ZXIoKTtcblx0fVxuXHRhY3F1aXJlKCk6IFByb21pc2U8dm9pZD4ge1xuXHRcdHJldHVybiBuZXcgUHJvbWlzZSggcmVzb2x2ZSA9PiB7XG5cdFx0XHQvLyBpZiB0aGUgbG9jayBpcyBmcmVlLCBsb2NrIGl0IGltbWVkaWF0ZWx5XG5cdFx0XHRpZiAoIXRoaXMubG9ja2VkKXtcblx0XHRcdFx0dGhpcy5sb2NrZWQgPSB0cnVlO1xuXHRcdFx0XHQvLyBjb25zb2xlLmxvZygnbG9jayBhY3F1aXJlZCcpO1xuXHRcdFx0XHRyZXR1cm4gcmVzb2x2ZSgpO1xuXHRcdFx0fVxuXHRcdFx0Ly8gb3RoZXJ3aXNlIHNsZWVwIHRoZSB0aHJlYWQgYW5kIHJlZ2lzdGVyIGEgY2FsbGJhY2sgZm9yIHdoZW4gdGhlIGxvY2sgaXMgcmVsZWFzZWRcblx0XHRcdGxldCByZWFjcXVpcmUgPSAoKSA9PiB7XG5cdFx0XHRcdGlmICghdGhpcy5sb2NrZWQpe1xuXHRcdFx0XHRcdHRoaXMubG9ja2VkID0gdHJ1ZTtcblx0XHRcdFx0XHQvLyBjb25zb2xlLmxvZygnbG9jayBhY3F1aXJlZCcpO1xuXHRcdFx0XHRcdHRoaXMuZWUucmVtb3ZlTGlzdGVuZXIoJ3JlbGVhc2UnLCByZWFjcXVpcmUpO1xuXHRcdFx0XHRcdHJldHVybiByZXNvbHZlKCk7XG5cdFx0XHRcdH1cblx0XHRcdH07XG5cdFx0XHR0aGlzLmVlLm9uKCdyZWxlYXNlJywgcmVhY3F1aXJlKTtcblx0XHR9KTtcblx0fVxuXHRyZWxlYXNlKCk6IHZvaWR7XG5cdFx0Ly8gdW5sb2NrIGFuZCBjYWxsIGFueSBxdWV1ZWQgY2FsbGJhY2tzXG5cdFx0dGhpcy5sb2NrZWQgPSBmYWxzZTtcblx0XHQvLyBjb25zb2xlLmxvZygnbG9jayByZWxlYXNlZCcpO1xuXHRcdHNldEltbWVkaWF0ZSggKCkgPT4gdGhpcy5lZS5lbWl0KCdyZWxlYXNlJykgKTtcblx0fVxufVxuXG4iXX0=
