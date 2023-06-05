import * as THREE from 'three'
import * as Tools from './global/global'
import * as ReminderScreen from './screens/reminder'
import * as ExerciseScreen from './screens/exercise'
import * as EntertainmentScreen from './screens/entertainment'
import * as ChatScreen from './screens/chat'

////////////////////////////////////////////////////////////////////
// defines all the background pictures
////////////////////////////////////////////////////////////////////
export class constDef {
    public static WELCOME_BKGRD:string = 'img/Welcome/Welcome.png';
    public static REMINDER_BKGRD:string = 'img/Reminder/Reminder.png';
    public static EXERCISE_BKGRD:string = 'img/Exercise/Exercise.png';
    public static ENTERTAINMENT_BKGRD:string = 'img/Entertainment/Entertainment.png';
    public static CHAT_BKGRD:string = 'img/Chat/Chat.png';
    public static MAX_ALARM_QTY:number = 3;
    public static NAVIGATION_BTN_ENABLED_COLOR = 'rgba\(124,104,83,1\)';
    public static NAVIGATION_BTN_ENABLED_BACKCOLOR = 'linear-gradient\(135deg, rgba\(213,170,147, 0.8\) 70%, rgba\(228,178,155, 0.8\) 70%\), linear-gradient\(135deg, rgba\(240,208,172, 0.8\) 71%, rgba\(255,255,255, 0.8\) 100%\)';
    public static NAVIGATION_BTN_DISABLED_COLOR = 'rgba\(41,41,41,1\)';
    public static NAVIGATION_BTN_DISABLED_BACKCOLOR = 'linear-gradient\(135deg, rgba\(155,155,155,0.8\) 70%, rgba\(167,167,167, 0.8\) 70%\), linear-gradient\(135deg, rgba\(167,167,167, 0.8\) 71%, rgba\(255,255,255, 0.8\) 100%\)';
}

////////////////////////////////////////////////////////////////////
// The current screen of user
////////////////////////////////////////////////////////////////////
export enum ScreenName {
    Welcome         = 0,
    Reminder        = 1,
    Exercise        = 2,
    Entertainment   = 3,
    Chat            = 4
}

export enum VisitType {
    EnterInto  = 1,
    GoingAway  = 2,
}

////////////////////////////////////////////////////////////////////
// ScreensManager is in charge of:
//  a) the bottom navigation bar
//  b) switching between different screens
////////////////////////////////////////////////////////////////////
export class ScreensManager {
    constructor() {
        this.$navigationBar = document.getElementById("navigationBar") as HTMLElement;
        this.$reminderBtn = document.getElementById("navigation-bar-reminder") as HTMLElement;
        this.$exerciseBtn = document.getElementById("navigation-bar-exercise") as HTMLElement;
        this.$entertainmentBtn = document.getElementById("navigation-bar-entertainment") as HTMLElement;
        this.$chatBtn = document.getElementById("navigation-bar-chat") as HTMLElement;

        this.$reminderBtn.addEventListener("click", this.comeReminderScreen);
        this.$exerciseBtn.addEventListener("click", this.comeExerciseScreen);
        this.$entertainmentBtn.addEventListener("click", this.comeEntertainmentScreen);
        this.$chatBtn.addEventListener("click", this.comeChatScreen);

        this.$welcome_screen = document.getElementById("welcome-screen") as HTMLElement;
    };

    ////////////////////////////////////////////////////////////////////
    // Navigation bar and its 4 buttons at bottom of screen
    ////////////////////////////////////////////////////////////////////
    private $navigationBar:HTMLElement;
    private $reminderBtn:HTMLElement;
    private $exerciseBtn:HTMLElement;
    private $entertainmentBtn:HTMLElement;
    private $chatBtn:HTMLElement;

    ////////////////////////////////////////////////////////////////////
    // Welcome screen and its elements
    ////////////////////////////////////////////////////////////////////
    private $welcome_screen:HTMLElement;

    ////////////////////////////////////////////////////////////////////
    // for the purpose of tracking which is the current screen
    ////////////////////////////////////////////////////////////////////
    private currScreen:ScreenName = ScreenName.Welcome;

    ////////////////////////////////////////////////////////////////////
    // This section is for the Navigation Bar at bottom of screen
    ////////////////////////////////////////////////////////////////////
    public showNavigationBar() {
        this.$navigationBar.style.visibility = 'visible';
    }
    public hideNavigationBar() {
        this.$navigationBar.style.visibility = 'hidden';
    }

    ////////////////////////////////////////////////////////////////////
    // Dedicated for the Welcome screen
    ////////////////////////////////////////////////////////////////////
    public comeWelcomeScreen = () => {
        ReminderScreen.Leave();
        ExerciseScreen.Leave();
        EntertainmentScreen.Leave();
        ChatScreen.Leave();
    }
    public quitWelcomeScreen = () => {
        this.$welcome_screen.style.visibility = 'hidden';
        $welcome_text!.style.visibility = 'hidden';
        $welcome_readyBtn!.style.visibility = 'hidden';
    }

