import * as THREE from 'three'
import {TWEEN} from 'three/examples/jsm/libs/tween.module.min'
import {sayThis} from '../tools/sounds'
import {wait, PlayerInfo, screenToWorld} from'../global/global'

////////////////////////////////////////////////////////////////////
// Defines the different types of animation
////////////////////////////////////////////////////////////////////
export enum ActionType {
    AnimationOnly   = 1,
    Displacement    = 2,
    Speech          = 3
}
export enum AnimType {
    OneShot         = 1,
    Relay           = 2
}
export enum DisplaceType {
    None            = 1,
    WalkForward     = 2,
    WalkBackward    = 3,
    Jump            = 4
}

export enum SpeedFactor {
    Walk            = 750,
    Jump            = 100
}


////////////////////////////////////////////////////////////////////
// Just the animation clip itself with no speech or displacement
////////////////////////////////////////////////////////////////////
interface AnimationParams {
    action:     THREE.AnimationAction;
    loop:       number;
    animType?:  AnimType;
    callBack?:  Function | null;
}
export class AnimationClip {
    constructor({action, loop, animType = AnimType.OneShot, callBack = null}: AnimationParams) {
        this.action = action;
        this.loop = loop;
        this.animType = animType;
        this.callBack = callBack;
    }

    public action:THREE.AnimationAction;
    public loop:number;
    public animType:AnimType;
    public callBack:Function | null;
}

////////////////////////////////////////////////////////////////////
// An action clip that has displacement
////////////////////////////////////////////////////////////////////
interface DisplaceParams {
    action:         THREE.AnimationAction;
    loop:           number;
    animType:       AnimType;
    displaceType:   DisplaceType;
    newPos:         THREE.Vector3;
    speedFactor:    number;
    callBack?:      Function | null;
}
export class DisplaceClip {
    constructor({action, loop, animType, displaceType, newPos, speedFactor, callBack = null}: DisplaceParams) {
        this.action = action;
        this.loop = loop;
        this.animType = animType;
        this.displaceType = displaceType;
        this.newPos = newPos;
        this.speedFactor = speedFactor;
        this.callBack = callBack;
    }

    public action:THREE.AnimationAction;
    public loop:number;
    public animType:AnimType;
    public displaceType:DisplaceType;
    public newPos:THREE.Vector3;
    public speedFactor:number;
    public callBack:Function | null;
}

////////////////////////////////////////////////////////////////////
// A speech clip
////////////////////////////////////////////////////////////////////
interface SpeechParams {
    action:     THREE.AnimationAction;
    loop:       number;
    animType:   AnimType;
    sayWhat:    string;
    callBack?:  Function | null;
}
export class SpeechClip {
    constructor({sayWhat, action, loop, animType, callBack = null}: SpeechParams) {
        this.action = action;
        this.loop = loop;
        this.animType = animType;
        this.sayWhat = sayWhat;
        this.callBack = callBack;
    }

    public action:THREE.AnimationAction;
    public loop:number;
    public animType:AnimType;
    public sayWhat:string;
    public callBack:Function | null;
}

////////////////////////////////////////////////////////////////////
// This is the parent class of all different clips :
//  1. AnimationClip
//  2. DisplaceClip
//  3. SpeechClip
// (PS: ActionType identifies which kind of action clip its is)
////////////////////////////////////////////////////////////////////
interface ActionParams {
    type:           ActionType;
    animationClip?: AnimationClip | null;
    displaceClip?:  DisplaceClip | null;
    speechClip?:    SpeechClip | null;
}
export class ActionClip {
    constructor({type, animationClip = null, displaceClip = null, speechClip = null}: ActionParams) {
        this.type = type;
        this.animationClip = animationClip;
        this.displaceClip = displaceClip;
        this.speechClip = speechClip;
    }

    public type:ActionType;
    public animationClip:AnimationClip | null;
    public displaceClip:DisplaceClip | null;
    public speechClip:SpeechClip | null;
}

////////////////////////////////////////////////////////////////////
// An array of animation clips for the main character, so that it
// presents like a movie
////////////////////////////////////////////////////////////////////
class AnimateSeries {
    constructor(mesh:THREE.Object3D, mixer:THREE.AnimationMixer, msgOutPort:MessagePort) { // The array of animation is empty unless there is animation to perform
        this._series = [];
        this._activeAnimation = null;
        this.targetQuaternion = new THREE.Quaternion();
        this._myTween = null;

        this._playerMesh = mesh;
        this._mixer = mixer;
        this.msgOutPort = msgOutPort;
    };

    private _series:ActionClip[];
    private _activeAnimation:THREE.AnimationAction | null;
    public  targetQuaternion:THREE.Quaternion;
    private _myTween:any;
    private _playerMesh:THREE.Object3D
    private _mixer:THREE.AnimationMixer;
    public  msgOutPort:MessagePort;

