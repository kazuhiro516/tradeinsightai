import * as cheerio from 'cheerio'
import { v4 as uuidv4 } from 'uuid'

// トレードレコードのインターフェース
export interface TradeRecord {
  id: string
  ticket: number
  openTime: Date
  type: string
  size: number
  item: string
  openPrice: number
  stopLoss: number
  takeProfit: number
  closeTime: Date
  closePrice: number
  commission: number
  taxes: number
  swap: number
  profit: number
}

// カラムマッピングのインターフェース
interface ColumnMapping {
  index: number
  name: string
  type: 'string' | 'number' | 'date'
}

// HTMLを解析してトレードレコードを抽出する関数
export function parseHTML(htmlContent: string): TradeRecord[] {
  try {
    // Cheerioを使用してHTMLを解析
    const $ = cheerio.load(htmlContent)

    // テーブルを取得
    const table = $('table')
    if (table.length === 0) {
      throw new Error('テーブルが見つかりません')
    }

    // ヘッダー行を取得
    const headerRow = table.find('thead tr')
    if (headerRow.length === 0) {
      throw new Error('ヘッダー行が見つかりません')
    }

    // ヘッダーセルを取得
    const headerCells = headerRow.find('th')
    if (headerCells.length === 0) {
      throw new Error('ヘッダーセルが見つかりません')
    }

    // カラムマッピングを作成
    const columnMappings = createColumnMappings($, headerCells)

    // データ行を取得
    const dataRows = table.find('tbody tr')
    if (dataRows.length === 0) {
      throw new Error('データ行が見つかりません')
    }

    // データ行からトレードレコードを抽出
    const records: TradeRecord[] = []
    dataRows.each((_, row) => {
      try {
        const cells = $(row).find('td')
        if (cells.length === 0) return

        const record = extractTradeRecord($, cells, columnMappings)
        if (record) {
          records.push(record)
        }
      } catch (error) {
        console.error('行の解析エラー:', error)
        // エラーが発生しても処理を続行
      }
    })

    return records
  } catch (error) {
    console.error('HTML解析エラー:', error)
    throw error
  }
}

// カラムマッピングを作成する関数
function createColumnMappings($: ReturnType<typeof cheerio.load>, headerCells: cheerio.Cheerio): ColumnMapping[] {
  const mappings: ColumnMapping[] = []
  
  headerCells.each((index: number, cell: cheerio.Element) => {
    const headerText = $(cell).text().trim().toLowerCase()
    
    // ヘッダーテキストに基づいてマッピングを作成
    if (headerText.includes('ticket') || headerText.includes('チケット')) {
      mappings.push({ index, name: 'ticket', type: 'number' })
    } else if (headerText.includes('open') && headerText.includes('time') || headerText.includes('開始時間')) {
      mappings.push({ index, name: 'openTime', type: 'date' })
    } else if (headerText.includes('type') || headerText.includes('タイプ')) {
      mappings.push({ index, name: 'type', type: 'string' })
    } else if (headerText.includes('size') || headerText.includes('サイズ')) {
      mappings.push({ index, name: 'size', type: 'number' })
    } else if (headerText.includes('item') || headerText.includes('アイテム')) {
      mappings.push({ index, name: 'item', type: 'string' })
    } else if (headerText.includes('open') && headerText.includes('price') || headerText.includes('開始価格')) {
      mappings.push({ index, name: 'openPrice', type: 'number' })
    } else if (headerText.includes('stop') && headerText.includes('loss') || headerText.includes('損切り')) {
      mappings.push({ index, name: 'stopLoss', type: 'number' })
    } else if (headerText.includes('take') && headerText.includes('profit') || headerText.includes('利確')) {
      mappings.push({ index, name: 'takeProfit', type: 'number' })
    } else if (headerText.includes('close') && headerText.includes('time') || headerText.includes('終了時間')) {
      mappings.push({ index, name: 'closeTime', type: 'date' })
    } else if (headerText.includes('close') && headerText.includes('price') || headerText.includes('終了価格')) {
      mappings.push({ index, name: 'closePrice', type: 'number' })
    } else if (headerText.includes('commission') || headerText.includes('手数料')) {
      mappings.push({ index, name: 'commission', type: 'number' })
    } else if (headerText.includes('taxes') || headerText.includes('税金')) {
      mappings.push({ index, name: 'taxes', type: 'number' })
    } else if (headerText.includes('swap') || headerText.includes('スワップ')) {
      mappings.push({ index, name: 'swap', type: 'number' })
    } else if (headerText.includes('profit') || headerText.includes('損益')) {
      mappings.push({ index, name: 'profit', type: 'number' })
    }
  })
  
  return mappings
}

