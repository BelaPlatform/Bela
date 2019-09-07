function sectionLoader(section) {
    let sectionName = section.substring(
            section.lastIndexOf("#") + 1
    );
    let sectionType;
    if(sectionName.length != 0) {
        if(sectionName.startsWith('p5')) {
            sectionType = 'p5';
        }
    }
    switch (sectionType) {
        default:
            case 'p5':
                console.log("Load p5js gui");
                loadHtmlSection("body", "/gui/p5-gui.html");
                location.hash = section;
                break;
    }
}
function loadSketch(sketchSource, parentSection = 'gui', defaultSource = "/gui/p5-sketches/sketch.js") {

    console.log("Loading "+sketchSource+" ...");

    let sketch = loadScript(sketchSource, parentSection);

    let scriptElement;
    sketch.then((resolved) => {
        scriptElement = resolved;
        console.log("... "+sketchSource+ " loaded");
    }).catch((rejected) => {
        console.log("... "+sketchSource + " couldn't be loaded.")
        if(defaultSource != null) {
            console.log("Loading %s instead", defaultSource);
            scriptElement = loadSketch(defaultSource);
        }
    })
    return scriptElement;
}

function loadProjectSketch(projectName, sketchName = "sketch", parentSection = "gui") {
    let p5sketchSource = "/projects/"+projectName+"/"+sketchName+".js";
    if(projectName != "exampleTempProject" && projectName != null)
    {
        window.location.hash = '#'+projectName;
    } else {
        history.replaceState(null, null, ' ');
    }
    Bela.control.target.addEventListener('new-connection', onNewConnection);
    Bela.control.target.resolve = null;
    return loadSketch(p5sketchSource, parentSection);
}

function selectSketch() {
    getProjectName().then((projectName) => {
        if(projectName != "null")
            selectSketchGui(projectName)
    });
}

function selectSketchGui(projectName) {
    // Remove all other instances of p5 to avoid conflict
    getInstancesOf(getUserProperties(), p5).map((i) => {i.remove()});

    let guiElement = document.getElementById("gui-html-wrapper");
    if(guiElement != null) {
        guiElement.setAttribute("id", "gui");
    } else {
        guiElement = document.getElementById("gui");
    }
    guiElement.innerHTML = "";

    Bela.control.target.removeEventListener('new-connection', onNewConnection);

    loadHtmlSection("#gui", "/projects/"+projectName+"/main.html", false).then(function(){
        document.getElementById("gui").setAttribute("id", "gui-html-wrapper");
    }).catch(() => {
        loadProjectSketch(projectName);
    });
}

function onNewConnection(event) {
    projName = event.detail.projectName;
    if(projName != null)
    {
        if(event.target.resolve) {
            event.target.resolve(projName);
        } else {
            selectSketchGui(projName);
        }
    }
}

function getProjectName() {
    let resolvePromise = function(){};
    let promise = new Promise(function(resolve, reject) {
        let projName = null;
        history.replaceState(null, null, ' ');

        let queryString = new URLSearchParams(window.location.search);
        if(queryString.has('project'))
            projName = queryString.get('project');

        projName = projName || Bela.control.projectName;

        Bela.control.target.addEventListener('new-connection', onNewConnection);
        Bela.control.target.resolve = resolve;

        if(projName != null)
            resolve(projName);
    });
    return promise;
}
