'use strict';

// worker
let remoteHost = location.hostname + ":5432";
let qs = new URLSearchParams(location.search);
let qsRemoteHost = qs.get("remoteHost");
let controlDisabled = parseInt(qs.get("controlDisabled"));
let dataDisabled = parseInt(qs.get("dataDisabled"));
let forceWebGl = parseInt(qs.get("forceWebGl"));
let antialias = parseInt(qs.get("antialias"));
let resolution = qs.get("resolution") ? parseInt(qs.get("resolution")) : 1;
let darkMode = qs.get("darkMode") ? parseInt(qs.get("darkMode")) : 0;
let showLabels = qs.get("showLabels") ? parseInt(qs.get("showLabels")) : 0;

if(qsRemoteHost)
  remoteHost = qsRemoteHost
var wsRemote = "ws://" + remoteHost + "/";
var worker = new Worker("js/scope-worker.js");
if(dataDisabled) {
  $('#ide-cpu').hide();
  $('#bela-cpu').hide();
  $('#scopeMouseX').hide();
  $('#scopeMouseY').hide();
} else {
  worker.postMessage({
    event: 'wsConnect',
    remote: wsRemote,
  });
}

// models
var Model = require('./Model');
var settings = new Model();
var tabSettings = new Model();
tabSettings.setKey('darkMode', darkMode);
tabSettings.setKey('showLabels', showLabels);
var allSettings = [ settings, tabSettings ];

// Pixi.js renderer and stage
var renderer = PIXI.autoDetectRenderer({
  width: window.innerWidth,
  heigh: window.innerHeight,
  backgroundAlpha: 0,
  antialias: antialias,
  forceCanvas: !forceWebGl,
  autoDensity: true, // somehow makes CSS compensate for increased resolution. Not sure it's needed for us
  resolution: resolution, // sort of oversampling for antialias
});
console.log(renderer)
renderer.view.style.position = "absolute";
renderer.view.style.display = "block";
renderer.autoResize = true;
$('.scopeWrapper').append(renderer.view);
var stage = new PIXI.Container();

// views
var controlView = new (require('./ControlView'))('scope-controls', allSettings);
if(dataDisabled)
  controlView.controlsVisibility(true);
var backgroundView = dataDisabled ? {} : new (require('./BackgroundView'))('scopeBG', allSettings, renderer);
var channelView = new (require('./ChannelView'))('channelView', allSettings);

// main bela socket
var belaSocket = io('/IDE');

function sendToWs(obj) {
  // do not send frameWidth if we are not receiving data,
  // or the server will get confused
  if(dataDisabled)
    delete obj.frameWidth;
  if (ws && ws.readyState === 1) {
    let out;
    try {
      let out = JSON.stringify(obj);
      ws.send(out);
    }
    catch(e){
      console.log('could not stringify settings:', e);
      return;
    }
  }
}

var ws_onerror = function(e){
  setTimeout(() => {
    ws = new WebSocket(wsUrl);
    setWsCbs(ws)
  }, 500);
};

var ws_onopen = function(){
  ws.binaryType = 'arraybuffer';
  console.log('scope control websocket open');
  ws.onclose = ws_onerror;
  ws.onerror = undefined;
};

var ws_onmessage = function(msg){
  // console.log('recieved scope control message:', msg.data);
  var data;
  try{
    data = JSON.parse(msg.data);
  }
  catch(e){
    console.log('could not parse scope control data:', e);
    return;
  }
  if (data.event == 'connection'){
    delete data.event;
    data.frameWidth = window.innerWidth;
    data.frameHeight = window.innerHeight;  
    settings.setData(data);

    if (settings.getKey('triggerChannel') >= data.numChannels)
      settings.setKey('triggerChannel', 0);

    var obj = settings._getData();
    obj.event = "connection-reply";
    sendToWs(obj);
  } else if (data.event == 'update'){
    // this is a full update due to the setting having changed in a different tab
	// unfortunately we don't yet have a way to handle it properly without
	// causing a ping-pong between the two tabs.
	// Another issue with two clients open receiving data at the same time is
	// that they need to share the same frameWidth or it's going to be a
	// problem!
	// TODO: do it!
  } else if (data.event == 'set-setting'){
    if (settings.getKey(data.setting) !== undefined) {
      settings.setKey(data.setting, data.value);
    }
  }
};
function setWsCbs(ws) {
  ws.onerror = ws_onerror;
  ws.onopen = ws_onopen;
  ws.onmessage = ws_onmessage;
}

