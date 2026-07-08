package com.eos.smartworking.data

import com.google.gson.Gson
import com.google.gson.JsonArray
import com.google.gson.JsonObject
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.util.concurrent.TimeUnit

/**
 * Client HTTP per l'API Turso Pipeline.
 * Equivalente a executeSql() in tursoAuth.ts
 */
class TursoApi(
    private val url: String,
    private val token: String
) {
    private val client = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .build()

    private val gson = Gson()
    private val jsonMediaType = "application/json; charset=utf-8".toMediaType()

    data class TursoArg(val type: String, val value: String)

    suspend fun execute(sql: String, args: List<Any> = emptyList()): List<Map<String, Any?>> =
        withContext(Dispatchers.IO) {
            val tursoArgs = args.map { arg ->
                when (arg) {
                    is Number -> TursoArg("integer", arg.toString())
                    else -> TursoArg("text", arg.toString())
                }
            }

            val body = JsonObject().apply {
                add("requests", JsonArray().apply {
                    add(JsonObject().apply {
                        addProperty("type", "execute")
                        add("stmt", JsonObject().apply {
                            addProperty("sql", sql)
                            add("args", gson.toJsonTree(tursoArgs))
                        })
                    })
                })
            }

            val request = Request.Builder()
                .url("$url/v2/pipeline")
                .header("Authorization", "Bearer $token")
                .header("Content-Type", "application/json")
                .post(body.toString().toRequestBody(jsonMediaType))
                .build()

            val response = client.newCall(request).execute()
            val responseBody = response.body?.string() ?: throw Exception("Empty response")

            if (!response.isSuccessful) {
                throw Exception("Turso HTTP ${response.code}: $responseBody")
            }

            val data = gson.fromJson(responseBody, JsonObject::class.java)
            val results = data.getAsJsonArray("results")
            val firstResult = results?.get(0)?.asJsonObject ?: return@withContext emptyList()

            if (firstResult.has("error")) {
                val error = firstResult.getAsJsonObject("error")
                throw Exception("Turso SQL error: ${error.get("message")?.asString}")
            }

            val result = firstResult.getAsJsonObject("response")?.getAsJsonObject("result") ?: return@withContext emptyList()
            val cols = result.getAsJsonArray("cols") ?: return@withContext emptyList()
            val rows = result.getAsJsonArray("rows") ?: return@withContext emptyList()

            rows.map { rowElement ->
                val row = rowElement.asJsonArray
                val map = mutableMapOf<String, Any?>()
                cols.forEachIndexed { i, col ->
                    val colName = col.asJsonObject.get("name").asString
                    val cell = if (i < row.size()) row[i] else null
                    map[colName] = if (cell != null && cell.isJsonObject) {
                        cell.asJsonObject.get("value")?.asString
                    } else {
                        cell?.asString
                    }
                }
                map
            }
        }
}
