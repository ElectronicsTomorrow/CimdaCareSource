import * as THREE from 'three'
import * as Tools from '../global/global'
import {sayThis, MP3Equalized} from '../tools/sounds'
import {MsgType, SpeedFactor, AnimType, DisplaceType, DisplaceClip, AnimationClip, SpeechClip} from '../tools/animateMC'
import {Entertainment} from '../back_office/BackOffice_DB'
import {VisitType} from '../screens_manager'
import {DropListScroller} from '../tools/drop_and_list'
import {constLimits, stopWhateverGoingOn, GeneralAnims} from '../global/global'


////////////////////////////////////////////////////////////////////
// Local declaration
////////////////////////////////////////////////////////////////////
const defaultDropdownMsg:string = '請按這裡選擇歌曲...';

////////////////////////////////////////////////////////////////////
// Defines one of the 3 modes : normal Play, Full Karaoke, Half Karaoke
////////////////////////////////////////////////////////////////////
enum PlayMode {
    none        = 0,
    normalPlay  = 1,
    fullKaraoke = 2,
    halfKaraoke = 3
}

////////////////////////////////////////////////////////////////////
// Local variables
////////////////////////////////////////////////////////////////////
var activeEntertainAnim:THREE.AnimationAction;
var activeSong:MP3Equalized;
var screenAlreadyInitialized = false;
var currPlayMode:PlayMode = PlayMode.none;

////////////////////////////////////////////////////////////////////
// Upon entering the Entertainment screen, this is the 1st function
////////////////////////////////////////////////////////////////////
export function launchEntertainmentFunctions() {
    initEntertainmentList();
    showSelectedEntertainmentInDropdown();
    setSongControlBtns();
    startEntertainmentEngine();
}

async function initEntertainmentList() {
    if (screenAlreadyInitialized) {
        return;
    }

    for(var i = 0;  i < Entertainments.length;  i++) {
        var li:HTMLElement = document.createElement('li');
        li.innerHTML = '\<button class=\"entertain-dropdown-listitem-btn\"\>' + Entertainments[i].title + '\<\/button\>';
        li.className = 'entertain-dropdown-listitem';
        $entertain_DropdownList!.appendChild(li);
    }

    $entertain_DropdownDriver!.addEventListener("click", onClickedDropdownDriver);
    $entertain_DropdownList!.addEventListener("click", function(e) { handleEntertainmentSelection(e);});
    $entertain_PlayBtn!.addEventListener("click", onClickedPlay);
    $entertain_FullKaraokeBtn!.addEventListener("click", onClickedFullKaraoke);
    $entertain_HalfKaraokeBtn!.addEventListener("click", onClickedHalfKaraoke);
    $entertain_StopBtn!.addEventListener("click", onClickedStop);
    $entertain_PauseBtn!.addEventListener("click", onClickedPause);
    $entertain_ResumeBtn!.addEventListener("click", onClickedResume);

    activeSong = new MP3Equalized(onSongEnded, $entertain_Equalizer as HTMLCanvasElement, $entertain_LyricsRibbon as HTMLElement);

    screenAlreadyInitialized = true;
}

function onClickedDropdownDriver() {
    if ($entertainListScroller!.isDroppedDown()) {
        $entertainListScroller!.collapseDropdownList();
        setSongControlBtns();
    } else {
        closeSongControlBtns();
        $entertainListScroller!.expandDropdownList();
    }
}

/////////////////////////////////////////////////////////////////////
// Simply reports the selected song to the dropdown driver
/////////////////////////////////////////////////////////////////////
function handleEntertainmentSelection(e:any) {
    var allTheButtons = $entertain_DropdownList!.getElementsByTagName('button');
    for (var i = 0;  i < allTheButtons.length;  i++) {
        if (allTheButtons[i].innerHTML === e.target!.innerHTML) {
            break;
        }
    }

    $entertainListScroller!.collapseDropdownList();

    if (i < allTheButtons.length) {
        if (activeSong.isAudioMounted() && activeSong.theTitle() == Entertainments[i].title) {
            setSongControlBtns();
            return;
        }
        abortSong();
        activeEntertainAnim = players.Default!.entainAnims[i];
        activeSong.mountAudio(Entertainments[i].title as string, 'sound/Entertainment/' + Entertainments[i].songSubfolder + '/');
        setSongControlBtns();
        announceSelectedSong();
    }
}

