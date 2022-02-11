package services

import (
	"context"
	"fmt"

	"github.com/benricheson101/anti-phishing-bot/abusive-user-checker/pkg/protos"
)

type ImageComparisonServer struct {
	protos.UnimplementedImageComparisonServiceServer
}

func (i *ImageComparisonServer) Compare(ctx context.Context, req *protos.ImageComparisonRequest) (*protos.ImageComparisonResponse, error) {
	userId := req.UserId
	avatarHash := req.AvatarHash

	fmt.Printf("https://cdn.discordapp.com/avatars/%v/%v.png\n", userId, avatarHash)

	ret := &protos.ImageComparisonResponse{
		Distance: 32,
	}

	return ret, nil
}
