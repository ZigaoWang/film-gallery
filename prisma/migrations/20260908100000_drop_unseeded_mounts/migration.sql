-- The seeded mount vocabulary, reduced to the mounts something actually uses.
--
-- 20260907120000 seeded nineteen mounts so the field could be a picker rather
-- than a free string, which is still the right shape for it: two people
-- cataloguing an M42 body have to produce the same value. What was wrong was
-- the size of the guess. This catalogue is twenty-one bodies, eighteen of them
-- compacts and disposables whose lens does not come off, so fifteen of the
-- nineteen rows sat there answering a question nobody had asked yet, and the
-- admin list read as junk.
--
-- Safe to do now because adding one back is a form: /admin/mounts creates a
-- mount, so the vocabulary can grow when a body needs it instead of being
-- guessed at in advance. Before that existed, deleting these would have meant
-- the next SLR had no mount to pick and no way to add one.
--
-- Guarded on the join rather than trusting this list: an environment where one
-- of these is in use keeps it. Cameras are not touched, so nothing can be left
-- pointing at a row that has gone.

DELETE FROM "LensMount"
 WHERE "slug" IN (
   'canon-ef', 'canon-fl', 'contax-yashica', 'fujica-x', 'hasselblad-v',
   'konica-ar', 'leica-m', 'leica-screw', 'mamiya-645', 'minolta-sr',
   'nikon-f', 'olympus-om', 'pentax-67', 'pentax-k', 't-mount'
 )
   AND NOT EXISTS (
     SELECT 1 FROM "Camera" WHERE "Camera"."mountId" = "LensMount"."id"
   );
