package com.codewithkin.aircircle.car

import android.content.Context
import android.net.Uri
import androidx.media3.common.MediaItem
import androidx.media3.common.MediaMetadata
import java.io.ByteArrayOutputStream
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder
import java.util.concurrent.ConcurrentHashMap
import org.json.JSONArray
import org.json.JSONObject

/** A station as the car needs it: enough to list it and to play it. */
data class CarStation(
  val uuid: String,
  val name: String,
  val url: String,
  val urlResolved: String?,
  val place: String?,
  val raw: JSONObject,
)

/**
 * Everything the car can browse.
 *
 * The car can start this app's service cold, with no React Native running, so
 * nothing here depends on JavaScript. The listener's own stations come from a
 * small JSON file the app keeps up to date; Popular, genres and search go to
 * the Radio Browser directory directly.
 *
 * Every call here does disk or network work and must be made off the main
 * thread.
 */
class CarLibrary(private val context: Context) {
  companion object {
    const val ROOT = "root"
    const val FAVORITES = "favorites"
    const val RECENTS = "recents"
    const val POPULAR = "popular"
    const val GENRES = "genres"
    const val GENRE_PREFIX = "genre:"
    const val STATION_PREFIX = "station:"

    /** Lists are kept short: a driver should be choosing, not scrolling. */
    private const val LIST_LIMIT = 30

    private const val TIMEOUT_MS = 6000
    private const val MAX_RESPONSE_BYTES = 2 * 1024 * 1024
    private const val USER_AGENT = "Aircircle/1.0"

    /** Directory mirrors, tried in order until one answers. */
    private val HOSTS = listOf(
      "de2.api.radio-browser.info",
      "fi1.api.radio-browser.info",
      "de1.api.radio-browser.info",
    )

    /** Tag sent to the directory, and the label used if the app hasn't supplied one. */
    private val GENRE_TAGS = listOf(
      "news" to "News",
      "pop" to "Music",
      "talk" to "Talk",
      "sports" to "Sports",
      "classical" to "Classical",
      "jazz" to "Jazz",
      "culture" to "Culture",
      "community" to "Community",
      "religious" to "Religious",
      "college" to "Student/College",
    )
  }

  /** Every station handed to the car, so a tapped item can be found again by id. */
  private val known = ConcurrentHashMap<String, CarStation>()

  private val libraryFile: File
    get() = File(context.filesDir, "car/library.json")

  private val playedFile: File
    get() = File(context.filesDir, "car/played.jsonl")

  /* ---------------------------------------------------------------------- *
   * Browse tree
   * ---------------------------------------------------------------------- */

  fun root(): MediaItem = folder(ROOT, "Aircircle")

  fun children(parentId: String): List<MediaItem> {
    return when {
      parentId == ROOT -> rootFolders()
      parentId == FAVORITES -> saved("favorites").map { playable(it) }
      parentId == RECENTS -> saved("recents").map { playable(it) }
      parentId == POPULAR -> fetch("/json/stations/topclick/$LIST_LIMIT?hidebroken=true").map { playable(it) }
      parentId == GENRES -> GENRE_TAGS.map { (tag, fallback) ->
        folder(GENRE_PREFIX + tag, label("genre.$tag", fallback))
      }
      parentId.startsWith(GENRE_PREFIX) -> {
        val tag = encode(parentId.removePrefix(GENRE_PREFIX))
        fetch(
          "/json/stations/search?tag=$tag&limit=$LIST_LIMIT&order=clickcount&reverse=true&hidebroken=true"
        ).map { playable(it) }
      }
      else -> emptyList()
    }
  }

  private fun rootFolders(): List<MediaItem> {
    val folders = mutableListOf<MediaItem>()
    // The listener's own stations come first; empty folders are left out.
    if (saved("favorites").isNotEmpty()) folders.add(folder(FAVORITES, label("favorites", "Favorites")))
    if (saved("recents").isNotEmpty()) folders.add(folder(RECENTS, label("recents", "Recent")))
    folders.add(folder(POPULAR, label("popular", "Popular")))
    folders.add(folder(GENRES, label("genres", "Genres")))
    return folders
  }

