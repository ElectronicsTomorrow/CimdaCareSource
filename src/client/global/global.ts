import * as THREE from 'three'
import * as BackOfficeDB from '../back_office/BackOffice_DB'
import * as ScreensManager from '../screens_manager'
import {Player, SEX_TYPE} from '../tools/animateMC'
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls'
import {Pose} from "@mediapipe/pose"
import {Camera} from '@mediapipe/camera_utils'
import {LoadingInfoDlg} from '../tools/loading_info_dialog'
import {isSpeaking, cutTheCrab} from '../tools/sounds'
import {DropListScroller} from '../tools/drop_and_list'

export enum HOVER_TO_SELECTED {
    DefaultIntercept = 1800,
    ExtendedIntercept = 2000
}

export class constLimits {
    public static REMINDER_ALARM_LIST_QTY:number = 3;
    public static EXERCISE_LIST_QTY:number = 4;
    public static ENTERTAINMENT_LIST_QTY:number = 4;
    public static POSE_EST_COMMENT_FREQUENCY:number = 4000;              // in milli-seconds
    public static CHECK_OUTSIDE_CAMERA_FREQUENCY:number = 4000;         // in milli-seconds
    public static MAX_ELAPSED_BETWEEN_CONTINUOUS_GESTURE = 1000;
    public static TIME_COUNT_AS_STANDING_STILL = 4000;
    public static COUNTDOWN_CIRCLE_LENGTH:number = Math.PI * 2 * 100;
    public static LANDMARKS_VISIBILITY_MIN_VALUE:number = 0.5;
}

////////////////////////////////////////////////////////////////////
// defines the MC character and all of its animations
////////////////////////////////////////////////////////////////////
export class PlayerInfo {
    public static PERFORM_LOC_X:number = -0.25;
    public static PERFORM_LOC_Y:number = 0;
    public static PERFORM_LOC_Z:number = 0;

    public static DEFAULT_FNAME:string = 'models/Current/Players/DefaultPlayer.fbx';
    public static DEFAULT_SEX:SEX_TYPE = SEX_TYPE.Female;
    public static DEFAULT_PERFORM_SIZE:number = 0.000095;

    public static PLAYER1_FNAME:string = 'models/Current/Players/OtherPlayer_1_Boy.fbx';
    public static PLAYER1_SEX:SEX_TYPE = SEX_TYPE.Male;
    public static PLAYER1_PERFORM_SIZE:number = 0.000095;
}

export class Players {
    public Default:Player | null = null;
    public OtherPlayer1:Player | null = null;
    public OtherPlayer2:Player | null = null;
    public OtherPlayer3:Player | null = null;
    public OtherPlayer4:Player | null = null;
    public OtherPlayer5:Player | null = null;
    public OtherPlayer6:Player | null = null;
}

