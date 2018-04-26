"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var paths = /** @class */ (function () {
    function paths() {
    }
    Object.defineProperty(paths, "Bela", {
        get: function () { return this._Bela; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(paths, "projects", {
        get: function () { return this._projects; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(paths, "examples", {
        get: function () { return this._examples; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(paths, "media", {
        get: function () { return this._media; },
        enumerable: true,
        configurable: true
    });
    paths._Bela = '/root/Bela/';
    paths._projects = paths._Bela + 'projects/';
    paths._examples = paths._Bela + 'examples/';
    paths._media = paths._Bela + 'IDE/public/media/';
    return paths;
}());
exports.paths = paths;
;
// var paths = new Paths();
// export Paths;
