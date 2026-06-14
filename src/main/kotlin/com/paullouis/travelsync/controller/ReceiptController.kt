package com.paullouis.travelsync.controller

import com.paullouis.travelsync.model.generated.Expense
import com.paullouis.travelsync.service.IExpenseService
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.security.SecurityRequirement
import io.swagger.v3.oas.annotations.tags.Tag
import org.springframework.core.io.Resource
import org.springframework.http.HttpHeaders
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.multipart.MultipartFile
import java.util.UUID

/**
 * Receipt attachment endpoints for expenses. Kept out of the OpenAPI spec
 * (and its generated interface) on purpose: multipart upload and binary
 * download don't map cleanly onto the JSON-centric generated DTOs. The
 * receipt's existence is still advertised on the Expense DTO via
 * `receiptFilename`.
 */
@RestController
@RequestMapping("/expenses/{id}/receipt")
@Tag(name = "Expense")
class ReceiptController(
    private val expenseService: IExpenseService,
) {

    @PostMapping(consumes = [MediaType.MULTIPART_FORM_DATA_VALUE])
    @Operation(summary = "Upload (or replace) the receipt for an expense")
    @SecurityRequirement(name = "OidcAuth")
    fun uploadReceipt(
        @PathVariable id: UUID,
        @RequestParam("file") file: MultipartFile,
    ): ResponseEntity<Expense> {
        val updated = expenseService.attachReceipt(
            id = id,
            filename = file.originalFilename,
            contentType = file.contentType,
            bytes = file.bytes,
        )
        return ResponseEntity.ok(updated)
    }

    @GetMapping
    @Operation(summary = "Download the receipt attached to an expense")
    @SecurityRequirement(name = "OidcAuth")
    fun downloadReceipt(@PathVariable id: UUID): ResponseEntity<Resource> {
        val receipt = expenseService.getReceipt(id)
        return ResponseEntity.ok()
            .contentType(MediaType.parseMediaType(receipt.contentType))
            .header(
                HttpHeaders.CONTENT_DISPOSITION,
                "inline; filename=\"${receipt.filename}\"",
            )
            .body(receipt.resource)
    }

    @DeleteMapping
    @Operation(summary = "Remove the receipt attached to an expense")
    @SecurityRequirement(name = "OidcAuth")
    fun deleteReceipt(@PathVariable id: UUID): ResponseEntity<Expense> =
        ResponseEntity.ok(expenseService.removeReceipt(id))
}
