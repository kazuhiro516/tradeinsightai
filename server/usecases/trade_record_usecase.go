package usecases

import (
	"context"
	"fmt"
	"log/slog"
	"server/domain"
)

type TradeRecordUsecase interface {
	FilterTrades(ctx context.Context, filter domain.TradeFilter) ([]domain.TradeRecord, error)
	CreateTradeRecord(ctx context.Context, record *domain.TradeRecord) error
	BatchCreateTradeRecords(ctx context.Context, records []domain.TradeRecord, batchSize int) error
	GetTradeRecordByID(ctx context.Context, id int) (*domain.TradeRecord, error)
	GetAllTradeRecords(ctx context.Context) ([]domain.TradeRecord, error)
	UpdateTradeRecord(ctx context.Context, record *domain.TradeRecord) error
	DeleteTradeRecord(ctx context.Context, id int) error
}

type tradeRecordUsecase struct {
	tradeRepo domain.TradeRecordRepository
}

func NewTradeRecordUsecase(repo domain.TradeRecordRepository) TradeRecordUsecase {
	return &tradeRecordUsecase{
		tradeRepo: repo,
	}
}

func (uc *tradeRecordUsecase) FilterTrades(ctx context.Context, filter domain.TradeFilter) ([]domain.TradeRecord, error) {
	tradeRecords, err := uc.tradeRepo.GetTradeRecordsByFilter(ctx, filter)
	if err != nil {
		return []domain.TradeRecord{}, fmt.Errorf("get trade records by filter: %w", err)
	}
	slog.InfoContext(ctx, "trade records filtered", slog.Any("records", tradeRecords))

	return tradeRecords, nil
}

// CreateTradeRecord は新しいトレードレコードを作成します
func (uc *tradeRecordUsecase) CreateTradeRecord(ctx context.Context, record *domain.TradeRecord) error {
	if err := uc.tradeRepo.CreateTradeRecord(ctx, record); err != nil {
		return fmt.Errorf("create trade record: %w", err)
	}
	slog.InfoContext(ctx, "trade record created", slog.Any("record", record))
	return nil
}

// BatchCreateTradeRecords は複数のトレードレコードをバッチで作成します
func (uc *tradeRecordUsecase) BatchCreateTradeRecords(ctx context.Context, records []domain.TradeRecord, batchSize int) error {
	if err := uc.tradeRepo.BatchCreateTradeRecords(ctx, records, batchSize); err != nil {
		return fmt.Errorf("batch create trade records: %w", err)
	}
	slog.InfoContext(ctx, "trade records batch created", slog.Int("count", len(records)))
	return nil
}

// GetTradeRecordByID はIDによってトレードレコードを取得します
func (uc *tradeRecordUsecase) GetTradeRecordByID(ctx context.Context, id int) (*domain.TradeRecord, error) {
	record, err := uc.tradeRepo.GetTradeRecordByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("get trade record by id: %w", err)
	}
	slog.InfoContext(ctx, "trade record retrieved", slog.Int("id", id))
	return record, nil
}

// GetAllTradeRecords は全てのトレードレコードを取得します
func (uc *tradeRecordUsecase) GetAllTradeRecords(ctx context.Context) ([]domain.TradeRecord, error) {
	records, err := uc.tradeRepo.GetAllTradeRecords(ctx)
	if err != nil {
		return nil, fmt.Errorf("get all trade records: %w", err)
	}
	slog.InfoContext(ctx, "all trade records retrieved", slog.Int("count", len(records)))
	return records, nil
}

// UpdateTradeRecord はトレードレコードを更新します
func (uc *tradeRecordUsecase) UpdateTradeRecord(ctx context.Context, record *domain.TradeRecord) error {
	if err := uc.tradeRepo.UpdateTradeRecord(ctx, record); err != nil {
		return fmt.Errorf("update trade record: %w", err)
	}
	slog.InfoContext(ctx, "trade record updated", slog.Any("record", record))
	return nil
}

// DeleteTradeRecord はトレードレコードを削除します
func (uc *tradeRecordUsecase) DeleteTradeRecord(ctx context.Context, id int) error {
	if err := uc.tradeRepo.DeleteTradeRecord(ctx, id); err != nil {
		return fmt.Errorf("delete trade record: %w", err)
	}
	slog.InfoContext(ctx, "trade record deleted", slog.Int("id", id))
	return nil
}
