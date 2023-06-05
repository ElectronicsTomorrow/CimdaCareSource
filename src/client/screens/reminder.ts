import * as THREE from 'three'
import * as Tools from '../global/global'
import * as client from '../client'
import * as BackOfficeDB from '../back_office/BackOffice_DB'
import {TWEEN} from 'three/examples/jsm/libs/tween.module.min'
import {constDef, VisitType} from '../screens_manager'
import {MsgType, DisplaceType, AnimType, SpeedFactor, ActionType, AnimationClip, DisplaceClip, SpeechClip} from '../tools/animateMC'
import {DropListScroller} from '../tools/drop_and_list'
import {constLimits} from '../global/global'
import {sayThis} from '../tools/sounds'
import {Players, stopWhateverGoingOn, GeneralAnims} from '../global/global'

////////////////////////////////////////////////////////////////////
// Local variables reference only in Reminder screen
////////////////////////////////////////////////////////////////////
var activeReminder:BackOfficeDB.Reminder;
var screenAlreadyInitialized = false;
var openingGreeting:string = '記得要根據時間表服藥呀';
var nxtMediAdvice:string;
var nxtMediRow:number;

////////////////////////////////////////////////////////////////////
// Upon entering the Reminder screen, this is the 1st function
////////////////////////////////////////////////////////////////////
export function launchReminderFunctions() {
    initAlarmList();
    deduceNxtMediAdvice();
    screensManager.showNavigationBar();
    hideRemindersList();
    startReminderEngine();
}

////////////////////////////////////////////////////////////////////
// Builds the Alarm list on the screen and the 2 arrow-scroll buttons
////////////////////////////////////////////////////////////////////
function initAlarmList() {
    if (screenAlreadyInitialized) {
        $alarmListScroller!.resetToScrollZero();
        return;
    }

    for(var i = 0;  i < Reminders.length;  i++) {
        var li:HTMLElement = document.createElement('li');
        li.innerHTML = '\<button class=\"reminder-alarmBtn\"\>' + convert24To12(Reminders[i].timeToTake as string) + '\<input type=\"checkbox\" id=\"switch' + i.toString() + '\" \/\>\<label for=\"switch' + i.toString() + '\"\>Toggle\<\/label\>\<\/button\>';
        li.className = 'reminder-alarmListItem';
        $reminder_alarmList!.appendChild(li);
    }

    $reminder_alarmList!.addEventListener("click", function(e) { handleReminderSelection(e);});

    screenAlreadyInitialized = true;
}

////////////////////////////////////////////////////////////////////
// Figuring out when is the next immediate medication time
////////////////////////////////////////////////////////////////////
function deduceNxtMediAdvice() {
    const currHH:number = new Date().getHours();
    const currMM:number = new Date().getMinutes();
    for(nxtMediRow = 0;  nxtMediRow < Reminders.length;  nxtMediRow++) {
        var timeToTakeHH:number = getHH(Reminders[nxtMediRow].timeToTake as string);
        var timeToTakeMM:number = getMM(Reminders[nxtMediRow].timeToTake as string);
        if (timeToTakeHH > currHH || (timeToTakeHH == currHH && timeToTakeMM > currMM)) {
            break;
        }
    }

    if (Reminders.length==0) {
        nxtMediAdvice = '今日' + currUsername + '冇需要用任何藥';
    } else if (nxtMediRow >= Reminders.length) {
        nxtMediAdvice = '今日' + currUsername + '嘅藥, 已經全部完成'
    } else {
        nxtMediAdvice = '下次' + currUsername + '服藥時間係' + convert24To12(Reminders[nxtMediRow].timeToTake as string);
    }
}
function startReminderEngine() {
    players.Default!.animateSeries.pushDisplace(new DisplaceClip({action: players.Default!.geneAnims[GeneralAnims.WALKING_FORWARD_POS], loop: THREE.LoopRepeat, animType: AnimType.OneShot, displaceType: DisplaceType.WalkForward, newPos: new THREE.Vector3(1.3,0,0), speedFactor: SpeedFactor.Walk, callBack: uponArrivalActorStand}));
    players.Default!.animateSeries.pushSpeech(new SpeechClip({action: players.Default!.geneAnims[GeneralAnims.POINTINGLEFTHIGH_POS], loop: THREE.LoopOnce, animType: AnimType.Relay, sayWhat: openingGreeting, callBack: scrollToNextMedi}));
    players.Default!.animateSeries.pushSpeech(new SpeechClip({action: players.Default!.geneAnims[GeneralAnims.STANDINGYELL_POS], loop: THREE.LoopRepeat, animType: AnimType.Relay, sayWhat: nxtMediAdvice}));
    players.Default!.animateSeries.pushAnimation(new AnimationClip({action: players.Default!.geneAnims[GeneralAnims.IDLE_POS], loop: THREE.LoopRepeat, animType: AnimType.OneShot}));
    players.Default!.msgOutPort.postMessage(MsgType.PerformAnimation);
}