    ////////////////////////////////////////////////////////////////////
    // Dedicated for the Reminder screen
    ////////////////////////////////////////////////////////////////////
    public comeReminderScreen = async () => {
        if (this.currScreen == ScreenName.Reminder) {
            return;
        } else {
            await Tools.stopWhateverGoingOn(players.Default!);
        }

        switch(this.currScreen) {
            case ScreenName.Welcome:
                this.quitWelcomeScreen();
                break;
            case ScreenName.Exercise:
                ExerciseScreen.Leave();
                break;
            case ScreenName.Entertainment:
                EntertainmentScreen.Leave();
               break;
            case ScreenName.Chat:
                ChatScreen.Leave();
                break;
        }

        ReminderScreen.Visit();
        this.darkenTheButton(this.$reminderBtn, this.$exerciseBtn, this.$entertainmentBtn, this.$chatBtn);

        backgroundPng = textureLoader.load(constDef.REMINDER_BKGRD);
        scene.background = backgroundPng;

        this.currScreen = ScreenName.Reminder;
        ReminderScreen.launchReminderFunctions();
    }

    ////////////////////////////////////////////////////////////////////
    // Dedicated for the Exercise screen
    ////////////////////////////////////////////////////////////////////
    public comeExerciseScreen = async () => {
        if (this.currScreen == ScreenName.Exercise) {
            return;
        } else {
            await Tools.stopWhateverGoingOn(players.Default!);
        }

        switch(this.currScreen) {
            case ScreenName.Welcome:
                this.quitWelcomeScreen();
                break;
            case ScreenName.Reminder:
                ReminderScreen.Leave();
                break;
            case ScreenName.Entertainment:
                EntertainmentScreen.Leave();
               break;
            case ScreenName.Chat:
                ChatScreen.Leave();
                break;
        }

        ExerciseScreen.Visit();
        this.darkenTheButton(this.$exerciseBtn, this.$reminderBtn, this.$entertainmentBtn, this.$chatBtn);

        backgroundPng = textureLoader.load(constDef.EXERCISE_BKGRD);
        scene.background = backgroundPng;

        this.currScreen = ScreenName.Exercise;
        ExerciseScreen.launchExerciseFunctions();
    }

    ////////////////////////////////////////////////////////////////////
    // Dedicated for the Entertainment screen
    ////////////////////////////////////////////////////////////////////
    public comeEntertainmentScreen = async () => {
        if (this.currScreen == ScreenName.Entertainment) {
            return;
        } else {
            await Tools.stopWhateverGoingOn(players.Default!);
        }

        switch(this.currScreen) {
            case ScreenName.Welcome:
                this.quitWelcomeScreen();
                break;
            case ScreenName.Reminder:
                ReminderScreen.Leave();
                break;
            case ScreenName.Exercise:
                ExerciseScreen.Leave();
               break;
            case ScreenName.Chat:
                ChatScreen.Leave();
                break;
        }

        EntertainmentScreen.Visit();
        this.darkenTheButton(this.$entertainmentBtn, this.$reminderBtn, this.$exerciseBtn, this.$chatBtn);

        backgroundPng = textureLoader.load(constDef.ENTERTAINMENT_BKGRD);
        scene.background = backgroundPng;

        this.currScreen = ScreenName.Entertainment;
        EntertainmentScreen.launchEntertainmentFunctions();
    }

    ////////////////////////////////////////////////////////////////////
    // Dedicated for the Chat screen
    ////////////////////////////////////////////////////////////////////
    public comeChatScreen = async () => {
        if (this.currScreen == ScreenName.Chat) {
            return;
        } else {
            await Tools.stopWhateverGoingOn(players.Default!);
        }

        switch(this.currScreen) {
            case ScreenName.Welcome:
                this.quitWelcomeScreen();
                break;
            case ScreenName.Reminder:
                ReminderScreen.Leave();
                break;
            case ScreenName.Exercise:
                ExerciseScreen.Leave();
               break;
            case ScreenName.Entertainment:
                EntertainmentScreen.Leave();
                break;
        }

        ChatScreen.Visit();
        this.darkenTheButton(this.$chatBtn, this.$reminderBtn, this.$exerciseBtn, this.$entertainmentBtn);

        backgroundPng = textureLoader.load(constDef.CHAT_BKGRD);
        scene.background = backgroundPng;

        this.currScreen = ScreenName.Chat;
        ChatScreen.launchChatFunctions();
    }

    ////////////////////////////////////////////////////////////////////
    // These are the tools for enabling and disabling the navigation
    // buttons during screen switch
    ////////////////////////////////////////////////////////////////////
    private darkenTheButton = (buttonToDarken:HTMLElement, button1Tolight:HTMLElement, button2Tolight:HTMLElement, button3Tolight:HTMLElement) => {
        button1Tolight.style.color = constDef.NAVIGATION_BTN_ENABLED_COLOR;
        button1Tolight.style.background = constDef.NAVIGATION_BTN_ENABLED_BACKCOLOR;
        button2Tolight.style.color = constDef.NAVIGATION_BTN_ENABLED_COLOR;
        button2Tolight.style.background = constDef.NAVIGATION_BTN_ENABLED_BACKCOLOR;
        button3Tolight.style.color = constDef.NAVIGATION_BTN_ENABLED_COLOR;
        button3Tolight.style.background = constDef.NAVIGATION_BTN_ENABLED_BACKCOLOR;

        buttonToDarken.style.color = constDef.NAVIGATION_BTN_DISABLED_COLOR;
        buttonToDarken.style.background = constDef.NAVIGATION_BTN_DISABLED_BACKCOLOR;
    }
}