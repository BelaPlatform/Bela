function sectionLoader(section) {
  switch(section) {
    default:
    case '#p5':
      console.log("Load p5js gui");
      loadHtmlSection("body", "/gui/p5-gui.html");
      location.hash = section;
      break;
    case '#nexus-gui':
      console.log("Load nexus UI gui");
      loadHtmlSection("body", "/gui/nexus-gui.html");
      location.hash = section;
      break;
  }
}

window.onload = function(){
    sectionLoader(location.hash);
};
