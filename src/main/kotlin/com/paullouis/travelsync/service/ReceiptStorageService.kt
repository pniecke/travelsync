package com.paullouis.travelsync.service

import org.springframework.beans.factory.annotation.Value
import org.springframework.core.io.FileSystemResource
import org.springframework.core.io.Resource
import org.springframework.stereotype.Service
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.Paths
import java.util.UUID

/**
 * Stores expense receipts on the local filesystem. Each expense owns at most
 * one receipt, stored at `{baseDir}/{expenseId}`; uploading again overwrites it.
 * Only the original filename and content type are persisted in the database
 * (on [com.paullouis.travelsync.entity.ExpenseEntity]) — this service is the
 * single owner of the bytes.
 */
@Service
class ReceiptStorageService(
    @Value("\${app.receipts.dir:./uploads/receipts}")
    private val receiptsDir: String,
) {
    private val baseDir: Path = Paths.get(receiptsDir).toAbsolutePath().normalize()

    init {
        Files.createDirectories(baseDir)
    }

    fun store(expenseId: UUID, bytes: ByteArray) {
        val target = pathFor(expenseId)
        Files.write(target, bytes)
    }

    fun load(expenseId: UUID): Resource? {
        val target = pathFor(expenseId)
        return if (Files.exists(target)) FileSystemResource(target) else null
    }

    fun delete(expenseId: UUID) {
        Files.deleteIfExists(pathFor(expenseId))
    }

    private fun pathFor(expenseId: UUID): Path {
        // Resolve against the normalized base dir; the id is a UUID so there is
        // no path-traversal surface, but normalize defensively anyway.
        val resolved = baseDir.resolve(expenseId.toString()).normalize()
        require(resolved.startsWith(baseDir)) { "Invalid receipt path" }
        return resolved
    }
}
