import * as THREE from 'three'
import * as DrawingUtils from "@mediapipe/drawing_utils"
import {MsgType} from '../tools/animateMC'
import {stopWhateverGoingOn, inBetween} from '../global/global'
import {Exercise, JointAnglesGuide} from '../back_office/BackOffice_DB'
import {constDef, VisitType} from '../screens_manager'
import {SpeedFactor, AnimType, DisplaceType, DisplaceClip, AnimationClip, SpeechClip} from '../tools/animateMC'
import {PlayerInfo, GeneralAnims, constLimits} from '../global/global'
import {POSE_CONNECTIONS, POSE_LANDMARKS_LEFT, POSE_LANDMARKS_RIGHT, POSE_LANDMARKS_NEUTRAL, POSE_LANDMARKS} from "@mediapipe/pose"
import {sayThis} from '../tools/sounds'
import {LandmarksGuide, ErrGestureType, MotionTrack, Timer} from '../tools/exercise_assist'

////////////////////////////////////////////////////////////////////
// Constant defines
////////////////////////////////////////////////////////////////////
const READINESS_TIME_LENGTH:number = 5.0;
const DONT_JUST_STAND_THERE_DO_NOTHING:string = '唔好企喺度, 開始做啦';
const ANGULAR_TOLERANCE:number = 30.0;
const DEFAULT_DROPDOWN_MSG:string = '請按這裡選擇運動...';

////////////////////////////////////////////////////////////////////
// Local variables
////////////////////////////////////////////////////////////////////
var activeExercise:Exercise | null = null;
var activeExerAnim:THREE.AnimationAction;
var screenAlreadyInitialized = false;
var lastCommentedTime:number = performance.now();
var lastCheckOutCameraTime:number = performance.now();
var lastCheckLandmarksTime:number = 0;
var userJointAngles:JointAnglesGuide = new JointAnglesGuide();
var worldJointAngles:JointAnglesGuide = new JointAnglesGuide();
var userLandmarks:LandmarksGuide = new LandmarksGuide();
var worldLandmarks:LandmarksGuide = new LandmarksGuide();
var motionTrack:MotionTrack = new MotionTrack();
var readinessTimer:Timer = new Timer(1200, readinessCountdownCallback);
var readinessCountDown:number;
var exerciseTimer:Timer = new Timer(1000, exerciseCountdownCallback);
var exerciseFutureMS:number;

////////////////////////////////////////////////////////////////////
// Upon entering the Exercise screen, this is the 1st function
////////////////////////////////////////////////////////////////////
export function launchExerciseFunctions() {
    screensManager.showNavigationBar();
    showSelectedExerciseInDropdown();
    initPoseEstimation();
    initExerciseList();
    slideInTheStages();
    startExerciseEngine();
}

function initExerciseList() {
    if (screenAlreadyInitialized) {
        return;
    }

    for(var i = 0;  i < Exercises.length;  i++) {
        var li:HTMLElement = document.createElement('li');
        li.innerHTML = '\<button class=\"exercise-dropdown-listitem-btn\"\>' + Exercises[i].titleChinese + '\<p class=\"exercise-dropdown-listitem-txt\"\>' + Exercises[i].durationStr + '\<\/p\>\<\/button\>';
        li.className = 'exercise-dropdown-listitem';
        $exercise_DropdownList!.appendChild(li);
    }

    $exercise_DropdownDriver!.addEventListener("click", onClickedDropdownDriver);
    $exercise_DropdownList!.addEventListener("click", function(e) { handleExerciseSelection(e);});
    $exercise_playBtn!.addEventListener("click", onClickedPlay);
    $exercise_stopBtn!.addEventListener("click", onClickedStop);

    $exercise_MP_Pose!.onResults(onResults);

    screenAlreadyInitialized = true;
}

function initPoseEstimation() {
    setPlayBtnState();
}

function onResults(results:any) {
    $exercise_canvasContext!.save();
    $exercise_canvasContext!.clearRect(0, 0, $exercise_poseEstimateCanvas!.width, $exercise_poseEstimateCanvas!.height);
    $exercise_canvasContext!.drawImage(results.image, 0, 0, $exercise_poseEstimateCanvas!.width, $exercise_poseEstimateCanvas!.height);

/*    if (results.poseLandmarks && exerciseTimer.isSet()) {
        DrawingUtils.drawConnectors($exercise_canvasContext!, results.poseLandmarks, POSE_CONNECTIONS, {lineWidth: 1, visibilityMin: 0.65, color: 'rgb(3,169,15)'});
        DrawingUtils.drawLandmarks($exercise_canvasContext!, Object.values(POSE_LANDMARKS_LEFT).map(index => results.poseLandmarks[index]), {radius: 1, lineWidth: 2, visibilityMin: 0.65, color: 'white', fillColor: 'white'});
        DrawingUtils.drawLandmarks($exercise_canvasContext!, Object.values(POSE_LANDMARKS_RIGHT).map(index => results.poseLandmarks[index]), {radius: 1, lineWidth: 2, visibilityMin: 0.65, color: 'white', fillColor: 'white'});
        DrawingUtils.drawLandmarks($exercise_canvasContext!, Object.values(POSE_LANDMARKS_NEUTRAL).map(index => results.poseLandmarks[index]), {radius: 1, lineWidth: 2, visibilityMin: 0.65, color: 'yellow', fillColor: 'yellow'});
    }
*/
    $exercise_canvasContext!.restore();

    if (results.poseLandmarks && exerciseTimer.isSet() && timeToCheckOutsideCamera() && !allLandmarksVisible(results)) {
        return;
    } else if (results.poseLandmarks && exerciseTimer.isSet()) {
        computeUserJointAngles(results);
        giveExpertComments();
    } else if (exerciseTimer.isSet() && timeToCheckOutsideCamera()) {
        commentThis('鏡頭睇你唔清楚, 請調整好');
    }
}

