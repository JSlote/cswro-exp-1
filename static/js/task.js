// Globals
var psiTurk = PsiTurk(uniqueId, adServerLoc);
var expCondition = condition; //from exp.html script
console.log("Exp. Condition" + expCondition);
var audioManager = new AudioManager();

//config
audioManager.pathPrefix = "/static/stimuli/";

//stages
var captcha = function(callback){
	showPage("captcha.html");

	var opts = {lines: 9, length: 0, width: 7, radius: 15, corners: 1, rotate: 0, direction: 1, color: '#fff', speed: 1.1, trail: 21, shadow: false, hwaccel: true, className: 'spinner', zIndex: 2e9, top: '50%', left: '50%'};
	var target = document.getElementById('spinner_wrapper');
	var spinner = new Spinner(opts).spin(target);

	var customCap = function () {
		$("#spinner_wrapper").hide();
		Recaptcha.focus_response_field();
	};

	Recaptcha.create(<<<YOUR RECAPTCHA SITE KEY GOES HERE>>>,"recaptcha",
	{
		theme : 'custom',
		custom_theme_widget: 'recaptcha_widget',
		callback: customCap
	});

	$playCaptcha = $("#playNewCaptcha");

	$playCaptcha.click(function(){
		Recaptcha.switch_type('audio');
		$(this).children().eq(1).text("Play new sound");
	});

	$('#replayCaptcha').click(Recaptcha.playAgain);

    //validation
    $("#recaptcha_response_field").keyup(function() {
    	if ($(this).val().length > 4){
    		$(".continue").prop('disabled', false);
    	} else {
    		$(".continue").prop('disabled', true);
    	}
    });

    $playCaptcha.popover({trigger:'manual',container: '#recaptcha_widget'});

    $(".continue").click(function(){
    	data = {challenge: $('#recaptcha_challenge_field').val(),
    	response: $('#recaptcha_response_field').val()};

    	$(".continue").html('Checking...');

    	$.ajax({
    		type: "POST",
    		contentType: "application/json; charset=utf-8",
    		url: '/checkCaptcha',
    		data: JSON.stringify(data, null, '\t'),
    		success: function(data){
    			if (data == "true"){
    				callback();
    			} else {
    				$(".continue").html('Check Captcha & Continue <span class="glyphicon glyphicon-arrow-right"></span>')
    				$playCaptcha.popover('show');
    				$playCaptcha.click(function(){$(this).popover('hide')});
    				window.setTimeout(function(){$playCaptcha.popover('hide')}, 3000);
    			}
    		}
    	});
    });
};

var fullscreen = (function() {
	var screenChangeCallback = function(){
		if (screenfull.isFullscreen) {
			$(".continue").prop('disabled', false).html("Continue <span class='glyphicon glyphicon-arrow-right'></span>");
			$(".goFullScreen").prop('disabled',true);
			$("#fullscreenWrapper").remove();
		} else {
			$(".continue").prop('disabled', true).text("Waiting for full screen...");
			$(".goFullScreen").prop('disabled',false);
			//P.I.T.A.: create the whole thing each time (showPage() replaces the whole body)
			//$("#fullscreenWrapper").show();
			$("body").append('<div class="noticeModalWrapper" id="fullscreenWrapper"> \
				<div class="noticeModal fullscreen well"> \
				<h3>Please Return to Full Screen</h3> \
				<div class="row"> \
				<button type="button" class="goFullScreen btn btn-primary"> \
				Enter Full Screen</button> \
				</div> \
				</div></div>');
			$('.goFullScreen').click( function () {
				if (screenfull.enabled) {
					screenfull.request();
				} else {
					console.log("fullscreen not supported");
				}
			});
		}
	};

	return {
		begin: function(callback){
			showPage("fullscreen.html");
			if(screenfull.enabled){
				document.addEventListener(screenfull.raw.fullscreenchange, screenChangeCallback);

				$('.goFullScreen').click( function () {
					if (screenfull.enabled) screenfull.request();
					else console.log("fullscreen not supported");
				});

				$(".continue").click(function(){callback();});
			}
		},
		end: function(callback){
			$("#fullscreenWrapper").remove();
			document.removeEventListener(screenfull.raw.fullscreenchange, screenChangeCallback);
			callback();
		}
	};
})();

