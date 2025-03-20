package controller

import (
	"encoding/json"
	"log"
	"net/http"
	"server/domain"
	"server/usecases"
	"strconv"
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

	// 日付パラメータの取得と解析
	startDateStr := r.URL.Query().Get("startDate")
	endDateStr := r.URL.Query().Get("endDate")

	// TradeFilter オブジェクトの作成
	filter := domain.TradeFilter{}

	// 日付フィルターの設定
	if startDateStr != "" {
		startDate, err := time.Parse("2006-01-02", startDateStr)
		if err != nil {
			http.Error(w, "Invalid startDate format: "+err.Error(), http.StatusBadRequest)
			return
		}
		filter.StartDate = &startDate
	}

	if endDateStr != "" {
		endDate, err := time.Parse("2006-01-02", endDateStr)
		if err != nil {
			http.Error(w, "Invalid endDate format: "+err.Error(), http.StatusBadRequest)
			return
		}
		filter.EndDate = &endDate
	}

	// チケットIDフィルターの設定
	ticketIDs := r.URL.Query()["ticketIds"]
	if len(ticketIDs) > 0 {
		ids := make([]int, 0, len(ticketIDs))
		for _, idStr := range ticketIDs {
			id, err := strconv.Atoi(idStr)
			if err != nil {
				http.Error(w, "Invalid ticketId format: "+err.Error(), http.StatusBadRequest)
				return
			}
			ids = append(ids, id)
		}
		filter.TicketIDs = ids
	}

	// 取引タイプと商品フィルターの設定
	types := r.URL.Query()["types"]
	if len(types) > 0 {
		filter.Types = types
	}

	items := r.URL.Query()["items"]
	if len(items) > 0 {
		filter.Items = items
	}

	// 数値範囲フィルターの設定
	if sizeMinStr := r.URL.Query().Get("sizeMin"); sizeMinStr != "" {
		sizeMin, err := strconv.ParseFloat(sizeMinStr, 64)
		if err != nil {
			http.Error(w, "Invalid sizeMin format: "+err.Error(), http.StatusBadRequest)
			return
		}
		filter.SizeMin = &sizeMin
	}

	if sizeMaxStr := r.URL.Query().Get("sizeMax"); sizeMaxStr != "" {
		sizeMax, err := strconv.ParseFloat(sizeMaxStr, 64)
		if err != nil {
			http.Error(w, "Invalid sizeMax format: "+err.Error(), http.StatusBadRequest)
			return
		}
		filter.SizeMax = &sizeMax
	}

	if profitMinStr := r.URL.Query().Get("profitMin"); profitMinStr != "" {
		profitMin, err := strconv.ParseFloat(profitMinStr, 64)
		if err != nil {
			http.Error(w, "Invalid profitMin format: "+err.Error(), http.StatusBadRequest)
			return
		}
		filter.ProfitMin = &profitMin
	}

	if profitMaxStr := r.URL.Query().Get("profitMax"); profitMaxStr != "" {
		profitMax, err := strconv.ParseFloat(profitMaxStr, 64)
		if err != nil {
			http.Error(w, "Invalid profitMax format: "+err.Error(), http.StatusBadRequest)
			return
		}
		filter.ProfitMax = &profitMax
	}

	if openPriceMinStr := r.URL.Query().Get("openPriceMin"); openPriceMinStr != "" {
		openPriceMin, err := strconv.ParseFloat(openPriceMinStr, 64)
		if err != nil {
			http.Error(w, "Invalid openPriceMin format: "+err.Error(), http.StatusBadRequest)
			return
		}
		filter.OpenPriceMin = &openPriceMin
	}

	if openPriceMaxStr := r.URL.Query().Get("openPriceMax"); openPriceMaxStr != "" {
		openPriceMax, err := strconv.ParseFloat(openPriceMaxStr, 64)
		if err != nil {
			http.Error(w, "Invalid openPriceMax format: "+err.Error(), http.StatusBadRequest)
			return
		}
		filter.OpenPriceMax = &openPriceMax
	}

	// ページング設定
	if pageStr := r.URL.Query().Get("page"); pageStr != "" {
		page, err := strconv.Atoi(pageStr)
		if err != nil {
			http.Error(w, "Invalid page format: "+err.Error(), http.StatusBadRequest)
			return
		}
		filter.Page = page
	}

	if pageSizeStr := r.URL.Query().Get("pageSize"); pageSizeStr != "" {
		pageSize, err := strconv.Atoi(pageSizeStr)
		if err != nil {
			http.Error(w, "Invalid pageSize format: "+err.Error(), http.StatusBadRequest)
			return
		}
		filter.PageSize = pageSize
	}

	// ソート設定
	if sortBy := r.URL.Query().Get("sortBy"); sortBy != "" {
		filter.SortBy = sortBy
	}

	if sortOrder := r.URL.Query().Get("sortOrder"); sortOrder != "" {
		filter.SortOrder = sortOrder
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
