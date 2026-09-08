-- The lens mount goes, table and columns.
--
-- It was added so the field could be a picker rather than a free string, and
-- that reasoning was sound for the field. What it never established is that the
-- field belongs on these pages at all. This is a catalogue of sample
-- photographs: somebody arrives at a camera page to see what the thing renders
-- and what it is like to carry, and the mount answers neither. It matters when
-- you are buying a lens, which is not what happens here.
--
-- Eighteen of the twenty-one bodies never had one, because a compact's lens
-- does not come off, so the chip was absent on most of the catalogue and
-- tautological where it appeared -- the XPan's mount is called "Hasselblad
-- XPan". A camera now says the four things worth saying at a glance: what kind
-- of body it is, the frame if it is not the ordinary one, the format, and the
-- year.
--
-- `mountType` goes with it. It only ever existed to be read as a fallback while
-- rows moved onto the relation, and there is nothing left to move onto.
--
-- Provenance rows are removed by field name rather than left pointing at
-- columns that no longer exist.

DELETE FROM "FieldProvenance"
 WHERE "entityType" = 'CAMERA' AND "fieldName" IN ('mountId', 'mountType');

ALTER TABLE "Camera" DROP CONSTRAINT IF EXISTS "Camera_mountId_fkey";
ALTER TABLE "Camera" DROP COLUMN IF EXISTS "mountId";
ALTER TABLE "Camera" DROP COLUMN IF EXISTS "mountType";

DROP TABLE IF EXISTS "LensMount";
