-- A lens mount becomes a row instead of a typed string.
--
-- `Camera.mountType` was free text. Two of nineteen cameras had one and the two
-- disagreed in style, "Canon FD" against "M42 screw", so nothing could group by
-- mount and no form could offer a picker because nothing knew the set.
--
-- `mountType` is left in place and still written by nothing new. Readers move
-- to `mountId` first; the column goes in a later migration once none are left.

-- AlterTable
ALTER TABLE "Camera" ADD COLUMN     "mountId" TEXT;

-- CreateTable
CREATE TABLE "LensMount" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "aliases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "fixed" BOOLEAN NOT NULL DEFAULT false,
    "referenceUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LensMount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LensMount_slug_key" ON "LensMount"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "LensMount_name_key" ON "LensMount"("name");

-- AddForeignKey
ALTER TABLE "Camera" ADD CONSTRAINT "Camera_mountId_fkey" FOREIGN KEY ("mountId") REFERENCES "LensMount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- The starting vocabulary.
--
-- Readable ids, as the Brand seed used, so this can be checked by eye. The list
-- is the mounts a 35mm catalog meets first plus the medium format ones already
-- reachable from entries here; it is not meant to be exhaustive, because the
-- table exists precisely so the next one can be added without a migration.
--
-- Aliases carry the other spellings, so resolving "FD" or "M42 screw" finds the
-- row rather than creating a second one beside it.
INSERT INTO "LensMount" ("id", "slug", "name", "aliases", "fixed") VALUES
  ('mount_fixed',        'fixed-lens',      'Fixed lens',       ARRAY['fixed', 'non-interchangeable'], true),
  ('mount_canon_fd',     'canon-fd',        'Canon FD',         ARRAY['FD', 'Canon FD mount'],         false),
  ('mount_canon_fl',     'canon-fl',        'Canon FL',         ARRAY['FL'],                            false),
  ('mount_canon_ef',     'canon-ef',        'Canon EF',         ARRAY['EF'],                            false),
  ('mount_nikon_f',      'nikon-f',         'Nikon F',          ARRAY['F mount', 'Nikkor F'],           false),
  ('mount_pentax_k',     'pentax-k',        'Pentax K',         ARRAY['K mount'],                       false),
  ('mount_m42',          'm42',             'M42',              ARRAY['M42 screw', 'Universal screw', 'Praktica'], false),
  ('mount_leica_m',      'leica-m',         'Leica M',          ARRAY['M mount'],                       false),
  ('mount_leica_screw',  'leica-screw',     'Leica screw',      ARRAY['LTM', 'M39', 'L39'],             false),
  ('mount_minolta_sr',   'minolta-sr',      'Minolta SR',       ARRAY['MC', 'MD', 'SR mount'],          false),
  ('mount_olympus_om',   'olympus-om',      'Olympus OM',       ARRAY['OM mount'],                      false),
  ('mount_contax_y',     'contax-yashica',  'Contax/Yashica',   ARRAY['C/Y', 'Yashica ML'],             false),
  ('mount_konica_ar',    'konica-ar',       'Konica AR',        ARRAY['AR mount'],                      false),
  ('mount_fujica_x',     'fujica-x',        'Fujica X',         ARRAY['X-mount bayonet', 'Fujica AX'],  false),
  ('mount_hasselblad_x', 'hasselblad-xpan', 'Hasselblad XPan',  ARRAY['TX', 'Fujinon XPan'],            false),
  ('mount_hasselblad_v', 'hasselblad-v',    'Hasselblad V',     ARRAY['V system'],                      false),
  ('mount_mamiya_645',   'mamiya-645',      'Mamiya 645',       ARRAY[]::TEXT[],                        false),
  ('mount_pentax_67',    'pentax-67',       'Pentax 67',        ARRAY['6x7'],                           false),
  ('mount_t',            't-mount',         'T-mount',          ARRAY['T2'],                            false);

-- Move what was recorded as text onto the relation.
--
-- Matched case-insensitively against the name and the aliases, which is what
-- makes "M42 screw" land on the M42 row rather than being lost.
UPDATE "Camera" c
SET "mountId" = m."id"
FROM "LensMount" m
WHERE c."mountId" IS NULL
  AND c."mountType" IS NOT NULL
  AND (
    lower(btrim(c."mountType")) = lower(m."name")
    OR EXISTS (
      SELECT 1 FROM unnest(m."aliases") a WHERE lower(a) = lower(btrim(c."mountType"))
    )
  );

-- Bodies whose lens does not come off, where the body type does not say so.
--
-- A compact, a disposable and an instant are fixed by definition and are
-- derived rather than stored. A rangefinder is not: the Olympus 35 SP has a
-- fixed 42mm Zuiko and no rule about rangefinders could tell you that, which is
-- why the fixed row exists at all.
UPDATE "Camera"
SET "mountId" = 'mount_fixed'
WHERE "mountId" IS NULL
  AND "bodyType" = 'RANGEFINDER'
  AND "name" ILIKE '%35 SP%';
