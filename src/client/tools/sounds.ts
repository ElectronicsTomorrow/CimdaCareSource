////////////////////////////////////////////////////////////////////
// For JQuery to work, do the followings :
// 1) npm install @types/jquery --save-dev // install jquery type as dev dependency so TS can compile properly
// 2) npm install jquery --save // save jquery as a dependency
////////////////////////////////////////////////////////////////////
import * as $ from "jquery";

////////////////////////////////////////////////////////////////////
// Constants used in Karaoke JSon file
////////////////////////////////////////////////////////////////////
const KARAOKE_SING_CHORUS:string = "chorus";
const KARAOKE_SING_SOLO:string = "solo";
const KARAOKE_SINGER_SEX_MALE = "M";
const KARAOKE_SINGER_SEX_FEMALE = "F";
const KARAOKE_MALE_LYRIC_COLOR = "blue";
const KARAOKE_FEMALE_LYRIC_COLOR = "red";
const KARAOKE_UNISEX_LYRIC_COLOR = "rgba(170,255,0, 1)";

enum KARAOKE_SING_TYPE {
    chorus   = 1,
    solo     = 2,
    mistaken = 3
}

////////////////////////////////////////////////////////////////////
// defines the Text to Speech functions
////////////////////////////////////////////////////////////////////
export var speech = new window.SpeechSynthesisUtterance();

export async function sayThis(sayWhat:string) {
    if (isSpeaking()) {
        cutTheCrab();
    }

    speech.text = sayWhat;
    window.speechSynthesis.speak(speech);
    return new Promise(resolve => {
        speech.onend = resolve;
    })
}
export function isSpeaking():boolean {
    return(window.speechSynthesis.speaking);
}
export function cutTheCrab() {
    window.speechSynthesis.cancel();
}


////////////////////////////////////////////////////////////////////
// defines the song which includes : title, equalizer, karaoke
////////////////////////////////////////////////////////////////////
class LyricLine {
    constructor(begin:string, end:string, sex:string, lyrics:string, newLine:string) {
        if (begin.length != 12) {
            console.log('Critical: Lyric begin time length != 12');
            this.lineIsGood = false;
            return;
        } else {
            this.begin = (Number(begin.substring(0,2)) * 60 * 60 * 1000) + (Number(begin.substring(3,5)) * 60 * 1000) + (Number(begin.substring(6,8)) * 1000) + Number(begin.substring(9,12));
        }

        if (end.length != 12) {
            console.log('Critical: Lyric end time length != 12');
            this.lineIsGood = false;
            return;
        } else {
            this.end = (Number(end.substring(0,2)) * 60 * 60 * 1000) + (Number(end.substring(3,5)) * 60 * 1000) + (Number(end.substring(6,8)) * 1000) + Number(end.substring(9,12));
        }

        this.duration = this.end - this.begin;

        if (sex.length == 0) {
            console.log('Critical: Lyric sex length == 0');
            this.lineIsGood = false;
        } else {
            this.sex = sex;
        }

        if (lyrics.length == 0) {
            console.log('Critical: Lyric length == 0');
            this.lineIsGood = false;
        } else {
            this.lyrics = lyrics;
        }

        if (newLine === "0") {
            this.newLine = false;
        } else if (newLine === "1") {
            this.newLine = true;
        } else {
            console.log('Critical: Lyric newLine != 0 && newLine != 1');
            this.lineIsGood = false;
        }
    }
    public lineIsGood:boolean = true;
    public begin:number = 0;
    public end:number = 0;
    public duration:number = 0;
    public sex:string = "";
    public lyrics:string = "";
    public newLine = true;
}

