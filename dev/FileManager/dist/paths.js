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
    Object.defineProperty(paths, "exampleTempProject", {
        get: function () { return this._exampleTempProject; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(paths, "media", {
        get: function () { return this._media; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(paths, "templates", {
        get: function () { return this._templates; },
        enumerable: true,
        configurable: true
    });
    paths._Bela = '/root/Bela/';
    paths._projects = paths._Bela + 'projects/';
    paths._examples = paths._Bela + 'examples/';
    paths._exampleTempProject = paths._projects + 'exampleTempProject/';
    paths._media = paths._Bela + 'IDE/public/media/';
    paths._templates = paths._Bela + 'IDE/templates/';
    return paths;
}());
exports.paths = paths;
;
// var paths = new Paths();
// export Paths;
