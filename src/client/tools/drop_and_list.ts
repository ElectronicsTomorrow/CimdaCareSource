import * as Tools from '../global/global'

export class DropListScroller {
    constructor(dropdownPanel:HTMLElement|null, upArrowBtn:string, dnArrowBtn:string, theList:HTMLUListElement|null, listDisplayEntries:number) {
        this.dropdownPanel = dropdownPanel;
        this.upArrowBtn = document.getElementById(upArrowBtn) as HTMLImageElement;
        this.dnArrowBtn = document.getElementById(dnArrowBtn) as HTMLImageElement;
        this.theList = theList;
        this.listDisplayEntries = listDisplayEntries;
        this.pressTimer = null;
        this.isLongPress = false;
        this.isDropdownDropped = false;
    }
    private dropdownPanel:HTMLElement | null;
    private upArrowBtn:HTMLImageElement | null;
    private dnArrowBtn:HTMLImageElement | null;
    private theList:HTMLUListElement | null;
    private listDisplayEntries:number;
    private pressTimer:ReturnType<typeof setTimeout> | null;
    private isLongPress:boolean;
    private isDropdownDropped:boolean;

    public init() {
        this.upArrowBtn!.addEventListener("click", this.onClickedUpArrowBtn);
        this.upArrowBtn!.addEventListener("mousedown", this.onMousedownUpArrowBtn);
        this.upArrowBtn!.addEventListener("mouseup", this.onMouseupUpArrowBtn);
        this.upArrowBtn!.addEventListener("mouseout", this.onMouseupUpArrowBtn);

        this.dnArrowBtn!.addEventListener("click", this.onClickedDownArrowBtn);
        this.dnArrowBtn!.addEventListener("mousedown", this.onMousedownDownArrowBtn);
        this.dnArrowBtn!.addEventListener("mouseup", this.onMouseupDownArrowBtn);
        this.dnArrowBtn!.addEventListener("mouseout", this.onMouseupDownArrowBtn);
    }

    public resetToScrollZero() {
        this.theList!.scrollTop = 0;
    }

    private onClickedUpArrowBtn = () => {
        if (!this.isLongPress) {
            this.scrollUpOneRow();
        }
    }
    private onMousedownUpArrowBtn = async() => {
        this.isLongPress = false;
        await this.wait(500);

        while(this.isLongPress) {
            this.scrollUpOneRow();
            await this.wait(500);
        }
    }
    private onMouseupUpArrowBtn = () => {
        if (this.pressTimer != null) {
            clearTimeout(this.pressTimer);
            this.pressTimer = null;
            this.isLongPress = false;
        }
    }
    public scrollUpOneRow = () => {
        this.theList!.scrollTop = (this.theList!.scrollTop - this.theList!.offsetHeight / this.listDisplayEntries);
    }

    /////////////////////////////////////////////////////////////////////
    // Handles all the responses to the Down Arrow button
    /////////////////////////////////////////////////////////////////////
    private onMousedownDownArrowBtn = async() => {
        this.isLongPress = false;
        await this.wait(500);

        while(this.isLongPress) {
            this.scrollDownOneRow();
            await this.wait(500);
        }
    }
    private onMouseupDownArrowBtn = () => {
        if (this.pressTimer != null) {
        clearTimeout(this.pressTimer);
        this.pressTimer = null;
        this.isLongPress = false;
        }
    }
    private onClickedDownArrowBtn = () => {
        if (!this.isLongPress) {
            this.scrollDownOneRow();
        }
    }
    public scrollDownOneRow = () => {
        this.theList!.scrollTop = (this.theList!.scrollTop + this.theList!.offsetHeight / this.listDisplayEntries);
    }

    /////////////////////////////////////////////////////////////////////
    // Dropdown list, these 2 functions are responsible for
    // expanding and collapsing the list and then hide it
    /////////////////////////////////////////////////////////////////////
    public collapseDropdownList = async() => {
        this.dropdownPanel!.style.visibility = 'hidden';
        this.isDropdownDropped = false;
    }
    public expandDropdownList = async() => {
        this.dropdownPanel!.style.visibility = 'visible';
        this.isDropdownDropped = true;
    }
    public isDroppedDown = () => {
        if (this.isDropdownDropped) {
            return(true);
        } else {
            return(false);
        }
    }

    /////////////////////////////////////////////////////////////////////
    // Common to both up and down arrows
    /////////////////////////////////////////////////////////////////////
    private wait = (ms:number) => {
        return new Promise((resolve, reject) => {
            this.pressTimer = setTimeout(() => {
                this.isLongPress = true;
                resolve(true);
            }, ms);
        });
    }
}
