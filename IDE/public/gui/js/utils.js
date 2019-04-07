var downloadObjectAsJson = function(exportObj, exportName, space, format){
  var format = format || ".json";
  var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportObj, null, space||null));
  var downloadAnchorNode = document.createElement('a');
  downloadAnchorNode.setAttribute("href",     dataStr);
  downloadAnchorNode.setAttribute("download", exportName + format);
  downloadAnchorNode.click();
  downloadAnchorNode.remove();
}

function loadHtmlSection(section, location) {
    console.log("LOCATION ", location);
  let promise = new Promise (function (resolve, reject) {
    $(section).hide();
    $(section).load(location, function(responseTxt, statusTxt, xhr){
      if(statusTxt == "success") {
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

function loadScript(src) {
    let promise = new Promise (function (resolve, reject) {
        let scriptElement = document.createElement('script');
        scriptElement.setAttribute('src', src);
        document.head.appendChild(scriptElement);
        scriptElement.onerror = (error) => {
            reject(null);
        }
        scriptElement.onload = () => {
            resolve(scriptElement);
        }
    });
    return promise;
}
