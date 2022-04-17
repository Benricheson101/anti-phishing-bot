package main

import (
	"fmt"
	"log"
	"net"
	"os"

	pkg "github.com/benricheson101/anti-phishing-bot/abusive-user-checker/pkg"
	protos "github.com/benricheson101/anti-phishing-bot/abusive-user-checker/pkg/protos"

	// "github.com/benricheson101/anti-phishing-bot/abusive-user-checker/pkg/services"
	"github.com/joho/godotenv"
	"google.golang.org/grpc"
	"google.golang.org/grpc/reflection"

	"github.com/benricheson101/anti-phishing-bot/abusive-user-checker/pkg/database"
)

func init() {
	godotenv.Load()
}

func main() {
	s := grpc.NewServer()
	reflection.Register(s)

	protos.RegisterAbusiveUserServiceServer(s, &pkg.AbusiveUserServiceServer{})

	// protos.RegisterHasherServiceServer(s, &services.HasherServiceServer{})
	// protos.RegisterCheckerServiceServer(s, &services.CheckerServiceServer{})

	grpcAddr := os.Getenv("GRPC_ADDR")

	lis, err := net.Listen("tcp", grpcAddr)
	if err != nil {
		log.Fatalf("failed to listen on %v\n", lis.Addr())
	}

	dsn := os.Getenv("DATABASE_URL")
	err = database.InitDB(dsn)
	if err != nil {
		panic(err)
	}

	fmt.Printf("gRPC server running on addr=%v\n", grpcAddr)

	log.Fatal(s.Serve(lis))
}
