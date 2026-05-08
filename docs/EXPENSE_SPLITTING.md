# Expense Splitting & Settlement — Backend Implementation Guide

This document describes the backend work required to support the splitting and
settlement frontend that was just added to the React app. The frontend already
calls these endpoints; this guide is the contract you implement against.

## 1. Concepts

A **trip** has multiple **expenses**. Each expense has a `paidBy` (one
participant who fronted the money) and a set of **shares** — one per
participant who is responsible for a portion of the cost. Shares always sum to
the expense's `amount`.

A **settlement** is an out-of-band payment between two participants that
discharges debt (e.g. "Bob handed Alice 50 CHF in cash"). Settlements do not
modify expenses; they appear as their own data and are folded into the balance
math.

**Per-currency math.** A trip can have expenses in multiple currencies. We do
not convert. Balances and settlements are computed *per currency* — the API
returns one balance entry per `(user, currency)` pair.

## 2. Data Model

### `ExpenseShareEntity`

```kotlin
package com.paullouis.travelsync.entity

import jakarta.persistence.*
import org.hibernate.annotations.CreationTimestamp
import org.hibernate.annotations.UpdateTimestamp
import java.time.LocalDateTime
import java.util.*

enum class ExpenseShareType { EQUAL, EXACT, PERCENT }

@Entity
@Table(
    name = "expense_share",
    uniqueConstraints = [UniqueConstraint(columnNames = ["expense_id", "user_id"])]
)
data class ExpenseShareEntity(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "UUID", nullable = false, updatable = false)
    val id: UUID? = null,

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "expense_id", nullable = false)
    val expense: ExpenseEntity,

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    val user: UserEntity,

    @Column(nullable = false)
    val amount: Double,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    val shareType: ExpenseShareType,

    val shareValue: Double? = null,

    @Column(updatable = false)
    @CreationTimestamp
    val createdAt: LocalDateTime? = null,
    @Column(nullable = true)
    @UpdateTimestamp
    val updatedAt: LocalDateTime? = null,
)
```

Update `ExpenseEntity` to own its shares:

```kotlin
@OneToMany(mappedBy = "expense", cascade = [CascadeType.ALL], orphanRemoval = true)
val shares: MutableList<ExpenseShareEntity> = mutableListOf(),
```

### `SettlementEntity`

```kotlin
@Entity
@Table(name = "settlement")
data class SettlementEntity(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "UUID", nullable = false, updatable = false)
    val id: UUID? = null,

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "trip_id", nullable = false)
    val trip: TripEntity,

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "from_user_id", nullable = false)
    val fromUser: UserEntity,

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "to_user_id", nullable = false)
    val toUser: UserEntity,

    @Column(nullable = false)
    val amount: Double,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    val currency: Currency,

    val note: String? = null,

    @Column(nullable = false)
    val settledAt: LocalDateTime,

    @Column(updatable = false)
    @CreationTimestamp
    val createdAt: LocalDateTime? = null,
)
```

### Schema notes

- Hibernate `ddl-auto=update` (or whatever you use) will create both tables.
- If you run migrations explicitly, the SQL is straightforward — UUID PKs, FK
  constraints to `expense`, `user_entity`, `trip`. Add a unique constraint on
  `(expense_id, user_id)` so you cannot accidentally double-share.

## 3. Repositories

```kotlin
interface ExpenseShareRepository : JpaRepository<ExpenseShareEntity, UUID> {
    fun findAllByExpense(expense: ExpenseEntity): List<ExpenseShareEntity>
    fun deleteAllByExpense(expense: ExpenseEntity)
}

interface SettlementRepository : JpaRepository<SettlementEntity, UUID> {
    fun findAllByTrip(trip: TripEntity): List<SettlementEntity>
}
```

You'll also want a way to fetch all expenses for a trip with their shares
eagerly:

