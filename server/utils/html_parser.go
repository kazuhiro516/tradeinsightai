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

// ColumnMapping はHTMLテーブルのカラムマッピングを保持します
type ColumnMapping struct {
	Ticket     int
	OpenTime   int
	Type       int
	Size       int
	Item       int
	OpenPrice  int
	StopLoss   int
	TakeProfit int
	CloseTime  int
	ClosePrice int
	Commission int
	Taxes      int
	Swap       int
	Profit     int
}

// ParseHTMLToTradeRecords はHTMLファイルから取引レコードを抽出します
func ParseHTMLToTradeRecords(content []byte) ([]domain.TradeRecord, error) {
	doc, err := html.Parse(bytes.NewReader(content))
	if err != nil {
		return nil, fmt.Errorf("failed to parse HTML: %w", err)
	}

	closedTransactionsSection := findClosedTransactionsSection(doc)
	if closedTransactionsSection == nil {
		return nil, fmt.Errorf("closed transactions section not found in HTML")
	}

	slog.Info("Found 'Closed Transactions:' section")

	tradeTable := findTradeTable(closedTransactionsSection)
	if tradeTable == nil {
		return nil, fmt.Errorf("trade table not found after 'Closed Transactions:' section")
	}

	slog.Info("Found trade table in HTML")

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
	var findClosedTransText func(*html.Node) *html.Node
	findClosedTransText = func(node *html.Node) *html.Node {
		if node.Type == html.TextNode && strings.Contains(node.Data, "Closed Transactions:") {
			parent := node
			for parent != nil && !(parent.Type == html.ElementNode && parent.Data == "tr") {
				parent = parent.Parent
			}
			return parent
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

	parentTable := sectionRow
	for parentTable != nil && (parentTable.Type != html.ElementNode || parentTable.Data != "table") {
		parentTable = parentTable.Parent
	}

	return parentTable
}

// isClosedTransactionDataRow はこの行がClosedTransactionsのデータ行かを判定します
func isClosedTransactionDataRow(row *html.Node, headerRow *html.Node, closedSection *html.Node) bool {
	if row == headerRow {
		return false
	}

	cells := findTableCells(row)
	if len(cells) < 4 {
		return false
	}

	if isAfterOpenTransactionsSection(row, closedSection) {
		return false
	}

	firstCellText := strings.TrimSpace(extractTextContent(cells[0]))
	if _, err := strconv.Atoi(extractNumeric(firstCellText)); err != nil {
		return false
	}

	return true
}

// isAfterOpenTransactionsSection は与えられた行がOpen Transactionsセクション以降かを判定します
func isAfterOpenTransactionsSection(row *html.Node, closedSection *html.Node) bool {
	parentTable := row
	for parentTable != nil && (parentTable.Type != html.ElementNode || parentTable.Data != "table") {
		parentTable = parentTable.Parent
	}

	if parentTable != nil {
		current := closedSection
		for current != nil {
			if containsTextNode(current, "Open Trades:") {
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

	if len(rows) < 2 {
		return nil, fmt.Errorf("table has too few rows")
	}

	headerRow := findHeaderRow(rows)
	if headerRow == nil {
		headerRow = rows[0]
	}

	columnMapping := createColumnMapping(findTableCells(headerRow))

	slog.Debug("Column mapping", "mapping", fmt.Sprintf("%v", columnMapping))

	for i := 0; i < len(rows); i++ {
		row := rows[i]

		if !isClosedTransactionDataRow(row, headerRow, closedSection) {
			continue
		}

		cells := findTableCells(row)

		if containsTextNode(row, "No transactions") {
			continue
		}

		record, err := createTradeRecordFromCells(cells, columnMapping)
		if err != nil {
			slog.Debug("Failed to create trade record", "error", err, "row", i)
			continue
		}

		records = append(records, record)
	}

	return records, nil
}

// findHeaderRow はヘッダー行を特定します
func findHeaderRow(rows []*html.Node) *html.Node {
	for _, row := range rows {
		for _, attr := range row.Attr {
			if attr.Key == "bgcolor" && (attr.Val == "#C0C0C0" || strings.Contains(attr.Val, "C0C0C0")) {
				return row
			}
		}
	}
	return nil
}

// createColumnMapping はカラムマッピングを作成します
func createColumnMapping(headerCells []*html.Node) map[string]int {
	columnMapping := make(map[string]int)

	for i, cell := range headerCells {
		text := strings.ToLower(extractTextContent(cell))
		textNoSpace := strings.ReplaceAll(text, " ", "")

		switch {
		case text == "ticket" || text == "チケット":
			columnMapping["ticket"] = i
		case strings.Contains(text, "open") && strings.Contains(text, "time") || text == "open time" || text == "オープン時間":
			columnMapping["open_time"] = i
		case text == "type" || text == "タイプ":
			columnMapping["type"] = i
		case text == "size" || text == "ロット" || text == "数量":
			columnMapping["size"] = i
		case text == "item" || text == "シンボル" || text == "symbol":
			columnMapping["item"] = i
		case text == "price" && columnMapping["open_price"] == 0:
			columnMapping["open_price"] = i
		case strings.Contains(textNoSpace, "s/l") || textNoSpace == "sl" || text == "stop loss" || text == "stoploss":
			columnMapping["stop_loss"] = i
		case strings.Contains(textNoSpace, "t/p") || textNoSpace == "tp" || text == "take profit" || text == "takeprofit":
			columnMapping["take_profit"] = i
		case strings.Contains(text, "close") && strings.Contains(text, "time") || text == "close time" || text == "クローズ時間":
			columnMapping["close_time"] = i
		case text == "price" && columnMapping["open_price"] > 0:
			columnMapping["close_price"] = i
		case text == "commission" || text == "手数料":
			columnMapping["commission"] = i
		case text == "taxes" || text == "税金":
			columnMapping["taxes"] = i
		case text == "swap" || text == "スワップ":
			columnMapping["swap"] = i
		case text == "profit" || text == "損益" || text == "利益":
			columnMapping["profit"] = i
		}
	}

	return columnMapping
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

// createTradeRecordFromCells はセルからTradeRecordを作成します
func createTradeRecordFromCells(cells []*html.Node, columnMapping map[string]int) (domain.TradeRecord, error) {
	record := domain.TradeRecord{
		ID: domain.GenerateULID(),
	}

	// チケット番号
	if idx, exists := columnMapping["ticket"]; exists && idx < len(cells) {
		ticketStr := extractTextContent(cells[idx])
		ticketStr = extractNumeric(ticketStr)
		ticket, err := strconv.Atoi(ticketStr)
		if err != nil {
			return domain.TradeRecord{}, fmt.Errorf("invalid ticket number: %s", ticketStr)
		}
		record.Ticket = ticket
	}

	// 取引タイプ
	if idx, exists := columnMapping["type"]; exists && idx < len(cells) {
		typeText := extractTextContent(cells[idx])
		if len(typeText) > 20 {
			return domain.TradeRecord{}, fmt.Errorf("invalid type text (too long): %s", typeText)
		}
		record.Type = typeText
	}

	// サイズ
	if idx, exists := columnMapping["size"]; exists && idx < len(cells) {
		sizeStr := extractTextContent(cells[idx])
		sizeStr = cleanNumericString(sizeStr)
		if size, err := strconv.ParseFloat(sizeStr, 64); err == nil {
			record.Size = size
		}
	}

	// 商品/通貨ペア
	if idx, exists := columnMapping["item"]; exists && idx < len(cells) {
		itemText := extractTextContent(cells[idx])
		if len(itemText) > 20 {
			return domain.TradeRecord{}, fmt.Errorf("invalid item text (too long): %s", itemText)
		}
		record.Item = itemText
	}

	// 取引時間
	if idx, exists := columnMapping["open_time"]; exists && idx < len(cells) {
		openTimeStr := extractTextContent(cells[idx])
		if openTime, err := parseDateTime(openTimeStr); err == nil {
			record.OpenTime = openTime
		}
	}

	// 決済時間
	if idx, exists := columnMapping["close_time"]; exists && idx < len(cells) {
		closeTimeStr := extractTextContent(cells[idx])
		if closeTime, err := parseDateTime(closeTimeStr); err == nil {
			record.CloseTime = closeTime
		}
	}

	// エントリー価格
	if idx, exists := columnMapping["open_price"]; exists && idx < len(cells) {
		priceStr := extractTextContent(cells[idx])
		priceStr = cleanNumericString(priceStr)
		if price, err := strconv.ParseFloat(priceStr, 64); err == nil {
			record.OpenPrice = price
		}
	}

	// クローズ価格
	if idx, exists := columnMapping["close_price"]; exists && idx < len(cells) {
		priceStr := extractTextContent(cells[idx])
		priceStr = cleanNumericString(priceStr)
		if price, err := strconv.ParseFloat(priceStr, 64); err == nil {
			record.ClosePrice = price
		}
	}

	// 損切り価格
	if idx, exists := columnMapping["stop_loss"]; exists && idx < len(cells) {
		slStr := extractTextContent(cells[idx])
		slStr = cleanNumericString(slStr)
		if sl, err := strconv.ParseFloat(slStr, 64); err == nil {
			record.StopLoss = sl
		}
	}

	// 利確価格
	if idx, exists := columnMapping["take_profit"]; exists && idx < len(cells) {
		tpStr := extractTextContent(cells[idx])
		tpStr = cleanNumericString(tpStr)
		if tp, err := strconv.ParseFloat(tpStr, 64); err == nil {
			record.TakeProfit = tp
		}
	}

	// 手数料
	if idx, exists := columnMapping["commission"]; exists && idx < len(cells) {
		commissionStr := extractTextContent(cells[idx])
		commissionStr = cleanNumericString(commissionStr)
		if commission, err := strconv.ParseFloat(commissionStr, 64); err == nil {
			record.Commission = commission
		}
	}

	// 税金
	if idx, exists := columnMapping["taxes"]; exists && idx < len(cells) {
		taxesStr := extractTextContent(cells[idx])
		taxesStr = cleanNumericString(taxesStr)
		if taxes, err := strconv.ParseFloat(taxesStr, 64); err == nil {
			record.Taxes = taxes
		}
	}

	// スワップ
	if idx, exists := columnMapping["swap"]; exists && idx < len(cells) {
		swapStr := extractTextContent(cells[idx])
		swapStr = cleanNumericString(swapStr)
		if swap, err := strconv.ParseFloat(swapStr, 64); err == nil {
			record.Swap = swap
		}
	}

	// 損益
	if idx, exists := columnMapping["profit"]; exists && idx < len(cells) {
		profitStr := extractTextContent(cells[idx])
		profitStr = cleanNumericString(profitStr)
		if profit, err := strconv.ParseFloat(profitStr, 64); err == nil {
			record.Profit = profit
		}
	}

	return record, nil
}

// cleanNumericString は数値文字列をクリーンアップします
func cleanNumericString(s string) string {
	s = strings.TrimSpace(s)
	s = strings.ReplaceAll(s, " ", "")
	s = strings.ReplaceAll(s, ",", "")
	s = strings.ReplaceAll(s, "−", "-")

	currencies := []string{"$", "€", "£", "¥", "円", "元", "₽", "₩", "₺", "₹"}
	for _, curr := range currencies {
		s = strings.ReplaceAll(s, curr, "")
	}

	return s
}

// parseDateTime は日時文字列をパースします
func parseDateTime(dateTimeStr string) (time.Time, error) {
	dateTimeStr = strings.TrimSpace(dateTimeStr)

	if dateTimeStr == "0" || dateTimeStr == "0.00000" || dateTimeStr == "" || dateTimeStr == "&nbsp;" {
		return time.Time{}, fmt.Errorf("empty date time string")
	}

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
		if t, err := time.Parse(format, dateTimeStr); err == nil {
			return t, nil
		}
	}

	return time.Time{}, fmt.Errorf("could not parse date time: %s", dateTimeStr)
}
