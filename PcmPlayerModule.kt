package com.walkie

import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioTrack
import android.util.Base64
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.util.concurrent.Executors

class PcmPlayerModule(ctx: ReactApplicationContext) : ReactContextBaseJavaModule(ctx) {
  private var track: AudioTrack? = null
  private val exec = Executors.newSingleThreadExecutor()

  override fun getName() = "PcmPlayer"

  @ReactMethod
  fun start(sampleRate: Int) {
    exec.execute {
      if (track != null) return@execute
      val min = AudioTrack.getMinBufferSize(
        sampleRate, AudioFormat.CHANNEL_OUT_MONO, AudioFormat.ENCODING_PCM_16BIT)
      val t = AudioTrack.Builder()
        .setAudioAttributes(
          AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_MEDIA)
            .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH).build())
        .setAudioFormat(
          AudioFormat.Builder()
            .setSampleRate(sampleRate)
            .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
            .setEncoding(AudioFormat.ENCODING_PCM_16BIT).build())
        .setBufferSizeInBytes(maxOf(min * 2, 8192))
        .setTransferMode(AudioTrack.MODE_STREAM)
        .build()
      t.play()
      track = t
    }
  }

  @ReactMethod
  fun write(b64: String) {
    val bytes = Base64.decode(b64, Base64.DEFAULT)
    exec.execute { track?.write(bytes, 0, bytes.size) }
  }

  @ReactMethod
  fun stop() {
    exec.execute {
      val t = track ?: return@execute
      track = null
      try { t.stop(); Thread.sleep(250) } catch (_: Exception) {}
      t.release()
    }
  }
}