// セルからトレードレコードを抽出する関数
function extractTradeRecord($: ReturnType<typeof cheerio.load>, cells: cheerio.Cheerio, mappings: ColumnMapping[]): TradeRecord | null {
  try {
    // 必須フィールドの存在確認
    const ticketMapping = mappings.find(m => m.name === 'ticket')
    const openTimeMapping = mappings.find(m => m.name === 'openTime')
    const typeMapping = mappings.find(m => m.name === 'type')
    const itemMapping = mappings.find(m => m.name === 'item')
    
    if (!ticketMapping || !openTimeMapping || !typeMapping || !itemMapping) {
      return null
    }
    
    // レコードを作成
    const record: Partial<TradeRecord> = {
      id: uuidv4(),
    }
    
    // マッピングに基づいて値を設定
    mappings.forEach(mapping => {
      const cell = cells.eq(mapping.index)
      if (cell.length === 0) return
      
      const value = cell.text().trim()
      
      switch (mapping.name) {
        case 'ticket':
          record.ticket = parseInt(value, 10) || 0
          break
        case 'openTime':
          record.openTime = parseDate(value)
          break
        case 'type':
          record.type = value
          break
        case 'size':
          record.size = parseFloat(value) || 0
          break
        case 'item':
          record.item = value
          break
        case 'openPrice':
          record.openPrice = parseFloat(value) || 0
          break
        case 'stopLoss':
          record.stopLoss = parseFloat(value) || 0
          break
        case 'takeProfit':
          record.takeProfit = parseFloat(value) || 0
          break
        case 'closeTime':
          record.closeTime = parseDate(value)
          break
        case 'closePrice':
          record.closePrice = parseFloat(value) || 0
          break
        case 'commission':
          record.commission = parseFloat(value) || 0
          break
        case 'taxes':
          record.taxes = parseFloat(value) || 0
          break
        case 'swap':
          record.swap = parseFloat(value) || 0
          break
        case 'profit':
          record.profit = parseFloat(value) || 0
          break
      }
    })
    
    // 必須フィールドの存在確認
    if (!record.ticket || !record.openTime || !record.type || !record.item) {
      return null
    }
    
    // デフォルト値を設定
    if (!record.closeTime) record.closeTime = new Date()
    if (!record.closePrice) record.closePrice = 0
    if (!record.commission) record.commission = 0
    if (!record.taxes) record.taxes = 0
    if (!record.swap) record.swap = 0
    if (!record.profit) record.profit = 0
    if (!record.size) record.size = 0
    if (!record.openPrice) record.openPrice = 0
    if (!record.stopLoss) record.stopLoss = 0
    if (!record.takeProfit) record.takeProfit = 0
    
    return record as TradeRecord
  } catch (error) {
    console.error('レコード抽出エラー:', error)
    return null
  }
}

// 日付文字列をDateオブジェクトに変換する関数
function parseDate(dateStr: string): Date {
  // 様々な日付形式に対応
  const formats = [
    // YYYY-MM-DD HH:MM:SS
    /(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/,
    // DD.MM.YYYY HH:MM:SS
    /(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2}):(\d{2})/,
    // MM/DD/YYYY HH:MM:SS
    /(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})/,
  ]
  
  for (const format of formats) {
    const match = dateStr.match(format)
    if (match) {
      if (format === formats[0]) {
        // YYYY-MM-DD HH:MM:SS
        return new Date(
          parseInt(match[1], 10),
          parseInt(match[2], 10) - 1,
          parseInt(match[3], 10),
          parseInt(match[4], 10),
          parseInt(match[5], 10),
          parseInt(match[6], 10)
        )
      } else if (format === formats[1]) {
        // DD.MM.YYYY HH:MM:SS
        return new Date(
          parseInt(match[3], 10),
          parseInt(match[2], 10) - 1,
          parseInt(match[1], 10),
          parseInt(match[4], 10),
          parseInt(match[5], 10),
          parseInt(match[6], 10)
        )
      } else if (format === formats[2]) {
        // MM/DD/YYYY HH:MM:SS
        return new Date(
          parseInt(match[3], 10),
          parseInt(match[1], 10) - 1,
          parseInt(match[2], 10),
          parseInt(match[4], 10),
          parseInt(match[5], 10),
          parseInt(match[6], 10)
        )
      }
    }
  }
  
  // デフォルトは現在の日時
  return new Date()
} 