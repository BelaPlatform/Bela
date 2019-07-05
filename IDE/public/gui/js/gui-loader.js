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
function loadSketch(sketchSource, defaultSource) {

    // Remove all other instances of p5 to avoid conflict
    getInstancesOf(getUserProperties(), p5).map((i) => {i.remove()})

    let sketch = loadScript(sketchSource, 'gui');

    let scriptElement;
    sketch.then((resolved) => {
        scriptElement = resolved;
        removeElementById('p5-sketch');
        scriptElement.setAttribute('id', 'p5-sketch');
        console.log(sketchSource+ " loaded");
        if(Bela_control != null)
            Bela_control.sendEvent("gui-ready");
    }).catch((rejected) => {
        console.log(sketchSource + " couldn't be loaded.")
        if(defaultSource != null) {
            console.log("Loading %s instead", defaultSource);
            scriptElement = loadSketch(defaultSource);
        }
    })
    return scriptElement;
}

function selectSketch() {
    let p5sketchSource;
    let projectName = location.hash;

    let queryString = new URLSearchParams(window.location.search);

    if(queryString.has('project')) {
        let projectName = queryString.get('project');
        if(projectName.length != 0) {
            p5sketchSource = "/projects/"+projectName+"/sketch.js"
            loadSketch(p5sketchSource);
        }
    } else {
        Bela_control.target.addEventListener('new-connection', function(event) {
            projectName = event.detail.projectName;
            p5sketchSource = "/projects/"+projectName+"/sketch.js"
        if(projectName != "exampleTempProject")
            window.location.hash = '#'+projectName;
            loadSketch(p5sketchSource);
        });
    }
}
