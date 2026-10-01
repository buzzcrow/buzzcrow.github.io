---
title: "Load TPC-H into CROWDB Iceberg and query it with DuckDB"
subtitle: "One container, one data load, and a first SQL workload."
date: 2026-09-30 23:20:00 +0800
last_modified_at: 2026-10-01 20:00:00 +0800
category: Guides
tags: [Iceberg, TPC-H, DuckDB, Docker]
description: "Start the published CROWDB Iceberg container, load TPC-H tables, then query them through DuckDB."
excerpt: "From a published container to TPC-H tables and a DuckDB query, with the benchmark boundary made explicit."
image: /assets/og-iceberg.png
---

I wanted to move beyond a hand-written table and see whether a SQL client could read a complete, familiar dataset from CROWDB. The path is short: start the [published Iceberg image](https://hub.docker.com/r/crowdb/crowdb-iceberg/tags), inject TPC-H tables with [crowdb-tpc-loader](https://github.com/buzzcrow/crowdb-tpc-loader), then query them through DuckDB. This is an evaluation on one Linux amd64 host with disposable data, not a TPC result.

## Start the container

```sh
docker run -d --name crowdb-tpc-demo \
  -p 127.0.0.1:80:80 \
  -v crowdb-tpc-demo-data:/opt/crowdb/data \
  crowdb/crowdb-iceberg:latest
```

Wait until `docker inspect --format '{{.State.Health.Status}}' crowdb-tpc-demo` reports `healthy`. Save the generated connection values in a private file and load them into the current shell:

```sh
umask 077
docker exec crowdb-tpc-demo crowdb-monitor credentials show --format env > ./crowdb-demo.env
set -a
. ./crowdb-demo.env
set +a
```

The `latest` tag can move, so record the image digest if you need to repeat the run exactly.

## Inject TPC-H data

Install the published [crowdb-tpc-loader package](https://pypi.org/project/crowdb-tpc-loader/) (source: [buzzcrow/crowdb-tpc-loader](https://github.com/buzzcrow/crowdb-tpc-loader)), then load a fresh namespace:

```sh
python3 -m venv .venv
. .venv/bin/activate
python -m pip install crowdb-tpc-loader
crowdb-tpc-loader load --benchmark tpch --sf 0.01 \
  --namespace tpch_demo --report-file ./tpch-demo.json
```

This creates eight Iceberg tables. The loader generates and checks Parquet locally, uploads it to the container, and registers the files in the catalog. It does not run TPC-H SQL queries. With the published image, my SF 0.01 run committed all 8 tables and the independent verifier checked 86,805 manifest/footer rows. The loader writes different tables concurrently with 8 workers by default; use `--upload-workers` to adjust that limit. The [loader guide](https://crowdb.dev/docs/tpc-loader/) covers prerequisites, reports, failure recovery, and TPC-DS loading.

## Query with DuckDB

I used a locally built DuckDB 1.5.6 CLI at `/pp/duckdb/build/release/duckdb`. Replace that path with your DuckDB executable. With the credential environment still loaded:

```sh
/pp/duckdb/build/release/duckdb <<SQL
INSTALL iceberg;
LOAD iceberg;
INSTALL httpfs;
LOAD httpfs;
CREATE SECRET crowdb_catalog (TYPE ICEBERG, TOKEN '$ICEBERG_TOKEN');
ATTACH '' AS crowdb (TYPE ICEBERG, SECRET crowdb_catalog, ENDPOINT '$ICEBERG_URI');
SELECT r_regionkey, r_name
FROM crowdb.tpch_demo.region
WHERE r_regionkey = 1;
SQL
```

The empty warehouse selector in `ATTACH ''` is required for this CROWDB profile. The published-image run returned `AMERICA`. That confirms one read through the REST catalog and file endpoint; it does not exercise the TPC-H query set.

## Try TPC-H Q1

Q1 scans and aggregates `lineitem`. Open DuckDB again, repeat the extension and `ATTACH` statements above, enable `.timer on`, then run the [standard Q1](https://github.com/duckdb/duckdb/blob/main/extension/tpch/dbgen/queries/q01.sql) against the imported table:

```sql
SELECT l_returnflag, l_linestatus,
       sum(l_quantity) AS sum_qty,
       sum(l_extendedprice) AS sum_base_price,
       sum(l_extendedprice * (1 - l_discount)) AS sum_disc_price,
       sum(l_extendedprice * (1 - l_discount) * (1 + l_tax)) AS sum_charge,
       avg(l_quantity) AS avg_qty,
       avg(l_extendedprice) AS avg_price,
       avg(l_discount) AS avg_disc,
       count(*) AS count_order
FROM crowdb.tpch_demo.lineitem
WHERE l_shipdate <= DATE '1998-09-02'
GROUP BY l_returnflag, l_linestatus
ORDER BY l_returnflag, l_linestatus;
```

Start with SF 0.01 to check correctness and compatibility. For a meaningful timed run, load a stated scale factor, run the standard query set, record the image digest, DuckDB build, hardware, cache state, concurrency, and results, then compare with a stated baseline.

In the published-image SF 0.01 run, Q1 returned four groups with `count_order` values 14,876, 348, 29,181, and 14,902. The local DuckDB CLI reported 0.075 seconds for that single execution. It is a small integration check without a baseline, cache control, or repeated trials; we have not run the full TPC-H suite or measured a TPC score.

The named volume keeps data after the container stops. Remove the container with `docker rm -f crowdb-tpc-demo` when finished; delete `./crowdb-demo.env` securely. Remove the volume only when you intend to discard the tables.
