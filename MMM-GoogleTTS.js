//
// MMM-GoogleTTS
//
Module.register("MMM-GoogleTTS", {
  defaults: {
    credentialPath: "credentials.json",
    welcome: ["May the force be with you", "Live long and prosper"], // String or Array of String or callback function to return String or array. To disable this feature, set to null.
    dailyCharLimit: 129000, // 4 Million divide by 30. I think it's enough for daily usage. If you have a will pay, you can expand this value as your wish.
    // Warning. When you use WaveNet voice, your free quota will be `1 Million per month` not `4 Million`.

    sourceType: "text", // "text" or "ssml".
    voiceName: "en-US-Standard-C", //If exists. e.g)"en-US-Standard-C". You can select specific voice name when there are many voices with same languageCode and gender.
    // voiceName should be matched with languageCode and ssmlGender
    languageCode: "en-US",
    ssmlGender: "FEMALE", //"MALE", "FEMALE", "NEUTRAL" or "SSML_VOICE_GENDER_UNSPECIFIED"
    // languageCode and ssmlGender will be ignored when name is set.
    // supported voices, languages and gender;
    // https://cloud.google.com/text-to-speech/docs/voices


    playCommand: "aplay %OUTPUTFILE%", // aplay, mpg321, afplay, as your wish....
    // sometimes you should give more options to play correctly.
    // e.g) "aplay -D plughw:1,0 $OUTPUTFILE%"
    audioEncoding: "LINEAR16", // LINEAR16 (.wav) or MP3 (.mp3) for playCommand


    notificationTrigger: {
      "TEST_TTS": "Test TTS notification is coming",
      "SHOW_ALERT": (payload, sender) => {
        return payload.message
      },
    },


    // You don't need to modify belows;
    notifications: {
      TTS_SAY: "TTS_SAY",
      TTS_SAY_STARTING: "TTS_SAY_STARTING",
      TTS_SAY_ENDING: "TTS_SAY_ENDING",
      TTS_SAY_ERROR: "TTS_SAY_ERROR"
    }
  },

  start: function() {
    this.sendSocketNotification("CONFIG", this.config)
    this.callback = []
  },

  getCommands: function(register) {
    register.add({
      command: "tts",
      description: "Let MM speak something  `/tts something`",
      callback: "cmdSay"
    })
  },

  notificationReceived: function(noti, payload, sender) {
    if (this.config.notificationTrigger.hasOwnProperty(noti)) {
      var n = this.config.notificationTrigger[noti]
      var result = (typeof n == "function") ? n(payload, sender) : n
      this.say({content:result})
    }

    if (noti == "TTS_SAY") {
      var req = {}
      if (typeof payload == "string") {
        req.content = payload
      } else if (typeof payload === 'object') {
        req = {...payload}
      }
      if (payload.hasOwnProperty("callback")) {
        var cbKey = sender.name + Date.now()
        this.callback[cbKey] = payload.callback
        payload.callbackKey = cbKey
        req = payload
      }
      this.say(req)
    }

    if (noti == "DOM_OBJECTS_CREATED") {
      if (!this.config.welcome) {
        return
      }
      var welcome = (typeof this.config.welcome == "function") ? this.config.welcome() : this.config.welcome

      var content = ""
      if (Array.isArray(welcome)) {
        content = welcome[Math.floor(Math.random() * welcome.length)]
      } else {
        content = welcome
      }
      console.log(content)
      this.say({ content })
    }
  },

  socketNotificationReceived: function(noti, payload) {
    switch(noti) {
      case "SAY_STARTING":
        this.sendNotification(this.config.notifications.TTS_SAY_STARTING)
        break
      case "SAY_ENDING":
        if (payload["callbackKey"]) {
          this.callback[payload.callbackKey]()
          this.callback[payload.callbackKey] == null
          delete(this.callback[payload.callbackKey])
        }
        this.sendNotification(this.config.notifications.TTS_SAY_ENDING)
        break
      case "SAY_LIMIT_ERROR":
        console.log("[GGLTTS] Today's Quota be fulled.")
      case "SAY_ERROR":
        if (payload.obj["callbackKey"]) {
          this.callback[payload.callbackKey](payload.error)
          this.callback[payload.callbackKey] == null
          delete(this.callback[payload.callbackKey])
        }
        this.sendNotification(this.config.notifications.TTS_SAY_ERROR)
        break
    }
  },

  cmdSay: function(command, handler) {
    if (handler.args) {
      this.say({content:handler.args})
      console.log(handler.args)
      handler.reply("TEXT", "TTS speaking:" + handler.args)
    } else {
      handler.reply("TEXT", "Use `/tts something`", {parse_mode:'Markdown'})
    }
  },

  say: function(obj) {
    var makeVoiceRequest = (part) => {
      if (part.hasOwnProperty("content")) {
        return {
          content: part.content,
          type: (part.type) ? part.type : this.config.sourceType,
          voiceName : (part.voiceName) ? part.voiceName : this.config.voiceName,
          languageCode: (part.languageCode) ? part.languageCode : this.config.languageCode,
          ssmlGender: (part.ssmlGender) ? part.ssmlGender : this.config.ssmlGender,
          callbackKey : (part.callbackKey) ? part.callbackKey : null,
        }
      } else {
        return null
      }
    }
    var payload = makeVoiceRequest(obj)
    if (!payload) {
      console.log("[GGLTTS] There is no text to speak.")
      return false
    }
    this.sendSocketNotification("SAY", payload)
  }
})
