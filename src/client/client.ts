import * as THREE from 'three'
import * as Reminder from './screens/reminder'
import * as AnimateMC from './tools/animateMC'
import * as BackOfficeDB from './back_office/BackOffice_DB'
import * as Tools from './global/global'
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls'
import {FBXLoader} from 'three/examples/jsm/loaders/FBXLoader'
import {TWEEN} from 'three/examples/jsm/libs/tween.module.min'
import {DropListScroller} from './tools/drop_and_list'
import {PlayerInfo, Players, GeneralAnims, constLimits, HOVER_TO_SELECTED} from './global/global'
import {constDef} from './screens_manager'
import {Player, SEX_TYPE, AnimType} from './tools/animateMC'
import {Pose} from "@mediapipe/pose"
import {Camera} from '@mediapipe/camera_utils'
import {sayThis, speech} from './tools/sounds'

/////////////////////////////////////////////////////////////////////
// Variable declaration for current page
/////////////////////////////////////////////////////////////////////
const clock = new THREE.Clock()
const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
const renderer = new THREE.WebGLRenderer()
const fbxLoader:FBXLoader = new FBXLoader()

var modelReady:boolean = false;
var voicesReady:boolean = false;
var currGeneralAnimLoadIdx = 0;
var currExerciseAnimLoadIdx = 0;
var currEntertainAnimLoadIdx = 0;

let supposedAnimations = [
    {animName: GeneralAnims.IDLE,               insertPos: GeneralAnims.IDLE_POS},
    {animName: GeneralAnims.BOUNCING_IDLE,      insertPos: GeneralAnims.BOUNCING_IDLE_POS},
    {animName: GeneralAnims.TWOHANDWAIVING,     insertPos: GeneralAnims.TWOHANDWAIVING_POS},
    {animName: GeneralAnims.ONEHANDWAIVING,     insertPos: GeneralAnims.ONEHANDWAIVING_POS},
    {animName: GeneralAnims.WALKING_FORWARD,    insertPos: GeneralAnims.WALKING_FORWARD_POS},
    {animName: GeneralAnims.JOGGING_BACKWARD,   insertPos: GeneralAnims.JOGGING_BACKWARD_POS},
    {animName: GeneralAnims.POINTINGLEFTHIGH,   insertPos: GeneralAnims.POINTINGLEFTHIGH_POS},
    {animName: GeneralAnims.POINTINGRIGHTHIGH,  insertPos: GeneralAnims.POINTINGRIGHTHIGH_POS},
    {animName: GeneralAnims.POINTINGRIGHTMID,   insertPos: GeneralAnims.POINTINGRIGHTMID_POS},
    {animName: GeneralAnims.STANDINGYELL,       insertPos: GeneralAnims.STANDINGYELL_POS},
    {animName: GeneralAnims.JUMPSTART,          insertPos: GeneralAnims.JUMPSTART_POS},
    {animName: GeneralAnims.JUMPTRANSIT,        insertPos: GeneralAnims.JUMPTRANSIT_POS},
    {animName: GeneralAnims.SWINGIDLE,          insertPos: GeneralAnims.SWINGIDLE_POS},
    {animName: GeneralAnims.LANDING,            insertPos: GeneralAnims.LANDING_POS},
    {animName: GeneralAnims.POINTINGUP,         insertPos: GeneralAnims.POINTINGUP_POS},
    {animName: GeneralAnims.ARMSTRETCHING,      insertPos: GeneralAnims.ARMSTRETCHING_POS},
    {animName: GeneralAnims.DANCEWALK,          insertPos: GeneralAnims.DANCEWALK_POS},
    {animName: GeneralAnims.LISTENING,          insertPos: GeneralAnims.LISTENING_POS},
    {animName: GeneralAnims.DONTUNDERSTAND,     insertPos: GeneralAnims.DONTUNDERSTAND_POS},
    {animName: GeneralAnims.RUNTOFLIP,          insertPos: GeneralAnims.RUNTOFLIP_POS},
    {animName: GeneralAnims.SPEAKING,           insertPos: GeneralAnims.SPEAKING_POS},
    {animName: GeneralAnims.COUNTING_1TO5,      insertPos: GeneralAnims.COUNTING_1TO5_POS}
];
//******************* End Variable declaration *******************//



