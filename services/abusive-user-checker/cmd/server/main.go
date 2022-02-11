package main

import (
	"log"
	"net"

	protos "github.com/benricheson101/anti-phishing-bot/abusive-user-checker/pkg/protos"
	"github.com/benricheson101/anti-phishing-bot/abusive-user-checker/pkg/services"
	"google.golang.org/grpc"
	"google.golang.org/grpc/reflection"
)

func main() {
	s := grpc.NewServer()
	// protos.RegisterImageComparisonServiceServer(s, &services.ImageComparisonServer{})

	protos.RegisterHasherServiceServer(s, &services.HasherServiceServer{})

	reflection.Register(s)

	lis, err := net.Listen("tcp", ":3000")
	if err != nil {
		log.Fatalf("failed to listen on %v\n", lis.Addr())
	}

	log.Fatal(s.Serve(lis))
}
