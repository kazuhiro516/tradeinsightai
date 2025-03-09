package domain

import "time"

// TradeFileStatus はファイル処理ステータスを表します
type TradeFileStatus string

const (
	FileStatusPending    TradeFileStatus = "pending"
	FileStatusProcessing TradeFileStatus = "processing"
	FileStatusCompleted  TradeFileStatus = "completed"
	FileStatusFailed     TradeFileStatus = "failed"
)

// TradeFile はアップロードされたトレードファイルの情報を表します
type TradeFile struct {
	ID           uint            `json:"id" gorm:"primaryKey"`
	FileName     string          `json:"fileName" gorm:"not null"`        // ファイル名
	UploadDate   time.Time       `json:"uploadDate" gorm:"not null"`      // アップロード日時
	FileSize     int64           `json:"fileSize"`                        // ファイルサイズ（バイト）
	FileType     string          `json:"fileType"`                        // ファイルタイプ（例: text/html）
	Status       TradeFileStatus `json:"status" gorm:"default:'pending'"` // 処理ステータス
	RecordsCount int             `json:"recordsCount" gorm:"default:0"`   // 処理されたレコード数
	ErrorMessage string          `json:"errorMessage,omitempty"`          // エラーメッセージ（失敗時）
	CreatedAt    time.Time       `json:"createdAt" gorm:"autoCreateTime"`
	UpdatedAt    time.Time       `json:"updatedAt" gorm:"autoUpdateTime"`
}