  fun item(mediaId: String): MediaItem? {
    if (mediaId.startsWith(STATION_PREFIX)) {
      return known[mediaId.removePrefix(STATION_PREFIX)]?.let { playable(it) }
    }
    return children(ROOT).firstOrNull { it.mediaId == mediaId }
  }

  /* ---------------------------------------------------------------------- *
   * Search
   * ---------------------------------------------------------------------- */

  /** Stations matching a typed or spoken query: by name first, then by genre. */
  fun search(query: String): List<CarStation> {
    val q = query.trim()
    if (q.isEmpty()) return saved("favorites").ifEmpty { saved("recents") }

    val encoded = encode(q)
    val byName = fetch(
      "/json/stations/search?name=$encoded&limit=20&order=clickcount&reverse=true&hidebroken=true"
    )
    if (byName.isNotEmpty()) return byName

    return fetch(
      "/json/stations/search?tag=$encoded&limit=20&order=clickcount&reverse=true&hidebroken=true"
    )
  }

  fun searchItems(query: String): List<MediaItem> = search(query).map { playable(it) }

  /* ---------------------------------------------------------------------- *
   * Playback
   * ---------------------------------------------------------------------- */

  /**
   * Turns what the car asked for into something ExoPlayer can open. The car
   * sends either the id of an item it was shown, or — for "play jazz on
   * Aircircle" — just the words that were spoken.
   */
  fun resolveForPlayback(requested: MediaItem): MediaItem? {
    val spoken = requested.requestMetadata.searchQuery
    val station = when {
      requested.mediaId.startsWith(STATION_PREFIX) ->
        known[requested.mediaId.removePrefix(STATION_PREFIX)]
      spoken != null -> search(spoken).firstOrNull()
      else -> null
    } ?: return null

    val stream = resolveStream(station) ?: return null
    notePlayed(station)

    return MediaItem.Builder()
      .setMediaId(STATION_PREFIX + station.uuid)
      .setUri(Uri.parse(stream))
      .setMediaMetadata(metadata(station))
      .build()
  }

  /** The station to offer when the car asks to resume with nothing queued. */
  fun lastPlayed(): CarStation? {
    val last = readLibrary()?.optJSONObject("last")?.let { parseStation(it) }
    return last ?: saved("recents").firstOrNull() ?: saved("favorites").firstOrNull()
  }

  /**
   * Radio Browser only follows HTTP redirects; a station published as a .pls
   * or .m3u file still has to be opened and read for the stream inside it.
   */
  private fun resolveStream(station: CarStation): String? {
    val candidate = station.urlResolved?.takeIf { it.isNotBlank() } ?: station.url
    if (candidate.isBlank()) return null

    val path = try {
      URL(candidate).path.lowercase()
    } catch (_: Exception) {
      return candidate
    }
    val isPls = path.endsWith(".pls")
    val isM3u = path.endsWith(".m3u")
    if (!isPls && !isM3u) return candidate

    val text = httpGet(candidate) ?: return candidate
    for (rawLine in text.lines()) {
      val line = rawLine.trim()
      if (isPls) {
        val match = Regex("^File\\d+\\s*=\\s*(\\S+)", RegexOption.IGNORE_CASE).find(line)
        val url = match?.groupValues?.get(1)
        if (url != null && url.startsWith("http", ignoreCase = true)) return url
      } else if (line.isNotEmpty() && !line.startsWith("#") && line.startsWith("http", ignoreCase = true)) {
        return line
      }
    }
    return candidate
  }

  /**
   * Leaves a note for the app, which owns Recents, to pick up next time it is
   * opened. The car never writes the app's own storage directly.
   */
  private fun notePlayed(station: CarStation) {
    try {
      playedFile.parentFile?.mkdirs()
      playedFile.appendText(station.raw.toString() + "\n")
    } catch (_: Exception) {
      // Missing a Recents entry is not worth interrupting playback for.
    }
  }

  /* ---------------------------------------------------------------------- *
   * Media items
   * ---------------------------------------------------------------------- */

  private fun folder(id: String, title: String): MediaItem =
    MediaItem.Builder()
      .setMediaId(id)
      .setMediaMetadata(
        MediaMetadata.Builder()
          .setTitle(title)
          .setIsBrowsable(true)
          .setIsPlayable(false)
          .setMediaType(MediaMetadata.MEDIA_TYPE_FOLDER_RADIO_STATIONS)
          .build()
      )
      .build()