////////////////////////////////////////////////////////////////////
// defines the MC character and all of its animations
////////////////////////////////////////////////////////////////////
export class GeneralAnims {
    public static IDLE:string = 'models/Current/General/Idle.fbx'; //Mixamo: Idle / Posture=100 / Breathing=100 / Stance=75 / Overdrive=65 / Arm-Space=65,50 / Trim=0,100
    public static BOUNCING_IDLE = 'models/Current/General/HipHopDancing.fbx'; //Mixamo: HipHopDancing / BouncingEmphasis=100 / ArmHeight=100 / ArmWidth=50 / Overdrive=50 / Arm-Space=50 / Trim=0,100
    public static TWOHANDWAIVING:string = 'models/Current/General/Waiving.fbx';
    public static ONEHANDWAIVING:string = 'models/Current/General/WavingGesture.fbx'; // Mixamo: WavingGesture / Overdrive=30 / Arm-Space=50 / Trim=0,100 / Mirror=Checked
    public static WALKING_FORWARD:string = 'models/Current/General/Walking.fbx'; // Mixamo: Walking / Overdrive=50 / Arm-Space=60 / Trim=0,100
    public static JOGGING_BACKWARD:string = 'models/Current/General/SlowJogBackwards.fbx'; // Mixamo: SlowJogBackwards / Twist=50 / Overdrive=50 / Arm-Space=50 / Trim=0,100
    public static POINTINGLEFTHIGH:string = 'models/Current/General/PointingLeftHigh.fbx'; // Mixamo: Pointing / PointDirection=100 / Height=100 / Overdrive=50 / Arm-Space=75 / Trim=0,100
    public static POINTINGRIGHTHIGH:string = 'models/Current/General/PointingRightHigh.fbx'; // Mixamo: Mirror=Checked / Pointing / PointDirection=100 / Height=100 / Overdrive=50 / Arm-Space=75 / Trim=0,100
    public static POINTINGRIGHTMID:string = 'models/Current/General/PointingRightMid.fbx'; // Mixamo: Mirror=Checked / Pointing / PointDirection=100 / Height=20 / Overdrive=50 / Arm-Space=70 / Trim=0,100
    public static POINTINGUP:string = 'models/Current/General/PointingUp.fbx'; // Mixamo: Pointing / AngryLevel=50 / Overdrive=50 / Arm-Space=70 / Trim=0,100
    public static STANDINGYELL:string = 'models/Current/General/StandingYell.fbx'; // Mixamo: StandingYell / Overdrive=50 / Arm-Space=60,55 / Trim=23,63
    public static JUMPSTART:string = 'models/Current/General/Jumping.fbx'; // Mixamo: Jumping / Feet=100 / Anticipation=100 / Overdrive=50 / Arm-Space=60 / Trim=-4,51
    public static JUMPTRANSIT:string = 'models/Current/General/HangingIdle1.fbx'; // Mixamo: HangingIdle / BodyExtension=0 / Swing=50 / Overdrive=50 / Arm-Space=15 / Trim=0,100
    public static SWINGIDLE:string = 'models/Current/General/HangingIdle2.fbx'; // Mixamo: HangingIdle / BodyExtension=100 / Swing=100 / Overdrive=100 / Arm-Space=100 / Trim=0,100
    public static LANDING:string = 'models/Current/General/Landing.fbx'; // Mixamo: Landing / Stance=0 / Distance=60 / Overdrive=50 / Arm-Space=60 / Trim=0,100
    public static ARMSTRETCHING:string = 'models/Current/General/ArmStretching.fbx'; // Mixamo: ArmStretching / Overdrive=50 / Arm-Space=60 / trim=0,100
    public static DANCEWALK:string = 'models/Current/General/JazzDancing.fbx'; // Mixamo: JazzDancing / Motion=100 / Arms=10 / Stride=50 / Overdrive=50 / Arm-Space=50 / trim=0,100
    public static LISTENING:string = 'models/Current/General/Terrified.fbx'; // Mixamo: Overdrive=30 / Arm-Space=50 / trim=6,19
    public static DONTUNDERSTAND:string = 'models/Current/General/Talking1.fbx'; // Mixamo: Talking / Attitude=60 / HandHeight=40 / Overdrive=50 / Arm-Space=70 / trim=10,60
    public static RUNTOFLIP:string = 'models/Current/General/RunToFlip.fbx'; // Mixamo:
    public static SPEAKING:string = 'models/Current/General/Talking2.fbx'; // Mixamo: Talking / Emphasis=100 / Stance=0 / Overdrive=0 / Arm-Space=50 / trim=-30,45
    public static COUNTING_1TO5:string = 'models/Current/General/Counting.fbx'; // Mixamo: Counting / Stance=0 / Emphasis=100 / Look=100 / Overdrive=20 / Arm-Space=50 / trim=5,100
    public static IDLE_POS:number = 0;
    public static BOUNCING_IDLE_POS:number = 1;
    public static TWOHANDWAIVING_POS:number = 2;
    public static ONEHANDWAIVING_POS:number = 3;
    public static WALKING_FORWARD_POS:number = 4;
    public static JOGGING_BACKWARD_POS:number = 5;
    public static POINTINGLEFTHIGH_POS:number = 6;
    public static POINTINGRIGHTHIGH_POS:number = 7;
    public static POINTINGRIGHTMID_POS:number = 8;
    public static POINTINGUP_POS:number = 9;
    public static STANDINGYELL_POS:number = 10;
    public static JUMPSTART_POS:number = 11;
    public static JUMPTRANSIT_POS: number = 12;
    public static SWINGIDLE_POS:number = 13;
    public static LANDING_POS:number = 14;
    public static ARMSTRETCHING_POS:number = 15;
    public static DANCEWALK_POS:number = 16;
    public static LISTENING_POS:number = 17;
    public static DONTUNDERSTAND_POS:number = 18;
    public static RUNTOFLIP_POS:number = 19;
    public static SPEAKING_POS:number = 20;
    public static COUNTING_1TO5_POS:number = 21;
}

