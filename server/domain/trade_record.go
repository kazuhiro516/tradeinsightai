package domain

import "time"

type TradeRecord struct {
	Ticket     int       `json:"ticket"`     // チケット番号
	OpenTime   time.Time `json:"openTime"`   // オープン時間
	Type       string    `json:"type"`       // 取引タイプ（買いまたは売り）
	Size       float64   `json:"size"`       // 取引サイズ（ロット）
	Item       string    `json:"item"`       // 通貨ペアまたは商品名
	OpenPrice  float64   `json:"openPrice"`  // エントリー価格
	StopLoss   float64   `json:"stopLoss"`   // ストップロス（損切り）
	TakeProfit float64   `json:"takeProfit"` // テイクプロフィット（利確）
	CloseTime  time.Time `json:"closeTime"`  // クローズ時間
	ClosePrice float64   `json:"closePrice"` // クローズ価格
	Commission float64   `json:"commission"` // コミッション（手数料）
	Taxes      float64   `json:"taxes"`      // 税金
	Swap       float64   `json:"swap"`       // スワップポイント
	Profit     float64   `json:"profit"`     // 損益
}
