import { Component, OnInit } from "@angular/core";
import { TNSTextToSpeech, SpeakOptions } from 'nativescript-texttospeech';
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
  public showMsgOnScreen: boolean;
  public infoText: string;
  public appName: string;

  ngOnInit(): void {
    let msgToSpeak: string;
    this.infoText = APP_CONSTANTS.INFO_TXT;
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
      let messages: Object[];            
      messages = <any>intent.getSerializableExtra("pdus");
      const format: string = intent.getStringExtra("format");
      for (let i = 0; i < messages.length; i++) {
        const message = android.telephony.SmsMessage.createFromPdu(messages[i], format);
        const msgFrom = message.getDisplayOriginatingAddress();
        let rawMsg = message.getMessageBody();
        rawMsg = rawMsg.toLowerCase();
        // first condition implemented
        if (rawMsg.search(APP_CONSTANTS.FILTER_WORD_1) !== -1 ||
        rawMsg.search(APP_CONSTANTS.FILTER_WORD_2) !== -1 || 
        rawMsg.search(APP_CONSTANTS.FILTER_WORD_3) !== -1) {
          let amount: string;
          // second condition implemented for rs
          if (rawMsg.search(APP_CONSTANTS.RS_TXT) !== -1) {
            amount = this.filterAmount(rawMsg, APP_CONSTANTS.RS_TXT);
            // second condition implemented for INR
          } else if (rawMsg.search(APP_CONSTANTS.INR_TXT) !== -1) {
            amount = this.filterAmount(rawMsg, APP_CONSTANTS.INR_TXT);
          }
          msgToSpeak = APP_CONSTANTS.MSG_SPEAK_1 +''+ amount +''+ APP_CONSTANTS.MSG_SPEAK_2;
          this.startReading(msgToSpeak);
        }
      }
    });
  }

  filterAmount(str: string, constTxt: string) {
    str = str.split(constTxt)[1];
    str = str.split('.')[0];
    return str;
  }

  showAlert() {
    const requestObj = {
      title: APP_CONSTANTS.APP_NAME,
      message: APP_CONSTANTS.SMS_PERMISSION_DECLINE_MSG,
      okButtonText: APP_CONSTANTS.GOT_IT_TXT
    };
    dialogs.prompt(requestObj);
  }

  startReading(msgToSpeak: string) {
    this.showMsgOnScreen = true;
    let speakOptions: SpeakOptions = {
      text: msgToSpeak, /// *** required ***
      speakRate: 1.0, // optional - default is 1.0
      pitch: 1.0, // optional - default is 1.0
      volume: 1.0, // optional - default is 1.0
      locale: APP_CONSTANTS.LOCALE_IND_HINDI, // optional - default is system locale,
      finishedCallback: () => {
        this.showMsgOnScreen = false;
      } // optional
    };
    TTS.speak(speakOptions).then(() => {
      // console.log('everything is fine');
    }, (err) => {
      // console.log('oops, something went wrong!', err);
    });
  }
}
