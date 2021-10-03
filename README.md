# MMM-GoogleTTS
Text-to-Speech module for MagicMirror with Google Cloud TTS API.

## Update History
### **`1.1.0`** - 2021.10.03
- Repository revived. (eouia/MMM-GoogleTTS => MMRIZE/MMM-GoogleTTS)
- Drop out `moment` dependency.
- Some code typo fix.

## Screenshot
This module works on Background, so there is no screenshot.

## Features
This module gives "voice" to MagicMirror
- speech by notification order
- hooking other notification data to speak. (e.g: SHOW_ALERT)
- speech by `MMM-TelegramBot` command `/tts`
- welcomeMessage
- preventing over-used API quota by daily limitation.


## Installation
```sh
cd ~/MagicMirror/modules
git clone https://github.com/eouia/MMM-GoogleTTS
cd MMM-GoogleTTS
npm install
./node_modules/.bin/electron-rebuild
cp api_count.json.temp api_count.json
```

## Getting Google Credential
1. Select or create a Cloud Platform project.
   - [Go to the projects page](https://console.cloud.google.com/project)

2. Enable billing for your project.
   - [Pricing Information](https://cloud.google.com/text-to-speech/pricing)
   - [Enable billing](https://support.google.com/cloud/answer/6293499#enable-billing)
   - By default 4 Millions(for standard voice, 1 Million for `WaveNet` voice) characters could be used per month.
   - Usually 4 Millions characters seems enough to be used for normal usage per month.
   - You can limit daily usage by configuration if you don't want to pay for this service.

3. Enable the Google Cloud Text-to-Speech API.
   - [Enable the API](https://console.cloud.google.com/flows/enableapi?apiid=texttospeech.googleapis.com)

4. Set up authentication with a service account so you can access the API from your device.
   1. In the GCP Console, go to the Create service account key page.
       - [Create Service Account Key](https://console.cloud.google.com/apis/credentials/serviceaccountkey)
   2. From the **Service account** drop-down list, select **New service account**.
   3. In the **Service account name** field, enter a name(whatever)
   4. Don't select a value from the **Role** drop-down list. No role is required to access this service.
   5. Click **Create**. A note appears, warning that this service account has no role.
   6. Click **Create without role**. A JSON file that contains your key downloads to your device.
5. Rename downloaded file to `credentials.json` and copy it to `MMM-GoogleTTS` directory



## Configuration

### Simple
```js
{
  module: "MMM-GoogleTTS", // no `position` is needed.
  config: {}
},
```

### Details and Defaults
```js
{
  module: "MMM-GoogleTTS", // no `position` is needed.
  config: {
    welcome: ["May the force be with you", "Live long and prosper"],
    // String or Array of String or callback function to return String or Array. To disable this feature, set to null.
    /* Other example
    welcome: null,
    welcome: "Hello",
    welcome: ()=> {
      var d = Math.floor((Math.random() * 10) + 1)
      return "Today's Lucky number is" + d
    },
    */

    dailyCharLimit: 129000,
    // 4 Million divide by 30. I think it's enough for daily usage. If you have a will to pay, you can expand this value as your wish. But free usage will be enough.
    // Warning. When you use WaveNet voice, your free quota will be `1 Million per month` not `4 Million`.

    sourceType: "text",
    // "text" or "ssml".

    voiceName: "en-US-Standard-C",
    //If exists. e.g)"en-US-Standard-C". You can select specific voice name when there are many voices with same languageCode and gender.
    // voiceName should be matched with languageCode and ssmlGender

    languageCode: "en-US",
    ssmlGender: "FEMALE",
    //"MALE", "FEMALE", "NEUTRAL" or "SSML_VOICE_GENDER_UNSPECIFIED"
    // supported voices, languages and gender;
    // https://cloud.google.com/text-to-speech/docs/voices


    playCommand: "aplay %OUTPUTFILE%",
    // aplay, mpg321, afplay, as your wish....
    // sometimes you should give more options to play correctly.
    // e.g) "aplay -D plughw:1,0 $OUTPUTFILE%"

    audioEncoding: "LINEAR16",
    // LINEAR16 (.wav) or MP3 (.mp3) for playCommand. You don't need to modify this when you use `aplay`

    notificationTrigger: {
      "TEST_TTS" : "Test TTS notification is coming",
      "SHOW_ALERT" : (payload, sender) => {
        return payload.message
      },
    },
    // You can hook specific notification to speak something. String or callback function could be available.

    // You don't need to modify belows;
    notifications: {
      TTS_SAY: "TTS_SAY",
      TTS_SAY_STARTING: "TTS_SAY_STARTING",
      TTS_SAY_ENDING: "TTS_SAY_ENDING",
      TTS_SAY_ERROR: "TTS_SAY_ERROR"
    },
    credentialPath: "credentials.json",
  }
},
```

## Usage
### By Notification
#### notification hooking
You can hook specific notification to speak something with that notification.
By example;
```js
notificationTrigger: {
  "TEST_TTS" : "Test TTS notification is coming",
  "SHOW_ALERT" : (payload, sender) => {
    return payload.message
  },
},
```
- When `TEST_TTS` notification is received, "Test TTS notification is coming" will be spoken.
- When `SHOW_ALERT` notification is received, `payload.message` will be spoken. You can make Mirror to read `ALERT` by its voice.

#### notification command
With `TTS_SAY` notification, Other module can order this module to speak
```js
this.sendNotification("TTS_SAY", "May the Force be with you")
```

Or,
```js
this.sendNotification("TTS_SAY", {
  content: "Live long and prosper", //text to be spoken
  //belows are optional
  type: "text", // "text" or "ssml"
  voiceName: "en-US-Standard-B",
  languageCode: "en-US",
  ssmlGender: "FEMALE",
  callback: (error)=> {
    console.log("Message is spoken.")
  }
})
```

### By MMM-TelegramBot
- `/tts something` or `/alert something`
- By Example : `/tts Mom, I'm Tom, coming home now. I'm so hungry`

## Memo
- Google Text-To-Speech SDK is limited free. 4 Millions characters could be used per month without charge. I think it’s quiet enough for usual usage. You can limit daily usage by force with configuration to avoid charging. (But it’s your responsibility)

- If you are using another module or program which use speaker, use this carefully. Occupation collision could happen.
