<h1 align="center">Abusive User Checker Service ⚠️</h1>

This service stores hashes of profile pictures of known scam accounts in a database, and provides an API for comparing an image against those stored in the database.

## Usage:
**Set environment variables**:
```sh
DATABASE_URL='postgres://user:pass@host/db'
GRPC_ADDR=':3000'

```

---

**Generate protobuf files**: run the `/scripts/make_protos` script in the repository root

---

**Run database migrations**:
For database migrations, I use a tool called [dbmate](https://github.com/amacneil/dbmate). Run `dbmate up` to run migrations.

---

**Start the service**: `go run cmd/server/main.go`

---

**Add images**:
```sh
grpcurl \
  --plaintext \
  -d '{"url": "https://cdn.discordapp.com/attachments/591093389366263828/942891874790821918/ben_wah_ben_wah_but_pink.png"}' \
  localhost:3000 \
  fish.HasherService.AddImageFromURL
```

returns
```json
{
  "hashes": {
    "md5": "3b9ca26913c99bbf28e247dc450e2b08",
    "sha256": "cef4a08e433ddce06b7797f68e2ebad88090b2c20659dbf143793cb8b2dc667d",
    "pHash": "fa6a8594c5cd9266"
  }
}
```

---

**Check images**:
```sh
grpcurl \
  --plaintext \
  -d '{"url": "https://cdn.discordapp.com/attachments/591093389366263828/942891874790821918/ben_wah_ben_wah_but_pink.png"}' \
  localhost:3000 \
  fish.CheckerService.CheckImage
```

returns
```json
{
  "id": 1,
  "phash_distance": 4,
  "hashes": {
    "md5": "3b9ca26913c99bbf28e247dc450e2b08",
    "sha256": "cef4a08e433ddce06b7797f68e2ebad88090b2c20659dbf143793cb8b2dc667d",
    "pHash": "fa6a8594c5cd9266"
  }
}
```