////////////////////////////////////////////////////////////////////
// The loading dialog
////////////////////////////////////////////////////////////////////
declare global {
    var loadingInfoDlg:LoadingInfoDlg;
}
globalThis.loadingInfoDlg = new LoadingInfoDlg();

////////////////////////////////////////////////////////////////////
// plays the alarm sound
////////////////////////////////////////////////////////////////////
declare global {
    var alarmClock:HTMLAudioElement;
    var ConfirmationTone:HTMLAudioElement;
}
globalThis.alarmClock = new Audio('sound/Reminder/ClockAlarm.mp3');
globalThis.ConfirmationTone = new Audio('sound/General/ConfirmationTone.wav');

////////////////////////////////////////////////////////////////////
// defines the elements of THREE.js
////////////////////////////////////////////////////////////////////
declare global {
    var players:Players;
    var scene:THREE.Scene;
    var sceneCamera:THREE.PerspectiveCamera | null;
    var orbitControl:OrbitControls | null;
    var backgroundPng:THREE.Texture | null;
    var textureLoader:THREE.TextureLoader;
}
globalThis.players = new Players;
globalThis.scene = new THREE.Scene();
globalThis.sceneCamera = null;
globalThis.orbitControl = null;
globalThis.backgroundPng = null;
globalThis.textureLoader = new THREE.TextureLoader();

