package utils

import (
	"bytes"
	"fmt"
	"log/slog"
	"server/domain"
	"strconv"
	"strings"
	"time"

	"golang.org/x/net/html"
)

// ParseHTMLToTradeRecords関数の修正（引数の不一致を修正）
func ParseHTMLToTradeRecords(content []byte) ([]domain.TradeRecord, error) {
	doc, err := html.Parse(bytes.NewReader(content))
	if err != nil {
		return nil, fmt.Errorf("failed to parse HTML: %w", err)
	}

	// "Closed Transactions:" というテキストを見つける
	closedTransactionsSection := findClosedTransactionsSection(doc)
	if closedTransactionsSection == nil {
		return nil, fmt.Errorf("closed transactions section not found in HTML")
	}

	slog.Info("Found 'Closed Transactions:' section")

	// トレード履歴のテーブルを探す
	tradeTable := findTradeTable(closedTransactionsSection)
	if tradeTable == nil {
		return nil, fmt.Errorf("trade table not found after 'Closed Transactions:' section")
	}

	slog.Info("Found trade table in HTML")

	// テーブルから取引レコードを抽出（引数を修正）
	records, err := extractTradeRecordsFromTable(tradeTable, closedTransactionsSection)
	if err != nil {
		return nil, fmt.Errorf("failed to extract trade records from table: %w", err)
	}

	if len(records) == 0 {
		return nil, fmt.Errorf("no valid trade records found in table")
	}

	slog.Info("Extracted trade records", "count", len(records))
	return records, nil
}

// findClosedTransactionsSection は "Closed Transactions:" というテキストを含む行を見つけます
func findClosedTransactionsSection(n *html.Node) *html.Node {
	// "Closed Transactions:" というテキストを含むテキストノードを探す
	var findClosedTransText func(*html.Node) *html.Node
	findClosedTransText = func(node *html.Node) *html.Node {
		if node.Type == html.TextNode {
			if strings.Contains(node.Data, "Closed Transactions:") {
				// 親のTR要素を返す
				parent := node
				for parent != nil && !(parent.Type == html.ElementNode && parent.Data == "tr") {
					parent = parent.Parent
				}
				return parent
			}
		}

		for c := node.FirstChild; c != nil; c = c.NextSibling {
			if found := findClosedTransText(c); found != nil {
				return found
			}
		}
		return nil
	}

	return findClosedTransText(n)
}

// findTradeTable は指定されたノードの後に続くテーブル行を見つけます
func findTradeTable(sectionRow *html.Node) *html.Node {
	if sectionRow == nil {
		return nil
	}

	// セクション行の親テーブルを見つける
	parentTable := sectionRow
	for parentTable != nil && (parentTable.Type != html.ElementNode || parentTable.Data != "table") {
		parentTable = parentTable.Parent
	}

	return parentTable
}

// isClosedTransactionDataRow はこの行がClosedTransactionsのデータ行かを判定します
func isClosedTransactionDataRow(row *html.Node, headerRow *html.Node, closedSection *html.Node) bool {
	// ヘッダー行自体は対象外
	if row == headerRow {
		return false
	}

	// 空行は対象外
	cells := findTableCells(row)
	if len(cells) < 4 { // 最低でも数個のセルがあるべき
		return false
	}

	// Open Transactionsセクション以降は対象外
	if isAfterOpenTransactionsSection(row, closedSection) {
		return false
	}

	// 最初のセルがチケット番号（数値）であるかをチェック
	firstCellText := strings.TrimSpace(extractTextContent(cells[0]))
	if _, err := strconv.Atoi(extractNumeric(firstCellText)); err != nil {
		return false
	}

	return true
}

// isAfterOpenTransactionsSection は与えられた行がOpen Transactionsセクション以降かを判定します
func isAfterOpenTransactionsSection(row *html.Node, closedSection *html.Node) bool {
	// 親テーブルを取得
	parentTable := row
	for parentTable != nil && (parentTable.Type != html.ElementNode || parentTable.Data != "table") {
		parentTable = parentTable.Parent
	}

	// Closed Transactionsと同じテーブル内にある場合
	if parentTable != nil {
		current := closedSection
		for current != nil {
			if containsTextNode(current, "Open Trades:") {
				// Open Trades:セクションが見つかった場合、その行以降かをチェック
				return isNodeAfter(row, current)
			}
			current = current.NextSibling
		}
	}

	return false
}

