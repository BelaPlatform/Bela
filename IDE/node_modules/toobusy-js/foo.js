function tightWork(duration) {
  var start = Date.now();
  while ((Date.now() - start) < duration) {
    for (var i = 0; i < 1e5;) i++;
  }
}

var count = 0;
var last = Date.now();

function load() {
  if (count++ > 10) return;
  console.log('tick delta:', (Date.now() - last));
  tightWork(100);
  last = Date.now();
  setTimeout(load, 0);
}

load();
