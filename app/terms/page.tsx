import { Card, CardHeader, CardTitle, CardContent } from '@/app/components/ui/card';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '利用規約 | TradeInsightAI',
  description: 'TradeInsightAIの利用規約ページです。サービス利用前に必ずご確認ください。',
  robots: { index: true, follow: true },
};

export default function TermsPage() {
  return (
    <div className="flex justify-center items-start py-10 min-h-screen bg-background">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>利用規約</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none dark:prose-invert space-y-6">
          <p className="text-right text-xs text-muted-foreground">最終更新日：2025年5月15日</p>
          <p>
            本利用規約（以下「本規約」といいます）は、TradeInsightAI（以下「本サービス」といいます）の提供条件および利用に関する権利義務関係を定めるものです。ご利用の前に必ずお読みください。
          </p>
          <hr />
          <section>
            <h2>第1条（適用）</h2>
            <p>
              本規約は、利用者と運営者（以下「当社」といいます）との間の本サービスの利用に関わる一切の関係に適用されます。
            </p>
          </section>
          <hr />
          <section>
            <h2>第2条（利用登録）</h2>
            <ol className="list-decimal pl-5 space-y-1">
              <li>利用希望者は、当社の定める方法により利用登録を申請し、当社がこれを承認することで、利用契約が成立します。</li>
              <li>当社は、以下に該当すると判断した場合、登録を拒否することがあります。
                <ul className="list-disc pl-5 mt-1">
                  <li>虚偽の情報を届け出た場合</li>
                  <li>過去に規約違反により利用停止等の処分を受けたことがある場合</li>
                  <li>その他、当社が適切でないと判断した場合</li>
                </ul>
              </li>
            </ol>
          </section>
          <hr />
          <section>
            <h2>第3条（利用料金および支払方法）</h2>
            <ol className="list-decimal pl-5 space-y-1">
              <li>一部機能は無料で提供されますが、プレミアム機能の利用には有料登録が必要です。</li>
              <li>支払いには、当社が指定する決済サービス（Stripe）を使用します。</li>
              <li>利用者は、Stripeの利用規約にも従うものとします。</li>
            </ol>
          </section>
          <hr />
          <section>
            <h2>第4条（禁止事項）</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>法令または公序良俗に違反する行為</li>
              <li>他者の個人情報や取引データの無断取得、使用</li>
              <li>本サービスの運営を妨害する行為</li>
              <li>当社または第三者の知的財産権を侵害する行為</li>
              <li>本サービスを通じて取得した情報の不正利用・転載</li>
            </ul>
          </section>
          <hr />
          <section>
            <h2>第5条（サービス内容の変更等）</h2>
            <p>
              当社は、利用者への事前通知なくして、本サービスの内容を変更、追加または廃止することができます。
            </p>
          </section>
          <hr />
          <section>
            <h2>第6条（免責事項）</h2>
            <ol className="list-decimal pl-5 space-y-1">
              <li>本サービスで提供する分析結果やアドバイスは、情報提供を目的としたものであり、投資判断を保証するものではありません。</li>
              <li>利用者が本サービスを利用したことにより生じた損害について、当社は一切の責任を負いません。</li>
              <li>当サービスは、提供する情報の正確性・完全性について一切保証しません。利用により生じた損害について、当サービス運営者は一切の責任を負いません。</li>
            </ol>
          </section>
          <hr />
          <section>
            <h2>第7条（知的財産権）</h2>
            <p>
              本サービス内のプログラム、画像、テキスト、デザインなどに関する著作権・商標権・その他知的財産権は、当社または当該権利を有する第三者に帰属します。
            </p>
          </section>
          <hr />
          <section>
            <h2>第8条（利用制限および登録抹消）</h2>
            <p>当社は、以下のいずれかに該当する場合、事前の通知なく、利用者に対してサービスの利用制限または登録抹消を行うことができます。</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>本規約に違反した場合</li>
              <li>登録情報に虚偽があった場合</li>
              <li>その他、当社が不適切と判断した場合</li>
            </ul>
          </section>
          <hr />
          <section>
            <h2>第9条（トレード履歴の取扱い）</h2>
            <ol className="list-decimal pl-5 space-y-1">
              <li>利用者がアップロードしたトレード履歴は、分析機能の提供を目的として、当社のデータベースに保存されます。</li>
              <li>トレード履歴は機械的に処理され、当社は個別のトレード内容を第三者に開示しません（法令に基づく開示要請を除く）。</li>
              <li>利用者は、自身のアカウントを削除することで、保存された履歴情報の削除を請求できます。</li>
            </ol>
          </section>
          <hr />
          <section>
            <h2>第10条（個人情報の取扱い）</h2>
            <p>
              当社は、利用者の個人情報を当社の定める「プライバシーポリシー」に従って適切に管理します。
            </p>
          </section>
          <hr />
          <section>
            <h2>第11条（準拠法および裁判管轄）</h2>
            <p>
              本規約の解釈および適用には日本法を準拠法とし、本サービスに関連して生じた紛争については、東京地方裁判所を専属的合意管轄裁判所とします。
            </p>
          </section>
          <hr />
          <section>
            <h2>お問い合わせ</h2>
            <p>
              本規約に関するお問い合わせは、以下までご連絡ください。
            </p>
            <p><strong>Email</strong>: <a href="mailto:support@tradexai.app" className="underline">support@tradexai.app</a></p>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}