```kotlin
interface ExpenseRepository : JpaRepository<ExpenseEntity, UUID> {
    @Query("""
        select distinct e from ExpenseEntity e
        left join fetch e.shares
        where e.trip = :trip
    """)
    fun findAllByTripWithShares(trip: TripEntity): List<ExpenseEntity>
}
```

## 4. Authorization

Two rules — apply in the service layer:

1. The current user must be a participant of the trip to view balances,
   settlements, or any expense's shares.
2. To create/edit shares on an expense, the user must be a participant of the
   trip the expense belongs to. (You may want to restrict to
   `expense.createdBy` only — your call.)
3. To create a settlement, the current user must be a participant of the trip,
   and must be either `fromUser` or `toUser` of the settlement (otherwise
   anyone could log debt resolutions for others).

Reuse `ForbiddenException` and `NotFoundException` already in
`service/exception/`.

## 5. Validation Rules

When creating or updating shares for an expense:

- The set of `userId`s must all be trip participants.
- No duplicate users in the share list.
- For `EQUAL` shares: every share's `amount` must equal `expense.amount /
  shareCount`, with a rounding remainder ≤ 0.01 absorbed by the first share.
  In practice the frontend already computes this — re-derive on the server and
  trust nothing.
- For `EXACT` shares: `sum(amount) == expense.amount` within ±0.01.
- For `PERCENT` shares: `shareValue` is required, `sum(shareValue) == 100`
  within ±0.01, and `amount` should be `expense.amount * shareValue / 100`
  rounded to 2 decimals.
- Reject the request with a 400 if any rule fails. Use the existing
  `ValidationExceptionHandler` style.

If shares are omitted on expense creation, default to `EQUAL` across all trip
participants.

## 6. Service layer sketch

### `ExpenseShareService`

```kotlin
@Service
class ExpenseShareService(
    private val expenseRepo: ExpenseRepository,
    private val shareRepo: ExpenseShareRepository,
    private val userRepo: UserRepository,
    private val userService: UserService,
) {
    @Transactional
    fun replaceShares(expenseId: UUID, requested: List<ExpenseShareDto>): List<ExpenseShareEntity> {
        val expense = expenseRepo.findById(expenseId).orElseThrow { NotFoundException("Expense $expenseId not found") }
        requireParticipant(expense.trip)

        validate(expense, requested)

        shareRepo.deleteAllByExpense(expense)
        val users = userRepo.findAllById(requested.map { it.userId }).associateBy { it.id }
        val newShares = requested.map { req ->
            ExpenseShareEntity(
                expense = expense,
                user = users[req.userId] ?: throw NotFoundException("User ${req.userId} not found"),
                amount = req.amount,
                shareType = req.shareType,
                shareValue = req.shareValue,
            )
        }
        return shareRepo.saveAll(newShares)
    }

    private fun validate(expense: ExpenseEntity, requested: List<ExpenseShareDto>) {
        require(requested.isNotEmpty()) { "Must have at least one share" }
        val participantIds = expense.trip.participants.mapNotNull { it.id }.toSet()
        require(requested.all { it.userId in participantIds }) { "All share users must be trip participants" }
        require(requested.map { it.userId }.toSet().size == requested.size) { "Duplicate user in shares" }

        val total = requested.sumOf { it.amount }
        require(kotlin.math.abs(total - expense.amount) <= 0.01) {
            "Shares (${"%.2f".format(total)}) must sum to expense amount (${"%.2f".format(expense.amount)})"
        }

        val type = requested.first().shareType
        require(requested.all { it.shareType == type }) { "Mixed share types not supported" }
        if (type == ExpenseShareType.PERCENT) {
            val pctSum = requested.sumOf { it.shareValue ?: 0.0 }
            require(kotlin.math.abs(pctSum - 100.0) <= 0.01) { "Percent shares must sum to 100" }
        }
    }
}
```

### `SettlementService`

```kotlin
@Service
class SettlementService(
    private val tripRepo: TripRepository,
    private val userRepo: UserRepository,
    private val settlementRepo: SettlementRepository,
    private val userService: UserService,
) {
    @Transactional
    fun create(tripId: UUID, req: CreateSettlementRequest): SettlementEntity {
        val trip = tripRepo.findById(tripId).orElseThrow { NotFoundException("Trip $tripId not found") }
        requireParticipant(trip)

        require(req.fromUserId != req.toUserId) { "From and To must differ" }
        require(req.amount > 0) { "Amount must be positive" }

        val from = userRepo.findById(req.fromUserId).orElseThrow { NotFoundException("User ${req.fromUserId}") }
        val to = userRepo.findById(req.toUserId).orElseThrow { NotFoundException("User ${req.toUserId}") }
        val participantIds = trip.participants.mapNotNull { it.id }.toSet()
        require(from.id in participantIds && to.id in participantIds) { "Users must be participants" }

        val current = userService.getOrCreateUser()
        require(current.id == from.id || current.id == to.id) {
            throw ForbiddenException("You may only record settlements involving yourself")
        }

        return settlementRepo.save(
            SettlementEntity(
                trip = trip,
                fromUser = from,
                toUser = to,
                amount = req.amount,
                currency = req.currency,
                note = req.note,
                settledAt = req.settledAt ?: LocalDateTime.now(),
            )
        )
    }

    fun list(tripId: UUID): List<SettlementEntity> {
        val trip = tripRepo.findById(tripId).orElseThrow { NotFoundException("Trip $tripId not found") }
        requireParticipant(trip)
        return settlementRepo.findAllByTrip(trip)
    }
}
```

### `BalanceService` — the core algorithm

```kotlin
@Service
class BalanceService(
    private val expenseRepo: ExpenseRepository,
    private val settlementRepo: SettlementRepository,
    private val tripRepo: TripRepository,
) {
    fun balancesFor(tripId: UUID): TripBalancesDto {
        val trip = tripRepo.findById(tripId).orElseThrow { NotFoundException("Trip $tripId not found") }
        requireParticipant(trip)

        // Map<(userId, currency), Double>  — positive = is owed, negative = owes
        val net = mutableMapOf<Pair<UUID, Currency>, Double>()

        expenseRepo.findAllByTripWithShares(trip).forEach { e ->
            val payer = e.paidBy ?: return@forEach
            val key = (payer.id!! to e.currency)
            net.merge(key, e.amount) { a, b -> a + b }

            e.shares.forEach { share ->
                val sk = share.user.id!! to e.currency
                net.merge(sk, -share.amount) { a, b -> a + b }
            }
        }

        settlementRepo.findAllByTrip(trip).forEach { s ->
            val fromKey = s.fromUser.id!! to s.currency
            val toKey = s.toUser.id!! to s.currency
            // From-user paid to To-user → From's debt decreases (balance up), To's credit decreases (balance down)
            net.merge(fromKey, s.amount) { a, b -> a + b }
            net.merge(toKey, -s.amount) { a, b -> a + b }
        }

        // Round to cents to suppress float fuzz
        net.replaceAll { _, v -> Math.round(v * 100) / 100.0 }

        val balanceList = net.map { (key, amount) ->
            UserBalanceDto(userId = key.first, currency = key.second, net = amount)
        }

        val suggestions = simplify(net, trip)
        return TripBalancesDto(tripId = tripId, balances = balanceList, suggestedSettlements = suggestions)
    }

    /**
     * Greedy debt simplification — per currency, repeatedly match the largest
     * creditor with the largest debtor. Produces ≤ N-1 suggestions per currency.
     */
    private fun simplify(net: Map<Pair<UUID, Currency>, Double>, trip: TripEntity): List<SuggestedSettlementDto> {
        val byCurrency = net.entries.groupBy({ it.key.second }, { it.key.first to it.value })
        val out = mutableListOf<SuggestedSettlementDto>()

        byCurrency.forEach { (currency, entries) ->
            val creditors = entries.filter { it.second > 0.01 }.toMutableList().apply { sortByDescending { it.second } }
            val debtors = entries.filter { it.second < -0.01 }.toMutableList().apply { sortBy { it.second } }

            var ci = 0; var di = 0
            while (ci < creditors.size && di < debtors.size) {
                val (cId, cAmt) = creditors[ci]
                val (dId, dAmt) = debtors[di]
                val pay = kotlin.math.min(cAmt, -dAmt)
                out += SuggestedSettlementDto(fromUserId = dId, toUserId = cId, currency = currency, amount = Math.round(pay * 100) / 100.0)
                creditors[ci] = cId to (cAmt - pay)
                debtors[di] = dId to (dAmt + pay)
                if (creditors[ci].second < 0.01) ci++
                if (debtors[di].second > -0.01) di++
            }
        }
        return out
    }
}
```

## 7. REST endpoints

All endpoints require `OidcAuth`. Add them to `travelsync-api.yaml` so the
generator produces `*Api` interfaces; controllers implement them as elsewhere.

### Existing endpoints to extend

#### `POST /expenses`

The frontend now sends an optional `shares` array on each expense. If
`shares` is absent or empty, default to equal split across all trip
participants. If present, validate per §5 and persist.

Request body — array, each item:
```json
{
  "description": "Hotel",
  "amount": 200.00,
  "currency": "EUR",
  "tripId": "...",
  "createdBy": { "id": "..." },
  "paidBy": { "id": "..." },
  "dateOfExpense": "2026-05-10T12:00:00",
  "shares": [
    { "user": { "id": "..." }, "amount": 100.00, "shareType": "EQUAL" },
    { "user": { "id": "..." }, "amount": 100.00, "shareType": "EQUAL" }
  ]
}
```

Response: the saved expense including `shares` (with assigned `id`s).

#### `GET /expenses`

- Add an optional query param `tripId` (UUID) for filtering.
- Always include `shares` in the response payload.

### New endpoints

#### `GET /expenses/{id}/shares`
Returns the `ExpenseShare[]` for an expense.

#### `PUT /expenses/{id}/shares`
Replaces all shares for an expense. Body: `ExpenseShare[]`. Validation per §5.
Returns the new `ExpenseShare[]`.

#### `DELETE /expenses/{id}`
(Optional but the frontend `expenseService` includes it.) Cascades shares.

#### `GET /trips/{id}/balances`
Returns:
```json
{
  "tripId": "...",
  "balances": [
    { "user": { "id": "...", "username": "..." }, "currency": "EUR", "net": -42.50 }
  ],
  "suggestedSettlements": [
    { "fromUser": { ... }, "toUser": { ... }, "currency": "EUR", "amount": 42.50 }
  ]
}
```

`net` convention: positive = is owed money, negative = owes money.

#### `GET /trips/{id}/settlements`
Returns `Settlement[]`.

#### `POST /trips/{id}/settlements`
Body:
```json
{
  "fromUserId": "...",
  "toUserId": "...",
  "amount": 42.50,
  "currency": "EUR",
  "note": "Cash",
  "settledAt": "2026-05-10T18:00:00"
}
```
Returns the saved `Settlement`. `settledAt` defaults to "now" if absent.

#### `DELETE /trips/{id}/settlements/{settlementId}`
204 on success. Authorization: only `fromUser`, `toUser`, or trip creator may
delete.

## 8. OpenAPI YAML snippets

Drop these into `src/main/resources/travelsync-api.yaml` in the right places.

### Schemas

```yaml
ExpenseShareType:
  type: string
  enum: [ EQUAL, EXACT, PERCENT ]

