package domain

type TradeHistory struct {
	Account  int           `json:"account"`  // 口座番号
	Name     string        `json:"name"`     // 口座名義
	Currency string        `json:"currency"` // 口座通貨
	Leverage *string       `json:"leverage"` // レバレッジ（null の場合は不明）
	Trades   []TradeRecord `json:"trades"`   // トレード履歴の配列
	Summary  TradeSummary  `json:"summary"`  // トレードサマリー
	Details  TradeDetails  `json:"details"`  // トレード詳細
}
