"use strict";
// a map of queues that can store at most one element, where the
// most-recent push() overwrites any previous ones
// in other words, a map wrapped up to look like a queue.
Object.defineProperty(exports, "__esModule", { value: true });
var MostRecentQueue = /** @class */ (function () {
    function MostRecentQueue() {
        this.q = new Map;
    }
    MostRecentQueue.prototype.count = function (id) {
        return this.q.size;
    };
    MostRecentQueue.prototype.push = function (id, data) {
        var ret = this.q.has(id);
        this.q.set(id, data);
        return ret;
    };
    MostRecentQueue.prototype.pop = function (id) {
        var ret = this.get(id);
        this.q.delete(id);
        return ret;
    };
    MostRecentQueue.prototype.get = function (id) {
        return this.q.get(id);
    };
    return MostRecentQueue;
}());
exports.MostRecentQueue = MostRecentQueue;