ExpenseShare:
  type: object
  required: [ user, amount, shareType ]
  properties:
    id:
      type: string
      format: uuid
    user:
      $ref: '#/components/schemas/User'
    amount:
      type: number
      format: double
      minimum: 0
    shareType:
      $ref: '#/components/schemas/ExpenseShareType'
    shareValue:
      type: number
      format: double
      description: Percent value when shareType=PERCENT; null otherwise.

Settlement:
  type: object
  required: [ tripId, fromUser, toUser, amount, currency, settledAt ]
  properties:
    id:
      type: string
      format: uuid
    tripId:
      type: string
      format: uuid
    fromUser:
      $ref: '#/components/schemas/User'
    toUser:
      $ref: '#/components/schemas/User'
    amount:
      type: number
      format: double
      minimum: 0
    currency:
      $ref: '#/components/schemas/Currency'
    note:
      type: string
      maxLength: 500
    settledAt:
      type: string
      format: local-date-time
    createdAt:
      type: string
      format: local-date-time

CreateSettlementRequest:
  type: object
  required: [ fromUserId, toUserId, amount, currency ]
  properties:
    fromUserId:
      type: string
      format: uuid
    toUserId:
      type: string
      format: uuid
    amount:
      type: number
      format: double
      minimum: 0
    currency:
      $ref: '#/components/schemas/Currency'
    note:
      type: string
      maxLength: 500
    settledAt:
      type: string
      format: local-date-time

