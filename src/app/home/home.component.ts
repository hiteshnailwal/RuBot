import { Component, OnInit } from "@angular/core";
import { TNSTextToSpeech, SpeakOptions } from 'nativescript-texttospeech';
import { TNSPlayer } from 'nativescript-audio';
import * as application from 'tns-core-modules/application';
import * as permissions from "nativescript-permissions";
import * as dialogs from 'tns-core-modules/ui/dialogs';
import { APP_CONSTANTS } from '../app.constant';
import { Page, EventData, Observable } from 'tns-core-modules/ui/page/page';
import { Label } from "tns-core-modules/ui/label";
import { StackLayout } from "tns-core-modules/ui/layouts/stack-layout";

declare var android: any;
let TTS = new TNSTextToSpeech();

@Component({
  selector: "Home",
  templateUrl: "./home.component.html",
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {
  private smsReceivePermissionFlag: boolean;
  private _player: TNSPlayer;
  public appName: string;
  public msgToSpeak: string;
  public flag: boolean;

  constructor (
    private page: Page,
  ) {
    this._player = new TNSPlayer();
    this.page.on('navigatingTo', this.onNavigatingTo.bind(this));
    this.page.on('navigatedFrom', this.onNavigatedFrom.bind(this));
  }

  ngOnInit() {
    this.appName = APP_CONSTANTS.APP_NAME;
    this.msgToSpeak = '';
  }

  onNavigatingTo(args: EventData) {
    if (!this.smsReceivePermissionFlag) {
      permissions.requestPermissions([android.Manifest.permission.RECEIVE_SMS], APP_CONSTANTS.SMS_PERMISSION_TXT).then(() => {
        this.smsReceivePermissionFlag = true;
      }).catch(() => {
        this.smsReceivePermissionFlag = false;
        this.showAlert();
      });
    }
    const smsReceiveIntent = android.provider.Telephony.Sms.Intents.SMS_RECEIVED_ACTION;
    application.android.registerBroadcastReceiver(smsReceiveIntent,
      (context: android.content.Context, intent: android.content.Intent) => { 
      /** native android way to get the actual message and address */
      let messages: Object[];            
      messages = <any>intent.getSerializableExtra("pdus");
      const format: string = intent.getStringExtra("format");
      for (let i = 0; i < messages.length; i++) {
        const message = android.telephony.SmsMessage.createFromPdu(messages[i], format);
        const msgFrom = message.getDisplayOriginatingAddress();
        const rawMsg = message.getMessageBody();
        this.filterMessage(rawMsg, args);
      }
    });
  }

  filterMessage(rawMsg: string, args: EventData) {
    rawMsg = rawMsg.toLowerCase();
    // first condition implemented
    if (rawMsg.search(APP_CONSTANTS.FILTER_WORD_1) !== -1 ||
    rawMsg.search(APP_CONSTANTS.FILTER_WORD_2) !== -1 || 
    rawMsg.search(APP_CONSTANTS.FILTER_WORD_3) !== -1 ||
    rawMsg.search(APP_CONSTANTS.FILTER_WORD_4) !== -1) {
      // second condition implemented for rs
      if (rawMsg.match(APP_CONSTANTS.RS_TXT) !== null) {
        this.filterAmount(rawMsg, APP_CONSTANTS.RS_TXT).then((str) => {
          this.goAhead(str, args);
        });
        // second condition implemented for INR
      } else if (rawMsg.match(APP_CONSTANTS.INR_TXT) !== null) {
        this.filterAmount(rawMsg, APP_CONSTANTS.INR_TXT).then((str) => {
          this.goAhead(str, args);
        });
      }
    }
  }

  goAhead(str: string, args: EventData) {
    /** add message label binding start */
    const page = <Page>args.object;
    const msgContent = <StackLayout>page.getViewById("content");
    const vm = new Observable();
    const msgLabel = new Label();
    this.msgToSpeak = str;
    msgLabel.text =  this.msgToSpeak;
    msgLabel.textWrap = true;
    msgLabel.className = 'msgBody';
    const pageCSS = APP_CONSTANTS.MSG_BLOCK_CSS;
    page.css = pageCSS;
    msgContent.addChild(msgLabel);
    page.bindingContext = vm;
    /** add message label binding end */

    /** calling audio player */
    this.playAudio().then(() => {
      this.startReading().then(() => {
        /** removing message label binding */
        msgContent.removeChild(msgLabel);
        page.bindingContext = vm;
      });
    });
  }

  showAlert() {
    const requestObj = {
      title: APP_CONSTANTS.APP_NAME,
      message: APP_CONSTANTS.SMS_PERMISSION_DECLINE_MSG,
      okButtonText: APP_CONSTANTS.GOT_IT_TXT
    };
    dialogs.prompt(requestObj);
  }
  
  /**
   * 
   * @param str 
   * @param constTxt 
   */
  filterAmount(str: string, constTxt: string): Promise<string> {
    return new Promise((resolve, reject) => {
      str = str.split(constTxt)[1].replace(/,/g, '');
      str = str.match(/^\d+|\d+\b|\d+(?=\w)/g)[0];
      const msg = APP_CONSTANTS.MSG_SPEAK_1 +''+ str +''+ APP_CONSTANTS.MSG_SPEAK_2;
      resolve(msg);
    });
  }

  /**
   * this method start the ring audio.
   */
  playAudio() {
    const playerOptions = {
      audioFile: '~/assets/speak-audio-ring.mp3',
      loop: false,
      completeCallback: function () {},
    }
    return new Promise((resolve, reject) => {
      playerOptions.completeCallback = resolve;
      this._player.playFromUrl(playerOptions);
    });
  }

  /**
   * this method start the modified message audio.
   */
  startReading() {
    let speakOptions: SpeakOptions = {
      text: this.msgToSpeak, /// *** required ***
      speakRate: 1.5, // optional - default is 1.0
      pitch: 1.2, // optional - default is 1.0
      volume: 1.0, // optional - default is 1.0
      locale: APP_CONSTANTS.LOCALE_IND_HINDI // optional - default is system locale,
    };
    return new Promise((resolve, reject) => {
      speakOptions.finishedCallback = resolve;
      TTS.speak(speakOptions)
    });
  }

  onNavigatedFrom() {

  }
}
