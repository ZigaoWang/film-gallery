# Catalog copy, staged for a pass

This directory is empty in the repository on purpose. The `*.json` files that
belong here are ignored.

Everything in them is content: a summary, a description, a frame count, a year.
Every one of those is an editable database field. Commit the copy and there are
two answers to the same question, and the moment somebody corrects a
description through `/admin` the file in the history is quietly wrong. Then the
next person reads it, believes it, and reloads it over the correction.

So the split is:

- **Code is tracked.** `revoice-pass.ts`, `rewrite-pass.ts`, `load-research.ts`,
  the backfills. They take a path and do a job, and they carry no catalog values
  of their own.
- **Content is not.** Write the batch, run the pass, keep the file locally. The
  database is the record of what the catalog says, and the `Revision` table is
  the record of how it came to say it.

To run a pass on the server, copy the batch somewhere outside the working tree
and pass the path. Do not drop it into the repository directory on the server:
an untracked file there is enough to make `git pull` refuse the next deploy,
which has already cost one aborted release.

    scp batch.json bwh:/tmp/batch.json
    ssh bwh 'cd /www/wwwroot/avoidxray.com && npx tsx scripts/revoice-pass.ts /tmp/batch.json --apply'