async function announceSelectedSong() {
    stopWhateverGoingOn(players.Default!);
    showSelectedEntertainmentInDropdown();
    players.Default!.animateSeries.animate({action: players.Default!.geneAnims[GeneralAnims.STANDINGYELL_POS], loop: THREE.LoopRepeat, animType:AnimType.OneShot, callBack: null});
    await sayThis(activeSong.theTitle());
    players.Default!.animateSeries.animate({action: players.Default!.geneAnims[GeneralAnims.IDLE_POS], loop: THREE.LoopRepeat, animType:AnimType.OneShot, callBack: null});
}

function showSelectedEntertainmentInDropdown() {
    if (!activeSong.isAudioMounted()) {
        $entertain_DropdownDriver!.innerHTML = defaultDropdownMsg;
    } else {
        $entertain_DropdownDriver!.innerHTML = activeSong.theTitle();
    }
}

////////////////////////////////////////////////////////////////////
// Kick start the entire process with a chain of opening animations
////////////////////////////////////////////////////////////////////
function startEntertainmentEngine() {
    var backwardPos:THREE.Vector3 = new THREE.Vector3(players.Default!.mesh.position.x, players.Default!.mesh.position.y, players.Default!.mesh.position.z-1);
    players.Default!.animateSeries.pushDisplace(new DisplaceClip({action: players.Default!.geneAnims[GeneralAnims.JOGGING_BACKWARD_POS], loop: THREE.LoopRepeat, animType: AnimType.Relay, displaceType: DisplaceType.WalkBackward, newPos: backwardPos, speedFactor: SpeedFactor.Walk}));
    players.Default!.animateSeries.pushDisplace(new DisplaceClip({action: players.Default!.geneAnims[GeneralAnims.DANCEWALK_POS], loop: THREE.LoopRepeat, animType: AnimType.OneShot, displaceType: DisplaceType.WalkForward, newPos: new THREE.Vector3(-0.2,0,0.5), speedFactor: SpeedFactor.Walk, callBack: uponArrivalActorStand}));
    players.Default!.animateSeries.pushSpeech(new SpeechClip({action: players.Default!.geneAnims[GeneralAnims.POINTINGRIGHTHIGH_POS], loop: THREE.LoopOnce, animType: AnimType.Relay, sayWhat: currUsername + '揀歌, 我跳舞'}));
    players.Default!.animateSeries.pushAnimation(new AnimationClip({action: players.Default!.geneAnims[GeneralAnims.BOUNCING_IDLE_POS], loop: THREE.LoopRepeat, animType: AnimType.OneShot}));
    players.Default!.msgOutPort.postMessage(MsgType.PerformAnimation);
}

function closeSongControlBtns() {
    $entertain_SongPlayPanel!.style.visibility = 'hidden';
    $entertain_PlayBtn!.style.visibility = 'hidden';
    $entertain_FullKaraokeBtn!.style.visibility = 'hidden';
    $entertain_HalfKaraokeBtn!.style.visibility = 'hidden';
    $entertain_StopBtn!.style.visibility = 'hidden';
    $entertain_PauseBtn!.style.visibility = 'hidden';
    $entertain_ResumeBtn!.style.visibility = 'hidden';
}

////////////////////////////////////////////////////////////////////
// Once the MC character arrives the LHS, it gives an
// initial speech
////////////////////////////////////////////////////////////////////
async function uponArrivalActorStand() {
    players.Default!.animateSeries.turnHeadToFaceDestination(new THREE.Vector3(0, 0, 3));
    players.Default!.animateSeries.performNextAnimation();
}

function onClickedPlay() {
    if (activeSong.isAudioMounted()) {
        currPlayMode = PlayMode.normalPlay;
        playTheSong();
    }
}

