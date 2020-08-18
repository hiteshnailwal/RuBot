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
  public displayMsgArr: [string]; 

  /**
   * 
   * @param page 
   */
  constructor (
    private page: Page,
  ) {
    this._player = new TNSPlayer();
    this.page.on('navigatingTo', this.onNavigatingTo.bind(this));
    this.page.on('navigatedFrom', this.onNavigatedFrom.bind(this));
  }

  /**
   * This is default angular lifecycle method when initializing the component.
   */
  ngOnInit() {
    this.appName = APP_CONSTANTS.APP_NAME;
    this.msgToSpeak = '';
    this.displayMsgArr = [''];
  }

  /**
   * This is default nativescript page method when page is initalized.
   * This method check the message permission and then register the message receive events.
   * if user deny the permission then an alert will be visible with basic permission info.
   * everytime when message received the event will invoked and filterMsgLevel1 method will be called.
   * 
   * @param args is a page related object.
   */
  onNavigatingTo(args: EventData) {
    /** android text message receive permission for device */
    if (!this.smsReceivePermissionFlag) {
      permissions.requestPermissions([android.Manifest.permission.RECEIVE_SMS], APP_CONSTANTS.SMS_PERMISSION_TXT).then(() => {
        this.smsReceivePermissionFlag = true;
      }).catch(() => {
        this.smsReceivePermissionFlag = false;
        this.showDenyMsgPermissionInfoAlert();
      });
    }
    /** intent constant for getting message receive event */
    const smsReceiveIntent = android.provider.Telephony.Sms.Intents.SMS_RECEIVED_ACTION;
    application.android.registerBroadcastReceiver(smsReceiveIntent,
      (context: android.content.Context, intent: android.content.Intent) => { 
      /** native android way to get the actual message and address from intent */
      let messages: Object[];            
      messages = <any>intent.getSerializableExtra("pdus");
      const format: string = intent.getStringExtra("format");
      for (let i = 0; i < messages.length; i++) {
        const message = android.telephony.SmsMessage.createFromPdu(messages[i], format);
        const msgFrom = message.getDisplayOriginatingAddress();
        const rawMsg = message.getMessageBody();
        /** calling other method to filter the text message */
        this.filterMsgLevel1(rawMsg, args);
      }
    });
  }

  /**
   * This method filter the string with selected words and pass the string for next filter.
   * 
   * @param rawMsg is actual message passed by intent.
   * @param args is a page related object.
   */
  filterMsgLevel1(rawMsg: string, args: EventData) {
    rawMsg = rawMsg.toLowerCase();
    /** first condition implemented */
    if (rawMsg.search(APP_CONSTANTS.FILTER_WORD_1) !== -1 ||
    rawMsg.search(APP_CONSTANTS.FILTER_WORD_2) !== -1 || 
    rawMsg.search(APP_CONSTANTS.FILTER_WORD_3) !== -1 ||
    rawMsg.search(APP_CONSTANTS.FILTER_WORD_4) !== -1) {
      /** second condition implemented for rs */
      if (rawMsg.match(APP_CONSTANTS.RS_TXT) !== null) {
        this.filterMsgLevel2(rawMsg, APP_CONSTANTS.RS_TXT).then((amount) => {
          this.bindFilteredMsgWithUI(amount, args);
        });
      /** second condition implemented for INR */
      } else if (rawMsg.match(APP_CONSTANTS.INR_TXT) !== null) {
        this.filterMsgLevel2(rawMsg, APP_CONSTANTS.INR_TXT).then((amount) => {
          this.bindFilteredMsgWithUI(amount, args);
        });
      }
    }
  }

  /**
   * this method filter the string and return the actual amount received by user as a promise.
   * 
   * @param str is level-1 filtered message.
   * @param constTxt is filter word, based on this level-2 filtering will be initiated.
   */
  filterMsgLevel2(str: string, constTxt: string): Promise<string> {
    return new Promise((resolve, reject) => {
      str = str.split(constTxt)[1].replace(/,/g, '');
      const amount = str.match(/^\d+|\d+\b|\d+(?=\w)/g)[0];
      resolve(amount);
    });
  }

  /**
   * this method got the actual amount of money and based on it a string will be generated.
   * a new label will be created with CSS property and all the stuff will be bind with UI.
   * once all done, this method will invoke the ring audio method.
   * 
   * @param str is filtered message, basically the amount of money.
   * @param args is a page related object.
   */
  bindFilteredMsgWithUI(amount: string, args: EventData) {
    const audioMsg = APP_CONSTANTS.MSG_SPEAK_1 +''+ amount +''+ APP_CONSTANTS.MSG_SPEAK_2;
    const displayMsg = amount +''+ APP_CONSTANTS.DISPLAY_MSG;
    this.displayMsgArr.push(displayMsg);
    /** add message label binding start */
    const page = <Page>args.object;
    const msgContent = <StackLayout>page.getViewById("content");
    const vm = new Observable();
    /** removing existing html */
    msgContent.removeChildren();
    /** binding new html array */
    for (let index: number = this.displayMsgArr.length; index > 0; index--) {
      const msgLabel = new Label();
      msgLabel.text =  this.displayMsgArr[index];
      msgLabel.textWrap = true;
      msgLabel.className = 'msgBody';
      msgContent.addChild(msgLabel);
    }
    const pageCSS = APP_CONSTANTS.MSG_BLOCK_CSS;
    page.css = pageCSS;
    page.bindingContext = vm;
    /** add message label binding end */

    /** calling audio player */
    this.playRingAudio().then(() => {
      this.playMsgAudio(audioMsg);
    });
  }

  /**
   * this method start the ring audio and return ring complete call back.
   */
  playRingAudio() {
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
   * this method start the modified message audio and return message complete call back.
   */
  playMsgAudio(audioMsg: string) {
    let speakOptions: SpeakOptions = {
      text: audioMsg, /// *** required ***
      speakRate: 0.9, // optional - default is 1.0
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
   * This method invokes when user deny the read permission. The method simply provide the information
   * to the user regarding message permission importance for this application.
   */
  showDenyMsgPermissionInfoAlert() {
    const requestObj = {
      title: APP_CONSTANTS.APP_NAME,
      message: APP_CONSTANTS.SMS_PERMISSION_DECLINE_MSG,
      okButtonText: APP_CONSTANTS.GOT_IT_TXT
    };
    /** nativescript dialog call */
    dialogs.prompt(requestObj);
  }

  /**
   * this method calls when user start to navigate in other page.
   */
  onNavigatedFrom() {
  }

  // tap() {
  //   const msg = 'pay tm per 40 Rupye Prapt Hue.';
  //   let speakOptions: SpeakOptions = {
  //     text: msg, /// *** required ***
  //     speakRate: 0.8, // optional - default is 1.0
  //     pitch: 1, // optional - default is 1.0
  //     volume: 1.0, // optional - default is 1.0
  //     locale: APP_CONSTANTS.LOCALE_IND_HINDI // optional - default is system locale,
  //   };
  //   return new Promise((resolve, reject) => {
  //     speakOptions.finishedCallback = resolve;
  //     TTS.speak(speakOptions)
  //   });
  // }
}
