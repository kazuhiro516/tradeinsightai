package domain

type TradeSummary struct {
	TotalTrades      int     `json:"totalTrades"`      // 総トレード数
	ShortPositions   int     `json:"shortPositions"`   // 売りポジション数
	LongPositions    int     `json:"longPositions"`    // 買いポジション数
	ProfitTrades     int     `json:"profitTrades"`     // 利益の出たトレード数
	LossTrades       int     `json:"lossTrades"`       // 損失の出たトレード数
	GrossProfit      float64 `json:"grossProfit"`      // 総利益
	GrossLoss        float64 `json:"grossLoss"`        // 総損失
	NetProfit        float64 `json:"netProfit"`        // 純利益
	ProfitFactor     float64 `json:"profitFactor"`     // プロフィットファクター
	ExpectedPayoff   float64 `json:"expectedPayoff"`   // 期待利益
	MaximalDrawdown  float64 `json:"maximalDrawdown"`  // 最大ドローダウン
	RelativeDrawdown float64 `json:"relativeDrawdown"` // 相対ドローダウン
}
