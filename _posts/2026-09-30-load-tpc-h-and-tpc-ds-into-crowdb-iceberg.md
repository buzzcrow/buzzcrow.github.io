---
title: "Load TPC-H and TPC-DS tables into CROWDB Iceberg"
subtitle: "Check 32 imported tables, then read TPC-H and TPC-DS data with DuckDB."
date: 2026-09-30 23:20:00 +0800
last_modified_at: 2026-10-02 10:00:00 +0800
category: Guides
tags: [Iceberg, TPC-H, TPC-DS, DuckDB, Docker]
description: "Load TPC-H and TPC-DS data into the CROWDB Iceberg container, check table counts, and read both from DuckDB."
excerpt: "Load 32 small Iceberg tables, check their row counts, and read both datasets with DuckDB."
image: /assets/og-iceberg.png
---

The [CROWDB Iceberg container](https://hub.docker.com/r/crowdb/crowdb-iceberg/tags) serves a catalog and the files behind its tables. This guide loads small TPC-H and TPC-DS datasets, checks the import reports, and reads a table with DuckDB.

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
crowdb-tpc-loader load --benchmark tpch --sf 0.01 \
  --namespace tpch_demo --report-file ./tpch-demo.json
crowdb-tpc-loader load --benchmark tpcds --sf 0.01 \
  --namespace tpcds_demo --upload-workers 4 --report-file ./tpcds-demo.json
```

The [crowdb-tpc-loader](https://github.com/buzzcrow/crowdb-tpc-loader) loads each dataset into its own namespace. At scale factor 0.01, TPC-H creates eight tables with 86,805 rows; TPC-DS creates 24 tables with 277,976 rows. Check your own reports:

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

The first two lines for the completed imports used in this guide were:

```text
tpch: 8 tables, 86,805 rows; status=succeeded
tpcds: 24 tables, 277,976 rows; status=succeeded
```

The third line prints the `date_dim` row count to compare with the DuckDB query below.

If an import fails, keep its JSON report and follow the [loader recovery guide](https://github.com/buzzcrow/crowdb-tpc-loader/blob/main/docs/RECOVERY.md) before retrying. A new namespace avoids colliding with tables from an earlier run.

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

I also ran all 22 TPC-H and 99 TPC-DS queries with DuckDB 1.5.6 against the published container at scale factor 0.01. Their results matched DuckDB reading the same local Parquet files: 22/22 and 99/99. Those are separate [recorded development checks](https://github.com/buzzcrow/crowdb-tpc-loader/blob/main/docs/TEST_REPORT.md), not the queries run by the commands above or timed TPC benchmark scores. The `latest` image may change, so keep its digest when recording new results.

When finished, remove the disposable container and credentials file:

```sh
docker stop --time 120 crowdb-iceberg
docker rm crowdb-iceberg
rm -f ./crowdb-iceberg.env
```
