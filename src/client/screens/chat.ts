import * as THREE from 'three'
import * as OpenCC from 'opencc-js'
import {VisitType} from '../screens_manager'
import {VoiceToText, VoiceVisualizer} from '../tools/sounds'
import {stopWhateverGoingOn, wait} from '../global/global'
import {MsgType, SpeedFactor, AnimType, DisplaceType, DisplaceClip, AnimationClip, SpeechClip} from '../tools/animateMC'
import {constLimits, GeneralAnims} from '../global/global'
import {sayThis} from '../tools/sounds'

////////////////////////////////////////////////////////////////////
// Question & Answers are all specified here
////////////////////////////////////////////////////////////////////
class ReplyAndAction {
    constructor(reply:string, actionHandler:Function | null) {
        this.reply = reply;
        this.actionHandler = actionHandler;
    }
    public reply:string;
    public actionHandler:Function | null;
}

// Important: be careful with the 你, because it will be modified after 你叫咩名
const OrigQandA = new Map<string, ReplyAndAction>([
    ["提示", new ReplyAndAction('右邊係我暫時明白嘅對話', tellCheatSheet)],
    ["tips", new ReplyAndAction('右邊係我暫時明白嘅對話', tellCheatSheet)],
    ["你好嗎", new ReplyAndAction('多謝你問候, 我今日好好, 希望你同樣咁好', null)],
    ["how do you do", new ReplyAndAction('多謝你問候, 我今日好好, 希望你同樣咁好', null)],
    ["你叫咩名", new ReplyAndAction('我個名係 Zimda Care, 我點稱呼你呀', acquireUsername)],
    ["what is your name", new ReplyAndAction('我個名係 Zimda Care, 我點稱呼你呀', acquireUsername)],
    ["打個關抖睇睇", new ReplyAndAction('好, 你睇下喇', flipAFlop)],
    ["please jump", new ReplyAndAction('好, 你睇下喇', flipAFlop)],
    ["而家幾多點", new ReplyAndAction('你睇右邊個鍾, 而家係', tellCurrTime)],
    ["what is the time", new ReplyAndAction('你睇右邊個鍾, 而家係', tellCurrTime)],
    ["今日幾多號", new ReplyAndAction('你睇右邊個日曆, 今日係', tellCurrDayOfMonth)],
    ["今日咩日子", new ReplyAndAction('你睇右邊個日曆, 今日係', tellCurrDayOfMonth)],
    ["what is the date", new ReplyAndAction('你睇右邊個日曆, 今日係', tellCurrDayOfMonth)],
    ["今日星期幾", new ReplyAndAction('你睇右邊個日曆, 今日係', tellCurrDayOfWeek)],
    ["which day of the week is it", new ReplyAndAction('你睇右邊個日曆, 今日係', tellCurrDayOfWeek)],
    ["我講你寫繁體", new ReplyAndAction('請你講, 我而家聽', tellTraditionalChinese)],
    ["tradition", new ReplyAndAction('請你講, 我而家聽', tellTraditionalChinese)],
    ["我講你寫簡體", new ReplyAndAction('請你講, 我而家聽', tellSimplifiedChinese)],
    ["simple", new ReplyAndAction('請你講, 我而家聽', tellSimplifiedChinese)]
]);
var QandA = new Map<string, ReplyAndAction>();

////////////////////////////////////////////////////////////////////
// Variables and constants for the Countdown microphone speech
////////////////////////////////////////////////////////////////////
var voiceVisualizer1 = new VoiceVisualizer();
var voiceVisualizer2 = new VoiceVisualizer();
var countdownTimer:any = null;
var MicrophoneBtnPrefix:string = '';
const UserSpeakDuration:number = 10;
const DefaultMicrophoneLabel:string = '按一下說話' + UserSpeakDuration + '秒';
const Listen1stMicrophoneLabel:string = '在聆聽中.........';
const Listen2ndMicrophoneLabel:string = '繼續聆聽中........';
const PendReplyMicrophoneLabel:string = '等待你答覆........';

////////////////////////////////////////////////////////////////////
// Variables for the digital clock
////////////////////////////////////////////////////////////////////
const hrArm = document.getElementById("chat-clock-hr");
const mnArm = document.getElementById("chat-clock-mn");
const scArm = document.getElementById("chat-clock-sc");
var clockTimer:any = null;