UserBalance:
  type: object
  required: [ user, currency, net ]
  properties:
    user:
      $ref: '#/components/schemas/User'
    currency:
      $ref: '#/components/schemas/Currency'
    net:
      type: number
      format: double

SuggestedSettlement:
  type: object
  required: [ fromUser, toUser, currency, amount ]
  properties:
    fromUser:
      $ref: '#/components/schemas/User'
    toUser:
      $ref: '#/components/schemas/User'
    currency:
      $ref: '#/components/schemas/Currency'
    amount:
      type: number
      format: double

TripBalances:
  type: object
  required: [ tripId, balances, suggestedSettlements ]
  properties:
    tripId:
      type: string
      format: uuid
    balances:
      type: array
      items:
        $ref: '#/components/schemas/UserBalance'
    suggestedSettlements:
      type: array
      items:
        $ref: '#/components/schemas/SuggestedSettlement'
```

Update the existing `Expense` schema — add `shares`:

```yaml
shares:
  type: array
  description: Per-participant breakdown of how this expense is split.
  items:
    $ref: '#/components/schemas/ExpenseShare'
```

### Paths

```yaml
/expenses/{id}:
  delete:
    tags: [ Expense ]
    operationId: deleteExpense
    security: [ { OidcAuth: [] } ]
    parameters:
      - name: id
        in: path
        required: true
        schema: { type: string, format: uuid }
    responses:
      '204': { description: Deleted }

