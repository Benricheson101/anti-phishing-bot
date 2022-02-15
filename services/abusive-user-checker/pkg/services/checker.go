package services

import (
	"bytes"
	"context"
	"image/png"

	"github.com/benricheson101/anti-phishing-bot/abusive-user-checker/pkg/database"
	"github.com/benricheson101/anti-phishing-bot/abusive-user-checker/pkg/protos"
	"github.com/benricheson101/anti-phishing-bot/abusive-user-checker/pkg/utils"
	"github.com/corona10/goimagehash"
)

type CheckerServiceServer struct {
	protos.UnimplementedCheckerServiceServer
}

func (*CheckerServiceServer) CheckImage(ctx context.Context, req *protos.CheckImageRequest) (*protos.CheckImageResponse, error) {
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
		return nil, err
	}

	return &protos.CheckImageResponse{
		Id:            int32(checked.Id),
		PhashDistance: int32(checked.HammingDistance),
		Hashes: &protos.ImageHashes{
			Md5:    checked.MD5,
			Sha256: checked.SHA256,
			PHash:  checked.GetPHashHex(),
		},
	}, nil
}
