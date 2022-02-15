package services

import (
	"context"
	"fmt"

	"github.com/benricheson101/anti-phishing-bot/abusive-user-checker/pkg/database"
	"github.com/benricheson101/anti-phishing-bot/abusive-user-checker/pkg/hasher"
	"github.com/benricheson101/anti-phishing-bot/abusive-user-checker/pkg/protos"
	"github.com/benricheson101/anti-phishing-bot/abusive-user-checker/pkg/utils"
)

type HasherServiceServer struct {
	protos.UnimplementedHasherServiceServer
}

func (*HasherServiceServer) AddImageFromURL(ctx context.Context, req *protos.AddImageFromURLRequest) (*protos.AddImageResponse, error) {
	url := req.GetUrl()
	dlImg, err := utils.DownloadImage(url)
	if err != nil {
		fmt.Println("failed to download image:", err)
		return nil, err
	}

	ret := &protos.AddImageResponse{}

	hashes := hasher.HashImage(dlImg)
	ret.Hashes = hashes.ToProtobuf()

	dbImg := hashes.ToDBImage()
	dbImg.Source = url

	_, err = database.CreateImage(context.Background(), dbImg)
	if err != nil {
		fmt.Printf("failed to create image in database: %v\n", err)
		return nil, err
	}
	ret.Id = dbImg.Id

	return ret, nil
}
