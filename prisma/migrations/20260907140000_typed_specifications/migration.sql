-- A camera's specifications become columns instead of sentences.
--
-- Every focal length, aperture, shutter speed and weight in this catalog lived
-- inside a paragraph. That reads well and compares badly: none of it could be
-- filtered, sorted, validated, or cited on its own, and the citation system is
-- keyed per field, so nine spec columns meant nine citable facts on a record
-- that asserts about twenty-five.
--
-- Additive only. Every column is nullable, nothing is dropped, and the prose
-- stays exactly as it is: these are filled from it, not instead of it.

-- CreateEnum
CREATE TYPE "FocusType" AS ENUM ('FIXED', 'ZONE', 'SCALE', 'RANGEFINDER', 'SLR_MANUAL', 'AUTOFOCUS');

-- CreateEnum
CREATE TYPE "MeteringPattern" AS ENUM ('NONE', 'AVERAGE', 'CENTER_WEIGHTED', 'SPOT', 'MULTI_ZONE');

-- CreateEnum
CREATE TYPE "ExposureMode" AS ENUM ('PROGRAM', 'APERTURE_PRIORITY', 'SHUTTER_PRIORITY', 'MANUAL');

-- CreateEnum
CREATE TYPE "ShutterType" AS ENUM ('LEAF', 'FOCAL_PLANE', 'ELECTRONIC');

-- CreateEnum
CREATE TYPE "FlashFitting" AS ENUM ('NONE', 'BUILT_IN', 'HOT_SHOE', 'BUILT_IN_AND_HOT_SHOE');

-- CreateEnum
CREATE TYPE "FilmBase" AS ENUM ('ACETATE', 'POLYESTER', 'PET');

-- AlterTable
ALTER TABLE "Camera" ADD COLUMN     "apertureMaxTele" DOUBLE PRECISION,
ADD COLUMN     "apertureMaxWide" DOUBLE PRECISION,
ADD COLUMN     "batteryType" TEXT,
ADD COLUMN     "closeFocusMm" INTEGER,
ADD COLUMN     "exposureModes" "ExposureMode"[] DEFAULT ARRAY[]::"ExposureMode"[],
ADD COLUMN     "filmSpeedMax" INTEGER,
ADD COLUMN     "filmSpeedMin" INTEGER,
ADD COLUMN     "flash" "FlashFitting",
ADD COLUMN     "focalMaxMm" INTEGER,
ADD COLUMN     "focalMinMm" INTEGER,
ADD COLUMN     "focusType" "FocusType",
ADD COLUMN     "lensElements" INTEGER,
ADD COLUMN     "lensGroups" INTEGER,
ADD COLUMN     "lensName" TEXT,
ADD COLUMN     "meteringPattern" "MeteringPattern",
ADD COLUMN     "shutterFastestSec" DOUBLE PRECISION,
ADD COLUMN     "shutterSlowestSec" DOUBLE PRECISION,
ADD COLUMN     "shutterType" "ShutterType",
ADD COLUMN     "weightGrams" INTEGER;

-- AlterTable
ALTER TABLE "FilmStock" ADD COLUMN     "baseMaterial" "FilmBase",
ADD COLUMN     "hasRemjet" BOOLEAN,
ADD COLUMN     "latitudeOverStops" INTEGER,
ADD COLUMN     "latitudeUnderStops" INTEGER,
ADD COLUMN     "resolvingPowerLpmm" INTEGER,
ADD COLUMN     "rmsGranularity" INTEGER;
