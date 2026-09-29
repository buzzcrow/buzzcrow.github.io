---
title: "Run Iceberg in one container, then query it with pandas"
subtitle: "Create a tiny orders table, write it to Iceberg, and find which city earned the most."
date: 2026-09-28 10:30:00 +0800
last_modified_at: 2026-09-30 00:30:00 +0800
category: Guides
tags: [Iceberg, Docker, PyIceberg, pandas, Getting started]
description: "Start CROWDB in Docker, upload six orders through PyIceberg, and summarize paid revenue by city with pandas."
excerpt: "One container, six orders, and a useful answer from data read back from Iceberg."
art: iceberg
image: /assets/og-iceberg.png
figure_title: "Catalog + storage."
figure_caption: "Write data, read it back, ask a question."
---
<!-- Publish this revision together with the rebuilt image. The originally published 0.1.0 image does not yet support the append path below. -->

What does an Iceberg catalog help you do? Let's answer a small question: **which city brought in the most paid sales?** We will upload six fictional orders to CROWDB, read them back, and use pandas to calculate the answer.

The published Linux amd64 `0.1.0` image is about 91.6 MiB compressed. Use disposable data for this evaluation release.

## 1. Start the container

```sh
docker run -d --name crowdb-iceberg -p 127.0.0.1:80:80 crowdb/crowdb-iceberg:0.1.0
```

Port 80 lets Python on your machine reach the Iceberg catalog and its file service. There is no separate storage service to start for this example.

## 2. Connect Python

Get your container's private connection values:

```sh
docker exec crowdb-iceberg crowdb-monitor credentials show --format env
python3 -m venv .venv
. .venv/bin/activate
pip install 'pyiceberg[pyarrow]==0.11.1' pandas
```

Set `ICEBERG_URI` and `ICEBERG_TOKEN` in that shell from the command's output. Keep the token private.

## 3. Upload orders and ask a question

Save this as `orders.py` and run `python orders.py`:

```python
import os

import pandas as pd
import pyarrow as pa
from pyiceberg.catalog import load_catalog

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

catalog = load_catalog(
    "crowdb",
    type="rest",
    uri=os.environ["ICEBERG_URI"],
    token=os.environ["ICEBERG_TOKEN"],
)
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

```text
    city  orders  revenue_usd
 Beijing       2          150
Shanghai       2          140
Shenzhen       1           50
```

Beijing leads by $10. The cancelled order does not count. The query uses `saved_orders`, which came from an Iceberg scan after the upload, so the result is based on stored data rather than the original in-memory DataFrame.

That's the basic loop: create a table, write data, and read it back with a familiar Python tool. For configuration and other client integrations, see the [quick start](https://crowdb.dev/docs/quickstart/) and [Iceberg manual](https://crowdb.dev/docs/manual/iceberg/).
