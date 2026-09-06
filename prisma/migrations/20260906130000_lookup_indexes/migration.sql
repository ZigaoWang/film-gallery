-- Indexes for three columns that are filtered on but were never indexed.
--
-- The two token columns are looked up by value from endpoints anyone holding a
-- link can reach, and neither had an index, so every click on a verification or
-- reset link was a sequential scan of "User" and so was every attempt at one.
-- That made an unauthenticated loop against those routes the cheapest way to
-- put load on the database.
--
-- "Notification"."actorId" has no foreign key, so nothing created an index for
-- it, and it is what deleting an account filters on to clear the notifications
-- that account caused. The table gains a row for every like, comment and
-- follow, so that delete scanned the largest table in the schema.
--
-- CREATE INDEX rather than CONCURRENTLY: Prisma runs each migration in a
-- transaction, which CONCURRENTLY cannot be used inside. These lock the table
-- only for as long as the build takes.

CREATE INDEX "User_verificationToken_idx" ON "User"("verificationToken");
CREATE INDEX "User_resetToken_idx" ON "User"("resetToken");
CREATE INDEX "Notification_actorId_idx" ON "Notification"("actorId");
