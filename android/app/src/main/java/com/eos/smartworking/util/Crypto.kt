package com.eos.smartworking.util

import java.security.SecureRandom
import javax.crypto.SecretKeyFactory
import javax.crypto.spec.PBEKeySpec

/** Utility crittografiche — PBKDF2 hashing (equivalente a Web Crypto API) */
object Crypto {

    private const val ITERATIONS = 600_000
    private const val KEY_LENGTH = 256
    private const val ALGORITHM = "PBKDF2WithHmacSHA256"

    fun generateSalt(): String {
        val bytes = ByteArray(16)
        SecureRandom().nextBytes(bytes)
        return bytes.joinToString("") { "%02x".format(it) }
    }

    fun generateUserId(): String {
        val bytes = ByteArray(8)
        SecureRandom().nextBytes(bytes)
        return "usr_" + bytes.joinToString("") { Integer.toString(it.toInt() and 0xFF, 36) }
            .replace("0", "")
    }

    fun generateResetToken(): String {
        val bytes = ByteArray(16)
        SecureRandom().nextBytes(bytes)
        return bytes.joinToString("") { "%02x".format(it) }
    }

    fun hashPassword(password: String, salt: String): String {
        val spec = PBEKeySpec(password.toCharArray(), salt.toByteArray(), ITERATIONS, KEY_LENGTH)
        val factory = SecretKeyFactory.getInstance(ALGORITHM)
        val hash = factory.generateSecret(spec).encoded
        return hash.joinToString("") { "%02x".format(it) }
    }
}