////////////////////////////////////////////////////////////////////
// Variables used by the Calendar
////////////////////////////////////////////////////////////////////
var currDate = new Date();
const Months = ["一月","二月","三月","四月","五月","六月","七月","八月","九月","十月","十一月","十二月"];
var calendarBoardActive:boolean = false;

////////////////////////////////////////////////////////////////////
// Variables used by traditional Chinese to simplified conversion
////////////////////////////////////////////////////////////////////
const TraditionalToSimplified = OpenCC.Converter({ from: 'hk', to: 'cn' });
var traditionalInProgress = false;
var simplifiedInProgress = false;
var translationBoardActive:boolean = false;


////////////////////////////////////////////////////////////////////
// Variables used by traditional Chinese to simplified conversion
////////////////////////////////////////////////////////////////////
var usernameInProgress:boolean = false;

////////////////////////////////////////////////////////////////////
// Voice to Text
////////////////////////////////////////////////////////////////////
var VVT:VoiceToText = new VoiceToText(uponUserFinishedSpeaking);

////////////////////////////////////////////////////////////////////
// General variables used by the Chat screen
////////////////////////////////////////////////////////////////////
var screenAlreadyInitialized = false;


////////////////////////////////////////////////////////////////////
// Upon entering the Chat screen, this is the 1st function
////////////////////////////////////////////////////////////////////
export function launchChatFunctions() {
    initChatElements();
    startChatEngine();
}

function initChatElements() {
    if (screenAlreadyInitialized) {
        return;
    }

    MicrophoneBtnPrefix = $chat_MicrophoneBtn!.innerHTML.substring(0,MicrophoneLastImg());
    $chat_MicrophoneBtn!.addEventListener("click", onClickedMicrophone);
    $chat_CalendarPrev!.addEventListener("click", advanceDatePrev);
    $chat_CalendarNext!.addEventListener("click", advanceDateNext);

    resetQandA();
    voiceVisualizer1.init($chat_MicPhoneVisualizer1);
    voiceVisualizer2.init($chat_MicPhoneVisualizer2);

    screenAlreadyInitialized = true;
}
function MicrophoneLastImg():number {
    var i:number = $chat_MicrophoneBtn!.innerHTML.length;

    while(--i >= 0) {
        if ($chat_MicrophoneBtn!.innerHTML[i] === '>') {
            break;
        }
    }
    return(i+1);
}

function startChatEngine() {
    players.Default!.animateSeries.pushDisplace(new DisplaceClip({action: players.Default!.geneAnims[GeneralAnims.WALKING_FORWARD_POS], loop: THREE.LoopRepeat, animType: AnimType.Relay, displaceType: DisplaceType.WalkForward, newPos: new THREE.Vector3(-1.5,0,0), speedFactor: SpeedFactor.Walk, callBack: uponArrivalActorStand}));
    players.Default!.animateSeries.pushSpeech(new SpeechClip({action: players.Default!.geneAnims[GeneralAnims.ONEHANDWAIVING_POS], loop: THREE.LoopOnce, animType: AnimType.Relay, sayWhat: '同我傾計'}));
    players.Default!.animateSeries.pushSpeech(new SpeechClip({action: players.Default!.geneAnims[GeneralAnims.POINTINGRIGHTHIGH_POS], loop: THREE.LoopOnce, animType: AnimType.Relay, sayWhat: '撳嗰個掣啦'}));
    players.Default!.animateSeries.pushAnimation(new AnimationClip({action: players.Default!.geneAnims[GeneralAnims.IDLE_POS], loop: THREE.LoopRepeat, animType: AnimType.OneShot}));
    players.Default!.msgOutPort.postMessage(MsgType.PerformAnimation);
}

////////////////////////////////////////////////////////////////////
// Once the MC character arrives the LHS, it gives an
// initial speech
////////////////////////////////////////////////////////////////////
function uponArrivalActorStand() {
    players.Default!.animateSeries.turnHeadToFaceDestination(new THREE.Vector3(0, 0, 3));
    players.Default!.animateSeries.performNextAnimation();
}

function onClickedMicrophone() {
    stopWhateverGoingOn(players.Default!);
    cleanupFloatingObjects();

    players.Default!.animateSeries.animate({action: players.Default!.geneAnims[GeneralAnims.LISTENING_POS], loop: THREE.LoopRepeat, animType:AnimType.OneShot, callBack: null});
    startCountdown(Listen1stMicrophoneLabel);
    VVT.startListening();
}