////////////////////////////////////////////////////////////////////
// defines the HTML elements of each screen
////////////////////////////////////////////////////////////////////
declare global {
    // defines the HTML elements for the Welcome screen
    var $welcome_text:HTMLElement | null;
    var $welcome_readyBtn:HTMLElement | null;
    // defines the HTML elements for the Reminder screen
    var $reminder_alarmListPanel:HTMLElement | null;
    var $reminder_alarmList:HTMLUListElement | null;
    var $alarmListScroller:DropListScroller | null;
    var $reminder_alarmPanel:HTMLElement | null;
    var $reminder_alarmDetailSimpleMediName:HTMLElement | null;
    var $reminder_alarmDetailHowToTake:HTMLElement | null;
    var $reminder_alarmDetailPrerequisite:HTMLElement | null;
    var $reminder_alarmDetailMediPic:HTMLImageElement | null;
    var $reminder_alarmDetailClose:HTMLElement | null;
    // defines the HTML elements for the Exercise screen
    var $exercise_DropdownDriver:HTMLElement | null;
    var $exercise_DropdownPanel:HTMLElement | null;
    var $exercise_DropdownList:HTMLUListElement | null;
    var $exerciseListScroller:DropListScroller | null;
    var $exercise_readinessCountdown:HTMLElement | null;
    var $exercise_CountdownCircle:HTMLElement | null;
    var $exercise_CountdownProgressBar:HTMLElement | null;
    var $exercise_CountdownPointer:HTMLElement | null;
    var $exercise_CountdownText:HTMLElement | null;
    var $exercise_demoStage:HTMLElement | null;
    var $exercise_playBtn:HTMLButtonElement | null;
    var $exercise_stopBtn:HTMLButtonElement | null;
    var $exercise_video:HTMLVideoElement | null;
    var $exercise_poseEstimateStage:HTMLElement | null;
    var $exercise_poseEstimateCanvas:HTMLCanvasElement | null;
    var $exercise_poseEstUnavailable:HTMLElement | null;
    var $exercise_poseEstComments:HTMLElement | null;
    var $exercise_canvasContext:CanvasRenderingContext2D | null;
    var $exercise_MP_Pose:Pose | null;
    var $exercise_MP_Camera:Camera | null;
    var $exercise_cheatSheet1:HTMLElement | null;
    var $exercise_cheatSheet2:HTMLElement | null;
    var $exercise_cheatSheet3:HTMLElement | null;
    var $exercise_cheatSheet4:HTMLElement | null;
    var $exercise_cheatSheet5:HTMLElement | null;
    var $exercise_cheatSheet6:HTMLElement | null;
    var $exercise_cheatSheet7:HTMLElement | null;
    // defines the HTML elements for the Entertainment screen
    var $entertain_Equalizer:HTMLCanvasElement | null;
    var $entertain_DropdownDriver:HTMLElement | null;
    var $entertain_DropdownPanel:HTMLElement | null;
    var $entertain_DropdownList:HTMLUListElement | null;
    var $entertainListScroller:DropListScroller | null;
    var $entertain_SongPlayPanel:HTMLElement | null;
    var $entertain_PlayBtn:HTMLButtonElement | null;
    var $entertain_FullKaraokeBtn:HTMLButtonElement | null;
    var $entertain_HalfKaraokeBtn:HTMLButtonElement | null;
    var $entertain_StopBtn:HTMLButtonElement | null;
    var $entertain_PauseBtn:HTMLButtonElement | null;
    var $entertain_ResumeBtn:HTMLButtonElement | null;
    var $entertain_LyricsRibbon:HTMLElement | null;
    // defines the HTML elements for the Chat screen
    var $chat_MicrophoneBtn:HTMLButtonElement | null;
    var $chat_CountdownCircle:HTMLElement | null;
    var $chat_CountdownProgressBar:HTMLElement | null;
    var $chat_CountdownPointer:HTMLElement | null;
    var $chat_CountdownText:HTMLElement | null;
    var $chat_MicPhoneVisualizer1:HTMLCanvasElement | null;
    var $chat_MicPhoneVisualizer2:HTMLCanvasElement | null;
    var $chat_ClockContainer:HTMLElement | null;
    var $chat_Calendar:HTMLElement | null;
    var $chat_CalendarMonth:HTMLElement | null;
    var $chat_CalendarYear:HTMLElement | null;
    var $chat_CalendarDays:HTMLCollection | null;
    var $chat_CalendarPrev:HTMLElement | null;
    var $chat_CalendarNext:HTMLElement | null;
    var $chat_Translation:HTMLElement | null;
    var $chat_TranslationHeader:HTMLElement | null;
    var $chat_TranslatedText:HTMLElement | null;
}
globalThis.$welcome_text = null;
globalThis.$welcome_readyBtn = null;
globalThis.$reminder_alarmListPanel = null;
globalThis.$reminder_alarmList = null;
globalThis.$alarmListScroller = null;
globalThis.$reminder_alarmPanel = null;
globalThis.$reminder_alarmDetailSimpleMediName = null;
globalThis.$reminder_alarmDetailHowToTake = null;
globalThis.$reminder_alarmDetailPrerequisite = null;
globalThis.$reminder_alarmDetailMediPic = null;
globalThis.$reminder_alarmDetailClose = null;
globalThis.$exercise_DropdownDriver = null;
globalThis.$exercise_DropdownPanel = null
globalThis.$exercise_DropdownList = null;
globalThis.$exerciseListScroller = null;
globalThis.$exercise_readinessCountdown = null;
globalThis.$exercise_CountdownCircle = null;
globalThis.$exercise_CountdownProgressBar = null;
globalThis.$exercise_CountdownPointer = null;
globalThis.$exercise_CountdownText = null;
globalThis.$exercise_demoStage = null;
globalThis.$exercise_playBtn = null;
globalThis.$exercise_stopBtn = null;
globalThis.$exercise_video = null;
globalThis.$exercise_poseEstimateStage = null;
globalThis.$exercise_poseEstimateCanvas = null;
globalThis.$exercise_poseEstUnavailable = null;
globalThis.$exercise_poseEstComments = null;
globalThis.$exercise_canvasContext = null;
globalThis.$exercise_MP_Pose = null;
globalThis.$exercise_MP_Camera = null;
globalThis.$exercise_cheatSheet1 = null;
globalThis.$exercise_cheatSheet2 = null;
globalThis.$exercise_cheatSheet3 = null;
globalThis.$exercise_cheatSheet4 = null;
globalThis.$exercise_cheatSheet5 = null;
globalThis.$exercise_cheatSheet6 = null;
globalThis.$exercise_cheatSheet7 = null;
globalThis.$entertain_Equalizer = null;
globalThis.$entertain_DropdownDriver = null;
globalThis.$entertain_DropdownPanel = null;
globalThis.$entertain_DropdownList = null;
globalThis.$entertainListScroller = null;
globalThis.$entertain_SongPlayPanel = null;
globalThis.$entertain_PlayBtn = null;
globalThis.$entertain_FullKaraokeBtn = null;
globalThis.$entertain_HalfKaraokeBtn = null;
globalThis.$entertain_StopBtn = null;
globalThis.$entertain_PauseBtn = null;
globalThis.$entertain_ResumeBtn = null;
globalThis.$entertain_LyricsRibbon = null;
globalThis.$chat_MicrophoneBtn = null;
globalThis.$chat_CountdownCircle = null;
globalThis.$chat_CountdownProgressBar = null;
globalThis.$chat_CountdownPointer = null;
globalThis.$chat_CountdownText = null;
globalThis.$chat_MicPhoneVisualizer1 = null;
globalThis.$chat_MicPhoneVisualizer2 = null;
globalThis.$chat_ClockContainer = null;
globalThis.$chat_Calendar = null;
globalThis.$chat_CalendarMonth = null;
globalThis.$chat_CalendarYear = null;
globalThis.$chat_CalendarDays = null;
globalThis.$chat_CalendarPrev = null;
globalThis.$chat_CalendarNext = null;
globalThis.$chat_Translation = null;
globalThis.$chat_TranslationHeader = null;
globalThis.$chat_TranslatedText = null;

