/** Programmer: Chris Tralie */

/**
 * A canvas for switching between cover songs along  diagonals 
 * of a cross recurrence plot
 * @param {object} audio_obj - A dictionary of audio parameters, including 
 * 	a handle to the audio widget and a time interval between adjacent rows
 *  of the SSM, and the dimension "dim" of the SSM
 */
function CSMCanvas() {
	// GUI Elements
	this.CSImage = new Image;
	this.canvas = document.getElementById('CrossSimilarityCanvas');
	this.scoreTxt = document.getElementById("score");
	this.songnameTxt = document.getElementById("songname");
	this.csmctx = this.canvas.getContext('2d');
	this.fileInput = document.getElementById('fileInput');
	this.progressBar = new ProgressBar();
	
	// Information about what song is playing
	this.playing = false;
	this.playIdx = 0;
	this.audio_widgets = [new AudioObject(1, [], "Song 1"), new AudioObject(2, [], "Song 2")];
	
	// Variables for handling feature types
	this.selectFeatureType = document.getElementById("FeatureType");
	this.featureType = "";
	this.selectImageType = document.getElementById("ImageType");
	this.imageType = "CSM";
	this.FeatureCSMs = {};
	this.dimsUpdated = false;

	/**
	 * Update the CSM image to the currently selected feature type
	 * and display type
	 */
    this.updateSelectedImage = function() {
        if (this.featureType.length > 0) {
            this.CSImage.src = (this.FeatureCSMs[this.featureType])[this.imageType];
            this.dimsUpdated = false;
            requestAnimationFrame(this.updateCSMCanvas.bind(this));
            var score = this.FeatureCSMs[this.featureType].score;
            score = Math.round(score*1000)/1000;
            this.scoreTxt.innerHTML = score;
        }
	}

	this.playAudio = function() {
		this.playing = true;
		var audio1 = this.audio_widgets[this.playIdx];
		var audio2 = this.audio_widgets[(this.playIdx+1)%2];
		audio1.jumpToCurrentBeat();
		audio2.jumpToCurrentBeat();
		audio1.play();
		audio2.pause();
		audio1.btidx = 0;
		audio2.btidx = 0;
        requestAnimationFrame(this.updateCSMCanvas.bind(this));
	}

	this.pauseAudio = function() {
		this.playing = false;
		for (var i = 0; i < 2; i++) {
			this.audio_widgets[i].pause();
		}
	}

	//Functions to handle mouse motion
	this.releaseClickCSM = function(evt) {
		evt.preventDefault();
		var offsetidxs = [evt.offsetY, evt.offsetX];

		clickType = "LEFT";
		evt.preventDefault();
		if (evt.which) {
			if (evt.which == 3) clickType = "RIGHT";
			if (evt.which == 2) clickType = "MIDDLE";
		}
		else if (evt.button) {
			if (evt.button == 2) clickType = "RIGHT";
			if (evt.button == 4) clickType = "MIDDLE";
		}
		this.playIdx = 0;
		if (evt.button === 1) {
			this.playing = false;
			this.pauseAudio();
			return;
		}
		if (clickType == "RIGHT") {
			this.playIdx = 1;
		}
		if (this.playing) {
			this.audio_widgets[this.playIdx].jumpToBeat(offsetidxs[this.playIdx]);
			this.playAudio();
		}
		this.redrawCSMCanvas();
		return false;
	}

	this.makeClickCSM = function(evt) {
		evt.preventDefault();
		return false;
	}

	this.clickerDraggedCSM = function(evt) {
		evt.preventDefault();
		return false;
	}

	this.initCanvasHandlers = function() {
		var canvas = document.getElementById('CrossSimilarityCanvas');
		this.canvas.addEventListener("contextmenu", function(e){ e.stopPropagation(); e.preventDefault(); return false; }); //Need this to disable the menu that pops up on right clicking
		this.canvas.addEventListener('mousedown', this.makeClickCSM.bind(this));
		this.canvas.addEventListener('mouseup', this.releaseClickCSM.bind(this));
		this.canvas.addEventListener('mousemove', this.clickerDraggedCSM.bind(this));

		this.canvas.addEventListener('touchstart', this.makeClickCSM.bind(this));
		this.canvas.addEventListener('touchend', this.releaseClickCSM.bind(this));
		this.canvas.addEventListener('touchmove', this.clickerDraggedCSM.bind(this));

		this.canvas.addEventListener('contextmenu', function dummy(e) { return false });
	}

	this.initMenuHandlers = function() {
		this.selectFeatureType.addEventListener('change', function(e){
			this.featureType = e.target.value;
			this.updateSelectedImage();
		}.bind(this));

		this.selectImageType.addEventListener('change', function(e){
			this.imageType = e.target.value;
			this.updateSelectedImage();
		}.bind(this));

		this.fileInput.addEventListener('change', function(e) {
			var file = fileInput.files[0];
			var reader = new FileReader();
			reader.onload = function(e) {
				var Results = JSON.parse(reader.result);
				this.audio_widgets = [
					new AudioObject(1, Results.beats1, Results.song1name, Results.file1),
					new AudioObject(2, Results.beats2, Results.song2name, Results.file2)
				];
				this.FeatureCSMs = Results.FeatureCSMs;
	
				//Remove all feature types from the last time if they exit;
				for (var i = this.selectFeatureType.options.length - 1; i >= 0; i--) {
					this.selectFeatureType.remove(i);
				}
	
				for (val in Results.FeatureCSMs) {
					var option = document.createElement('option');
					option.text = val;
					this.selectFeatureType.add(option, val);
					this.featureType = val;
				}
				this.featureType = this.selectFeatureType.value; //Display the currently selected feature
				this.imageType = "CSM";
				this.updateSelectedImage();
				this.progressBar.changeToReady();
			}.bind(this)
			reader.readAsText(file);
		}.bind(this));
	}

	this.redrawCSMCanvas = function() {
		if (!this.CSImage.complete) {
			//Keep requesting redraws until the image has actually loaded
			requestAnimationFrame(this.redrawCSMCanvas.bind(this));
		}
		else {
			if (!this.dimsUpdated) {
				this.dimsUpdated = true;
				this.canvas.width = this.CSImage.width;
				this.canvas.height = this.CSImage.height;
			}
			this.csmctx.fillRect(0, 0, this.CSImage.width, this.CSImage.height);
			this.csmctx.drawImage(this.CSImage, 0, 0);
			this.csmctx.beginPath();
			if (this.playIdx == 0) {
				var idx = this.audio_widgets[0].btidx;
				this.csmctx.moveTo(0, idx);
				this.csmctx.lineTo(this.CSImage.width, idx);
			}
			else {
				var idx = this.audio_widgets[1].btidx;
				this.csmctx.moveTo(idx, 0);
				this.csmctx.lineTo(idx, this.CSImage.height);
			}
			this.csmctx.strokeStyle = '#0020ff';
			this.csmctx.stroke();
		}
	}

	this.updateCSMCanvas = function() {
		this.audio_widgets[this.playIdx].updateIdx();
		this.redrawCSMCanvas();
		if (this.playing) {
			requestAnimationFrame(this.updateCSMCanvas.bind(this));
		}
	}

	this.initCanvasHandlers();
	this.initMenuHandlers();
}