function cleanupFloatingObjects() {
    if (clockTimer != null) {
        clearInterval(clockTimer);
        clockTimer = null;
        $chat_ClockContainer!.setAttribute('class', 'chat-clock-fadeout');
    }

    if (calendarBoardActive) {
        $chat_Calendar!.setAttribute('class', 'slide-out-to-right');
        calendarBoardActive = false;
    }

    traditionalInProgress = false;
    simplifiedInProgress = false;
    if (translationBoardActive) {
        $chat_Translation!.setAttribute('class', 'slide-out-to-right');
        translationBoardActive = false;
    }

    usernameInProgress = false;
}

function startCountdown(MicrophoneLabel:string) { //counts time, takes seconds
    $chat_MicrophoneBtn!.innerHTML = MicrophoneBtnPrefix + MicrophoneLabel;
    $chat_MicrophoneBtn!.disabled = true;

    ConfirmationTone.play();

    $chat_CountdownCircle!.style.visibility = 'visible';
    $chat_CountdownCircle!.setAttribute('class', 'chat-countdown-fadein');
    voiceVisualizer1.start();
    voiceVisualizer2.start();

    let timeLeft:number;
    let remainTime = Date.now() + (UserSpeakDuration * 1000);
    displayTimeLeft(UserSpeakDuration);

    countdownTimer = setInterval(function() {
        timeLeft = Math.round((remainTime - Date.now()) / 1000);
        if (timeLeft < 0) {
            if (VVT.nothingWasSpoken()) {
                condemnEmptySpeech();
            }
            abortUserSpeech();
            return;
        }
        displayTimeLeft(timeLeft);
    }, 1000);
}

