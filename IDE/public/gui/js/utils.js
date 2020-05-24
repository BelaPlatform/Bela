export function downloadObjectAsJson(exportObj, exportName, space, format) {
    var format = format || ".json";
    var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportObj, null, space || null));
    var downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", exportName + format);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}

export function loadHtmlSection(section, location, hide=true) {
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

export function getHtml(location) {
	let promise = new Promise((resolve, reject) => {
		let xhr = new XMLHttpRequest();
		xhr.open('GET', location, true);
		xhr.onload = () => {
			if(xhr.status >= 200 && xhr.status < 300) {
				resolve(xhr.response);
				console.log('request resolved');
			} else {
				reject(xhr.statusText);
				console.log('request rejected');
			}
		}
		xhr.onerror = () => reject(xhr.statusText);
		xhr.send();
	});
	return promise;
}

export function loadScript(src, parent, dom=document, module=false) {
    let promise = new Promise(function(resolve, reject) {
        let scriptElement = dom.createElement('script');
        scriptElement.setAttribute('src', src);
	if(module) {
		scriptElement.setAttribute('type', 'module');
	}
        let parentElement = dom.getElementById(parent) || dom.head;

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

export function removeElementById(elementId) {
    // Removes an element from the document
    var element = document.getElementById(elementId);
    if(element != null)
        element.parentNode.removeChild(element);
}

export function removeElementByClassName(className) {
    // Removes an element from the document
    var elements = document.getElementsByClassName(className);
    for (let elem of elements) {
        elem.parentNode.removeChild(elem);
    }
}

export function isInteger(n) {
    return Number(n) === n && n % 1 === 0;
}

export function isFloat(n) {
    return Number(n) === n && n % 1 !== 0;
}

export function getType(variable, recursive = false) {
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

export function getUserProperties(dom=document, wObj=window) {
    let results = [];
    // create an iframe and append to body to load a clean window object
    let iframe = dom.createElement('iframe');
    iframe.style.display = 'none';
    dom.body.appendChild(iframe);

    for (let p in wObj) {
            if (!(p in iframe.contentWindow)) {
                console.log(p);
                results.push(wObj[p]);
            }
    }

    dom.body.removeChild(iframe);
    return results;
}

export function getInstancesOf(objArray, constructor) {
    return objArray.filter((e) => { return (e instanceof constructor) });
}

export function isJson(str) {
	let data;
    try {
		data = JSON.parse(str);
		return data;
	} catch (e) {
		return false;
	}
}

export const getBlobURL = (code, type) => {
	const blob = new Blob([code], { type })
	return URL.createObjectURL(blob)
}

export function serialResolve(promises) {
	return promises.reduce((promiseChain, currentTask) => {
		return promiseChain.then(chainResults =>
			currentTask.then(currentResult =>
				[...chainResults, currentResult]
			)
		);
	}, Promise.resolve([]));
}
