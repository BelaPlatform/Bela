"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// descriptor of a filesystem entry. directories have size undefined, files have children undefined
var File_Descriptor = /** @class */ (function () {
    function File_Descriptor(name, size, children) {
        if (size === void 0) { size = undefined; }
        if (children === void 0) { children = undefined; }
        this.size = undefined;
        this.children = undefined;
        this.name = name;
        this.size = size;
        this.children = children;
    }
    return File_Descriptor;
}());
exports.File_Descriptor = File_Descriptor;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInV0aWxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsbUdBQW1HO0FBQ25HO0lBQ0MseUJBQVksSUFBWSxFQUFFLElBQWtDLEVBQUUsUUFBaUQ7UUFBckYscUJBQUEsRUFBQSxnQkFBa0M7UUFBRSx5QkFBQSxFQUFBLG9CQUFpRDtRQU0vRyxTQUFJLEdBQXVCLFNBQVMsQ0FBQztRQUNyQyxhQUFRLEdBQWtDLFNBQVMsQ0FBQztRQU5uRCxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQztRQUNqQixJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQztRQUNqQixJQUFJLENBQUMsUUFBUSxHQUFHLFFBQVEsQ0FBQztJQUMxQixDQUFDO0lBSUYsc0JBQUM7QUFBRCxDQVRBLEFBU0MsSUFBQTtBQVRZLDBDQUFlIiwiZmlsZSI6InV0aWxzLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gZGVzY3JpcHRvciBvZiBhIGZpbGVzeXN0ZW0gZW50cnkuIGRpcmVjdG9yaWVzIGhhdmUgc2l6ZSB1bmRlZmluZWQsIGZpbGVzIGhhdmUgY2hpbGRyZW4gdW5kZWZpbmVkXG5leHBvcnQgY2xhc3MgRmlsZV9EZXNjcmlwdG9yIHtcblx0Y29uc3RydWN0b3IobmFtZTogc3RyaW5nLCBzaXplOiBudW1iZXJ8dW5kZWZpbmVkID0gdW5kZWZpbmVkLCBjaGlsZHJlbjogRmlsZV9EZXNjcmlwdG9yW118dW5kZWZpbmVkID0gdW5kZWZpbmVkKXtcblx0XHR0aGlzLm5hbWUgPSBuYW1lO1xuXHRcdHRoaXMuc2l6ZSA9IHNpemU7XG5cdFx0dGhpcy5jaGlsZHJlbiA9IGNoaWxkcmVuO1xuXHR9XG5cdHByaXZhdGUgbmFtZTogc3RyaW5nO1xuXHRzaXplOiBudW1iZXIgfCB1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG5cdGNoaWxkcmVuOiBGaWxlX0Rlc2NyaXB0b3JbXSB8IHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcbn1cbiJdfQ==
