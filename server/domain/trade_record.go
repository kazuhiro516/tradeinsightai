package domain

import "time"

type TradeRecord struct {
	ID         string    `json:"id" db:"id"`                   // レコードの一意識別子 (ULID)
	Ticket     int       `json:"ticket" db:"ticket"`           // チケット番号
	OpenTime   time.Time `json:"openTime" db:"open_time"`      // オープン時間
	Type       string    `json:"type" db:"type"`               // 取引タイプ（買いまたは売り）
	Size       float64   `json:"size" db:"size"`               // 取引サイズ（ロット）
	Item       string    `json:"item" db:"item"`               // 通貨ペアまたは商品名
	OpenPrice  float64   `json:"openPrice" db:"open_price"`    // エントリー価格
	StopLoss   float64   `json:"stopLoss" db:"stop_loss"`      // ストップロス（損切り）
	TakeProfit float64   `json:"takeProfit" db:"take_profit"`  // テイクプロフィット（利確）
	CloseTime  time.Time `json:"closeTime" db:"close_time"`    // クローズ時間
	ClosePrice float64   `json:"closePrice" db:"close_price"`  // クローズ価格
	Commission float64   `json:"commission" db:"commission"`   // コミッション（手数料）
	Taxes      float64   `json:"taxes" db:"taxes"`             // 税金
	Swap       float64   `json:"swap" db:"swap"`               // スワップポイント
	Profit     float64   `json:"profit" db:"profit"`           // 損益
	UserID     string    `json:"userId" db:"user_id not null"` // ユーザーID
}

func NewTradeRecord(
	id string,
	ticket int,
	openTime time.Time,
	tradeType string,
	size float64,
	item string,
	openPrice float64,
	stopLoss float64,
	takeProfit float64,
	closeTime time.Time,
	closePrice float64,
	commission float64,
	taxes float64,
	swap float64,
	profit float64,
	userID string,
) *TradeRecord {
	return &TradeRecord{
		ID:         id,
		Ticket:     ticket,
		OpenTime:   openTime,
		Type:       tradeType,
		Size:       size,
		Item:       item,
		OpenPrice:  openPrice,
		StopLoss:   stopLoss,
		TakeProfit: takeProfit,
		CloseTime:  closeTime,
		ClosePrice: closePrice,
		Commission: commission,
		Taxes:      taxes,
		Swap:       swap,
		Profit:     profit,
		UserID:     userID,
	}
}