function onClickedFullKaraoke() {
    if (activeSong.isAudioMounted()) {
        currPlayMode = PlayMode.fullKaraoke;
        playTheSong();
    }
}

function onClickedHalfKaraoke() {
    if (activeSong.isAudioMounted()) {
        currPlayMode = PlayMode.halfKaraoke;
        playTheSong();
    }
}

async function playTheSong() {
    stopWhateverGoingOn(players.Default!);

    if (currPlayMode == PlayMode.normalPlay) {
        await activeSong.play();
    } else if (currPlayMode == PlayMode.fullKaraoke) {
        await activeSong.fullKaraoke();
        activeSong.karaokeAlong();
    } else if (currPlayMode == PlayMode.halfKaraoke) {
        await activeSong.halfKaraoke();
        activeSong.karaokeAlong();
    }

    $entertain_Equalizer!.style.visibility = 'visible';
    $entertain_Equalizer!.setAttribute('class', 'slide-in-from-left');
    activeSong.EqualizerFrameLooper();

    players.Default!.animateSeries.animate({action: activeEntertainAnim, loop: THREE.LoopRepeat, animType:AnimType.OneShot, callBack: null});

    setSongControlBtns();
}

async function onClickedStop() {
    players.Default!.animateSeries.animate({action: players.Default!.geneAnims[GeneralAnims.IDLE_POS], loop: THREE.LoopRepeat, animType:AnimType.OneShot, callBack: null});
    abortSong('停止');

    setSongControlBtns();
}

async function onSongEnded() {
    activeSong.informUser('完畢');
    await Tools.wait(500);
    $entertain_Equalizer!.setAttribute('class', 'slide-out-to-left');
    players.Default!.animateSeries.animate({action: players.Default!.geneAnims[GeneralAnims.IDLE_POS], loop: THREE.LoopRepeat, animType:AnimType.OneShot, callBack: null});
    setSongControlBtns();
}

async function abortSong(abortMsg:string | null = null) {
    if (screenAlreadyInitialized) {
        activeSong.stop();
        currPlayMode = PlayMode.none;
    }

    if (abortMsg != null) {
        sayThis(abortMsg);
        activeSong.informUser(abortMsg);
        await Tools.wait(500);
    }

    $entertain_Equalizer!.setAttribute('class', 'slide-out-to-left');
}

async function onClickedPause() {
    players.Default!.animateSeries.animate({action: players.Default!.geneAnims[GeneralAnims.IDLE_POS], loop: THREE.LoopRepeat, animType:AnimType.OneShot, callBack: null});

    await activeSong.pause();
    activeSong.informUser('暫停');

    sayThis('暫停');

    setSongControlBtns();
}

async function onClickedResume() {
    if (currPlayMode == PlayMode.normalPlay) {
        await activeSong.play();
    } else if (currPlayMode == PlayMode.fullKaraoke) {
        await activeSong.fullKaraoke();
        activeSong.karaokeAlong();
    } else if (currPlayMode == PlayMode.halfKaraoke) {
        await activeSong.halfKaraoke();
        activeSong.karaokeAlong();
    }

    activeSong.EqualizerFrameLooper();
    players.Default!.animateSeries.animate({action: activeEntertainAnim, loop: THREE.LoopRepeat, animType:AnimType.OneShot, callBack: null});

    setSongControlBtns();
}