  private fun playable(station: CarStation): MediaItem {
    known[station.uuid] = station
    return MediaItem.Builder()
      .setMediaId(STATION_PREFIX + station.uuid)
      .setMediaMetadata(metadata(station))
      .build()
  }

  private fun metadata(station: CarStation): MediaMetadata =
    MediaMetadata.Builder()
      .setTitle(station.name)
      .setArtist(station.place)
      .setSubtitle(station.place)
      .setStation(station.name)
      .setIsBrowsable(false)
      .setIsPlayable(true)
      .setMediaType(MediaMetadata.MEDIA_TYPE_RADIO_STATION)
      .build()

  /* ---------------------------------------------------------------------- *
   * The listener's own stations, written by the app
   * ---------------------------------------------------------------------- */

  private fun readLibrary(): JSONObject? =
    try {
      if (libraryFile.exists()) JSONObject(libraryFile.readText()) else null
    } catch (_: Exception) {
      null
    }

  private fun saved(key: String): List<CarStation> {
    val array = readLibrary()?.optJSONArray(key) ?: return emptyList()
    return parseStations(array).take(LIST_LIMIT)
  }

  /** A label in the listener's language, as supplied by the app. */
  private fun label(key: String, fallback: String): String {
    val value = readLibrary()?.optJSONObject("labels")?.optString(key, "")
    return if (value.isNullOrBlank()) fallback else value
  }

  /* ---------------------------------------------------------------------- *
   * Directory
   * ---------------------------------------------------------------------- */

  private fun fetch(pathAndQuery: String): List<CarStation> {
    for (host in HOSTS) {
      val text = httpGet("https://$host$pathAndQuery") ?: continue
      return try {
        parseStations(JSONArray(text))
      } catch (_: Exception) {
        emptyList()
      }
    }
    return emptyList()
  }

  private fun httpGet(address: String): String? {
    var connection: HttpURLConnection? = null
    try {
      val opened = URL(address).openConnection() as HttpURLConnection
      connection = opened
      opened.connectTimeout = TIMEOUT_MS
      opened.readTimeout = TIMEOUT_MS
      opened.instanceFollowRedirects = true
      opened.setRequestProperty("User-Agent", USER_AGENT)
      if (opened.responseCode !in 200..299) return null

      // Directory replies and playlist files are small. A stream is endless,
      // so reading stops at a cap rather than waiting for an end that never comes.
      val output = ByteArrayOutputStream()
      val buffer = ByteArray(16 * 1024)
      val input = opened.inputStream
      try {
        var total = 0
        while (total < MAX_RESPONSE_BYTES) {
          val read = input.read(buffer)
          if (read < 0) break
          output.write(buffer, 0, read)
          total += read
        }
      } finally {
        input.close()
      }
      return output.toString("UTF-8")
    } catch (_: Exception) {
      return null
    } finally {
      connection?.disconnect()
    }
  }

  private fun parseStations(array: JSONArray): List<CarStation> {
    val stations = mutableListOf<CarStation>()
    val seen = HashSet<String>()
    for (i in 0 until array.length()) {
      val station = array.optJSONObject(i)?.let { parseStation(it) } ?: continue
      if (seen.add(station.uuid)) stations.add(station)
    }
    return stations
  }

  /** Accepts both the directory's field names and the ones the app saves with. */
  private fun parseStation(json: JSONObject): CarStation? {
    val uuid = json.optString("stationuuid", "")
    val name = json.optString("name", "").trim()
    val url = json.optString("url", "")
    if (uuid.isEmpty() || name.isEmpty() || url.isEmpty()) return null

    val resolved = json.optString("url_resolved", "").ifEmpty { json.optString("urlResolved", "") }
    val place = listOf(json.optString("state", ""), json.optString("country", ""))
      .filter { it.isNotBlank() }
      .joinToString(", ")

    return CarStation(
      uuid = uuid,
      name = name,
      url = url,
      urlResolved = resolved.ifEmpty { null },
      place = place.ifEmpty { null },
      raw = json,
    )
  }

  private fun encode(value: String): String = URLEncoder.encode(value, "UTF-8")
}
