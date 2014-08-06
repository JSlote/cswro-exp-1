//Requires jQuery
//Remixed from https://gist.github.com/josephwegner/1228975

var shyCursor = (function () {
	var on = false;
	var timeout;
	var waiting = false;
	var hideCursor = function(){ 
		$("html").css("cursor","none");
		$("input").css("cursor","none");
	};
	var showCursor = function(){
		$("html").css("cursor","");
		$("input").css("cursor","");
	};
	return {
		on: function() {
			if (!on) {
				on = true;
				hideCursor();
				$("html").mousemove(function() {
					if (!waiting) {
						showCursor();
						window.clearTimeout(timeout);
						timeout = setTimeout(function() {
							hideCursor();
							waiting = true;
							window.setTimeout(function() {
								waiting = false;
							}, 200);
						}, 1000);
					}
				});
			}
		},
		off: function () {
			if (on) {
				on = false;
				window.clearTimeout(timeout);
				$("html").css("cursor","");
				$("input").css("cursor","");
			}
		}
	};
})();