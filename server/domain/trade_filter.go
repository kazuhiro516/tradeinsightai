package domain

import "time"

type TradeFilter struct {
	// ID/チケット番号フィルター
	TicketIDs []int `json:"ticketIds,omitempty"`

	// 期間フィルター（取引開始・終了）
	StartDate *time.Time `json:"startDate,omitempty"`
	EndDate   *time.Time `json:"endDate,omitempty"`

	// 取引種別フィルター
	Types []string `json:"types,omitempty"` // 例: ["buy", "sell"]

	// 通貨ペア/商品フィルター
	Items []string `json:"items,omitempty"` // 例: ["usdjpy", "eurusd"]

	// 数値範囲フィルター
	SizeMin      *float64 `json:"sizeMin,omitempty"`
	SizeMax      *float64 `json:"sizeMax,omitempty"`
	ProfitMin    *float64 `json:"profitMin,omitempty"`
	ProfitMax    *float64 `json:"profitMax,omitempty"`
	OpenPriceMin *float64 `json:"openPriceMin,omitempty"`
	OpenPriceMax *float64 `json:"openPriceMax,omitempty"`

	// ページング
	Page     int `json:"page,omitempty"`
	PageSize int `json:"pageSize,omitempty"`

	// ソート
	SortBy    string `json:"sortBy,omitempty"`
	SortOrder string `json:"sortOrder,omitempty"` // "asc" or "desc"
}
