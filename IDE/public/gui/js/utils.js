function downloadObjectAsJson(exportObj, exportName, space, format) {
    var format = format || ".json";
    var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportObj, null, space || null));
    var downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", exportName + format);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}

function loadHtmlSection(section, location, hide=true) {
    let promise = new Promise(function(resolve, reject) {
        if(hide)
            $(section).hide();
        $(section).load(location, function(responseTxt, statusTxt, xhr) {
            if (statusTxt == "success") {
                resolve($(section));
                $(section).slideDown(500);
                $(section).scrollTop(0)
            } else if (statusTxt == "error") {
                var alert = new Error("Error: " + xhr.status + ": " + xhr.statusText);
                reject(alert);
            }
        });
    });
    return promise;
}

function loadScript(src, parent) {
    let promise = new Promise(function(resolve, reject) {
        let scriptElement = document.createElement('script');
        scriptElement.setAttribute('src', src);
        let parentElement = document.getElementById(parent) || document.head;

        parentElement.appendChild(scriptElement);
        scriptElement.onerror = (error) => {
            reject(null);
        }
        scriptElement.onload = () => {
            resolve(scriptElement);
        }
    });
    return promise;
}

function removeElementById(elementId) {
    // Removes an element from the document
    var element = document.getElementById(elementId);
    if(element != null)
        element.parentNode.removeChild(element);
}

function removeElementByClassName(className) {
    // Removes an element from the document
    var elements = document.getElementsByClassName(className);
    for (let elem of elements) {
        elem.parentNode.removeChild(elem);
    }
}

function isInteger(n) {
    return Number(n) === n && n % 1 === 0;
}

function isFloat(n) {
    return Number(n) === n && n % 1 !== 0;
}

function getType(variable, recursive = false) {
    let type = typeof variable;
    if(type === 'number') {
        if(isFloat(variable)) {
            type = 'float';
        } else if (isInteger(variable)) {
            type = 'int';
        }
    } else if (type === 'object') {
        if(variable instanceof Array) {
            type = 'array';
            if(recursive) {
                let arr =  [];
                variable.forEach(function (val, index) {
                    arr.push(getType(val, true));
                });
                type = arr;
            }
        } else {
            if(recursive) {
                let obj = JSON.parse(JSON.stringify(variable));
                for(let e in obj) {
                    obj[e] = getType(obj[e], true);
                }
                type = obj;
            }
        }
    }
    return type;
}

function getUserProperties() {
    let results = [];
    let currentWindow;
    // create an iframe and append to body to load a clean window object
    iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);

    for (let prop in window) {
            if (!(prop in iframe.contentWindow))
                results.push(window[prop]);
    }

    document.body.removeChild(iframe);
    return results;
}

function getInstancesOf(objArray, constructor) {
    return objArray.filter((e) => { return (e instanceof constructor) });
}

function isJson(str) {
	let data;
    try {
		data = JSON.parse(str);
		return data;
	} catch (e) {
		return false;
	}
}
