-- Ties a notification to the photo it is about.
--
-- "Notification"."photoId" was a bare string with no foreign key, so deleting a
-- photo left every like and comment notification about it in place, pointing at
-- a page that answers 404. Nothing cleaned them up: the account-deletion path
-- clears notifications by actor, and the maintenance sweep only knows about
-- users, so these accumulated for the life of the table and the only way to
-- find one was to click it.
--
-- Existing orphans are removed first, because the constraint cannot be added
-- while rows violate it. They are unreachable by definition: the photo they
-- name is already gone.
--
-- Cascade rather than SetNull. A like notification with no photo is not a
-- notification about anything, and the row carries no other subject.

DELETE FROM "Notification" n
WHERE n."photoId" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "Photo" p WHERE p.id = n."photoId");

ALTER TABLE "Notification"
  ADD CONSTRAINT "Notification_photoId_fkey"
  FOREIGN KEY ("photoId") REFERENCES "Photo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
