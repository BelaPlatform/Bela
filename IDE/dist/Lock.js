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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIkxvY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSxxQ0FBdUM7QUFFdkM7SUFHQztRQUNDLElBQUksQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFDO1FBQ3BCLElBQUksQ0FBQyxFQUFFLEdBQUcsSUFBSSxZQUFZLEVBQUUsQ0FBQztRQUM3QixrRkFBa0Y7UUFDbEYsSUFBSSxDQUFDLEVBQUUsQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDOUIsQ0FBQztJQUNELHNCQUFPLEdBQVA7UUFBQSxpQkFtQkM7UUFsQkEsT0FBTyxJQUFJLE9BQU8sQ0FBRSxVQUFBLE9BQU87WUFDMUIsMkNBQTJDO1lBQzNDLElBQUksQ0FBQyxLQUFJLENBQUMsTUFBTSxFQUFDO2dCQUNoQixLQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQztnQkFDbkIsZ0NBQWdDO2dCQUNoQyxPQUFPLE9BQU8sRUFBRSxDQUFDO2FBQ2pCO1lBQ0QsbUZBQW1GO1lBQ25GLElBQUksU0FBUyxHQUFHO2dCQUNmLElBQUksQ0FBQyxLQUFJLENBQUMsTUFBTSxFQUFDO29CQUNoQixLQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQztvQkFDbkIsZ0NBQWdDO29CQUNoQyxLQUFJLENBQUMsRUFBRSxDQUFDLGNBQWMsQ0FBQyxTQUFTLEVBQUUsU0FBUyxDQUFDLENBQUM7b0JBQzdDLE9BQU8sT0FBTyxFQUFFLENBQUM7aUJBQ2pCO1lBQ0YsQ0FBQyxDQUFDO1lBQ0YsS0FBSSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsU0FBUyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQ2xDLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUNELHNCQUFPLEdBQVA7UUFBQSxpQkFLQztRQUpBLHVDQUF1QztRQUN2QyxJQUFJLENBQUMsTUFBTSxHQUFHLEtBQUssQ0FBQztRQUNwQixnQ0FBZ0M7UUFDaEMsWUFBWSxDQUFFLGNBQU0sT0FBQSxLQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBdkIsQ0FBdUIsQ0FBRSxDQUFDO0lBQy9DLENBQUM7SUFDRixXQUFDO0FBQUQsQ0FuQ0EsQUFtQ0MsSUFBQTtBQW5DWSxvQkFBSSIsImZpbGUiOiJMb2NrLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgRXZlbnRFbWl0dGVyIGZyb20gJ2V2ZW50cyc7XG5cbmV4cG9ydCBjbGFzcyBMb2NrIHtcblx0cHJpdmF0ZSBsb2NrZWQ6IGJvb2xlYW47XG5cdHByaXZhdGUgZWU6IEV2ZW50RW1pdHRlcjtcblx0Y29uc3RydWN0b3IoKXtcblx0XHR0aGlzLmxvY2tlZCA9IGZhbHNlO1xuXHRcdHRoaXMuZWUgPSBuZXcgRXZlbnRFbWl0dGVyKCk7XG5cdFx0Ly8gd2l0aG91dCB0aGlzIHdlIHNvbWV0aW1lcyBnZXQgYSB3YXJuaW5nIHdoZW4gbW9yZSB0aGFuIDEwIHRocmVhZHMgaG9sZCB0aGUgbG9ja1xuXHRcdHRoaXMuZWUuc2V0TWF4TGlzdGVuZXJzKDEwMCk7XG5cdH1cblx0YWNxdWlyZSgpOiBQcm9taXNlPHZvaWQ+IHtcblx0XHRyZXR1cm4gbmV3IFByb21pc2UoIHJlc29sdmUgPT4ge1xuXHRcdFx0Ly8gaWYgdGhlIGxvY2sgaXMgZnJlZSwgbG9jayBpdCBpbW1lZGlhdGVseVxuXHRcdFx0aWYgKCF0aGlzLmxvY2tlZCl7XG5cdFx0XHRcdHRoaXMubG9ja2VkID0gdHJ1ZTtcblx0XHRcdFx0Ly8gY29uc29sZS5sb2coJ2xvY2sgYWNxdWlyZWQnKTtcblx0XHRcdFx0cmV0dXJuIHJlc29sdmUoKTtcblx0XHRcdH1cblx0XHRcdC8vIG90aGVyd2lzZSBzbGVlcCB0aGUgdGhyZWFkIGFuZCByZWdpc3RlciBhIGNhbGxiYWNrIGZvciB3aGVuIHRoZSBsb2NrIGlzIHJlbGVhc2VkXG5cdFx0XHRsZXQgcmVhY3F1aXJlID0gKCkgPT4ge1xuXHRcdFx0XHRpZiAoIXRoaXMubG9ja2VkKXtcblx0XHRcdFx0XHR0aGlzLmxvY2tlZCA9IHRydWU7XG5cdFx0XHRcdFx0Ly8gY29uc29sZS5sb2coJ2xvY2sgYWNxdWlyZWQnKTtcblx0XHRcdFx0XHR0aGlzLmVlLnJlbW92ZUxpc3RlbmVyKCdyZWxlYXNlJywgcmVhY3F1aXJlKTtcblx0XHRcdFx0XHRyZXR1cm4gcmVzb2x2ZSgpO1xuXHRcdFx0XHR9XG5cdFx0XHR9O1xuXHRcdFx0dGhpcy5lZS5vbigncmVsZWFzZScsIHJlYWNxdWlyZSk7XG5cdFx0fSk7XG5cdH1cblx0cmVsZWFzZSgpOiB2b2lke1xuXHRcdC8vIHVubG9jayBhbmQgY2FsbCBhbnkgcXVldWVkIGNhbGxiYWNrc1xuXHRcdHRoaXMubG9ja2VkID0gZmFsc2U7XG5cdFx0Ly8gY29uc29sZS5sb2coJ2xvY2sgcmVsZWFzZWQnKTtcblx0XHRzZXRJbW1lZGlhdGUoICgpID0+IHRoaXMuZWUuZW1pdCgncmVsZWFzZScpICk7XG5cdH1cbn1cblxuIl19
