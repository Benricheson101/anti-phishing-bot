package hasher

import (
	"bytes"
	"crypto/md5"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"hash"
	"image/png"
	"strconv"
	"sync"

	"github.com/benricheson101/anti-phishing-bot/abusive-user-checker/pkg/database/dbmodels"
	"github.com/benricheson101/anti-phishing-bot/abusive-user-checker/pkg/protos"
	"github.com/corona10/goimagehash"
)

type Hashes struct {
	SHA256, MD5 hash.Hash
	PHash       *goimagehash.ImageHash
}

func (h Hashes) ToProtobuf() *protos.ImageHashes {
	return &protos.ImageHashes{
		Md5:    hex.EncodeToString(h.MD5.Sum(nil)),
		Sha256: hex.EncodeToString(h.SHA256.Sum(nil)),
		PHash:  strconv.FormatUint(h.PHash.GetHash(), 16),
	}
}

func (h Hashes) ToDBImage() *dbmodels.DBImage {
	return &dbmodels.DBImage{
		MD5:    hex.EncodeToString(h.MD5.Sum(nil)),
		SHA256: hex.EncodeToString(h.SHA256.Sum(nil)),
		PHash:  strconv.FormatUint(h.PHash.GetHash(), 2),
	}
}

func HashImage(img []byte) *Hashes {
	var wg sync.WaitGroup
	var mu sync.Mutex
	wg.Add(3)

	var hashes Hashes

	// sha256
	go func(img []byte, hashes *Hashes) {
		defer wg.Done()

		sha256Hash := sha256.New()
		sha256Hash.Write(img)

		mu.Lock()
		defer mu.Unlock()
		hashes.SHA256 = sha256Hash

	}(img, &hashes)

	// phash
	go func(img []byte, hashes *Hashes) {
		defer wg.Done()

		i, err := png.Decode(bytes.NewBuffer(img))
		if err != nil {
			fmt.Printf("failed to decode png: %v\n", err)
			return
		}

		phash, err := goimagehash.PerceptionHash(i)
		if err != nil {
			fmt.Printf("failed to calculate perceptual hash of image: %v\n", err)
			return
		}

		mu.Lock()
		defer mu.Unlock()
		hashes.PHash = phash
	}(img, &hashes)

	// md5
	go func(img []byte, hashes *Hashes) {
		defer wg.Done()

		md5Hash := md5.New()
		md5Hash.Write(img)

		mu.Lock()
		defer mu.Unlock()
		hashes.MD5 = md5Hash
	}(img, &hashes)

	wg.Wait()

	return &hashes
}