    // Pops the 1st animation from the beginning of array, not the last one
    public popHead() {
        if (this._series.length == 0) {
            throw Error('[Error] AnimateSeries has 0 length when asked to perform animations!');
        } else {
            var actionClip:ActionClip = this._series[0];
            this._series.shift();
            return(actionClip);
        }
    }

    // Appends a new animation to the array
    public pushAnimation(animationClip:AnimationClip) {
        this._series.push(new ActionClip({type: ActionType.AnimationOnly, animationClip: animationClip}));
    }
    public pushDisplace(displaceClip:DisplaceClip) {
        this._series.push(new ActionClip({type: ActionType.Displacement, displaceClip: displaceClip}));
    }
    public pushSpeech(speechClip:SpeechClip) {
        this._series.push(new ActionClip({type: ActionType.Speech, speechClip: speechClip}));
    }

    // Whether or not, there are animations to be performed
    public hasMore():boolean {
        return(this._series.length > 0);
    }
    public removeAll() {
        while(this._series.length > 0) {
            this.popHead();
        }
    }

    ////////////////////////////////////////////////////////////////////
    // This function consumes 1 animation element each time it is called
    // and because it is FIFO approach, it consumes the 1st element in
    // the array of animations list
    ////////////////////////////////////////////////////////////////////
    public performNextAnimation() {
        if (!this.hasMore()) {
            return;
        }

        var actionClip:ActionClip = this.popHead();

        switch(actionClip.type) {
            case ActionType.AnimationOnly:
                this.animate(actionClip.animationClip);
                break;
            case ActionType.Displacement:
                this.displace(actionClip.displaceClip);
                break;
            case ActionType.Speech:
                this.speak(actionClip.speechClip);
                break;
            default:
                console.log('[Critical error] performNextAction discovers an invalid ActionClip.');
                break;
        }
    }

    ////////////////////////////////////////////////////////////////////
    // Is the core function of switching an animation from another
    ////////////////////////////////////////////////////////////////////
    private setAnimation = (newAction:THREE.AnimationAction, newLoop:number) => {
        var prevAnim:THREE.AnimationAction = this._activeAnimation!;
        this._activeAnimation = newAction;

        if (prevAnim != null) {
            prevAnim.fadeOut(0.2);
            this._activeAnimation.reset();
            this._activeAnimation.fadeIn(0.3);
        }

        if (newLoop === THREE.LoopOnce) {
            this._activeAnimation.loop = THREE.LoopOnce;
            this._activeAnimation.clampWhenFinished = true;
        } else {
            this._activeAnimation.loop = THREE.LoopRepeat;
        }

        this._activeAnimation.play();
    }

    ////////////////////////////////////////////////////////////////////
    // If only animation WITH NO DISPLACEMENT, use this
    // and because we need to keeping consuming the animateSeries
    // handleAnimationFinished is called accordingly
    ////////////////////////////////////////////////////////////////////
    public animate = (animationClip:AnimationClip | null) => {
        if (animationClip == null) {
            console.log('[animate] animationClip is null, invalid.');
        }

        if (animationClip!.animType == AnimType.Relay) {
            this._mixer.addEventListener('finished', this.handleNextAnimation);
        } else if (animationClip!.animType == AnimType.OneShot) {
            if (animationClip!.callBack != null) {
                this._mixer.addEventListener('finished', animationClip!.callBack as any);
            }
        }

        this.setAnimation(animationClip!.action, animationClip!.loop);
    }
    private handleNextAnimation = () => {
        this._mixer.removeEventListener('finished', this.handleNextAnimation);
        this.performNextAnimation();
    }

    ////////////////////////////////////////////////////////////////////
    // If both Animation & Displacement is needed, call this function
    // if displaceCallBack exists, it will postMessage to keep the loop
    // else we will postMessage here so that the loop is not broken
    ////////////////////////////////////////////////////////////////////
    public displace = (displaceClip:DisplaceClip | null) => {
        if (displaceClip == null) {
            console.log('[displace] displaceClip is null, invalid.');
        }

        if (displaceClip!.displaceType == DisplaceType.WalkForward) {
            this.turnHeadToFaceDestination(displaceClip!.newPos);
        }

        this.setAnimation(displaceClip!.action, displaceClip!.loop);

        const distance:number = this._playerMesh.position.distanceTo(displaceClip!.newPos);

        if (this._myTween != null)
            TWEEN.remove(this._myTween);

        this._myTween = new TWEEN.Tween(this._playerMesh.position)
            .to({
                x: displaceClip!.newPos.x,
                y: displaceClip!.newPos.y,
                z: displaceClip!.newPos.z
            }, displaceClip!.speedFactor * distance)
            .onUpdate(() => {})
            .start()
            .onComplete(() => {
                if (displaceClip!.callBack != null) {
                    displaceClip!.callBack();
                } else if (displaceClip!.animType == AnimType.Relay) {
                    this.msgOutPort.postMessage(MsgType.PerformAnimation);
                }
            });
    }

