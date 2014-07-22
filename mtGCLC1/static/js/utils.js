
function AssertException(message) { this.message = message; }
AssertException.prototype.toString = function () {
	return 'AssertException: ' + this.message;
};

function assert(exp, message) {
	if (!exp) {
		throw new AssertException(message);
	}
}

// Mean of booleans (true==1; false==0)
function boolpercent(arr) {
	var count = 0;
	for (var i=0; i<arr.length; i++) {
		if (arr[i]) { count++; } 
	}
	return 100* count / arr.length;
}

var hasAudioContext = function() {
	try { AudioContext = AudioContext || webkitAudioContext }
	catch (e) {
		return false;
	} return true;
};

//check for safari
var isSafari = function(){
	var ua = navigator.userAgent.toLowerCase();
	return (ua.indexOf('safari') != -1 && ua.indexOf('chrome') == -1 )
};

function hasFlash(){
    if (navigator.plugins != null && navigator.plugins.length > 0){
        return navigator.plugins["Shockwave Flash"] && true;
    }
    if(~navigator.userAgent.toLowerCase().indexOf("webtv")){
        return true;
    }
    if(~navigator.appVersion.indexOf("MSIE") && !~navigator.userAgent.indexOf("Opera")){
        try{
            return new ActiveXObject("ShockwaveFlash.ShockwaveFlash") && true;
        } catch(e){}
    }
    return false;
};