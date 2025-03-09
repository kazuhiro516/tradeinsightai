package usecases

import (
	"context"
	"fmt"
	"io"
	"log/slog"
	"mime/multipart"
	"server/domain"
	"server/utils"
)

type TradeRecordUsecase interface {
	FilterTrades(ctx context.Context, filter domain.TradeFilter) ([]domain.TradeRecord, error)
	CreateTradeRecord(ctx context.Context, record *domain.TradeRecord) error
	BatchCreateTradeRecords(ctx context.Context, records []domain.TradeRecord, batchSize int) error
	GetTradeRecordByID(ctx context.Context, id int) (*domain.TradeRecord, error)
	GetAllTradeRecords(ctx context.Context) ([]domain.TradeRecord, error)
	UpdateTradeRecord(ctx context.Context, record *domain.TradeRecord) error
	DeleteTradeRecord(ctx context.Context, id int) error
	ProcessHTMLFile(ctx context.Context, file multipart.File, filename string) (int, error)
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

// ProcessHTMLFile はHTMLファイルを処理し、TradeRecordに変換して保存します
func (uc *tradeRecordUsecase) ProcessHTMLFile(ctx context.Context, file multipart.File, filename string) (int, error) {
	// ファイルの内容を読み取り
	content, err := io.ReadAll(file)
	if err != nil {
		return 0, fmt.Errorf("failed to read file: %w", err)
	}

	// HTMLコンテンツをTradeRecordに変換
	tradeRecords, err := utils.ParseHTMLToTradeRecords(content)
	if err != nil {
		return 0, fmt.Errorf("failed to parse HTML content: %w", err)
	}

	if len(tradeRecords) == 0 {
		return 0, fmt.Errorf("no valid trade records found in the file")
	}

	// バッチサイズ（適宜調整可能）
	batchSize := 100

	// トレードレコードをバッチ保存
	err = uc.BatchCreateTradeRecords(ctx, tradeRecords, batchSize)
	if err != nil {
		return 0, fmt.Errorf("failed to save trade records: %w", err)
	}

	slog.InfoContext(ctx, "Trade records processed from HTML file",
		slog.String("filename", filename),
		slog.Int("records_count", len(tradeRecords)))

	return len(tradeRecords), nil
}