function computeUserJointAngles(results:any) {
        // attention: because of Selfie mode, LEFT & RIGHT are interchanged
        userLandmarks.shoulderLeft = [results.poseLandmarks[POSE_LANDMARKS_RIGHT.RIGHT_SHOULDER]['x'], results.poseLandmarks[POSE_LANDMARKS_RIGHT.RIGHT_SHOULDER]['y'], results.poseLandmarks[POSE_LANDMARKS_RIGHT.RIGHT_SHOULDER]['z']];
        userLandmarks.shoulderRight = [results.poseLandmarks[POSE_LANDMARKS_LEFT.LEFT_SHOULDER]['x'], results.poseLandmarks[POSE_LANDMARKS_LEFT.LEFT_SHOULDER]['y'], results.poseLandmarks[POSE_LANDMARKS_LEFT.LEFT_SHOULDER]['z']];
        userLandmarks.elbowLeft = [results.poseLandmarks[POSE_LANDMARKS_RIGHT.RIGHT_ELBOW]['x'], results.poseLandmarks[POSE_LANDMARKS_RIGHT.RIGHT_ELBOW]['y'], results.poseLandmarks[POSE_LANDMARKS_RIGHT.RIGHT_ELBOW]['z']];
        userLandmarks.elbowRight = [results.poseLandmarks[POSE_LANDMARKS_LEFT.LEFT_ELBOW]['x'], results.poseLandmarks[POSE_LANDMARKS_LEFT.LEFT_ELBOW]['y'], results.poseLandmarks[POSE_LANDMARKS_LEFT.LEFT_ELBOW]['z']];
        userLandmarks.wristLeft = [results.poseLandmarks[POSE_LANDMARKS_RIGHT.RIGHT_WRIST]['x'], results.poseLandmarks[POSE_LANDMARKS_RIGHT.RIGHT_WRIST]['y'], results.poseLandmarks[POSE_LANDMARKS_RIGHT.RIGHT_WRIST]['z']];
        userLandmarks.wristRight = [results.poseLandmarks[POSE_LANDMARKS_LEFT.LEFT_WRIST]['x'], results.poseLandmarks[POSE_LANDMARKS_LEFT.LEFT_WRIST]['y'], results.poseLandmarks[POSE_LANDMARKS_LEFT.LEFT_WRIST]['z']];
        userLandmarks.indexLeft = [results.poseLandmarks[POSE_LANDMARKS_RIGHT.RIGHT_INDEX]['x'], results.poseLandmarks[POSE_LANDMARKS_RIGHT.RIGHT_INDEX]['y'], results.poseLandmarks[POSE_LANDMARKS_RIGHT.RIGHT_INDEX]['z']];
        userLandmarks.indexRight = [results.poseLandmarks[POSE_LANDMARKS_LEFT.LEFT_INDEX]['x'], results.poseLandmarks[POSE_LANDMARKS_LEFT.LEFT_INDEX]['y'], results.poseLandmarks[POSE_LANDMARKS_LEFT.LEFT_INDEX]['z']];
        userLandmarks.hipLeft = [results.poseLandmarks[POSE_LANDMARKS_RIGHT.RIGHT_HIP]['x'], results.poseLandmarks[POSE_LANDMARKS_RIGHT.RIGHT_HIP]['y'], results.poseLandmarks[POSE_LANDMARKS_RIGHT.RIGHT_HIP]['z']];
        userLandmarks.hipRight = [results.poseLandmarks[POSE_LANDMARKS_LEFT.LEFT_HIP]['x'], results.poseLandmarks[POSE_LANDMARKS_LEFT.LEFT_HIP]['y'], results.poseLandmarks[POSE_LANDMARKS_LEFT.LEFT_HIP]['z']];
        userLandmarks.kneeLeft = [results.poseLandmarks[POSE_LANDMARKS_RIGHT.RIGHT_KNEE]['x'], results.poseLandmarks[POSE_LANDMARKS_RIGHT.RIGHT_KNEE]['y'], results.poseLandmarks[POSE_LANDMARKS_RIGHT.RIGHT_KNEE]['z']];
        userLandmarks.kneeRight = [results.poseLandmarks[POSE_LANDMARKS_LEFT.LEFT_KNEE]['x'], results.poseLandmarks[POSE_LANDMARKS_LEFT.LEFT_KNEE]['y'], results.poseLandmarks[POSE_LANDMARKS_LEFT.LEFT_KNEE]['z']];
        userLandmarks.ankleLeft = [results.poseLandmarks[POSE_LANDMARKS_RIGHT.RIGHT_ANKLE]['x'], results.poseLandmarks[POSE_LANDMARKS_RIGHT.RIGHT_ANKLE]['y'], results.poseLandmarks[POSE_LANDMARKS_RIGHT.RIGHT_ANKLE]['z']];
        userLandmarks.ankleRight = [results.poseLandmarks[POSE_LANDMARKS_LEFT.LEFT_ANKLE]['x'], results.poseLandmarks[POSE_LANDMARKS_LEFT.LEFT_ANKLE]['y'], results.poseLandmarks[POSE_LANDMARKS_LEFT.LEFT_ANKLE]['z']];

        userJointAngles.shoulderLeft = computeOneJointAngle(userLandmarks.hipLeft, userLandmarks.shoulderLeft, userLandmarks.elbowLeft);
        userJointAngles.shoulderRight = computeOneJointAngle(userLandmarks.hipRight, userLandmarks.shoulderRight, userLandmarks.elbowRight);
        userJointAngles.elbowLeft = computeOneJointAngle(userLandmarks.shoulderLeft, userLandmarks.elbowLeft, userLandmarks.wristLeft);
        userJointAngles.elbowRight = computeOneJointAngle(userLandmarks.shoulderRight, userLandmarks.elbowRight, userLandmarks.wristRight);
        userJointAngles.hipLeft = computeOneJointAngle(userLandmarks.shoulderLeft, userLandmarks.hipLeft, userLandmarks.kneeLeft);
        userJointAngles.hipRight = computeOneJointAngle(userLandmarks.shoulderRight, userLandmarks.hipRight, userLandmarks.kneeRight);
        userJointAngles.kneeLeft = computeOneJointAngle(userLandmarks.hipLeft, userLandmarks.kneeLeft, userLandmarks.ankleLeft);
        userJointAngles.kneeRight = computeOneJointAngle(userLandmarks.hipRight, userLandmarks.kneeRight, userLandmarks.ankleRight);


        worldLandmarks.shoulderLeft = [results.poseWorldLandmarks[POSE_LANDMARKS_RIGHT.RIGHT_SHOULDER]['x'], results.poseWorldLandmarks[POSE_LANDMARKS_RIGHT.RIGHT_SHOULDER]['y'], results.poseWorldLandmarks[POSE_LANDMARKS_RIGHT.RIGHT_SHOULDER]['z']];
        worldLandmarks.shoulderRight = [results.poseWorldLandmarks[POSE_LANDMARKS_LEFT.LEFT_SHOULDER]['x'], results.poseWorldLandmarks[POSE_LANDMARKS_LEFT.LEFT_SHOULDER]['y'], results.poseWorldLandmarks[POSE_LANDMARKS_LEFT.LEFT_SHOULDER]['z']];
        worldLandmarks.elbowLeft = [results.poseWorldLandmarks[POSE_LANDMARKS_RIGHT.RIGHT_ELBOW]['x'], results.poseWorldLandmarks[POSE_LANDMARKS_RIGHT.RIGHT_ELBOW]['y'], results.poseWorldLandmarks[POSE_LANDMARKS_RIGHT.RIGHT_ELBOW]['z']];
        worldLandmarks.elbowRight = [results.poseWorldLandmarks[POSE_LANDMARKS_LEFT.LEFT_ELBOW]['x'], results.poseWorldLandmarks[POSE_LANDMARKS_LEFT.LEFT_ELBOW]['y'], results.poseWorldLandmarks[POSE_LANDMARKS_LEFT.LEFT_ELBOW]['z']];
        worldLandmarks.wristLeft = [results.poseWorldLandmarks[POSE_LANDMARKS_RIGHT.RIGHT_WRIST]['x'], results.poseWorldLandmarks[POSE_LANDMARKS_RIGHT.RIGHT_WRIST]['y'], results.poseWorldLandmarks[POSE_LANDMARKS_RIGHT.RIGHT_WRIST]['z']];
        worldLandmarks.wristRight = [results.poseWorldLandmarks[POSE_LANDMARKS_LEFT.LEFT_WRIST]['x'], results.poseWorldLandmarks[POSE_LANDMARKS_LEFT.LEFT_WRIST]['y'], results.poseWorldLandmarks[POSE_LANDMARKS_LEFT.LEFT_WRIST]['z']];
        worldLandmarks.indexLeft = [results.poseWorldLandmarks[POSE_LANDMARKS_RIGHT.RIGHT_INDEX]['x'], results.poseWorldLandmarks[POSE_LANDMARKS_RIGHT.RIGHT_INDEX]['y'], results.poseWorldLandmarks[POSE_LANDMARKS_RIGHT.RIGHT_INDEX]['z']];
        worldLandmarks.indexRight = [results.poseWorldLandmarks[POSE_LANDMARKS_LEFT.LEFT_INDEX]['x'], results.poseWorldLandmarks[POSE_LANDMARKS_LEFT.LEFT_INDEX]['y'], results.poseWorldLandmarks[POSE_LANDMARKS_LEFT.LEFT_INDEX]['z']];
        worldLandmarks.hipLeft = [results.poseWorldLandmarks[POSE_LANDMARKS_RIGHT.RIGHT_HIP]['x'], results.poseWorldLandmarks[POSE_LANDMARKS_RIGHT.RIGHT_HIP]['y'], results.poseWorldLandmarks[POSE_LANDMARKS_RIGHT.RIGHT_HIP]['z']];
        worldLandmarks.hipRight = [results.poseWorldLandmarks[POSE_LANDMARKS_LEFT.LEFT_HIP]['x'], results.poseWorldLandmarks[POSE_LANDMARKS_LEFT.LEFT_HIP]['y'], results.poseWorldLandmarks[POSE_LANDMARKS_LEFT.LEFT_HIP]['z']];
        worldLandmarks.kneeLeft = [results.poseWorldLandmarks[POSE_LANDMARKS_RIGHT.RIGHT_KNEE]['x'], results.poseWorldLandmarks[POSE_LANDMARKS_RIGHT.RIGHT_KNEE]['y'], results.poseWorldLandmarks[POSE_LANDMARKS_RIGHT.RIGHT_KNEE]['z']];
        worldLandmarks.kneeRight = [results.poseWorldLandmarks[POSE_LANDMARKS_LEFT.LEFT_KNEE]['x'], results.poseWorldLandmarks[POSE_LANDMARKS_LEFT.LEFT_KNEE]['y'], results.poseWorldLandmarks[POSE_LANDMARKS_LEFT.LEFT_KNEE]['z']];
        worldLandmarks.ankleLeft = [results.poseWorldLandmarks[POSE_LANDMARKS_RIGHT.RIGHT_ANKLE]['x'], results.poseWorldLandmarks[POSE_LANDMARKS_RIGHT.RIGHT_ANKLE]['y'], results.poseWorldLandmarks[POSE_LANDMARKS_RIGHT.RIGHT_ANKLE]['z']];
        worldLandmarks.ankleRight = [results.poseWorldLandmarks[POSE_LANDMARKS_LEFT.LEFT_ANKLE]['x'], results.poseWorldLandmarks[POSE_LANDMARKS_LEFT.LEFT_ANKLE]['y'], results.poseWorldLandmarks[POSE_LANDMARKS_LEFT.LEFT_ANKLE]['z']];

        worldJointAngles.shoulderLeft = computeOneJointAngle(worldLandmarks.hipLeft, worldLandmarks.shoulderLeft, worldLandmarks.elbowLeft);
        worldJointAngles.shoulderRight = computeOneJointAngle(worldLandmarks.hipRight, worldLandmarks.shoulderRight, worldLandmarks.elbowRight);
        worldJointAngles.elbowLeft = computeOneJointAngle(worldLandmarks.shoulderLeft, worldLandmarks.elbowLeft, worldLandmarks.wristLeft);
        worldJointAngles.elbowRight = computeOneJointAngle(worldLandmarks.shoulderRight, worldLandmarks.elbowRight, worldLandmarks.wristRight);
        worldJointAngles.hipLeft = computeOneJointAngle(worldLandmarks.shoulderLeft, worldLandmarks.hipLeft, worldLandmarks.kneeLeft);
        worldJointAngles.hipRight = computeOneJointAngle(worldLandmarks.shoulderRight, worldLandmarks.hipRight, worldLandmarks.kneeRight);
        worldJointAngles.kneeLeft = computeOneJointAngle(worldLandmarks.hipLeft, worldLandmarks.kneeLeft, worldLandmarks.ankleLeft);
        worldJointAngles.kneeRight = computeOneJointAngle(worldLandmarks.hipRight, worldLandmarks.kneeRight, worldLandmarks.ankleRight);
}
function computeOneJointAngle(joint1:Array<number>, joint2:Array<number>, joint3:Array<number>):number {
    var joint1x = joint1[0];
    var joint1y = joint1[1];
    var joint2x = joint2[0];
    var joint2y = joint2[1];
    var joint3x = joint3[0];
    var joint3y = joint3[1];

    var joint12 = Math.sqrt(Math.pow(joint1x - joint2x, 2) + Math.pow(joint1y - joint2y, 2));
    var joint32 = Math.sqrt(Math.pow(joint3x - joint2x, 2) + Math.pow(joint3y - joint2y, 2));
    var joint13 = Math.sqrt(Math.pow((joint1x - joint3x), 2) + Math.pow((joint1y - joint3y), 2));
    var cosAngle = (joint12 * joint12 + joint32 * joint32 - joint13 * joint13) / (2 * joint12 * joint32);

    return(Math.acos(cosAngle) * 180 / Math.PI);
}

function allLandmarksVisible(results:any):boolean {
    var errPart:string = '';

    if (results.poseLandmarks[POSE_LANDMARKS_RIGHT.RIGHT_SHOULDER]['visibility'] < constLimits.LANDMARKS_VISIBILITY_MIN_VALUE)
        errPart = '左膊頭';
    if (results.poseLandmarks[POSE_LANDMARKS_LEFT.LEFT_SHOULDER]['visibility'] < constLimits.LANDMARKS_VISIBILITY_MIN_VALUE)
        errPart = '右膊頭';
    if (results.poseLandmarks[POSE_LANDMARKS_RIGHT.RIGHT_ELBOW]['visibility'] < constLimits.LANDMARKS_VISIBILITY_MIN_VALUE)
        errPart = '左手㬹';
    if (results.poseLandmarks[POSE_LANDMARKS_LEFT.LEFT_ELBOW]['visibility'] < constLimits.LANDMARKS_VISIBILITY_MIN_VALUE)
        errPart = '右手㬹';
    if (activeExercise!.titleChinese != '壓腿') {
        if (results.poseLandmarks[POSE_LANDMARKS_RIGHT.RIGHT_WRIST]['visibility'] < constLimits.LANDMARKS_VISIBILITY_MIN_VALUE)
            errPart = '左手腕';
        if (results.poseLandmarks[POSE_LANDMARKS_LEFT.LEFT_WRIST]['visibility'] < constLimits.LANDMARKS_VISIBILITY_MIN_VALUE)
            errPart = '右手腕';
        if (results.poseLandmarks[POSE_LANDMARKS_RIGHT.RIGHT_INDEX]['visibility'] < constLimits.LANDMARKS_VISIBILITY_MIN_VALUE)
            errPart = '左手指';
        if (results.poseLandmarks[POSE_LANDMARKS_LEFT.LEFT_INDEX]['visibility'] < constLimits.LANDMARKS_VISIBILITY_MIN_VALUE)
            errPart = '右手指';
    }
    if (results.poseLandmarks[POSE_LANDMARKS_RIGHT.RIGHT_HIP]['visibility'] < constLimits.LANDMARKS_VISIBILITY_MIN_VALUE)
        errPart = '左腰';
    if (results.poseLandmarks[POSE_LANDMARKS_LEFT.LEFT_HIP]['visibility'] < constLimits.LANDMARKS_VISIBILITY_MIN_VALUE)
        errPart = '右腰';
    if (results.poseLandmarks[POSE_LANDMARKS_RIGHT.RIGHT_KNEE]['visibility'] < constLimits.LANDMARKS_VISIBILITY_MIN_VALUE)
        errPart = '左膝';
    if (results.poseLandmarks[POSE_LANDMARKS_LEFT.LEFT_KNEE]['visibility'] < constLimits.LANDMARKS_VISIBILITY_MIN_VALUE)
        errPart = '右膝';
    if (results.poseLandmarks[POSE_LANDMARKS_RIGHT.RIGHT_ANKLE]['visibility'] < constLimits.LANDMARKS_VISIBILITY_MIN_VALUE)
        errPart = '左腳㬹';
    if (results.poseLandmarks[POSE_LANDMARKS_LEFT.LEFT_ANKLE]['visibility'] < constLimits.LANDMARKS_VISIBILITY_MIN_VALUE)
        errPart = '右腳㬹';

    if (errPart.length == 0) {
        return(true);
    } else {
        commentThis('見唔到'+ errPart + ',請調整鏡頭');
        return(false);
    }
}

function timeToCheckOutsideCamera():boolean {
    if (hasElapsed(lastCheckOutCameraTime, constLimits.CHECK_OUTSIDE_CAMERA_FREQUENCY)) {
        lastCheckOutCameraTime = performance.now();
        return(true);
    } else {
        return(false);
    }
}

function slideInTheStages() {
    $exercise_demoStage!.style.visibility = 'visible';
    $exercise_demoStage!.setAttribute('class', 'slide-in-from-left');
}

function onClickedDropdownDriver() {
    if ($exerciseListScroller!.isDroppedDown()) {
        $exerciseListScroller!.collapseDropdownList();
    } else if (readinessTimer.isNotSet() && exerciseTimer.isNotSet()) {
        $exerciseListScroller!.expandDropdownList();
    }
}

/////////////////////////////////////////////////////////////////////
// Simply reports the selected Exercise to the dropdown driver
/////////////////////////////////////////////////////////////////////
function handleExerciseSelection(e:any) {
    var allTheButtons = $exercise_DropdownList!.getElementsByTagName('button');
    for (var i = 0;  i < allTheButtons.length;  i++) {
        if (allTheButtons[i].innerHTML === e.target!.innerHTML) {
            break;
        }
    }

    $exerciseListScroller!.collapseDropdownList();

    if (i < allTheButtons.length) {
        activeExercise = Exercises[i];
        activeExerAnim = players.Default!.exerAnims[i];
        announceSelectedExercise();
        setPlayBtnState();
    }
}