let wsUrl = wsRemote + "scope_control";
// scope websocket
let ws;
if(!controlDisabled) {
  ws = new WebSocket(wsUrl);
  setWsCbs(ws);
}

var paused = false, oneShot = false;

// view events
const kScopeWaiting = 0, kScopeTriggered = 1, kScopePaused = 2, kScopeWaitingOneShot = 3, kScopeDisabled = 4;
function setScopeStatus(status) {
  if(dataDisabled)
    status = kScopeDisabled;
  let d = $('#scopeStatus');
  let trigCls = 'scope-status-triggered';
  let waitCls = 'scope-status-waiting';
  d.removeClass(trigCls).removeClass(waitCls);
  switch(status) {
    case(kScopeWaiting):
      d.addClass(waitCls);
      d.html('waiting');
      break;
    case(kScopeTriggered):
      d.addClass(trigCls);
      d.html('triggered');
      break;
    case(kScopePaused):
      d.addClass(waitCls);
      d.html('paused');
      break;
    case(kScopeWaitingOneShot):
      d.addClass(waitCls);
	  d.html('waiting (one-shot)');
      break;
    case(kScopeDisabled):
      d.html('DISABLED');
      break;
  }
}
controlView.on('settings-event', (key, value) => {
  if (key === 'scopePause'){
    if (paused){
      paused = false;
      $('.pause-button').html('Pause plotting');
      setScopeStatus(kScopeWaiting);
    } else {
      paused = true;
      $('.pause-button').html('Resume plotting');
      setScopeStatus(kScopePaused);
    }
    return;
  } else if (key === 'scopeOneShot'){
    oneShot = true;
    if (paused){
      paused = false;
      $('#pauseButton').html('pause');
    }
    setScopeStatus(kScopeWaitingOneShot);
  } else if (key === 'darkMode') {
    tabSettings.setKey('darkMode', !tabSettings.getKey('darkMode'));
    return; // do not send via websocket
  } else if (key === 'showLabels') {
    tabSettings.setKey('showLabels', !tabSettings.getKey('showLabels'));
    return; // do not send via websocket
  }
  if (value === undefined) return;
  var obj = {};
  obj[key] = value;
  sendToWs(obj);
  settings.setKey(key, value);
});


let legend = {
  update(channelConfig) {
    if(!this.panel)
    {
      this.panel = $('<div data-legend-panel/>');
      this.panel.appendTo('body')
    }
    this.panel.empty();
    for(let n = 0; n < channelConfig.length; ++n)
    {
      let channel = channelConfig[n];
      let ch = $('<div></div>');
      // channels are 1-based in the control panel, so we mirror it in the
      // text here
      let label = $('<div data-legend-color-label />').text(n + 1);
      let box = $('<input>');
      box.attr('type', 'checkbox');
      box.attr('data-key', 'enabled');
      box.attr('data-channel', n);
      box.attr('data-legend-color-box', '');
      if(channelConfig[n].enabled) {
        box.attr('checked', 'checked');
        box.css('background-color', channel.color.replace('0x', '#'));
      }
      ch.append(label).append(box);

      $('input', ch).on('input', (e) => channelView.inputChanged($(e.currentTarget), e));
      this.panel.append(ch);
    }
  },
}

channelView.on('channelConfig', (channelConfig) => {
  worker.postMessage({
    event     : 'channelConfig',
    channelConfig
  });
  legend.update(channelConfig);
});

belaSocket.on('cpu-usage', CPU);

