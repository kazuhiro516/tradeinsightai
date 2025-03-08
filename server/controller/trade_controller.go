package controller

import (
	"encoding/json"
	"net/http"
	"server/domain"
	"server/usecases"
)

// TradeController はトレード関連のAPIハンドラを提供します
type TradeController struct {
	tradeUsecase usecases.TradeRecordUsecase
}

// NewTradeController は新しいTradeControllerインスタンスを作成します
func NewTradeController(usecase usecases.TradeRecordUsecase) *TradeController {
	return &TradeController{
		tradeUsecase: usecase,
	}
}

// FilterTradesHandler はトレードレコードをフィルタリングするハンドラ
func (tc *TradeController) FilterTradesHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	var filter domain.TradeFilter
	if err := json.NewDecoder(r.Body).Decode(&filter); err != nil {
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}

	ctx := r.Context()
	trades, err := tc.tradeUsecase.FilterTrades(ctx, filter)
	if err != nil {
		http.Error(w, "Failed to filter trades: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(trades)
}

// CreateTradeRecordHandler は新しいトレードレコードを作成するハンドラ
func (tc *TradeController) CreateTradeRecordHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	var record domain.TradeRecord
	if err := json.NewDecoder(r.Body).Decode(&record); err != nil {
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}

	ctx := r.Context()
	if err := tc.tradeUsecase.CreateTradeRecord(ctx, &record); err != nil {
		http.Error(w, "Failed to create trade record: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(record)
}