async function announceSelectedExercise() {
    await stopWhateverGoingOn(players.Default!);
    showSelectedExerciseInDropdown();
    players.Default!.animateSeries.animate({action: players.Default!.geneAnims[GeneralAnims.STANDINGYELL_POS], loop: THREE.LoopRepeat, animType:AnimType.OneShot, callBack: null});
    await sayThis(activeExercise!.titleChinese + ',' + activeExercise!.durationStr);
    commentThis(activeExercise!.animateIntro + ',撳播放開始');
    players.Default!.animateSeries.animate({action: players.Default!.geneAnims[GeneralAnims.ARMSTRETCHING_POS], loop: THREE.LoopRepeat, animType:AnimType.OneShot, callBack: null});
}

function onClickedPlay() {
    if (activeExercise != null) {
        $exerciseListScroller!.collapseDropdownList();
        stopWhateverGoingOn(players.Default!);
        $exercise_playBtn!.style.visibility = 'hidden';
        $exercise_stopBtn!.style.visibility = 'visible';
        $exercise_poseEstComments!.innerHTML = "";
        players.Default!.animateSeries.turnHeadToFaceDestination(new THREE.Vector3(3, 0, 1));
        players.Default!.animateSeries.pushAnimation(new AnimationClip({action: players.Default!.geneAnims[GeneralAnims.COUNTING_1TO5_POS], loop: THREE.LoopOnce, animType: AnimType.OneShot}));
        players.Default!.msgOutPort.postMessage(MsgType.PerformAnimation);
        startReadinessCountdown();
    }
}
function startReadinessCountdown() {
    let currAnnouncement = READINESS_TIME_LENGTH;

    $exercise_CountdownCircle!.style.visibility = 'hidden';
    $exercise_readinessCountdown!.innerHTML = "";
    $exercise_readinessCountdown!.setAttribute('class', 'countdown-number-reset');
    $exercise_readinessCountdown!.style.visibility = 'visible';

    readinessCountDown = READINESS_TIME_LENGTH;
    readinessTimer.start();
}
function readinessCountdownCallback() {
    displayReadinessTimeLeft(readinessCountDown);
    if (readinessCountDown == 0) {
        readinessTimer.clear();
        $exercise_readinessCountdown!.style.visibility = 'hidden';
        kickStartExercise();
    } else {
        --readinessCountDown;
    }
}
async function displayReadinessTimeLeft(timeLeft:number) {
    $exercise_readinessCountdown!.innerHTML = timeLeft.toString();
    $exercise_readinessCountdown!.setAttribute('class', 'countdown-number-bulger');
    await sayThis(timeLeft.toString());
    $exercise_readinessCountdown!.setAttribute('class', 'countdown-number-reset');
}