class Karaoke {
    constructor(lyricsRibbon:HTMLElement) {
        this._lyricsRibbon = lyricsRibbon;
        this._title = "";
        this._type = KARAOKE_SING_TYPE.mistaken;
        this._maleName = "";
        this._femaleName = "";
        this._lyricLines = [];
        this._currEndLine = -1;
        this._currBeginLine = -1;
        this._currSingerSex = "";
        this._lyricsLine = "";
        this._htmlLine = "";
        this._charIdxInLine = 0;
        this._charIdxInSection = 0;
        this._songAtTimeZero = -1;
        this._songElapsedTime = 0;
        this._playing = false;
        this.fileIsBad = false;
        this.errorMsg = "";
    }
    private _lyricsRibbon:HTMLElement | null;
    private _title:string;
    private _type:KARAOKE_SING_TYPE;
    private _maleName:string;
    private _femaleName:string;
    private _lyricLines:LyricLine[];
    private _currEndLine:number;
    private _currBeginLine:number;
    private _currSingerSex:string;
    private _lyricsLine:string;
    private _htmlLine:string;
    private _charIdxInLine;       // tracks each word in the complete line of lyrics
    private _charIdxInSection;    // some lines are broken down into different section, this index tracks the word in each section
    private _songAtTimeZero;
    private _songElapsedTime;
    private _playing:boolean;

    public fileIsBad:boolean;
    public errorMsg:string;

    public addLyricLine = (begin:string, end:string, sex:string, lyrics:string, newLine:string) => {
        var oneLyricLine:LyricLine = new LyricLine(begin, end, sex, lyrics, newLine);
        if (oneLyricLine.lineIsGood) {
            this._lyricLines!.push(oneLyricLine);
        } else {
            this.fileIsBad = true;
            this.errorMsg = '伴唱文件內容無效';
        }
    }
    public mountKaraokeFile = (audioSubfolder:string, title:string) => {
        this.fileIsBad = false;
        this.errorMsg = "";

        try {
            var Lyrics_JSon = require('../../../dist/client/' + audioSubfolder + title + '.JSon');
            this._title = Lyrics_JSon.Title;
            if (Lyrics_JSon.Type == KARAOKE_SING_CHORUS) {
                this._type = KARAOKE_SING_TYPE.chorus;
            } else if (Lyrics_JSon.Type == KARAOKE_SING_SOLO) {
                this._type = KARAOKE_SING_TYPE.solo;
            } else {
                this.fileIsBad = true;
                this.errorMsg = "伴唱文件內容合唱種類錯誤";
            }
            this._maleName = Lyrics_JSon.MaleName;
            this._femaleName = Lyrics_JSon.FemaleName;

            for(var i = 0;  i < Lyrics_JSon.LyricLines.length;  i++) {
                this.addLyricLine(Lyrics_JSon.LyricLines[i].begin, Lyrics_JSon.LyricLines[i].end, Lyrics_JSon.LyricLines[i].sex, Lyrics_JSon.LyricLines[i].lyrics, Lyrics_JSon.LyricLines[i].newline);
                if (this.fileIsBad) {
                    console.log('Critial : Lyric lines problem, line # = ' + i.toString());
                    return;
                }
            }
        } catch {
            this.fileIsBad = true;
            this.errorMsg = "這首歌暫時不支援伴唱";
        }
    }

    public dissolveLyrics = () => {
        while(this._lyricLines.length > 0) this._lyricLines.shift();

        this._lyricLines = [];
        this._currEndLine = -1;
        this._currBeginLine = -1;
        this._currSingerSex = "";
        this._lyricsLine = "";
        this._htmlLine = "";
        this._charIdxInLine = 0;
        this._charIdxInSection = 0;
        this._songAtTimeZero = -1;
        this._songElapsedTime = 0;
    }

    public unmountLyrics = () => {
        this._playing = false;
        this.dissolveLyrics();
        this._lyricsRibbon!.setAttribute('class', 'slide-out-to-right');
        this._songAtTimeZero = -1;
        this._songElapsedTime = 0;
    }

