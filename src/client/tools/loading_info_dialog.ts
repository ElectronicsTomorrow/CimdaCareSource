import * as THREE from 'three'
import {PlayerInfo, screenToWorld} from '../global/global'

export class LoadingInfoDlg {
    private _InfoDialog:HTMLElement;
    private _InfoMsg:HTMLElement;

    constructor() {
        this._InfoDialog = document.getElementById("loading-info-dialog")!;
        this._InfoMsg = document.getElementById("loading-info-msg")!;
    }

    public informProgress = (msg:string) => {
        this._InfoMsg.innerHTML = msg;
    }

    public reportError = (errMsg:string) => {
        this._InfoMsg.style.color = '#ff0000';
        this._InfoMsg.innerHTML = '[發生錯誤] ' + errMsg;
    }

    public dismiss = () => {
        this._InfoDialog.style.visibility = 'hidden';
    }
}