////////////////////////////////////////////////////////////////////
// Used by the Exercise screen
////////////////////////////////////////////////////////////////////
declare global {
    var cameraUnavailable:boolean;
}
globalThis.cameraUnavailable = true;

////////////////////////////////////////////////////////////////////
// defines the database
////////////////////////////////////////////////////////////////////
declare global {
    var Reminders:BackOfficeDB.Reminder[];
    var Exercises:BackOfficeDB.Exercise[];
    var Entertainments:BackOfficeDB.Entertainment[];
    var currUsername:string;
}
globalThis.Reminders = [];
globalThis.Exercises = [];
globalThis.Entertainments = [];
globalThis.currUsername = '你';


////////////////////////////////////////////////////////////////////
// Controls the navigation bar at bottom of screen
// and is also in charge of the switching between different screens
////////////////////////////////////////////////////////////////////
declare global {
    var screensManager:ScreensManager.ScreensManager;
}
globalThis.screensManager = new ScreensManager.ScreensManager();

/////////////////////////////////////////////////////////////////////
// Common to both up and down arrows
/////////////////////////////////////////////////////////////////////
export function wait(ms:number) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve(true);
        }, ms);
    });
}

export function stopWhateverGoingOn(thePlayer:Player) {
    if (isSpeaking())
        cutTheCrab();

    if (thePlayer != null)
        thePlayer.animateSeries.removeAll();
}

export function inBetween(checkValue:number, lowerBound:number, upperBound:number):boolean {
    if (checkValue >= lowerBound && checkValue <= upperBound) {
        return(true);
    } else {
        return(false);
    }
}
export function screenToWorld(screenPos:THREE.Vector3):THREE.Vector3 {
    screenPos.x = (screenPos.x / window.innerWidth) * 2 - 1;
    screenPos.y = -(screenPos.y / window.innerHeight) * 2 + 1;
    screenPos.z = 0;

    screenPos.unproject(sceneCamera!);

    const dir = screenPos.sub(sceneCamera!.position).normalize();
    const distance:number = -sceneCamera!.position.z / dir.z;
    const worldPos:THREE.Vector3 = sceneCamera!.position.clone().add(dir.multiplyScalar(distance));

    return(worldPos);
}
export function worldToScreen(object:THREE.Object3D):THREE.Vector3 {
    const screenPos:THREE.Vector3 = new THREE.Vector3();
    const widthHalf:number = window.innerWidth / 2;
    const heightHalf:number = window.innerHeight / 2;

    object.updateMatrixWorld();
    screenPos.setFromMatrixPosition(object.matrixWorld);
    screenPos.project(sceneCamera!);

    screenPos.x = (screenPos.x * widthHalf) + widthHalf;
    screenPos.y = -(screenPos.y * heightHalf) + heightHalf;

    return(screenPos);;
}

declare global {
    interface Window {
        SpeechRecognition:any;
        webkitSpeechRecognition:any;
        webkitAudioContext:any;
    }
}