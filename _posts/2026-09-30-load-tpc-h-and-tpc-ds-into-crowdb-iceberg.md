---
title: "Load TPC-H and TPC-DS tables into CROWDB Iceberg"
subtitle: "A small, reproducible path from standard generators to remote Parquet and an Iceberg read."
date: 2026-09-30 23:20:00 +0800
category: Guides
tags: [Iceberg, TPC-H, TPC-DS, Parquet, Docker]
description: "Use crowdb-tpc-loader to generate TPC-H and TPC-DS, register the Parquet files in a CROWDB Iceberg container, and read them with PyIceberg."
excerpt: "Load 8 TPC-H or 24 TPC-DS tables with one command, then select rows from a fresh Python client."
image: /assets/og-iceberg.png
---

I wanted a repeatable way to put recognizable data into the CROWDB Iceberg container before trying SQL engines. Hand-writing a sample table proves little about multi-table imports. [crowdb-tpc-loader](https://github.com/buzzcrow/crowdb-tpc-loader) now generates TPC-H and TPC-DS Parquet, checks every table, uploads the files, and registers them through the Iceberg REST Catalog. This guide uses scale factor 0.01 to exercise that path. It does not run the benchmark queries or claim TPC certification.

## Start a local container

These commands use a Linux amd64 development checkout of [CROWDB](https://github.com/buzzcrow/crowdb) at version 0.2.0. The image below is **built locally from source**; the test does not establish that a `0.2.0` Docker Hub tag has been published. The single-node profile has one copy and no node-failure protection, so use disposable data.

```sh
cd /path/to/crowdb
pixi run build-single-node-container
docker run -d --name crowdb-tpc-demo \
  -p 127.0.0.1:80:80 \
  -v crowdb-tpc-demo-data:/opt/crowdb/data \
  crowdb-iceberg-single-node:dev
```

Wait until `docker inspect crowdb-tpc-demo --format '{{.State.Health.Status}}'` says `healthy`. Port 80 carries the REST Catalog and native Iceberg file endpoint. Get the local client credentials without copying the token into a command line:

```sh
umask 077
docker exec crowdb-tpc-demo crowdb-monitor credentials show --format env > /tmp/crowdb-tpc-demo.env
set -a
. /tmp/crowdb-tpc-demo.env
set +a
```

Keep that file private and remove it when finished. Use a different host port or adjust `ICEBERG_URI` if port 80 is occupied.

## Load both datasets

From a checkout of `crowdb-tpc-loader`:

```sh
cd /path/to/crowdb-tpc-loader
python3 -m venv .venv
. .venv/bin/activate
python -m pip install --only-binary=:all: -e .

crowdb-tpc-loader load --benchmark tpch --sf 0.01 \
  --namespace tpch_demo --report-file ./tpch-demo.json
crowdb-tpc-loader load --benchmark tpcds --sf 0.01 \
  --namespace tpcds_demo --report-file ./tpcds-demo.json
```

The commands need a fresh namespace. TPC-H uses the `tpchgen-cli` 3.0.0 binary; TPC-DS uses DuckDB 1.5's official `tpcds` extension. The first run may download these generator components. The loader validates the full generated dataset before creating a benchmark table, then uploads and verifies each Parquet file and registers it with Iceberg. It deletes local staging on success; the JSON reports retain remote file locations, counts, and snapshot IDs. An existing table stops a default load, so choose a new namespace when repeating the experiment.

In my local SF 0.01 run, TPC-H produced **8 tables, 86,805 rows, and 3.23 MB across 8 Parquet files**. TPC-DS produced **24 tables, 277,976 rows, and 3.86 MB across 24 Parquet files**. There was one file per table in this small run, but the loader accepts multiple shards. TPC-H `region` was 1,227 bytes while `lineitem` was 1,924,571 bytes; TPC-DS `call_center` was 4,917 bytes while `store_sales` was 985,882 bytes. These are compressed Parquet sizes, not in-memory table sizes.

## Select rows in Python

Run this in a fresh process after the loader has removed its local files. The file adapter handles exact-object requests on CROWDB's native Iceberg endpoint:

```python
import os
from pyiceberg.catalog import load_catalog

catalog = load_catalog(
    "crowdb", type="rest",
    uri=os.environ["ICEBERG_URI"], token=os.environ["ICEBERG_TOKEN"],
    **{"py-io-impl": "crowdb_tpc_loader.crowdb_fileio.CrowdbFileIO"},
)

region = catalog.load_table("tpch_demo.region")
print(region.scan(
    row_filter="r_regionkey == 1",
    selected_fields=("r_regionkey", "r_name"),
).to_arrow().to_pylist())

item = catalog.load_table("tpcds_demo.item")
print(item.scan(
    selected_fields=("i_item_sk", "i_item_id"), limit=5,
).to_arrow().to_pylist())
```

The first selection returned `{'r_regionkey': 1, 'r_name': 'AMERICA'}` in my run. The second returned five `item` rows. For a read-only check of every imported table, including remote Parquet footers and an Iceberg sample scan, run `python scripts/verify_crowdb.py ./tpch-demo.json --require-complete --iceberg-scan` and the same command with `tpcds-demo.json`.

CROWDB's Iceberg file paths look like S3 paths, but they are native Iceberg objects with table-scoped authority. [PyIceberg's default PyArrow FileIO](https://py.iceberg.apache.org/reference/pyiceberg/io/pyarrow/) calls `get_file_info` for an exact file; in this run that led to `ListObjectsV2` and failed. The loader's small FileIO adapter uses an exact-object request for existence and size. [Iceberg's FileIO guide](https://iceberg.apache.org/docs/latest/fileio/) describes read, write, and seek as essential file operations. General prefix listing and the meaning of the S3 bucket field remain separate design work; this import does not require either.

## What the small run measured

I ran one single-node container on a Linux x86_64 host with an Intel Core i9-7960X, 32 logical CPUs, and 62 GiB RAM. The generator used two threads and a 1 GB DuckDB memory limit; Python 3.12.3, PyArrow 23.0.1, and PyIceberg 0.10.0 were installed. There was no performance baseline or concurrent client load. The clean TPC-H import took 29.81 seconds wall time; TPC-DS took 75.83 seconds. A separate client then verified all 32 tables after local staging was gone, including full reads and SHA-256 checks.

The files are tiny, yet each table's create, upload, verify, and register step took a median 3.33 seconds for TPC-H and 2.85 seconds for TPC-DS. Those steps account for most elapsed time. This shows a significant per-table fixed cost in this setup; the run does not identify which internal metadata call dominates. I would profile that path before using small-file throughput as a performance claim. Larger scale factors, a distributed deployment, and SQL benchmark queries still need their own tests.

The local Docker volume keeps the Iceberg data when the container stops. To end the example, run `docker rm -f crowdb-tpc-demo` and remove `/tmp/crowdb-tpc-demo.env`. Remove the `crowdb-tpc-demo-data` volume only when you deliberately want to discard the imported tables.
