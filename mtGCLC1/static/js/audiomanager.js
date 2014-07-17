//some info remixed from http://www.html5rocks.com/en/tutorials/webaudio/intro/
//window needs to load (use window.onload)

//all input-output units are seconds

window.AudioContext = window.AudioContext || window.webkitAudioContext;

function AudioManager() {
  "use strict";
  this.context = new AudioContext();
  this.buffers = {};
  this.pathPrefix = "";

  var manager = this;

  this.preloadSound = function (name, url, callback) {
    //preload a single sound. Returns true on success
    var request = new XMLHttpRequest();
    request.open("GET", manager.pathPrefix + url, true);
    request.responseType = "arraybuffer";

    request.onload = function () {
      manager.context.decodeAudioData(
        //buffer to decode
        request.response,
        //on success
        function (buffer) {
          //what kind of error is this?
          if (!buffer) {
            console.log('error decoding file data: ' + url);
            callback(false);
          }
          //add buffer to decoded list
          manager.buffers[name] = buffer;
          callback(true);
        },
        //on failure
        function (error) {
          console.error('decodeAudioData error', error);
          callback(false);
        }
      );
    };

    request.send();
  };

  this.preloadSounds = function (urlMap, callback, setName) {
    //returns true if all sounds loaded successfully, false if not
    console.log("setName is "+ setName);
    var size = Object.keys(urlMap).length;
    var count = 0;
    var allsuccess = true;

    var soundName;
    var eventName = "soundLoaded" + (typeof setName === 'undefined' ? "" : "." + setName);

    //iterate through sound objs
    for (soundName in urlMap) { if (urlMap.hasOwnProperty(soundName)) {
      manager.preloadSound(soundName, urlMap[soundName],
        function (success) {
          count++;
          if (!success) allsuccess = false;
          window.dispatchEvent(new CustomEvent(eventName, {detail: count}));
          if (count == size) callback(allsuccess);
        });
    }}

    return {
      total: size,
      getCount: function() { return count;},
      eventName: eventName
    }
  };

  this.play = function (soundName, waitTime, callbackEnd, callbackStart) {
    //plays sound now or at specific time
    var ctxt = manager.context;
    if (waitTime === undefined) waitTime = 0;

    var src = ctxt.createBufferSource();
    src.buffer = manager.buffers[soundName];
    //hacky, time the callbackEnd b/c audio API doesn't have anything better right now
    // setTimeout(callbackEnd, src.buffer.duration * 1000);
    src.onended = callbackEnd;
    src.connect(ctxt.destination);

    var startTime = ctxt.currentTime + waitTime;
    src.start(startTime);
    window.setTimeout(callbackStart, waitTime*1000);

    //return when the sound will start (seconds)
    return startTime;
  };

  this.now = function() { return manager.context.currentTime; };
}