package controller

import (
	"encoding/json"
	"log"
	"net/http"
	"server/domain"
	"server/usecases"
	"time"
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

// FilterTradesHandler関数の修正例
func (c *TradeController) FilterTradesHandler(w http.ResponseWriter, r *http.Request) {
	// コンテキストを取得
	ctx := r.Context()

	// クエリパラメータを取得
	startDateStr := r.URL.Query().Get("startDate")
	endDateStr := r.URL.Query().Get("endDate")

	// パラメータのバリデーション
	if startDateStr == "" || endDateStr == "" {
		http.Error(w, "start_date and end_date are required", http.StatusBadRequest)
		return
	}

	// 日付形式の解析
	startDate, err := time.Parse("2006-01-02", startDateStr)
	if err != nil {
		http.Error(w, "Invalid start_date format: "+err.Error(), http.StatusBadRequest)
		return
	}

	endDate, err := time.Parse("2006-01-02", endDateStr)
	if err != nil {
		http.Error(w, "Invalid end_date format: "+err.Error(), http.StatusBadRequest)
		return
	}

	// TradeFilter オブジェクトの作成
	filter := domain.TradeFilter{
		StartDate: &startDate,
		EndDate:   &endDate,
	}

	// データ取得処理 - コンテキストを渡す
	trades, err := c.tradeUsecase.FilterTrades(ctx, filter)
	if err != nil {
		// エラーログを出力
		log.Printf("Error filtering trades: %v", err)
		http.Error(w, "Failed to retrieve trade records", http.StatusInternalServerError)
		return
	}

	// レスポンスの作成
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(trades); err != nil {
		http.Error(w, "Failed to encode response", http.StatusInternalServerError)
		return
	}
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
