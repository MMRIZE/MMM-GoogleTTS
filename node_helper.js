//
// Module : MMM-GoogleTTS
//

"use strict"

const fs = require("fs")
const path = require("path")
const exec = require("child_process").exec
const textToSpeech = require("@google-cloud/text-to-speech")

const NodeHelper = require("node_helper")

const getToday = () => {
  let date = new Date()
  return date.getFullYear() + String(date.getMonth() + 1).padStart(2, "0") + String(date.getDate()).padStart(2, "0") 
}

module.exports = NodeHelper.create({
  start: function() {
    this.config = {}
    this.tmpFile = ""
    this.countFile = ""
    this.today = getToday()
    this.count = 0
    this.client = null
    process.env.GOOGLE_APPLICATION_CREDENTIALS = path.resolve(__dirname, "account.json")
  },

  initialize: function(config) {
    console.log("[GGLTTS] Initialized.")
    this.config = config
    this.credentials = path.resolve(__dirname, this.config.credentialPath)
    this.client = new textToSpeech.TextToSpeechClient({keyFilename:this.credentials})
    this.tmpFile = path.resolve(__dirname, "temp_output")
    this.countFile = path.resolve(__dirname, "api_count.json")
    var obj = JSON.parse(fs.readFileSync(this.countFile), "utf8")
    if (obj.hasOwnProperty(this.today)) {
      this.count = obj[this.today]
      console.log("[GGLTTS] Today's quota used:", this.count)
    } else {
      var data = {}
      data[this.today] = this.count
      fs.writeFile(this.countFile, JSON.stringify(data), "utf8", ()=>{
        console.log("[GGLTTS] Today's quota initialized")
      })
    }
  },

  socketNotificationReceived: function(noti, payload) {
    switch(noti) {
      case "CONFIG":
        this.initialize(payload)
        break
      case "SAY":
        this.say(payload)
        break
    }
  },

  say: function(obj) {
    if (obj.content) {
      if (this.config.dailyCharLimit <= this.count + obj.content.length) {
        console.log("[GGLTTS] Today's quota limited:", this.count, this.config.dailyCharLimit)
        this.sendSocketNotification("SAY_LIMIT_ERROR", { obj })
        return
      }
    }

    var request = {
      input: {},
      voice: {},
      audioConfig: {}
    }
    if (obj.type === "text") {
      request.input.text = obj.content
    } else {
      request.input.ssml = obj.content
    }

    request.voice.languageCode = obj.languageCode
    request.voice.ssmlGender = obj.ssmlGender
    request.voice.name = obj.voiceName
    request.audioConfig.audioEncoding = this.config.audioEncoding

    var command = this.config.playCommand.replace("%OUTPUTFILE%", this.tmpFile)

    this.client.synthesizeSpeech(request, (error, response) => {
      if (error) {
        console.log("[GGLTTS] Synthesize Error:", error)
        this.sendSocketNotification("SAY_ERROR", { obj, error })
        return
      }

      var quota = {}
      if (this.today === getToday()) {
        this.count = this.count + obj.content.length
        quota[this.today] = this.count
      } else {
        this.today = getToday()
        quota[this.today] = obj.content.length
      }

      fs.writeFile(this.countFile, JSON.stringify(quota), "utf8", (e)=>{
        if (e) {
          console.log("[GGLTTS] Quota file write error:", e)
        } else {
          console.log("[GGLTTS] Today's quota used:", this.count)
        }
      })

      fs.writeFile(this.tmpFile, response.audioContent, "binary", (e) => {
        if (e) {
          console.log("[GGLTTS] File Error:", e)
          this.sendSocketNotification("SAY_ERROR", { obj, error:e })
          return
        }
        this.sendSocketNotification("SAY_STARTING")
        exec(command, (er)=>{
          if (er) {
            console.log("[GGLTTS] Playing Sound Error:", er)
            this.sendSocketNotification("SAY_ERROR", { obj, error:er })
          }
          fs.unlink(this.tmpFile, ()=>{
            this.sendSocketNotification("SAY_ENDING", obj)
          })
          return
        })
      })
    })
  },
})
