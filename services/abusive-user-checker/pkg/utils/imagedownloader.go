package utils

import (
	"errors"
	"fmt"
	"io/ioutil"
	"net/http"
	"strconv"
)

func DownloadImage(url string) ([]byte, error) {
	resp, err := http.Get(url)
	if err != nil {
		fmt.Printf("failed to download image: %v\n", err)
		return nil, err
	}

	if resp.StatusCode != 200 {
		return nil, errors.New("server responded with non-200 code: " + strconv.Itoa(resp.StatusCode))
	}

	contentType := resp.Header.Get("Content-Type")
	// TODO: support more than just PNG?
	if contentType != "image/png" {
		return nil, errors.New("Content-Type must be one of: image/png")
	}

	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	return body, nil
}