////////////////////////////////////////////////////////////////////
// Initializing functions
////////////////////////////////////////////////////////////////////
function initHtmlElements() {
    initHtmlWelcomeScreen();
    initHtmlReminderScreen();
    initHtmlExerciseScreen();
    initHtmlEntertainmentScreen();
    initHTMLChatScreen();
}
function initHtmlWelcomeScreen() {
    $welcome_text = document.getElementById("welcome-text");
    $welcome_readyBtn = document.getElementById("welcome-readyBtn");
    $welcome_readyBtn!.addEventListener("click", function() {
        screensManager.comeReminderScreen();
    });
}
function initHtmlReminderScreen() {
    $reminder_alarmListPanel = document.getElementById("reminder-alarmList-panel") as HTMLImageElement;
    $reminder_alarmList = document.getElementById("reminder-alarmList") as HTMLUListElement;
    $reminder_alarmPanel = document.getElementById('alarm-panel');
    $reminder_alarmPanel!.setAttribute('class', 'slide-out');
    $reminder_alarmDetailSimpleMediName = document.getElementById('alarm-detail-simpleMediName');
    $reminder_alarmDetailHowToTake = document.getElementById('alarm-detail-howToTake');
    $reminder_alarmDetailPrerequisite = document.getElementById('alarm-detail-prerequisite');
    $reminder_alarmDetailMediPic = document.getElementById('alarm-detail-mediPic') as HTMLImageElement;
    $reminder_alarmDetailClose = document.getElementById("alarm-detail-close");

    $alarmListScroller = new DropListScroller($reminder_alarmListPanel, 'reminder-UpArrowBtn', 'reminder-DownArrowBtn', $reminder_alarmList, constLimits.REMINDER_ALARM_LIST_QTY);
    $alarmListScroller.init();
}
function initHtmlExerciseScreen() {
    $exercise_DropdownDriver = document.getElementById('exercise-dropdown-driver');
    $exercise_DropdownPanel = document.getElementById('exercise-dropdown-panel');
    $exercise_DropdownList = document.getElementById('exercise-dropdown-list') as HTMLUListElement;
    $exercise_readinessCountdown = document.getElementById('exercise-readiness-countdown');
    $exercise_CountdownCircle = document.getElementById('exercise-countdown-circle');
    $exercise_CountdownProgressBar = document.querySelector('.exercise-e-c-progress') as HTMLElement;
    $exercise_CountdownProgressBar!.style.strokeDasharray = constLimits.COUNTDOWN_CIRCLE_LENGTH.toString();
    $exercise_CountdownPointer = document.getElementById('exercise-e-pointer');
    $exercise_CountdownText = document.getElementById('exercise-countdown-remain-time');
    $exercise_demoStage = document.getElementById('exercise-demo-stage');
    $exercise_playBtn = document.getElementById('exercise-play-button') as HTMLButtonElement;
    $exercise_stopBtn = document.getElementById('exercise-stop-button') as HTMLButtonElement;
    $exercise_video = document.getElementById("MediaPipe-input-video") as HTMLVideoElement;
    $exercise_poseEstimateStage = document.getElementById("exercise-pose-estimate-stage");
    $exercise_poseEstimateCanvas = document.getElementById('exercise-pose-estimate-canvas') as HTMLCanvasElement;
    $exercise_poseEstUnavailable = document.getElementById("exercise-pose-estimate-unavailable");
    $exercise_poseEstComments = document.getElementById("exercise-pose-estimate-comments");

    $exercise_cheatSheet1 = document.getElementById("exercise_cheatsheet_1");
    $exercise_cheatSheet2 = document.getElementById("exercise_cheatsheet_2");
    $exercise_cheatSheet3 = document.getElementById("exercise_cheatsheet_3");
    $exercise_cheatSheet4 = document.getElementById("exercise_cheatsheet_4");
    $exercise_cheatSheet5 = document.getElementById("exercise_cheatsheet_5");
    $exercise_cheatSheet6 = document.getElementById("exercise_cheatsheet_6");
    $exercise_cheatSheet7 = document.getElementById("exercise_cheatsheet_7");

    $exerciseListScroller = new DropListScroller($exercise_DropdownPanel, 'exercise-UpArrowBtn', 'exercise-DownArrowBtn', $exercise_DropdownList, constLimits.EXERCISE_LIST_QTY);
    $exerciseListScroller.init();
}
function initHtmlEntertainmentScreen() {
    $entertain_Equalizer = document.getElementById("entertain-equalizer") as HTMLCanvasElement;
    $entertain_DropdownDriver = document.getElementById('entertain-dropdown-driver');
    $entertain_DropdownPanel = document.getElementById('entertain-dropdown-panel');
    $entertain_DropdownList = document.getElementById('entertain-dropdown-list') as HTMLUListElement;
    $entertain_SongPlayPanel = document.getElementById('entertain-song-play-panel');
    $entertain_PlayBtn = document.getElementById('entertain-play-button') as HTMLButtonElement;
    $entertain_FullKaraokeBtn = document.getElementById('entertain-full-karaoke-button') as HTMLButtonElement;
    $entertain_HalfKaraokeBtn = document.getElementById('entertain-half-karaoke-button') as HTMLButtonElement;
    $entertain_StopBtn = document.getElementById('entertain-stop-button') as HTMLButtonElement;
    $entertain_PauseBtn = document.getElementById('entertain-pause-button') as HTMLButtonElement;
    $entertain_ResumeBtn = document.getElementById('entertain-resume-button') as HTMLButtonElement;
    $entertain_LyricsRibbon = document.getElementById("entertain-lyrics-ribbon");

    $entertainListScroller = new DropListScroller($entertain_DropdownPanel, 'entertain-UpArrowBtn', 'entertain-DownArrowBtn', $entertain_DropdownList, constLimits.ENTERTAINMENT_LIST_QTY);
    $entertainListScroller.init();
}
function initHTMLChatScreen() {
    $chat_MicrophoneBtn = document.getElementById('chat-microphone') as HTMLButtonElement;
    $chat_CountdownCircle = document.getElementById('chat-countdown-circle');
    $chat_CountdownProgressBar = document.querySelector('.chat-e-c-progress') as HTMLElement;
    $chat_CountdownProgressBar!.style.strokeDasharray = constLimits.COUNTDOWN_CIRCLE_LENGTH.toString();
    $chat_CountdownPointer = document.getElementById('chat-e-pointer');
    $chat_CountdownText = document.getElementById('chat-countdown-remain-time');
    $chat_MicPhoneVisualizer1 = document.getElementById('chat-MicPhone-Visualizer-1') as HTMLCanvasElement;
    $chat_MicPhoneVisualizer2 = document.getElementById('chat-MicPhone-Visualizer-2') as HTMLCanvasElement;
    $chat_ClockContainer = document.getElementById('chat-clock-container') as HTMLElement;
    $chat_Calendar = document.getElementById('chat-calender') as HTMLElement;
    $chat_CalendarMonth = document.getElementById('chat-calendar-month-title') as HTMLElement;
    $chat_CalendarYear = document.getElementById('chat-calendar-year-title') as HTMLElement;
    $chat_CalendarDays = document.getElementsByClassName('chat-calendar-days') as HTMLCollection;
    $chat_CalendarPrev = document.getElementById("chat-calendar-prev") as HTMLElement;
    $chat_CalendarNext = document.getElementById("chat-calendar-next") as HTMLElement;
    $chat_Translation = document.getElementById("chat-translation") as HTMLElement;
    $chat_TranslationHeader = document.getElementById("chat-translation-header") as HTMLElement;
    $chat_TranslatedText = document.getElementById("chat-translated-text") as HTMLElement;
}
//****************** End initHtmlElements ******************//


