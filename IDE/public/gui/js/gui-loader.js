function sectionLoader(section) {
    let sectionName = section.substring(
            section.lastIndexOf("#") + 1
    );
    let sectionType;
    if(sectionName.length != 0) {
        if(sectionName.startsWith('p5')) {
            sectionType = 'p5';
        } else if(sectionName.startsWith('nexus')) {
            sectionType = 'nexus';
        }
    }
    switch (sectionType) {
        default:
            case 'p5':
            console.log("Load p5js gui");
            loadHtmlSection("body", "/gui/p5-gui.html");
            location.hash = section;
        break;
        case 'nexus':
            console.log("Load nexus UI gui");
            loadHtmlSection("body", "/gui/nexus-gui.html");
            location.hash = section;
            break;
    }
}

window.onload = function() {
    sectionLoader(location.hash);
};
