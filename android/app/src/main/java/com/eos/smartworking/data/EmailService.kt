package com.eos.smartworking.data

import com.google.gson.JsonObject
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.util.concurrent.TimeUnit

/**
 * Servizio email via Cloudflare Worker (Brevo).
 * Equivalente a emailService.ts
 */
object EmailService {

    private const val WORKER_URL = "https://resend-proxy.chuucommie.workers.dev"
    private const val FROM_EMAIL = "salazar.ricardo0509@gmail.com"

    private val client = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .build()

    private val jsonMediaType = "application/json; charset=utf-8".toMediaType()

    suspend fun sendPasswordResetEmail(toEmail: String, resetToken: String): Boolean = withContext(Dispatchers.IO) {
        try {
            val body = JsonObject().apply {
                addProperty("to", toEmail)
                addProperty("from", FROM_EMAIL)
                addProperty("subject", "EOS Smart Working - Reset Password")
                addProperty("html", """
                    <h2>Reset Password - EOS Smart Working</h2>
                    <p>Hai richiesto il reset della password.</p>
                    <p>Il tuo token di reset è: <strong>$resetToken</strong></p>
                    <p>Oppure usa questo link: <a href="https://chuucommie.github.io/SmartWorkingDays/?reset=$resetToken&email=$toEmail">Reimposta password</a></p>
                    <p>Il token scade tra 1 ora.</p>
                """.trimIndent())
            }

            val request = Request.Builder()
                .url("$WORKER_URL/send")
                .header("Content-Type", "application/json")
                .post(body.toString().toRequestBody(jsonMediaType))
                .build()

            val response = client.newCall(request).execute()
            response.isSuccessful
        } catch (_: Exception) {
            false
        }
    }
}