////////////////////////////////////////////////////////////////////
// Sets up the Three.js scene
////////////////////////////////////////////////////////////////////
function setupCanvas() {
    scene.add(ambientLight);
//    scene.add(new THREE.AxesHelper(5))

    backgroundPng = textureLoader.load(constDef.WELCOME_BKGRD)
    scene.background = backgroundPng

    sceneCamera = new THREE.PerspectiveCamera(
        20,
        window.innerWidth / window.innerHeight,
        1,
        1000
    )
//    camera.position.set(0, 3, 10); // Important: DO NOT DELETE THIS, this is for Boy01
    sceneCamera.position.set(0, 1.8141, 6.6691) // Important: DO NOT DELETE THIS, this is for Girl0x

    renderer.setSize(window.innerWidth, window.innerHeight)
    document.body.appendChild(renderer.domElement)

    orbitControl = new OrbitControls(sceneCamera, renderer.domElement)
    orbitControl.enableDamping = true
//    orbitControl.target.set(1, 1.5, 0);   // Important: DO NOT DELETE THIS, this is for Boy01
    orbitControl.target.set(0, 1, 0)        // Important: DO NOT DELETE THIS, this is for Girt0x
    orbitControl.enabled = false;
}
//****************** End Three.js scene ******************//


////////////////////////////////////////////////////////////////////
// Load in the main character FBX
////////////////////////////////////////////////////////////////////
function loadMainCharacter() {
    loadingInfoDlg.informProgress("開始上載主角司儀 ...");
    fbxLoader.load(PlayerInfo.DEFAULT_FNAME,
        (object) => {
            players.Default = new Player(object, PlayerInfo.DEFAULT_SEX, PlayerInfo.DEFAULT_PERFORM_SIZE, GeneralAnims.IDLE_POS);

            loadingInfoDlg.informProgress('開始上載主角的一般動畫 ...');
            loadNxtGeneralAnim();
        },
        (xhr) => {
            loadingInfoDlg.informProgress('主角司儀上載 : ' + Math.round((xhr.loaded / xhr.total) * 100) + '%');
        },
        (error) => {
            loadingInfoDlg.reportError('主角司儀上載');
        }
    )
}

