package infrastructures

import (
	"context"
	"server/domain"

	"gorm.io/gorm"
)

// tradeRecordRepository は GORM を使用したトレードリポジトリの実装
type tradeRecordRepository struct {
	db *gorm.DB
}

// NewGORMTradeRepository は tradeRecordRepository のインスタンスを作成します
func NewTradeRecordRepository(db *gorm.DB) domain.TradeRecordRepository {
	return &tradeRecordRepository{db: db}
}

// CreateTradeRecord は新しいトレードレコードを作成します
func (r *tradeRecordRepository) CreateTradeRecord(ctx context.Context, record *domain.TradeRecord) error {
	return r.db.WithContext(ctx).Create(record).Error
}

// GetTradeRecordByID はIDによってトレードレコードを取得します
func (r *tradeRecordRepository) GetTradeRecordByID(ctx context.Context, id int) (*domain.TradeRecord, error) {
	var record domain.TradeRecord
	err := r.db.WithContext(ctx).Where("ticket = ?", id).First(&record).Error
	if err != nil {
		return nil, err
	}
	return &record, nil
}

// GetAllTradeRecords は全てのトレードレコードを取得します
func (r *tradeRecordRepository) GetAllTradeRecords(ctx context.Context) ([]domain.TradeRecord, error) {
	var records []domain.TradeRecord
	err := r.db.WithContext(ctx).Find(&records).Error
	if err != nil {
		return nil, err
	}
	return records, nil
}

// GetTradeRecordsByFilter はフィルタに基づいてトレードレコードを取得します
func (r *tradeRecordRepository) GetTradeRecordsByFilter(ctx context.Context, filter domain.TradeFilter) ([]domain.TradeRecord, error) {
	var records []domain.TradeRecord
	query := r.db.WithContext(ctx)

	// チケット番号フィルター
	if len(filter.TicketIDs) > 0 {
		query = query.Where("ticket IN ?", filter.TicketIDs)
	}

	// 日付範囲のフィルター
	if filter.StartDate != nil {
		query = query.Where("open_time >= ?", filter.StartDate)
	}
	if filter.EndDate != nil {
		query = query.Where("open_time <= ?", filter.EndDate)
	}

	// 取引タイプのフィルター
	if len(filter.Types) > 0 {
		query = query.Where("type IN ?", filter.Types)
	}

	// 通貨ペア/商品のフィルター
	if len(filter.Items) > 0 {
		query = query.Where("item IN ?", filter.Items)
	}

	// サイズ範囲のフィルター
	if filter.SizeMin != nil {
		query = query.Where("size >= ?", *filter.SizeMin)
	}
	if filter.SizeMax != nil {
		query = query.Where("size <= ?", *filter.SizeMax)
	}

	// エントリー価格範囲のフィルター
	if filter.OpenPriceMin != nil {
		query = query.Where("open_price >= ?", *filter.OpenPriceMin)
	}
	if filter.OpenPriceMax != nil {
		query = query.Where("open_price <= ?", *filter.OpenPriceMax)
	}

	// 利益範囲のフィルター
	if filter.ProfitMin != nil {
		query = query.Where("profit >= ?", *filter.ProfitMin)
	}
	if filter.ProfitMax != nil {
		query = query.Where("profit <= ?", *filter.ProfitMax)
	}

	// ソート処理
	if filter.SortBy != "" {
		sortOrder := "asc"
		if filter.SortOrder == "desc" {
			sortOrder = "desc"
		}
		query = query.Order(filter.SortBy + " " + sortOrder)
	} else {
		// デフォルトのソート順
		query = query.Order("open_time desc")
	}

	// ページングの処理
	if filter.Page > 0 && filter.PageSize > 0 {
		offset := (filter.Page - 1) * filter.PageSize
		query = query.Offset(offset).Limit(filter.PageSize)
	}

	err := query.Find(&records).Error
	if err != nil {
		return nil, err
	}
	return records, nil
}

// UpdateTradeRecord はトレードレコードを更新します
func (r *tradeRecordRepository) UpdateTradeRecord(ctx context.Context, record *domain.TradeRecord) error {
	return r.db.WithContext(ctx).Save(record).Error
}

// DeleteTradeRecord はトレードレコードを削除します
func (r *tradeRecordRepository) DeleteTradeRecord(ctx context.Context, id int) error {
	return r.db.WithContext(ctx).Where("ticket = ?", id).Delete(&domain.TradeRecord{}).Error
}

// BatchCreateTradeRecords は複数のトレードレコードをバッチで作成します
func (r *tradeRecordRepository) BatchCreateTradeRecords(ctx context.Context, records []domain.TradeRecord, batchSize int) error {
	// バッチサイズのデフォルト値
	if batchSize <= 0 {
		batchSize = 100
	}

	// トランザクションを開始
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// バッチ処理でレコードを作成
		err := tx.CreateInBatches(records, batchSize).Error
		if err != nil {
			return err
		}
		return nil
	})
}
