package api

import (
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
)

func UploadFile(file multipart.File, header *multipart.FileHeader, subDir string) (string, error) {
	dir := filepath.Join("_uploads", subDir)
	if err := os.MkdirAll(dir, os.ModePerm); err != nil {
		return "", err
	}

	pathName := filepath.Join(dir, header.Filename)
	
	dst, err := os.Create(pathName)
	if err != nil {
		return "", err
	}
	defer dst.Close()

	if _, err := io.Copy(dst, file); err != nil {
		return "", err
	}

	urlPath := filepath.Join("/uploads", subDir, header.Filename)
	urlPath = filepath.ToSlash(urlPath)
	
	return urlPath, nil
}
