package dbmodels

import (
	"strconv"

	"github.com/uptrace/bun"
)

type DBImage struct {
	bun.BaseModel `bun:"table:images"`

	Id     int64  `bun:"id,pk,autoincrement"`
	Source string `bun:"source,unique,notnull"`

	MD5    string `bun:"md5,unique,notnull"`
	SHA256 string `bun:"sha256,unique,notnull"`
	PHash  string `bun:"phash,type:numeric,unique,notnull"`
}

func (d DBImage) GetPHashHex() string {
	ui, _ := strconv.ParseUint(d.PHash, 2, 64)
	return strconv.FormatUint(ui, 16)
}
