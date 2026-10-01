---
title: "Run TPC-H and TPC-DS on the CROWDB Iceberg container"
subtitle: "Start the container, load data, and check its Iceberg tables with DuckDB."
date: 2026-09-30 23:20:00 +0800
last_modified_at: 2026-10-01 23:25:00 +0800
category: Guides
tags: [Iceberg, TPC-H, TPC-DS, DuckDB, Docker]
description: "Run DuckDB's TPC-H and TPC-DS queries against tables served by the published CROWDB Iceberg container."
excerpt: "The CROWDB Iceberg container served all 22 TPC-H and 99 TPC-DS queries at SF 0.01."
image: /assets/og-iceberg.png
---

The [CROWDB Iceberg container](https://hub.docker.com/r/crowdb/crowdb-iceberg/tags) serves an Iceberg REST catalog and the files behind its tables. I loaded TPC data into it, then ran DuckDB queries through that interface. These commands use a Linux amd64 host with Docker, Python 3.10–3.12, and the DuckDB CLI. Use disposable data for this evaluation image.

## Start CROWDB Iceberg

```bash
docker run -d --name crowdb-iceberg -p 127.0.0.1:80:80 crowdb/crowdb-iceberg:latest
set -a
source <(docker exec crowdb-iceberg crowdb-monitor credentials show --format env)
set +a
```

The monitor supplies `ICEBERG_URI` and `ICEBERG_TOKEN` to the current Bash session.

## Load TPC-H

```sh
python3 -m venv .venv
. .venv/bin/activate
python -m pip install crowdb-tpc-loader
crowdb-tpc-loader load --benchmark tpch --sf 0.01 \
  --namespace tpch_demo --report-file ./tpch-demo.json
```

The [crowdb-tpc-loader](https://github.com/buzzcrow/crowdb-tpc-loader) creates eight Iceberg tables with 86,805 rows. It is a data import tool for this container test; the [loader guide](https://crowdb.dev/docs/tpc-loader/) covers its options.

## Query with DuckDB

```sh
duckdb <<SQL
INSTALL iceberg;
LOAD iceberg;
INSTALL httpfs;
LOAD httpfs;
CREATE SECRET crowdb_catalog (TYPE ICEBERG, TOKEN '$ICEBERG_TOKEN');
ATTACH '' AS crowdb (TYPE ICEBERG, SECRET crowdb_catalog, ENDPOINT '$ICEBERG_URI');
SELECT r_regionkey, r_name FROM crowdb.tpch_demo.region WHERE r_regionkey = 1;
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
SQL
```

The first query returned `(1, AMERICA)`. TPC-H Q1 returned these `count_order` values:

```text
returnflag  linestatus  count_order
A           F           14876
N           F             348
N           O           29181
R           F           14902
```

I ran all 22 [DuckDB TPC-H queries](https://github.com/duckdb/duckdb/tree/main/extension/tpch/dbgen/queries) against the container's Iceberg tables. Every result matched DuckDB reading the same local Parquet files: **22/22**.

## Also try TPC-DS

```sh
crowdb-tpc-loader load --benchmark tpcds --sf 0.01 \
  --namespace tpcds_demo --upload-workers 4 --report-file ./tpcds-demo.json
```

The container served 24 TPC-DS tables with 277,976 rows. DuckDB ran all 99 [TPC-DS queries](https://github.com/duckdb/duckdb/tree/main/extension/tpcds/dsdgen/queries) against them; every result matched the same local Parquet data: **99/99**. These SF 0.01 runs are development checks of the container's Iceberg read path and query results, not TPC benchmark scores.

When finished, run `docker rm -f crowdb-iceberg` to remove the disposable container.
