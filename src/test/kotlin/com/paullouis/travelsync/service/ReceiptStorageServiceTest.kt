package com.paullouis.travelsync.service

import org.junit.jupiter.api.Assertions.assertArrayEquals
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.nio.file.Files
import java.nio.file.Path
import java.util.UUID

/**
 * Unit tests for the on-disk receipt storage. Uses a JUnit @TempDir so nothing
 * leaks onto the real filesystem.
 */
class ReceiptStorageServiceTest {

    @TempDir
    lateinit var tempDir: Path

    private fun service(dir: Path = tempDir) = ReceiptStorageService(dir.toString())

    @Test
    fun `store then load returns the same bytes`() {
        val svc = service()
        val id = UUID.randomUUID()
        val bytes = "hello receipt".toByteArray()

        svc.store(id, bytes)
        val loaded = svc.load(id)

        assertNotNull(loaded)
        assertArrayEquals(bytes, loaded!!.contentAsByteArray)
    }

    @Test
    fun `store overwrites an existing receipt`() {
        val svc = service()
        val id = UUID.randomUUID()

        svc.store(id, "first".toByteArray())
        svc.store(id, "second".toByteArray())

        assertArrayEquals("second".toByteArray(), svc.load(id)!!.contentAsByteArray)
    }

    @Test
    fun `load returns null when no receipt exists`() {
        assertNull(service().load(UUID.randomUUID()))
    }

    @Test
    fun `delete removes the stored file`() {
        val svc = service()
        val id = UUID.randomUUID()
        svc.store(id, "bytes".toByteArray())
        assertNotNull(svc.load(id))

        svc.delete(id)

        assertNull(svc.load(id))
    }

    @Test
    fun `delete is a no-op when nothing is stored`() {
        // Should not throw.
        service().delete(UUID.randomUUID())
    }

    @Test
    fun `constructor creates the base directory if it is missing`() {
        val nested = tempDir.resolve("a/b/receipts")
        assertFalse(Files.exists(nested))

        val svc = ReceiptStorageService(nested.toString())
        val id = UUID.randomUUID()
        svc.store(id, "x".toByteArray())

        assertTrue(Files.exists(nested))
        assertArrayEquals("x".toByteArray(), svc.load(id)!!.contentAsByteArray)
    }

    @Test
    fun `each expense id maps to a distinct file`() {
        val svc = service()
        val a = UUID.randomUUID()
        val b = UUID.randomUUID()
        svc.store(a, "aaa".toByteArray())
        svc.store(b, "bbb".toByteArray())

        assertArrayEquals("aaa".toByteArray(), svc.load(a)!!.contentAsByteArray)
        assertArrayEquals("bbb".toByteArray(), svc.load(b)!!.contentAsByteArray)
        assertEquals(2, Files.list(tempDir).use { it.count() })
    }
}
