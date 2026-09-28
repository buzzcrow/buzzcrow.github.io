---
title: "One container to inspect the Iceberg path"
subtitle: "A local catalog, its storage, and a small first check. What the CROWDB preview is for—and what it does not prove."
date: 2026-09-28 10:30:00 +0800
category: Guides
tags: [Iceberg, Docker, Getting started]
description: "Evaluate the CROWDB Iceberg container on Linux amd64, verify startup, retrieve private credentials, and understand the preview’s limits."
excerpt: "Start with a small question: can the catalog and the storage work together without another service to configure?"
art: iceberg
image: /assets/og-iceberg.png
figure_title: "Catalog + storage."
figure_caption: "Start locally. Check the boundary. Development preview, not production."
---
For a first evaluation, I want the setup to be smaller than the question we are trying to answer. A catalog URL is not much use if the reader first has to assemble a separate storage stack, find credentials, and work out which port serves the files.

The CROWDB Iceberg container puts the REST catalog and its storage in one local deployment. The first check is deliberately modest: start it, confirm that the services are healthy, and create a namespace from a client. That establishes a connection. It is not a performance test or evidence of production readiness.

## Before starting

The preview targets **Linux amd64**. Use a machine with Docker and disposable data. These examples use host port 80 on loopback. Check that the port is free; do not run the example on the same host port as your website’s Nginx server.

<div class="callout"><strong>Image publication is separate from the guide</strong><p>The repository names <code>crowdb/crowdb-iceberg:v0.1.0-dev</code> as the evaluation image. Confirm that this tag is available on Docker Hub before running the commands. A written quick start is not evidence that an image has finished publishing.</p></div>

## Start the catalog and storage

Use a named volume so that recreating the container does not silently leave you with a different anonymous volume:

```sh
docker run -d --name crowdb-iceberg \
  -p 127.0.0.1:80:80 \
  -v crowdb-data:/opt/crowdb/data \
  --stop-timeout 120 \
  crowdb/crowdb-iceberg:v0.1.0-dev
```

The loopback binding is intentional. This is a local HTTP evaluation, not an instruction to expose an unfinished storage service to the internet.

Check the startup status:

```sh
docker inspect --format '{% raw %}{{.State.Health.Status}}{% endraw %}' crowdb-iceberg
```

Wait for `healthy`. While the state is `starting`, initialization or recovery may still be running. If it becomes `unhealthy` or the process exits, inspect the logs instead of repeatedly deleting the container:

```sh
docker logs --tail 100 crowdb-iceberg
docker exec crowdb-iceberg crowdb-monitor readiness
```

## Retrieve credentials, then connect

Get the generated client configuration:

```sh
docker exec crowdb-iceberg crowdb-monitor credentials show --format env
```

The output includes `ICEBERG_URI` and `ICEBERG_TOKEN`. Keep it private. Set those two variables in your client environment using the values printed by your own container; there is no shared demo token.

With PyIceberg installed, this is a small connection check:

```python
import os
from pyiceberg.catalog import load_catalog

catalog = load_catalog(
    "crowdb",
    type="rest",
    uri=os.environ["ICEBERG_URI"],
    token=os.environ["ICEBERG_TOKEN"],
)
catalog.create_namespace_if_not_exists("demo")
print(catalog.list_namespaces())
```

Look for the `demo` namespace in the returned list. This checks catalog access and namespace creation. It does **not** verify file reads, table commits, query-engine compatibility, or throughput.

## One port is not one data model

Port 80 serves the Iceberg REST catalog and Iceberg FileIO. This path does not require a separate S3 port. That is the part of the architecture the container makes convenient to inspect.

The container can also expose general S3 access on port 81, but that is a separate endpoint. Uploading an object there does not register an Iceberg table. Sharing a storage core does not make object and table operations interchangeable.

Do not solve a host-port conflict by changing only the client’s catalog URL. A client must also be able to reach the FileIO URLs it receives. Remote clients, port remapping, and HTTPS need endpoint configuration beyond this local example. The [upstream guide](https://github.com/buzzcrow/crowdb/blob/main/doc/user-manual/docker-single-node-user-guide.md) is the source for those constraints.

## Know what this deployment cannot tell you

Everything runs on one host, so this deployment has no host fault tolerance. The configured sparse disk images are not a promise of usable capacity. Watch real filesystem space.

Physical reclamation is disabled in this profile: deleting Iceberg content can leave space occupied. Reusing a named volume is also not an upgrade strategy. Cross-version data migration is not promised; keep the exact image version with data you intend to reopen.

The repository reports container acceptance coverage for PyIceberg namespace/table operations and boto3 object operations. It does not certify Spark, Flink, Trino, dataframe workflows, or every file-format case through those checks. A familiar client name should not become an unsupported compatibility claim.

## Stop without throwing away the experiment

To stop and resume the same container:

```sh
docker stop --time 120 crowdb-iceberg
docker start crowdb-iceberg
```

When the experiment is finished, stop it before removing the container. The named volume remains unless you explicitly delete it. Never attach that volume to two running containers. For a backup, stop the container and follow the upstream instructions for copying the **entire** volume with its ownership and permissions intact.

Once the connection check works, the interesting work begins: test the table operation you actually need, inspect the logs, and record exactly what failed. That gives us more to work with than a broad claim that an engine is “supported.”

[Open the full evaluation guide →](https://crowdb.dev/docs/quickstart/)

<div class="source-note">Commands and deployment limits are adapted from the <a href="https://github.com/buzzcrow/crowdb/blob/main/doc/user-manual/docker-single-node-user-guide.md">CROWDB single-node container guide</a>, checked September 28, 2026. The namespace check above is a documented example, not a claim that it was executed while preparing this article. Check the <a href="https://hub.docker.com/r/crowdb/crowdb-iceberg/tags">public image tags</a> before evaluation.</div>