    public lyricsAlong = () => {
        var SynchronizedGap = (timeToSync:number):number => {
            this._songElapsedTime = Date.now() - this._songAtTimeZero;

            if (this._songElapsedTime > timeToSync) {
                return(0);
            } else if (timeToSync > this._songElapsedTime) {
                return(timeToSync - this._songElapsedTime);
            } else {
                return(300);
            }
        }

        var nextLine = ():string => {
            var oneLyricsLine = '';

            this._currBeginLine = this._currEndLine + 1;
            while(++this._currEndLine < this._lyricLines.length) {
                oneLyricsLine += this._lyricLines[this._currEndLine].lyrics;
                if (this._lyricLines[this._currEndLine].newLine == true) {
                    break;
                }
            }

            return(oneLyricsLine)
        }

        var nextWord = () => {
            if (!this._playing) {
                return;
            }

            var lyricColor:string = KARAOKE_UNISEX_LYRIC_COLOR;
            if (this._currSingerSex == KARAOKE_SINGER_SEX_MALE) {
                lyricColor = KARAOKE_MALE_LYRIC_COLOR;
            } else if (this._currSingerSex == KARAOKE_SINGER_SEX_FEMALE){
                lyricColor = KARAOKE_FEMALE_LYRIC_COLOR;
            }
            $("#LyricContent" + this._charIdxInLine.toString()).css("color", lyricColor);

            this._charIdxInSection++;
            this._charIdxInLine++;

            if (this._charIdxInSection > this._lyricLines[this._currBeginLine].lyrics.length - 1) {
                if (++this._currBeginLine > this._currEndLine) {    // if all the different sections of a line are processed, advnace to next karaoke line
                    setTimeout(composeNextSingPhrase, SynchronizedGap(this._lyricLines[this._currEndLine].end));
                } else {                                    // otherwise, loop to the next section of the same line
                    this._charIdxInSection = 0;
                    setTimeout(nextWord, SynchronizedGap(this._lyricLines[this._currBeginLine].begin));
                }
            } else {
                setTimeout(nextWord, this._lyricLines[this._currBeginLine].duration/this._lyricLines[this._currBeginLine].lyrics.length);
            }
        }

        var composeNextSingPhrase = () => {
            if (this._lyricLines.length == 0) {
                return;
            } else {
                this._htmlLine = "";
                this._currSingerSex = "";
                this._charIdxInLine = 0;
                this._charIdxInSection = 0;
            }

            this._lyricsLine = nextLine();
            if (this._lyricsLine.length == 0) {
                return;
            } else {
                this._currSingerSex = this._lyricLines[this._currBeginLine].sex;
                if (this._type == KARAOKE_SING_TYPE.chorus) {
                    var singerName:string = '合唱';

                    if (this._currSingerSex == KARAOKE_SINGER_SEX_MALE) {
                       singerName = '男唱';
                    } else if (this._currSingerSex == KARAOKE_SINGER_SEX_FEMALE) {
                       singerName = '女唱';
                    }

                    this._htmlLine = "<span style='font-size:3vw; color:rgba(90,90,90,1)'>" + '\(' + singerName + '\)&nbsp' + "</span> ";
                }
                for(var i = 0;  i < this._lyricsLine.length;  i++) {
                    this._htmlLine += "<span id='LyricContent"+i+"' style='font-size:6vw; color:rgba(235,236,240,1)'>" + this._lyricsLine[i] + "</span> ";
                }
                this._lyricsRibbon!.innerHTML = this._htmlLine;
            }

            if (this._songAtTimeZero == -1) {
                this._songAtTimeZero = Date.now();
                setTimeout(nextWord, this._lyricLines[this._currBeginLine].begin);
            } else {
                setTimeout(nextWord, SynchronizedGap(this._lyricLines[this._currBeginLine].begin));
            }
        }

        this._playing = true;
        composeNextSingPhrase();
    }
}

