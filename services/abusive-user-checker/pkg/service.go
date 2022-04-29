package pkg

import (
	"bytes"
	"context"
	"database/sql"
	"errors"
	"fmt"
	"image/png"
	"os"

	"github.com/benricheson101/anti-phishing-bot/abusive-user-checker/pkg/database"
	"github.com/benricheson101/anti-phishing-bot/abusive-user-checker/pkg/hasher"
	"github.com/benricheson101/anti-phishing-bot/abusive-user-checker/pkg/protos"
	"github.com/benricheson101/anti-phishing-bot/abusive-user-checker/pkg/utils"
	"github.com/corona10/goimagehash"
)

type AbusiveUserServiceServer struct {
	protos.UnimplementedAbusiveUserServiceServer
}

func addImage(img []byte, url *string) (*protos.AddImageResponse, error) {
	ret := &protos.AddImageResponse{}

	hashes := hasher.HashImage(img)
	ret.Hashes = hashes.ToProtobuf()

	dbImg := hashes.ToDBImage()
	dbImg.Source = url

	res, err := database.CreateImage(context.Background(), dbImg)
	if err != nil {
		fmt.Printf("failed to create image in database: %v\n", err)
		return nil, err
	}

	rows, _ := res.RowsAffected()
	if rows == 0 {
		return nil, errors.New("failed to insert iamge")
	}

	ret.Id = int32(dbImg.Id)

	return ret, nil
}

func (*AbusiveUserServiceServer) AddImageFromURL(ctx context.Context, req *protos.AddImageFromURLRequest) (*protos.AddImageResponse, error) {
	url := req.GetUrl()
	dlImg, err := utils.DownloadImage(url)
	if err != nil {
		fmt.Println("failed to download image:", err)
		return nil, err
	}

	return addImage(dlImg, &url)
}

func (*AbusiveUserServiceServer) AddImage(ctx context.Context, req *protos.AddImageRequest) (*protos.AddImageResponse, error) {
	img := req.GetImage()
	return addImage(img, nil)
}

func (*AbusiveUserServiceServer) RemoveImage(ctx context.Context, req *protos.RemoveImageRequest) (*protos.RemoveImageResponse, error) {
	id := req.GetId()

	deleted, err := database.RemoveImage(context.Background(), id)
	if err != nil {
		return nil, err
	}

	if !deleted {
		return nil, errors.New("image does not exist")
	}

	return &protos.RemoveImageResponse{}, nil
}

func (*AbusiveUserServiceServer) CheckImage(ctx context.Context, req *protos.CheckImageRequest) (*protos.CheckImageResponse, error) {
	url := req.GetUrl()

	dlImg, err := utils.DownloadImage(url)
	if err != nil {
		return nil, err
	}

	img, err := png.Decode(bytes.NewBuffer(dlImg))
	if err != nil {
		return nil, err
	}

	phash, err := goimagehash.PerceptionHash(img)
	if err != nil {
		return nil, err
	}

	checked, err := database.GetMostSimilarImage(context.Background(), phash.GetHash())
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			fmt.Fprintln(os.Stderr, "match not found (is the database empty?)")
		}

		return nil, err
	}

	// proto3 removed the ability to make nullable fields,
	// so ill use an empty string instead
	source := ""
	if checked.Source != nil {
		source = *checked.Source
	}

	return &protos.CheckImageResponse{
		Id:            int32(checked.Id),
		PhashDistance: int32(checked.HammingDistance),
		Source:        source,
		Hashes: &protos.ImageHashes{
			Md5:    checked.MD5,
			Sha256: checked.SHA256,
			PHash:  checked.GetPHashHex(),
		},
	}, nil
}

// TODO: check username
