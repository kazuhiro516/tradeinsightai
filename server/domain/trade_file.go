package domain

import "time"

type TradeFile struct {
	FileName   string    `json:"fileName"`   // ファイル名
	UploadDate time.Time `json:"uploadDate"` // アップロード日時
	FileSize   int64     `json:"fileSize"`   // ファイルサイズ（バイト）
	FileType   string    `json:"fileType"`   // ファイルタイプ（例: text/html）
}