////////////////////////////////////////////////////////////////////
// Loads in the general animations such as greeting, walking,
// jumping, etc
////////////////////////////////////////////////////////////////////
async function loadNxtGeneralAnim() {
    if (currGeneralAnimLoadIdx < supposedAnimations.length) {
        loadOneGeneralAnim();
    } else {
        loadingInfoDlg.informProgress('開始上載主角的運動動畫 ...');
        loadNxtExerciseAnim();
    }
}
function loadOneGeneralAnim() {
    fbxLoader.load(supposedAnimations[currGeneralAnimLoadIdx].animName,
        (object:THREE.Object3D) => {
            const animationAction:THREE.AnimationAction = players.Default!.mixer.clipAction(object.animations[0]);
            players.Default!.geneAnims.splice(supposedAnimations[currGeneralAnimLoadIdx].insertPos, 0, animationAction);

            currGeneralAnimLoadIdx++;
            loadNxtGeneralAnim();
        },
        (xhr) => {
            loadingInfoDlg.informProgress('主角一般動畫上載 <' + supposedAnimations[currGeneralAnimLoadIdx].animName + '> : ' + Math.round((xhr.loaded / xhr.total * 100)) + '%');
        },
        (error) => {
            loadingInfoDlg.reportError('主角一般動畫上載 <' + supposedAnimations[currGeneralAnimLoadIdx].animName + '>');
        }
    )
}

////////////////////////////////////////////////////////////////////
// Loads in the animations for exercises
////////////////////////////////////////////////////////////////////
function loadNxtExerciseAnim() {
    if (currExerciseAnimLoadIdx < Exercises.length) {
        loadOneExerciseAnim();
    } else {
        loadingInfoDlg.informProgress('開始上載主角的舞蹈動畫 ...');
        loadNxtEntertainmentAnim();
    }
}
function loadOneExerciseAnim() {
    fbxLoader.load('models/Current/Exercise/' + Exercises[currExerciseAnimLoadIdx].animationSrc,
        (object:THREE.Object3D) => {
            const animationAction:THREE.AnimationAction = players.Default!.mixer!.clipAction(object.animations[0]);
            players.Default!.exerAnims.splice(currExerciseAnimLoadIdx, 0, animationAction);

            ++currExerciseAnimLoadIdx;
            loadNxtExerciseAnim()
        },
        (xhr) => {
            loadingInfoDlg.informProgress('主角運動動畫上載 <' + Exercises[currExerciseAnimLoadIdx].titleChinese + '> : ' + Math.round((xhr.loaded / xhr.total * 100)) + '%');
        },
        (error) => {
            loadingInfoDlg.reportError('主角運動動畫上載 <' + Exercises[currExerciseAnimLoadIdx].titleChinese + '>');
        }
    )
}

////////////////////////////////////////////////////////////////////
// Loads in the animations for entertainments
////////////////////////////////////////////////////////////////////
function loadNxtEntertainmentAnim() {
    if (currEntertainAnimLoadIdx < Entertainments.length) {
        loadOneEntertainmentAnim();
    } else {
        modelReady = true;
        players.Default!.inflateToPerformerSize();
        players.Default!.mesh.position.set(-0.25, 0, 0);
        scene.add(players.Default!.mesh);
        players.Default!.animateSeries.animate({action: players.Default!.geneAnims[GeneralAnims.TWOHANDWAIVING_POS], loop: THREE.LoopRepeat, animType: AnimType.OneShot, callBack: null});
        setupPoseEstimation();
    }
}
function loadOneEntertainmentAnim() {
    fbxLoader.load('models/Current/Entertainment/' + Entertainments[currEntertainAnimLoadIdx].danceUrl,
        (object:THREE.Object3D) => {
            const animationAction:THREE.AnimationAction = players.Default!.mixer!.clipAction(object.animations[0]);
            players.Default!.entainAnims.splice(currEntertainAnimLoadIdx, 0, animationAction);

            ++currEntertainAnimLoadIdx;
            loadNxtEntertainmentAnim()
        },
        (xhr) => {
            loadingInfoDlg.informProgress('主角舞蹈動畫上載 <' + Entertainments[currEntertainAnimLoadIdx].title + '> : ' + Math.round((xhr.loaded / xhr.total * 100)) + '%');
        },
        (error) => {
            loadingInfoDlg.reportError('主角舞蹈動畫上載 <' + Entertainments[currEntertainAnimLoadIdx].title + '>');
        }
    )
}