// isNodeAfter はnode1がnode2の後にあるかをチェックします
func isNodeAfter(node1, node2 *html.Node) bool {
	current := node2.NextSibling
	for current != nil {
		if current == node1 {
			return true
		}
		current = current.NextSibling
	}
	return false
}

// extractTradeRecordsFromTable はテーブルからTradeRecordを抽出します
func extractTradeRecordsFromTable(table *html.Node, closedSection *html.Node) ([]domain.TradeRecord, error) {
	var records []domain.TradeRecord
	var rows []*html.Node

	// 行を収集（変数宣言を追加）
	var findRows func(*html.Node)
	findRows = func(node *html.Node) {
		if node.Type == html.ElementNode && node.Data == "tr" {
			rows = append(rows, node)
		}
		for c := node.FirstChild; c != nil; c = c.NextSibling {
			findRows(c)
		}
	}
	findRows(table)

	if len(rows) < 2 { // ヘッダー行 + データ行が少なくとも必要
		return nil, fmt.Errorf("table has too few rows")
	}

	// ヘッダー行を特定（最初にbgcolor="#C0C0C0"のある行）
	var headerRow *html.Node
	for _, row := range rows {
		// bgcolor属性を持つ行を探す
		for _, attr := range row.Attr {
			if attr.Key == "bgcolor" && (attr.Val == "#C0C0C0" || strings.Contains(attr.Val, "C0C0C0")) {
				headerRow = row
				break
			}
		}
		if headerRow != nil {
			break
		}
	}

	if headerRow == nil {
		// 見つからない場合は最初の行を使用
		headerRow = rows[0]
	}

	// ヘッダーセルを解析してカラム名を取得
	headerCells := findTableCells(headerRow)

	// デバッグ：ヘッダーセルの内容を表示
	slog.Debug("Header cells found", "count", len(headerCells))
	for i, cell := range headerCells {
		slog.Debug("Header cell", "index", i, "text", extractTextContent(cell))
	}

	// カラム名のマッピングを作成
	columnMapping := make(map[string]int)

	// ヘッダー行のカラム位置を調査
	// 未使用の変数宣言を削除して宣言だけ残す
	var ticketColIndex, openTimeColIndex, typeColIndex, sizeColIndex, itemColIndex,
		openPriceColIndex, stopLossColIndex, takeProfitColIndex int

	// まずヘッダーテキストを調査
	for i, cell := range headerCells {
		text := strings.ToLower(extractTextContent(cell))
		// 空白を削除して比較を単純化
		textNoSpace := strings.ReplaceAll(text, " ", "")

		switch {
		case text == "ticket" || text == "チケット":
			ticketColIndex = i
			columnMapping["ticket"] = i
		case strings.Contains(text, "open") && strings.Contains(text, "time") || text == "open time" || text == "オープン時間":
			openTimeColIndex = i
			columnMapping["open_time"] = i
		case text == "type" || text == "タイプ":
			typeColIndex = i
			columnMapping["type"] = i
		case text == "size" || text == "ロット" || text == "数量":
			sizeColIndex = i
			columnMapping["size"] = i
		case text == "item" || text == "シンボル" || text == "symbol":
			itemColIndex = i
			columnMapping["item"] = i
		case text == "price" && openPriceColIndex == 0: // 最初のpriceがopen_price
			openPriceColIndex = i
			columnMapping["open_price"] = i
		// S/Lの検出を改善
		case strings.Contains(textNoSpace, "s/l") || textNoSpace == "sl" || text == "stop loss" || text == "stoploss":
			stopLossColIndex = i
			columnMapping["stop_loss"] = i
		// T/Pの検出を改善
		case strings.Contains(textNoSpace, "t/p") || textNoSpace == "tp" || text == "take profit" || text == "takeprofit":
			takeProfitColIndex = i
			columnMapping["take_profit"] = i
		case strings.Contains(text, "close") && strings.Contains(text, "time") || text == "close time" || text == "クローズ時間":
			// closeTimeColIndexは削除してマッピングだけ保持
			columnMapping["close_time"] = i
		case text == "price" && openPriceColIndex > 0: // 2番目のpriceがclose_price
			// closePriceColIndexは削除してマッピングだけ保持
			columnMapping["close_price"] = i
		case text == "commission" || text == "手数料":
			// commissionColIndexは削除してマッピングだけ保持
			columnMapping["commission"] = i
		case text == "taxes" || text == "税金":
			// taxesColIndexは削除してマッピングだけ保持
			columnMapping["taxes"] = i
		case text == "swap" || text == "スワップ":
			// swapColIndexは削除してマッピングだけ保持
			columnMapping["swap"] = i
		case text == "profit" || text == "損益" || text == "利益":
			// profitColIndexは削除してマッピングだけ保持
			columnMapping["profit"] = i
		}
	}

	// 位置を特定できなかった場合のデフォルト処理
	// 典型的なMetaTraderテーブル構造から推測
	if ticketColIndex == 0 && len(headerCells) > 0 {
		columnMapping["ticket"] = 0 // 最初の列はチケット
	}
	if openTimeColIndex == 0 && len(headerCells) > 1 {
		columnMapping["open_time"] = 1 // 2列目はオープン時間
	}
	if typeColIndex == 0 && len(headerCells) > 2 {
		columnMapping["type"] = 2 // 3列目はタイプ
	}
	if sizeColIndex == 0 && len(headerCells) > 3 {
		columnMapping["size"] = 3 // 4列目はサイズ
	}
	if itemColIndex == 0 && len(headerCells) > 4 {
		columnMapping["item"] = 4 // 5列目はアイテム/シンボル
	}

	slog.Debug("Column mapping", "mapping", fmt.Sprintf("%v", columnMapping))

	// データ行の処理
	for i := 0; i < len(rows); i++ {
		row := rows[i]

		// 有効なClosedTransactionsのデータ行かチェック
		if !isClosedTransactionDataRow(row, headerRow, closedSection) {
			continue
		}

		cells := findTableCells(row)

		// テキスト「No transactions」がある行はスキップ
		if containsTextNode(row, "No transactions") {
			continue
		}

		record, err := createTradeRecordFromCells(cells, columnMapping)
		if err != nil {
			slog.Debug("Failed to create trade record", "error", err, "row", i)
			continue
		}

		// 未設定値を補完：StopLossとTakeProfit
		if record.StopLoss == 0 && stopLossColIndex < len(cells) {
			slStr := extractTextContent(cells[stopLossColIndex])
			slStr = cleanNumericString(slStr)
			sl, err := strconv.ParseFloat(slStr, 64)
			if err == nil && sl != 0 {
				record.StopLoss = sl
			}
		}

		if record.TakeProfit == 0 && takeProfitColIndex < len(cells) {
			tpStr := extractTextContent(cells[takeProfitColIndex])
			tpStr = cleanNumericString(tpStr)
			tp, err := strconv.ParseFloat(tpStr, 64)
			if err == nil && tp != 0 {
				record.TakeProfit = tp
			}
		}

		records = append(records, record)
	}

	return records, nil
}