// model events
settings.on('set', (data, changedKeys) => {
  if (changedKeys.indexOf('frameWidth') !== -1){
    var xTimeBase = Math.max(Math.floor(1000*(data.frameWidth/8)/data.sampleRate), 1);
    settings.setKey('xTimeBase', xTimeBase);
    sendToWs({frameWidth: data.frameWidth});
  } else {
    worker.postMessage({
      event   : 'settings',
      settings  : data
    });
  }
});

// window events
$(window).on('resize', () => {
  settings.setKey('frameWidth', window.innerWidth);
  settings.setKey('frameHeight', window.innerHeight);
});

$(window).on('mousemove', e => {
  if (settings.getKey('plotMode') === undefined) return;
  var plotMode = settings.getKey('plotMode');
  var scale = settings.getKey('downSampling') / settings.getKey('upSampling');
  var x, y;
  if (plotMode == 0){
    x = (1000*scale*(e.clientX-window.innerWidth/2)/settings.getKey('sampleRate')).toPrecision(4)+'ms';
    y = (1 - 2*e.clientY/window.innerHeight).toPrecision(3);
  } else if (plotMode == 1){
    if (parseInt(settings.getKey('FFTXAxis')) === 0){
      x = parseInt(settings.getKey('sampleRate')*e.clientX/(2*window.innerWidth*scale));
    } else {
      x = parseInt(Math.pow(Math.E, -(Math.log(1/window.innerWidth))*e.clientX/window.innerWidth) * (settings.getKey('sampleRate')/(2*window.innerWidth)) * (settings.getKey('upSampling')/(settings.getKey('downSampling'))));
    }
    if (x > 1500) x = (x/1000) + 'khz';
    else x += 'hz';
    if (parseInt(settings.getKey('FFTYAxis')) === 0){
      y = (1 - e.clientY/window.innerHeight).toPrecision(3);
    } else {
      y = ((-70*e.clientY/window.innerHeight).toPrecision(3)) + 'db';
    }
  }
  $('#scopeMouseX').html('x: '+x);
  $('#scopeMouseY').html('y: '+y);
});

// CPU usage
function CPU(data){
  var ide = (data.syntaxCheckProcess || 0) + (data.buildProcess || 0) + (data.node || 0);
  var bela = 0, rootCPU = 1;

  if (data.bela != 0 && data.bela !== undefined){
  
    // extract the data from the output
    var lines = data.bela.split('\n');
    var taskData = [], output = [];
    for (var j=0; j<lines.length; j++){
      taskData.push([]);
      lines[j] = lines[j].split(' ');
      for (var k=0; k<lines[j].length; k++){
        if (lines[j][k]){
          taskData[j].push(lines[j][k]);
        }
      }
    }
      
    for (var j=0; j<taskData.length; j++){
      if (taskData[j].length){
        var proc = {
          'name'  : taskData[j][8],
          'cpu' : taskData[j][7],
          'msw' : taskData[j][2],
          'csw' : taskData[j][3]
        };
        if (proc.name === '[ROOT]') rootCPU = proc.cpu*0.01;
        // ignore uninteresting data
        if (proc && proc.name && proc.name !== '[ROOT]' && proc.name !== 'NAME' && proc.name !== '[IRQ16:'){
          output.push(proc);
        }
      }
    }

    for (var j=0; j<output.length; j++){
      if (output[j].cpu){
        bela += parseFloat(output[j].cpu);
      }
    }

    bela += data.belaLinux * rootCPU; 

  }

  $('#ide-cpu').html('IDE: '+(ide*rootCPU).toFixed(1)+'%');
  $('#bela-cpu').html('Bela: '+( bela ? bela.toFixed(1)+'%' : '--'));
  
  if (bela && (ide*rootCPU + bela) > 80){
    $('#ide-cpu, #bela-cpu').css('color', 'red');
  } else {
    $('#ide-cpu, #bela-cpu').css('color', 'black');
  }
}

