interface Serializable<T> {
    deserialize(input:Object):T;
}

////////////////////////////////////////////////////////////////////
// Database for the Reminder screen
////////////////////////////////////////////////////////////////////
export class Reminder implements Serializable<Reminder> {
    timeToTake?: string;
    simpleMediName?: string;
    officialMediName?: string;
    howToTake?: string;
    prerequisite?: string;
    mediDesc?: string;
    mediPic?: string;

    deserialize(input:Reminder) {
        this.timeToTake = input.timeToTake;
        this.simpleMediName = input.simpleMediName;
        this.officialMediName = input.officialMediName;
        this.howToTake = input.howToTake;
        this.prerequisite = input.prerequisite;
        this.mediDesc = input.mediDesc;
        this.mediPic = input.mediPic;

        return(this);
    }
}

////////////////////////////////////////////////////////////////////
// Database for the Exercise screen
////////////////////////////////////////////////////////////////////
export class Exercise implements Serializable<Exercise> {
    titleChinese?:string;
    titleEnglish?:string;
    durationStr?:string;
    durationTime?:number;
    animationSrc?:string;
    animateIntro?:string;
    jointAnglesGuide?:JointAnglesGuide;

    deserialize(input:Exercise) {
        this.titleChinese = input.titleChinese;
        this.titleEnglish = input.titleEnglish;
        this.durationStr = input.durationStr;
        this.durationTime = input.durationTime;
        this.animationSrc = input.animationSrc;
        this.animateIntro = input.animateIntro;
        this.jointAnglesGuide = new JointAnglesGuide();
        this.jointAnglesGuide.shoulderLeft = input.jointAnglesGuide!.shoulderLeft;
        this.jointAnglesGuide.shoulderRight = input.jointAnglesGuide!.shoulderRight;
        this.jointAnglesGuide.elbowLeft = input.jointAnglesGuide!.elbowLeft;
        this.jointAnglesGuide.elbowRight = input.jointAnglesGuide!.elbowRight;
        this.jointAnglesGuide.hipLeft = input.jointAnglesGuide!.hipLeft;
        this.jointAnglesGuide.hipRight = input.jointAnglesGuide!.hipRight;
        this.jointAnglesGuide.kneeLeft = input.jointAnglesGuide!.kneeLeft;
        this.jointAnglesGuide.kneeRight = input.jointAnglesGuide!.kneeRight;

        return(this);
    }
}
export class JointAnglesGuide {
    constructor() {
        this.shoulderLeft = 0.0;
        this.shoulderRight = 0.0;
        this.elbowLeft = 0.0;
        this.elbowRight = 0.0;
        this.hipLeft = 0.0;
        this.hipRight = 0.0;
        this.kneeLeft = 0.0;
        this.kneeRight = 0.0;
    }
    public shoulderLeft:number;
    public shoulderRight:number;
    public elbowLeft:number;
    public elbowRight:number;
    public hipLeft:number;
    public hipRight:number;
    public kneeLeft:number;
    public kneeRight:number;
}

////////////////////////////////////////////////////////////////////
// Database for the Entertainment screen
////////////////////////////////////////////////////////////////////
export class Entertainment implements Serializable<Reminder> {
    title?: string;
    songSubfolder?: string;
    danceUrl?: string;
    danceNotes?: string;

    deserialize(input:Entertainment) {
        this.title = input.title;
        this.songSubfolder = input.songSubfolder;
        this.danceUrl = input.danceUrl;
        this.danceNotes = input.danceNotes;

        return(this);
    }
}


////////////////////////////////////////////////////////////////////
// Loads from the database (currently, it is a JSON) for each screen
////////////////////////////////////////////////////////////////////
export function loadBackOfficeDB() {
    var DB_JSon = require('./Elderly_BackOffice_DB.JSon');

    for(var i = 0;  i < DB_JSon.Reminder.length;  i++) {
        Reminders.push( new Reminder().deserialize(DB_JSon.Reminder[i]));
    }

    for(var j = 0;  j < DB_JSon.Exercise.length;  j++) {
        Exercises.push( new Exercise().deserialize(DB_JSon.Exercise[j]));
    }

    for(var k = 0;  k < DB_JSon.Entertainment.length;  k++) {
        Entertainments.push( new Entertainment().deserialize(DB_JSon.Entertainment[k]));
    }
}