var reqLoaded = function(loaders, callback){
	
	var isLoaded = true;
	var total = 0;
	var counts = [];
	var updateProg = function() {
		var prog = 0;
		counts.forEach(function(count){ prog += count; });
		//update dat prog bar with prog/total *100 %
		percProg = Math.round(prog/total*100) + "%";
		$("#loadingWrapper .progress-bar").width(percProg).text(percProg);
		if (prog == total) cleanUp();
	};

	var cleanUp = function() {
		//delete our modal
		$("#loadingWrapper").fadeOut(200, function(){
			$(this).remove();
			callback();
		});
		//TODO: remove our listeners
	};

	var setupEvent = function(i) {
		window.addEventListener(loaders[i].eventName, function(e){
			//attempt to keep the counts updated
			counts[i] = e.detail;
			updateProg();
		});
	};

	for (var i = 0; i < loaders.length; i++) {
		if (loaders[i].getCount() != loaders[i].total) {
			isLoaded = false;
			//once we find one, we don't need to iterate any more
			break;
		}
	}

	if (isLoaded) {
		callback();
	} else {

		//throw up a modal
		$("body").append('<div class="noticeModalWrapper" id="loadingWrapper"><div class="noticeModal loading well"><h3>Loading...</h3><div class="progress"> \
			<div class="progress-bar" role="progressbar" style="width: 0%; transition: none;"> \
			0% \
			</div> \
			</div></div></div>');

		//do some prep
		for (var i = 0; i < loaders.length; i++){
			total += loaders[i].total;
			counts.push(loaders[i].getCount());
			setupEvent(i);
		}

		//update a loading bar using an event handler
		updateProg();
	}

};

var idTrials = function(stimList, recordData, callback) {
	window.keypressed = {};
	var listening = false;
	var stims = _.shuffle(_.keys(stimList));
	var stim;

	var nextStim = function() {
		if (stims.length % 25 == 0) psiTurk.saveData();
		if (stims.length === 0) cleanup();
		else {
			stim = stims.pop();
			console.log(_.keys(stims).length + " trials left to go.");
			audioManager.play(_.sample(_.keys(babble))); //con random babble
			audioManager.play(stim, 0.250, function(){ //with 250ms ISI wait
				listening = true;
			});
		}
	};
	
	var response_handler = function(e) {
		if ( window.keypressed[e.which] ) e.preventDefault();
		else {
			if (listening && e.keyCode == 13) {
				//record response
				var response = $("#guess").val();
				listening = false;
				if (recordData){
					psiTurk.recordTrialData({'phase':"TEST",
						'word':stim,
						'response':response
					});
				}
				//clean up
				remove_word();
				//go next
				nextStim();
			}
			window.keypressed[e.which] = true;
		}
	};

	var remove_word = function() {
		//any destruction code
		$("#guess").val("");
	};

	var cleanup = function() {
		shyCursor.off();
		$("body").off(".id");
		callback();
	}

	shyCursor.on();

	// Load the stage.html snippet into the body of the page
	psiTurk.showPage('idStage.html');

	// Register the response handler that is defined above to handle any
	// key down events.
	$("#guess").focus().keydown(response_handler);
	$('#guess').keyup(function(e) {
		window.keypressed[e.which] = false;
	});
	$("body").on("click.id",function(){$("#guess").focus()});

	// Start the test
	nextStim();
};

var ldtTrials = function(stimList, recordData, callback) {

	window.keypressed = {};
	var stims = _.shuffle(_.keys(stimList));
	var curStimStartTime;
	var stim;
	var listening = false;

	var nextStim = function() {
		if (stims.length % 25 == 0) psiTurk.saveData();
		if (stims.length === 0) cleanup();
		else {
			stim = stims.pop();
			listening = false;
			curStimStartTime = audioManager.play(stim,
											 0.250, // ISI: units are seconds here
											 null,
											 function() { listening = true });
		}
	};


	var response_handler = function(e) {
		if ( window.keypressed[e.which] ) e.preventDefault();
		else {
			e.preventDefault();
			if (listening){
				var responseTime = audioManager.now();

				var response;

				if (e.keyCode == 9) {
					response = 'nonWord';
					$(".tab").addClass("kbd-down");
				}
				else if (e.keyCode == 220) {
					response = 'word';
					$(".backslash").addClass("kbd-down");
				}
				else return;

				//record response
				if (recordData){
					rt = (responseTime - curStimStartTime);
					psiTurk.recordTrialData({'phase':"TEST",
						'word':stim,
						'response':response,
						'reactionTime':rt
					});
				}

				//go next
				nextStim();
			}
			window.keypressed[e.which] = true;
		}		
	};

	var cleanup = function() {
		shyCursor.off();
		$("body").off(".ldt");
		callback();
	}

	shyCursor.on();

	// Load the stage.html snippet into the body of the page
	psiTurk.showPage('ldtStage.html');

	$("body").focus().on("keydown.ldt",response_handler);
	$("body").focus().on("keyup.ldt",function(e){
		window.keypressed[e.which] = false;
		if (e.keyCode == 9) $(".tab").removeClass("kbd-down");
		else if (e.keyCode == 220) $(".backslash").removeClass("kbd-down");
	});

	// Start the test
	nextStim();
};

