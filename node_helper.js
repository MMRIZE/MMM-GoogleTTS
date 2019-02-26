//
// Module : MMM-GoogleTTS
//

'use strict'

const fs = require('fs')
const moment = require("moment")
const path = require('path')
const exec = require('child_process').exec
const textToSpeech = require('@google-cloud/text-to-speech')


var NodeHelper = require("node_helper")

module.exports = NodeHelper.create({
  start: function() {
    this.config = {}
    this.tmpFile = ""
    this.countFile = ""
    this.today = moment().format("YYYYMMDD")
    this.count = 0
    this.client = null
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
      fs.writeFile(this.countFile, JSON.stringify(data), 'utf8', ()=>{
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
        this.sendSocketNotification("SAY_LIMIT_ERROR", {obj:obj})
        return
      }
    }

    var request = {
      input: {},
      voice: {},
      audioConfig: {}
    }
    if (obj.type == "text") {
      request.input.text = obj.content
    } else {
      request.input.ssml = obj.content
    }

    request.voice.languageCode = obj.languageCode
    request.voice.ssmlGender = obj.ssmlGender
    request.voice.name = obj.voiceName
    request.audioConfig.audioEncoding = this.config.audioEncoding

    var command = this.config.playCommand.replace("%OUTPUTFILE%", this.tmpFile)

    this.client.synthesizeSpeech(request, (err, response) => {
      if (err) {
        console.log("[GGLTTS] Synthesize Error:", err)
        this.sendSocketNotification("SAY_ERROR", {obj:obj, error:err})
        return
      }

      var quota = {}
      if (this.today == moment().format("YYYYMMDD")) {
        this.count = this.count + obj.content.length
        quota[this.today] = this.count
      } else {
        quota[this.today] = obj.content.length
      }

      fs.writeFile(this.countFile, JSON.stringify(quota), "utf8", (e)=>{
        if (e) {
          console.log("[GGLTTS] Quota file write error:", e)
        } else {
          console.log("[GGLTTS] Today's Quota Used:", this.count)
        }
      })


      fs.writeFile(this.tmpFile, response.audioContent, 'binary', (e) => {
        if (e) {
          console.log("[GGLTTS] File Error:", e)
          this.sendSocketNotification("SAY_ERROR", {obj:obj, error:e})
          return
        }
        this.sendSocketNotification("SAY_STARTING")
        exec(command, (er)=>{
          if (er) {
            console.log("[GGLTTS] Playing Sound Error:", er)
            this.sendSocketNotification("SAY_ERROR", {obj:obj, error:er})
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