////////////////////////////////////////////////////////////////////
// Once the MC character arrives the RHS, it gives an
// initial speech
////////////////////////////////////////////////////////////////////
function uponArrivalActorStand() {
    players.Default!.animateSeries.turnHeadToFaceDestination(new THREE.Vector3(1, players.Default!.mesh.position.y, 2));
    showRemindersList();
    players.Default!.msgOutPort.postMessage(MsgType.PerformAnimation);
}

////////////////////////////////////////////////////////////////////
// In addition to the initial speech, MC character will also
// search the alarm list and look for the next immediate
// medication and advise user
////////////////////////////////////////////////////////////////////
async function scrollToNextMedi() {
    while(--nxtMediRow >= 0) {
        $alarmListScroller!.scrollDownOneRow();
    }
    players.Default!.msgOutPort.postMessage(MsgType.PerformAnimation);
}

/////////////////////////////////////////////////////////////////////
// triggers the alarm when user clicks an item from list
/////////////////////////////////////////////////////////////////////
function handleReminderSelection(e:any) {
    var allTheButtons = $reminder_alarmList!.getElementsByTagName('button');
    for (var i = 0;  i < allTheButtons.length;  i++) {
        if (allTheButtons[i].innerHTML === e.target!.innerHTML) {
            break;
        }
    }

    if (i < allTheButtons.length) {
        activeReminder = Reminders[i];
        openAlarm();
        $reminder_alarmDetailClose!.addEventListener("click", closeAlarm);
    }
}

////////////////////////////////////////////////////////////////////
// Once alarm triggered, it will pull the alarm detail panel from
// top of screen
// This is done by jumping the MC character up and pull it down
////////////////////////////////////////////////////////////////////
async function openAlarm() {
    var isOpened = $reminder_alarmPanel!.classList.contains('slide-in-from-top');
    if (isOpened) {
        await closeAlarm();
    }

    $reminder_alarmDetailSimpleMediName!.innerHTML = activeReminder.simpleMediName as string;
    $reminder_alarmDetailHowToTake!.innerHTML = activeReminder.howToTake as string;
    $reminder_alarmDetailPrerequisite!.innerHTML = activeReminder.prerequisite as string;
    $reminder_alarmDetailMediPic!.src = 'img/Reminder/' + activeReminder.mediPic;

    players.Default!.animateSeries.pushAnimation(new AnimationClip({action: players.Default!.geneAnims[GeneralAnims.JUMPSTART_POS], loop: THREE.LoopOnce, animType: AnimType.Relay}));
    players.Default!.animateSeries.pushDisplace(new DisplaceClip({action: players.Default!.geneAnims[GeneralAnims.JUMPTRANSIT_POS], loop: THREE.LoopRepeat, animType: AnimType.Relay, displaceType: DisplaceType.Jump, newPos: new THREE.Vector3(players.Default!.mesh.position.x, 0.00005, players.Default!.mesh.position.z), speedFactor: SpeedFactor.Jump})); // if others, y = 0.16
    players.Default!.animateSeries.pushAnimation(new AnimationClip({action: players.Default!.geneAnims[GeneralAnims.SWINGIDLE_POS], loop: THREE.LoopOnce, animType: AnimType.Relay}));
    players.Default!.animateSeries.pushDisplace(new DisplaceClip({action: players.Default!.geneAnims[GeneralAnims.JUMPTRANSIT_POS], loop: THREE.LoopRepeat, animType: AnimType.OneShot, displaceType: DisplaceType.Jump, newPos: new THREE.Vector3(players.Default!.mesh.position.x, 0.000025, players.Default!.mesh.position.z), speedFactor: SpeedFactor.Jump, callBack: soundTheAlarm}));  // if others, y = 0.8
    players.Default!.animateSeries.pushDisplace(new DisplaceClip({action: players.Default!.geneAnims[GeneralAnims.LANDING_POS], loop: THREE.LoopOnce, animType: AnimType.OneShot, displaceType: DisplaceType.Jump, newPos: new THREE.Vector3(players.Default!.mesh.position.x, 0, players.Default!.mesh.position.z), speedFactor: SpeedFactor.Jump, callBack: announceAlarmDetails}));
    players.Default!.msgOutPort.postMessage(MsgType.PerformAnimation);
}

