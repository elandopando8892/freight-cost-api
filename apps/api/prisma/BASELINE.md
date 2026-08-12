# Prisma migration baseline

`20260811000000_baseline` represents the schema that already existed when the
project moved from `prisma db push` to versioned migrations.

For a new empty database, run `prisma migrate deploy` normally.

For an existing Freight Cost Model database, do **not** execute the baseline SQL
against populated tables. First compare the live schema with `schema.prisma`.
When the diff is empty, record the baseline as already applied:

```powershell
npx prisma migrate resolve --applied 20260811000000_baseline
```

That production adoption step is deliberately manual and is not performed by
the Sprint 0 code changes.

## Sprint 1 parameter catalog

After the baseline is recorded on an existing database, apply normal migrations
and then populate the canonical definitions without changing carrier values:

```powershell
npx prisma migrate deploy
npm run db:sync-catalog -w freight-cost-api
```

`20260811000100_parameter_catalog` is additive: it creates global parameter
definitions and a nullable link from existing assumption parameters. The sync
command only writes definition metadata and missing links; it does not overwrite
an `AssumptionParam.value`.

`20260811000200_engine_policy` adds an explicit calculation-policy tag to saved
quotes. Existing records remain `LEGACY_UNSPECIFIED`; new application writes
select either `OPERATIONAL_V3` or `WORKBOOK_V3`.

`20260811000300_cost_bases` adds the multi-base container plus nullable lineage
on assumption versions, lanes and quotes. Existing records remain unassigned;
the migration does not guess whether a historical set was cross-border,
drayage, local, intra-MEX or intra-US.

`20260811000200_engine_policy` adds an explicit calculation-policy tag to saved
quotes. Existing records remain `LEGACY_UNSPECIFIED`; new application writes
select either `OPERATIONAL_V3` or `WORKBOOK_V3`.
## 20260811000400_version_publication_audit

Adds explicit `DRAFT`, `PUBLISHED`, and `ARCHIVED` state to assumption versions,
source-version lineage, publisher metadata, and append-only audit events. Existing
versions start as `DRAFT` so their publication is an explicit human decision.
