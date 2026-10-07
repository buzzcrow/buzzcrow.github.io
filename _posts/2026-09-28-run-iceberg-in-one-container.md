---
title: "Write an Iceberg table with CROWDB and pandas"
subtitle: "Start one container, save six orders, and check the result in pandas."
date: 2026-09-28 10:30:00 +0800
last_modified_at: 2026-10-02 10:00:00 +0800
category: Guides
tags: [Iceberg, Docker, PyIceberg, pandas, Getting started]
description: "Start CROWDB Iceberg, write six orders with PyIceberg, and check the saved data in pandas."
excerpt: "Start one container, write six orders to an Iceberg table, and see the pandas result."
art: iceberg
image: /assets/og-iceberg.png
figure_title: "Catalog + storage."
figure_caption: "Write an Iceberg table and read it into pandas."
---
CROWDB's `crowdb-iceberg:latest` container runs an Iceberg catalog, table storage, and a local web Console together. You will write six orders to a table, read them back, and total the paid orders by city.

Use a Linux amd64 host with Docker and Python 3.10–3.12. Use disposable data with this evaluation image, and make sure local port 9092 is free.

## 1. Start the container

```sh
docker run -d --name crowdb-iceberg \
  -p 127.0.0.1:9090:9090 \
  -p 127.0.0.1:9092:9092 \
  crowdb/crowdb-iceberg:latest
```

The `9092` mapping keeps the catalog and file service on your machine. The `9090` mapping serves the local Console. Open [http://127.0.0.1:9090/](http://127.0.0.1:9090/) in a browser and select **Iceberg**. The table tree is empty until the script below creates `pandas_demo.orders`.

## 2. Get credentials and install the client

The container generates its own connection values. Save them in a private file, then load them into your shell:

```sh
umask 077
docker exec crowdb-iceberg crowdb-monitor credentials show --format env > ./crowdb-iceberg.env
set -a
. ./crowdb-iceberg.env
set +a
python3 -m venv .venv
. .venv/bin/activate
python -m pip install 'pyiceberg[pyarrow]==0.11.1' pandas
```

The file contains `ICEBERG_URI` and `ICEBERG_TOKEN`. Keep it private. The commands below use the values from your container.

## 3. Write six orders and read them back

Copy this complete script into `orders.py`:

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

saved_orders = catalog.load_table("pandas_demo.orders").scan().to_pandas()
result = (
    saved_orders[saved_orders["status"] == "paid"]
    .groupby("city", as_index=False)
    .agg(orders=("order_id", "count"), revenue_usd=("amount_usd", "sum"))
    .sort_values("revenue_usd", ascending=False)
)
print(result.to_string(index=False))
```

Run it once:

```sh
python orders.py
```

Refresh the Console and select **Iceberg → pandas_demo → orders** to inspect the table, its snapshot, and the Parquet file written by the script. The Console is an inspection surface for this local container; the client and query examples above still use the Iceberg endpoint on `9092`.

<figure class="console-shot">
  <a href="{{ '/assets/crowdb-cluster-latest.png' | relative_url }}" target="_blank" rel="noopener" aria-label="Open the CROWDB cluster screenshot at full size"><img src="{{ '/assets/crowdb-cluster-latest.png' | relative_url }}" alt="CROWDB Console cluster view showing Healthy service status." width="1621" height="868" loading="lazy" decoding="async"></a>
  <figcaption>The same local container also exposes the Cluster view, where the service health is visible. <a href="{{ '/assets/crowdb-cluster-latest.png' | relative_url }}" target="_blank" rel="noopener">View full-size screenshot ↗</a></figcaption>
</figure>

<figure class="console-shot">
  <a href="{{ '/assets/crowdb-iceberg-orders.png' | relative_url }}" target="_blank" rel="noopener" aria-label="Open a CROWDB Iceberg Console screenshot at full size"><img src="{{ '/assets/crowdb-iceberg-orders.png' | relative_url }}" alt="CROWDB Console showing the real pandas_demo.orders Parquet file from crowdb-iceberg:latest, with Healthy visible." width="1621" height="868" loading="lazy" decoding="async"></a>
  <figcaption>The Iceberg view follows the real `pandas_demo.orders` table from its snapshot into the manifest and Parquet file. The Console header shows Healthy; the exact generated file name varies by run. <a href="{{ '/assets/crowdb-iceberg-orders.png' | relative_url }}" target="_blank" rel="noopener">View full-size screenshot ↗</a></figcaption>
</figure>

The fresh Iceberg scan reads the rows saved in the container. One order is cancelled, so the five paid orders produce:

```text
    city  orders  revenue_usd
 Beijing       2          150
Shanghai       2          140
Shenzhen       1           50
```

The script creates `pandas_demo.orders`; running it again with the same container will find that table already exists. To repeat the example, use a new table name or a new disposable container.

When finished, remove the disposable container and credentials file:

```sh
docker stop --time 120 crowdb-iceberg
docker rm crowdb-iceberg
rm -f ./crowdb-iceberg.env
```

For a persistent volume or other client operations, see the [quick start](https://crowdb.dev/docs/quickstart/) and [Iceberg manual](https://crowdb.dev/docs/manual/iceberg/).
