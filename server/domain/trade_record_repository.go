package domain

import "context"

// TradeRecordRepository はトレードレコードのリポジトリインターフェース
type TradeRecordRepository interface {
	CreateTradeRecord(ctx context.Context, record *TradeRecord) error
	BatchCreateTradeRecords(ctx context.Context, records []TradeRecord, batchSize int) error
	GetTradeRecordByID(ctx context.Context, id int) (*TradeRecord, error)
	GetAllTradeRecords(ctx context.Context) ([]TradeRecord, error)
	GetTradeRecordsByFilter(ctx context.Context, filter TradeFilter) ([]TradeRecord, error)
	UpdateTradeRecord(ctx context.Context, record *TradeRecord) error
	DeleteTradeRecord(ctx context.Context, id int) error
}