/expenses/{id}/shares:
  get:
    tags: [ Expense ]
    operationId: getExpenseShares
    security: [ { OidcAuth: [] } ]
    parameters:
      - name: id
        in: path
        required: true
        schema: { type: string, format: uuid }
    responses:
      '200':
        description: Shares for this expense
        content:
          application/json:
            schema:
              type: array
              items: { $ref: '#/components/schemas/ExpenseShare' }
  put:
    tags: [ Expense ]
    operationId: updateExpenseShares
    security: [ { OidcAuth: [] } ]
    parameters:
      - name: id
        in: path
        required: true
        schema: { type: string, format: uuid }
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: array
            items: { $ref: '#/components/schemas/ExpenseShare' }
    responses:
      '200':
        description: Updated shares
        content:
          application/json:
            schema:
              type: array
              items: { $ref: '#/components/schemas/ExpenseShare' }

/trips/{id}/balances:
  get:
    tags: [ Trip ]
    operationId: getTripBalances
    security: [ { OidcAuth: [] } ]
    parameters:
      - name: id
        in: path
        required: true
        schema: { type: string, format: uuid }
    responses:
      '200':
        description: Net balances and suggested settlements
        content:
          application/json:
            schema: { $ref: '#/components/schemas/TripBalances' }

/trips/{id}/settlements:
  get:
    tags: [ Trip ]
    operationId: getTripSettlements
    security: [ { OidcAuth: [] } ]
    parameters:
      - name: id
        in: path
        required: true
        schema: { type: string, format: uuid }
    responses:
      '200':
        description: All settlements for this trip
        content:
          application/json:
            schema:
              type: array
              items: { $ref: '#/components/schemas/Settlement' }
  post:
    tags: [ Trip ]
    operationId: createSettlement
    security: [ { OidcAuth: [] } ]
    parameters:
      - name: id
        in: path
        required: true
        schema: { type: string, format: uuid }
    requestBody:
      required: true
      content:
        application/json:
          schema: { $ref: '#/components/schemas/CreateSettlementRequest' }
    responses:
      '201':
        description: Settlement created
        content:
          application/json:
            schema: { $ref: '#/components/schemas/Settlement' }

