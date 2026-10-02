package com.codewithkin.aircircle.car

import android.content.Context
import android.content.Intent
import android.media.AudioDeviceCallback
import android.media.AudioDeviceInfo
import android.media.AudioManager
import android.media.MediaRouter2
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

private const val ROUTE_EVENT = "onRouteChange"

/**
 * Where audio is going, and a way to change it.
 *
 * The app shows the current output on Now Playing and lets the listener open
 * the system's own output switcher. It also needs to know when a private
 * route — headphones, Bluetooth, a car — goes away, so that a pause caused by
 * unplugging can be explained as exactly that.
 */
class AircircleAudioRouteModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  private val audioManager: AudioManager
    get() = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager

  private val mainHandler = Handler(Looper.getMainLooper())
  private var observing = false

  private val deviceCallback = object : AudioDeviceCallback() {
    override fun onAudioDevicesAdded(addedDevices: Array<out AudioDeviceInfo>?) = emitRoute()
    override fun onAudioDevicesRemoved(removedDevices: Array<out AudioDeviceInfo>?) = emitRoute()
  }

  override fun definition() = ModuleDefinition {
    Name("AircircleAudioRoute")

    Events(ROUTE_EVENT)

    Function("getCurrentRoute") {
      currentRoute()
    }

    Function("showOutputSwitcher") {
      showOutputSwitcher()
    }

    OnStartObserving {
      if (!observing) {
        observing = true
        audioManager.registerAudioDeviceCallback(deviceCallback, mainHandler)
      }
    }

    OnStopObserving {
      stopObserving()
    }

    OnDestroy {
      stopObserving()
    }
  }

  private fun stopObserving() {
    if (!observing) return
    observing = false
    try {
      audioManager.unregisterAudioDeviceCallback(deviceCallback)
    } catch (_: Exception) {
      // The React context can be gone by the time this runs.
    }
  }

  private fun emitRoute() {
    try {
      sendEvent(ROUTE_EVENT, currentRoute())
    } catch (_: Exception) {
      // Nothing is listening any more.
    }
  }

  /**
   * The most specific output that is connected: Bluetooth, then anything
   * wired, then the phone's own speaker. Android routes media in that same
   * order of preference, so this matches where audio actually goes.
   */
  private fun currentRoute(): Map<String, Any?> {
    val outputs = audioManager.getDevices(AudioManager.GET_DEVICES_OUTPUTS)

    val bluetooth = outputs.firstOrNull { isBluetooth(it.type) }
    if (bluetooth != null) {
      return mapOf("kind" to "bluetooth", "name" to deviceName(bluetooth))
    }

    val wired = outputs.firstOrNull { isWired(it.type) }
    if (wired != null) {
      return mapOf("kind" to "wired", "name" to null)
    }

    return mapOf("kind" to "speaker", "name" to null)
  }

  private fun isBluetooth(type: Int): Boolean {
    if (type == AudioDeviceInfo.TYPE_BLUETOOTH_A2DP || type == AudioDeviceInfo.TYPE_HEARING_AID) {
      return true
    }
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      return type == AudioDeviceInfo.TYPE_BLE_HEADSET || type == AudioDeviceInfo.TYPE_BLE_SPEAKER
    }
    return false
  }

  private fun isWired(type: Int): Boolean =
    type == AudioDeviceInfo.TYPE_WIRED_HEADPHONES ||
      type == AudioDeviceInfo.TYPE_WIRED_HEADSET ||
      type == AudioDeviceInfo.TYPE_USB_HEADSET ||
      type == AudioDeviceInfo.TYPE_LINE_ANALOG ||
      type == AudioDeviceInfo.TYPE_LINE_DIGITAL

  /** The device's own name, unless it is just the phone's model repeated. */
  private fun deviceName(device: AudioDeviceInfo): String? {
    val name = device.productName?.toString()?.trim()
    if (name.isNullOrEmpty() || name == Build.MODEL) return null
    return name
  }

  /**
   * Opens the system output switcher. The route differs by Android version,
   * so each is tried in turn; the last resort is Bluetooth settings, which at
   * least gets the listener to the right place.
   */
  private fun showOutputSwitcher(): Boolean {
    val context = appContext.reactContext ?: return false

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
      try {
        if (MediaRouter2.getInstance(context).showSystemOutputSwitcher()) return true
      } catch (_: Exception) {
        // Fall through to the older route.
      }
    }

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
      try {
        val intent = Intent("com.android.systemui.action.LAUNCH_MEDIA_OUTPUT_DIALOG").apply {
          setPackage("com.android.systemui")
          putExtra("package_name", context.packageName)
        }
        context.sendBroadcast(intent)
        return true
      } catch (_: Exception) {
        // Fall through to settings.
      }
    }

    return try {
      context.startActivity(
        Intent(Settings.ACTION_BLUETOOTH_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      )
      true
    } catch (_: Exception) {
      false
    }
  }
}