export class MP3Equalized {
    constructor(endEndedCallBack:Function, equalizerCanvas:HTMLCanvasElement, lyricsRibbon:HTMLElement) {
        this._audioPlayerMajor = new Audio();
        this._audioPlayerMinor = new Audio();
        this._audioPlayerMajor.volume = 1.00;
        this._audioPlayerMinor.volume = 0.15;
        this._audioSubfolder = '';
        this._title = '';
        this._audioMounted = false;
        this._playing = false;
        this._paused = false;
        this._audioPlayerMajor.addEventListener("ended", (Event) => {
            this._playing = false;
            this._paused = false;
            this._karaoke.unmountLyrics();
            endEndedCallBack();
        });
        // The following initializes the Equalizer
        this._equalizerCanvas = equalizerCanvas;
        this._audioContext = new AudioContext();
        this._analyser = this._audioContext.createAnalyser();
        this._analyContxt = this._equalizerCanvas.getContext("2d") as CanvasRenderingContext2D;
        this._mediaSourceMajor = this._audioContext.createMediaElementSource(this._audioPlayerMajor);
        this._mediaSourceMinor = this._audioContext.createMediaElementSource(this._audioPlayerMinor);
        this._mediaSourceMajor.connect(this._analyser);
        this._mediaSourceMinor.connect(this._analyser);
        this._analyser.connect(this._audioContext.destination);
        this._analyContxt.font = "36px serif";
        this._analyContxt.fillStyle = "rgba(255,0,255, 0.8)";
        this._analyContxt.textAlign = "right";
        this._analyContxt.textBaseline = "bottom";
        this._karaoke = new Karaoke(lyricsRibbon);
        this._lyricsRibbon = lyricsRibbon;

    }
    private _audioPlayerMajor:HTMLAudioElement;
    private _audioPlayerMinor:HTMLAudioElement;
    private _audioSubfolder:string;
    private _title:string;
    private _audioMounted:boolean;
    private _playing:boolean;
    private _paused: boolean;
    private _equalizerCanvas:HTMLCanvasElement;
    private _audioContext:AudioContext;
    private _analyser:AnalyserNode;
    private _analyContxt:CanvasRenderingContext2D;
    private _mediaSourceMajor:MediaElementAudioSourceNode;
    private _mediaSourceMinor:MediaElementAudioSourceNode;
    private _karaoke:Karaoke;
    private _lyricsRibbon:HTMLElement | null;

    public theTitle():string {return this._title}
    public isAudioMounted():boolean { return this._audioMounted; }
    public isPlaying():boolean { return this._playing; }
    public isPaused():boolean { return this._paused; }

    public mountAudio(title:string, audioSubfolder:string) {
        if (this._audioMounted) {
            this.abortCurrAudio();
        }
        this._title = title;
        this._audioSubfolder = audioSubfolder;

        this._audioMounted = true;
    }

    public async play() {
        if (!this._audioMounted) {
            return;
        } else if (!this._paused) {
            this._audioPlayerMajor.src = this._audioSubfolder + this._title + ".mp3";
        }
        await this._audioPlayerMajor.play();
        this._playing = true;
        this._paused = false;
    }

    public async fullKaraoke() {
        if (!this._audioMounted) {
            return;
        } else if (!this._paused) {
            this._audioPlayerMajor.src = this._audioSubfolder + this._title + "_Instrumental.mp3";
        }
        await this._audioPlayerMajor.play();
        this._playing = true;
        this._paused = false;
    }

    public async halfKaraoke() {
        if (!this._audioMounted) {
            return;
        } else if (!this._paused) {
            this._audioPlayerMajor.src = this._audioSubfolder + this._title + "_Instrumental.mp3";
            this._audioPlayerMinor.src = this._audioSubfolder + this._title + "_Vocals.mp3";
        }
        this._audioPlayerMajor.play();
        await this._audioPlayerMinor.play();
        this._playing = true;
        this._paused = false;
    }

    public async pause() {
        if (!this._audioMounted) {
            return;
        }
        if (!this._playing) {
            return;
        }
        if (this._audioPlayerMinor.src == "") {
            await this._audioPlayerMajor.pause();
        } else {
            this._audioPlayerMajor.pause();
            await this._audioPlayerMinor.pause();
        }

        this._playing = false;
        this._paused = true;
    }

    public stop() {
        if (!this._audioMounted) {
            return;
        }

        this.abortCurrAudio();
    }

