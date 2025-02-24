package domain

type TradeDetails struct {
	DepositWithdrawal float64 `json:"depositWithdrawal"` // 入出金
	CreditFacility    float64 `json:"creditFacility"`    // クレジットファシリティ
	ClosedTradePL     float64 `json:"closedTradePL"`     // クローズドトレードの損益
	FloatingPL        float64 `json:"floatingPL"`        // 含み損益
	Margin            float64 `json:"margin"`            // 証拠金
	Balance           float64 `json:"balance"`           // 残高
	Equity            float64 `json:"equity"`            // 純資産
	FreeMargin        float64 `json:"freeMargin"`        // フリーマージン
}
