import { NextResponse } from "next/server";

export async function GET(req: Request) {
  // URLからクエリパラメーターを取得
  const { searchParams } = new URL(req.url);
  const filterParam = searchParams.get("filter");

  if (!filterParam) {
    return NextResponse.json(
      { error: "Missing filter parameter" },
      { status: 400 }
    );
  }

  let filter;
  try {
    // クエリパラメーターから受け取った文字列をパースしてJSONオブジェクトに変換
    filter = JSON.parse(filterParam);
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid filter JSON" },
      { status: 400 }
    );
  }

  // ここでフィルターを利用してデータベースや他のサービスから取引記録を取得する処理を実装
  // 今回はサンプルとして非同期処理を模した関数でダミーデータを返しています
  const tradeRecords = await fetchTradeRecords(filter);

  return NextResponse.json({ tradeRecords });
}

// ダミーデータを返す非同期関数の例
async function fetchTradeRecords(filter: any) {
  // filterに基づく処理は実装内容に応じて適宜調整してください
  return [
    {
      id: 1,
      ticketId: 1001,
      type: "BUY",
      item: "USD/JPY",
      size: 1.0,
      profit: 50.0,
      openPrice: 1.2,
      startDate: "2023-01-01T00:00:00Z",
      endDate: "2023-01-02T00:00:00Z"
    },
    {
      id: 2,
      ticketId: 1002,
      type: "SELL",
      item: "EUR/USD",
      size: 2.0,
      profit: 100.0,
      openPrice: 1.3,
      startDate: "2023-02-01T00:00:00Z",
      endDate: "2023-02-02T00:00:00Z"
    }
  ];
}
