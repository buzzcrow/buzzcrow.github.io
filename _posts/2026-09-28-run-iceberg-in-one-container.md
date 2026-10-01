---
title: "Use crowdb-iceberg container with pandas"
subtitle: "Start the container, write an Iceberg table, and query its data in pandas."
date: 2026-09-28 10:30:00 +0800
last_modified_at: 2026-10-01 20:00:00 +0800
category: Guides
tags: [Iceberg, Docker, PyIceberg, pandas, Getting started]
description: "Start the CROWDB Iceberg container, connect with PyIceberg, write a table, and query its data with pandas."
excerpt: "A short, runnable path from a Docker container to an Iceberg table and a pandas query."
art: iceberg
image: /assets/og-iceberg.png
figure_title: "Catalog + storage."
figure_caption: "Write an Iceberg table and read it into pandas."
---
CROWDB's `crowdb-iceberg` container runs an Iceberg REST catalog and its file storage together. This example creates a table of six sample orders, writes the rows through PyIceberg, then reads the stored table into pandas.

Use disposable data with the `latest` evaluation image. The commands below assume a Linux amd64 host and a free local port 80.

## 1. Start the container

```sh
docker run -d --name crowdb-iceberg -p 127.0.0.1:80:80 crowdb/crowdb-iceberg:latest
```

The port mapping lets Python on your machine reach the catalog and file service.

## 2. Set up the connection

Install the Python clients and print the connection values from your container:

```sh
python3 -m venv .venv
. .venv/bin/activate
pip install 'pyiceberg[pyarrow]==0.11.1' pandas
docker exec crowdb-iceberg crowdb-monitor credentials show --format env
```

Export the two Iceberg values in the same shell, replacing the examples below with the values printed by your container. Keep the token private.

```sh
export ICEBERG_URI='http://localhost'
export ICEBERG_TOKEN='<your container token>'
```

Start an `orders.py` file with the connection:

```python
import os

import pandas as pd
import pyarrow as pa
from pyiceberg.catalog import load_catalog

catalog = load_catalog(
    "crowdb",
    type="rest",
    uri=os.environ["ICEBERG_URI"],
    token=os.environ["ICEBERG_TOKEN"],
)
```

## 3. Write a table and its data

Add this block to `orders.py`. The sample rows are created locally; `table.append` writes them to the container's Iceberg storage.

```python
orders = pd.DataFrame(
    [
        (1, "Beijing", "paid", 120),
        (2, "Shanghai", "paid", 80),
        (3, "Beijing", "cancelled", 200),
        (4, "Shanghai", "paid", 60),
        (5, "Shenzhen", "paid", 50),
        (6, "Beijing", "paid", 30),
    ],
    columns=["order_id", "city", "status", "amount_usd"],
)
arrow_orders = pa.Table.from_pandas(orders, preserve_index=False)

catalog.create_namespace_if_not_exists("pandas_demo")
table = catalog.create_table("pandas_demo.orders", schema=arrow_orders.schema)
table.append(arrow_orders)
```

This creates a new `pandas_demo.orders` table. Use a different table name if you run the script again.

## 4. Query the stored table with pandas

Add the final block to `orders.py`, then run `python orders.py`:

```python
saved_orders = catalog.load_table("pandas_demo.orders").scan().to_pandas()
result = (
    saved_orders[saved_orders["status"] == "paid"]
    .groupby("city", as_index=False)
    .agg(orders=("order_id", "count"), revenue_usd=("amount_usd", "sum"))
    .sort_values("revenue_usd", ascending=False)
)
print(result.to_string(index=False))
```

```sh
python orders.py
```

The query counts paid orders and sums their revenue for each city:

```text
    city  orders  revenue_usd
 Beijing       2          150
Shanghai       2          140
Shenzhen       1           50
```

The cancelled order is excluded. `saved_orders` comes from a fresh Iceberg table scan, so this query uses the data written to the container.

For container configuration and other client operations, see the [quick start](https://crowdb.dev/docs/quickstart/) and [Iceberg manual](https://crowdb.dev/docs/manual/iceberg/).
