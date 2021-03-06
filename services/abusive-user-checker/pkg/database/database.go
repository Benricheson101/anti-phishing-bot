package database

import (
	"context"
	"database/sql"
	"strconv"
	"strings"
	"sync"

	"github.com/benricheson101/anti-phishing-bot/abusive-user-checker/pkg/database/dbmodels"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect/pgdialect"
	"github.com/uptrace/bun/driver/pgdriver"
)

var db *bun.DB
var initDbOnce sync.Once

func InitDB(dsn string) error {
	initDbOnce.Do(func() {
		sqldb := sql.OpenDB(pgdriver.NewConnector(pgdriver.WithDSN(dsn)))
		db = bun.NewDB(sqldb, pgdialect.New())
	})

	return db.Ping()
}

func GetDB() *bun.DB {
	return db
}

func CreateImage(ctx context.Context, img *dbmodels.DBImage) (sql.Result, error) {
	return db.NewInsert().
		Model(img).
		Exec(ctx)
}

func GetImage(ctx context.Context, id int64) (*dbmodels.DBImage, error) {
	var result *dbmodels.DBImage

	err := db.NewSelect().
		Model(result).
		Where("id = ?", id).
		Scan(ctx)

	return result, err
}

type SimilarImageResponse struct {
	dbmodels.DBImage
	HammingDistance int `bun:"hamming_distance"`
}

func GetMostSimilarImage(ctx context.Context, phash uint64) (*SimilarImageResponse, error) {
	bits := (strings.Repeat("0", 64) + strconv.FormatUint(phash, 2))
	bits = bits[len(bits)-64:]

	var out SimilarImageResponse
	err := db.
		NewSelect().
		Model((*dbmodels.DBImage)(nil)).
		Column("*").
		ColumnExpr("BIT_COUNT(phash # ?) AS hamming_distance", bun.Safe("b'"+bits+"'")).
		OrderExpr("hamming_distance ASC").
		Limit(1).
		Scan(ctx, &out)

	return &out, err
}

func RemoveImage(ctx context.Context, id int32) (bool, error) {
	res, err := db.
		NewDelete().
		Model((*dbmodels.DBImage)(nil)).
		Where("id = ?", id).
		Exec(ctx)

	rows, rowsErr := res.RowsAffected()
	if rowsErr != nil {
		return false, rowsErr
	}

	return rows != 0, err
}