function update(value:number, timePercent:number) {
    var offset = - constLimits.COUNTDOWN_CIRCLE_LENGTH - constLimits.COUNTDOWN_CIRCLE_LENGTH * value / (timePercent);
    $chat_CountdownProgressBar!.style.strokeDashoffset = offset.toString();
    $chat_CountdownPointer!.style.transform = `rotate(${360 * value / (timePercent)}deg)`;
}
function displayTimeLeft(timeLeft:number) {
  let minutes = Math.floor(timeLeft / 60);
  let seconds = timeLeft % 60;
  let displayString = `${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  $chat_CountdownText!.textContent = displayString;
  update(timeLeft, UserSpeakDuration);
}

function uponUserFinishedSpeaking(whatWasSpoken:string | null) {
    abortUserSpeech();

    if (whatWasSpoken == null) {
        condemnErrorSpeech();
    } else if (whatWasSpoken.length == 0) {
        condemnEmptySpeech();
    } else if (usernameInProgress) {
        acknowledgeUsername(whatWasSpoken);
    } else if (traditionalInProgress || simplifiedInProgress) {
        showTranslatedChinese(whatWasSpoken);
    } else if (QandA.has(whatWasSpoken.toLowerCase())) {
        replyAI(QandA.get(whatWasSpoken.toLowerCase()) as ReplyAndAction);
    } else {
        condemnConfusingSpeech();
    }
}

function abortUserSpeech() {
    if (countdownTimer == null) {
        return;
    }

    $chat_MicrophoneBtn!.innerHTML = MicrophoneBtnPrefix + DefaultMicrophoneLabel;
    $chat_MicrophoneBtn!.disabled = false;

    clearInterval(countdownTimer);
    countdownTimer = null;
    $chat_CountdownText!.textContent = '完';
    $chat_CountdownCircle!.setAttribute('class', 'chat-countdown-fadeout');

    voiceVisualizer1.stop();
    voiceVisualizer2.stop();
    VVT.stopListening();
    players.Default!.animateSeries.animate({action: players.Default!.geneAnims[GeneralAnims.IDLE_POS], loop: THREE.LoopRepeat, animType:AnimType.OneShot, callBack: null});
}

function replyAI(replyAndAction:ReplyAndAction) {
    if (replyAndAction.actionHandler == null) {
        players.Default!.animateSeries.pushSpeech(new SpeechClip({action: players.Default!.geneAnims[GeneralAnims.SPEAKING_POS], loop: THREE.LoopRepeat, animType: AnimType.Relay, sayWhat: replyAndAction.reply}));
        players.Default!.animateSeries.pushAnimation(new AnimationClip({action: players.Default!.geneAnims[GeneralAnims.IDLE_POS], loop: THREE.LoopRepeat, animType: AnimType.OneShot}));
        players.Default!.msgOutPort.postMessage(MsgType.PerformAnimation);
    } else {
        replyAndAction.actionHandler(replyAndAction.reply);
    }
}

function condemnEmptySpeech() {
    players.Default!.animateSeries.pushSpeech(new SpeechClip({action: players.Default!.geneAnims[GeneralAnims.DONTUNDERSTAND_POS], loop: THREE.LoopRepeat, animType: AnimType.Relay, sayWhat: '點解'+currUsername+'好似冇講過嘢咁播'}));
    players.Default!.animateSeries.pushAnimation(new AnimationClip({action: players.Default!.geneAnims[GeneralAnims.IDLE_POS], loop: THREE.LoopRepeat, animType: AnimType.OneShot}));
    players.Default!.msgOutPort.postMessage(MsgType.PerformAnimation);
}

function condemnErrorSpeech() {
    players.Default!.animateSeries.pushSpeech(new SpeechClip({action: players.Default!.geneAnims[GeneralAnims.DONTUNDERSTAND_POS], loop: THREE.LoopRepeat, animType: AnimType.Relay, sayWhat: '對唔住, 我辨認唔倒'+currUsername+'嘅雜音'}));
    players.Default!.animateSeries.pushAnimation(new AnimationClip({action: players.Default!.geneAnims[GeneralAnims.IDLE_POS], loop: THREE.LoopRepeat, animType: AnimType.OneShot}));
    players.Default!.msgOutPort.postMessage(MsgType.PerformAnimation);
}

function condemnConfusingSpeech() {
    players.Default!.animateSeries.pushSpeech(new SpeechClip({action: players.Default!.geneAnims[GeneralAnims.DONTUNDERSTAND_POS], loop: THREE.LoopRepeat, animType: AnimType.Relay, sayWhat: '對唔住, 我聽唔明'+currUsername+'講乜嘢'}));
    players.Default!.animateSeries.pushAnimation(new AnimationClip({action: players.Default!.geneAnims[GeneralAnims.IDLE_POS], loop: THREE.LoopRepeat, animType: AnimType.OneShot}));
    players.Default!.msgOutPort.postMessage(MsgType.PerformAnimation);
}

////////////////////////////////////////////////////////////////////
// Response to user request: MC flips a flop
////////////////////////////////////////////////////////////////////
function flipAFlop(whatToReply:string) {
    players.Default!.animateSeries.pushSpeech(new SpeechClip({action: players.Default!.geneAnims[GeneralAnims.RUNTOFLIP_POS], loop: THREE.LoopOnce, animType: AnimType.Relay, sayWhat: whatToReply}));
    players.Default!.animateSeries.pushAnimation(new AnimationClip({action: players.Default!.geneAnims[GeneralAnims.IDLE_POS], loop: THREE.LoopRepeat, animType: AnimType.OneShot}));
    players.Default!.msgOutPort.postMessage(MsgType.PerformAnimation);
}

////////////////////////////////////////////////////////////////////
// Response to user request: Announce the current time together
//                           with a digital clock
////////////////////////////////////////////////////////////////////
function tellCurrTime(whatToReply:string) {
    var whatToSay = whatToReply + tellCurrHours12();
    var currTime = new Date();

    players.Default!.animateSeries.pushSpeech(new SpeechClip({action: players.Default!.geneAnims[GeneralAnims.POINTINGRIGHTMID_POS], loop: THREE.LoopOnce, animType: AnimType.Relay, sayWhat: whatToSay}));
    players.Default!.animateSeries.pushAnimation(new AnimationClip({action: players.Default!.geneAnims[GeneralAnims.IDLE_POS], loop: THREE.LoopRepeat, animType: AnimType.OneShot}));
    players.Default!.msgOutPort.postMessage(MsgType.PerformAnimation);

    const deg = 6;

    $chat_ClockContainer!.style.visibility = 'visible';
    $chat_ClockContainer!.setAttribute('class', 'chat-clock-fadein');
    clockTimer = setInterval(() => {
        currTime = new Date();
        let hh = currTime.getHours() * 30;
        let mm = currTime.getMinutes() * deg;
        let ss = currTime.getSeconds() * deg;

        hrArm!.style.transform = `rotateZ(${(hh)+(mm/12)}deg)`;
        mnArm!.style.transform = `rotateZ(${mm}deg)`;
        scArm!.style.transform = `rotateZ(${ss}deg)`;
    });
}
function tellCurrHours12():string {
    var currTime = new Date();
    var currHour:number = currTime.getHours();
    var currMin:number  = currTime.getMinutes();
    var hourStr:string = '';

    if (currHour >= 0 && currHour < 1) {
        hourStr = '午夜';
    } else if (currHour >= 1 && currHour <= 5) {
        hourStr = '零晨';
    } else if (currHour < 12) {
        hourStr = '早上';
    } else if (currHour == 12 && currMin == 0) {
        hourStr = '中午';
    } else if (currHour >= 12 && currHour < 13) {
        hourStr = '下午';
    } else if (currHour >= 13 && currHour < 18) {
        hourStr = '下午';
        currHour -= 12;
    } else if (currHour >= 18 && currHour < 23) {
        hourStr = '晚上';
        currHour -= 12;
    } else if (currHour >= 23) {
        hourStr = '午夜';
        currHour -= 12;
    }

    return(hourStr + currHour + '時' + currMin + '分');
}

////////////////////////////////////////////////////////////////////
// Response to user request: Announce the current date together
//                           with a calendar
////////////////////////////////////////////////////////////////////
function tellCurrDayOfMonth(whatToReply:string) {
    var dateStr:string = new Date().getDate() + '號';
    tellCurrDate(whatToReply, dateStr);
}
function tellCurrDayOfWeek(whatToReply:string) {
    var weekdayOfToday = new Date().getDay();
    var dateStr = '星期';

    switch(weekdayOfToday) {
        case 0:
            dateStr += '日';
            break;
        case 1:
            dateStr += '一';
            break;
        case 2:
            dateStr += '二';
            break;
        case 3:
            dateStr += '三';
            break;
        case 4:
            dateStr += '四';
            break;
        case 5:
            dateStr += '五';
            break;
        case 6:
            dateStr += '六';
            break;
    }

    tellCurrDate(whatToReply, dateStr);
}
function tellCurrDate(whatToReply:string, dateStr:string) {
    players.Default!.animateSeries.pushSpeech(new SpeechClip({action: players.Default!.geneAnims[GeneralAnims.POINTINGRIGHTMID_POS], loop: THREE.LoopOnce, animType: AnimType.Relay, sayWhat: whatToReply + dateStr}));
    players.Default!.animateSeries.pushAnimation(new AnimationClip({action: players.Default!.geneAnims[GeneralAnims.IDLE_POS], loop: THREE.LoopRepeat, animType: AnimType.OneShot}));
    players.Default!.msgOutPort.postMessage(MsgType.PerformAnimation);

    $chat_Calendar!.style.visibility = 'visible';
    $chat_Calendar!.setAttribute('class', 'slide-in-from-right');

    calendarBoardActive = true;
    RenderDate();
}


function RenderDate() {
    currDate.setDate(1);
    let day = currDate.getDay();

    let endDate = new Date(
        currDate.getFullYear(),
        currDate.getMonth() + 1,0
    ).getDate();

    let prevDate = new Date(
        currDate.getFullYear(),
        currDate.getMonth(),0
    ).getDate();

    let toDay = new Date()

    $chat_CalendarMonth!.innerHTML = Months[currDate.getMonth()];
    $chat_CalendarYear!.innerHTML = currDate.getFullYear().toString();

    let cells = '';

    for (let i = day; i > 0; i--) {
        cells+= "<div class='prev-days'>" + (prevDate -i +1) + "</div>";
    }

    for (let index = 1; index <= endDate; index++) {
        if (index == toDay.getDate() && currDate.getMonth() == toDay.getMonth()) {
            cells+= "<div class='activeday'>" + index + "</div>";
        } else {
            cells+= "<div>" + index + "</div>";
        }
    }
    $chat_CalendarDays![0].innerHTML = cells;
}

function advanceDatePrev() {
    currDate.setMonth(currDate.getMonth() -1);
    RenderDate();
};

function advanceDateNext() {
    currDate.setMonth(currDate.getMonth() +1);
    RenderDate();
}

////////////////////////////////////////////////////////////////////
// Response to user request: Translate traditional Chinese
////////////////////////////////////////////////////////////////////
function tellTraditionalChinese(whatToReply:string) {
    traditionalInProgress = true;
    listenToUserReply(whatToReply);
}
function tellSimplifiedChinese(whatToReply:string) {
    simplifiedInProgress = true;
    listenToUserReply(whatToReply);
}
function showTranslatedChinese(whatWasSpoken:string) {
    players.Default!.animateSeries.pushSpeech(new SpeechClip({action: players.Default!.geneAnims[GeneralAnims.POINTINGRIGHTMID_POS], loop: THREE.LoopOnce, animType: AnimType.Relay, sayWhat: currUsername + '睇下係唔係右邊咁'}));
    players.Default!.animateSeries.pushAnimation(new AnimationClip({action: players.Default!.geneAnims[GeneralAnims.IDLE_POS], loop: THREE.LoopRepeat, animType: AnimType.OneShot}));
    players.Default!.msgOutPort.postMessage(MsgType.PerformAnimation);

    $chat_Translation!.style.visibility = 'visible';
    $chat_Translation!.setAttribute('class', 'slide-in-from-right');
    translationBoardActive = true;

    if (traditionalInProgress) {
       traditionalInProgress = false;
        $chat_TranslationHeader!.innerHTML = '對你說話的理解';
        typeWriteText($chat_TranslatedText as HTMLElement, "7vh", whatWasSpoken);
    } else if (simplifiedInProgress) {
        simplifiedInProgress = false;
        $chat_TranslationHeader!.innerHTML = '对你说话的理解';
        typeWriteText($chat_TranslatedText as HTMLElement, "7vh", TraditionalToSimplified(whatWasSpoken));
    }
}

function tellCheatSheet(whatToReply:string) {
    players.Default!.animateSeries.pushSpeech(new SpeechClip({action: players.Default!.geneAnims[GeneralAnims.POINTINGRIGHTMID_POS], loop: THREE.LoopOnce, animType: AnimType.Relay, sayWhat: whatToReply}));
    players.Default!.animateSeries.pushAnimation(new AnimationClip({action: players.Default!.geneAnims[GeneralAnims.IDLE_POS], loop: THREE.LoopRepeat, animType: AnimType.OneShot}));
    players.Default!.msgOutPort.postMessage(MsgType.PerformAnimation);

    $chat_Translation!.style.visibility = 'visible';
    $chat_Translation!.setAttribute('class', 'slide-in-from-right');
    translationBoardActive = true;

    $chat_TranslationHeader!.innerHTML = '人工智能對話提示';

    var cheatSheet:string = '';
    QandA.forEach((value, key) => {
        cheatSheet += key + ', ';
    });
    cheatSheet = cheatSheet.substring(0, cheatSheet.length-2);
    typeWriteText($chat_TranslatedText as HTMLElement, "5vh", cheatSheet);
}

function typeWriteText(screenElement:HTMLElement, fontSize:string, completeText:string) {
    var i = 0;
    var speed = 50; /* The speed/duration of the effect in milliseconds */
    screenElement.style.fontSize = fontSize;
    screenElement.innerHTML = "";

    const typeWriter = () => {
        if (i < completeText.length && translationBoardActive) {
            screenElement.innerHTML += completeText.charAt(i);
            i++;
            setTimeout(typeWriter, speed);
        }
    }

    typeWriter();
}
////////////////////////////////////////////////////////////////////
// Response to user request: Acquiring user name
////////////////////////////////////////////////////////////////////
function acquireUsername(whatToReply:string) {
    usernameInProgress = true;
    resetQandA();
    listenToUserReply(whatToReply);
}
function acknowledgeUsername(whatWasSpoken:string) {
    usernameInProgress = false;
    currUsername = extractNameBestGuess(whatWasSpoken);

    players.Default!.animateSeries.pushSpeech(new SpeechClip({action: players.Default!.geneAnims[GeneralAnims.SPEAKING_POS], loop: THREE.LoopOnce, animType: AnimType.Relay, sayWhat: 'Hello ' + currUsername + ', 好榮幸你使用 Zimda Care'}));
    players.Default!.animateSeries.pushAnimation(new AnimationClip({action: players.Default!.geneAnims[GeneralAnims.IDLE_POS], loop: THREE.LoopRepeat, animType: AnimType.OneShot}));
    players.Default!.msgOutPort.postMessage(MsgType.PerformAnimation);

    replaceNameInQandA(currUsername);
}
function extractNameBestGuess(nameStr:string):string {
    var theBestGuess:string = nameStr;

    for(let i=nameStr.length-1;  i >= 0;  --i) {
        if (nameStr[i] == '做' && i < nameStr.length-1) {
            theBestGuess = nameStr.substring(i+1);
            break;
        } else if (nameStr[i] == '叫' && i < nameStr.length-1) {
            theBestGuess = nameStr.substring(i+1);
            break;
        } else if (nameStr[i] == '是' && i < nameStr.length-1) {
            theBestGuess = nameStr.substring(i+1);
            break;
        } else if (nameStr[i] == '係' && i < nameStr.length-1) {
            theBestGuess = nameStr.substring(i+1);
            break;
        }
    }

    return(theBestGuess);
}
function replaceNameInQandA(newName:string) {
    QandA.forEach((value, key) => {
        for(let i=0;  i < value.reply.length ;  i++) {
            if (value.reply[i] == '你') {
                var revisedReply;
                if (i == 0) {
                    revisedReply = newName + value.reply.substring(1);
                } else {
                    revisedReply = value.reply.substring(0, i) + newName + value.reply.substring(i+1);
                }
                value.reply = revisedReply;
                QandA.set(key, value);
            }
        }
    });
}
function resetQandA() {
    QandA.clear();

    OrigQandA.forEach((value, key) => {
        var replyAndAction:ReplyAndAction = new ReplyAndAction(value.reply, value.actionHandler);;
        QandA.set(key, replyAndAction);
    });
}

////////////////////////////////////////////////////////////////////
// Common function used by acquiring user's reply which the question
// is raised by Elderly MC
////////////////////////////////////////////////////////////////////
async function listenToUserReply(whatToReply:string) {
    $chat_MicrophoneBtn!.innerHTML = MicrophoneBtnPrefix + PendReplyMicrophoneLabel;
    $chat_MicrophoneBtn!.disabled = true;

    players.Default!.animateSeries.animate({action: players.Default!.geneAnims[GeneralAnims.SPEAKING_POS], loop: THREE.LoopRepeat, animType:AnimType.OneShot, callBack: null});
    await sayThis(whatToReply);     // Important: this 'await' must be kept, otherwise startingListening will fail because of less than 3500ms
    players.Default!.animateSeries.animate({action: players.Default!.geneAnims[GeneralAnims.LISTENING_POS], loop: THREE.LoopRepeat, animType:AnimType.OneShot, callBack: null});

    startCountdown(Listen2ndMicrophoneLabel);
    VVT.startListening();
}

////////////////////////////////////////////////////////////////////
// This section is called by the ScreensManager
// 1) when coming into this, what to do
// 2) when leaving this screen, what house keeping is needed
////////////////////////////////////////////////////////////////////
export function Leave() {
    abortUserSpeech();
    setVisitOrLeave(VisitType.GoingAway)
}

export function Visit() {
    setVisitOrLeave(VisitType.EnterInto);
}

function setVisitOrLeave(visitType:VisitType) {
    if (visitType == VisitType.GoingAway) {
        stopWhateverGoingOn(players.Default!);
        $chat_MicrophoneBtn!.style.visibility = 'hidden';
        $exercise_CountdownCircle!.setAttribute('class', 'chat-countdown-fadeout');
        $chat_CountdownCircle!.style.visibility = 'hidden';
        $chat_ClockContainer!.style.visibility = 'hidden';
        $chat_Calendar!.style.visibility = 'hidden';
        $chat_Translation!.style.visibility = 'hidden';
        cleanupFloatingObjects();
    } else if (visitType == VisitType.EnterInto) {
        $chat_MicrophoneBtn!.style.visibility = 'visible';
        $chat_CountdownCircle!.style.visibility = 'hidden';
        $chat_ClockContainer!.style.visibility = 'hidden';
        $chat_Calendar!.setAttribute('class', 'slide-out-to-right');
        $chat_Calendar!.style.visibility = 'hidden';
        $chat_Translation!.setAttribute('class', 'slide-out-to-right');
        $chat_Translation!.style.visibility = 'hidden';
    }
}