function kickStartExercise() {
    players.Default!.animateSeries.turnHeadToFaceDestination(new THREE.Vector3(0, 0, 3));
    commentThis('開始,請保持身體在方框內');
    lastCommentedTime = performance.now();
    lastCheckOutCameraTime = performance.now();
    motionTrack.resetAll();
    $exercise_CountdownCircle!.style.visibility = 'visible';
    $exercise_CountdownCircle!.setAttribute('class', 'exercise-countdown-fadein');
    players.Default!.animateSeries.animate({action: activeExerAnim, loop: THREE.LoopRepeat, animType:AnimType.OneShot, callBack: null});
    startExerciseCountdown(activeExercise!.durationTime as number);
}
function startExerciseCountdown(seconds:number) {
    let secondsRemain:number;
    let msFutureTime = Date.now() + (seconds * 1000);

    displayExerciseTimeLeft(seconds);

    exerciseFutureMS = Date.now() + (seconds * 1000);
    exerciseTimer.start();
}
function exerciseCountdownCallback() {
    var secondsRemain:number = Math.round((exerciseFutureMS - Date.now()) / 1000);
    if (secondsRemain < 0)
        abortExercise('完滿結束');
    else
        displayExerciseTimeLeft(secondsRemain);
}
function update(value:number, timePercent:number) {
    var offset = - constLimits.COUNTDOWN_CIRCLE_LENGTH - constLimits.COUNTDOWN_CIRCLE_LENGTH * value / (timePercent);
    $exercise_CountdownProgressBar!.style.strokeDashoffset = offset.toString();
    $exercise_CountdownPointer!.style.transform = `rotate(${360 * value / (timePercent)}deg)`;
}
function displayExerciseTimeLeft(timeLeft:number) {
  let minutes = Math.floor(timeLeft / 60);
  let seconds = timeLeft % 60;
  let displayString = `${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  $exercise_CountdownText!.textContent = displayString;
  update(timeLeft, activeExercise!.durationTime as number);
}

function onClickedStop() {
    $exerciseListScroller!.collapseDropdownList();
    abortExercise('取消運動');
}

function abortExercise(abortMsg:string | null = null) {
    if (readinessTimer.isSet()) {
        readinessTimer.clear();
        $exercise_readinessCountdown!.style.visibility = 'hidden';
    } else if (exerciseTimer.isSet()) {
        exerciseTimer.clear();
        $exercise_CountdownCircle!.setAttribute('class', 'exercise-countdown-fadeout');
    } else {
        return;
    }

    if (abortMsg != null) {
        $exercise_CountdownText!.textContent = '完';
        $exercise_poseEstComments!.innerHTML = abortMsg;
        sayThis(abortMsg);

        $exercise_playBtn!.style.visibility = 'visible';
        $exercise_stopBtn!.style.visibility = 'hidden';

        players.Default!.animateSeries.turnHeadToFaceDestination(new THREE.Vector3(0, 0, 3));
        players.Default!.animateSeries.animate({action: players.Default!.geneAnims[GeneralAnims.ARMSTRETCHING_POS], loop: THREE.LoopRepeat, animType: AnimType.OneShot, callBack: null});
    }
}

function showSelectedExerciseInDropdown() {
    if (activeExercise == null) {
        $exercise_DropdownDriver!.innerHTML = DEFAULT_DROPDOWN_MSG;
    } else {
        $exercise_DropdownDriver!.innerHTML = activeExercise.titleChinese + '\<p class=\"exercise-dropdown-driver-suffix\"\>' + activeExercise.durationStr + '\<\/p\>';
    }
}

////////////////////////////////////////////////////////////////////
// Kick start the entire process with a chain of opening animations
////////////////////////////////////////////////////////////////////
function startExerciseEngine() {
    players.Default!.animateSeries.pushDisplace(new DisplaceClip({action: players.Default!.geneAnims[GeneralAnims.WALKING_FORWARD_POS], loop: THREE.LoopRepeat, animType: AnimType.OneShot, displaceType: DisplaceType.WalkForward, newPos: new THREE.Vector3(-1.20,0,0.3), speedFactor: SpeedFactor.Walk, callBack: uponArrivalActorStand}));
    players.Default!.animateSeries.pushSpeech(new SpeechClip({action: players.Default!.geneAnims[GeneralAnims.POINTINGUP_POS], loop: THREE.LoopOnce, animType: AnimType.Relay, sayWhat: currUsername + '撳嗰個掣揀運動啦'}));
    players.Default!.animateSeries.pushAnimation(new AnimationClip({action: players.Default!.geneAnims[GeneralAnims.ARMSTRETCHING_POS], loop: THREE.LoopRepeat, animType: AnimType.OneShot}));
    players.Default!.animateSeries.msgOutPort.postMessage(MsgType.PerformAnimation);
}

function setPlayBtnState() {
    if (activeExercise == null || cameraUnavailable) {
        $exercise_playBtn!.disabled = true;
    } else {
        $exercise_playBtn!.disabled = false;
    }
}
////////////////////////////////////////////////////////////////////
// Once the MC character arrives the LHS, it gives an
// initial speech
////////////////////////////////////////////////////////////////////
function uponArrivalActorStand() {
    players.Default!.animateSeries.turnHeadToFaceDestination(new THREE.Vector3(0, 0, 3));
    players.Default!.animatePerformIdle();;
    $exercise_playBtn!.style.visibility = 'visible';
    $exercise_poseEstimateStage!.style.visibility = 'visible';
    $exercise_poseEstimateStage!.setAttribute('class', 'slide-in-from-right');
    if (cameraUnavailable) {
        $exercise_poseEstimateStage!.style.background = 'rgba(255,255,255, 0.6)';
        $exercise_poseEstUnavailable!.style.visibility = 'visible';
        $exercise_poseEstComments!.style.visibility = 'hidden';
    } else {
        $exercise_poseEstimateStage!.style.background = 'transparent';
        $exercise_poseEstUnavailable!.style.visibility = 'hidden';
        $exercise_poseEstComments!.style.visibility = 'visible';
    }
    players.Default!.animateSeries.performNextAnimation();
}

function giveExpertComments() {
    switch(activeExercise!.titleChinese) {
        case '伸展手':
            commentStretchingArms();
            break;
        case '壓腿':
            commentLegPressing();
            break;
        case '手繞環':
            commentArmCircle();
            break;
        case '抬腿':
            commentLiftingLegs();
            break;
        case '深蹲':
            commentSquatting();
            break;
        case '舉手':
            commentRaisingHands();
            break;
        default:
            break;
    }
}

function commentStretchingArms() {
    captureReferenceSpine();
    if (isStandingStill()) {
        return;
    }

    const STRETCHINGARMS_MAX_ERR_CNT:number = 15;
    const STRETCHINGARMS_JOINT_TOLERANCE:number = 20;

    var indexLeftY:number = worldLandmarks.indexLeft[1], indexRightY:number = worldLandmarks.indexRight[1];
    var shoulderLeftY:number = worldLandmarks.shoulderLeft[1], shoulderRightY:number = worldLandmarks.shoulderRight[1];
    var hipLeftZ:number = worldLandmarks.shoulderLeft[2], hipRightZ:number = worldLandmarks.shoulderRight[2];
    var shoulderLeftZ:number = worldLandmarks.shoulderLeft[2], shoulderRightZ:number = worldLandmarks.shoulderRight[2];

    var indexLeftBelowShoulder:boolean = (userLandmarks.indexLeft[1] - userLandmarks.shoulderLeft[1]) > 0.1;
    var indexRightBelowShoulder:boolean = (userLandmarks.indexRight[1] - userLandmarks.shoulderRight[1]) > 0.1;
    var handLeftTooHigh:boolean = (indexLeftY < shoulderLeftY) && Math.abs(indexLeftY - shoulderLeftY) > 0.1;
    var handRightTooHigh:boolean = (indexRightY < shoulderRightY) && Math.abs(indexRightY - shoulderRightY) > 0.1;
    var armLeftTooLow:boolean = (userJointAngles.shoulderLeft < (activeExercise!.jointAnglesGuide!.shoulderLeft - STRETCHINGARMS_JOINT_TOLERANCE));
    var armLeftTooHigh:boolean = (userJointAngles.shoulderLeft > (activeExercise!.jointAnglesGuide!.shoulderLeft + STRETCHINGARMS_JOINT_TOLERANCE));
    var armRightTooLow:boolean = (userJointAngles.shoulderRight < (activeExercise!.jointAnglesGuide!.shoulderRight - STRETCHINGARMS_JOINT_TOLERANCE));
    var armRightTooHigh:boolean = (userJointAngles.shoulderRight > (activeExercise!.jointAnglesGuide!.shoulderRight + STRETCHINGARMS_JOINT_TOLERANCE));
    var hipLeftNotStraight:boolean = userJointAngles.hipLeft < 160 || hipSeemsNotStraight(userLandmarks.shoulderLeft[1]);
    var hipRightNotStraight:boolean = userJointAngles.hipRight < 160 || hipSeemsNotStraight(userLandmarks.shoulderRight[1]);
    var kneeLeftNotStraight:boolean = userJointAngles.kneeLeft < 160;
    var kneeRightNotStraight:boolean = userJointAngles.kneeRight < 160;

    var isArmLeftSqueezed:boolean = (userJointAngles!.elbowLeft <= activeExercise!.jointAnglesGuide!.elbowLeft);
    var isArmRightSqueezed:boolean = (userJointAngles!.elbowRight <= activeExercise!.jointAnglesGuide!.elbowRight);
    var isArmLeftStretched:boolean = (userJointAngles!.elbowLeft >= 150);
    var isArmRightStretched:boolean = (userJointAngles!.elbowRight >= 150);

    if (hipLeftNotStraight || hipRightNotStraight) {
        commentThis('腰要伸直啲');
        return;
    }

    if (indexLeftBelowShoulder && indexRightBelowShoulder) {
        if (motionTrack.errorExceeded(ErrGestureType.indexLeftBelowShoulder+ErrGestureType.indexRightBelowShoulder, STRETCHINGARMS_MAX_ERR_CNT))
            commentThis('雙手唔可以下垂');
        return;
    } else if (!indexLeftBelowShoulder && !indexRightBelowShoulder) {
        motionTrack.errorDelete(ErrGestureType.indexLeftBelowShoulder+ErrGestureType.indexRightBelowShoulder);
    }
    if (indexLeftBelowShoulder) {
        if (motionTrack.errorExceeded(ErrGestureType.indexLeftBelowShoulder, STRETCHINGARMS_MAX_ERR_CNT))
            commentThis('左手唔可以下垂');
        return;
    } else {
        motionTrack.errorDelete(ErrGestureType.indexLeftBelowShoulder);
    }
    if (indexRightBelowShoulder) {
        if (motionTrack.errorExceeded(ErrGestureType.indexRightBelowShoulder, STRETCHINGARMS_MAX_ERR_CNT))
            commentThis('右手唔可以下垂');
        return;
    } else {
        motionTrack.errorDelete(ErrGestureType.indexRightBelowShoulder);
    }

    if (kneeLeftNotStraight && kneeRightNotStraight) {
        if (motionTrack.errorExceeded(ErrGestureType.kneeLeftNotStraight+ErrGestureType.kneeRightNotStraight, STRETCHINGARMS_MAX_ERR_CNT))
            commentThis('雙腳都要企直');
        return;
    } else if (!kneeLeftNotStraight && !kneeRightNotStraight) {
        motionTrack.errorDelete(ErrGestureType.kneeLeftNotStraight+ErrGestureType.kneeRightNotStraight);
    }
    if (kneeLeftNotStraight) {
        if (motionTrack.errorExceeded(ErrGestureType.kneeLeftNotStraight, STRETCHINGARMS_MAX_ERR_CNT))
            commentThis('左腳要企直');
        return;
    } else {
        motionTrack.errorDelete(ErrGestureType.kneeLeftNotStraight);
    }
    if (kneeRightNotStraight) {
        if (motionTrack.errorExceeded(ErrGestureType.kneeRightNotStraight, STRETCHINGARMS_MAX_ERR_CNT))
            commentThis('右腳要企直');
        return;
    } else {
        motionTrack.errorDelete(ErrGestureType.kneeRightNotStraight);
    }

    if (handLeftTooHigh && handRightTooHigh) {
        if (motionTrack.errorExceeded(ErrGestureType.handLeftTooHigh+ErrGestureType.handRightTooHigh, STRETCHINGARMS_MAX_ERR_CNT))
            commentThis('雙手太高');
        return;
    } else if (!handLeftTooHigh && !handRightTooHigh) {
        motionTrack.errorDelete(ErrGestureType.handLeftTooHigh+ErrGestureType.handRightTooHigh);
    }
    if (handLeftTooHigh) {
        if (motionTrack.errorExceeded(ErrGestureType.handLeftTooHigh, STRETCHINGARMS_MAX_ERR_CNT))
            commentThis('左手太高');
        return;
    } else {
        motionTrack.errorDelete(ErrGestureType.handLeftTooHigh);
    }
    if (handRightTooHigh) {
        if (motionTrack.errorExceeded(ErrGestureType.handRightTooHigh, STRETCHINGARMS_MAX_ERR_CNT))
            commentThis('右手太高');
        return;
    } else {
        motionTrack.errorDelete(ErrGestureType.handRightTooHigh);
    }

    if (armLeftTooLow && armRightTooLow) {
        if (motionTrack.errorExceeded(ErrGestureType.armLeftTooLow+ErrGestureType.armRightTooLow, STRETCHINGARMS_MAX_ERR_CNT))
            commentThis('左右手都要抬高啲');
        return;
    } else if (!armLeftTooLow && !armRightTooLow) {
        motionTrack.errorDelete(ErrGestureType.armLeftTooLow+ErrGestureType.armRightTooLow);
    }

    if (armLeftTooHigh && armRightTooHigh) {
        if (motionTrack.errorExceeded(ErrGestureType.armLeftTooHigh+ErrGestureType.armRightTooHigh, STRETCHINGARMS_MAX_ERR_CNT))
            commentThis('左右手都要放低啲');
        return;
    } else if (!armLeftTooHigh && !armRightTooHigh) {
        motionTrack.errorDelete(ErrGestureType.armLeftTooHigh+ErrGestureType.armRightTooHigh);
    }

    if (armLeftTooLow && armRightTooHigh) {
        if (motionTrack.errorExceeded(ErrGestureType.armLeftTooLow+ErrGestureType.armRightTooHigh, STRETCHINGARMS_MAX_ERR_CNT))
            commentThis('左手抬高啲, 右手放低啲');
        return;
    } else if (!armLeftTooLow && !armRightTooHigh) {
        motionTrack.errorDelete(ErrGestureType.armLeftTooLow+ErrGestureType.armRightTooHigh);
    }
    if (armLeftTooHigh && armRightTooLow) {
        if (motionTrack.errorExceeded(ErrGestureType.armLeftTooHigh+ErrGestureType.armRightTooLow, STRETCHINGARMS_MAX_ERR_CNT))
            commentThis('左手放低啲, 右手抬高啲');
        return;
    } else {
        motionTrack.errorDelete(ErrGestureType.armLeftTooHigh+ErrGestureType.armRightTooLow);
    }
    if (armLeftTooLow) {
        if (motionTrack.errorExceeded(ErrGestureType.armLeftTooLow, STRETCHINGARMS_MAX_ERR_CNT))
            commentThis('左手抬高啲');
        return;
    } else {
        motionTrack.errorDelete(ErrGestureType.armLeftTooLow);
    }
    if (armLeftTooHigh) {
        if (motionTrack.errorExceeded(ErrGestureType.armLeftTooHigh, STRETCHINGARMS_MAX_ERR_CNT))
            commentThis('左手放低啲');
        return;
    } else {
        motionTrack.errorDelete(ErrGestureType.armLeftTooHigh);
    }
    if (armRightTooLow) {
        if (motionTrack.errorExceeded(ErrGestureType.armRightTooLow, STRETCHINGARMS_MAX_ERR_CNT))
            commentThis('右手抬高啲');
        return;
    } else {
        motionTrack.errorDelete(ErrGestureType.armRightTooLow);
    }
    if (armRightTooHigh) {
        if (motionTrack.errorExceeded(ErrGestureType.armRightTooHigh, STRETCHINGARMS_MAX_ERR_CNT))
            commentThis('右手放低啲');
        return;
    } else {
        motionTrack.errorDelete(ErrGestureType.armRightTooHigh);
    }

    if ((isArmLeftSqueezed && !isArmRightSqueezed) || (isArmLeftStretched && !isArmRightStretched) || (isArmRightSqueezed && !isArmLeftSqueezed) || (isArmRightStretched && !isArmLeftStretched)) {
        if (motionTrack.errorExceeded(ErrGestureType.leftRightArmsNotConsistent, STRETCHINGARMS_MAX_ERR_CNT))
            commentThis('左右手伸縮,必須一致');
        return;
    } else {
        motionTrack.errorDelete(ErrGestureType.leftRightArmsNotConsistent);
    }

    if (isArmLeftSqueezed && isArmRightSqueezed) {
        motionTrack.stretchingArms_Squeezed = performance.now();
        if (hasNoTransitionSince(motionTrack.stretchingArms_Stretched)) {
            commentThis('你雙手㬹冇伸展過');
        } else {
            motionTrack.resetErrGestureCnt();
            commentThis(complimentsForGoodExerciseDone());
        }
    } else if (isArmLeftStretched && isArmRightStretched) {
        motionTrack.stretchingArms_Stretched = performance.now();
        if (hasNoTransitionSince(motionTrack.stretchingArms_Squeezed)) {
            commentThis('你雙手㬹冇彎曲過');
        } else {
            motionTrack.resetErrGestureCnt();
            commentThis(complimentsForGoodExerciseDone());
        }
    } else {
        motionTrack.resetErrGestureCnt();
        commentThis('你好似唔係做緊伸展手動作');
    }
}

function commentLegPressing() {
    if (isStandingStill()) {
        return;
    }

    const LEGPRESSING_MAX_ERR_CNT:number = 15;
    const LEGPRESSING_MAX_TIME_BETWEEN_LEFT_TO_RIGHT = 5000;

    var indexLeftX:number = userLandmarks.indexLeft[0], indexLeftY:number = userLandmarks.indexLeft[1];
    var indexRightX:number = userLandmarks.indexRight[0], indexRightY:number = userLandmarks.indexRight[1];
    var indexAvgX:number = (indexLeftX + indexRightX)/2, indexAvgY:number = (indexLeftY + indexRightY)/2;
    var wristLeftX:number = userLandmarks.wristLeft[0], wristLeftY:number = userLandmarks.wristLeft[1];
    var wristRightX:number = userLandmarks.wristRight[0], wristRightY:number = userLandmarks.wristRight[1];
    var wristAvgX:number = (wristLeftX + wristRightX)/2, wristAvgY:number = (wristLeftY + wristRightY)/2;
    var hipLeftX:number = userLandmarks.hipLeft[0], hipLeftY:number = userLandmarks.hipLeft[1], hipLeftZ:number = worldLandmarks.hipLeft[2];
    var hipRightX:number = userLandmarks.hipRight[0], hipRightY:number = userLandmarks.hipRight[1], hipRightZ:number = worldLandmarks.hipRight[2];
    var kneeLeftX:number = userLandmarks.kneeLeft[0], kneeLeftY:number = userLandmarks.kneeLeft[1] , kneeLeftZ:number = worldLandmarks.kneeLeft[2];
    var kneeRightX:number = userLandmarks.kneeRight[0], kneeRightY:number = userLandmarks.kneeRight[1], kneeRightZ:number = worldLandmarks.kneeRight[2];

    var isPressingLeft:boolean = (userJointAngles!.hipLeft < userJointAngles!.hipRight) && inBetween(userJointAngles!.hipLeft, 90, activeExercise!.jointAnglesGuide!.hipLeft);
    var isHipBendingNotEnough:boolean = (userJointAngles!.hipLeft > activeExercise!.jointAnglesGuide!.hipLeft) && (userJointAngles!.hipRight > activeExercise!.jointAnglesGuide!.hipRight);
    var isPressingRight:boolean = (userJointAngles!.hipRight < userJointAngles!.hipLeft) && inBetween(userJointAngles!.hipRight, 90, activeExercise!.jointAnglesGuide!.hipRight);

    var handsStackedTogether:boolean =  ((Math.abs(indexLeftX - indexRightX) < 0.05) && (Math.abs(indexLeftY - indexRightY) < 0.10)) ||
                                        ((Math.abs(wristLeftX - wristRightX) < 0.10) && (Math.abs(wristLeftY - wristRightY) < 0.10));
    var handsNotOnLeftThigh:boolean = (indexAvgX > hipLeftX || indexAvgY < hipLeftY) || (indexAvgX < kneeLeftX || indexAvgY > kneeLeftY);
    var handsNotOnRightThigh:boolean = (indexAvgX < hipRightX || indexAvgY < hipRightY) || (indexAvgX > kneeRightX || indexAvgY > kneeRightY);
    var rightwardKneeTooSqueezed:boolean = (userJointAngles!.kneeRight < (activeExercise!.jointAnglesGuide!.kneeRight - ANGULAR_TOLERANCE));
    var leftwardKneeTooSqueezed:boolean = (userJointAngles!.kneeLeft < (activeExercise!.jointAnglesGuide!.kneeLeft - ANGULAR_TOLERANCE));
    var leftKneeNotSqueezedEnough:boolean = inBetween(userJointAngles!.kneeLeft, activeExercise!.jointAnglesGuide!.kneeLeft, 180);
    var rightKneeNotSqueezedEnough:boolean = inBetween(userJointAngles!.kneeRight, activeExercise!.jointAnglesGuide!.kneeRight, 180);

    if (!handsStackedTogether) {
        commentThis('左右手需要叠埋一齊');
        return;
    }

    if (isHipBendingNotEnough) {
        if (motionTrack.errorExceeded(ErrGestureType.isHipBendingNotEnough, LEGPRESSING_MAX_ERR_CNT))
            commentThis('條腰彎多啲');
        return;
    } else {
        motionTrack.errorDelete(ErrGestureType.isHipBendingNotEnough);
    }

    if (isPressingLeft) {
        if (handsNotOnLeftThigh) {
             if (motionTrack.errorExceeded(ErrGestureType.handsNotOnLeftThigh, LEGPRESSING_MAX_ERR_CNT))
                commentThis('雙手要放喺大髀上');
            return;
        } else {
            motionTrack.errorDelete(ErrGestureType.handsNotOnLeftThigh);
        }

        if (leftwardKneeTooSqueezed) {
            if (motionTrack.errorExceeded(ErrGestureType.leftwardKneeTooSqueezed, LEGPRESSING_MAX_ERR_CNT))
                commentThis('左腿壓得太低');
            return;
        } else {
            motionTrack.errorDelete(ErrGestureType.leftwardKneeTooSqueezed);
        }

        if (leftKneeNotSqueezedEnough) {
            if (motionTrack.errorExceeded(ErrGestureType.leftKneeNotSqueezedEnough, LEGPRESSING_MAX_ERR_CNT))
                commentThis('左膝壓得唔夠低');
            return;
        } else {
            motionTrack.errorDelete(ErrGestureType.leftKneeNotSqueezedEnough);
        }

        if (isTimeToPressLeftLeg(LEGPRESSING_MAX_TIME_BETWEEN_LEFT_TO_RIGHT)) {
            motionTrack.resetErrGestureCnt();
            commentThis(complimentsForGoodExerciseDone());
        } else {
             if (motionTrack.errorExceeded(ErrGestureType.legRightNotPressedForLong, LEGPRESSING_MAX_ERR_CNT))
                commentThis('好耐冇壓右腿');
        }
    } else if (isPressingRight) {
        if (handsNotOnRightThigh) {
            if (motionTrack.errorExceeded(ErrGestureType.handsNotOnRightThigh, LEGPRESSING_MAX_ERR_CNT))
                commentThis('雙手要放喺大髀上');
            return;
        } else {
            motionTrack.errorDelete(ErrGestureType.handsNotOnRightThigh);
        }

        if (rightwardKneeTooSqueezed) {
             if (motionTrack.errorExceeded(ErrGestureType.rightwardKneeTooSqueezed, LEGPRESSING_MAX_ERR_CNT))
                commentThis('右腿壓得太低');
            return;
        } else {
            motionTrack.errorDelete(ErrGestureType.rightwardKneeTooSqueezed);
        }

        if (rightKneeNotSqueezedEnough) {
             if (motionTrack.errorExceeded(ErrGestureType.rightKneeNotSqueezedEnough, LEGPRESSING_MAX_ERR_CNT))
                commentThis('右膝壓得唔夠低');
            return;
        } else {
            motionTrack.errorDelete(ErrGestureType.rightKneeNotSqueezedEnough);
        }

        if (isTimeToPressRightLeg(LEGPRESSING_MAX_TIME_BETWEEN_LEFT_TO_RIGHT)) {
            motionTrack.resetErrGestureCnt();
            commentThis(complimentsForGoodExerciseDone());
        } else {
             if (motionTrack.errorExceeded(ErrGestureType.legLeftNotPressedForLong, LEGPRESSING_MAX_ERR_CNT))
                commentThis('好耐冇壓左腿');
        }
    } else {
        motionTrack.resetErrGestureCnt();
        commentThis('你好似唔係做緊壓腿動作');
    }
}
function isTimeToPressLeftLeg(maxWaitMovingFromRight:number):boolean {
    motionTrack.legPressing_leftPressed = performance.now();

    if (motionTrack.legPressing_rightPressed == 0)
        return(true);
    else if (hasElapsed(motionTrack.legPressing_rightPressed, maxWaitMovingFromRight))
        return(false);
    else
        return(true);
}
function isTimeToPressRightLeg(maxWaitMovingFromLeft:number):boolean {
    motionTrack.legPressing_rightPressed = performance.now();

    if (motionTrack.legPressing_leftPressed == 0)
        return(true);
    else if (hasElapsed(motionTrack.legPressing_leftPressed, maxWaitMovingFromLeft))
        return(false);
    else
        return(true);
}

function commentArmCircle() {
    captureReferenceSpine();
    if (isStandingStill()) {
        return;
    }

    const ARMCIRCLE_MAX_ERR_CNT:number = 15;
    const MAX_TIME_BETWEEN_BACK_FORTH:number = 2000;
    const MAX_TIME_BETWEEN_UP_DOWN:number = 2000;

    var indexLeftY:number = userLandmarks.indexLeft[1], indexRightY:number = userLandmarks.indexRight[1];
    var indexLeftZ:number = worldLandmarks.indexLeft[2], indexRightZ:number = worldLandmarks.indexRight[2];

    var leftArmLowered:boolean = (userJointAngles!.shoulderLeft < activeExercise!.jointAnglesGuide!.shoulderLeft);
    var leftArmRaised:boolean = (userJointAngles!.shoulderLeft > activeExercise!.jointAnglesGuide!.shoulderLeft);
    var rightArmLowered:boolean = (userJointAngles!.shoulderRight < activeExercise!.jointAnglesGuide!.shoulderRight);
    var rightArmRaised:boolean = (userJointAngles!.shoulderRight > activeExercise!.jointAnglesGuide!.shoulderRight);

    var leftRightHandsNotConsistent:boolean = ((leftArmLowered && !rightArmLowered) || (leftArmRaised && !rightArmRaised) || (rightArmLowered && !leftArmLowered) || (rightArmRaised && !leftArmRaised));
    var kneeLeftNotStraight:boolean = !inBetween(userJointAngles.kneeLeft, 160, 180);
    var kneeRightNotStraight:boolean = !inBetween(userJointAngles.kneeRight, 160, 180);
    var hipLeftNotStraight:boolean = userJointAngles.hipLeft < 160 || hipSeemsNotStraight(userLandmarks.shoulderLeft[1]);
    var hipRightNotStraight:boolean = userJointAngles.hipRight < 160 || hipSeemsNotStraight(userLandmarks.shoulderRight[1]);
    var elbowLeftNotStraight:boolean = (userJointAngles!.elbowLeft < (activeExercise!.jointAnglesGuide!.elbowLeft - ANGULAR_TOLERANCE));
    var elbowRightNotStraight:boolean = (userJointAngles!.elbowRight < (activeExercise!.jointAnglesGuide!.elbowRight - ANGULAR_TOLERANCE));
    var shoulderLeftTooLow:boolean = (userJointAngles!.shoulderLeft < (activeExercise!.jointAnglesGuide!.shoulderLeft - ANGULAR_TOLERANCE));
    var shoulderRightTooLow:boolean = (userJointAngles!.shoulderRight < (activeExercise!.jointAnglesGuide!.shoulderRight - ANGULAR_TOLERANCE));
    const handLeftTooFront:boolean = (indexLeftZ < -1.6);
    const handRightTooFront:boolean = (indexRightZ < -1.6);
    const handLeftTooHigh:boolean = (indexLeftY < 0);
    const handRightTooHigh:boolean = (indexRightY < 0);

    if (hipLeftNotStraight || hipRightNotStraight) {
        commentThis('腰要伸直啲');
        return;
    }

    if (kneeLeftNotStraight && kneeRightNotStraight) {
        if (motionTrack.errorExceeded(ErrGestureType.kneeLeftNotStraight+ErrGestureType.kneeRightNotStraight, ARMCIRCLE_MAX_ERR_CNT))
            commentThis('雙腳要企直');
        return;
    } else if (!kneeLeftNotStraight && !kneeRightNotStraight) {
        motionTrack.errorDelete(ErrGestureType.kneeLeftNotStraight+ErrGestureType.kneeRightNotStraight);
    }
    if (kneeLeftNotStraight) {
        if (motionTrack.errorExceeded(ErrGestureType.kneeLeftNotStraight, ARMCIRCLE_MAX_ERR_CNT))
            commentThis('左腳要企直');
        return;
    } else {
        motionTrack.errorDelete(ErrGestureType.kneeLeftNotStraight);
    }
    if (kneeRightNotStraight) {
        if (motionTrack.errorExceeded(ErrGestureType.kneeRightNotStraight, ARMCIRCLE_MAX_ERR_CNT))
            commentThis('右腳要企直');
        return;
    } else {
        motionTrack.errorDelete(ErrGestureType.kneeRightNotStraight);
    }

    if (elbowLeftNotStraight && elbowRightNotStraight) {
        if (motionTrack.errorExceeded(ErrGestureType.elbowLeftNotStraight+ErrGestureType.elbowRightNotStraight, ARMCIRCLE_MAX_ERR_CNT))
            commentThis('左右手㬹都要直啲');
        return;
    } else if (!elbowLeftNotStraight && !elbowRightNotStraight) {
        motionTrack.errorDelete(ErrGestureType.elbowLeftNotStraight+ErrGestureType.elbowRightNotStraight);
    }
    if (elbowLeftNotStraight) {
        if (motionTrack.errorExceeded(ErrGestureType.elbowLeftNotStraight, ARMCIRCLE_MAX_ERR_CNT))
            commentThis('左手㬹要直啲');
        return;
    } else {
        motionTrack.errorDelete(ErrGestureType.elbowLeftNotStraight);
    }
    if (elbowRightNotStraight) {
        if (motionTrack.errorExceeded(ErrGestureType.elbowRightNotStraight, ARMCIRCLE_MAX_ERR_CNT))
            commentThis('右手㬹要直啲');
        return;
    } else {
        motionTrack.errorDelete(ErrGestureType.elbowRightNotStraight);
    }

    if (shoulderLeftTooLow && shoulderRightTooLow) {
        if (motionTrack.errorExceeded(ErrGestureType.shoulderLeftTooLow+ErrGestureType.shoulderRightTooLow, ARMCIRCLE_MAX_ERR_CNT))
            commentThis('左右手都要抬高啲');
        return;
    } else {
        motionTrack.errorDelete(ErrGestureType.shoulderLeftTooLow+ErrGestureType.shoulderRightTooLow);
    }
    if (shoulderLeftTooLow) {
        if (motionTrack.errorExceeded(ErrGestureType.shoulderLeftTooLow, ARMCIRCLE_MAX_ERR_CNT))
            commentThis('左手抬高啲');
        return;
    } else {
        motionTrack.errorDelete(ErrGestureType.shoulderLeftTooLow);
    }
    if (shoulderRightTooLow) {
        if (motionTrack.errorExceeded(ErrGestureType.shoulderRightTooLow, ARMCIRCLE_MAX_ERR_CNT))
            commentThis('右手抬高啲');
        return;
    } else {
        motionTrack.errorDelete(ErrGestureType.shoulderRightTooLow);
    }

    if (leftRightHandsNotConsistent) {
        if (motionTrack.errorExceeded(ErrGestureType.leftRightHandsNotConsistent, ARMCIRCLE_MAX_ERR_CNT))
            commentThis('左右手動作必須一致');
        return;
    } else {
        motionTrack.errorDelete(ErrGestureType.leftRightHandsNotConsistent);
    }

    if (handLeftTooHigh && handRightTooHigh) {
        if (motionTrack.errorExceeded(ErrGestureType.handLeftTooHigh+ErrGestureType.handRightTooHigh, ARMCIRCLE_MAX_ERR_CNT))
            commentThis('雙手舉得太高');
        return;
    } else if (!handLeftTooHigh && !handRightTooHigh) {
        motionTrack.errorDelete(ErrGestureType.handLeftTooHigh+ErrGestureType.handRightTooHigh);
    }
    if (handLeftTooHigh) {
        if (motionTrack.errorExceeded(ErrGestureType.handLeftTooHigh, ARMCIRCLE_MAX_ERR_CNT))
            commentThis('左手舉得太高');
        return;
    } else {
        motionTrack.errorDelete(ErrGestureType.handLeftTooHigh);
    }
    if (handRightTooHigh) {
        if (motionTrack.errorExceeded(ErrGestureType.handRightTooHigh, ARMCIRCLE_MAX_ERR_CNT))
            commentThis('右手舉得太高');
        return;
    } else {
        motionTrack.errorDelete(ErrGestureType.handRightTooHigh);
    }

    if (handLeftTooFront && handRightTooFront) {
        if (motionTrack.errorExceeded(ErrGestureType.handLeftTooFront+ErrGestureType.handRightTooFront, ARMCIRCLE_MAX_ERR_CNT))
            commentThis('雙手放得太前');
        return;
    } else {
        motionTrack.errorDelete(ErrGestureType.handLeftTooFront+ErrGestureType.handRightTooFront);
    }
    if (handLeftTooFront) {
        if (motionTrack.errorExceeded(ErrGestureType.handLeftTooFront, ARMCIRCLE_MAX_ERR_CNT))
            commentThis('左手放得太前');
        return;
    } else {
        motionTrack.errorDelete(ErrGestureType.handLeftTooFront);
    }
    if (handRightTooFront) {
        if (motionTrack.errorExceeded(ErrGestureType.handRightTooFront, ARMCIRCLE_MAX_ERR_CNT))
            commentThis('右手放得太前');
        return;
    } else {
        motionTrack.errorDelete(ErrGestureType.handRightTooFront);
    }

    if (leftArmRaised && rightArmRaised) {
        if (ArmsCircleMissingBackAndForth(indexLeftZ, indexRightZ, MAX_TIME_BETWEEN_BACK_FORTH)) {
            return;
        } else if (ArmsCircleHasUpAndDown(indexLeftY, indexRightY, MAX_TIME_BETWEEN_UP_DOWN)) {
            motionTrack.resetErrGestureCnt();
            commentThis(complimentsForGoodExerciseDone());
        }
    } else if (leftArmLowered && rightArmLowered) {
        if (ArmsCircleMissingBackAndForth(indexLeftZ, indexRightZ, MAX_TIME_BETWEEN_BACK_FORTH)) {
            return;
        } else if (ArmsCircleHasUpAndDown(indexLeftY, indexRightY, MAX_TIME_BETWEEN_UP_DOWN)) {
            motionTrack.resetErrGestureCnt();
            commentThis(complimentsForGoodExerciseDone());
        }
    } else {
        motionTrack.armCircle_indexYtime = 0;
        motionTrack.armCircle_indexZtime = 0;
        motionTrack.resetErrGestureCnt();
        commentThis('你好似唔係做緊手繞環動作');
    }
}
function ArmsCircleMissingBackAndForth(indexLeftZ:number, indexRightZ:number, maxTimeBetweenBackForth:number):boolean {
    var averageZ:number = (indexLeftZ + indexRightZ) / 2;

    if (motionTrack.armCircle_indexZtime == 0) {
        motionTrack.armCircle_indexZtime = performance.now();
        motionTrack.armCircle_indexZmin = averageZ;
        motionTrack.armCircle_indexZmax = averageZ;
    } else {
        if (averageZ < motionTrack.armCircle_indexZmin)
            motionTrack.armCircle_indexZmin = averageZ;
        if (averageZ > motionTrack.armCircle_indexZmax)
            motionTrack.armCircle_indexZmax = averageZ;
    }

    var indexBackForthMoved:boolean =  Math.abs(motionTrack.armCircle_indexZmax - motionTrack.armCircle_indexZmin) > 0.15;
    var indexExpired = hasElapsed(motionTrack.armCircle_indexZtime, maxTimeBetweenBackForth);

    if (indexBackForthMoved) {
        motionTrack.armCircle_indexZtime = 0;
        return(false);
    } else if (indexExpired && !indexBackForthMoved) {
        motionTrack.armCircle_indexZtime = 0;
        commentThis('你雙手前後旋轉得唔夠好');
        return(true);
    } else {
        return(true);
    }
}
function ArmsCircleHasUpAndDown(indexLeftY:number, indexRightY:number, maxTimeBetweenUpDown:number):boolean {
    var averageY:number = (indexLeftY + indexRightY) / 2;

    if (motionTrack.armCircle_indexYtime == 0) {
        motionTrack.armCircle_indexYtime = performance.now();
        motionTrack.armCircle_indexYmin = averageY;
        motionTrack.armCircle_indexYmax = averageY;
    } else {
        if (averageY < motionTrack.armCircle_indexYmin)
            motionTrack.armCircle_indexYmin = averageY;
        if (averageY > motionTrack.armCircle_indexYmax)
            motionTrack.armCircle_indexYmax = averageY;
    }

    var indexUpDownMoved:boolean =  Math.abs(motionTrack.armCircle_indexYmax - motionTrack.armCircle_indexYmin) > 0.1;
    var indexExpired = hasElapsed(motionTrack.armCircle_indexYtime, maxTimeBetweenUpDown);

    if (indexUpDownMoved) {
        motionTrack.armCircle_indexYtime = 0;
        return(true);
    } else if (indexExpired && !indexUpDownMoved) {
        motionTrack.armCircle_indexYtime = 0;
        commentThis('你雙手上下旋轉得唔夠好');
        return(false);
    } else {
        return(false);
    }
}

function commentLiftingLegs() {
    if (isStandingStill()) {
        return;
    }

    const LIFTINGLEGS_MAX_ERR_CNT:number = 15;
    const MAX_TIME_BETWEEN_LEFT_TO_RIGHT:number = 3000;

    var hipLeftY:number = userLandmarks.hipLeft[1], hipRightY:number = userLandmarks.hipRight[1];
    var kneeLeftY:number = userLandmarks.kneeLeft[1], kneeRightY:number = userLandmarks.kneeRight[1];

    var hipLeftNotStraight:boolean = userJointAngles.hipLeft < 160;
    var hipRightNotStraight:boolean = userJointAngles.hipRight < 160;
    var shoulderLeftTooHigh:boolean = (userJointAngles!.shoulderLeft > 45);
    var shoulderRightTooHigh:boolean = (userJointAngles!.shoulderRight > 45);
    var elbowLeftNotStraight:boolean = !inBetween(userJointAngles!.elbowLeft, 150, 180);
    var elbowRightNotStraight:boolean = !inBetween(userJointAngles!.elbowRight, 150, 180);
    var kneeLeftTooSqueezed:boolean = (userJointAngles!.kneeLeft < (activeExercise!.jointAnglesGuide!.kneeLeft - ANGULAR_TOLERANCE));
    var kneeRightTooSqueezed:boolean = (userJointAngles!.kneeRight < (activeExercise!.jointAnglesGuide!.kneeRight - ANGULAR_TOLERANCE));
    var kneeLeftNotLiftedEnough:boolean = Math.abs(kneeLeftY - hipLeftY) > 0.2;
    var kneeRightNotLiftedEnough:boolean = Math.abs(kneeRightY - hipRightY) > 0.2;

    var legLeftIsLifting:boolean = userJointAngles!.kneeLeft < 160;
    var legRightIsLifting:boolean = userJointAngles!.kneeRight < 160;

    if (shoulderLeftTooHigh && shoulderRightTooHigh) {
        if (motionTrack.errorExceeded(ErrGestureType.shoulderLeftTooHigh+ErrGestureType.shoulderRightTooHigh, LIFTINGLEGS_MAX_ERR_CNT))
            commentThis('左右手都要垂低啲');
        return;
    } else if (!shoulderLeftTooHigh && !shoulderRightTooHigh) {
        motionTrack.errorDelete(ErrGestureType.shoulderLeftTooHigh + ErrGestureType.shoulderRightTooHigh);
    }
    if (shoulderLeftTooHigh) {
        if (motionTrack.errorExceeded(ErrGestureType.shoulderLeftTooHigh, LIFTINGLEGS_MAX_ERR_CNT))
            commentThis('左手要垂低');
        return;
    } else {
        motionTrack.errorDelete(ErrGestureType.shoulderLeftTooHigh);
    }
    if (shoulderRightTooHigh) {
        if (motionTrack.errorExceeded(ErrGestureType.shoulderRightTooHigh, LIFTINGLEGS_MAX_ERR_CNT))
            commentThis('右手要垂低');
        return;
    } else {
        motionTrack.errorDelete(ErrGestureType.shoulderRightTooHigh);
    }

    if (elbowLeftNotStraight && elbowRightNotStraight) {
        if (motionTrack.errorExceeded(ErrGestureType.elbowLeftNotStraight+ErrGestureType.elbowRightNotStraight, LIFTINGLEGS_MAX_ERR_CNT))
            commentThis('左右手㬹都要伸直啲');
        return;
    } else {
        motionTrack.errorDelete(ErrGestureType.elbowLeftNotStraight+ErrGestureType.elbowRightNotStraight);
    }
    if (elbowLeftNotStraight) {
        if (motionTrack.errorExceeded(ErrGestureType.elbowLeftNotStraight, LIFTINGLEGS_MAX_ERR_CNT))
            commentThis('左手㬹要伸直');
        return;
    } else {
        motionTrack.errorDelete(ErrGestureType.elbowLeftNotStraight);
    }
    if (elbowRightNotStraight) {
        if (motionTrack.errorExceeded(ErrGestureType.elbowRightNotStraight, LIFTINGLEGS_MAX_ERR_CNT))
            commentThis('右手㬹要伸直');
        return;
    } else {
        motionTrack.errorDelete(ErrGestureType.elbowRightNotStraight);
    }

    if (legLeftIsLifting) {
        if (hipRightNotStraight) {
            if (motionTrack.errorExceeded(ErrGestureType.hipNotStraight, LIFTINGLEGS_MAX_ERR_CNT))
                commentThis('腰要伸直啲');
            return;
        } else {
            motionTrack.errorDelete(ErrGestureType.hipNotStraight);
        }
        if (kneeLeftTooSqueezed) {
            if (motionTrack.errorExceeded(ErrGestureType.kneeLeftTooSqueezed, LIFTINGLEGS_MAX_ERR_CNT))
                commentThis('左小腿要垂直啲');
            return;
        } else {
            motionTrack.errorDelete(ErrGestureType.kneeLeftTooSqueezed);
        }
        if (kneeLeftNotLiftedEnough) {
            if (motionTrack.errorExceeded(ErrGestureType.kneeLeftNotLiftedEnough, LIFTINGLEGS_MAX_ERR_CNT))
                commentThis('你左腳提得唔夠高');
            return;
        } else {
            motionTrack.errorDelete(ErrGestureType.kneeLeftNotLiftedEnough);
        }

        if (isTimeToLiftLeftLeg(MAX_TIME_BETWEEN_LEFT_TO_RIGHT)) {
            motionTrack.resetErrGestureCnt();
            commentThis(complimentsForGoodExerciseDone());
        } else {
            commentThis('你好耐冇提右腳')
        }
    } else if (legRightIsLifting) {
        if (hipLeftNotStraight) {
            if (motionTrack.errorExceeded(ErrGestureType.hipNotStraight, LIFTINGLEGS_MAX_ERR_CNT))
                commentThis('腰要伸直啲');
            return;
        } else {
            motionTrack.errorDelete(ErrGestureType.hipNotStraight);
        }
        if (kneeRightTooSqueezed) {
            if (motionTrack.errorExceeded(ErrGestureType.kneeRightTooSqueezed, LIFTINGLEGS_MAX_ERR_CNT))
                commentThis('右小腿要垂直啲');
            return;
        } else {
            motionTrack.errorDelete(ErrGestureType.kneeRightTooSqueezed);
        }
        if (kneeRightNotLiftedEnough) {
            if (motionTrack.errorExceeded(ErrGestureType.kneeRightNotLiftedEnough, LIFTINGLEGS_MAX_ERR_CNT))
                commentThis('你右腳提得唔夠高');
            return;
        } else {
            motionTrack.errorDelete(ErrGestureType.kneeRightNotLiftedEnough);
        }

        if (isTimeToLiftRightLeg(MAX_TIME_BETWEEN_LEFT_TO_RIGHT)) {
            motionTrack.resetErrGestureCnt();
            commentThis(complimentsForGoodExerciseDone());
        } else {
            commentThis('你好耐冇提左腳')
        }
    } else {
        motionTrack.resetErrGestureCnt();
        commentThis('你好似唔係做緊抬腿動作');
    }
}
function isTimeToLiftLeftLeg(maxWaitMovingFromRight:number):boolean {
    motionTrack.legLifting_leftLifted = performance.now();

    if (hasElapsed(motionTrack.legLifting_rightLifted, maxWaitMovingFromRight))
        return(false);
    else
        return(true);
}
function isTimeToLiftRightLeg(maxWaitMovingFromLeft:number):boolean {
    motionTrack.legLifting_rightLifted = performance.now();

    if (hasElapsed(motionTrack.legLifting_leftLifted, maxWaitMovingFromLeft))
        return(false);
    else
        return(true);
}

function commentSquatting() {
    if (isStandingStill()) {
        return;
    }

    const SQUATTED_DOWN_ANGLE:number = 145;
    const SQUATTING_MAX_ERR_CNT:number = 15;
    const MAX_TIME_BETWEEN_REST_TO_SQUEEZE:number = 3000;

    var squattingDown:boolean = userJointAngles!.kneeLeft < SQUATTED_DOWN_ANGLE && userJointAngles!.kneeRight < SQUATTED_DOWN_ANGLE;
    var standingUp:boolean = userJointAngles!.kneeLeft > SQUATTED_DOWN_ANGLE && userJointAngles!.kneeRight > SQUATTED_DOWN_ANGLE;

    var kneeLeftTooSqueezed:boolean = (userJointAngles!.kneeLeft < (activeExercise!.jointAnglesGuide!.kneeLeft - ANGULAR_TOLERANCE));
    var kneeRightTooSqueezed:boolean = (userJointAngles!.kneeRight < (activeExercise!.jointAnglesGuide!.kneeRight - ANGULAR_TOLERANCE));
    var kneeLeftNotSqueezedEnough:boolean = (userJointAngles!.kneeLeft > activeExercise!.jointAnglesGuide!.kneeLeft + ANGULAR_TOLERANCE);
    var kneeRightNotSqueezedEnough:boolean = (userJointAngles!.kneeRight > activeExercise!.jointAnglesGuide!.kneeRight + ANGULAR_TOLERANCE);
    var hipLeftTooSqueezed:boolean = (userJointAngles!.hipLeft < (activeExercise!.jointAnglesGuide!.hipLeft - ANGULAR_TOLERANCE));
    var hipRightTooSqueezed:boolean = (userJointAngles!.hipRight < (activeExercise!.jointAnglesGuide!.hipRight - ANGULAR_TOLERANCE));
    var shoulderLeftTooHigh:boolean = (userJointAngles!.shoulderLeft > 45);
    var shoulderRightTooHigh:boolean = (userJointAngles!.shoulderRight > 45);

    if (shoulderLeftTooHigh && shoulderRightTooHigh) {
        if (motionTrack.errorExceeded(ErrGestureType.shoulderLeftTooHigh+ErrGestureType.shoulderRightTooHigh, SQUATTING_MAX_ERR_CNT))
            commentThis('請放低雙手');
        return;
    } else if (!shoulderLeftTooHigh && !shoulderRightTooHigh) {
        motionTrack.errorDelete(ErrGestureType.shoulderLeftTooHigh + ErrGestureType.shoulderRightTooHigh);
    }
    if (shoulderLeftTooHigh) {
        if (motionTrack.errorExceeded(ErrGestureType.shoulderLeftTooHigh, SQUATTING_MAX_ERR_CNT))
            commentThis('左手要垂低');
        return;
    } else {
        motionTrack.errorDelete(ErrGestureType.shoulderLeftTooHigh);
    }
    if (shoulderRightTooHigh) {
        if (motionTrack.errorExceeded(ErrGestureType.shoulderRightTooHigh, SQUATTING_MAX_ERR_CNT))
            commentThis('右手要垂低');
        return;
    } else {
        motionTrack.errorDelete(ErrGestureType.shoulderRightTooHigh);
    }

    if (hipLeftTooSqueezed || hipRightTooSqueezed) {
        if (motionTrack.errorExceeded(ErrGestureType.hipNotStraight, SQUATTING_MAX_ERR_CNT))
            commentThis('腰唔夠直');
        return;
    } else {
        motionTrack.errorDelete(ErrGestureType.hipNotStraight);
    }

    if (kneeLeftTooSqueezed && kneeRightTooSqueezed) {
        motionTrack.errorAdd(ErrGestureType.kneeLeftTooSqueezed+ErrGestureType.kneeRightTooSqueezed);
    }
    if (kneeLeftTooSqueezed) {
        motionTrack.errorAdd(ErrGestureType.kneeLeftTooSqueezed);
    }
    if (kneeRightTooSqueezed) {
        motionTrack.errorAdd(ErrGestureType.kneeRightTooSqueezed);
    }
    if (tooSqueezedCommented())
        return;

    if (squattingDown) {
        if (kneeLeftNotSqueezedEnough) {
            if (motionTrack.errorExceeded(ErrGestureType.kneeLeftNotSqueezedEnough, SQUATTING_MAX_ERR_CNT))
                commentThis('左腿壓得唔夠低');
            return;
        } else {
            motionTrack.errorDelete(ErrGestureType.kneeLeftNotSqueezedEnough);
        }
        if (kneeRightNotSqueezedEnough) {
            if (motionTrack.errorExceeded(ErrGestureType.kneeRightNotSqueezedEnough, SQUATTING_MAX_ERR_CNT))
                commentThis('右腿壓得唔夠低');
            return;
        } else {
            motionTrack.errorDelete(ErrGestureType.kneeRightNotSqueezedEnough);
        }
        if (isTimeToSquat(MAX_TIME_BETWEEN_REST_TO_SQUEEZE)) {
            if (!tooSqueezedCommented())
                commentThis(complimentsForGoodExerciseDone());
            motionTrack.resetErrGestureCnt();
        } else {
            commentThis('你好耐冇企返直');
        }
    } else if (standingUp) {
        if (isTimeToStandUp(MAX_TIME_BETWEEN_REST_TO_SQUEEZE)) {
            if (!tooSqueezedCommented())
                commentThis(complimentsForGoodExerciseDone());
            motionTrack.resetErrGestureCnt();
        } else {
            commentThis('你好耐冇蹲');
        }
    } else if (motionTrack.errorExceeded(ErrGestureType.dontKnowWhatYouDoing, 30)) {
        commentThis('你好似唔係做緊深蹲動作');
        motionTrack.resetErrGestureCnt();
    }
}
function isTimeToStandUp(maxWaitMovingFromSqueezed:number):boolean {
    motionTrack.squatting_stoodUp = performance.now();

    if (hasElapsed(motionTrack.squatting_squattedDown, maxWaitMovingFromSqueezed))
        return(false);
    else
        return(true);
}
function isTimeToSquat(maxWaitMovingFromRested:number):boolean {
    motionTrack.squatting_squattedDown = performance.now();

    if (hasElapsed(motionTrack.squatting_stoodUp, maxWaitMovingFromRested))
        return(false);
    else
        return(true);
}
function tooSqueezedCommented():boolean {
    if (motionTrack.errorExist(ErrGestureType.kneeLeftTooSqueezed+ErrGestureType.kneeRightTooSqueezed)) {
        if (commentThis('左右大腿都壓得太低'))
            return(true);
        else
            return(false);
    } else if (motionTrack.errorExist(ErrGestureType.kneeLeftTooSqueezed)) {
        if (commentThis('左腿壓得太低'))
            return(true);
        else
            return(false);
    } else if (motionTrack.errorExist(ErrGestureType.kneeRightTooSqueezed)) {
        if (commentThis('右腿壓得太低'))
            return(true);
        else
            return(false);
    } else {
        return(false);
    }
}


function commentRaisingHands() {
    captureReferenceSpine();
    if (isStandingStill()) {
        return;
    }

    const RAISINGHANDS_MAX_ERR_CNT:number = 15;

    var isArmLeftLowered:boolean = (userJointAngles!.shoulderLeft < 90.0);
    var isArmRightLowered:boolean = (userJointAngles!.shoulderRight < 90.0);
    var isArmLeftLifted:boolean = (userJointAngles!.shoulderLeft > 90.0);
    var isArmRightLifted:boolean = (userJointAngles!.shoulderRight > 90.0);

    var indexLeftBelowShoulder:boolean = (userLandmarks.indexLeft[1] - userLandmarks.shoulderLeft[1]) > 0.1;
    var indexRightBelowShoulder:boolean = (userLandmarks.indexRight[1] - userLandmarks.shoulderRight[1]) > 0.1;
    var elbowLeftNotStraight:boolean = !inBetween(userJointAngles!.elbowLeft, 160, 180);
    var elbowRightNotStraight:boolean = !inBetween(userJointAngles!.elbowRight, 160, 180);
    var armLeftTooHigh:boolean = (userJointAngles!.elbowLeft > (activeExercise!.jointAnglesGuide!.elbowLeft + ANGULAR_TOLERANCE));
    var armRightTooHigh:boolean = (userJointAngles!.elbowRight > (activeExercise!.jointAnglesGuide!.elbowRight + ANGULAR_TOLERANCE));
    var armLeftTooLow:boolean = (userJointAngles!.shoulderLeft < (activeExercise!.jointAnglesGuide!.shoulderLeft - ANGULAR_TOLERANCE));
    var armRightTooLow:boolean = (userJointAngles!.shoulderRight < (activeExercise!.jointAnglesGuide!.shoulderRight - ANGULAR_TOLERANCE));

    var hipLeftNotStraight:boolean = userJointAngles.hipLeft < 160 || hipSeemsNotStraight(userLandmarks.shoulderLeft[1]);
    var hipRightNotStraight:boolean = userJointAngles.hipRight < 160 || hipSeemsNotStraight(userLandmarks.shoulderRight[1]);
    var kneeLeftNotStraight:boolean = !inBetween(userJointAngles.kneeLeft, 160, 180);
    var kneeRightNotStraight:boolean = !inBetween(userJointAngles.kneeRight, 160, 180);

    var loweringIsOk:boolean = false;
    var liftingIsOk:boolean = false;

    if (hipLeftNotStraight || hipRightNotStraight) {
        if (motionTrack.errorExceeded(ErrGestureType.hipNotStraight, RAISINGHANDS_MAX_ERR_CNT))
            commentThis('腰同腳要直啲');
        return;
    } else {
        motionTrack.errorDelete(ErrGestureType.hipNotStraight);
    }
    
    if (kneeLeftNotStraight && kneeRightNotStraight) {
        if (motionTrack.errorExceeded(ErrGestureType.kneeLeftNotStraight+ErrGestureType.kneeRightNotStraight, RAISINGHANDS_MAX_ERR_CNT))
            commentThis('雙腳都要企直');
        return;
    } else if (!kneeLeftNotStraight && !kneeRightNotStraight) {
        motionTrack.errorDelete(ErrGestureType.kneeLeftNotStraight+ErrGestureType.kneeRightNotStraight);
    }
    if (kneeLeftNotStraight) {
        if (motionTrack.errorExceeded(ErrGestureType.kneeLeftNotStraight, RAISINGHANDS_MAX_ERR_CNT))
            commentThis('左腳要企直');
        return;
    } else {
        motionTrack.errorDelete(ErrGestureType.kneeLeftNotStraight);
    }
    if (kneeRightNotStraight) {
        if (motionTrack.errorExceeded(ErrGestureType.kneeRightNotStraight, RAISINGHANDS_MAX_ERR_CNT))
            commentThis('右腳要企直');
        return;
    } else {
        motionTrack.errorDelete(ErrGestureType.kneeRightNotStraight);
    }

    if ((isArmLeftLowered && !isArmRightLowered) || (!isArmLeftLowered && isArmRightLowered)) {
        if (motionTrack.errorExceeded(ErrGestureType.leftRightArmsNotConsistent, RAISINGHANDS_MAX_ERR_CNT))
            commentThis('左右手高低必須一致');
        return;
    } else {
        motionTrack.errorDelete(ErrGestureType.leftRightArmsNotConsistent);
    }

    if (isArmLeftLowered && isArmRightLowered) {
        motionTrack.raisingHands_loweredDown = performance.now();
        if (indexLeftBelowShoulder && indexRightBelowShoulder) {
            if (motionTrack.errorExceeded(ErrGestureType.indexLeftBelowShoulder+ErrGestureType.indexRightBelowShoulder, RAISINGHANDS_MAX_ERR_CNT))
                commentThis('雙手唔可以下垂');
            return;
        } else if (!indexLeftBelowShoulder && !indexRightBelowShoulder) {
            motionTrack.errorDelete(ErrGestureType.indexLeftBelowShoulder+ErrGestureType.indexRightBelowShoulder);
        }
        if (indexLeftBelowShoulder) {
            if (motionTrack.errorExceeded(ErrGestureType.indexLeftBelowShoulder, RAISINGHANDS_MAX_ERR_CNT))
                commentThis('左手唔可以下垂');
            return;
        } else {
            motionTrack.errorDelete(ErrGestureType.indexLeftBelowShoulder);
        }
        if (indexRightBelowShoulder) {
            if (motionTrack.errorExceeded(ErrGestureType.indexRightBelowShoulder, RAISINGHANDS_MAX_ERR_CNT))
                commentThis('右手唔可以下垂');
            return;
        } else {
            motionTrack.errorDelete(ErrGestureType.indexRightBelowShoulder);
        }

        if (!elbowLeftNotStraight && !elbowRightNotStraight) {
            commentThis('壓低時, 左右手㬹都要有角度')
            return;
        }
        if (!elbowLeftNotStraight) {
            commentThis('壓低時, 左手㬹要有角度')
            return;
        }
        if (!elbowRightNotStraight) {
            commentThis('壓低時, 右手㬹要有角度')
            return;
        }

        if (armLeftTooHigh && armRightTooHigh) {
            if (motionTrack.errorExceeded(ErrGestureType.armLeftTooHigh+ErrGestureType.armRightTooHigh, RAISINGHANDS_MAX_ERR_CNT))
                commentThis('左右手都壓得唔夠低');
            return;
        } else if (!armLeftTooHigh && !armRightTooHigh) {
            motionTrack.errorDelete(ErrGestureType.armLeftTooHigh+ErrGestureType.armRightTooHigh);
        }
        if (armLeftTooHigh) {
            if (motionTrack.errorExceeded(ErrGestureType.armLeftTooHigh, RAISINGHANDS_MAX_ERR_CNT))
                commentThis('左手壓得唔夠低');
            return;
        } else {
            motionTrack.errorDelete(ErrGestureType.armLeftTooHigh);
        }
        if (armRightTooHigh) {
            if (motionTrack.errorExceeded(ErrGestureType.armRightTooHigh, RAISINGHANDS_MAX_ERR_CNT))
                commentThis('右手壓得唔夠低');
            return;
        } else {
            motionTrack.errorDelete(ErrGestureType.armRightTooHigh);
        }

        loweringIsOk = true;
    } else if (isArmLeftLifted && isArmRightLifted) {
        motionTrack.raisingHands_raisedUp = performance.now();
        if (indexLeftBelowShoulder && indexRightBelowShoulder) {
            if (motionTrack.errorExceeded(ErrGestureType.indexLeftBelowShoulder+ErrGestureType.indexRightBelowShoulder, RAISINGHANDS_MAX_ERR_CNT))
                commentThis('雙手唔可以下垂');
            return;
        } else if (!indexLeftBelowShoulder && !indexRightBelowShoulder) {
            motionTrack.errorDelete(ErrGestureType.indexLeftBelowShoulder+ErrGestureType.indexRightBelowShoulder);
        }
        if (indexLeftBelowShoulder) {
            if (motionTrack.errorExceeded(ErrGestureType.indexLeftBelowShoulder, RAISINGHANDS_MAX_ERR_CNT))
                commentThis('左手唔可以下垂');
            return;
        } else {
            motionTrack.errorDelete(ErrGestureType.indexLeftBelowShoulder);
        }
        if (indexRightBelowShoulder) {
            if (motionTrack.errorExceeded(ErrGestureType.indexRightBelowShoulder, RAISINGHANDS_MAX_ERR_CNT))
                commentThis('右手唔可以下垂');
            return;
        } else {
            motionTrack.errorDelete(ErrGestureType.indexRightBelowShoulder);
        }

        if (elbowLeftNotStraight && elbowRightNotStraight) {
            if (motionTrack.errorExceeded(ErrGestureType.elbowLeftNotStraight+ErrGestureType.elbowRightNotStraight, RAISINGHANDS_MAX_ERR_CNT))
                commentThis('舉手時, 左右手㬹都要直')
            return;
        } else if (!elbowLeftNotStraight && !elbowRightNotStraight) {
            motionTrack.errorDelete(ErrGestureType.elbowLeftNotStraight+ErrGestureType.elbowRightNotStraight);
        }
        if (elbowLeftNotStraight) {
            if (motionTrack.errorExceeded(ErrGestureType.elbowLeftNotStraight, RAISINGHANDS_MAX_ERR_CNT))
                commentThis('舉手時, 左手㬹要直')
            return;
        } else {
            motionTrack.errorDelete(ErrGestureType.elbowLeftNotStraight);
        }
        if (elbowRightNotStraight) {
            if (motionTrack.errorExceeded(ErrGestureType.elbowRightNotStraight, RAISINGHANDS_MAX_ERR_CNT))
                commentThis('舉手時, 右手㬹要直')
            return;
        } else {
            motionTrack.errorDelete(ErrGestureType.elbowRightNotStraight);
        }

        if (armLeftTooLow && armRightTooLow) {
            if (motionTrack.errorExceeded(ErrGestureType.armLeftTooLow+ErrGestureType.armRightTooLow, RAISINGHANDS_MAX_ERR_CNT))
                commentThis('左右手都舉得唔夠高');
            return;
        } else {
            motionTrack.errorDelete(ErrGestureType.armLeftTooLow+ErrGestureType.armRightTooLow);
        }
        if (armLeftTooLow) {
            if (motionTrack.errorExceeded(ErrGestureType.armLeftTooLow, RAISINGHANDS_MAX_ERR_CNT))
                commentThis('左手舉得唔夠高');
            return;
        } else {
            motionTrack.errorDelete(ErrGestureType.armLeftTooLow);
        }
        if (armRightTooLow) {
            if (motionTrack.errorExceeded(ErrGestureType.armRightTooLow, RAISINGHANDS_MAX_ERR_CNT))
                commentThis('右手舉得唔夠高');
            return;
        } else {
            motionTrack.errorDelete(ErrGestureType.armRightTooLow);
        }

        liftingIsOk = true;
    }

    if (isArmLeftLowered && isArmRightLowered && loweringIsOk && hasNoTransitionSince(motionTrack.raisingHands_raisedUp)) {
        commentThis('你雙手好耐冇舉高過');
    } else if (isArmLeftLifted && isArmRightLifted && liftingIsOk && hasNoTransitionSince(motionTrack.raisingHands_loweredDown)) {
        commentThis('你雙手好耐冇放低過');
    } else if (isArmLeftLowered && isArmRightLowered && loweringIsOk) {
        motionTrack.resetErrGestureCnt();
        commentThis(complimentsForGoodExerciseDone());
    } else if (isArmLeftLifted && isArmRightLifted && liftingIsOk) {
        motionTrack.resetErrGestureCnt();
        commentThis(complimentsForGoodExerciseDone());
    } else {
        motionTrack.resetErrGestureCnt();
        commentThis('你好似唔係做緊舉手動作');
    }
}

function commentThis(commentWords:string):boolean {
    if (isTimeToComment()) {
        $exercise_poseEstComments!.innerHTML = commentWords;
        sayThis(commentWords);
        return(true);
    } else {
        return(false);
    }
}
function complimentsForGoodExerciseDone():string {
    return(currUsername + '做得好好, 請繼續');
}
function isTimeToComment():boolean {
    if (hasElapsed(lastCommentedTime, constLimits.POSE_EST_COMMENT_FREQUENCY)) {
        lastCommentedTime = performance.now();
        return(true);
    } else {
        return(false);
    }
}

function captureReferenceSpine() {
    const DURATION_BETWEEN_SPINE_CAPTURE:number = 4000;

    if (motionTrack.shoulderReferenceY == 0 || hasElapsed(motionTrack.prevSpineCapture, DURATION_BETWEEN_SPINE_CAPTURE)) {
        if (inBetween(userJointAngles!.hipLeft, 175, 180)) {
            motionTrack.prevSpineCapture = performance.now();
            motionTrack.shoulderReferenceY = userLandmarks.shoulderLeft[1];
            motionTrack.spineReferenceLength = Math.sqrt(Math.pow((userLandmarks.shoulderLeft[0] - userLandmarks.hipLeft[0]), 2) + Math.pow((userLandmarks.shoulderLeft[1] - userLandmarks.hipLeft[1]), 2));
        } else if (inBetween(userJointAngles!.hipRight, 175, 180)) {
            motionTrack.prevSpineCapture = performance.now();
            motionTrack.shoulderReferenceY = userLandmarks.shoulderRight[1];
            motionTrack.spineReferenceLength = Math.sqrt(Math.pow((userLandmarks.shoulderRight[0] - userLandmarks.hipRight[0]), 2) + Math.pow((userLandmarks.shoulderRight[1] - userLandmarks.hipRight[1]), 2));
        }
    }
}

function isStandingStill():boolean {
    var shouldersClosed:boolean = (userJointAngles.shoulderLeft < 40.0 && userJointAngles.shoulderRight < 40.0);
    var elbowsStraight:boolean = (userJointAngles.elbowLeft > 130.0 && userJointAngles.elbowRight > 130.0);
    var waistsAreUpright:boolean = (userJointAngles.hipLeft > 160.0 && userJointAngles.hipRight > 160.0);
    var kneesAreUpright:boolean = (userJointAngles.kneeLeft > 160.0 && userJointAngles.kneeRight > 160.0);

    if (shouldersClosed && elbowsStraight && waistsAreUpright && kneesAreUpright) {
        if (motionTrack.standingStill == 0) {
            motionTrack.standingStill = performance.now();
        } else if (hasElapsed(motionTrack.standingStill, constLimits.TIME_COUNT_AS_STANDING_STILL)) {
            commentThis(DONT_JUST_STAND_THERE_DO_NOTHING);
            motionTrack.standingStill = 0;
        }
        return(true);
    } else {
        motionTrack.standingStill = 0;
        return(false);
    }
}

function hipSeemsNotStraight(shoulderY:number):boolean {
    if (motionTrack.shoulderReferenceY == 0)
        return(false);

    if (Math.abs(shoulderY - motionTrack.shoulderReferenceY) > motionTrack.spineReferenceLength/5)
        return(true);
    else
        return(false);
}

function hasNoTransitionSince(prevMotionTime:number):boolean {
    if (performance.now() - prevMotionTime > constLimits.MAX_ELAPSED_BETWEEN_CONTINUOUS_GESTURE)
        return(true)
    else
        return(false);
}
function hasElapsed(lastCheckTime:number, frequencyInMilliSec:number) {
    var timeNow:number = performance.now();
    var milliSecDiff:number = Math.round(timeNow - lastCheckTime);

    if (milliSecDiff > frequencyInMilliSec) {
        return(true);
    } else {
        return(false);
    }
}

////////////////////////////////////////////////////////////////////
// This section is called by the ScreensManager
// 1) when coming into this, what to do
// 2) when leaving this screen, what house keeping is needed
////////////////////////////////////////////////////////////////////
export function Leave() {
    abortExercise();
    setVisitOrLeave(VisitType.GoingAway)
}
export function Visit() {
    setVisitOrLeave(VisitType.EnterInto);
}

function setVisitOrLeave(visitType:VisitType) {
    if (visitType == VisitType.GoingAway) {
        stopWhateverGoingOn(players.Default!);
        $exerciseListScroller!.collapseDropdownList();
        $exercise_readinessCountdown!.style.visibility = 'hidden';
        $exercise_CountdownCircle!.setAttribute('class', 'exercise-countdown-fadeout');
        $exercise_CountdownCircle!.style.visibility = 'hidden';
        $exercise_demoStage!.setAttribute('class', 'slide-out-to-left');
        $exercise_demoStage!.style.visibility = 'hidden';
        $exercise_DropdownDriver!.style.visibility = 'hidden';
        $exercise_playBtn!.style.visibility = 'hidden';
        $exercise_stopBtn!.style.visibility = 'hidden';
        $exercise_poseEstimateStage!.setAttribute('class', 'slide-out-to-right');
        $exercise_poseEstimateStage!.style.visibility = 'hidden';
        $exercise_poseEstUnavailable!.style.visibility = 'hidden';
        $exercise_poseEstComments!.style.visibility = 'hidden';
    } else if (visitType == VisitType.EnterInto) {
        screensManager.showNavigationBar();
        $exercise_DropdownDriver!.style.visibility = 'visible';
        $exerciseListScroller!.collapseDropdownList();
        $exercise_readinessCountdown!.style.visibility = 'hidden';
        $exercise_CountdownCircle!.style.visibility = 'hidden';
        $exercise_demoStage!.setAttribute('class', 'slide-out-to-left');
        $exercise_demoStage!.style.visibility = 'hidden';
        $exercise_playBtn!.style.visibility = 'hidden';
        $exercise_stopBtn!.style.visibility = 'hidden';
        $exercise_poseEstimateStage!.setAttribute('class', 'slide-out-to-right');
        $exercise_poseEstimateStage!.style.visibility = 'hidden';
        $exercise_poseEstUnavailable!.style.visibility = 'hidden';
        $exercise_poseEstComments!.style.visibility = 'hidden';
    }
}