// plotting
{
  let ctx = new PIXI.Graphics;
  stage.addChild(ctx);
  
  let width, height, numChannels, channelConfig = [], xOff = 0, triggerChannel = 0, triggerLevel = 0, xOffset = 0, upSampling = 1;;
  settings.on('change', (data, changedKeys) => {
    if (changedKeys.indexOf('frameWidth') !== -1 || changedKeys.indexOf('frameHeight') !== -1){
      width = window.innerWidth;
      height = window.innerHeight;
      renderer.resize(width, height);
    }
    if (changedKeys.indexOf('numChannels') !== -1){
      numChannels = data.numChannels;
    }
    if (changedKeys.indexOf('triggerChannel') !== -1){
      triggerChannel = data.triggerChannel;
    }
    if (changedKeys.indexOf('triggerLevel') !== -1){
      triggerLevel = data.triggerLevel;
    }
    if (changedKeys.indexOf('xOffset') !== -1){
      xOffset = data.xOffset;
    }
    if (changedKeys.indexOf('upSampling') !== -1){
      upSampling = data.upSampling;
    }
  });
  channelView.on('channelConfig', (config) => channelConfig = config );
  
  let frame, length, plot = false;
  let oldDataSeparator = -1;

  worker.onmessage = function(e) {
    oldDataSeparator = e.data.oldDataSeparator;
    frame = e.data.outArray;
    length = Math.floor(frame.length/numChannels);
    // if scope is paused, don't set the plot flag
    plot = !paused;
    if(plot)
      requestAnimationFrame(plotLoop);
    
    // interpolate the trigger sample to get the sub-pixel x-offset
    if (settings.getKey('plotMode') == 0){
        let one = Math.abs(frame[Math.floor(triggerChannel*length+length/2)+xOffset-1] + (height/2) * ((channelConfig[triggerChannel].yOffset + triggerLevel)/channelConfig[triggerChannel].yAmplitude - 1));
        let two = Math.abs(frame[Math.floor(triggerChannel*length+length/2)+xOffset] + (height/2) * ((channelConfig[triggerChannel].yOffset + triggerLevel)/channelConfig[triggerChannel].yAmplitude - 1));
        xOff = (one/(one+two)-1.5);
      if (isNaN(xOff))
        xOff = 0;
    }
  };
  
  const benchmarkDrawing = false;
  const plotRuns = 50;
  let plotRunsSum = 0;
  let plotRunsStart = 0;
  let plotRunsIdx = 0;
  function plotLoop(){
    if (!plot){
      return
    }
    plot = false;
    let start;
    if(benchmarkDrawing)
      start = performance.now();
    ctx.clear();
    let minY = 0;
    let maxY = renderer.height;
    for (var i=0; i<numChannels; i++){
      if(!channelConfig[i].enabled)
        continue;
      ctx.lineStyle({
        width: channelConfig[i].lineWeight,
        color: channelConfig[i].color,
        alpha: 1,
        native: false, // setting this to true may reduce CPU usage but only allows width: 1
      });
      let iLength = i*length;
      let constrain = (v, min, max) => {
        if(v < min)
          return min;
        if(v > max)
          return max;
        return v;
      }
      let curr = constrain(frame[iLength], minY, maxY);
      let next = constrain(frame[iLength + 1], minY, maxY);
      ctx.moveTo(0, curr + xOff*(next - curr));
      let lastAlpha = 1;
      for (var j=1; (j-xOff)<length; j++){
        let curr = constrain(frame[j + iLength], minY, maxY);
        // when drawing incrementally, alpha will be 1 when close to the most
        // recent and then progressively fade out for older values
        if(oldDataSeparator >= 0) {
          let dist = (length + oldDataSeparator - j - 1) % length;
          let alpha = dist < length / 2 ? 1 : 1 - (dist - length / 2) / (length / 2);
          // throttle lineStyle() calls as they are CPU-heavy
          if(Math.abs(alpha - lastAlpha) > 0.1 || (lastAlpha != 1 && alpha == 1)) {
            lastAlpha = alpha;
            ctx.lineStyle(channelConfig[i].lineWeight, channelConfig[i].color, alpha);
          }
        }
        ctx.lineTo(j-xOff, curr);
      }
    }
    renderer.render(stage);
    triggerStatus();
    if(benchmarkDrawing) {
      let stop = performance.now();
      let dur = stop - start;
      plotRunsSum += dur;
      plotRunsIdx++;
      if(plotRunsIdx >= plotRuns) {
        let perc = plotRunsSum / (stop - plotRunsStart) * 100;
        console.log("sum: " + plotRunsSum.toFixed(2) + ", avg: ", + perc.toFixed(2) + "%, avg fps: ", plotRuns / ((stop - plotRunsStart) / 1000));
        plotRunsSum = 0;
        plotRunsIdx = 0;
        plotRunsStart = stop;
      }
    }
  }
  plotLoop();
  
  // update the status indicator when triggered
  let triggerTimeout; 
  let inactiveTimeout = setTimeout(() => {
    if (!oneShot && !paused) inactiveOverlay.addClass('inactive-overlay-visible');
  }, 5000);
  let inactiveOverlay = $('#inactive-overlay');
  function triggerStatus(){
  
    inactiveOverlay.removeClass('inactive-overlay-visible');
    
    if (oneShot){
      oneShot = false;
      paused = true;
      $('.pause-button').html('Resume plotting');
      setScopeStatus(kScopePaused);
    } else {
      setScopeStatus(kScopeTriggered);
      if (triggerTimeout) clearTimeout(triggerTimeout);
      triggerTimeout = setTimeout(() => {
        if (!oneShot && !paused)
          setScopeStatus(kScopeWaiting);
      }, 1000);
      
      if (inactiveTimeout) clearTimeout(inactiveTimeout);
      inactiveTimeout = setTimeout(() => {
        if (!oneShot && !paused) inactiveOverlay.addClass('inactive-overlay-visible');
      }, 5000);
    }
  }
  
  let saveCanvasData =  document.getElementById('saveCanvasData');    
  saveCanvasData.addEventListener('click', function(){

    let downSampling = settings.getKey('downSampling');
    let upSampling = settings.getKey('upSampling');
    let sampleRate = settings.getKey('sampleRate');
    let plotMode = settings.getKey('plotMode');
    let scale = downSampling/upSampling;
    let FFTAxis = settings.getKey('FFTXAxis');
    
    // console.log(FFTAxis)
        
    let out = "data:text/csv;charset=utf-8,";
    
    for (let i=0; i<length; i++){
    
      if (plotMode === 0){    // time domain
        out += scale*i/sampleRate;
      } else if (plotMode === 1) {  // FFT
        
        if (parseInt(settings.getKey('FFTXAxis')) === 0){ // linear x-axis
          out += sampleRate*i/(2*length*scale);
          // x = parseInt(settings.getKey('sampleRate')*e.clientX/(2*window.innerWidth*scale));
        } else {
          out += Math.pow(Math.E, -(Math.log(1/length))*i/length) * sampleRate/(2*length) + upSampling/downSampling;
          // x = parseInt(Math.pow(Math.E, -(Math.log(1/window.innerWidth))*e.clientX/window.innerWidth) * (settings.getKey('sampleRate')/(2*window.innerWidth)) * (settings.getKey('upSampling')/(settings.getKey('downSampling'))));
        }
        
      }
      
      for (let j=0; j<numChannels; j++){
        out += ','+ ( ( 1 - frame[j*length + i] / (height/2) ) * channelConfig[j].yAmplitude - channelConfig[j].yOffset );
      }
      out += '\n';
    }


    this.href = encodeURI(out);
  });
  
}

settings.setData({
  numChannels : 2,
  sampleRate  : 44100,
  frameWidth  : 1280,
  plotMode  : 0,
  triggerMode : 0,
  triggerChannel  : 0,
  triggerDir  : 0,
  triggerLevel  : 0,
  xOffset   : 0,
  xAxisBehaviour: 0,
  upSampling  : 1,
  downSampling  : 1,
  FFTLength : 1024,
  FFTXAxis  : 0,
  FFTYAxis  : 0,
  holdOff   : 0,
  interpolation : 0
});







