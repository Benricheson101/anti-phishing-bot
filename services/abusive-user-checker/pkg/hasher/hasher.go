package hasher

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"image/png"
	"sync"

	"github.com/corona10/goimagehash"

	"github.com/benricheson101/anti-phishing-bot/abusive-user-checker/pkg/protos"
)

func AllHashes(img []byte) *protos.ImageHashes {
	hashes := protos.ImageHashes{}

	wg := sync.WaitGroup{}
	mu := &sync.Mutex{}

	asImage, err := png.Decode(bytes.NewBuffer(img))
	if err != nil {
		fmt.Println("unable to decode png:", err)
		return nil
	}

	//sha256
	wg.Add(1)
	go func(hashes *protos.ImageHashes) {
		defer wg.Done()

		h := sha256.New()

		_, err := h.Write(img)
		if err != nil {
			fmt.Printf("sha256 failed: %v\n", err)
			return
		}

		asString := hex.EncodeToString(h.Sum(nil))

		mu.Lock()
		defer mu.Unlock()
		hashes.Sha256 = asString
	}(&hashes)

	// aHash
	wg.Add(1)
	go func(hashes *protos.ImageHashes) {
		defer wg.Done()

		h, err := goimagehash.AverageHash(asImage)
		if err != nil {
			fmt.Printf("ahash failed: %v\n", err)
			return
		}

		asString := fmt.Sprintf("%16x", h.GetHash())

		mu.Lock()
		defer mu.Unlock()
		hashes.AHash = asString
	}(&hashes)

	// dHash
	wg.Add(1)
	go func(hashes *protos.ImageHashes) {
		defer wg.Done()

		h, err := goimagehash.DifferenceHash(asImage)
		if err != nil {
			fmt.Printf("ahash failed: %v\n", err)
			return
		}

		asString := fmt.Sprintf("%16x", h.GetHash())

		mu.Lock()
		defer mu.Unlock()
		hashes.DHash = asString
	}(&hashes)

	// pHash
	wg.Add(1)
	go func(hashes *protos.ImageHashes) {
		defer wg.Done()

		h, err := goimagehash.PerceptionHash(asImage)
		if err != nil {
			fmt.Printf("ahash failed: %v\n", err)
			return
		}

		asString := fmt.Sprintf("%16x", h.GetHash())

		mu.Lock()
		defer mu.Unlock()
		hashes.PHash = asString
	}(&hashes)

	wg.Wait()

	return &hashes
}