    public informUser(infoMsg:string) {
        this._analyContxt.clearRect(0, 0, this._equalizerCanvas.width, this._equalizerCanvas.height);
        this._analyContxt.fillText(infoMsg, this._equalizerCanvas!.width, this._equalizerCanvas!.height);
    }
    private abortCurrAudio() {
        if (this._playing) {
            this._audioPlayerMajor.currentTime = 0;
            this._audioPlayerMinor.currentTime = 0;
            if (this._audioPlayerMinor.src == "") {
                this._audioPlayerMajor.pause();
            } else {
                this._audioPlayerMajor.pause();
                this._audioPlayerMinor.pause();
            }
        }

        this._karaoke.unmountLyrics();

        this._audioPlayerMajor.src = "";
        this._audioPlayerMinor.src = "";
        this._playing = false;
        this._paused = false;
    }

    public EqualizerFrameLooper = () => {
        if (!this._playing) {
            return;
        }

    	(window as any).RequestAnimationFrame =
    		window.requestAnimationFrame(this.EqualizerFrameLooper) ||
    		(window as any).msRequestAnimationFrame(this.EqualizerFrameLooper) ||
    		(window as any).mozRequestAnimationFrame(this.EqualizerFrameLooper) ||
    		(window as any).webkitRequestAnimationFrame(this.EqualizerFrameLooper);

        var fbc_array = new Uint8Array(this._analyser.frequencyBinCount);
        var bar_count = window.innerWidth / 2;

    	this._analyser.getByteFrequencyData(fbc_array);

    	this._analyContxt.clearRect(0, 0, this._equalizerCanvas.width, this._equalizerCanvas.height);
    	this._analyContxt.fillStyle = "rgba(255,0,255, 0.8)";

    	for (var i = 0; i < bar_count; i++) {
    		var bar_pos = i * 4;
    		var bar_width = 2;
    		var bar_height = -(fbc_array[i] / 2);

    		this._analyContxt.fillRect(bar_pos, this._equalizerCanvas.height, bar_width, bar_height);
    	}
    }

    public karaokeAlong = () => {
        this._lyricsRibbon!.style.visibility = 'visible';
        this._lyricsRibbon!.setAttribute('class', 'slide-in-from-right');

        this._karaoke.mountKaraokeFile(this._audioSubfolder, this._title);
        if (this._karaoke.fileIsBad) {
            this._lyricsRibbon!.style.color = 'rgba(255,0,0, 0.9)';
            this._lyricsRibbon!.innerHTML = this._karaoke.errorMsg;
        } else {
            this._karaoke.lyricsAlong();
        }
    }
}

////////////////////////////////////////////////////////////////////
// defines the Speech to Text functions
////////////////////////////////////////////////////////////////////
var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

export class VoiceToText {
    constructor(callBackFunc:Function) {
        this._speechRecognition = new SpeechRecognition();
        this._speechRecognition.continuous = false;
        this._speechRecognition.lang = 'zh-HK';
        this._speechRecognition.interimResults = false;
        this._speechRecognition.onresult = (event:any) => this.onResult(event);
        this._speechRecognition.onend = (event:any) => this.onEnd(event);
        this._speechRecognition.onspeechstart = (event:any) => this.onSpeechStart(event);
        this._speechRecognition.onerror = (event:any) => this.onError(event);
        this._speechRecognition.onnomatch = (event:any) => this.onNoMatch(event);
        this._callBackFunc = callBackFunc;
        this._hasDetectedSpeech = false;
    }

    private _speechRecognition;
    private _callBackFunc:Function;
    private _hasDetectedSpeech:boolean;

    private onResult = (event:any) => {
        var current = event.resultIndex;
        var transcript = event.results[current][0].transcript;

        this._callBackFunc(transcript);
    }

    private onSpeechStart = (event:any) => {
        this._hasDetectedSpeech = true;
    }

    private onEnd = (event:any) => {
        this._speechRecognition.stop();
    }

    private onNoMatch = (event:any) => {
        this._callBackFunc(null);
    }
    private onError = (event:any) => {
        if (event.error === "no-speech") {
            this._hasDetectedSpeech = false;
        } else {
            this._callBackFunc(null);
        }
    }

    public startListening() {
        this._hasDetectedSpeech = false;
        this._speechRecognition.start();
    }

