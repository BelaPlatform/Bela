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