////////////////////////////////////////////////////////////////////
// Once the alarm panel is pulled out from the screen top
// sound the alarm
// But because this is only part of the presentation in a series of
// MC character jumping motion, performNextAnimation is needed in
// order to keep the animation going
////////////////////////////////////////////////////////////////////
function soundTheAlarm() {
    $reminder_alarmPanel!.style.visibility = 'visible';
    $reminder_alarmPanel!.setAttribute('class', 'slide-in-from-top');
    alarmClock.play();
    players.Default!.animateSeries.performNextAnimation();
}

////////////////////////////////////////////////////////////////////
// Upon alarm panel is pulled out, announce the details
////////////////////////////////////////////////////////////////////
async function announceAlarmDetails() {
    players.Default!.animateSeries.animate({action: players.Default!.geneAnims[GeneralAnims.STANDINGYELL_POS], loop: THREE.LoopRepeat, animType:AnimType.OneShot, callBack: null});
    await sayThis('夠鍾用藥喇' + currUsername + ', ' + convert24To12(activeReminder.timeToTake as string) + ', ' + activeReminder.simpleMediName);
    players.Default!.animateSeries.animate({action: players.Default!.geneAnims[GeneralAnims.IDLE_POS], loop: THREE.LoopRepeat, animType:AnimType.OneShot, callBack: null});
}

////////////////////////////////////////////////////////////////////
// This is triggerd when user press the 關閉 button
////////////////////////////////////////////////////////////////////
async function closeAlarm() {
    $reminder_alarmPanel!.setAttribute('class', 'slide-out-to-top');
    await Tools.wait(0.5*1000);
    $reminder_alarmPanel!.style.visibility = 'hidden';
}

function hideRemindersList() {
    $reminder_alarmListPanel!.style.visibility = 'hidden';
}
function showRemindersList() {
    $reminder_alarmListPanel!.style.visibility = 'visible';
}

function getHH(HHMM:string) {
    var theHour:number = parseInt(HHMM[0] + HHMM[1], 10);
    return( theHour );
}
function getMM(HHMM:string) {
    var theMinute:number = parseInt(HHMM[3] + HHMM[4], 10);
    return( theMinute );
}
function convert24To12(timeStr:string):string {
    const [hourString, minute] = timeStr.split(":");
    const hour = +hourString % 24;
    return String(hour % 12 || 12).padStart(2, '0') + ":" + minute + (hour < 12 ? " AM" : " PM");
}

////////////////////////////////////////////////////////////////////
// This section is called by the ScreensManager
// 1) when coming into this, what to do
// 2) when leaving this screen, what house keeping is needed
////////////////////////////////////////////////////////////////////
export function Leave() {
    setVisitOrLeave(VisitType.GoingAway);
}
export function Visit() {
    setVisitOrLeave(VisitType.EnterInto);
}

function setVisitOrLeave(visitType:VisitType) {
    if (visitType == VisitType.GoingAway) {
        stopWhateverGoingOn(players.Default!);
        hideRemindersList();
    }
}
