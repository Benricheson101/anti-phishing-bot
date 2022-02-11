package services

import (
	"context"
	"errors"
	"fmt"
	"io/ioutil"
	"net/http"

	"github.com/benricheson101/anti-phishing-bot/abusive-user-checker/pkg/hasher"
	"github.com/benricheson101/anti-phishing-bot/abusive-user-checker/pkg/protos"
	"google.golang.org/protobuf/types/known/emptypb"
)

type HasherServiceServer struct {
	protos.UnimplementedHasherServiceServer
}

func (*HasherServiceServer) Add(ctx context.Context, req *protos.AddImageRequest) (*protos.AddImageResponse, error) {
	fmt.Println("call HasherServiceServer::Add")
	return nil, nil
}

func (*HasherServiceServer) AddImageFromURL(ctx context.Context, req *protos.AddImageFromURLRequest) (*protos.AddImageResponse, error) {
	fmt.Println("call HasherServiceServer::AddImageFromURL")
	return nil, nil
}

func (*HasherServiceServer) Remove(ctx context.Context, req *protos.RemoveImageRequest) (*emptypb.Empty, error) {
	fmt.Println("call HasherServiceServer::Remove")
	return nil, nil
}

func (*HasherServiceServer) Hash(ctx context.Context, req *protos.HashImageRequest) (*protos.HashImageResponse, error) {
	fmt.Println("call HasherServiceServer::Hash")
	return nil, nil
}

func (*HasherServiceServer) HashImageFromURL(ctx context.Context, req *protos.HashImageFromURLRequest) (*protos.HashImageResponse, error) {
	fmt.Println("call HasherServiceServer::HashImageFromURL")
	url := req.GetUrl()

	img, err := dlImg(url)
	if err != nil {
		fmt.Println("error downloading image:", err)
		return nil, err
	}

	allHashes := hasher.AllHashes(img)
	// fmt.Println("allHashes =", allHashes)

	// fmt.Printf("url=%v\n", url)

	ret := protos.HashImageResponse{
		Hashes: allHashes,
	}

	return &ret, nil
}

func dlImg(url string) ([]byte, error) {
	resp, err := http.Get(url)
	if err != nil {
		return nil, err
	}

	ct := resp.Header.Get("Content-Type")

	// TODO: support more than just PNG?
	if ct != "image/png" {
		return nil, errors.New("Content-Type must be one of: image/png")
	}

	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	return body, nil
}
