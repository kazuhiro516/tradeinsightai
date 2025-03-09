package infrastructures

import (
	"context"
	"errors"
	"fmt"
	"server/domain"

	"gorm.io/gorm"
)

// tradeFileRepository はTradeFileRepositoryの実装です
type tradeFileRepository struct {
	db *gorm.DB
}

func NewTradeFileRepository(db *gorm.DB) domain.TradeFileRepository {
	return &tradeFileRepository{
		db: db,
	}
}

// CreateTradeFile は新しいTradeFileを作成します
func (r *tradeFileRepository) CreateTradeFile(ctx context.Context, file *domain.TradeFile) error {
	result := r.db.WithContext(ctx).Create(file)
	if result.Error != nil {
		return fmt.Errorf("failed to create trade file: %w", result.Error)
	}
	return nil
}

// GetTradeFileByID は指定されたIDのTradeFileを取得します
func (r *tradeFileRepository) GetTradeFileByID(ctx context.Context, id int) (*domain.TradeFile, error) {
	var file domain.TradeFile
	result := r.db.WithContext(ctx).First(&file, id)
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("trade file not found with id %d", id)
		}
		return nil, fmt.Errorf("failed to get trade file: %w", result.Error)
	}
	return &file, nil
}

// UpdateTradeFile は既存のTradeFileを更新します
func (r *tradeFileRepository) UpdateTradeFile(ctx context.Context, file *domain.TradeFile) error {
	result := r.db.WithContext(ctx).Save(file)
	if result.Error != nil {
		return fmt.Errorf("failed to update trade file: %w", result.Error)
	}
	return nil
}

// DeleteTradeFile は指定されたIDのTradeFileを削除します
func (r *tradeFileRepository) DeleteTradeFile(ctx context.Context, id int) error {
	result := r.db.WithContext(ctx).Delete(&domain.TradeFile{}, id)
	if result.Error != nil {
		return fmt.Errorf("failed to delete trade file: %w", result.Error)
	}
	if result.RowsAffected == 0 {
		return fmt.Errorf("trade file not found with id %d", id)
	}
	return nil
}

// GetAllTradeFiles は全てのTradeFileを取得します
func (r *tradeFileRepository) GetAllTradeFiles(ctx context.Context) ([]domain.TradeFile, error) {
	var files []domain.TradeFile
	result := r.db.WithContext(ctx).Find(&files)
	if result.Error != nil {
		return nil, fmt.Errorf("failed to get all trade files: %w", result.Error)
	}
	return files, nil
}

// GetTradeFilesByStatus は指定されたステータスのTradeFileを取得します
func (r *tradeFileRepository) GetTradeFilesByStatus(ctx context.Context, status domain.TradeFileStatus) ([]domain.TradeFile, error) {
	var files []domain.TradeFile
	result := r.db.WithContext(ctx).Where("status = ?", status).Find(&files)
	if result.Error != nil {
		return nil, fmt.Errorf("failed to get trade files by status: %w", result.Error)
	}
	return files, nil
}
