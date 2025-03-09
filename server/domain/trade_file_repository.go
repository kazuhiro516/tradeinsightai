package domain

import (
	"context"
)

// TradeFileRepository はTradeFile関連のデータアクセス操作を定義します
type TradeFileRepository interface {
	// CreateTradeFile は新しいTradeFileをデータベースに保存します
	CreateTradeFile(ctx context.Context, file *TradeFile) error

	// GetTradeFileByID は指定されたIDのTradeFileを取得します
	GetTradeFileByID(ctx context.Context, id int) (*TradeFile, error)

	// UpdateTradeFile は既存のTradeFileを更新します
	UpdateTradeFile(ctx context.Context, file *TradeFile) error

	// DeleteTradeFile は指定されたIDのTradeFileを削除します
	DeleteTradeFile(ctx context.Context, id int) error

	// GetAllTradeFiles は全てのTradeFileを取得します
	GetAllTradeFiles(ctx context.Context) ([]TradeFile, error)

	// GetTradeFilesByStatus は指定されたステータスのTradeFileを取得します
	GetTradeFilesByStatus(ctx context.Context, status TradeFileStatus) ([]TradeFile, error)
}
