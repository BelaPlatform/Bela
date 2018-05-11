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
    Object.defineProperty(paths, "ide_settings", {
        get: function () { return this._ide_settings; },
        enumerable: true,
        configurable: true
    });
    paths._Bela = '/root/Bela/';
    paths._projects = paths._Bela + 'projects/';
    paths._examples = paths._Bela + 'examples/';
    paths._exampleTempProject = paths._projects + 'exampleTempProject/';
    paths._media = paths._Bela + 'IDE/public/media/';
    paths._templates = paths._Bela + 'IDE/templates/';
    paths._ide_settings = paths._Bela + 'IDE/settings.json';
    return paths;
}());
exports.paths = paths;
;
// var paths = new Paths();
// export Paths;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInBhdGhzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUE7SUFBQTtJQWVBLENBQUM7SUFQQSxzQkFBVyxhQUFJO2FBQWYsY0FBNEIsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFBLENBQUMsQ0FBQzs7O09BQUE7SUFDL0Msc0JBQVcsaUJBQVE7YUFBbkIsY0FBZ0MsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFBLENBQUMsQ0FBQzs7O09BQUE7SUFDdkQsc0JBQVcsaUJBQVE7YUFBbkIsY0FBZ0MsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFBLENBQUMsQ0FBQzs7O09BQUE7SUFDdkQsc0JBQVcsMkJBQWtCO2FBQTdCLGNBQTBDLE9BQU8sSUFBSSxDQUFDLG1CQUFtQixDQUFBLENBQUMsQ0FBQzs7O09BQUE7SUFDM0Usc0JBQVcsY0FBSzthQUFoQixjQUE2QixPQUFPLElBQUksQ0FBQyxNQUFNLENBQUEsQ0FBQyxDQUFDOzs7T0FBQTtJQUNqRCxzQkFBVyxrQkFBUzthQUFwQixjQUFpQyxPQUFPLElBQUksQ0FBQyxVQUFVLENBQUEsQ0FBQyxDQUFDOzs7T0FBQTtJQUN6RCxzQkFBVyxxQkFBWTthQUF2QixjQUFvQyxPQUFPLElBQUksQ0FBQyxhQUFhLENBQUEsQ0FBQyxDQUFDOzs7T0FBQTtJQWJoRCxXQUFLLEdBQVksYUFBYSxDQUFDO0lBQy9CLGVBQVMsR0FBVyxLQUFLLENBQUMsS0FBSyxHQUFDLFdBQVcsQ0FBQztJQUM1QyxlQUFTLEdBQVcsS0FBSyxDQUFDLEtBQUssR0FBQyxXQUFXLENBQUM7SUFDNUMseUJBQW1CLEdBQVcsS0FBSyxDQUFDLFNBQVMsR0FBQyxxQkFBcUIsQ0FBQztJQUNwRSxZQUFNLEdBQVcsS0FBSyxDQUFDLEtBQUssR0FBQyxtQkFBbUIsQ0FBQztJQUNqRCxnQkFBVSxHQUFXLEtBQUssQ0FBQyxLQUFLLEdBQUMsZ0JBQWdCLENBQUM7SUFDbEQsbUJBQWEsR0FBVyxLQUFLLENBQUMsS0FBSyxHQUFDLG1CQUFtQixDQUFDO0lBUXhFLFlBQUM7Q0FmRCxBQWVDLElBQUE7QUFmWSxzQkFBSztBQWVqQixDQUFDO0FBQ0YsMkJBQTJCO0FBQzNCLGdCQUFnQiIsImZpbGUiOiJwYXRocy5qcyIsInNvdXJjZXNDb250ZW50IjpbImV4cG9ydCBjbGFzcyBwYXRocyB7XG5cdHByaXZhdGUgc3RhdGljIF9CZWxhOiBzdHJpbmcgPVx0XHQnL3Jvb3QvQmVsYS8nO1xuXHRwcml2YXRlIHN0YXRpYyBfcHJvamVjdHM6IHN0cmluZyA9XHRwYXRocy5fQmVsYSsncHJvamVjdHMvJztcblx0cHJpdmF0ZSBzdGF0aWMgX2V4YW1wbGVzOiBzdHJpbmcgPVx0cGF0aHMuX0JlbGErJ2V4YW1wbGVzLyc7XG5cdHByaXZhdGUgc3RhdGljIF9leGFtcGxlVGVtcFByb2plY3Q6IHN0cmluZyA9XHRwYXRocy5fcHJvamVjdHMrJ2V4YW1wbGVUZW1wUHJvamVjdC8nO1xuXHRwcml2YXRlIHN0YXRpYyBfbWVkaWE6IHN0cmluZyA9XHRwYXRocy5fQmVsYSsnSURFL3B1YmxpYy9tZWRpYS8nO1xuXHRwcml2YXRlIHN0YXRpYyBfdGVtcGxhdGVzOiBzdHJpbmcgPVx0cGF0aHMuX0JlbGErJ0lERS90ZW1wbGF0ZXMvJztcblx0cHJpdmF0ZSBzdGF0aWMgX2lkZV9zZXR0aW5nczogc3RyaW5nID1cdHBhdGhzLl9CZWxhKydJREUvc2V0dGluZ3MuanNvbic7XG5cdHN0YXRpYyBnZXQgQmVsYSgpOiBzdHJpbmcgeyByZXR1cm4gdGhpcy5fQmVsYSB9XG5cdHN0YXRpYyBnZXQgcHJvamVjdHMoKTogc3RyaW5nIHsgcmV0dXJuIHRoaXMuX3Byb2plY3RzIH1cblx0c3RhdGljIGdldCBleGFtcGxlcygpOiBzdHJpbmcgeyByZXR1cm4gdGhpcy5fZXhhbXBsZXMgfVxuXHRzdGF0aWMgZ2V0IGV4YW1wbGVUZW1wUHJvamVjdCgpOiBzdHJpbmcgeyByZXR1cm4gdGhpcy5fZXhhbXBsZVRlbXBQcm9qZWN0IH1cblx0c3RhdGljIGdldCBtZWRpYSgpOiBzdHJpbmcgeyByZXR1cm4gdGhpcy5fbWVkaWEgfVxuXHRzdGF0aWMgZ2V0IHRlbXBsYXRlcygpOiBzdHJpbmcgeyByZXR1cm4gdGhpcy5fdGVtcGxhdGVzIH1cblx0c3RhdGljIGdldCBpZGVfc2V0dGluZ3MoKTogc3RyaW5nIHsgcmV0dXJuIHRoaXMuX2lkZV9zZXR0aW5ncyB9XG59O1xuLy8gdmFyIHBhdGhzID0gbmV3IFBhdGhzKCk7XG4vLyBleHBvcnQgUGF0aHM7XG4iXX0=