// containsTextNode は指定のノードが特定のテキストを含むかチェックします
func containsTextNode(n *html.Node, text string) bool {
	if n.Type == html.TextNode && strings.Contains(n.Data, text) {
		return true
	}

	for c := n.FirstChild; c != nil; c = c.NextSibling {
		if containsTextNode(c, text) {
			return true
		}
	}

	return false
}

// extractNumeric は文字列から数値のみを抽出します
func extractNumeric(s string) string {
	var result strings.Builder
	for _, c := range s {
		if c >= '0' && c <= '9' {
			result.WriteRune(c)
		}
	}
	return result.String()
}

// findTableCells は行内のセルを検索します
func findTableCells(row *html.Node) []*html.Node {
	var cells []*html.Node

	for c := row.FirstChild; c != nil; c = c.NextSibling {
		if c.Type == html.ElementNode && (c.Data == "td" || c.Data == "th") {
			cells = append(cells, c)
		}
	}

	return cells
}

// extractTextContent はノードからテキスト内容を抽出します
func extractTextContent(n *html.Node) string {
	if n.Type == html.TextNode {
		return n.Data
	}

	var result strings.Builder
	for c := n.FirstChild; c != nil; c = c.NextSibling {
		result.WriteString(extractTextContent(c))
	}

	return strings.TrimSpace(result.String())
}