function setSongControlBtns() {
    $entertain_SongPlayPanel!.style.visibility = 'visible';
    $entertain_PlayBtn!.style.visibility = 'visible';
    $entertain_FullKaraokeBtn!.style.visibility = 'visible';
    $entertain_HalfKaraokeBtn!.style.visibility = 'visible';
    $entertain_StopBtn!.style.visibility = 'visible';

    if (!activeSong.isAudioMounted()) {
        $entertain_PauseBtn!.style.visibility = 'visible';
        $entertain_ResumeBtn!.style.visibility = 'hidden';
        $entertain_PlayBtn!.disabled = true;
        $entertain_FullKaraokeBtn!.disabled = true;
        $entertain_HalfKaraokeBtn!.disabled = true;
        $entertain_StopBtn!.disabled = true;
        $entertain_PauseBtn!.disabled = true;
    } else if (!activeSong.isPlaying() && !activeSong.isPaused()) {
        $entertain_PauseBtn!.style.visibility = 'visible';
        $entertain_ResumeBtn!.style.visibility = 'hidden';
        $entertain_PlayBtn!.disabled = false;
        $entertain_FullKaraokeBtn!.disabled = false;
        $entertain_HalfKaraokeBtn!.disabled = false;
        $entertain_StopBtn!.disabled = true;
        $entertain_PauseBtn!.disabled = true;
    } else if (activeSong.isPlaying()) {
        $entertain_PauseBtn!.style.visibility = 'visible';
        $entertain_ResumeBtn!.style.visibility = 'hidden';
        $entertain_PlayBtn!.disabled = true;
        $entertain_FullKaraokeBtn!.disabled = true;
        $entertain_HalfKaraokeBtn!.disabled = true;
        $entertain_StopBtn!.disabled = false;
        $entertain_PauseBtn!.disabled = (currPlayMode == PlayMode.normalPlay) ? false : true;
    } else if (activeSong.isPaused()) {
        $entertain_PauseBtn!.style.visibility = 'hidden';
        $entertain_ResumeBtn!.style.visibility = 'visible';
        $entertain_PlayBtn!.disabled = true;
        $entertain_FullKaraokeBtn!.disabled = true;
        $entertain_HalfKaraokeBtn!.disabled = true;
        $entertain_StopBtn!.disabled = false;
    }
}

////////////////////////////////////////////////////////////////////
// This section is called by the ScreensManager
// 1) when coming into this, what to do
// 2) when leaving this screen, what house keeping is needed
////////////////////////////////////////////////////////////////////
export function Leave() {
    abortSong();
    setVisitOrLeave(VisitType.GoingAway)
}

export function Visit() {
    setVisitOrLeave(VisitType.EnterInto);
}

function setVisitOrLeave(visitType:VisitType) {
    if (visitType == VisitType.GoingAway) {
        stopWhateverGoingOn(players.Default!);
        $entertain_Equalizer!.style.visibility = 'hidden';
        $entertain_Equalizer!.setAttribute('class', 'slide-out-to-left');
        $entertain_DropdownDriver!.style.visibility = 'hidden';
        $entertainListScroller!.collapseDropdownList();
        $entertain_SongPlayPanel!.style.visibility = 'hidden';
        $entertain_PlayBtn!.style.visibility = 'hidden';
        $entertain_FullKaraokeBtn!.style.visibility = 'hidden';
        $entertain_HalfKaraokeBtn!.style.visibility = 'hidden';
        $entertain_StopBtn!.style.visibility = 'hidden';
        $entertain_PauseBtn!.style.visibility = 'hidden';
        $entertain_ResumeBtn!.style.visibility = 'hidden';
        $entertain_LyricsRibbon!.style.visibility = 'hidden';
        $entertain_LyricsRibbon!.setAttribute('class', 'slide-out-to-right');
    } else if (visitType == VisitType.EnterInto) {
        $entertain_Equalizer!.style.visibility = 'hidden';
        $entertain_Equalizer!.setAttribute('class', 'slide-out-to-left');
        $entertain_DropdownDriver!.style.visibility = 'visible';
        $entertainListScroller!.collapseDropdownList();
        $entertain_SongPlayPanel!.style.visibility = 'visible';
        $entertain_PlayBtn!.style.visibility = 'visible';
        $entertain_FullKaraokeBtn!.style.visibility = 'visible';
        $entertain_HalfKaraokeBtn!.style.visibility = 'visible';
        $entertain_StopBtn!.style.visibility = 'visible';
        $entertain_PauseBtn!.style.visibility = 'visible';
        $entertain_ResumeBtn!.style.visibility = 'hidden';
        $entertain_LyricsRibbon!.style.visibility = 'hidden';
        $entertain_LyricsRibbon!.setAttribute('class', 'slide-out-to-right');
    }
}

