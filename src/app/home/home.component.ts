import { Component, OnInit } from "@angular/core";
import { TNSTextToSpeech, SpeakOptions } from 'nativescript-texttospeech';
import { TNSPlayer } from 'nativescript-audio';
import * as application from 'tns-core-modules/application';
import * as permissions from "nativescript-permissions";
import * as dialogs from 'tns-core-modules/ui/dialogs';
import { APP_CONSTANTS } from '../app.constant';

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

  constructor() {
    this._player = new TNSPlayer();
  }

  tap() {
    // this.msgToSpeak = 'Hamein Rs. 411 Rupye Prapt Hue. Dhanyawad!'
    // this.playAudio().then(() => {
    //   this.startReading().then(() => {
    //     this.hideText();
    //   });
    // });
    /////////////////////////
    const str = 'Paid Rs.128 to MANGALAM GENERAL STORE from Paytm Balance. Updated Balance: Paytm Wallet- Rs 7158.16. More Details: https://paytm.me/u-wPrAt';
    this.filterMessage(str);
  }

  ngOnInit(): void {
    this.appName = APP_CONSTANTS.APP_NAME;
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
        this.filterMessage(rawMsg);
      }
    });
  }

  filterMessage(rawMsg: string) {
    rawMsg = rawMsg.toLowerCase();
    // first condition implemented
    if (rawMsg.search(APP_CONSTANTS.FILTER_WORD_1) !== -1 ||
    rawMsg.search(APP_CONSTANTS.FILTER_WORD_2) !== -1 || 
    rawMsg.search(APP_CONSTANTS.FILTER_WORD_3) !== -1 ||
    rawMsg.search(APP_CONSTANTS.FILTER_WORD_4) !== -1) {
      let amount: string;
      // second condition implemented for rs
      if (rawMsg.match(APP_CONSTANTS.RS_TXT) !== null) {
        amount = this.filterAmount(rawMsg, APP_CONSTANTS.RS_TXT);
        // second condition implemented for INR
      } else if (rawMsg.match(APP_CONSTANTS.INR_TXT) !== null) {
        amount = this.filterAmount(rawMsg, APP_CONSTANTS.INR_TXT);
      }
      this.msgToSpeak = APP_CONSTANTS.MSG_SPEAK_1 +''+ amount +''+ APP_CONSTANTS.MSG_SPEAK_2;
      this.playAudio().then(() => {
        this.startReading().then(() => {
          this.hideText();
        });
      });
    }
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
  filterAmount(str: string, constTxt: string) {
    str = str.split(constTxt)[1];
    str = str.match(/^\d+|\d+\b|\d+(?=\w)/g)[0];
    return str;
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
      speakRate: 1.0, // optional - default is 1.0
      pitch: 1.0, // optional - default is 1.0
      volume: 1.0, // optional - default is 1.0
      locale: APP_CONSTANTS.LOCALE_IND_HINDI // optional - default is system locale,
    };
    return new Promise((resolve, reject) => {
      speakOptions.finishedCallback = resolve;
      TTS.speak(speakOptions)
    });
  }

  /**
  * This method will simply trash the message to hide on ui.
  */
  hideText() {
    const timer = setTimeout(() => {
      this.msgToSpeak = undefined;
      clearTimeout(timer);
    }, 1000);
  }

}