// normalizeHeader はヘッダーテキストを正規化します
func normalizeHeader(header string) string {
	header = strings.ToLower(header)
	header = strings.ReplaceAll(header, " ", "_")
	header = strings.ReplaceAll(header, "/", "_")
	return header
}

// createTradeRecordFromCells はセルからTradeRecordを作成します
func createTradeRecordFromCells(cells []*html.Node, columnMapping map[string]int) (domain.TradeRecord, error) {
	// 各フィールドの値を取得
	var (
		ticket     int
		openTime   time.Time
		tradeType  string
		size       float64
		item       string
		openPrice  float64
		stopLoss   float64
		takeProfit float64
		closeTime  time.Time
		closePrice float64
		commission float64
		taxes      float64
		swap       float64
		profit     float64
	)

	// チケット番号
	if idx, exists := columnMapping["ticket"]; exists && idx < len(cells) {
		ticketStr := extractTextContent(cells[idx])
		// "[sl]" などのタイトルタグを除去
		ticketStr = extractNumeric(ticketStr)
		var err error
		ticket, err = strconv.Atoi(ticketStr)
		if err != nil {
			return domain.TradeRecord{}, fmt.Errorf("invalid ticket number: %s", ticketStr)
		}
	} else {
		// チケット番号が見つからない場合は最初の列の値を試す
		if len(cells) > 0 {
			ticketStr := extractTextContent(cells[0])
			ticketStr = extractNumeric(ticketStr)
			var err error
			ticket, err = strconv.Atoi(ticketStr)
			if err != nil {
				return domain.TradeRecord{}, fmt.Errorf("could not find valid ticket number")
			}
		} else {
			return domain.TradeRecord{}, fmt.Errorf("no cells found")
		}
	}

	// 取引タイプ
	if idx, exists := columnMapping["type"]; exists && idx < len(cells) {
		typeText := extractTextContent(cells[idx])
		// typeが長すぎる場合は不正なデータの可能性があるのでエラー
		if len(typeText) > 20 {
			return domain.TradeRecord{}, fmt.Errorf("invalid type text (too long): %s", typeText)
		}
		tradeType = typeText
	}

	// サイズ
	if idx, exists := columnMapping["size"]; exists && idx < len(cells) {
		sizeStr := extractTextContent(cells[idx])
		sizeStr = cleanNumericString(sizeStr)
		var err error
		size, err = strconv.ParseFloat(sizeStr, 64)
		if err != nil {
			size = 0.0
		}
	}

	// 商品/通貨ペア
	if idx, exists := columnMapping["item"]; exists && idx < len(cells) {
		itemText := extractTextContent(cells[idx])
		// itemが長すぎる場合は不正なデータの可能性があるのでエラー
		if len(itemText) > 20 {
			return domain.TradeRecord{}, fmt.Errorf("invalid item text (too long): %s", itemText)
		}
		item = itemText
	}

	// 取引時間
	if idx, exists := columnMapping["open_time"]; exists && idx < len(cells) {
		openTimeStr := extractTextContent(cells[idx])
		var err error
		openTime, err = parseDateTime(openTimeStr)
		if err != nil {
			slog.Debug("Failed to parse open time", "time_str", openTimeStr, "error", err)
		}
	}

	// 決済時間
	if idx, exists := columnMapping["close_time"]; exists && idx < len(cells) {
		closeTimeStr := extractTextContent(cells[idx])
		var err error
		closeTime, err = parseDateTime(closeTimeStr)
		if err != nil {
			slog.Debug("Failed to parse close time", "time_str", closeTimeStr, "error", err)
		}
	}

	// エントリー価格
	if idx, exists := columnMapping["open_price"]; exists && idx < len(cells) {
		priceStr := extractTextContent(cells[idx])
		priceStr = cleanNumericString(priceStr)
		var err error
		openPrice, err = strconv.ParseFloat(priceStr, 64)
		if err != nil {
			openPrice = 0.0
		}
	}

	// クローズ価格
	if idx, exists := columnMapping["close_price"]; exists && idx < len(cells) {
		priceStr := extractTextContent(cells[idx])
		priceStr = cleanNumericString(priceStr)
		var err error
		closePrice, err = strconv.ParseFloat(priceStr, 64)
		if err != nil {
			closePrice = 0.0
		}
	}

	// 損切り価格
	if idx, exists := columnMapping["stop_loss"]; exists && idx < len(cells) {
		slStr := extractTextContent(cells[idx])
		slStr = cleanNumericString(slStr)
		var err error
		stopLoss, err = strconv.ParseFloat(slStr, 64)
		if err != nil {
			stopLoss = 0.0
		}
	}

	// 利確価格
	if idx, exists := columnMapping["take_profit"]; exists && idx < len(cells) {
		tpStr := extractTextContent(cells[idx])
		tpStr = cleanNumericString(tpStr)
		var err error
		takeProfit, err = strconv.ParseFloat(tpStr, 64)
		if err != nil {
			takeProfit = 0.0
		}
	}

	// 手数料
	if idx, exists := columnMapping["commission"]; exists && idx < len(cells) {
		commissionStr := extractTextContent(cells[idx])
		commissionStr = cleanNumericString(commissionStr)
		var err error
		commission, err = strconv.ParseFloat(commissionStr, 64)
		if err != nil {
			commission = 0.0
		}
	}

	// 税金
	if idx, exists := columnMapping["taxes"]; exists && idx < len(cells) {
		taxesStr := extractTextContent(cells[idx])
		taxesStr = cleanNumericString(taxesStr)
		var err error
		taxes, err = strconv.ParseFloat(taxesStr, 64)
		if err != nil {
			taxes = 0.0
		}
	}

	// スワップ
	if idx, exists := columnMapping["swap"]; exists && idx < len(cells) {
		swapStr := extractTextContent(cells[idx])
		swapStr = cleanNumericString(swapStr)
		var err error
		swap, err = strconv.ParseFloat(swapStr, 64)
		if err != nil {
			swap = 0.0
		}
	}

	// 損益
	if idx, exists := columnMapping["profit"]; exists && idx < len(cells) {
		profitStr := extractTextContent(cells[idx])
		profitStr = cleanNumericString(profitStr)
		var err error
		profit, err = strconv.ParseFloat(profitStr, 64)
		if err != nil {
			profit = 0.0
		}
	}

	// ULIDを生成
	id := GenerateULID()

	// コンストラクタを使用してTradeRecordを生成
	recordPtr := domain.NewTradeRecord(
		id,
		ticket,
		openTime,
		tradeType,
		size,
		item,
		openPrice,
		stopLoss,
		takeProfit,
		closeTime,
		closePrice,
		commission,
		taxes,
		swap,
		profit,
	)

	// ポインタから値を取り出して返す
	return *recordPtr, nil
}

