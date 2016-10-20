### 0.5.0
  * Add `toobusy.onLag()` for catching lag events. Thanks @mnahkies

### 0.4.3
  * Update dampening formula and make smoothing tunable. Thanks @tgroleau

### 0.4.2
  * Input validation for `maxLag()` and `interval()`.

### 0.4.1
  * Fix checking not automatically starting.

### 0.4.0
  * Refactoring
  * Added `toobusy.interval()` for getting/setting check interval.

### 0.3.0
  * full JS implementation, removed c code & bindings
  * example bugfixes

### 0.2.3
  * node.js 0.10.0 support upgrade to latest bindings and include in .travis.yml

### 0.2.2
  * *really* works on windows
  * improved documentation

### 0.2.1
  * works on windows
  * improved express.js example (now targets express 3.0)

### 0.2.0
  * documentation improvements
  * improved examples (including load generation tool and server)
  * .lag() added to retrieve (periodically calculated) event loop lag in ms

### 0.1.1
  * hey look, unit tests!

### 0.1.0
  * improved documentation and samples
  * added `maxLag` parameter