    ////////////////////////////////////////////////////////////////////
    // Giving out speech as part of the animation chain
    ////////////////////////////////////////////////////////////////////
    public speak = async(speechClip:SpeechClip | null) => {
        if (speechClip == null) {
            console.log('[speak] speechClip is null, invalid.');
        }

        this.setAnimation(speechClip!.action, speechClip!.loop);
        await sayThis(speechClip!.sayWhat);

        if (speechClip!.callBack != null) {
            speechClip!.callBack();
        } else if (speechClip!.animType == AnimType.Relay) {
            this.msgOutPort.postMessage(MsgType.PerformAnimation);
        }
    }

    ////////////////////////////////////////////////////////////////////
    // Typically, this is called by Walk animation, so that the head is
    // turned to face the direction of movement
    ////////////////////////////////////////////////////////////////////
    public turnHeadToFaceDestination = (newPos:THREE.Vector3) => {
        const rotationMatrix = new THREE.Matrix4();
        rotationMatrix.lookAt(newPos, this._playerMesh.position, this._playerMesh.up);
        this.targetQuaternion.setFromRotationMatrix(rotationMatrix);
    }
}

////////////////////////////////////////////////////////////////////
// defines the MC characters, the default and all others
////////////////////////////////////////////////////////////////////
export enum SEX_TYPE {
    Male = 0,
    Female = 1
}
export enum MsgType {
    PerformAnimation    = 1
}


export class Player {
    ///////////////////////////////////////////////////////////////////////////////////////////////
    // the variable members of class Player
    ///////////////////////////////////////////////////////////////////////////////////////////////
    public  mesh:THREE.Object3D;
    public  mixer:THREE.AnimationMixer;
    public  sex:SEX_TYPE;
    public  msgChannel:MessageChannel;
    public  msgInPort:MessagePort;
    public  msgOutPort:MessagePort;
    public  animateSeries:AnimateSeries;
    public  geneAnims:THREE.AnimationAction[];
    public  exerAnims:THREE.AnimationAction[];
    public  entainAnims:THREE.AnimationAction[];
    private _performSize:number;
    private _performIdle:number;
    private _myTween:any;


    ///////////////////////////////////////////////////////////////////////////////////////////////
    // The Constructor
    ///////////////////////////////////////////////////////////////////////////////////////////////
    constructor(mesh:THREE.Object3D, sex:SEX_TYPE, performSize:number, performIdle:number) {
        this.mesh = mesh;
        this.mixer = new THREE.AnimationMixer(mesh);
        this.sex = sex;
        this._performSize = performSize;
        this._performIdle = performIdle;
        this._myTween = null;

        this.msgChannel = new MessageChannel();
        this.msgInPort = this.msgChannel.port1;
        this.msgInPort.onmessage = this.msgCenter;
        this.msgOutPort = this.msgChannel.port2;
        this.animateSeries = new AnimateSeries(this.mesh, this.mixer, this.msgOutPort);
        this.geneAnims = [];
        this.exerAnims = [];
        this.entainAnims = [];
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////
    // members functions starts here
    ///////////////////////////////////////////////////////////////////////////////////////////////
    public msgCenter = (e:any) => {
        switch(e.data as MsgType) {
            case MsgType.PerformAnimation:
                this.animateSeries.performNextAnimation();
                break;
            default:
                break;
        }
    }
    public inflateToPerformerSize = () => {
        this.mesh.scale.set(this._performSize, this._performSize, this._performSize);
    }
    public moveToPerformLocation = () => {
        this.mesh.position.set(PlayerInfo.PERFORM_LOC_X, PlayerInfo.PERFORM_LOC_Y, PlayerInfo.PERFORM_LOC_Z);
    }
    public getMaxWidth() {
        var myselfBox:THREE.Box3 = new THREE.Box3();
        myselfBox.setFromObject(this.mesh);

        return(myselfBox.max.x - myselfBox.min.x);
    }
    public getMaxHeight() {
        var myselfBox:THREE.Box3 = new THREE.Box3();
        myselfBox.setFromObject(this.mesh);

        return(myselfBox.max.y - myselfBox.min.y);
    }
    public animatePerformIdle() {
        this.animateSeries.animate({action: this.geneAnims[this._performIdle], loop: THREE.LoopRepeat, animType: AnimType.OneShot, callBack: null});
    }
}