var questionnaire = function() {

	var error_message = "<h1>Oops!</h1><p>Something went wrong submitting your HIT. This might happen if you lose your internet connection. Press the button to resubmit.</p><button id='resubmit'>Resubmit</button>";

	var radionames = ['multilingual','firstlang','usemost'];
	record_responses = function() {

		psiTurk.recordTrialData({'phase':'postquestionnaire', 'status':'submit'});

		radionames.forEach(function(name){
			var answer = $('input[name='+name+']:checked', '#postquiz').val();
			psiTurk.recordUnstructuredData(name, answer);		
		});
		
	};

	prompt_resubmit = function() {
		replaceBody(error_message);
		$("#resubmit").click(resubmit);
	};

	resubmit = function() {
		replaceBody("<h1>Trying to resubmit...</h1>");
		reprompt = setTimeout(prompt_resubmit, 10000);

		psiTurk.saveData({
			success: function() {
				clearInterval(reprompt); 
				finish();
			}, 
			error: prompt_resubmit
		});
	};

	// Load the questionnaire snippet 
	psiTurk.showPage('postquestionnaire.html');
	psiTurk.recordTrialData({'phase':'postquestionnaire', 'status':'begin'});
	
	$("input[type=radio]").click(function(){
		//check that we're done
		var notDone = false;
		radionames.forEach(function(name){
			var answer = $('input[name='+name+']:checked', '#postquiz').val();
			if (typeof answer === 'undefined') {
				notDone = true;
				return;
			}
		});

		$("#next").prop("disabled", notDone);

	})

	$("#next").click(function () {
		record_responses();
		psiTurk.saveData({
			success: function(){
                psiTurk.completeHIT(); // when finished saving quit
			}, 
			error: prompt_resubmit});
	});	
};


/***************
Preload
***************/

// manually set condition
// var expCondition = 0;

//funnel safari to LDT
if (isSafari()) expCondition = 1;

psiTurk.recordUnstructuredData('realCondition', expCondition)

if(expCondition == 0){ // ID
	psiTurk.preloadPages([
		"captcha.html",
		"fullscreen.html",
		"instructions/idInstructions.html",
		"instructions/idPretrial.html",
		"idStage.html",
		"postquestionnaire.html"
	]);
	var idLoaders = {
		babble	: audioManager.preloadSounds(babble, "babble"),
		practice: audioManager.preloadSounds(idPracticeStims, "practice"),
		words	: audioManager.preloadSounds(wordStims, "word")
	};
} else { //LDT
	psiTurk.preloadPages([
		"captcha.html",
		"fullscreen.html",
		"instructions/ldtInstructions.html",
		"instructions/ldtPretrial.html",
		"ldtStage.html",
		"postquestionnaire.html"
	]);
	var ldtLoaders = {
		practice: audioManager.preloadSounds(ldtPracticeStims, "practice"),
		words 	: audioManager.preloadSounds(wordStims, "word"),
		nonword	: audioManager.preloadSounds(nonWordStims, "nonword")
	};
}

/***********
Run
*************/

$(window).load( function(){

	//for readability
	var instruct = psiTurk.doInstructions;

	console.log("Current condition code:" + expCondition + ", Name: " + ["ID","LDT"][expCondition]);

	if (expCondition === 0) { //ID
		$(document)
		.queue(function(next){  captcha(						next);})
		.queue(function(next){  fullscreen.begin(					next);})
		.queue(function(next){  reqLoaded([idLoaders.practice,idLoaders.babble],	next);})
		.queue(function(next){  instruct(["instructions/idInstructions.html"],		next);})
		.queue(function(next){  idTrials(idPracticeStims,true,				next);})
		.queue(function(next){  reqLoaded([idLoaders.words],				next);})
		.queue(function(next){  instruct(["instructions/idPretrial.html"],		next);})
		.queue(function(next){  idTrials(wordStims,true,				next);})
		.queue(function(next){	fullscreen.end(						next);})
		.queue(function()    {  questionnaire()						     ;});
	} else { //LDT
		$(document)
		.queue(function(next){  captcha(						next);})
		.queue(function(next){  fullscreen.begin(					next);})
		.queue(function(next){  reqLoaded([ldtLoaders.practice],			next);})
		.queue(function(next){  instruct(["instructions/ldtInstructions.html"],		next);})
		.queue(function(next){  ldtTrials(ldtPracticeStims,true,			next);})
		.queue(function(next){  reqLoaded([ldtLoaders.words, ldtLoaders.nonword],	next);})
		.queue(function(next){  instruct(["instructions/ldtPretrial.html"],		next);})
		.queue(function(next){  ldtTrials(_.extend(wordStims,nonWordStims),true,	next);})
		.queue(function(next){	fullscreen.end(						next);})
		.queue(function()    {  questionnaire()						     ;});
	}
});