////////////////////////////////////////////////////////////////////
// Sets up the camera for pose estimation
////////////////////////////////////////////////////////////////////
async function setupPoseEstimation() {
    loadingInfoDlg.informProgress('現在啟動電腦鏡頭, 請稍候片刻 ...');

    $exercise_canvasContext = $exercise_poseEstimateCanvas!.getContext('2d');
    $exercise_MP_Pose = new Pose({locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
    }});
    $exercise_MP_Pose!.setOptions({
        selfieMode: true,
        modelComplexity: 1,
        smoothLandmarks: true,
        enableSegmentation: false,
        smoothSegmentation: false,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
    });

    $exercise_MP_Camera = new Camera($exercise_video as HTMLVideoElement, {
        onFrame: async () => {
            await $exercise_MP_Pose!.send({image: $exercise_video as HTMLVideoElement});
        },
        width: 480,
        height: 480,
        facingMode: 'user'
    });

    await $exercise_MP_Camera!.start().then((result:any) => {cameraUnavailable = false}).catch((error:any) => {cameraUnavailable = true});
    initiateTextToVoice();
}

////////////////////////////////////////////////////////////////////
// Prepares the Text to Voice functionality
////////////////////////////////////////////////////////////////////
async function initiateTextToVoice() {
    loadingInfoDlg.informProgress('現在啟動聲音系統, 請稍候片刻 ...');

    const getVoices = () => {
            return new Promise(resolve => {
                let voices = window.speechSynthesis.getVoices();
                if (voices.length > 0) {
                    resolve(voices);
                    return;
                }
                const voicesChanged = () => {
                    voices = window.speechSynthesis.getVoices();
                    resolve(voices);
                }
                window.speechSynthesis.onvoiceschanged = voicesChanged;
            });
    }

    const getCantonese = async () => {
            var maleVoiceNotFound:boolean = true;

            (await getVoices() as Array<SpeechSynthesisVoice>).forEach((voice:SpeechSynthesisVoice) => {
                if (voice.lang=="zh-HK"){
                    if (maleVoiceNotFound) {
                        speech.voice = voice;
                        if (voice.voiceURI.includes("粤語")) {
                            maleVoiceNotFound = false;
                        }
                    }
                }
            });
    }

    await getCantonese();
    speech.lang = speech.voice!.lang;
    speech.volume = 1; // 0 to 1
    speech.rate = 1; // 0.1 to 10
    speech.pitch = 1; //0 to 2
    voicesReady = true;

    enterSystemSinceEverythingReady();
}
async function enterSystemSinceEverythingReady() {
    loadingInfoDlg.informProgress('所有元素成功啟動, 初始化完成');

    await Tools.wait(300);
    loadingInfoDlg.dismiss();
    if (voicesReady) {
        $welcome_text!.style.visibility = 'visible';
        await sayThis('歡迎來到 Cimda Care, 請按綠色制進入');
        $welcome_readyBtn!.style.visibility = 'visible';
    }
}

//****************** End Initializing functions ******************//


////////////////////////////////////////////////////////////////////
// Constantly running functions
////////////////////////////////////////////////////////////////////
function onWindowResize() {
    sceneCamera!.aspect = window.innerWidth / window.innerHeight;
    sceneCamera!.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    render();
}

function animate() {
    requestAnimationFrame(animate)

    orbitControl!.update()
    if (modelReady) {
        players.Default!.mixer!.update(clock.getDelta());
        if (!players.Default!.mesh.quaternion.equals(players.Default!.animateSeries.targetQuaternion)) {
            players.Default!.mesh.quaternion.rotateTowards(players.Default!.animateSeries.targetQuaternion, clock.getDelta() * 1000)
        }
    }

    TWEEN.update()

    render()
}

function render() {
    renderer.render(scene, sceneCamera!);
}
//*************** End Constantly running functions ***************//

////////////////////////////////////////////////////////////////////
// prerequisite functions
////////////////////////////////////////////////////////////////////
window.addEventListener('resize', onWindowResize, false)
screensManager.hideNavigationBar();

////////////////////////////////////////////////////////////////////
// Main Program
////////////////////////////////////////////////////////////////////
BackOfficeDB.loadBackOfficeDB();
initHtmlElements();
screensManager.comeWelcomeScreen();
setupCanvas();
loadMainCharacter();
animate();
//*********************** End Main Program ***********************//
