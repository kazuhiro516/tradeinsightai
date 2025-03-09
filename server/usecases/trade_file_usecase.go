package usecases

import (
	"context"
	"server/domain"
)

// TradeFileUsecase はトレードファイル関連のユースケースを定義します
type TradeFileUsecase interface {
	SaveTradeFile(ctx context.Context, file *domain.TradeFile) error
	GetTradeFileByID(ctx context.Context, id int) (*domain.TradeFile, error)
}

type tradeFileUsecase struct {
	tradeFileRepo domain.TradeFileRepository
}

// NewTradeFileUsecase は新しいTradeFileUsecaseインスタンスを作成します
func NewTradeFileUsecase(repo domain.TradeFileRepository) TradeFileUsecase {
	return &tradeFileUsecase{
		tradeFileRepo: repo,
	}
}

// SaveTradeFile はトレードファイルを保存します
func (uc *tradeFileUsecase) SaveTradeFile(ctx context.Context, file *domain.TradeFile) error {
	return uc.tradeFileRepo.CreateTradeFile(ctx, file)
}

// GetTradeFileByID はIDからトレードファイルを取得します
func (uc *tradeFileUsecase) GetTradeFileByID(ctx context.Context, id int) (*domain.TradeFile, error) {
	return uc.tradeFileRepo.GetTradeFileByID(ctx, id)
}
