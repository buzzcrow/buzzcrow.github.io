---
title: "Load TPC-H and TPC-DS tables into CROWDB Iceberg"
subtitle: "Check 32 imported tables, then read TPC-H and TPC-DS data with DuckDB."
date: 2026-09-30 23:20:00 +0800
last_modified_at: 2026-10-06 16:30:00 +0800
category: Guides
tags: [Iceberg, TPC-H, TPC-DS, DuckDB, Docker]
description: "Load TPC-H and TPC-DS data into the CROWDB Iceberg container, check table counts, and read both from DuckDB."
excerpt: "Load 32 Iceberg tables at SF1, check their row counts, and read both datasets with DuckDB."
image: /assets/og-iceberg.png
---

The [CROWDB Iceberg container](https://hub.docker.com/r/crowdb/crowdb-iceberg/tags) serves a catalog and the files behind its tables. This guide loads TPC-H and TPC-DS datasets at scale factor 1 (SF1), checks the import reports, and reads a table with DuckDB.

Use disposable data on a Linux amd64 host with Docker, Python 3.10–3.12, the DuckDB CLI, and a free local port 9092. The loader may download a TPC-H generator on its first run; DuckDB may download extensions.

## 1. Start CROWDB Iceberg

```sh
docker run -d --name crowdb-iceberg -p 127.0.0.1:9092:9092 crowdb/crowdb-iceberg:latest
docker exec crowdb-iceberg crowdb-monitor readiness && echo ready
```

Rerun the readiness command until it prints `ready`. Save the generated credentials in a private file and load them into your shell:

```sh
umask 077
docker exec crowdb-iceberg crowdb-monitor credentials show --format env > ./crowdb-iceberg.env
set -a
. ./crowdb-iceberg.env
set +a
```

The loader and DuckDB use `ICEBERG_URI` and `ICEBERG_TOKEN` from this container. Keep the file private.

## 2. Load the data

```sh
python3 -m venv .venv
. .venv/bin/activate
python -m pip install crowdb-tpc-loader
crowdb-tpc-loader load --benchmark tpch --sf 1 \
  --namespace tpch_demo --report-file ./tpch-demo.json
crowdb-tpc-loader load --benchmark tpcds --sf 1 \
  --namespace tpcds_demo --upload-workers 4 --report-file ./tpcds-demo.json
```

The [crowdb-tpc-loader](https://github.com/buzzcrow/crowdb-tpc-loader) loads each dataset into its own namespace. At SF1, TPC-H creates eight tables and TPC-DS creates 24 tables. Check the completed table counts, generated row totals, and status in your own reports:

```sh
python - <<'PY'
import json

for name in ("tpch", "tpcds"):
    with open(f"{name}-demo.json", encoding="utf-8") as file:
        report = json.load(file)
    summary = report["summary"]
    print(f"{name}: {len(summary['succeeded'])} tables, {summary['generated_rows']:,} rows; status={report['status']}")
    if name == "tpcds":
        print(f"date_dim: {report['tables']['date_dim']['row_count']:,} rows")
PY
```

Check that the reports show eight successful TPC-H tables and 24 successful TPC-DS tables, both with `status=succeeded`. The script also prints the generated row totals and the `date_dim` row count to compare with the DuckDB query below.

If an import fails, keep its JSON report and follow the [loader recovery guide](https://github.com/buzzcrow/crowdb-tpc-loader/blob/main/docs/RECOVERY.md) before retrying. A new namespace avoids colliding with tables from an earlier run.

### Inspect the table files

The development console’s Iceberg tab shows the table tree alongside Parquet file details. The screenshot below follows a `lineitem` file down to its row groups and column metadata.

<figure class="console-shot">
  <a href="{{ '/assets/crowdb-iceberg.png' | relative_url }}" target="_blank" rel="noopener" aria-label="Open inside an iceberg file screenshot at full size"><img src="{{ '/assets/crowdb-iceberg.png' | relative_url }}" alt="From a table snapshot and manifest to a Parquet file: byte layout, row groups, and column metadata." width="1621" height="868" loading="lazy" decoding="async"></a>
  <figcaption>Iceberg file inspection in the development console, October 6, 2026. The TPC-H SF1 lineitem file contains 6,001,215 rows. The screenshot uses a run-specific namespace; the commands above use tpch_demo. <a href="{{ '/assets/crowdb-iceberg.png' | relative_url }}" target="_blank" rel="noopener">View full-size screenshot ↗</a></figcaption>
</figure>

## 3. Query a table with DuckDB

The empty warehouse selector in `ATTACH ''` is required for this CROWDB profile. Run the DuckDB CLI in the same shell where you loaded the credentials:

```sh
duckdb <<SQL
INSTALL iceberg;
LOAD iceberg;
INSTALL httpfs;
LOAD httpfs;
CREATE SECRET crowdb_catalog (TYPE ICEBERG, TOKEN '$ICEBERG_TOKEN');
ATTACH '' AS crowdb (TYPE ICEBERG, SECRET crowdb_catalog, ENDPOINT '$ICEBERG_URI');
SELECT r_regionkey, r_name FROM crowdb.tpch_demo.region WHERE r_regionkey = 1;
SELECT count(*) AS date_dim_rows FROM crowdb.tpcds_demo.date_dim;
SQL
```

For the TPC-H data above, the first query returns `(1, AMERICA)`. The second count should match `date_dim` in your TPC-DS report. Both reads go through CROWDB's Iceberg catalog and file service.

The [recorded SF1 development checks](https://github.com/buzzcrow/crowdb-tpc-loader/blob/main/docs/TEST_REPORT.md) for loader 0.1.1 committed all 32 tables against a fresh local single-node image. Verification covered remote MD5 comparison, full-row Parquet decoding, Iceberg sample scans, and DuckDB row-count queries for every table. These checks validate the import and read path; they are not timed TPC benchmark results. The `latest` image may change, so keep its digest when recording new results.

When finished, remove the disposable container and credentials file:

```sh
docker stop --time 120 crowdb-iceberg
docker rm crowdb-iceberg
rm -f ./crowdb-iceberg.env
```