    public stopListening() {
        this._speechRecognition.stop();
    }

    public nothingWasSpoken():boolean {
        return(this._hasDetectedSpeech === false);
    }
}

////////////////////////////////////////////////////////////////////
// defines the Microphone Visualizer
////////////////////////////////////////////////////////////////////
export class VoiceVisualizer {
    constructor() {
        this._canvas = null;
        this._isRunning = false;
        this._dimensionResetTimeout = null;
        this._audioContext = null;
        this._canvasContext = null;
        this._analyser = null;
    }
    private _canvas:HTMLCanvasElement | null;
    private _audioContext:AudioContext | null;
    private _isRunning:boolean;
    private _canvasContext:CanvasRenderingContext2D | null;
    private _analyser:AnalyserNode | null;
    private _dimensionResetTimeout:ReturnType<typeof setTimeout> | null;

    public init = (canvas:HTMLCanvasElement | null) => {
        this._canvas = canvas;

		navigator.mediaDevices.getUserMedia({audio: true})
		.then((stream:any) => {
				let source = this._audioContext!.createMediaStreamSource(stream);
				source.connect(this._analyser as AnalyserNode);
		})
		.catch((error:any) => {
				console.log('getUserMedia failed: ' + error);
		});

        this._audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this._canvasContext = this._canvas!.getContext('2d');
        this._analyser = this._audioContext.createAnalyser();
		this._analyser.minDecibels = -90;
		this._analyser.maxDecibels = -10;
		this._analyser.smoothingTimeConstant = 0.85;
    }

    public start = () => {
        this._isRunning = true;
		this._canvas!.style.visibility = 'visible';
        this.visualize();
    }

    public stop = () => {
		this._canvas!.style.visibility = 'hidden';
        this._isRunning = false;
    }

	public analyzeFrequency = (data:Uint8Array) => {
		let lastPos = 0;
		let pitchSamples:number[] = [];
		let lastItem = 0;
		data.forEach((item, i) => {
			if (item > 128 &&  lastItem <= 128) {
				const elapsedSteps = i - lastPos
				lastPos = i

				const hertz = 1 / (elapsedSteps / 44100)
				pitchSamples.push(hertz)
			}

			lastItem = item
		})
		pitchSamples.shift() //remove first sample because it is often an huge outlier
	}

	// uses timeout to prevent rapid dimensional reset
	public setDimensions = (width:number, height:number) => {
	    if (this._dimensionResetTimeout != null) {
		    clearTimeout(this._dimensionResetTimeout);
        }
		this._dimensionResetTimeout = setTimeout(() => {
			this._canvas!.width = width;
			if (height) {
				this._canvas!.height = height;
			}
		}, 100)
	}

    public processAudio = () => {
		var data:Uint8Array = new Uint8Array(this._analyser!.frequencyBinCount);
        this._analyser!.getByteTimeDomainData(data)
		return data
	}

	public simpleVisual = (data:Uint8Array) => {
		// simple wave form and frequency plots
		this._canvasContext!.beginPath();
		let interval = this._canvas!.width / data.length;
		let hScale = this._canvas!.height / 256;
		this._canvasContext!.strokeStyle = 'black';
		data.forEach((item, i) => {
            // plot waveform
            if (i == 0) {
                this._canvasContext!.moveTo(i*interval, item * hScale);
            } else {
                this._canvasContext!.lineTo(i*interval, item * hScale);
            }
		})
		this._canvasContext!.stroke();
	}

    public visualize = () => {
        if (this._isRunning) {
    	(window as any).RequestAnimationFrame =
    		window.requestAnimationFrame(this.visualize) ||
    		(window as any).msRequestAnimationFrame(this.visualize) ||
    		(window as any).mozRequestAnimationFrame(this.visualize) ||
    		(window as any).webkitRequestAnimationFrame(this.visualize);

            var data:Uint8Array = this.processAudio()
            this._canvasContext!.clearRect(0, 0, this._canvas!.width, this._canvas!.height)
            // execute current draw function
            this.simpleVisual(data);
        }
    }
}