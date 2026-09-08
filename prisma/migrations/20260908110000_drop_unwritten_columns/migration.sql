-- Two columns no code has ever read or written.
--
-- `Collection.coverImage` was going to let an album nominate one of its
-- photographs as the cover. Nothing ever wrote it, and the album cards build a
-- four-up mosaic from the album's first photos instead, so there is no value
-- in any row to preserve and nothing to migrate. If a chosen cover is wanted
-- later it is a column and a picker, added then, against a real design.
--
-- `ModerationSubmission.reviewNotes` was for an admin to record why a
-- submission was refused. The review UI never offered the field. What it does
-- record -- reviewedBy and reviewedAt -- stays.
--
-- Both are nullable TEXT with no index and no constraint, so dropping them
-- cannot fail on data and cannot be depended on by anything.

ALTER TABLE "Collection" DROP COLUMN IF EXISTS "coverImage";
ALTER TABLE "ModerationSubmission" DROP COLUMN IF EXISTS "reviewNotes";
