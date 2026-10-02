package com.codewithkin.aircircle.car

import android.content.Intent
import android.os.Bundle
import androidx.annotation.OptIn
import androidx.media3.common.AudioAttributes
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.util.UnstableApi
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.session.LibraryResult
import androidx.media3.session.MediaLibraryService
import androidx.media3.session.MediaLibraryService.LibraryParams
import androidx.media3.session.MediaLibraryService.MediaLibrarySession
import androidx.media3.session.MediaSession
import androidx.media3.session.SessionError
import com.google.common.collect.ImmutableList
import com.google.common.util.concurrent.Futures
import com.google.common.util.concurrent.ListenableFuture
import com.google.common.util.concurrent.SettableFuture
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

/**
 * Aircircle in the car.
 *
 * Android Auto (and any Bluetooth head unit that browses media) binds to this
 * service to list stations, search, and play. It has its own player because
 * the car can start it with the app closed, when there is no React Native
 * runtime to ask.
 *
 * What it deliberately does not do:
 *   - No seek, skip or queue. A live stream has none of those, so the car is
 *     never offered controls that would do nothing.
 *   - No autoplay. Nothing starts until the driver picks or asks for a station.
 *   - No silent substitution. A station that will not play simply fails; the
 *     car is never handed a different station in its place.
 *
 * When this starts playing it takes audio focus, which pauses the phone app's
 * own player if it was playing — so there are never two streams at once.
 */
@OptIn(UnstableApi::class)
class CarPlaybackService : MediaLibraryService() {
  private var session: MediaLibrarySession? = null
  private var player: ExoPlayer? = null
  private lateinit var library: CarLibrary

  /** Disk and network work happens here, never on the main thread. */
  private val worker: ExecutorService = Executors.newSingleThreadExecutor()

  override fun onCreate() {
    super.onCreate()
    library = CarLibrary(this)

    val exoPlayer = ExoPlayer.Builder(this)
      .setAudioAttributes(
        AudioAttributes.Builder()
          .setUsage(C.USAGE_MEDIA)
          .setContentType(C.AUDIO_CONTENT_TYPE_MUSIC)
          .build(),
        // Let the player manage audio focus: it pauses for calls and
        // navigation prompts, and ducks where the platform says to.
        true,
      )
      // Unplugging from the car must not send audio to the phone speaker.
      .setHandleAudioBecomingNoisy(true)
      // Keep the CPU and network awake while streaming with the screen off.
      .setWakeMode(C.WAKE_MODE_NETWORK)
      .build()

    player = exoPlayer
    session = MediaLibrarySession.Builder(this, exoPlayer, LibraryCallback())
      // The app's own playback session exists alongside this one; ids must differ.
      .setId("aircircle-car")
      .build()
  }

  override fun onGetSession(controllerInfo: MediaSession.ControllerInfo): MediaLibrarySession? =
    session

  override fun onTaskRemoved(rootIntent: Intent?) {
    // Swiping the app away stops the service unless it is actually playing.
    val current = player
    if (current == null || !current.playWhenReady || current.mediaItemCount == 0) {
      stopSelf()
    }
  }

  override fun onDestroy() {
    session?.release()
    session = null
    player?.release()
    player = null
    worker.shutdown()
    super.onDestroy()
  }

  /** Runs `block` on the worker and delivers its result as a future. */
  private fun <T> onWorker(fallback: T, block: () -> T): ListenableFuture<T> {
    val future = SettableFuture.create<T>()
    try {
      worker.execute {
        try {
          future.set(block())
        } catch (_: Exception) {
          future.set(fallback)
        }
      }
    } catch (_: Exception) {
      // The service is shutting down.
      future.set(fallback)
    }
    return future
  }

  private inner class LibraryCallback : MediaLibrarySession.Callback {
    override fun onGetLibraryRoot(
      session: MediaLibrarySession,
      browser: MediaSession.ControllerInfo,
      params: LibraryParams?,
    ): ListenableFuture<LibraryResult<MediaItem>> {
      // Hints for Android Auto: folders and stations as lists, search offered.
      val extras = Bundle().apply {
        putBoolean("android.media.browse.CONTENT_STYLE_SUPPORTED", true)
        putInt("android.media.browse.CONTENT_STYLE_BROWSABLE_HINT", 1)
        putInt("android.media.browse.CONTENT_STYLE_PLAYABLE_HINT", 1)
        putBoolean("android.media.browse.SEARCH_SUPPORTED", true)
      }
      val rootParams = LibraryParams.Builder().setExtras(extras).build()
      return Futures.immediateFuture(LibraryResult.ofItem(library.root(), rootParams))
    }

    override fun onGetChildren(
      session: MediaLibrarySession,
      browser: MediaSession.ControllerInfo,
      parentId: String,
      page: Int,
      pageSize: Int,
      params: LibraryParams?,
    ): ListenableFuture<LibraryResult<ImmutableList<MediaItem>>> {
      val empty = LibraryResult.ofItemList(ImmutableList.of<MediaItem>(), params)
      // Lists are short enough to be a single page.
      if (page > 0) return Futures.immediateFuture(empty)
      return onWorker(empty) {
        LibraryResult.ofItemList(ImmutableList.copyOf(library.children(parentId)), params)
      }
    }

    override fun onGetItem(
      session: MediaLibrarySession,
      browser: MediaSession.ControllerInfo,
      mediaId: String,
    ): ListenableFuture<LibraryResult<MediaItem>> {
      val missing = LibraryResult.ofError<MediaItem>(SessionError.ERROR_BAD_VALUE)
      return onWorker(missing) {
        val item = library.item(mediaId)
        if (item != null) LibraryResult.ofItem(item, null) else missing
      }
    }

    override fun onSearch(
      session: MediaLibrarySession,
      browser: MediaSession.ControllerInfo,
      query: String,
      params: LibraryParams?,
    ): ListenableFuture<LibraryResult<Void>> {
      // Acknowledge at once, then tell the car how many results there are.
      try {
        worker.execute {
          val count = try {
            library.searchItems(query).size
          } catch (_: Exception) {
            0
          }
          session.notifySearchResultChanged(browser, query, count, params)
        }
      } catch (_: Exception) {
        // The service is shutting down.
      }
      return Futures.immediateFuture(LibraryResult.ofVoid())
    }

    override fun onGetSearchResult(
      session: MediaLibrarySession,
      browser: MediaSession.ControllerInfo,
      query: String,
      page: Int,
      pageSize: Int,
      params: LibraryParams?,
    ): ListenableFuture<LibraryResult<ImmutableList<MediaItem>>> {
      val empty = LibraryResult.ofItemList(ImmutableList.of<MediaItem>(), params)
      if (page > 0) return Futures.immediateFuture(empty)
      return onWorker(empty) {
        LibraryResult.ofItemList(ImmutableList.copyOf(library.searchItems(query)), params)
      }
    }

    /**
     * The car asked to play something. It sends only an id, or only the words
     * that were spoken; this is where that becomes a stream address.
     */
    override fun onAddMediaItems(
      mediaSession: MediaSession,
      controller: MediaSession.ControllerInfo,
      mediaItems: MutableList<MediaItem>,
    ): ListenableFuture<MutableList<MediaItem>> {
      val nothing: MutableList<MediaItem> = mutableListOf()
      return onWorker(nothing) {
        // One live station at a time: there is no queue to build.
        val first = mediaItems.firstOrNull()
        val resolved = first?.let { library.resolveForPlayback(it) }
        if (resolved != null) mutableListOf(resolved) else nothing
      }
    }
  }
}
