# Cost-base version publication and audit

Sprint 5 turns an assumption version into a governed lifecycle:

```text
DRAFT -- publish with approval note --> PUBLISHED -- archive with note --> ARCHIVED
```

## Rules

- A draft can be edited and reset.
- Publishing requires all 210 canonical parameters and a non-empty approval note.
- A published or archived version is immutable through both the UI and API.
- A new version is always a draft cloned from a known source version; the source
  link and `DRAFT_CREATED` event preserve lineage.
- Only a published version can be made active for a cost base.
- An active version cannot be archived; activate another published version first.
- Out-of-range values remain visible in Sprint 4 coverage. Publication records a
  human decision through its approval note rather than silently changing values.

## Audit data

`AssumptionVersionAudit` records draft creation, publication, archiving, actor,
status transition, note, and timestamp. It is append-only through application
routes; parameter values themselves remain in their immutable published version.

## API

- `POST /cost-bases/:id/versions/:versionId/publish` with `{ note }`
- `POST /cost-bases/:id/versions/:versionId/archive` with `{ note }`

Both require `ADMIN`. RateBooks remain a separate future artifact and may only
consume published inputs when they are introduced.