// cleanNumericString は数値文字列をクリーンアップします
func cleanNumericString(s string) string {
	s = strings.TrimSpace(s)
	s = strings.ReplaceAll(s, " ", "")
	s = strings.ReplaceAll(s, ",", "")
	s = strings.ReplaceAll(s, "−", "-") // 全角マイナス記号を半角に変換

	// 通貨記号を削除
	currencies := []string{"$", "€", "£", "¥", "円", "元", "₽", "₩", "₺", "₹"}
	for _, curr := range currencies {
		s = strings.ReplaceAll(s, curr, "")
	}

	return s
}

// parseDateTime は日時文字列をパースします
func parseDateTime(dateTimeStr string) (time.Time, error) {
	dateTimeStr = strings.TrimSpace(dateTimeStr)

	// ゼロや空の日付文字列をチェック
	if dateTimeStr == "0" || dateTimeStr == "0.00000" || dateTimeStr == "" || dateTimeStr == "&nbsp;" {
		return time.Time{}, fmt.Errorf("empty date time string")
	}

	// MetaTraderの標準形式と他のよく使用される形式
	formats := []string{
		"2006.01.02 15:04:05",
		"2006.01.02 15:04",
		"2006/01/02 15:04:05",
		"2006/01/02 15:04",
		"2006-01-02 15:04:05",
		"2006-01-02 15:04",
		"02.01.2006 15:04:05",
		"02.01.2006 15:04",
		"01/02/2006 15:04:05",
		"01/02/2006 15:04",
		"2006年01月02日 15:04:05",
		"2006年01月02日 15:04",
		time.RFC3339,
	}

	for _, format := range formats {
		t, err := time.Parse(format, dateTimeStr)
		if err == nil {
			return t, nil
		}
	}

	return time.Time{}, fmt.Errorf("could not parse date time: %s", dateTimeStr)
}