/trips/{id}/settlements/{settlementId}:
  delete:
    tags: [ Trip ]
    operationId: deleteSettlement
    security: [ { OidcAuth: [] } ]
    parameters:
      - name: id
        in: path
        required: true
        schema: { type: string, format: uuid }
      - name: settlementId
        in: path
        required: true
        schema: { type: string, format: uuid }
    responses:
      '204': { description: Deleted }
```

Remember to add the `tripId` query parameter to `GET /expenses`.

## 9. Mappers

You'll need a small `ExpenseShareMapper` and `SettlementMapper` (MapStruct, to
match the project's style). They mirror `ExpenseMapper` — DTO ↔ entity, with
the user/expense/trip/currency wiring filled in by the service layer before
save.

## 10. Edge cases & gotchas

- **Float drift.** Round all amounts to 2 decimals on write and compare with
  `abs(diff) <= 0.01`. Don't store percentages as the source of truth — derive
  amounts and store both.
- **Removing a participant from a trip** while shares reference them — block
  the removal, or reassign their shares to remaining participants. Easiest:
  block, with a 409.
- **Editing an expense's amount after shares exist** — invalidate the shares.
  Either delete and require re-split, or proportionally rescale (your call,
  but document the behavior).
- **Self-share.** A `paidBy` user typically has a share too — they paid for
  the whole thing including their own portion. Don't special-case this; the
  math handles it (their net = paid − own_share).
- **Single-payer case.** If only one person pays and there are no shares,
  default to "equal split among all participants" so balances aren't a no-op.
- **Cross-currency settlements.** If someone pays back in a different currency
  than the debt, reject for now (400) and document it. Forex is out of scope.
- **Deleting an expense** must cascade-delete its shares (`orphanRemoval =
  true` on the relationship).

## 11. Testing checklist

- Two participants, one expense `100 EUR` paid by A, equal split → A net `+50
  EUR`, B net `-50 EUR`, suggestion: B → A 50.
- Three participants, two expenses in different currencies → two independent
  suggestion sets.
- One settlement of `50 EUR` from B → A clears the above to zero balances.
- EXACT split where shares don't sum to amount → 400.
- PERCENT split where percents don't sum to 100 → 400.
- Non-participant tries to read balances → 403.
- Non-participant tries to record a settlement they're not part of → 403.
- Delete an expense with shares → shares gone.
- Greedy simplifier with 4 participants and a chain of debts produces ≤ 3
  suggestions per currency.

## 12. Frontend contract reference

The frontend service code that calls these endpoints is in:

- `src/main/webapp/src/services/splitService.tsx` — balances, settlements, shares
- `src/main/webapp/src/services/expenseService.tsx` — `tripId` filter, `shares` on create
- `src/main/webapp/src/types/models/ExpenseShare.ts`, `Settlement.ts`,
  `TripBalance.ts` — TS types matching the schemas above

Once your backend serves these endpoints, regenerate the OpenAPI TS client and
the hand-written types in those three files can be deleted (the generator
will produce equivalents).
