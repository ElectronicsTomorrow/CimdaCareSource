export class LandmarksGuide {
    public shoulderLeft:number[] = [];
    public shoulderRight:number[] = [];
    public elbowLeft:number[] = [];
    public elbowRight:number[] = [];
    public wristLeft:number[] = [];
    public wristRight:number[] = [];
    public indexLeft:number[] = [];
    public indexRight:number[] = [];
    public hipLeft:number[] = [];
    public hipRight:number[] = [];
    public kneeLeft:number[] = [];
    public kneeRight:number[] = [];
    public ankleLeft:number[] = [];
    public ankleRight:number[] = [];
}

export enum ErrGestureType {
    dontKnowWhatYouDoing        = 0,
    handLeftTooFront            = 1,
    handRightTooFront           = 2,
    handLeftTooHigh             = 3,
    handRightTooHigh            = 4,
    leftRightHandsNotConsistent = 5,
    elbowLeftNotStraight        = 6,
    elbowRightNotStraight       = 7,
    shoulderLeftTooLow          = 8,
    shoulderRightTooLow         = 9,
    shoulderLeftTooHigh         = 10,
    shoulderRightTooHigh        = 11,
    hipNotStraight              = 12,
    handsNotOnLeftThigh         = 13,
    handsNotOnRightThigh        = 14,
    leftwardKneeTooSqueezed     = 15,
    rightwardKneeTooSqueezed    = 16,
    leftKneeNotSqueezedEnough   = 17,
    rightKneeNotSqueezedEnough  = 18,
    isHipBendingNotEnough       = 19,
    kneeLeftTooSqueezed         = 20,
    kneeRightTooSqueezed        = 21,
    kneeLeftNotLiftedEnough     = 22,
    kneeRightNotLiftedEnough    = 23,
    kneeLeftNotSqueezedEnough   = 24,
    kneeRightNotSqueezedEnough  = 25,
    kneeLeftNotStraight         = 26,
    kneeRightNotStraight        = 27,
    legLeftNotPressedForLong    = 28,
    legRightNotPressedForLong   = 29,
    armLeftTooLow               = 30,
    armRightTooLow              = 31,
    armLeftTooHigh              = 32,
    armRightTooHigh             = 33,
    leftRightArmsNotConsistent  = 34,
    indexLeftBelowShoulder      = 35,
    indexRightBelowShoulder     = 36
}

export class MotionTrack {
    public static MAX_ERR_GESTURES_CNT:number = 30;

    public shoulderReferenceY:number = 0;
    public spineReferenceLength:number = 0;
    public prevSpineCapture:number = 0;
    public standingStill:number = 0;
    public stretchingArms_Squeezed:number = 0;
    public stretchingArms_Stretched:number = 0;
    public legPressing_leftPressed:number = 0;
    public legPressing_rightPressed:number = 0;
    public armCircle_indexYtime:number = 0;
    public armCircle_indexYmin:number = 0;
    public armCircle_indexYmax:number = 0;
    public armCircle_indexZtime:number = 0;
    public armCircle_indexZmin:number = -1;
    public armCircle_indexZmax:number = 1;
    public legLifting_leftLifted:number = 0;
    public legLifting_rightLifted:number = 0;
    public squatting_stoodUp = 0;
    public squatting_squattedDown  = 0;
    public raisingHands_loweredDown:number = 0;
    public raisingHands_raisedUp:number = 0;

    private _errGestureCnt = new Map<ErrGestureType, number>();

    public errorExist(errGestureType:ErrGestureType):boolean {
        if (this._errGestureCnt.has(errGestureType))
            return(true);
        else
            return(false);
    }
    public errorAdd(errGestureType:ErrGestureType) {
        if (this._errGestureCnt.has(errGestureType)) {
            var errCount:number = this._errGestureCnt.get(errGestureType)!;
            this._errGestureCnt.set(errGestureType, ++errCount);
        } else {
            this._errGestureCnt.set(errGestureType, 1);
        }
    }
    public errorExceeded(errGestureType:ErrGestureType, maxErrCnt:number = MotionTrack.MAX_ERR_GESTURES_CNT):boolean {
        if (this._errGestureCnt.has(errGestureType)) {
            var errCount:number = this._errGestureCnt.get(errGestureType)!;
            if (++errCount >= maxErrCnt) {
                return(true);
            } else {
                this._errGestureCnt.set(errGestureType, errCount);
                return(false);
            }
        } else {
            this._errGestureCnt.set(errGestureType, 1);
            return(false);
        }
    }
    public errorDelete(errGestureType:ErrGestureType) {
        if (this._errGestureCnt.has(errGestureType)) {
            this._errGestureCnt.delete(errGestureType);
        }
    }
    public resetStretchingArms() {
        this.shoulderReferenceY = 0;
        this.spineReferenceLength = 0;
        this.prevSpineCapture = 0;

        this.stretchingArms_Squeezed = 0;
        this.stretchingArms_Stretched = 0;
    }
    public resetLegPressing() {
        this.legPressing_leftPressed = 0;
        this.legPressing_rightPressed = 0;
    }
    public resetArmCircle() {
        this.armCircle_indexYtime = 0;
        this.armCircle_indexYmin = 0;
        this.armCircle_indexYmax = 0;
        this.armCircle_indexZtime = 0;
        this.armCircle_indexZmin = -1;
        this.armCircle_indexZmax = 1;
    }
    public resetLegLifting() {
        this.legLifting_leftLifted = 0;
        this.legLifting_rightLifted = 0;
    }
    public resetSquatting() {
        this.squatting_stoodUp = 0;
        this.squatting_squattedDown = 0;
    }
    public resetRaisingHands() {
        this.raisingHands_loweredDown = 0;
        this.raisingHands_raisedUp = 0;
    }
    public resetAll() {
        this.standingStill = 0;
        this.resetStretchingArms();
        this.resetLegPressing();
        this.resetArmCircle();
        this.resetLegLifting();
        this.resetSquatting();
        this.resetRaisingHands();

        this.resetErrGestureCnt();
    }
    public resetErrGestureCnt() {
        this._errGestureCnt.clear();
    }
};

export class Timer {
    constructor(everyMS:number, callBackFunc:Function) {
        this._everyMS = everyMS;
        this._callBackFunc = callBackFunc;
        this._timerHandle = 0;
    }

    private _everyMS:number;
    private _callBackFunc:Function;
    private _timerHandle:number;

    public clear = () => {
        if (this._timerHandle != 0)
            window.clearInterval(this._timerHandle);
        this._timerHandle = 0;
    }

    public start = () => {
        this._timerHandle = window.setInterval(this._callBackFunc, 1200);
    }

    public isNotSet = () => {
        return(this._timerHandle == 0);
    }

    public isSet = () => {
        return(this._timerHandle != 0);
    }
}