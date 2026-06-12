#!/usr/bin/env node
/**
 * 各レイアウトテンプレートにサンプル内容を差し込んでプレビュー HTML を生成し、
 * カテゴリ別に並べたギャラリー (preview/index.html) を出力します。
 * ギャラリーからは「選択／一括ダウンロード(ZIP)」「インストーラ生成」が行えます。
 *
 *   node account-engagement/preview.mjs
 *
 * 実 API には接続しません（マージタグをダミー値に置換するのみ）。
 */
import { readFileSync, readdirSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TPL_DIR = join(__dirname, "templates");
const OUT_DIR = join(__dirname, "preview");

const ACCOUNT_NAME = "サンプル株式会社";
const ACCOUNT_WEB = "#";

const CATEGORY_LABEL = {
  landing: "ランディングページ",
  form: "フォーム",
  event: "イベント / ウェビナー",
  thankyou: "サンクスページ",
  utility: "配信設定",
};
const CATEGORY_ORDER = ["landing", "form", "event", "thankyou", "utility"];

// ---- サンプル差込内容 (%%content%%) -------------------------------------
const STD_FORM = `<form>
  <p><label>会社名</label><br><input type="text" value="株式会社サンプル"></p>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p><label>電話番号</label><br><input type="tel" value="03-0000-0000"></p>
  <p class="submit"><input type="submit" value="送信する"></p>
</form>`;

const CONTACT_FORM = `<form>
  <p><label>会社名</label><br><input type="text" value="株式会社サンプル"></p>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p><label>お問い合わせ内容</label><br><textarea>製品の詳細について教えてください。</textarea></p>
  <p class="submit"><input type="submit" value="この内容で送信する"></p>
</form>`;

const NEWSLETTER_FORM = `<form>
  <p><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="登録する"></p>
</form>`;

const TOPICS_FORM = `<form>
  <p><input type="email" value="taro@example.com"></p>
  <fieldset><legend>興味のあるトピック</legend>
    <label><input type="checkbox" checked><span><span class="ti">プロダクト最新情報</span><span class="de">新機能やアップデートのお知らせ</span></span></label>
    <label><input type="checkbox" checked><span><span class="ti">活用ノウハウ</span><span class="de">業務に役立つTipsやHow-to</span></span></label>
    <label><input type="checkbox"><span><span class="ti">導入事例</span><span class="de">他社の成功事例インタビュー</span></span></label>
    <label><input type="checkbox"><span><span class="ti">セミナー・イベント</span><span class="de">オンライン/オフライン開催の案内</span></span></label>
  </fieldset>
  <p class="submit"><input type="submit" value="購読する"></p>
</form>`;

const DATA_REQUEST_FORM = `<form>
  <p><label>ご請求の種類</label><br><select><option selected>登録情報の開示</option><option>情報の訂正・追加</option><option>利用停止・消去</option><option>第三者提供の停止</option></select></p>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>ご登録のメールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p><label>ご登録の電話番号</label><br><input type="tel" value="090-0000-0000"></p>
  <p><label>ご請求の詳細</label><br><textarea>退会済みアカウントの登録情報の消去を希望します。</textarea></p>
  <p class="submit"><input type="submit" value="この内容で請求する"></p>
</form>`;

const UPSELL_FORM = `<form>
  <p class="submit"><input type="submit" value="¥1,980で今すぐ追加する"></p>
</form>`;

const OPTIN_CONFIRM_FORM = `<form>
  <p><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="登録を確定する"></p>
</form>`;

const JOBFAIR_FORM = `<form>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p><label>ご来場予定</label><br><select><option selected>午前（11:00〜）</option><option>午後（14:00〜）</option><option>未定</option></select></p>
  <p class="submit"><input type="submit" value="来場予約をする"></p>
</form>`;

const SUGGESTION_FORM = `<form>
  <p><label>ご意見の種類</label><br><select><option selected>サービスへの提案</option><option>不具合の報告</option><option>業務改善のアイデア</option><option>その他</option></select></p>
  <p><label>内容</label><br><textarea>検索結果の並び順を選べるようにしてほしいです。</textarea></p>
  <p><label>お名前（任意）</label><br><input type="text" value="山田 太郎"></p>
  <p><label>返信先メール（任意）</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="提案を送信する"></p>
</form>`;

const SURVEY_FORM = `<form>
  <fieldset><legend>総合満足度</legend>
    <label><input type="radio" name="sat">とても満足</label>
    <label><input type="radio" name="sat" checked>満足</label>
    <label><input type="radio" name="sat">普通</label>
    <label><input type="radio" name="sat">不満</label>
  </fieldset>
  <fieldset><legend>役立った点（複数可）</legend>
    <label><input type="checkbox" checked>使いやすさ</label>
    <label><input type="checkbox">サポート</label>
    <label><input type="checkbox">価格</label>
  </fieldset>
  <p><label>ご意見・ご要望</label><br><textarea>とても使いやすかったです。</textarea></p>
  <p class="submit"><input type="submit" value="回答を送信"></p>
</form>`;

const PREFERENCE_FORM = `<form>
  <fieldset><legend>受け取りたい情報</legend>
    <label><input type="checkbox" checked> 製品アップデート</label>
    <label><input type="checkbox" checked> イベント・セミナー案内</label>
    <label><input type="checkbox"> ニュースレター</label>
    <label><input type="checkbox"> キャンペーン情報</label>
  </fieldset>
  <fieldset><legend>配信頻度</legend>
    <label><input type="radio" name="freq" checked> 都度</label>
    <label><input type="radio" name="freq"> 週1回まとめて</label>
    <label><input type="radio" name="freq"> 月1回まとめて</label>
  </fieldset>
  <p class="submit"><input type="submit" value="設定を保存"></p>
</form>`;

const UNSUB_FORM = `<form>
  <label><input type="radio" name="r" checked> 配信頻度が多い</label>
  <label><input type="radio" name="r"> 内容が役に立たない</label>
  <label><input type="radio" name="r"> 登録した覚えがない</label>
  <label><input type="radio" name="r"> その他</label>
  <p style="margin-top:10px;"><textarea placeholder="ご意見（任意）"></textarea></p>
  <p class="submit"><input type="submit" value="配信を停止する"></p>
</form>`;

const LANDING_BODY = `<h2>こんな課題はありませんか？</h2>
<p>日々の業務に追われ、本来注力すべき仕事に時間を割けない——。本サービスは繰り返し作業を自動化し、チーム全体の生産性を底上げします。</p>
<h2>導入で得られること</h2>
<ul>
  <li>作業時間を平均40%削減</li>
  <li>ヒューマンエラーの大幅な低減</li>
  <li>リアルタイムな進捗の可視化</li>
</ul>
<p style="margin-top:24px;"><a href="#" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 26px;border-radius:8px;font-weight:700;">資料を請求する</a></p>`;

const PRICING_INTRO = `<p>すべてのプランで30日間の無料トライアルをご利用いただけます。年払いなら2ヶ月分お得。詳細はお気軽にお問い合わせください。</p>`;

const CASESTUDY_BODY = `<h2>導入の背景</h2>
<p>業務が属人化し、担当者の負荷が高止まりしていました。標準化と自動化を両立できる仕組みを探していたところ、本サービスの導入に至りました。</p>
<blockquote>「導入後、定型業務にかかる時間が体感で半分以下になりました。チームが本来の業務に集中できています。」</blockquote>
<h2>成果</h2>
<p>導入から3ヶ月で主要KPIが改善。現在は他部門への展開も進めています。</p>`;

const EVENT_BODY = `<h2>本セミナーの概要</h2>
<p>最新の市場動向と、現場で成果を出すための実践ノウハウを、第一線の登壇者が解説します。</p>
<h3>こんな方におすすめ</h3>
<ul><li>DX推進を任されている方</li><li>業務改善のヒントを探している方</li><li>同業他社の取り組みを知りたい方</li></ul>
<h3>当日のプログラム</h3>
<ul><li>14:00　開会・基調講演</li><li>14:40　導入事例セッション</li><li>15:30　質疑応答・個別相談</li></ul>`;

const THANKYOU_BODY = `<h1>送信が完了しました</h1>
<p>お問い合わせ／お申し込みいただきありがとうございます。<br>担当者より追ってご連絡いたしますので、今しばらくお待ちください。</p>`;

const THANKYOU_DL_BODY = `<h1>ダウンロードの準備ができました</h1>
<p>ご登録ありがとうございます。下のボタンから資料をダウンロードいただけます。</p>
<a class="ae-dl" href="#">⬇ 資料をダウンロード</a>`;

const CONFIRM_BODY = `<h1>確認メールを送信しました</h1>
<p>ご登録のメールアドレス宛に確認メールをお送りしました。<br>本文内のリンクをクリックして登録を完了してください。</p>`;

const REFERRAL_FORM = `<form>
  <p><label>あなたのお名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>ご友人のメールアドレス</label><br><input type="email" value="friend@example.com"></p>
  <p class="submit"><input type="submit" value="招待を送る"></p>
</form>`;

const FAQ_BODY = `<p style="text-align:center;color:#475569;">上記で解決しない場合は、お気軽にサポートまでお問い合わせください。担当者が丁寧にご案内します。</p>`;

const COMPARISON_BODY = `<p>料金・機能・サポートを総合的に比較しても、当社サービスは高いコストパフォーマンスを実現しています。</p>`;

const JOBAPPLY_FORM = `<form>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p><label>電話番号</label><br><input type="tel" value="090-0000-0000"></p>
  <p><label>希望職種</label><br><select><option>ソフトウェアエンジニア</option><option>デザイナー</option><option>PM</option></select></p>
  <p><label>履歴書 / 職務経歴書</label><br><input type="file"></p>
  <p><label>志望動機</label><br><textarea>貴社のプロダクトに強く共感し応募しました。</textarea></p>
  <p class="submit"><input type="submit" value="応募する"></p>
</form>`;

const RSVP_FORM = `<form>
  <p><label><input type="radio" name="rsvp" checked> 出席する</label> <label><input type="radio" name="rsvp"> 欠席する</label> <label><input type="radio" name="rsvp"> 検討中</label></p>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p><label>参加人数</label><br><select><option>1名</option><option>2名</option><option>3名以上</option></select></p>
  <p class="submit"><input type="submit" value="回答を送信"></p>
</form>`;

const HYBRID_FORM = `<form>
  <p><label>参加形式</label><br><select><option selected>会場で参加</option><option>オンラインで参加</option></select></p>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p><label>会社名</label><br><input type="text" value="株式会社サンプル"></p>
  <p class="submit"><input type="submit" value="参加を申し込む"></p>
</form>`;

const APP_BODY = `<p>App Store / Google Play から無料でダウンロードできます。QRコードからもアクセス可能です。</p>`;

const COUPON_BODY = `<h1>ご登録ありがとうございます！</h1>
<p>特典として使える限定クーポンをご用意しました。<br>下記コードを購入時にご入力ください。</p>`;

const QUIZ_FORM = `<form>
  <fieldset><legend>Q1. 現在の主な課題は？</legend>
    <label><input type="radio" name="q1" checked> 業務効率化</label>
    <label><input type="radio" name="q1"> コスト削減</label>
    <label><input type="radio" name="q1"> 売上拡大</label>
  </fieldset>
  <fieldset><legend>Q2. ご利用人数は？</legend>
    <label><input type="radio" name="q2"> 〜10名</label>
    <label><input type="radio" name="q2" checked> 11〜50名</label>
    <label><input type="radio" name="q2"> 51名以上</label>
  </fieldset>
  <p><label>結果の送信先メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="診断結果を見る"></p>
</form>`;

const NPS_FORM = `<form>
  <div class="ae-scale">
    ${[0,1,2,3,4,5,6,7,8,9,10].map((n)=>`<label><input type="radio" name="nps"${n===9?" checked":""}><span>${n}</span></label>`).join("")}
  </div>
  <div class="ae-ends"><span>全く思わない</span><span>強くそう思う</span></div>
  <p><label>そのスコアにした理由（任意）</label><br><textarea>サポートが手厚く、安心して使えるため。</textarea></p>
  <p class="submit"><input type="submit" value="送信する"></p>
</form>`;

const ONBOARDING_BODY = `<h1>ようこそ、サンプル株式会社へ！</h1>
<p>ご登録ありがとうございます。下のステップに沿って、さっそく始めましょう。</p>`;

const DONATION_FORM = `<form>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="この金額で寄付する"></p>
</form>`;

const PWRESET_FORM = `<form>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="再設定リンクを送信"></p>
</form>`;

const QUOTE_FORM = `<form>
  <div class="row"><p><label>会社名</label><br><input type="text" value="株式会社サンプル"></p><p><label>お名前</label><br><input type="text" value="山田 太郎"></p></div>
  <div class="row"><p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p><p><label>電話番号</label><br><input type="tel" value="03-0000-0000"></p></div>
  <p><label>ご希望の製品/サービス</label><br><select><option>スタータープラン</option><option>ビジネスプラン</option><option>エンタープライズ</option></select></p>
  <p><label>想定ご利用人数・ご要望</label><br><textarea>50名規模での導入を検討しています。</textarea></p>
  <p class="submit"><input type="submit" value="見積もりを依頼する"></p>
</form>`;

const BOOKING_FORM = `<form>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <div class="row">
    <p><label>希望日</label><br><input type="date" value="2026-07-01"></p>
    <p><label>時間帯</label><br><select><option>10:00</option><option>13:00</option><option selected>15:00</option><option>17:00</option></select></p>
  </div>
  <p class="submit"><input type="submit" value="この日時で予約する"></p>
</form>`;

const MEMBER_CANCEL_FORM = `<form>
  <p><label>退会の理由</label><br><select><option selected>あまり使わなくなった</option><option>料金が高い</option><option>機能に不満がある</option><option>他のサービスに移行する</option><option>その他</option></select></p>
  <p><label>差し支えなければ詳しく</label><br><textarea>使う機会が減ってしまいました。</textarea></p>
  <p><label>ご登録のメールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="退会を確定する"></p>
</form>`;

const ALUMNI_FORM = `<form>
  <p><label><input type="radio" name="rsvp" checked> 出席する</label> <label><input type="radio" name="rsvp"> 欠席する</label></p>
  <p><label>お名前（旧姓があれば併記）</label><br><input type="text" value="山田 太郎"></p>
  <p><label>卒業年・期</label><br><input type="text" value="2006年卒・第18期"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p><label>近況・ひとこと</label><br><textarea>久しぶりにみんなに会えるのを楽しみにしています！</textarea></p>
  <p class="submit"><input type="submit" value="出欠を回答する"></p>
</form>`;

const VET_FORM = `<form>
  <p><label>診療内容</label><br><select><option selected>予防接種</option><option>健康診断</option><option>歯科ケア</option><option>去勢・避妊</option><option>体調が悪い・その他</option></select></p>
  <div class="row"><p><label>ペットの種類</label><br><select><option selected>犬</option><option>猫</option><option>その他</option></select></p><p><label>ご希望日</label><br><input type="date" value="2026-07-15"></p></div>
  <p><label>症状・ご相談（任意）</label><br><textarea>最近あまり食欲がありません。</textarea></p>
  <p><label>飼い主さまのお名前</label><br><input type="text" value="山田 太郎"></p>
  <div class="row"><p><label>メール</label><br><input type="email" value="taro@example.com"></p><p><label>電話番号</label><br><input type="tel" value="090-0000-0000"></p></div>
  <p class="submit"><input type="submit" value="診察を予約する"></p>
</form>`;

const TAX_CONSULT_FORM = `<form>
  <p><label>ご相談内容</label><br><select><option selected>確定申告（個人・フリーランス）</option><option>法人決算・記帳代行</option><option>相続・贈与のご相談</option><option>節税・税務全般</option><option>その他</option></select></p>
  <div class="row"><p><label>お名前</label><br><input type="text" value="山田 太郎"></p><p><label>電話番号</label><br><input type="tel" value="090-0000-0000"></p></div>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p><label>ご希望の相談方法</label><br><select><option selected>オンライン面談</option><option>来所</option><option>電話</option></select></p>
  <p><label>ご相談の概要（任意）</label><br><textarea>個人事業の確定申告について相談したいです。</textarea></p>
  <p class="submit"><input type="submit" value="無料相談を予約する"></p>
</form>`;

const LOCKSMITH_FORM = `<form>
  <p><label>トラブル内容</label><br><select><option selected>締め出し・鍵開け</option><option>鍵の紛失</option><option>鍵交換・防犯強化</option><option>合鍵作製</option><option>金庫・その他</option></select></p>
  <p><label>場所</label><br><select><option selected>自宅（玄関）</option><option>自宅（その他のドア）</option><option>車・バイク</option><option>店舗・オフィス</option></select></p>
  <div class="row"><p><label>お名前</label><br><input type="text" value="山田 太郎"></p><p><label>電話番号</label><br><input type="tel" value="090-0000-0000"></p></div>
  <p><label>ご希望時間</label><br><select><option selected>今すぐ（最短）</option><option>本日中</option><option>日時指定</option></select></p>
  <p class="submit"><input type="submit" value="出張・見積を依頼する"></p>
</form>`;

const PHONE_REPAIR_FORM = `<form>
  <p><label>機種</label><br><select><option selected>iPhone</option><option>Android スマホ</option><option>iPad / タブレット</option><option>その他</option></select></p>
  <p><label>症状・ご希望の修理</label><br><select><option selected>画面割れ・液晶不良</option><option>バッテリー交換</option><option>水没・電源が入らない</option><option>充電できない</option><option>その他・診断希望</option></select></p>
  <div class="row"><p><label>ご来店希望日</label><br><input type="date" value="2026-07-20"></p><p><label>希望時間帯</label><br><select><option selected>午前</option><option>午後</option><option>夕方以降</option></select></p></div>
  <div class="row"><p><label>お名前</label><br><input type="text" value="山田 太郎"></p><p><label>電話番号</label><br><input type="tel" value="090-0000-0000"></p></div>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="修理を予約する"></p>
</form>`;

const LAWN_FORM = `<form>
  <p><label>ご希望の作業</label><br><select><option selected>芝刈り・草刈り</option><option>植木の剪定</option><option>除草・防草シート</option><option>庭まわりの清掃</option><option>定期メンテナンス</option></select></p>
  <p><label>お庭のおおよその広さ</label><br><select><option selected>〜20㎡</option><option>20〜50㎡</option><option>50〜100㎡</option><option>100㎡以上・わからない</option></select></p>
  <div class="row"><p><label>お名前</label><br><input type="text" value="山田 太郎"></p><p><label>電話番号</label><br><input type="tel" value="090-0000-0000"></p></div>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p><label>ご希望時期・ご要望（任意）</label><br><textarea>夏前に一度きれいにしたいです。</textarea></p>
  <p class="submit"><input type="submit" value="無料見積りを依頼する"></p>
</form>`;

const VACCINE_FORM = `<form>
  <p><label>接種ご希望のワクチン</label><br><select><option selected>インフルエンザ</option><option>肺炎球菌</option><option>帯状疱疹</option><option>渡航ワクチン（要相談）</option><option>その他</option></select></p>
  <p><label>対象の方</label><br><select><option selected>本人（大人）</option><option>子ども</option><option>高齢者</option></select></p>
  <div class="row"><p><label>ご希望日</label><br><input type="date" value="2026-10-15"></p><p><label>希望時間帯</label><br><select><option selected>午前</option><option>午後</option><option>夕方以降</option></select></p></div>
  <div class="row"><p><label>お名前</label><br><input type="text" value="山田 太郎"></p><p><label>電話番号</label><br><input type="tel" value="090-0000-0000"></p></div>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="接種を予約する"></p>
</form>`;

const SWIM_FORM = `<form>
  <p><label>受講される方</label><br><select><option selected>ベビー・幼児</option><option>子ども（小学生）</option><option>大人</option></select></p>
  <p><label>ご希望コース</label><br><select><option selected>水慣れ・基礎</option><option>4泳法マスター</option><option>健康・体力づくり</option><option>選手・上級</option></select></p>
  <div class="row"><p><label>お名前</label><br><input type="text" value="山田 太郎"></p><p><label>体験希望日</label><br><input type="date" value="2026-07-27"></p></div>
  <div class="row"><p><label>メール</label><br><input type="email" value="taro@example.com"></p><p><label>電話番号</label><br><input type="tel" value="090-0000-0000"></p></div>
  <p class="submit"><input type="submit" value="無料体験を申し込む"></p>
</form>`;

const DANCE_FORM = `<form>
  <p><label>ご希望のジャンル</label><br><select><option selected>HIPHOP</option><option>バレエ</option><option>JAZZ</option><option>K-POP</option><option>キッズダンス</option><option>未定・相談したい</option></select></p>
  <div class="row"><p><label>受講される方</label><br><select><option selected>お子さま</option><option>大人</option></select></p><p><label>体験希望日</label><br><input type="date" value="2026-07-27"></p></div>
  <p><label>お名前</label><br><input type="text" value="山田 花子"></p>
  <div class="row"><p><label>メール</label><br><input type="email" value="hanako@example.com"></p><p><label>電話番号</label><br><input type="tel" value="090-0000-0000"></p></div>
  <p class="submit"><input type="submit" value="無料体験を申し込む"></p>
</form>`;

const DETAILING_FORM = `<form>
  <p><label>ご希望メニュー</label><br><select><option selected>手洗い洗車</option><option>ガラスコーティング</option><option>車内クリーニング</option><option>セット（洗車＋コーティング）</option><option>相談・見積希望</option></select></p>
  <div class="row"><p><label>車種・サイズ</label><br><select><option selected>軽・コンパクト</option><option>セダン・ミニバン</option><option>SUV・大型</option><option>輸入車</option></select></p><p><label>ご希望日</label><br><input type="date" value="2026-07-27"></p></div>
  <div class="row"><p><label>お名前</label><br><input type="text" value="山田 太郎"></p><p><label>電話番号</label><br><input type="tel" value="090-0000-0000"></p></div>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="予約・見積を依頼する"></p>
</form>`;

const HAIR_SALON_FORM = `<form>
  <p><label>ご希望メニュー</label><br><select><option selected>カット</option><option>カット＋カラー</option><option>カット＋パーマ</option><option>トリートメント</option><option>その他・相談</option></select></p>
  <p><label>ご希望スタイリスト</label><br><select><option selected>指名なし（おまかせ）</option><option>店長</option><option>スタイリストA</option><option>スタイリストB</option></select></p>
  <div class="row"><p><label>ご希望日</label><br><input type="date" value="2026-07-26"></p><p><label>希望時間帯</label><br><select><option selected>午前</option><option>午後</option><option>夕方以降</option></select></p></div>
  <p><label>お名前</label><br><input type="text" value="山田 花子"></p>
  <div class="row"><p><label>メール</label><br><input type="email" value="hanako@example.com"></p><p><label>電話番号</label><br><input type="tel" value="090-0000-0000"></p></div>
  <p class="submit"><input type="submit" value="この内容で予約する"></p>
</form>`;

const FLORIST_FORM = `<form>
  <p><label>ご用途</label><br><select><option selected>誕生日</option><option>お祝い（開店・結婚など）</option><option>記念日</option><option>お供え・お悔やみ</option><option>その他</option></select></p>
  <div class="row"><p><label>ご予算</label><br><select><option>〜3,000円</option><option selected>3,000〜5,000円</option><option>5,000〜10,000円</option><option>10,000円〜</option></select></p><p><label>お届け日</label><br><input type="date" value="2026-07-26"></p></div>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <div class="row"><p><label>メール</label><br><input type="email" value="taro@example.com"></p><p><label>電話番号</label><br><input type="tel" value="090-0000-0000"></p></div>
  <p><label>メッセージ・ご要望（任意）</label><br><textarea>明るい色合いでお願いします。</textarea></p>
  <p class="submit"><input type="submit" value="この内容で注文する"></p>
</form>`;

const EYEWEAR_FORM = `<form>
  <p><label>ご希望メニュー</label><br><select><option selected>視力測定＋メガネ相談</option><option>コンタクトレンズ（処方・体験）</option><option>サングラス・度入り相談</option><option>メガネの調整・修理</option></select></p>
  <div class="row"><p><label>ご希望日</label><br><input type="date" value="2026-07-26"></p><p><label>希望時間帯</label><br><select><option selected>午前</option><option>午後</option><option>夕方以降</option></select></p></div>
  <div class="row"><p><label>お名前</label><br><input type="text" value="山田 太郎"></p><p><label>電話番号</label><br><input type="tel" value="090-0000-0000"></p></div>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="来店を予約する"></p>
</form>`;

const DENTAL_FORM = `<form>
  <p><label>ご希望の診療</label><br><select><option selected>定期健診</option><option>クリーニング（歯石除去）</option><option>むし歯・痛みの相談</option><option>予防指導・歯みがき相談</option></select></p>
  <div class="row"><p><label>ご希望日</label><br><input type="date" value="2026-07-25"></p><p><label>希望時間帯</label><br><select><option selected>午前</option><option>午後</option><option>夕方以降</option></select></p></div>
  <div class="row"><p><label>お名前</label><br><input type="text" value="山田 太郎"></p><p><label>電話番号</label><br><input type="tel" value="090-0000-0000"></p></div>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="この内容で予約する"></p>
</form>`;

const COWORKING_FORM = `<form>
  <p><label>ご希望プラン</label><br><select><option selected>ドロップイン（1日）</option><option>月額・フリー席</option><option>月額・固定席/個室</option><option>法人契約・住所登記</option></select></p>
  <div class="row"><p><label>内覧希望日</label><br><input type="date" value="2026-07-25"></p><p><label>希望時間帯</label><br><select><option selected>午前</option><option>午後</option><option>夕方以降</option></select></p></div>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <div class="row"><p><label>メール</label><br><input type="email" value="taro@example.com"></p><p><label>電話番号</label><br><input type="tel" value="090-0000-0000"></p></div>
  <p class="submit"><input type="submit" value="内覧・無料体験を予約する"></p>
</form>`;

const STORAGE_UPGRADE_FORM = `<form>
  <p><label>アップグレード先プラン</label><br><select><option>100 GB（¥250/月）</option><option selected>1 TB（¥1,200/月）</option><option>2 TB（¥2,200/月）</option></select></p>
  <p><label>お支払い方法</label><br><select><option selected>登録中のクレジットカード</option><option>新しいカードを登録</option></select></p>
  <p class="submit"><input type="submit" value="アップグレードする"></p>
</form>`;

const SECURITY_FORM = `<form>
  <p><label>住まいの種類</label><br><select><option selected>戸建て</option><option>マンション・アパート</option><option>店舗・事務所</option><option>空き家・別荘</option></select></p>
  <p><label>ご関心のあるサービス</label><br><select><option selected>防犯カメラ</option><option>侵入センサー・警報</option><option>駆けつけ・常時監視</option><option>トータルで相談したい</option></select></p>
  <div class="row"><p><label>お名前</label><br><input type="text" value="山田 太郎"></p><p><label>電話番号</label><br><input type="tel" value="090-0000-0000"></p></div>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="無料診断・見積を申し込む"></p>
</form>`;

const TRIAL_SIGNUP_FORM = `<form>
  <div class="row"><p><label>お名前</label><br><input type="text" value="山田 太郎"></p><p><label>会社名</label><br><input type="text" value="サンプル株式会社"></p></div>
  <p><label>会社メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p><label>従業員規模</label><br><select><option selected>1〜10名</option><option>11〜50名</option><option>51〜300名</option><option>301名以上</option></select></p>
  <p class="submit"><input type="submit" value="無料トライアルを始める"></p>
</form>`;

const TRAINING_FORM = `<form>
  <div class="row"><p><label>会社名</label><br><input type="text" value="サンプル株式会社"></p><p><label>ご担当者名</label><br><input type="text" value="山田 太郎"></p></div>
  <div class="row"><p><label>メール</label><br><input type="email" value="taro@example.com"></p><p><label>電話番号</label><br><input type="tel" value="03-0000-0000"></p></div>
  <p><label>ご希望の研修テーマ</label><br><select><option selected>新入社員研修</option><option>管理職・リーダー研修</option><option>営業力強化</option><option>DX・IT リテラシー</option><option>ハラスメント防止</option><option>その他</option></select></p>
  <div class="row"><p><label>対象人数</label><br><input type="text" value="20名"></p><p><label>実施希望時期</label><br><input type="date" value="2026-09-01"></p></div>
  <p><label>ご相談内容（任意）</label><br><textarea>来期の新人研修を検討しています。</textarea></p>
  <p class="submit"><input type="submit" value="無料で相談・見積を依頼する"></p>
</form>`;

const EARLY_ACCESS_FORM = `<form>
  <p><label>主なご利用環境</label><br><select><option selected>Web（ブラウザ）</option><option>iOS アプリ</option><option>Android アプリ</option><option>デスクトップ</option></select></p>
  <p><label>チーム人数</label><br><select><option selected>1人（個人）</option><option>2〜5人</option><option>6〜20人</option><option>21人以上</option></select></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="セットアップ情報を受け取る"></p>
</form>`;

const BALLOON_FORM = `<form>
  <p><label>代表者のお名前</label><br><input type="text" value="山田 太郎"></p>
  <div class="row"><p><label>メール</label><br><input type="email" value="taro@example.com"></p><p><label>電話番号</label><br><input type="tel" value="090-0000-0000"></p></div>
  <div class="row"><p><label>搭乗希望日</label><br><input type="date" value="2026-10-11"></p><p><label>人数</label><br><select><option selected>2名</option><option>3名</option><option>4名</option></select></p></div>
  <p><label>搭乗プラン</label><br><select><option selected>サンライズ・フライト（人気No.1）</option><option>テザード（係留）体験</option></select></p>
  <p class="submit"><input type="submit" value="搭乗を予約する"></p>
</form>`;

const JEWELRY_FORM = `<form>
  <p><label>ご相談内容</label><br><select><option selected>婚約指輪</option><option>結婚指輪</option><option>ジュエリーリフォーム</option><option>オーダーメイド（その他）</option><option>まずは相談したい</option></select></p>
  <div class="row"><p><label>お名前</label><br><input type="text" value="山田 花子"></p><p><label>ご希望日</label><br><input type="date" value="2026-07-25"></p></div>
  <div class="row"><p><label>メール</label><br><input type="email" value="hanako@example.com"></p><p><label>電話番号</label><br><input type="tel" value="090-0000-0000"></p></div>
  <p><label>ご要望・ご予算など（任意）</label><br><textarea>記念日に向けて、世界に一つの指輪を作りたいです。</textarea></p>
  <p class="submit"><input type="submit" value="アトリエ相談を予約する"></p>
</form>`;

const ESCAPE_FORM = `<form>
  <div class="row"><p><label>代表者のお名前</label><br><input type="text" value="山田 太郎"></p><p><label>チーム人数</label><br><select><option>2名</option><option selected>4名</option><option>6名</option></select></p></div>
  <p><label>参加希望日時</label><br><select><option selected>7/26(土) 13:00</option><option>7/26(土) 16:00</option><option>7/27(日) 13:00</option></select></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="挑戦をエントリーする"></p>
</form>`;

const MUSIC_LESSON_FORM = `<form>
  <p><label>ご希望の楽器・コース</label><br><select><option selected>ピアノ</option><option>ギター</option><option>バイオリン</option><option>ボーカル</option><option>その他・相談したい</option></select></p>
  <div class="row"><p><label>受講される方</label><br><select><option selected>お子さま</option><option>大人</option></select></p><p><label>体験希望日</label><br><input type="date" value="2026-07-25"></p></div>
  <p><label>お名前</label><br><input type="text" value="山田 花子"></p>
  <div class="row"><p><label>メール</label><br><input type="email" value="hanako@example.com"></p><p><label>電話番号</label><br><input type="tel" value="090-0000-0000"></p></div>
  <p class="submit"><input type="submit" value="無料体験を申し込む"></p>
</form>`;

const CARD_UPDATE_FORM = `<form>
  <p><label>カード番号</label><br><input type="text" value="1234 5678 9012 3456"></p>
  <div class="row"><p><label>有効期限</label><br><input type="text" value="07 / 28"></p><p><label>セキュリティコード</label><br><input type="text" value="•••"></p></div>
  <p><label>カード名義</label><br><input type="text" value="TARO YAMADA"></p>
  <p class="submit"><input type="submit" value="お支払い方法を更新する"></p>
</form>`;

const PAINTING_FORM = `<form>
  <p><label>ご希望の工事</label><br><select><option selected>外壁塗装</option><option>屋根塗装</option><option>外壁＋屋根</option><option>防水工事</option><option>まだ決めていない</option></select></p>
  <p><label>建物の種類</label><br><select><option selected>戸建て</option><option>アパート・マンション</option><option>店舗・事務所</option></select></p>
  <div class="row"><p><label>お名前</label><br><input type="text" value="山田 太郎"></p><p><label>電話番号</label><br><input type="tel" value="090-0000-0000"></p></div>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p><label>ご相談内容（任意）</label><br><textarea>築15年、そろそろ塗り替えを検討しています。</textarea></p>
  <p class="submit"><input type="submit" value="無料見積りを申し込む"></p>
</form>`;

const GIFTCARD_BALANCE_FORM = `<form>
  <p><label>カード番号（16桁）</label><br><input type="text" value="1234 5678 9012 1234"></p>
  <p><label>PIN（カード裏面）</label><br><input type="text" value="••••"></p>
  <p class="submit"><input type="submit" value="残高を確認する"></p>
</form>`;

const DRIVING_SCHOOL_FORM = `<form>
  <p><label>希望の免許種別</label><br><select><option selected>普通車（AT）</option><option>普通車（MT）</option><option>普通二輪</option><option>大型二輪</option><option>その他・未定</option></select></p>
  <p><label>通い方</label><br><select><option selected>通学</option><option>合宿</option><option>相談したい</option></select></p>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <div class="row"><p><label>メール</label><br><input type="email" value="taro@example.com"></p><p><label>電話番号</label><br><input type="tel" value="090-0000-0000"></p></div>
  <p class="submit"><input type="submit" value="資料請求・無料相談する"></p>
</form>`;

const SPA_FORM = `<form>
  <p><label>ご希望メニュー</label><br><select><option selected>アロマトリートメント（60分）</option><option>ボディケア（90分）</option><option>フェイシャル（75分）</option><option>相談して決めたい</option></select></p>
  <div class="row"><p><label>ご希望日</label><br><input type="date" value="2026-07-20"></p><p><label>ご希望時間帯</label><br><select><option selected>午前</option><option>午後</option><option>夕方以降</option></select></p></div>
  <p><label>お名前</label><br><input type="text" value="山田 花子"></p>
  <div class="row"><p><label>メール</label><br><input type="email" value="hanako@example.com"></p><p><label>電話番号</label><br><input type="tel" value="090-0000-0000"></p></div>
  <p><label>ご要望（任意）</label><br><textarea>肩こりが気になります。</textarea></p>
  <p class="submit"><input type="submit" value="予約を申し込む"></p>
</form>`;

const CAR_RENTAL_FORM = `<form>
  <p><label>車種クラス</label><br><select><option selected>コンパクト</option><option>SUV / ミニバン</option><option>大型 / 商用</option><option>未定（おすすめを聞く）</option></select></p>
  <div class="row"><p><label>利用開始日</label><br><input type="date" value="2026-07-20"></p><p><label>返却日</label><br><input type="date" value="2026-07-22"></p></div>
  <p><label>出発店舗</label><br><select><option selected>サンプル駅前店</option><option>空港カウンター</option><option>サンプル港店</option></select></p>
  <div class="row"><p><label>お名前</label><br><input type="text" value="山田 太郎"></p><p><label>電話番号</label><br><input type="tel" value="090-0000-0000"></p></div>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="空き状況を確認して予約する"></p>
</form>`;

const TWOFA_FORM = `<form>
  <p><label>受け取り方法</label><br><select><option selected>SMS（電話番号）</option><option>メール</option><option>認証アプリ</option></select></p>
  <p><label>電話番号</label><br><input type="tel" value="090-0000-0000"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="確認コードを送信する"></p>
</form>`;

const GRAND_OPEN_FORM = `<form>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <div class="row"><p><label>来店予定日</label><br><select><option selected>12/1 (月) オープン日</option><option>12/2 (火)</option><option>12/3 (水)</option><option>未定</option></select></p><p><label>ご来店人数</label><br><select><option selected>1名</option><option>2名</option><option>3名以上</option></select></p></div>
  <p class="submit"><input type="submit" value="来店登録して特典を受け取る"></p>
</form>`;

const FILM_FORM = `<form>
  <p><label>ご希望の回</label><br><select><option selected>11/15 (土) 18:30</option><option>11/16 (日) 14:00</option></select></p>
  <p><label>枚数</label><br><select><option selected>1枚</option><option>2枚</option><option>3枚以上</option></select></p>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="チケットを予約する"></p>
</form>`;

const TUTORING_FORM = `<form>
  <p><label>お子さまの学年</label><br><select><option selected>小学生</option><option>中学生</option><option>高校生</option><option>その他</option></select></p>
  <p><label>ご希望の科目</label><br><input type="text" value="数学・英語"></p>
  <p><label>指導形式</label><br><select><option selected>対面</option><option>オンライン</option><option>どちらでも</option></select></p>
  <p><label>保護者のお名前</label><br><input type="text" value="山田 太郎"></p>
  <div class="row"><p><label>メール</label><br><input type="email" value="taro@example.com"></p><p><label>電話番号</label><br><input type="tel" value="090-0000-0000"></p></div>
  <p class="submit"><input type="submit" value="無料体験を申し込む"></p>
</form>`;

const POPUP_FORM = `<form>
  <p><label>来店希望日</label><br><select><option selected>10/10 (金)</option><option>10/11 (土)</option><option>10/12 (日)</option><option>期間中いつでも</option></select></p>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="来店予約・情報を受け取る"></p>
</form>`;

const NEWSPAPER_FORM = `<form>
  <p><label>ご希望プラン</label><br><select><option>朝刊のみ（¥2,900/月）</option><option selected>朝・夕刊セット（¥4,400/月）</option><option>電子版（¥1,980/月）</option></select></p>
  <p><label>配達開始日</label><br><input type="date" value="2026-07-01"></p>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>お届け先住所</label><br><input type="text" value="東京都中央区1-1-1"></p>
  <div class="row"><p><label>メール</label><br><input type="email" value="taro@example.com"></p><p><label>電話番号</label><br><input type="tel" value="090-0000-0000"></p></div>
  <p class="submit"><input type="submit" value="購読を申し込む"></p>
</form>`;

const INTERNSHIP_FORM = `<form>
  <p><label>応募コース</label><br><select><option selected>エンジニア</option><option>ビジネス職</option><option>デザイン</option></select></p>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>大学名・学年</label><br><input type="text" value="〇〇大学 3年"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="インターンに応募する"></p>
</form>`;

const FUNERAL_FORM = `<form>
  <p><label>ご相談内容</label><br><select><option selected>事前相談・プランを知りたい</option><option>費用・お見積り</option><option>生前準備（終活）</option><option>急ぎの相談</option></select></p>
  <p><label>ご希望の形式</label><br><select><option selected>家族葬</option><option>一日葬</option><option>一般葬</option><option>未定・相談</option></select></p>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>ご地域</label><br><input type="text" value="東京都杉並区"></p>
  <div class="row"><p><label>メール</label><br><input type="email" value="taro@example.com"></p><p><label>電話番号</label><br><input type="tel" value="090-0000-0000"></p></div>
  <p class="submit"><input type="submit" value="資料請求・無料相談する"></p>
</form>`;

const FARM_FORM = `<form>
  <p><label>代表者のお名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <div class="row"><p><label>大人</label><br><input type="number" min="0" value="2"></p><p><label>子ども</label><br><input type="number" min="0" value="2"></p></div>
  <p class="submit"><input type="submit" value="体験を申し込む"></p>
</form>`;

const PESTCTRL_FORM = `<form>
  <p><label>困っている害虫</label><br><select><option selected>ゴキブリ</option><option>ネズミ</option><option>ハチ・アシナガバチ</option><option>シロアリ</option><option>その他・複数</option></select></p>
  <p><label>建物の種類</label><br><select><option selected>戸建て</option><option>マンション・アパート</option><option>店舗・オフィス</option></select></p>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>ご住所（市区町村）</label><br><input type="text" value="東京都世田谷区"></p>
  <div class="row"><p><label>メール</label><br><input type="email" value="taro@example.com"></p><p><label>電話番号</label><br><input type="tel" value="090-0000-0000"></p></div>
  <p class="submit"><input type="submit" value="無料見積もりを依頼"></p>
</form>`;

const AUCTION_FORM = `<form>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p><label>参加方法</label><br><select><option selected>オンラインで入札</option><option>会場で参加</option><option>寄付のみ</option></select></p>
  <p class="submit"><input type="submit" value="参加登録する"></p>
</form>`;

const TAXHELP_FORM = `<form>
  <p><label>申告の区分</label><br><select><option selected>個人事業主・フリーランス</option><option>副業の所得</option><option>不動産所得</option><option>株式・暗号資産</option><option>その他</option></select></p>
  <p><label>昨年の売上・収入の目安</label><br><select><option>〜300万円</option><option selected>300〜800万円</option><option>800万円〜</option></select></p>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <div class="row"><p><label>メール</label><br><input type="email" value="taro@example.com"></p><p><label>電話番号</label><br><input type="tel" value="090-0000-0000"></p></div>
  <p><label>ご相談内容（任意）</label><br><textarea>経費の計上範囲について相談したいです。</textarea></p>
  <p class="submit"><input type="submit" value="無料相談を申し込む"></p>
</form>`;

const RECRUITING_FORM = `<form>
  <p><label>参加希望日</label><br><select><option selected>9/06 (土) オンライン</option><option>9/13 (土) 本社</option></select></p>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p><label>区分</label><br><select><option selected>新卒（学生）</option><option>中途（転職検討中）</option><option>情報収集中</option></select></p>
  <p class="submit"><input type="submit" value="説明会に申し込む"></p>
</form>`;

const INTERNET_FORM = `<form>
  <p><label>ご希望プラン</label><br><select><option>マンションタイプ（¥3,850/月）</option><option selected>ファミリータイプ（¥4,950/月）</option><option>10ギガ（¥6,380/月）</option></select></p>
  <p><label>現在の回線</label><br><select><option selected>他社から乗り換え</option><option>新規（初めて）</option></select></p>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>ご住所（市区町村）</label><br><input type="text" value="東京都千代田区"></p>
  <div class="row"><p><label>メール</label><br><input type="email" value="taro@example.com"></p><p><label>電話番号</label><br><input type="tel" value="090-0000-0000"></p></div>
  <p class="submit"><input type="submit" value="申し込む・無料相談"></p>
</form>`;

const ESPORTS_FORM = `<form>
  <p><label>参加区分</label><br><select><option selected>選手としてエントリー</option><option>観戦のみ登録</option></select></p>
  <p><label>参加タイトル</label><br><select><option selected>対戦格闘</option><option>FPS</option></select></p>
  <p><label>プレイヤー名 / ゲーマータグ</label><br><input type="text" value="taro_GG"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="大会にエントリー"></p>
</form>`;

const RESTAURANT_FORM = `<form>
  <div class="row"><p><label>ご来店日</label><br><input type="date" value="2026-07-18"></p><p><label>時間</label><br><input type="time" value="19:00"></p></div>
  <div class="row"><p><label>人数</label><br><select><option>1名</option><option selected>2名</option><option>3〜4名</option><option>5名以上</option></select></p><p><label>席のご希望</label><br><select><option selected>おまかせ</option><option>個室</option><option>テラス</option></select></p></div>
  <p><label>コース</label><br><select><option selected>アラカルト</option><option>ディナーコース ¥5,000</option><option>記念日コース ¥8,000</option></select></p>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <div class="row"><p><label>メール</label><br><input type="email" value="taro@example.com"></p><p><label>電話番号</label><br><input type="tel" value="090-0000-0000"></p></div>
  <p class="submit"><input type="submit" value="予約する"></p>
</form>`;

const FOODFEST_FORM = `<form>
  <p><label>来場予定日</label><br><select><option selected>10/18 (土)</option><option>10/19 (日)</option><option>10/20 (月)</option></select></p>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="来場登録してクーポンを受け取る"></p>
</form>`;

const LANGLESSON_FORM = `<form>
  <p><label>学びたい言語</label><br><select><option selected>英語</option><option>中国語</option><option>韓国語</option><option>フランス語</option><option>スペイン語</option></select></p>
  <p><label>現在のレベル</label><br><select><option selected>はじめて／初級</option><option>中級</option><option>上級</option></select></p>
  <p><label>ご希望の体験日時</label><br><select><option selected>平日 夜</option><option>平日 昼</option><option>週末</option></select></p>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="無料体験を予約する"></p>
</form>`;

const HACKATHON_FORM = `<form>
  <p><label>参加形態</label><br><select><option selected>個人で参加（チーム募集希望）</option><option>チームで参加</option></select></p>
  <p><label>得意分野</label><br><select><option selected>フロントエンド</option><option>バックエンド</option><option>デザイン/UX</option><option>AI/データ</option></select></p>
  <p><label>お名前 / ハンドル</label><br><input type="text" value="山田 太郎 / taro_dev"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="エントリーする"></p>
</form>`;

const WEDDING_VENUE_FORM = `<form>
  <p><label>挙式ご希望時期</label><br><select><option selected>半年以内</option><option>1年以内</option><option>1年以上先</option><option>未定</option></select></p>
  <div class="row"><p><label>招待人数の目安</label><br><input type="number" value="60"></p><p><label>来館希望日</label><br><input type="date" value="2026-07-20"></p></div>
  <p><label>おふたりのお名前</label><br><input type="text" value="山田 太郎・花子"></p>
  <div class="row"><p><label>メール</label><br><input type="email" value="taro@example.com"></p><p><label>電話番号</label><br><input type="tel" value="090-0000-0000"></p></div>
  <p class="submit"><input type="submit" value="フェアを予約する"></p>
</form>`;

const VOLUNTEER_DAY_FORM = `<form>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <div class="row"><p><label>参加人数</label><br><input type="number" min="1" value="2"></p><p><label>うち子ども</label><br><input type="number" min="0" value="1"></p></div>
  <p class="submit"><input type="submit" value="ボランティアに参加する"></p>
</form>`;

const FRANCHISE_FORM = `<form>
  <p><label>希望エリア</label><br><input type="text" value="東京・神奈川"></p>
  <p><label>開業希望時期</label><br><select><option selected>3ヶ月以内</option><option>半年〜1年</option><option>未定・情報収集中</option></select></p>
  <p><label>自己資金の目安</label><br><select><option>〜300万円</option><option selected>300〜800万円</option><option>800万円〜</option></select></p>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <div class="row"><p><label>メール</label><br><input type="email" value="taro@example.com"></p><p><label>電話番号</label><br><input type="tel" value="090-0000-0000"></p></div>
  <p class="submit"><input type="submit" value="加盟資料を請求する"></p>
</form>`;

const SCHOOLFEST_FORM = `<form>
  <p><label>来場予定日</label><br><select><option selected>11/02 (日)</option><option>11/03 (祝)</option><option>両日</option></select></p>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p><label>ご来場人数</label><br><select><option>1名</option><option selected>2〜3名</option><option>4名以上</option></select></p>
  <p class="submit"><input type="submit" value="来場登録する"></p>
</form>`;

const PHOTO_FORM = `<form>
  <p><label>撮影プラン</label><br><select><option selected>ウェディング</option><option>家族・七五三</option><option>マタニティ</option><option>プロフィール</option></select></p>
  <div class="row"><p><label>ご希望日</label><br><input type="date" value="2026-09-12"></p><p><label>撮影場所</label><br><select><option selected>スタジオ</option><option>出張（屋外）</option><option>未定・相談</option></select></p></div>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <div class="row"><p><label>メール</label><br><input type="email" value="taro@example.com"></p><p><label>電話番号</label><br><input type="tel" value="090-0000-0000"></p></div>
  <p class="submit"><input type="submit" value="撮影を相談・予約する"></p>
</form>`;

const STARGAZE_FORM = `<form>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <div class="row"><p><label>大人</label><br><input type="number" min="0" value="2"></p><p><label>子ども</label><br><input type="number" min="0" value="1"></p></div>
  <p class="submit"><input type="submit" value="観測会に申し込む"></p>
</form>`;

const CLEANING_FORM = `<form>
  <p><label>ご依頼箇所</label><br><select><option selected>水まわり（浴室・トイレ・洗面）</option><option>エアコン</option><option>キッチン・レンジフード</option><option>空室・お引越し</option></select></p>
  <p><label>間取り・広さ</label><br><input type="text" value="2LDK / 約60㎡"></p>
  <div class="row"><p><label>ご希望日</label><br><input type="date" value="2026-07-14"></p><p><label>時間帯</label><br><select><option selected>午前</option><option>午後</option></select></p></div>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <div class="row"><p><label>メール</label><br><input type="email" value="taro@example.com"></p><p><label>電話番号</label><br><input type="tel" value="090-0000-0000"></p></div>
  <p class="submit"><input type="submit" value="無料見積もりを依頼"></p>
</form>`;

const YOGA_FORM = `<form>
  <p><label>主に参加したい時間帯</label><br><select><option selected>朝（6:30〜）</option><option>夜（21:00〜）</option><option>どちらも</option></select></p>
  <p><label>ヨガ経験</label><br><select><option selected>はじめて</option><option>少し経験あり</option><option>経験者</option></select></p>
  <p><label>お名前</label><br><input type="text" value="山田 花子"></p>
  <p><label>メールアドレス</label><br><input type="email" value="hanako@example.com"></p>
  <p class="submit"><input type="submit" value="無料体験を始める"></p>
</form>`;

const PETINS_FORM = `<form>
  <p><label>ペットの種類</label><br><select><option selected>犬</option><option>猫</option></select></p>
  <div class="row"><p><label>品種</label><br><input type="text" value="トイプードル"></p><p><label>年齢</label><br><select><option selected>0〜2歳</option><option>3〜6歳</option><option>7歳以上</option></select></p></div>
  <p><label>飼い主さまのお名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="見積もりを取得する"></p>
</form>`;

const RESEMINAR_FORM = `<form>
  <p><label>参加形式</label><br><select><option selected>会場で参加</option><option>オンラインで参加</option></select></p>
  <p><label>ご希望日</label><br><select><option selected>今週土曜</option><option>来週土曜</option><option>日程を相談</option></select></p>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="セミナーに申し込む"></p>
</form>`;

const WEB_QUOTE_FORM = `<form>
  <p><label>制作の種類</label><br><select><option selected>コーポレートサイト</option><option>ECサイト</option><option>ランディングページ</option><option>リニューアル</option></select></p>
  <p><label>ご予算の目安</label><br><select><option>〜30万円</option><option selected>30〜100万円</option><option>100万円〜</option><option>未定・要相談</option></select></p>
  <p><label>参考サイト・現サイトURL（任意）</label><br><input type="url" value="https://example.com"></p>
  <p><label>ご要望・目的</label><br><textarea>問い合わせを増やせる、スマホ対応のサイトにしたいです。</textarea></p>
  <p><label>会社名・お名前</label><br><input type="text" value="株式会社サンプル / 山田 太郎"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="無料見積もりを依頼する"></p>
</form>`;

const KIDSCAMP_FORM = `<form>
  <p><label>お子さまのお名前</label><br><input type="text" value="山田 はな"></p>
  <div class="row"><p><label>学年</label><br><select><option>1年</option><option selected>3年</option><option>5年</option></select></p><p><label>性別</label><br><select><option>女の子</option><option>男の子</option></select></p></div>
  <p><label>食物アレルギー等</label><br><input type="text" value="特になし"></p>
  <p><label>保護者のお名前</label><br><input type="text" value="山田 太郎"></p>
  <div class="row"><p><label>メール</label><br><input type="email" value="taro@example.com"></p><p><label>緊急連絡先</label><br><input type="text" value="090-0000-0000"></p></div>
  <p class="submit"><input type="submit" value="参加を申し込む"></p>
</form>`;

const WARRANTY_CLAIM_FORM = `<form>
  <p><label>保証番号</label><br><input type="text" value="WR-2025-004512"></p>
  <div class="row"><p><label>製品名</label><br><input type="text" value="コードレス掃除機 X200"></p><p><label>購入日</label><br><input type="date" value="2025-09-15"></p></div>
  <p><label>不具合の内容</label><br><textarea>充電してもすぐに切れてしまいます。</textarea></p>
  <p><label>ご希望の対応</label><br><select><option selected>修理</option><option>交換</option><option>まずは相談</option></select></p>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="保証修理を申し込む"></p>
</form>`;

const ADOPTION_FORM = `<form>
  <p><label>気になる子</label><br><select><option selected>モカ（犬・2歳）</option><option>そら（猫・1歳）</option><option>くろ（猫・3歳）</option><option>当日決めたい</option></select></p>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p><label>ご住居</label><br><select><option selected>持ち家（戸建て）</option><option>賃貸（ペット可）</option><option>その他</option></select></p>
  <p class="submit"><input type="submit" value="来場予約・里親希望を登録"></p>
</form>`;

const PRINTING_FORM = `<form>
  <p><label>印刷物の種類</label><br><select><option selected>名刺</option><option>チラシ・フライヤー</option><option>冊子・パンフレット</option><option>シール・ラベル</option></select></p>
  <div class="row"><p><label>サイズ</label><br><input type="text" value="名刺サイズ（91×55mm）"></p><p><label>部数</label><br><input type="number" value="500"></p></div>
  <p><label>納品希望日</label><br><input type="date" value="2026-07-10"></p>
  <p><label>お名前・会社名</label><br><input type="text" value="山田 太郎 / 株式会社サンプル"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="見積もりを依頼する"></p>
</form>`;

const BOOKSIGN_FORM = `<form>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p><label>参加人数</label><br><select><option selected>1名</option><option>2名</option></select></p>
  <p class="submit"><input type="submit" value="整理券を予約する"></p>
</form>`;

const GYM_FORM = `<form>
  <p><label>ご希望プラン</label><br><select><option>デイ（¥6,800/月）</option><option selected>フル（¥9,800/月）</option><option>パーソナル（¥19,800/月）</option></select></p>
  <p><label>体験希望日</label><br><input type="date" value="2026-07-13"></p>
  <p><label>目標</label><br><select><option selected>ダイエット・体型維持</option><option>筋力アップ</option><option>健康維持</option><option>運動習慣づくり</option></select></p>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <div class="row"><p><label>メール</label><br><input type="email" value="taro@example.com"></p><p><label>電話番号</label><br><input type="tel" value="090-0000-0000"></p></div>
  <p class="submit"><input type="submit" value="無料体験を申し込む"></p>
</form>`;

const SCREENING_FORM = `<form>
  <p><label>ご希望日</label><br><select><option selected>10/18 (土)</option><option>10/19 (日)</option></select></p>
  <p><label>時間帯</label><br><select><option selected>午前</option><option>午後</option></select></p>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <div class="row"><p><label>メール</label><br><input type="email" value="taro@example.com"></p><p><label>電話番号</label><br><input type="tel" value="090-0000-0000"></p></div>
  <p class="submit"><input type="submit" value="受診を予約する"></p>
</form>`;

const INVEST_FORM = `<form>
  <p><label>ご相談テーマ</label><br><select><option selected>つみたて投資・NISA</option><option>老後資金・iDeCo</option><option>家計の見直し</option><option>保険の見直し</option></select></p>
  <p><label>毎月投資に回せる金額</label><br><select><option>〜1万円</option><option selected>1〜3万円</option><option>3万円〜</option></select></p>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <div class="row"><p><label>メール</label><br><input type="email" value="taro@example.com"></p><p><label>ご希望日時</label><br><input type="text" value="平日夜・週末希望"></p></div>
  <p class="submit"><input type="submit" value="無料相談を予約する"></p>
</form>`;

const PITCH_FORM = `<form>
  <p><label>ご参加の立場</label><br><select><option selected>投資家として</option><option>起業家として</option><option>見学・聴講</option></select></p>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>会社名・所属</label><br><input type="text" value="株式会社サンプル"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="参加登録する"></p>
</form>`;

const SOLAR_FORM = `<form>
  <p><label>住居形態</label><br><select><option selected>戸建て（持ち家）</option><option>戸建て（建築予定）</option><option>集合住宅</option></select></p>
  <p><label>現在の電気代（月額）</label><br><select><option>〜8,000円</option><option selected>8,000〜15,000円</option><option>15,000円〜</option></select></p>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>設置先の郵便番号</label><br><input type="text" value="100-0001"></p>
  <div class="row"><p><label>メール</label><br><input type="email" value="taro@example.com"></p><p><label>電話番号</label><br><input type="tel" value="090-0000-0000"></p></div>
  <p class="submit"><input type="submit" value="無料見積もりを依頼する"></p>
</form>`;

const COMEDY_FORM = `<form>
  <p><label>チケット種別</label><br><select><option selected>前売券（¥3,500）</option><option>当日券（¥4,000）</option><option>学割（¥2,500）</option></select></p>
  <p><label>枚数</label><br><select><option selected>1枚</option><option>2枚</option><option>3枚以上</option></select></p>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="チケットを予約する"></p>
</form>`;

const STORAGE_FORM = `<form>
  <p><label>ご希望サイズ</label><br><select><option>Sサイズ（¥2,980/月）</option><option selected>Mサイズ（¥5,480/月）</option><option>Lサイズ（¥9,800/月）</option></select></p>
  <p><label>利用開始希望日</label><br><input type="date" value="2026-08-01"></p>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <div class="row"><p><label>メール</label><br><input type="email" value="taro@example.com"></p><p><label>電話番号</label><br><input type="tel" value="090-0000-0000"></p></div>
  <p class="submit"><input type="submit" value="申し込む・見積もりを依頼"></p>
</form>`;

const FESTIVAL_FORM = `<form>
  <p><label>ご希望チケット</label><br><select><option selected>1日券（¥9,800）</option><option>2日通し券（¥16,800）</option><option>VIP席（¥28,000）</option></select></p>
  <p><label>枚数</label><br><select><option selected>1枚</option><option>2枚</option><option>3枚以上</option></select></p>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="先行抽選に申し込む"></p>
</form>`;

const RENTAL_GEAR_FORM = `<form>
  <p><label>レンタル機材</label><br><select><option selected>一眼カメラ</option><option>ビデオ機材</option><option>照明セット</option><option>音響・マイク</option></select></p>
  <div class="row"><p><label>利用開始日</label><br><input type="date" value="2026-07-20"></p><p><label>日数</label><br><input type="number" min="1" value="2"></p></div>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <div class="row"><p><label>メール</label><br><input type="email" value="taro@example.com"></p><p><label>電話番号</label><br><input type="tel" value="090-0000-0000"></p></div>
  <p class="submit"><input type="submit" value="レンタルを申し込む"></p>
</form>`;

const ARTSHOW_FORM = `<form>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p><label>内覧会への参加</label><br><select><option selected>参加を希望する</option><option>招待状のみ希望</option></select></p>
  <p class="submit"><input type="submit" value="登録する"></p>
</form>`;

const FITTING_FORM = `<form>
  <p><label>ご希望アイテム</label><br><select><option selected>ドレス・フォーマル</option><option>スーツ・ジャケット</option><option>カジュアル全般</option></select></p>
  <div class="row"><p><label>ご希望日</label><br><input type="date" value="2026-07-19"></p><p><label>時間帯</label><br><select><option selected>午前</option><option>午後</option><option>夕方</option></select></p></div>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <div class="row"><p><label>メール</label><br><input type="email" value="taro@example.com"></p><p><label>電話番号</label><br><input type="tel" value="090-0000-0000"></p></div>
  <p class="submit"><input type="submit" value="試着を予約する"></p>
</form>`;

const BLOOD_FORM = `<form>
  <div class="row"><p><label>お名前</label><br><input type="text" value="山田 太郎"></p><p><label>血液型</label><br><select><option>A型</option><option selected>O型</option><option>B型</option><option>AB型</option></select></p></div>
  <div class="row"><p><label>ご希望時間</label><br><select><option selected>10:00〜</option><option>13:00〜</option><option>15:00〜</option></select></p><p><label>年代</label><br><select><option>10代</option><option selected>30代</option><option>40代</option></select></p></div>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="献血を予約する"></p>
</form>`;

const PARKING_FORM = `<form>
  <div class="row"><p><label>利用日</label><br><input type="date" value="2026-07-18"></p><p><label>入庫時刻</label><br><input type="time" value="09:00"></p></div>
  <p><label>利用時間</label><br><select><option>2時間</option><option selected>当日最大（1日）</option><option>1週間</option></select></p>
  <p><label>車種</label><br><input type="text" value="普通車（セダン）"></p>
  <p><label>ナンバープレート</label><br><input type="text" value="品川 300 あ 12-34"></p>
  <div class="row"><p><label>お名前</label><br><input type="text" value="山田 太郎"></p><p><label>メール</label><br><input type="email" value="taro@example.com"></p></div>
  <p class="submit"><input type="submit" value="駐車場を予約する"></p>
</form>`;

const GRADUATION_FORM = `<form>
  <p><label><input type="radio" name="rsvp" checked> 出席する</label> <label><input type="radio" name="rsvp"> 欠席する</label></p>
  <p><label>卒業生のお名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>学籍番号</label><br><input type="text" value="2022-12345"></p>
  <p><label>同伴のご家族人数</label><br><select><option>0名</option><option selected>1名</option><option>2名</option></select></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="出欠を回答する"></p>
</form>`;

const RENEWAL_FORM = `<form>
  <p><label>更新プラン</label><br><select><option selected>ゴールド会員（年額 ¥9,800）</option><option>シルバー会員（年額 ¥4,800）</option></select></p>
  <p><label>会員番号</label><br><input type="text" value="GM-0001234"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p><label><input type="checkbox" checked> 次回以降の自動更新を有効にする</label></p>
  <p class="submit"><input type="submit" value="会員を更新する"></p>
</form>`;

const ANNIV_PARTY_FORM = `<form>
  <p><label><input type="radio" name="rsvp" checked> 出席する</label> <label><input type="radio" name="rsvp"> 欠席する</label></p>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>ご所属・お立場</label><br><input type="text" value="株式会社サンプル / 取引先"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="出欠を回答する"></p>
</form>`;

const GROOMING_FORM = `<form>
  <p><label>ご希望コース</label><br><select><option selected>シャンプー</option><option>カット＋シャンプー</option><option>爪・耳ケア</option></select></p>
  <div class="row"><p><label>ペットの種類・犬種</label><br><input type="text" value="トイプードル"></p><p><label>ご希望日</label><br><input type="date" value="2026-07-12"></p></div>
  <p><label>飼い主さまのお名前</label><br><input type="text" value="山田 太郎"></p>
  <div class="row"><p><label>メール</label><br><input type="email" value="taro@example.com"></p><p><label>電話番号</label><br><input type="tel" value="090-0000-0000"></p></div>
  <p class="submit"><input type="submit" value="予約を申し込む"></p>
</form>`;

const FLEA_FORM = `<form>
  <p><label>出店ブースの種類</label><br><select><option selected>フリマブース（¥2,000）</option><option>飲食ブース（¥5,000）</option><option>ワークショップ（¥3,000）</option></select></p>
  <p><label>出店者・屋号</label><br><input type="text" value="やまだ雑貨店"></p>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p><label>取扱品目</label><br><textarea>ハンドメイドアクセサリー、古着</textarea></p>
  <p class="submit"><input type="submit" value="出店を申し込む"></p>
</form>`;

const MEMBER_JOIN_FORM = `<form>
  <p><label>ご希望プラン</label><br><select><option>無料会員</option><option selected>スタンダード（¥980/月）</option><option>プレミアム（¥1,980/月）</option></select></p>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p><label>パスワード</label><br><input type="text" value="********"></p>
  <p><label><input type="checkbox" checked> 利用規約・プライバシーポリシーに同意する</label></p>
  <p class="submit"><input type="submit" value="この内容で登録する"></p>
</form>`;

const COOKING_FORM = `<form>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p><label>参加人数</label><br><select><option selected>1名</option><option>2名</option></select></p>
  <p><label>食物アレルギー（あれば）</label><br><input type="text" value="特になし"></p>
  <p class="submit"><input type="submit" value="教室に申し込む"></p>
</form>`;

const HOTEL_FORM = `<form>
  <p><label>部屋タイプ</label><br><select><option selected>スタンダード</option><option>デラックス</option><option>スイート</option></select></p>
  <div class="row"><p><label>チェックイン</label><br><input type="date" value="2026-08-10"></p><p><label>チェックアウト</label><br><input type="date" value="2026-08-12"></p></div>
  <p><label>ご利用人数</label><br><select><option>1名</option><option selected>2名</option><option>3名以上</option></select></p>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <div class="row"><p><label>メール</label><br><input type="email" value="taro@example.com"></p><p><label>電話番号</label><br><input type="tel" value="090-0000-0000"></p></div>
  <p class="submit"><input type="submit" value="予約を確定する"></p>
</form>`;

const OPENHOUSE_FORM = `<form>
  <p><label>ご希望来場日</label><br><select><option selected>10/04 (土)</option><option>10/05 (日)</option></select></p>
  <p><label>来場時間帯</label><br><select><option selected>午前</option><option>午後</option></select></p>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <div class="row"><p><label>メール</label><br><input type="email" value="taro@example.com"></p><p><label>電話番号</label><br><input type="tel" value="090-0000-0000"></p></div>
  <p class="submit"><input type="submit" value="来場予約をする"></p>
</form>`;

const VEHICLE_SERVICE_FORM = `<form>
  <p><label>ご希望メニュー</label><br><select><option selected>車検</option><option>オイル交換</option><option>タイヤ交換</option><option>12ヶ月点検</option></select></p>
  <p><label>車種・年式</label><br><input type="text" value="〇〇 ハイブリッド / 2021年式"></p>
  <div class="row"><p><label>走行距離(km)</label><br><input type="number" value="42000"></p><p><label>ご希望日</label><br><input type="date" value="2026-07-05"></p></div>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <div class="row"><p><label>メール</label><br><input type="email" value="taro@example.com"></p><p><label>電話番号</label><br><input type="tel" value="090-0000-0000"></p></div>
  <p class="submit"><input type="submit" value="予約を申し込む"></p>
</form>`;

const CHARITY_RUN_FORM = `<form>
  <p><label>エントリー種目</label><br><select><option selected>3km ファンラン</option><option>10km チャレンジ</option><option>21km ハーフ</option></select></p>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p><label>Tシャツサイズ</label><br><select><option>S</option><option selected>M</option><option>L</option><option>XL</option></select></p>
  <p class="submit"><input type="submit" value="エントリーする"></p>
</form>`;

const CARDUPDATE_FORM = `<form>
  <p><label>ご登録のメールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="お支払い方法を更新する"></p>
</form>`;

const SCHOLARSHIP_FORM = `<form>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p><label>学校名・学年</label><br><input type="text" value="〇〇大学 経済学部 2年"></p>
  <p><label>志望理由・学びたいこと</label><br><textarea>地域経済の活性化を研究し、将来は地元企業の支援に携わりたいと考えています。</textarea></p>
  <p><label>世帯年収の目安</label><br><select><option selected>〜300万円</option><option>300〜500万円</option><option>500万円〜</option></select></p>
  <p class="submit"><input type="submit" value="奨学金に応募する"></p>
</form>`;

const TASTING_FORM = `<form>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p><label>参加人数</label><br><select><option selected>1名</option><option>2名</option><option>3名以上</option></select></p>
  <p class="submit"><input type="submit" value="試飲会に申し込む"></p>
</form>`;

const CATERING_FORM = `<form>
  <p><label>ご希望コース</label><br><select><option selected>スタンダード（¥1,500/人）</option><option>プレミアム（¥2,800/人）</option><option>ヘルシー（¥1,800/人）</option></select></p>
  <div class="row"><p><label>人数</label><br><input type="number" min="1" value="20"></p><p><label>お届け日</label><br><input type="date" value="2026-07-20"></p></div>
  <p><label>お届け先住所</label><br><input type="text" value="東京都千代田区1-1-1"></p>
  <p><label>ご担当者名</label><br><input type="text" value="山田 太郎"></p>
  <div class="row"><p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p><p><label>電話番号</label><br><input type="tel" value="03-0000-0000"></p></div>
  <p class="submit"><input type="submit" value="注文内容を確認する"></p>
</form>`;

const FANMEET_FORM = `<form>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p><label>ファンクラブ会員番号（任意）</label><br><input type="text" value="FC-000123"></p>
  <p class="submit"><input type="submit" value="抽選に応募する"></p>
</form>`;

const BETA_FORM = `<form>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p><label>主に使うデバイス</label><br><select><option selected>iPhone / iOS</option><option>Android</option><option>PC（Windows）</option><option>PC（Mac）</option></select></p>
  <p><label>参加への意気込み（任意）</label><br><textarea>毎日使うツールなので、改善に貢献したいです！</textarea></p>
  <p class="submit"><input type="submit" value="テスターに応募する"></p>
</form>`;

const TEAM_ENTRY_FORM = `<form>
  <p><label>チーム名</label><br><input type="text" value="サンプルファイターズ"></p>
  <p><label>エントリー部門</label><br><select><option selected>オープンの部</option><option>エンジョイの部</option><option>ファミリーの部</option></select></p>
  <p><label>代表者のお名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p><label>電話番号</label><br><input type="tel" value="090-0000-0000"></p>
  <p class="submit"><input type="submit" value="チームでエントリーする"></p>
</form>`;

const ROADSHOW_FORM = `<form>
  <p><label>参加する都市</label><br><select><option selected>東京（9.06）</option><option>大阪（9.13）</option><option>名古屋（9.20）</option></select></p>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>会社名</label><br><input type="text" value="株式会社サンプル"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="この都市で申し込む"></p>
</form>`;

const BULKORDER_FORM = `<form>
  <p><label>会社名</label><br><input type="text" value="株式会社サンプル"></p>
  <p><label>ご担当者名</label><br><input type="text" value="山田 太郎"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p><label>電話番号</label><br><input type="tel" value="03-0000-0000"></p>
  <p><label>ご要望（納期・請求書払い等）</label><br><textarea>月末までに納品希望、請求書払いを希望します。</textarea></p>
  <p class="submit"><input type="submit" value="注文・見積を依頼する"></p>
</form>`;

const ENROLL_FORM = `<form>
  <p><label>受講するコース</label><br><select><option selected>入門コース（全6回）</option><option>実践コース（全12回）</option></select></p>
  <p><label>受講者のお名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p><label>電話番号</label><br><input type="tel" value="090-0000-0000"></p>
  <p><label>受講形態</label><br><select><option selected>教室で受講</option><option>オンラインで受講</option></select></p>
  <p class="submit"><input type="submit" value="受講を申し込む"></p>
</form>`;

const LAUNCH_FORM = `<form>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="視聴に登録する"></p>
</form>`;

const MULTIGIFT_FORM = `<form>
  <p><label>贈り主のお名前</label><br><input type="text" value="山田 太郎"></p>
  <fieldset><legend>贈り先 1</legend>
    <p><label>お名前</label><br><input type="text" value="鈴木 花子"></p>
    <p><label>メールアドレス</label><br><input type="email" value="hanako@example.com"></p>
    <p><label>メッセージ</label><br><textarea>いつもありがとう！</textarea></p>
  </fieldset>
  <fieldset><legend>贈り先 2</legend>
    <p><label>お名前</label><br><input type="text" value="佐藤 健"></p>
    <p><label>メールアドレス</label><br><input type="email" value="ken@example.com"></p>
    <p><label>メッセージ</label><br><textarea>お祝いの気持ちです。</textarea></p>
  </fieldset>
  <p class="submit"><input type="submit" value="まとめて贈る"></p>
</form>`;

const BOOTH_FORM = `<form>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>会社名</label><br><input type="text" value="株式会社サンプル"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p><label>ご興味のある内容</label><br><select><option selected>製品の詳細を知りたい</option><option>導入を検討している</option><option>情報収集中</option></select></p>
  <p class="submit"><input type="submit" value="ブースに入場する"></p>
</form>`;

const SURVEY_COMMENT_FORM = `<form>
  <p><label>ご意見・ご感想（自由記述）</label><br><textarea>全体的に満足ですが、価格がもう少し手頃だと嬉しいです。</textarea></p>
  <p><label>メールアドレス（任意・特典のご連絡用）</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="アンケートを送信する"></p>
</form>`;

const REVIEW_BODY = `<h1>ご利用ありがとうございました</h1>
<p>サービスはいかがでしたか？<br>よろしければ評価とご感想をお聞かせください。</p>`;

const SAMPLE_FORM = `<form>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <div class="row"><p><label>郵便番号</label><br><input type="text" value="100-0001"></p><p><label>電話番号</label><br><input type="tel" value="090-0000-0000"></p></div>
  <p><label>ご住所</label><br><input type="text" value="東京都千代田区..."></p>
  <p class="submit"><input type="submit" value="無料サンプルを請求する"></p>
</form>`;

const CALENDAR_BODY = `<h1>お申し込みが完了しました</h1>
<p>ご登録ありがとうございます。下記の日時で受け付けました。<br>忘れないようカレンダーに追加しておきましょう。</p>`;

const SHARE_BODY = `<h1>ご参加ありがとうございます！</h1>
<p>よろしければ、お知り合いにもシェアしていただけると嬉しいです。</p>`;

const REFERRAL_RECRUIT_FORM = `<form>
  <p><label>あなた（紹介者）のお名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>あなたのメールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p><label>ご紹介者のお名前</label><br><input type="text" value="鈴木 一郎"></p>
  <p><label>想定ポジション</label><br><select><option selected>エンジニア</option><option>デザイナー</option><option>営業</option></select></p>
  <p><label>ひとことコメント</label><br><textarea>前職の同僚で、開発力が高くおすすめです。</textarea></p>
  <p class="submit"><input type="submit" value="知人を紹介する"></p>
</form>`;

const INTERVIEW_FORM = `<form>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p><label>第1希望日</label><br><input type="date" value="2026-07-22"></p>
  <p><label>面接形式</label><br><label class="opt"><input type="radio" name="fmt" checked> オンライン</label><label class="opt"><input type="radio" name="fmt"> 対面</label></p>
  <p class="submit"><input type="submit" value="この日程で申し込む"></p>
</form>`;

const CLINIC_FORM = `<form>
  <p><label>診療科</label><br><select><option selected>内科</option><option>皮膚科</option><option>整形外科</option><option>歯科</option></select></p>
  <div class="row"><p><label>担当医</label><br><select><option selected>指定なし</option><option>佐藤医師</option><option>鈴木医師</option></select></p><p><label>希望日</label><br><input type="date" value="2026-07-16"></p></div>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <div class="row"><p><label>電話番号</label><br><input type="tel" value="090-0000-0000"></p><p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p></div>
  <p class="submit"><input type="submit" value="予約する"></p>
</form>`;

const DELETE_FORM = `<form>
  <p><label>削除の理由（任意）</label><br><select><option selected>使わなくなった</option><option>別サービスへ移行</option><option>機能に不満</option><option>その他</option></select></p>
  <p><label>ご登録メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p><label class="chk"><input type="checkbox"> データが完全に削除され、復元できないことに同意します</label></p>
  <p class="submit"><input type="submit" value="アカウントを削除する"></p>
</form>`;

const RENOV_FORM = `<form>
  <p><label>工事種別</label><br><select><option selected>キッチン</option><option>浴室・水回り</option><option>外壁・屋根</option><option>全面リフォーム</option></select></p>
  <div class="row"><p><label>築年数</label><br><input type="text" value="約20年"></p><p><label>ご予算</label><br><select><option>〜100万円</option><option selected>100〜300万円</option><option>300万円以上</option></select></p></div>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <div class="row"><p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p><p><label>電話番号</label><br><input type="tel" value="090-0000-0000"></p></div>
  <p class="submit"><input type="submit" value="無料で見積もり依頼"></p>
</form>`;

const MEETING_FORM = `<form>
  <p><label>会社名</label><br><input type="text" value="株式会社サンプル"></p>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p><label>ご希望の時間帯</label><br><select><option>初日 午前</option><option selected>初日 午後</option><option>2日目 午前</option><option>2日目 午後</option></select></p>
  <p class="submit"><input type="submit" value="商談を予約する"></p>
</form>`;

const RETURN_FORM = `<form>
  <p><label>注文番号</label><br><input type="text" value="ORD-20260620-0188"></p>
  <p><label>対象商品</label><br><select><option selected>ランニングシューズ</option><option>スポーツソックス</option></select></p>
  <p><label>返品/交換の理由</label><br><select><option selected>サイズが合わない</option><option>イメージと違う</option><option>不良・破損</option><option>その他</option></select></p>
  <p><label>詳細（任意）</label><br><textarea>ワンサイズ大きいものに交換希望です。</textarea></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="申請を送信する"></p>
</form>`;

const PAUSE_FORM = `<form>
  <p><label>停止期間</label><br><select><option>1ヶ月</option><option selected>2ヶ月</option><option>3ヶ月</option></select></p>
  <p><label>差し支えなければ理由を</label><br><select><option selected>しばらく使わない</option><option>費用を見直したい</option><option>その他</option></select></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="一時停止を申請する"></p>
</form>`;

const PHOTO_CONTEST_FORM = `<form>
  <p><label>作品タイトル</label><br><input type="text" value="夏の思い出"></p>
  <p><label>写真をアップロード</label><br><input type="file"></p>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="作品を応募する"></p>
</form>`;

const SPEAKER_FORM = `<form>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>ご所属・肩書</label><br><input type="text" value="株式会社サンプル / CTO"></p>
  <p><label>講演テーマ</label><br><input type="text" value="生成AIで変わる開発現場"></p>
  <p><label>概要（200字程度）</label><br><textarea>現場での活用事例と、導入のポイントをお話しします。</textarea></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="登壇をエントリーする"></p>
</form>`;

const WORKSHOP_FORM = `<form>
  <p><label>コース</label><br><select><option selected>手びねり体験（90分）</option><option>電動ろくろ（120分）</option><option>絵付け体験（60分）</option></select></p>
  <div class="row"><p><label>希望日</label><br><input type="date" value="2026-07-20"></p><p><label>参加人数</label><br><select><option selected>1名</option><option>2名</option><option>3名以上</option></select></p></div>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="体験を予約する"></p>
</form>`;

const SPONSOR_FORM = `<form>
  <div class="row"><p><label>会社名</label><br><input type="text" value="株式会社サンプル"></p><p><label>ご担当者名</label><br><input type="text" value="山田 太郎"></p></div>
  <p><label>ご希望の協賛プラン</label><br><select><option>ブロンズ</option><option selected>シルバー</option><option>ゴールド</option><option>相談したい</option></select></p>
  <div class="row"><p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p><p><label>電話番号</label><br><input type="tel" value="03-0000-0000"></p></div>
  <p><label>ご質問・ご要望</label><br><textarea>ブース出展と登壇枠について相談したいです。</textarea></p>
  <p class="submit"><input type="submit" value="申し込む / 相談する"></p>
</form>`;

const OFFER_FORM = `<form>
  <p><label>あなたの希望価格（円）</label><br><input type="number" value="1750000"></p>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="この価格でオファーする"></p>
</form>`;

const UPGRADE_FORM = `<form>
  <p><label>会員番号</label><br><input type="text" value="MB-001234"></p>
  <p><label>変更後のプラン</label><br><select><option selected>ゴールド会員（年額 ¥9,800）</option><option>プラチナ会員（年額 ¥19,800）</option></select></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="プランを変更する"></p>
</form>`;

const DETAILED_FEEDBACK_FORM = `<form>
  <fieldset><legend>内容の満足度</legend><div class="scale"><label><input type="radio" name="c1" checked>5</label><label><input type="radio" name="c1">4</label><label><input type="radio" name="c1">3</label><label><input type="radio" name="c1">2</label><label><input type="radio" name="c1">1</label></div></fieldset>
  <fieldset><legend>運営・進行</legend><div class="scale"><label><input type="radio" name="c2" checked>5</label><label><input type="radio" name="c2">4</label><label><input type="radio" name="c2">3</label><label><input type="radio" name="c2">2</label><label><input type="radio" name="c2">1</label></div></fieldset>
  <p><label>総合評価</label><br><select><option selected>大変満足</option><option>満足</option><option>普通</option><option>不満</option></select></p>
  <p><label>ご意見・ご要望</label><br><textarea>具体的な事例が多く参考になりました。</textarea></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="アンケートを送信"></p>
</form>`;

const JOBALERT_FORM = `<form>
  <fieldset><legend>希望職種（複数可）</legend>
    <label><input type="checkbox" checked> エンジニア</label>
    <label><input type="checkbox"> デザイナー</label>
    <label><input type="checkbox"> 営業</label>
    <label><input type="checkbox"> マーケティング</label>
  </fieldset>
  <p><label>勤務地</label><br><select><option selected>東京</option><option>大阪</option><option>リモート可</option><option>全国</option></select></p>
  <p><label>配信頻度</label><br><select><option selected>毎日</option><option>週1回</option></select></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="アラートを登録する"></p>
</form>`;

const TRIAL_EXT_FORM = `<form>
  <p><label>現在のご利用状況</label><br><select><option selected>まだ十分に試せていない</option><option>検討中で時間が欲しい</option><option>社内承認の手続き中</option></select></p>
  <p><label>ご要望・質問（任意）</label><br><textarea>機能Aをもう少し検証したいです。</textarea></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="トライアルを延長する"></p>
</form>`;

const GIFTWRAP_FORM = `<form>
  <p><label>ラッピング</label><br><select><option selected>標準（無料）</option><option>プレミアム（+¥550）</option><option>ラッピング不要</option></select></p>
  <p><label>のし</label><br><select><option selected>なし</option><option>お祝い（蝶結び）</option><option>内祝い</option><option>御礼</option></select></p>
  <p><label>メッセージカード（任意）</label><br><textarea>お誕生日おめでとうございます。</textarea></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="この内容で指定する"></p>
</form>`;

const WISHLIST_FORM = `<form>
  <p><label>リスト名</label><br><input type="text" value="お誕生日ほしいものリスト"></p>
  <p><label>公開設定</label><br><select><option selected>リンクを知っている人のみ</option><option>友達まで公開</option><option>非公開</option></select></p>
  <p><label>お名前</label><br><input type="text" value="山田 花子"></p>
  <p><label>メールアドレス</label><br><input type="email" value="hanako@example.com"></p>
  <p class="submit"><input type="submit" value="リストを作成する"></p>
</form>`;

const CATALOG_FORM = `<form>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <div class="row"><p><label>郵便番号</label><br><input type="text" value="100-0001"></p><p><label>電話番号</label><br><input type="tel" value="03-0000-0000"></p></div>
  <p><label>ご住所</label><br><input type="text" value="東京都千代田区..."></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="カタログを請求する"></p>
</form>`;

const WARRANTY_EXT_FORM = `<form>
  <p><label>対象製品</label><br><select><option selected>テレビ</option><option>冷蔵庫</option><option>PC</option></select></p>
  <div class="row"><p><label>購入日</label><br><input type="date" value="2026-06-01"></p><p><label>延長プラン</label><br><select><option>+1年</option><option selected>+3年</option><option>+5年</option></select></p></div>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="延長保証を申し込む"></p>
</form>`;

const STOCK_FORM = `<form>
  <div class="row"><p><label>サイズ</label><br><select><option>25.0cm</option><option selected>26.0cm</option><option>27.0cm</option></select></p><p><label>受取店舗</label><br><select><option selected>サンプル駅前店</option><option>みなと店</option></select></p></div>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <div class="row"><p><label>電話番号</label><br><input type="tel" value="090-0000-0000"></p><p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p></div>
  <p class="submit"><input type="submit" value="取り置きを依頼する"></p>
</form>`;

const APPT_FORM = `<form>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="この時間で予約する"></p>
</form>`;

const VIEWING_FORM = `<form>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <div class="row"><p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p><p><label>電話番号</label><br><input type="tel" value="090-0000-0000"></p></div>
  <div class="row"><p><label>第1希望日</label><br><input type="date" value="2026-07-26"></p><p><label>時間帯</label><br><select><option selected>午前</option><option>午後</option><option>夕方以降</option></select></p></div>
  <p><label>ご質問・ご要望</label><br><textarea>駐車場の空き状況も知りたいです。</textarea></p>
  <p class="submit"><input type="submit" value="内見を予約する"></p>
</form>`;

const GROUP_FORM = `<form>
  <div class="row"><p><label>ご利用人数</label><br><input type="number" value="20"></p><p><label>ご希望日</label><br><input type="date" value="2026-08-22"></p></div>
  <p><label>ご利用用途</label><br><select><option selected>宴会・懇親会</option><option>研修・会議</option><option>貸切イベント</option></select></p>
  <p><label>幹事様のお名前</label><br><input type="text" value="山田 太郎"></p>
  <div class="row"><p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p><p><label>電話番号</label><br><input type="tel" value="090-0000-0000"></p></div>
  <p class="submit"><input type="submit" value="団体予約を相談する"></p>
</form>`;

const TRANSLATION_FORM = `<form>
  <p><label>言語ペア</label><br><select><option selected>日本語 → 英語</option><option>英語 → 日本語</option><option>日本語 → 中国語</option><option>その他</option></select></p>
  <div class="row"><p><label>分量(文字/ワード数の目安)</label><br><input type="text" value="約5,000文字"></p><p><label>ご希望納期</label><br><select><option>特急(当日〜翌日)</option><option selected>通常(3〜5営業日)</option><option>急がない</option></select></p></div>
  <p><label>原稿ファイル(任意)</label><br><input type="file"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="見積もりを依頼する"></p>
</form>`;

const REPAIR_FORM = `<form>
  <p><label>対象製品</label><br><select><option selected>スマートフォン</option><option>ノートPC</option><option>家電</option><option>その他</option></select></p>
  <p><label>症状</label><br><select><option selected>電源が入らない</option><option>画面割れ</option><option>バッテリーの劣化</option><option>その他</option></select></p>
  <p><label>購入日（保証確認用）</label><br><input type="date" value="2025-09-01"></p>
  <p><label>詳しい状況</label><br><textarea>落下後に画面が映らなくなりました。</textarea></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="修理を申し込む"></p>
</form>`;

const TRADEIN_FORM = `<form>
  <div class="row"><p><label>品目</label><br><select><option selected>スマートフォン</option><option>ノートPC</option><option>カメラ</option><option>ゲーム機</option></select></p><p><label>状態</label><br><select><option>新品同様</option><option selected>美品</option><option>使用感あり</option><option>難あり</option></select></p></div>
  <p><label>型番・メーカー</label><br><input type="text" value="Model X-200 / SampleCorp"></p>
  <p><label>写真（任意）</label><br><input type="file"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="査定を申し込む"></p>
</form>`;

const LOOKUP_FORM = `<form>
  <p><label>受付番号</label><br><input type="text" value="RV-20260710-014"></p>
  <p><label>生年月日</label><br><input type="date" value="1990-04-01"></p>
  <p><label>登録メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="結果を照会する"></p>
</form>`;

const TAKEOUT_FORM = `<form>
  <div class="row"><p><label>メニュー</label><br><select><option selected>日替わり弁当</option><option>唐揚げ弁当</option><option>幕の内弁当</option></select></p><p><label>個数</label><br><select><option selected>1</option><option>2</option><option>3</option></select></p></div>
  <p><label>受取時間</label><br><select><option>12:00</option><option selected>12:30</option><option>13:00</option><option>18:00</option></select></p>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>電話番号</label><br><input type="tel" value="090-0000-0000"></p>
  <p class="submit"><input type="submit" value="この内容で注文する"></p>
</form>`;

const RENTAL_FORM = `<form>
  <p><label>品目</label><br><select><option selected>電動アシスト自転車</option><option>キャンプ用品セット</option><option>撮影機材</option></select></p>
  <div class="row"><p><label>貸出日</label><br><input type="date" value="2026-07-12"></p><p><label>返却日</label><br><input type="date" value="2026-07-14"></p></div>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="予約をリクエスト"></p>
</form>`;

const PET_FORM = `<form>
  <div class="row"><p><label>飼い主のお名前</label><br><input type="text" value="山田 太郎"></p><p><label>ペットのお名前</label><br><input type="text" value="モカ"></p></div>
  <div class="row"><p><label>種類</label><br><select><option selected>犬</option><option>猫</option><option>うさぎ</option><option>その他</option></select></p><p><label>ご希望メニュー</label><br><select><option selected>シャンプー＋カット</option><option>シャンプーのみ</option><option>爪切り・部分ケア</option></select></p></div>
  <p><label>ご希望日</label><br><input type="date" value="2026-07-18"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="予約する"></p>
</form>`;

const REVIEW_POST_FORM = `<form>
  <p><label>ご感想</label><br><textarea>サポートが丁寧で、初めてでも安心して使えました。</textarea></p>
  <p><label>ニックネーム</label><br><input type="text" value="たろう"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="レビューを投稿する"></p>
</form>`;

const BABY_FORM = `<form>
  <p><label>お名前</label><br><input type="text" value="山田 花子"></p>
  <p><label>メールアドレス</label><br><input type="email" value="hanako@example.com"></p>
  <p><label>出産予定日</label><br><input type="date" value="2026-11-15"></p>
  <p><label>性別</label><br><label class="opt"><input type="radio" name="sex" checked> 男の子</label><label class="opt"><input type="radio" name="sex"> 女の子</label><label class="opt"><input type="radio" name="sex"> 未定</label></p>
  <p><label>欲しいものカテゴリ</label><br><select><option selected>ベビー服</option><option>授乳・離乳食</option><option>ベビーカー・チャイルドシート</option></select></p>
  <p class="submit"><input type="submit" value="レジストリを作成する"></p>
</form>`;

const SHAREHOLDER_FORM = `<form>
  <p><label>お名前（株主名）</label><br><input type="text" value="山田 太郎"></p>
  <div class="row"><p><label>保有株数</label><br><select><option>100〜499株</option><option selected>500〜999株</option><option>1,000株以上</option></select></p><p><label>ご希望の優待品</label><br><select><option selected>カタログギフトA</option><option>自社製品セット</option><option>QUOカード</option></select></p></div>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="優待を申し込む"></p>
</form>`;

const REALESTATE_FORM = `<form>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <div class="row"><p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p><p><label>電話番号</label><br><input type="tel" value="090-0000-0000"></p></div>
  <p><label>ご予算</label><br><select><option>〜3,000万円</option><option selected>3,000〜4,000万円</option><option>4,000万円以上</option></select></p>
  <p><label>内見希望日</label><br><input type="date" value="2026-07-19"></p>
  <p class="submit"><input type="submit" value="内見を予約する"></p>
</form>`;

const MOVING_FORM = `<form>
  <div class="row"><p><label>現住所(市区町村)</label><br><input type="text" value="東京都サンプル区"></p><p><label>新住所(市区町村)</label><br><input type="text" value="神奈川県サンプル市"></p></div>
  <div class="row"><p><label>間取り</label><br><select><option>ワンルーム</option><option selected>2LDK</option><option>3LDK以上</option></select></p><p><label>引越し希望日</label><br><input type="date" value="2026-08-10"></p></div>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="無料で一括見積"></p>
</form>`;

const WEDDING_RSVP_FORM = `<form>
  <p class="att"><label><input type="radio" name="att" checked> 出席</label><label><input type="radio" name="att"> 欠席</label></p>
  <p><label>お名前</label><br><input type="text" value="鈴木 一郎"></p>
  <p><label>メールアドレス</label><br><input type="email" value="ichiro@example.com"></p>
  <p><label>アレルギー・ご要望（任意）</label><br><input type="text" value="特になし"></p>
  <p class="submit"><input type="submit" value="お返事を送信する"></p>
</form>`;

const TOUR_FORM = `<form>
  <p><label>行き先</label><br><select><option selected>南の島リゾート 3日間</option><option>ヨーロッパ周遊 7日間</option><option>国内温泉 2日間</option></select></p>
  <div class="row"><p><label>出発希望日</label><br><input type="date" value="2026-09-20"></p><p><label>参加人数</label><br><select><option>1名</option><option selected>2名</option><option>3〜4名</option><option>5名以上</option></select></p></div>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="予約をリクエストする"></p>
</form>`;

const KIOSK_FORM = `<form>
  <p><label>会社名</label><br><input type="text" value="株式会社サンプル"></p>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="登録する"></p>
</form>`;

const LOAN_FORM = `<form>
  <div class="row"><p><label>借入希望額</label><br><select><option>〜50万円</option><option selected>50〜100万円</option><option>100〜300万円</option></select></p><p><label>ご年収</label><br><select><option>〜300万円</option><option selected>300〜500万円</option><option>500万円以上</option></select></p></div>
  <p><label>雇用形態</label><br><select><option selected>正社員</option><option>契約・派遣</option><option>自営業</option><option>パート・アルバイト</option></select></p>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <div class="row"><p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p><p><label>電話番号</label><br><input type="tel" value="090-0000-0000"></p></div>
  <p class="submit"><input type="submit" value="仮審査を申し込む"></p>
</form>`;

const SUPPORT_FORM = `<form>
  <div class="row"><p><label>お問い合わせ種別</label><br><select><option selected>技術的な不具合</option><option>使い方の質問</option><option>請求・契約</option></select></p><p><label>緊急度</label><br><select><option>低</option><option selected>中</option><option>高（業務停止）</option></select></p></div>
  <p><label>件名</label><br><input type="text" value="ログインできない"></p>
  <p><label>詳細</label><br><textarea>本日朝からログイン時にエラーが表示されます。スクリーンショットを添付予定です。</textarea></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="チケットを送信"></p>
</form>`;

const SUBBOX_FORM = `<form>
  <p><label>プラン</label><br><select><option>お試し（3点）</option><option selected>レギュラー（5点）</option><option>デラックス（8点）</option></select></p>
  <p><label>お届け頻度</label><br><select><option selected>毎月</option><option>隔月</option><option>3ヶ月ごと</option></select></p>
  <p><label>開始月</label><br><select><option selected>今月から</option><option>翌月から</option></select></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="定期便を申し込む"></p>
</form>`;

const FACILITY_FORM = `<form>
  <p><label>ご利用施設</label><br><select><option selected>会議室A（〜8名）</option><option>会議室B（〜20名）</option><option>多目的ホール</option></select></p>
  <div class="row"><p><label>利用日</label><br><input type="date" value="2026-07-12"></p><p><label>時間帯</label><br><select><option>午前</option><option selected>午後</option><option>終日</option></select></p></div>
  <p><label>利用人数</label><br><select><option>〜5名</option><option selected>6〜10名</option><option>11名以上</option></select></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="予約を申し込む"></p>
</form>`;

const BIRTHDAY_FORM = `<form>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>生年月日</label><br><input type="date" value="1992-08-15"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="登録して特典を受け取る"></p>
</form>`;

const MONITOR_FORM = `<form>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <fieldset><legend>性別</legend><label class="opt"><input type="radio" name="g" checked> 男性</label><label class="opt"><input type="radio" name="g"> 女性</label><label class="opt"><input type="radio" name="g"> 回答しない</label></fieldset>
  <p><label>年代</label><br><select><option>20代</option><option selected>30代</option><option>40代</option><option>50代以上</option></select></p>
  <fieldset><legend>関心分野（複数可）</legend><label class="opt"><input type="checkbox" checked> 美容</label><label class="opt"><input type="checkbox"> 食品</label><label class="opt"><input type="checkbox"> IT</label></fieldset>
  <p class="submit"><input type="submit" value="モニターに応募する"></p>
</form>`;

const RECEIPT_FORM = `<form>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p><label>レシート画像</label><br><input type="file"></p>
  <p><label>購入金額（税込）</label><br><input type="text" value="2,480円"></p>
  <p class="submit"><input type="submit" value="応募する"></p>
</form>`;

const PETITION_FORM = `<form>
  <p><label>お名前（ニックネーム可）</label><br><input type="text" value="山田 太郎"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p><label class="chk"><input type="checkbox" checked> 名前を賛同者一覧に表示してもよい</label></p>
  <p class="submit"><input type="submit" value="この提案に賛同する"></p>
</form>`;

const VOLUNTEER_FORM = `<form>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p><label>電話番号</label><br><input type="tel" value="090-0000-0000"></p>
  <p><label>希望する活動</label><br><select><option selected>会場運営サポート</option><option>清掃・環境活動</option><option>子ども向けプログラム</option></select></p>
  <p><label>参加可能日</label><br><label class="day"><input type="checkbox" checked> 土</label><label class="day"><input type="checkbox"> 日</label><label class="day"><input type="checkbox"> 平日</label></p>
  <p class="submit"><input type="submit" value="参加を申し込む"></p>
</form>`;

const INSURANCE_FORM = `<form>
  <div class="row"><p><label>生年月日</label><br><input type="date" value="1990-04-01"></p><p><label>性別</label><br><label class="opt"><input type="radio" name="sex" checked> 男性</label><label class="opt"><input type="radio" name="sex"> 女性</label></p></div>
  <p><label>ご希望のプラン</label><br><select><option>掛け捨て(安心重視)</option><option selected>バランス型</option><option>貯蓄型</option></select></p>
  <p><label>結果送付先メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="見積もりを受け取る"></p>
</form>`;

const VENDOR_FORM = `<form>
  <div class="row"><p><label>会社名</label><br><input type="text" value="株式会社サンプル商事"></p><p><label>ご担当者名</label><br><input type="text" value="山田 太郎"></p></div>
  <div class="row"><p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p><p><label>電話番号</label><br><input type="tel" value="03-0000-0000"></p></div>
  <p><label>業種・カテゴリ</label><br><select><option selected>原材料・部品</option><option>物流・運送</option><option>ITサービス</option><option>その他</option></select></p>
  <p><label>主な取扱品目・サービス</label><br><textarea>各種金属部品の製造・供給を行っています。</textarea></p>
  <p class="submit"><input type="submit" value="登録を申請する"></p>
</form>`;

const STUDENT_FORM = `<form>
  <p><label>学校名</label><br><input type="text" value="サンプル大学"></p>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>メールアドレス（学校ドメイン推奨）</label><br><input type="email" value="taro@sample.ac.jp"></p>
  <p><label>学生証のアップロード</label><br><input type="file"></p>
  <p class="submit"><input type="submit" value="学割を申請する"></p>
</form>`;

const SAFETY_FORM = `<form>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <p class="status"><label><input type="radio" name="st" checked> 無事です</label><label><input type="radio" name="st"> 軽傷</label><label><input type="radio" name="st"> 支援が必要</label></p>
  <p><label>現在地</label><br><select><option selected>自宅</option><option>勤務先</option><option>外出先</option><option>避難所</option></select></p>
  <p><label>連絡先電話番号</label><br><input type="tel" value="090-0000-0000"></p>
  <p><label>状況・伝達事項（任意）</label><br><textarea>家族も全員無事です。</textarea></p>
  <p class="submit"><input type="submit" value="安否を報告する"></p>
</form>`;

const RECUR_DONATION_FORM = `<form>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="マンスリーサポーターになる"></p>
</form>`;

const HEALTH_FORM = `<form>
  <p><label>受診コース</label><br><select><option>基本コース</option><option selected>充実コース</option><option>人間ドック</option></select></p>
  <p><label>オプション検査</label><br><label class="opt"><input type="checkbox" checked> 脳ドック</label><label class="opt"><input type="checkbox"> 胃カメラ</label><label class="opt"><input type="checkbox"> 婦人科</label></p>
  <p><label>ご希望日</label><br><input type="date" value="2026-07-22"></p>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="受診を予約する"></p>
</form>`;

const POINTS_FORM = `<form>
  <p><label>交換する景品</label><br><select><option>コーヒーチケット（500pt）</option><option selected>選べるギフト（3,000pt）</option><option>オリジナルグッズ（1,200pt）</option></select></p>
  <p><label>送付先メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="ポイントを交換する"></p>
</form>`;

const GIFTCARD_FORM = `<form>
  <p><label>金額</label><br><select><option>¥3,000</option><option selected>¥5,000</option><option>¥10,000</option></select></p>
  <p><label>送り先のメールアドレス</label><br><input type="email" value="hanako@example.com"></p>
  <p><label>メッセージ</label><br><textarea>お誕生日おめでとう！</textarea></p>
  <p><label>送り主のお名前</label><br><input type="text" value="山田 太郎"></p>
  <p class="submit"><input type="submit" value="ギフトを購入して贈る"></p>
</form>`;

const POSTEVENT_FORM = `<form>
  <fieldset><legend>満足度</legend>
    <label><input type="radio" name="sat" checked> 大変満足</label>
    <label><input type="radio" name="sat"> 満足</label>
    <label><input type="radio" name="sat"> 普通</label>
    <label><input type="radio" name="sat"> 不満</label>
  </fieldset>
  <p><label>印象に残った点・ご感想</label><br><textarea>事例セッションが具体的で参考になりました。</textarea></p>
  <p><label>次回取り上げてほしいテーマ</label><br><input type="text" value="生成AIの活用"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="アンケートを送信"></p>
</form>`;

const CANCEL_FORM = `<form>
  <p><label>予約番号</label><br><input type="text" value="RV-20260710-014"></p>
  <p><label>ご希望の操作</label><br><label class="opt"><input type="radio" name="op" checked> 日程を変更</label><label class="opt"><input type="radio" name="op"> キャンセル</label></p>
  <p><label>変更希望日（変更の場合）</label><br><input type="date" value="2026-07-15"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="この内容で手続きする"></p>
</form>`;

const ACTIVATION_FORM = `<form>
  <p><label>アクティベーションコード</label><br><input type="text" value="TRIAL-7K9D-2XQ8"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="体験版を有効化"></p>
</form>`;

const RETENTION_FORM = `<form>
  <fieldset>
    <label class="r"><input type="radio" name="why" checked> 料金が高い</label>
    <label class="r"><input type="radio" name="why"> あまり使わなかった</label>
    <label class="r"><input type="radio" name="why"> 他サービスに移行</label>
    <label class="r"><input type="radio" name="why"> その他</label>
  </fieldset>
  <p><textarea placeholder="差し支えなければ詳しくお聞かせください（任意）"></textarea></p>
  <p class="submit"><input type="submit" value="解約手続きを続ける"></p>
</form>`;

const SCHEDULE_FORM = `<form>
  <fieldset><legend>候補日時（複数選択可）</legend>
    <label class="slot"><input type="checkbox" checked> 7/8(火) 10:00-11:00</label>
    <label class="slot"><input type="checkbox"> 7/8(火) 15:00-16:00</label>
    <label class="slot"><input type="checkbox" checked> 7/9(水) 13:00-14:00</label>
    <label class="slot"><input type="checkbox"> 7/10(木) 11:00-12:00</label>
  </fieldset>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="この日程で回答する"></p>
</form>`;

const TALENT_FORM = `<form>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p><label>希望職種</label><br><select><option selected>エンジニア</option><option>デザイナー</option><option>営業</option><option>マーケティング</option></select></p>
  <p><label>経験年数</label><br><select><option>〜3年</option><option selected>3〜7年</option><option>8年以上</option></select></p>
  <p><label>履歴書 / 職務経歴書（任意）</label><br><input type="file"></p>
  <p class="submit"><input type="submit" value="キャリア登録する"></p>
</form>`;

const PARTNER_FORM = `<form>
  <div class="row"><p><label>会社名</label><br><input type="text" value="株式会社サンプル"></p><p><label>ご担当者名</label><br><input type="text" value="山田 太郎"></p></div>
  <div class="row"><p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p><p><label>電話番号</label><br><input type="tel" value="03-0000-0000"></p></div>
  <p><label>希望パートナー形態</label><br><select><option selected>販売代理店</option><option>紹介パートナー</option><option>OEM/技術提携</option></select></p>
  <p><label>取扱予定の地域・分野</label><br><textarea>関東圏の中小企業向けに販売を検討しています。</textarea></p>
  <p class="submit"><input type="submit" value="申し込む"></p>
</form>`;

const PROFILE_FORM = `<form>
  <p><label>業種</label><br><select><option>IT・通信</option><option selected>製造</option><option>小売</option><option>サービス</option></select></p>
  <p><label>役職</label><br><input type="text" value="マーケティング マネージャー"></p>
  <p><label>関心のあるテーマ（複数可）</label><br><label class="chk"><input type="checkbox" checked>業務効率化</label><label class="chk"><input type="checkbox">売上拡大</label><label class="chk"><input type="checkbox">人材育成</label></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="プロフィールを更新"></p>
</form>`;

const WARRANTY_FORM = `<form>
  <p><label>製品名 / 型番</label><br><input type="text" value="Model X-200"></p>
  <div class="row"><p><label>シリアル番号</label><br><input type="text" value="SN-00012345"></p><p><label>購入日</label><br><input type="date" value="2026-06-01"></p></div>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="保証を登録する"></p>
</form>`;

const FEEDBACK_FORM = `<form>
  <p><label>種別</label><br><select><option selected>機能リクエスト</option><option>不具合報告</option><option>改善提案</option></select></p>
  <p><label>タイトル</label><br><input type="text" value="一覧画面に並び替え機能がほしい"></p>
  <p><label>詳細</label><br><textarea>列ヘッダーをクリックして昇順/降順に並び替えできると便利です。</textarea></p>
  <p><label>メールアドレス（任意・経過連絡用）</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="送信する"></p>
</form>`;

const PREORDER_FORM = `<form>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p><label>カラー</label><br><select><option selected>マットブラック</option><option>パールホワイト</option></select></p>
  <p><label>数量</label><br><select><option selected>1</option><option>2</option><option>3</option></select></p>
  <p class="submit"><input type="submit" value="この内容で予約する"></p>
</form>`;

const CONSULT_FORM = `<form>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <div class="row"><p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p><p><label>電話番号</label><br><input type="tel" value="090-0000-0000"></p></div>
  <p><label>ご相談内容</label><br><select><option>料金・契約について</option><option selected>導入の進め方</option><option>その他</option></select></p>
  <p><label>ご希望日時</label><br><input type="date" value="2026-07-08"></p>
  <p><label>相談したいこと（任意）</label><br><textarea>現状の課題について相談したいです。</textarea></p>
  <p class="submit"><input type="submit" value="無料相談を予約する"></p>
</form>`;

const REDEEM_FORM = `<form>
  <p><label>クーポンコード</label><br><input type="text" value="WELCOME2026"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="特典を引き換える"></p>
</form>`;

const GRANT_FORM = `<form>
  <fieldset><legend>事業形態</legend>
    <label><input type="radio" name="biz" checked> 法人</label>
    <label><input type="radio" name="biz"> 個人事業主</label>
  </fieldset>
  <p><label>従業員規模</label><br><select><option>〜5名</option><option selected>6〜20名</option><option>21〜50名</option><option>51名以上</option></select></p>
  <fieldset><legend>関心のある用途（複数可）</legend>
    <label><input type="checkbox" checked> 設備投資</label>
    <label><input type="checkbox"> IT導入・DX</label>
    <label><input type="checkbox"> 人材育成</label>
  </fieldset>
  <p><label>診断結果の送付先メール</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="診断結果を受け取る"></p>
</form>`;

const CERT_FORM = `<form>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <div class="row"><p><label>受験級</label><br><select><option>1級</option><option selected>2級</option><option>3級</option></select></p><p><label>受験会場</label><br><select><option>東京</option><option>大阪</option><option>オンライン</option></select></p></div>
  <p><label>希望受験日</label><br><input type="date" value="2026-08-23"></p>
  <p class="submit"><input type="submit" value="受験を申し込む"></p>
</form>`;

const VOTE_FORM = `<form>
  <fieldset><legend>投票する候補を選択</legend>
    <label><input type="radio" name="vote" checked> 候補A：未来をひらくプラン</label>
    <label><input type="radio" name="vote"> 候補B：みんなで育てるプラン</label>
    <label><input type="radio" name="vote"> 候補C：地域とつながるプラン</label>
  </fieldset>
  <p><label>メールアドレス（重複投票防止）</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="この候補に投票する"></p>
</form>`;

const TESTDRIVE_FORM = `<form>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <div class="row"><p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p><p><label>電話番号</label><br><input type="tel" value="090-0000-0000"></p></div>
  <p><label>ご希望の店舗</label><br><select><option>サンプル駅前店</option><option>みなと店</option><option>本店ショールーム</option></select></p>
  <p><label>ご希望日</label><br><input type="date" value="2026-07-05"></p>
  <p class="submit"><input type="submit" value="体験を予約する"></p>
</form>`;

const SIM_FORM = `<form>
  <div class="row"><p><label>従業員数（人）</label><br><input type="number" value="50"></p><p><label>月間の対象作業時間（h）</label><br><input type="number" value="320"></p></div>
  <p><label>平均時給（円）</label><br><input type="number" value="2500"></p>
  <p><label>結果の送付先メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="試算結果を受け取る"></p>
</form>`;

const CASUAL_FORM = `<form>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p><label>現在のご状況</label><br><select><option>在職中（転職検討）</option><option>情報収集中</option><option>求職中</option></select></p>
  <p><label>話してみたいテーマ</label><br><input type="text" value="開発組織の文化について"></p>
  <p class="submit"><input type="submit" value="面談を予約する"></p>
</form>`;

const EGIFT_FORM = `<form>
  <p><label>贈る相手のお名前</label><br><input type="text" value="鈴木 花子"></p>
  <p><label>相手のメールアドレス</label><br><input type="email" value="hanako@example.com"></p>
  <p><label>ギフトを選ぶ</label><br><select><option>コーヒーチケット ¥1,000</option><option selected>スイーツセット ¥3,000</option><option>カタログギフト ¥5,000</option></select></p>
  <p><label>メッセージ</label><br><textarea>いつもありがとう。ささやかですが贈ります。</textarea></p>
  <p class="submit"><input type="submit" value="ギフトを贈る"></p>
</form>`;

const RESTOCK_FORM = `<form>
  <p><label>サイズ</label><br><select><option>S</option><option selected>M</option><option>L</option></select></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="入荷をお知らせする"></p>
</form>`;

const CALLBACK_FORM = `<form>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>電話番号</label><br><input type="tel" value="090-0000-0000"></p>
  <p><label>ご希望の時間帯</label><br><select><option>午前(9-12時)</option><option selected>午後(12-17時)</option><option>夕方(17-19時)</option></select></p>
  <p class="submit"><input type="submit" value="折り返しを依頼する"></p>
</form>`;

const AMBASSADOR_FORM = `<form>
  <p><label>お名前 / 活動名</label><br><input type="text" value="山田 太郎"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p><label>主なSNSアカウント (URL)</label><br><input type="text" value="https://instagram.com/sample"></p>
  <p><label>フォロワー規模</label><br><select><option>〜1千</option><option selected>1千〜1万</option><option>1万〜10万</option><option>10万以上</option></select></p>
  <p><label>志望動機</label><br><textarea>ブランドのファンとして魅力を広めたいです。</textarea></p>
  <p class="submit"><input type="submit" value="応募する"></p>
</form>`;

function contentFor(dir, category) {
  switch (dir) {
    case "04-form-contact": return CONTACT_FORM;
    case "09-form-newsletter": return NEWSLETTER_FORM;
    case "13-landing-coming-soon": return NEWSLETTER_FORM;
    case "14-landing-pricing": return PRICING_INTRO;
    case "15-landing-casestudy": return CASESTUDY_BODY;
    case "16-form-survey": return SURVEY_FORM;
    case "20-thankyou-confirm": return CONFIRM_BODY;
    case "21-utility-preference": return PREFERENCE_FORM;
    case "22-utility-unsubscribe": return UNSUB_FORM;
    case "23-landing-referral": return REFERRAL_FORM;
    case "24-landing-faq": return FAQ_BODY;
    case "25-landing-comparison": return COMPARISON_BODY;
    case "26-form-jobapply": return JOBAPPLY_FORM;
    case "27-event-rsvp": return RSVP_FORM;
    case "28-landing-appdownload": return APP_BODY;
    case "29-landing-countdown": return NEWSLETTER_FORM;
    case "30-form-demo": return STD_FORM;
    case "31-thankyou-coupon": return COUPON_BODY;
    case "32-landing-testimonials": return NEWSLETTER_FORM;
    case "33-form-quiz": return QUIZ_FORM;
    case "34-utility-maintenance": return NEWSLETTER_FORM;
    case "35-form-nps": return NPS_FORM;
    case "36-thankyou-onboarding": return ONBOARDING_BODY;
    case "37-landing-donation": return DONATION_FORM;
    case "38-form-videogate": return STD_FORM;
    case "40-event-series": return STD_FORM;
    case "41-utility-password-reset": return PWRESET_FORM;
    case "42-landing-seasonal": return NEWSLETTER_FORM;
    case "43-form-whitepaper-toc": return STD_FORM;
    case "44-form-quote": return QUOTE_FORM;
    case "47-form-booking": return BOOKING_FORM;
    case "48-thankyou-review-request": return REVIEW_BODY;
    case "49-landing-beta": return NEWSLETTER_FORM;
    case "50-form-sample-request": return SAMPLE_FORM;
    case "51-landing-loyalty": return NEWSLETTER_FORM;
    case "52-thankyou-calendar": return CALENDAR_BODY;
    case "53-landing-community": return NEWSLETTER_FORM;
    case "54-landing-product-update": return NEWSLETTER_FORM;
    case "55-form-ambassador": return AMBASSADOR_FORM;
    case "56-form-restock-notify": return RESTOCK_FORM;
    case "57-landing-contest": return NEWSLETTER_FORM;
    case "58-form-callback": return CALLBACK_FORM;
    case "59-form-casual-interview": return CASUAL_FORM;
    case "60-landing-podcast": return NEWSLETTER_FORM;
    case "61-form-egift": return EGIFT_FORM;
    case "62-landing-joblist": return NEWSLETTER_FORM;
    case "63-landing-cart-recovery": return NEWSLETTER_FORM;
    case "64-thankyou-social-share": return SHARE_BODY;
    case "65-form-roi-calculator": return SIM_FORM;
    case "66-landing-course": return NEWSLETTER_FORM;
    case "67-landing-alumni": return NEWSLETTER_FORM;
    case "68-landing-store-opening": return NEWSLETTER_FORM;
    case "69-form-test-drive": return TESTDRIVE_FORM;
    case "71-landing-crowdfunding": return DONATION_FORM;
    case "72-form-vote": return VOTE_FORM;
    case "73-landing-vip": return NEWSLETTER_FORM;
    case "75-form-certification": return CERT_FORM;
    case "76-landing-digital-card": return NEWSLETTER_FORM;
    case "78-landing-resource-library": return NEWSLETTER_FORM;
    case "79-landing-upgrade": return NEWSLETTER_FORM;
    case "80-form-grant-diagnosis": return GRANT_FORM;
    case "82-landing-flash-sale-member": return NEWSLETTER_FORM;
    case "83-form-coupon-redeem": return REDEEM_FORM;
    case "84-landing-anniversary": return NEWSLETTER_FORM;
    case "85-utility-apology": return NEWSLETTER_FORM;
    case "87-form-free-consultation": return CONSULT_FORM;
    case "88-landing-newsletter-archive": return NEWSLETTER_FORM;
    case "89-form-preorder": return PREORDER_FORM;
    case "91-landing-stamp-card": return NEWSLETTER_FORM;
    case "92-form-warranty-registration": return WARRANTY_FORM;
    case "93-landing-seminar-archive": return NEWSLETTER_FORM;
    case "94-form-feature-feedback": return FEEDBACK_FORM;
    case "95-form-partner-application": return PARTNER_FORM;
    case "97-form-profile-completion": return PROFILE_FORM;
    case "99-form-talent-pool": return TALENT_FORM;
    case "100-landing-welcome-back": return NEWSLETTER_FORM;
    case "101-form-trial-activation": return ACTIVATION_FORM;
    case "102-landing-retention-offer": return RETENTION_FORM;
    case "103-form-schedule-poll": return SCHEDULE_FORM;
    case "104-form-post-event-survey": return POSTEVENT_FORM;
    case "105-landing-spin-wheel": return NEWSLETTER_FORM;
    case "106-form-cancel-reschedule": return CANCEL_FORM;
    case "107-landing-app-modal": return NEWSLETTER_FORM;
    case "108-form-gift-card": return GIFTCARD_FORM;
    case "109-landing-low-stock": return NEWSLETTER_FORM;
    case "110-form-health-checkup": return HEALTH_FORM;
    case "111-form-points-exchange": return POINTS_FORM;
    case "114-form-recurring-donation": return RECUR_DONATION_FORM;
    case "115-landing-investor-relations": return NEWSLETTER_FORM;
    case "116-form-student-verification": return STUDENT_FORM;
    case "117-landing-membership-rankup": return NEWSLETTER_FORM;
    case "118-form-safety-confirmation": return SAFETY_FORM;
    case "119-form-insurance-quote": return INSURANCE_FORM;
    case "120-landing-fanclub": return NEWSLETTER_FORM;
    case "121-form-vendor-registration": return VENDOR_FORM;
    case "122-form-receipt-campaign": return RECEIPT_FORM;
    case "123-landing-petition": return PETITION_FORM;
    case "124-form-volunteer": return VOLUNTEER_FORM;
    case "126-form-birthday-club": return BIRTHDAY_FORM;
    case "127-form-monitor-recruit": return MONITOR_FORM;
    case "128-form-subscription-box": return SUBBOX_FORM;
    case "129-form-facility-reservation": return FACILITY_FORM;
    case "131-form-support-ticket": return SUPPORT_FORM;
    case "133-landing-lucky-bag": return NEWSLETTER_FORM;
    case "135-form-kiosk-leadcapture": return KIOSK_FORM;
    case "136-form-loan-application": return LOAN_FORM;
    case "137-landing-countdown-live": return NEWSLETTER_FORM;
    case "138-landing-roi-calculator-live": return NEWSLETTER_FORM;
    case "139-landing-tabs-js": return NEWSLETTER_FORM;
    case "140-landing-faq-accordion-js": return NEWSLETTER_FORM;
    case "141-landing-bmi-calculator-js": return NEWSLETTER_FORM;
    case "142-landing-before-after": return NEWSLETTER_FORM;
    case "143-event-wedding-rsvp": return WEDDING_RSVP_FORM;
    case "144-landing-wizard-js": return NEWSLETTER_FORM;
    case "145-form-tour-booking": return TOUR_FORM;
    case "146-form-real-estate-inquiry": return REALESTATE_FORM;
    case "147-landing-scratch-coupon-js": return NEWSLETTER_FORM;
    case "148-form-moving-estimate": return MOVING_FORM;
    case "149-form-shareholder-benefit": return SHAREHOLDER_FORM;
    case "150-landing-plan-selector-js": return NEWSLETTER_FORM;
    case "151-event-livestream": return STD_FORM;
    case "152-form-star-rating-js": return REVIEW_POST_FORM;
    case "153-landing-membership-renewal": return NEWSLETTER_FORM;
    case "154-form-baby-registry": return BABY_FORM;
    case "155-landing-color-picker-js": return NEWSLETTER_FORM;
    case "156-form-quiz-scored-js": return NEWSLETTER_FORM;
    case "157-form-pet-registration": return PET_FORM;
    case "158-form-takeout-order": return TAKEOUT_FORM;
    case "160-form-rental-booking": return RENTAL_FORM;
    case "161-landing-pricing-toggle-js": return NEWSLETTER_FORM;
    case "162-form-result-lookup": return LOOKUP_FORM;
    case "163-landing-stats-counter-js": return NEWSLETTER_FORM;
    case "165-landing-image-gallery-js": return NEWSLETTER_FORM;
    case "166-form-trade-in": return TRADEIN_FORM;
    case "168-landing-faq-search-js": return NEWSLETTER_FORM;
    case "169-form-repair-request": return REPAIR_FORM;
    case "170-form-group-booking": return GROUP_FORM;
    case "171-landing-testimonial-carousel-js": return NEWSLETTER_FORM;
    case "172-form-translation-request": return TRANSLATION_FORM;
    case "173-form-stock-reservation": return STOCK_FORM;
    case "174-form-emoji-feedback-js": return REVIEW_POST_FORM;
    case "175-form-appointment-slots-js": return APPT_FORM;
    case "176-form-catalog-request": return CATALOG_FORM;
    case "177-landing-sticky-deal-bar-js": return NEWSLETTER_FORM;
    case "178-form-warranty-extension": return WARRANTY_EXT_FORM;
    case "179-landing-loan-simulator-js": return NEWSLETTER_FORM;
    case "180-form-wishlist": return WISHLIST_FORM;
    case "182-landing-store-access": return NEWSLETTER_FORM;
    case "184-form-gift-wrapping": return GIFTWRAP_FORM;
    case "185-utility-job-alert": return JOBALERT_FORM;
    case "187-form-trial-extension": return TRIAL_EXT_FORM;
    case "188-form-order-quantity-js": return APPT_FORM;
    case "189-landing-checklist-score-js": return NEWSLETTER_FORM;
    case "190-form-event-feedback-detailed": return DETAILED_FEEDBACK_FORM;
    case "191-landing-conditional-survey-js": return NEWSLETTER_FORM;
    case "192-form-membership-upgrade": return UPGRADE_FORM;
    case "194-form-sponsor-application": return SPONSOR_FORM;
    case "195-form-price-offer": return OFFER_FORM;
    case "197-form-speaker-application": return SPEAKER_FORM;
    case "198-form-workshop-booking": return WORKSHOP_FORM;
    case "199-landing-flipbook-catalog-js": return NEWSLETTER_FORM;
    case "201-form-photo-contest": return PHOTO_CONTEST_FORM;
    case "202-landing-team-members": return NEWSLETTER_FORM;
    case "203-form-multi-star-rating-js": return REVIEW_POST_FORM;
    case "204-form-return-request": return RETURN_FORM;
    case "205-utility-subscription-pause": return PAUSE_FORM;
    case "206-landing-referral-leaderboard": return NEWSLETTER_FORM;
    case "207-form-line-friend-add": return NEWSLETTER_FORM;
    case "208-landing-product-roadmap": return NEWSLETTER_FORM;
    case "209-form-booth-meeting": return MEETING_FORM;
    case "210-utility-account-deletion": return DELETE_FORM;
    case "211-landing-plan-recommend-js": return NEWSLETTER_FORM;
    case "212-form-renovation-quote": return RENOV_FORM;
    case "213-form-clinic-appointment": return CLINIC_FORM;
    case "214-landing-savings-comparison-js": return NEWSLETTER_FORM;
    case "215-landing-event-recap": return NEWSLETTER_FORM;
    case "219-form-employee-referral": return REFERRAL_RECRUIT_FORM;
    case "220-landing-personality-quiz-js": return NEWSLETTER_FORM;
    case "221-form-product-customizer-js": return APPT_FORM;
    case "222-event-seminar-agenda": return NEWSLETTER_FORM;
    case "223-landing-image-compare-js": return NEWSLETTER_FORM;
    case "224-landing-eco-impact-calculator-js": return NEWSLETTER_FORM;
    case "225-form-property-viewing": return VIEWING_FORM;
    case "226-landing-typewriter-hero-js": return NEWSLETTER_FORM;
    case "227-event-speaker-lineup": return NEWSLETTER_FORM;
    case "228-thankyou-order-summary": return NEWSLETTER_FORM;
    case "229-form-suggestion-box": return SUGGESTION_FORM;
    case "230-landing-product-hotspots-js": return NEWSLETTER_FORM;
    case "231-landing-flip-cards-js": return NEWSLETTER_FORM;
    case "232-utility-double-optin": return OPTIN_CONFIRM_FORM;
    case "233-event-job-fair": return JOBFAIR_FORM;
    case "234-landing-live-poll-js": return NEWSLETTER_FORM;
    case "235-landing-currency-switch-js": return NEWSLETTER_FORM;
    case "236-form-data-request": return DATA_REQUEST_FORM;
    case "237-thankyou-upsell-offer": return UPSELL_FORM;
    case "238-landing-process-steps": return CONSULT_FORM;
    case "239-landing-usage-pricing-js": return NEWSLETTER_FORM;
    case "240-event-awards-ceremony": return RSVP_FORM;
    case "241-form-newsletter-topics": return TOPICS_FORM;
    case "242-landing-image-360-js": return NEWSLETTER_FORM;
    case "243-landing-reveal-on-scroll-js": return NEWSLETTER_FORM;
    case "244-event-hybrid-conference": return HYBRID_FORM;
    case "245-thankyou-cross-sell-grid": return NEWSLETTER_FORM;
    case "246-landing-donation-tiers-js": return DONATION_FORM;
    case "247-form-petition-signature": return PETITION_FORM;
    case "248-utility-cookie-settings": return NEWSLETTER_FORM;
    case "249-event-workshop-handson": return WORKSHOP_FORM;
    case "250-landing-product-bundle-js": return NEWSLETTER_FORM;
    case "251-form-reservation-deposit": return BOOKING_FORM;
    case "252-form-matrix-survey": return SURVEY_COMMENT_FORM;
    case "253-thankyou-feedback-quick-js": return NEWSLETTER_FORM;
    case "254-landing-chat-faq-js": return NEWSLETTER_FORM;
    case "255-form-multi-recipient-gift": return MULTIGIFT_FORM;
    case "256-event-virtual-booth": return BOOTH_FORM;
    case "257-utility-survey-closed": return NEWSLETTER_FORM;
    case "258-landing-score-gauge-js": return NEWSLETTER_FORM;
    case "259-form-class-enrollment": return ENROLL_FORM;
    case "260-event-product-launch": return LAUNCH_FORM;
    case "261-thankyou-points-earned": return NEWSLETTER_FORM;
    case "262-landing-video-playlist-js": return NEWSLETTER_FORM;
    case "263-event-roadshow-cities": return ROADSHOW_FORM;
    case "264-form-bulk-order": return BULKORDER_FORM;
    case "265-utility-email-verified": return NEWSLETTER_FORM;
    case "266-landing-tip-split-js": return NEWSLETTER_FORM;
    case "267-form-membership-cancel": return MEMBER_CANCEL_FORM;
    case "268-event-alumni-reunion": return ALUMNI_FORM;
    case "269-thankyou-gift-sent": return NEWSLETTER_FORM;
    case "270-landing-rating-distribution-js": return NEWSLETTER_FORM;
    case "271-form-beta-tester-apply": return BETA_FORM;
    case "272-event-sports-tournament": return TEAM_ENTRY_FORM;
    case "273-utility-error-404": return NEWSLETTER_FORM;
    case "274-landing-image-zoom-js": return NEWSLETTER_FORM;
    case "275-form-catering-order": return CATERING_FORM;
    case "276-event-fan-meeting": return FANMEET_FORM;
    case "277-thankyou-subscription-started": return NEWSLETTER_FORM;
    case "278-landing-size-guide-js": return NEWSLETTER_FORM;
    case "279-form-scholarship-application": return SCHOLARSHIP_FORM;
    case "280-event-tasting": return TASTING_FORM;
    case "281-thankyou-application-received": return NEWSLETTER_FORM;
    case "282-landing-reading-progress-js": return NEWSLETTER_FORM;
    case "283-form-vehicle-service-booking": return VEHICLE_SERVICE_FORM;
    case "284-event-charity-run": return CHARITY_RUN_FORM;
    case "285-utility-payment-failed": return CARDUPDATE_FORM;
    case "286-landing-coupon-copy-js": return NEWSLETTER_FORM;
    case "287-form-hotel-reservation": return HOTEL_FORM;
    case "288-event-open-house": return OPENHOUSE_FORM;
    case "289-thankyou-review-submitted": return NEWSLETTER_FORM;
    case "290-landing-free-shipping-progress-js": return NEWSLETTER_FORM;
    case "291-form-membership-join": return MEMBER_JOIN_FORM;
    case "292-event-cooking-class": return COOKING_FORM;
    case "293-utility-browser-unsupported": return NEWSLETTER_FORM;
    case "294-landing-anniversary-countup-js": return NEWSLETTER_FORM;
    case "295-form-pet-grooming-booking": return GROOMING_FORM;
    case "296-event-flea-market": return FLEA_FORM;
    case "297-utility-region-restricted": return NEWSLETTER_FORM;
    case "298-landing-circular-countdown-js": return NEWSLETTER_FORM;
    case "299-form-membership-renewal": return RENEWAL_FORM;
    case "300-event-anniversary-party": return ANNIV_PARTY_FORM;
    case "301-thankyou-vote-cast": return NEWSLETTER_FORM;
    case "302-landing-tax-calculator-js": return NEWSLETTER_FORM;
    case "303-form-parking-reservation": return PARKING_FORM;
    case "304-event-graduation-ceremony": return GRADUATION_FORM;
    case "305-thankyou-preorder-confirmed": return NEWSLETTER_FORM;
    case "306-landing-addon-pricing-builder-js": return NEWSLETTER_FORM;
    case "307-form-fitting-reservation": return FITTING_FORM;
    case "308-event-blood-donation": return BLOOD_FORM;
    case "309-utility-account-suspended": return NEWSLETTER_FORM;
    case "310-landing-pet-age-calculator-js": return NEWSLETTER_FORM;
    case "311-form-equipment-rental": return RENTAL_GEAR_FORM;
    case "312-event-art-exhibition": return ARTSHOW_FORM;
    case "313-thankyou-refund-processed": return NEWSLETTER_FORM;
    case "314-landing-due-date-calculator-js": return NEWSLETTER_FORM;
    case "315-form-storage-rental": return STORAGE_FORM;
    case "316-event-music-festival": return FESTIVAL_FORM;
    case "317-thankyou-trial-started": return NEWSLETTER_FORM;
    case "318-landing-electricity-savings-js": return NEWSLETTER_FORM;
    case "319-form-solar-quote": return SOLAR_FORM;
    case "320-event-comedy-show": return COMEDY_FORM;
    case "321-utility-form-error": return NEWSLETTER_FORM;
    case "322-landing-compound-interest-js": return NEWSLETTER_FORM;
    case "323-form-investment-consultation": return INVEST_FORM;
    case "324-event-startup-pitch": return PITCH_FORM;
    case "325-thankyou-callback-scheduled": return NEWSLETTER_FORM;
    case "326-landing-fuel-cost-calculator-js": return NEWSLETTER_FORM;
    case "327-form-gym-trial": return GYM_FORM;
    case "328-event-health-screening": return SCREENING_FORM;
    case "329-utility-age-verification": return NEWSLETTER_FORM;
    case "330-landing-faq-helpful-vote-js": return CONTACT_FORM;
    case "331-form-printing-quote": return PRINTING_FORM;
    case "332-event-book-signing": return BOOKSIGN_FORM;
    case "333-thankyou-document-signed": return NEWSLETTER_FORM;
    case "334-landing-product-filter-js": return NEWSLETTER_FORM;
    case "335-form-warranty-claim": return WARRANTY_CLAIM_FORM;
    case "336-event-pet-adoption": return ADOPTION_FORM;
    case "337-utility-data-export-ready": return NEWSLETTER_FORM;
    case "338-landing-timeline-history": return NEWSLETTER_FORM;
    case "339-form-web-quote": return WEB_QUOTE_FORM;
    case "340-event-kids-camp": return KIDSCAMP_FORM;
    case "341-thankyou-warranty-registered": return NEWSLETTER_FORM;
    case "342-landing-theme-toggle-js": return NEWSLETTER_FORM;
    case "343-form-pet-insurance": return PETINS_FORM;
    case "344-event-real-estate-seminar": return RESEMINAR_FORM;
    case "345-utility-account-reactivated": return NEWSLETTER_FORM;
    case "346-landing-timezone-converter-js": return NEWSLETTER_FORM;
    case "347-form-cleaning-quote": return CLEANING_FORM;
    case "348-event-online-yoga": return YOGA_FORM;
    case "349-thankyou-checkin-complete": return NEWSLETTER_FORM;
    case "350-landing-goal-thermometer-js": return DONATION_FORM;
    case "351-form-photography-booking": return PHOTO_FORM;
    case "352-event-stargazing": return STARGAZE_FORM;
    case "353-utility-trial-expired": return NEWSLETTER_FORM;
    case "354-landing-comparison-switch-js": return NEWSLETTER_FORM;
    case "355-form-franchise-inquiry": return FRANCHISE_FORM;
    case "356-event-school-festival": return SCHOOLFEST_FORM;
    case "357-utility-verification-pending": return NEWSLETTER_FORM;
    case "358-landing-discount-stack-js": return NEWSLETTER_FORM;
    case "359-form-wedding-venue-inquiry": return WEDDING_VENUE_FORM;
    case "360-event-volunteer-day": return VOLUNTEER_DAY_FORM;
    case "361-thankyou-subscription-paused": return NEWSLETTER_FORM;
    case "362-landing-grade-point-calculator-js": return NEWSLETTER_FORM;
    case "363-form-language-lesson-trial": return LANGLESSON_FORM;
    case "364-event-hackathon": return HACKATHON_FORM;
    case "365-utility-password-changed": return NEWSLETTER_FORM;
    case "366-landing-recipe-scaler-js": return NEWSLETTER_FORM;
    case "367-form-restaurant-reservation": return RESTAURANT_FORM;
    case "368-event-food-festival": return FOODFEST_FORM;
    case "369-utility-email-bounce": return NEWSLETTER_FORM;
    case "370-landing-paint-calculator-js": return NEWSLETTER_FORM;
    case "371-form-internet-plan-signup": return INTERNET_FORM;
    case "372-event-esports-tournament": return ESPORTS_FORM;
    case "373-thankyou-reward-redeemed": return NEWSLETTER_FORM;
    case "374-landing-running-pace-calculator-js": return NEWSLETTER_FORM;
    case "375-form-tax-return-help": return TAXHELP_FORM;
    case "376-event-recruiting-info-session": return RECRUITING_FORM;
    case "377-utility-payment-method-updated": return NEWSLETTER_FORM;
    case "378-landing-unit-converter-js": return NEWSLETTER_FORM;
    case "379-form-pest-control-quote": return PESTCTRL_FORM;
    case "380-event-charity-auction": return AUCTION_FORM;
    case "381-utility-account-locked": return NEWSLETTER_FORM;
    case "382-landing-age-calculator-js": return NEWSLETTER_FORM;
    case "383-form-funeral-consult": return FUNERAL_FORM;
    case "384-event-farm-experience": return FARM_FORM;
    case "385-thankyou-quote-requested": return NEWSLETTER_FORM;
    case "386-landing-shipping-eta-js": return NEWSLETTER_FORM;
    case "387-form-newspaper-subscription": return NEWSPAPER_FORM;
    case "388-event-job-internship": return INTERNSHIP_FORM;
    case "389-thankyou-survey-prize-entry": return NEWSLETTER_FORM;
    case "390-landing-sleep-calculator-js": return NEWSLETTER_FORM;
    case "391-form-tutoring-inquiry": return TUTORING_FORM;
    case "392-event-pop-up-store": return POPUP_FORM;
    case "393-utility-language-region-select": return NEWSLETTER_FORM;
    case "394-landing-water-intake-js": return NEWSLETTER_FORM;
    case "395-form-vet-appointment": return VET_FORM;
    case "396-event-film-screening": return FILM_FORM;
    case "397-thankyou-account-created": return NEWSLETTER_FORM;
    case "398-landing-calorie-calculator-js": return NEWSLETTER_FORM;
    case "399-form-tax-consultation": return TAX_CONSULT_FORM;
    case "400-event-grand-opening": return GRAND_OPEN_FORM;
    case "401-thankyou-survey-submitted": return NEWSLETTER_FORM;
    case "402-landing-mortgage-affordability-js": return NEWSLETTER_FORM;
    case "403-form-car-rental": return CAR_RENTAL_FORM;
    case "404-event-christmas-market": return RSVP_FORM;
    case "405-utility-two-factor-setup": return TWOFA_FORM;
    case "406-landing-savings-goal-planner-js": return NEWSLETTER_FORM;
    case "407-form-spa-reservation": return SPA_FORM;
    case "408-event-summer-festival": return RSVP_FORM;
    case "409-thankyou-demo-booked": return NEWSLETTER_FORM;
    case "410-landing-rent-vs-buy-js": return NEWSLETTER_FORM;
    case "411-form-driving-school": return DRIVING_SCHOOL_FORM;
    case "412-event-halloween-party": return RSVP_FORM;
    case "413-utility-app-update-required": return NEWSLETTER_FORM;
    case "414-landing-meeting-cost-js": return NEWSLETTER_FORM;
    case "415-form-house-painting": return PAINTING_FORM;
    case "416-event-craft-market": return RSVP_FORM;
    case "417-utility-gift-card-balance": return GIFTCARD_BALANCE_FORM;
    case "418-landing-freelance-rate-js": return NEWSLETTER_FORM;
    case "419-form-music-lesson": return MUSIC_LESSON_FORM;
    case "420-event-cherry-blossom": return RSVP_FORM;
    case "421-utility-payment-method-expiring": return CARD_UPDATE_FORM;
    case "422-landing-price-guess-game": return NEWSLETTER_FORM;
    case "423-form-bespoke-jewelry": return JEWELRY_FORM;
    case "424-event-mystery-escape-game": return ESCAPE_FORM;
    case "425-landing-product-tour-js": return TRIAL_SIGNUP_FORM;
    case "426-form-corporate-training": return TRAINING_FORM;
    case "427-thankyou-early-access": return EARLY_ACCESS_FORM;
    case "428-event-hot-air-balloon": return BALLOON_FORM;
    case "429-landing-take-home-pay-js": return NEWSLETTER_FORM;
    case "430-form-home-security": return SECURITY_FORM;
    case "431-event-marathon": return RSVP_FORM;
    case "432-thankyou-webinar-registered": return NEWSLETTER_FORM;
    case "433-landing-coffee-cost-js": return NEWSLETTER_FORM;
    case "434-form-coworking-tour": return COWORKING_FORM;
    case "435-event-beer-garden": return RSVP_FORM;
    case "436-utility-storage-almost-full": return STORAGE_UPGRADE_FORM;
    case "437-landing-credit-card-payoff-js": return NEWSLETTER_FORM;
    case "438-form-dental-checkup": return DENTAL_FORM;
    case "439-event-night-market": return RSVP_FORM;
    case "440-thankyou-pre-registration": return NEWSLETTER_FORM;
    case "441-landing-fx-converter-js": return NEWSLETTER_FORM;
    case "442-form-eyewear-fitting": return EYEWEAR_FORM;
    case "443-event-jazz-night": return RSVP_FORM;
    case "444-utility-win-back": return REDEEM_FORM;
    case "445-landing-break-even-js": return NEWSLETTER_FORM;
    case "446-form-florist-order": return FLORIST_FORM;
    case "447-event-farmers-market": return RSVP_FORM;
    case "448-thankyou-reschedule-confirmed": return NEWSLETTER_FORM;
    case "449-landing-markup-margin-js": return NEWSLETTER_FORM;
    case "450-form-hair-salon": return HAIR_SALON_FORM;
    case "451-event-golf-competition": return RSVP_FORM;
    case "452-thankyou-deposit-received": return NEWSLETTER_FORM;
    case "453-landing-ev-charging-savings-js": return NEWSLETTER_FORM;
    case "454-form-car-detailing": return DETAILING_FORM;
    case "455-event-aquarium-night": return RSVP_FORM;
    case "456-utility-plan-downgraded": return NEWSLETTER_FORM;
    case "457-landing-retirement-fund-js": return NEWSLETTER_FORM;
    case "458-form-dance-studio": return DANCE_FORM;
    case "459-event-drone-show": return RSVP_FORM;
    case "460-utility-account-merged": return NEWSLETTER_FORM;
    case "461-landing-subscription-audit-js": return NEWSLETTER_FORM;
    case "462-form-swimming-school": return SWIM_FORM;
    case "463-event-bowling-tournament": return RSVP_FORM;
    case "464-thankyou-loyalty-upgraded": return NEWSLETTER_FORM;
    case "465-landing-life-insurance-needs-js": return NEWSLETTER_FORM;
    case "466-form-vaccination": return VACCINE_FORM;
    case "467-event-cycling-tour": return RSVP_FORM;
    case "468-thankyou-subscription-renewed": return NEWSLETTER_FORM;
    case "469-landing-calories-burned-js": return NEWSLETTER_FORM;
    case "470-form-lawn-care": return LAWN_FORM;
    case "471-event-comic-convention": return RSVP_FORM;
    case "472-utility-email-changed": return NEWSLETTER_FORM;
    case "473-landing-hourly-wage-js": return NEWSLETTER_FORM;
    case "474-form-phone-repair": return PHONE_REPAIR_FORM;
    case "475-event-magic-show": return RSVP_FORM;
    case "476-thankyou-repair-booked": return NEWSLETTER_FORM;
    case "477-landing-discount-final-price-js": return NEWSLETTER_FORM;
    case "478-form-locksmith": return LOCKSMITH_FORM;
    case "479-event-food-truck-festival": return RSVP_FORM;
    case "216-form-interview-schedule": return INTERVIEW_FORM;
    case "218-form-satisfaction-slider-js": return REVIEW_POST_FORM;
    case "06-thank-you": return THANKYOU_BODY;
    case "12-thankyou-download": return THANKYOU_DL_BODY;
  }
  switch (category) {
    case "form": return STD_FORM;
    case "event": return EVENT_BODY;
    case "thankyou": return THANKYOU_BODY;
    case "utility": return PREFERENCE_FORM;
    case "landing":
    default: return LANDING_BODY;
  }
}

// ---- マージタグ置換 ------------------------------------------------------
function render(html, { title, description, content }) {
  const map = {
    "%%title%%": (title || "サンプルタイトル").replace(/\n/g, "<br>"),
    "%%description%%": description || "ここに説明文が入ります。",
    "%%content%%": content,
    "%%account-name%%": ACCOUNT_NAME,
    "%%account-website%%": ACCOUNT_WEB,
  };
  let out = html;
  for (const [k, v] of Object.entries(map)) out = out.split(k).join(v);
  out = out.replace(/%%[a-z0-9\-]+%%/gi, "");
  return out;
}

// ---- 収集 ----------------------------------------------------------------
const dirs = readdirSync(TPL_DIR, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name)
  // 連番プレフィックスで数値順（"100-" が "11-" より後に来るように）
  .sort((a, b) => (parseInt(a, 10) || 0) - (parseInt(b, 10) || 0) || a.localeCompare(b));

if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

const items = [];
for (const dir of dirs) {
  const metaPath = join(TPL_DIR, dir, "meta.json");
  const htmlPath = join(TPL_DIR, dir, "layout.html");
  if (!existsSync(metaPath) || !existsSync(htmlPath)) continue;
  const meta = JSON.parse(readFileSync(metaPath, "utf8"));
  const html = readFileSync(htmlPath, "utf8");
  const category = meta.category || "landing";
  const rendered = render(html, {
    title: meta.previewTitle ?? meta.name,
    description: meta.previewDescription ?? meta.description,
    content: meta.previewContent ?? contentFor(dir, category),
  });
  writeFileSync(join(OUT_DIR, `${dir}.html`), rendered, "utf8");
  items.push({ dir, file: `${dir}.html`, name: meta.name, description: meta.description, category, meta, layout: html });
}

// ---- ダウンロード用データ (data.js) --------------------------------------
const installerFiles = {};
for (const f of ["install.mjs", "config.example.json"]) {
  const p = join(__dirname, f);
  if (existsSync(p)) installerFiles[f] = readFileSync(p, "utf8");
}
const INSTALLER_README = `# Account Engagement レイアウトテンプレート インストーラ

このZIPは、選択したレイアウトテンプレートを Account Engagement (Pardot) v5 API で
一括登録するための一式です。

## 手順
1. このフォルダ内の config.example.json を config.json にコピーし、認証情報を記入
2. node install.mjs --dry-run   # 送信せず内容確認
3. node install.mjs             # 本番登録

要件: Node.js 18 以上 / 接続アプリ(pardot_api スコープ) / ビジネスユニットID(0Uv...)
詳細は各 templates/<NN-xxx>/meta.json と install.mjs 冒頭のコメントを参照してください。
`;

const galleryData = {
  templates: items.map((it) => ({
    dir: it.dir,
    name: it.name,
    description: it.description || "",
    category: it.category,
    layout: it.layout,
    meta: it.meta,
  })),
  installer: installerFiles,
  installerReadme: INSTALLER_README,
};
writeFileSync(
  join(OUT_DIR, "data.js"),
  "window.__GALLERY__ = " + JSON.stringify(galleryData) + ";\n",
  "utf8"
);

// ---- ギャラリー index.html ----------------------------------------------
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function cardHtml(it) {
  return `      <figure class="card" data-dir="${it.dir}" data-cat="${it.category}" data-search="${esc((it.name + " " + (it.description||"") + " " + it.dir).toLowerCase())}">
        <label class="pick"><input type="checkbox" class="cb" data-dir="${it.dir}"><span></span></label>
        <button class="frame" data-open="${it.dir}" title="拡大プレビュー"><iframe src="${it.file}" loading="lazy" tabindex="-1" title="${esc(it.name)}"></iframe></button>
        <figcaption>
          <span class="badge badge-${it.category}">${CATEGORY_LABEL[it.category] || it.category}</span>
          <h3>${esc(it.name)}</h3>
          <p>${esc(it.description || "")}</p>
          <div class="meta"><code>${it.dir}</code>
            <span class="acts">
              <button class="lnk dl-one" data-dir="${it.dir}" title="このテンプレのHTMLをダウンロード">⬇ HTML</button>
              <button class="lnk code-one" data-dir="${it.dir}" title="HTMLコードを表示/コピー">&lt;/&gt;</button>
              <button class="lnk open-one" data-open="${it.dir}">拡大 ↗</button>
            </span>
          </div>
        </figcaption>
      </figure>`;
}

const filterBtns = ['<button class="fbtn active" data-f="all">すべて<span>' + items.length + "</span></button>"]
  .concat(
    CATEGORY_ORDER.filter((c) => items.some((i) => i.category === c)).map((c) => {
      const n = items.filter((i) => i.category === c).length;
      return `<button class="fbtn" data-f="${c}">${CATEGORY_LABEL[c]}<span>${n}</span></button>`;
    })
  )
  .join("");

let sections = "";
for (const cat of CATEGORY_ORDER) {
  const group = items.filter((i) => i.category === cat);
  if (group.length === 0) continue;
  sections += `    <section class="group" data-cat="${cat}">
      <h2 class="group-title">${CATEGORY_LABEL[cat]} <span>${group.length}</span></h2>
      <div class="grid">
${group.map(cardHtml).join("\n")}
      </div>
    </section>\n`;
}

const indexHtml = `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Account Engagement レイアウトテンプレート ギャラリー</title>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js" integrity="sha512-XMVd28F1oH/O71fzwBnV7HucLxVwtxf26XV8P4wPk26EDxuGZ91N8bsOttmnomcCD3CS5ZMRL50H0GgOHvegtg==" crossorigin="anonymous" referrerpolicy="no-referrer"></script>
<script src="data.js"></script>
<style>
  /* ====================================================================
     "Aurora Catalog" — premium redesign (self-contained / no external assets)
     デザイントークン
     ==================================================================== */
  :root{
    --ink:#121a33; --muted:#5b6680; --line:#e3e8f2; --bg:#f4f6fb; --card:#ffffff;
    --brand:#4f46e5; --brand2:#06b6d4; --violet:#8b5cf6;
    --grad-brand:linear-gradient(135deg,#4f46e5,#7c3aed 55%,#06b6d4 140%);
    --shadow-1:0 1px 2px rgba(18,26,51,.05), 0 8px 24px -14px rgba(18,26,51,.18);
    --shadow-2:0 2px 4px rgba(18,26,51,.06), 0 28px 56px -20px rgba(79,70,229,.30);
    --ease:cubic-bezier(.22,1,.36,1);
  }
  *{ box-sizing:border-box; }
  html{ scroll-behavior:smooth; }
  body{
    margin:0;
    font-family:"Hiragino Sans","Yu Gothic UI","Yu Gothic",Meiryo,"Segoe UI",system-ui,sans-serif;
    color:var(--ink);
    background:
      radial-gradient(1100px 520px at 85% -8%, rgba(99,102,241,.09), transparent 60%),
      radial-gradient(900px 480px at -10% 12%, rgba(6,182,212,.07), transparent 60%),
      var(--bg);
    -webkit-font-smoothing:antialiased;
    text-rendering:optimizeLegibility;
  }
  a{ color:var(--brand); }
  ::selection{ background:rgba(99,102,241,.22); }
  ::-webkit-scrollbar{ width:11px; height:11px; }
  ::-webkit-scrollbar-thumb{ background:#c6cddf; border-radius:999px; border:3px solid transparent; background-clip:content-box; }
  ::-webkit-scrollbar-thumb:hover{ background:#aab4cd; border:3px solid transparent; background-clip:content-box; }
  ::-webkit-scrollbar-track{ background:transparent; }
  :where(button,input,a):focus-visible{ outline:2px solid var(--brand2); outline-offset:2px; }

  /* --- 機能スイッチ（フィルタ/検索の非表示）。削除厳禁 --- */
  .hide{ display:none !important; }

  /* --- モーション --- */
  @keyframes auroraDrift{
    0%{ transform:translate3d(-3%,-5%,0) rotate(0deg) scale(1); }
    100%{ transform:translate3d(3%,5%,0) rotate(6deg) scale(1.12); }
  }
  @keyframes fadeUp{ from{ opacity:0; transform:translateY(12px); } to{ opacity:1; transform:none; } }
  @keyframes popIn{ from{ opacity:0; transform:translateY(16px) scale(.975); } to{ opacity:1; transform:none; } }
  @keyframes fadeIn{ from{ opacity:0; } to{ opacity:1; } }
  @keyframes tickPop{ 0%{ transform:scale(.8); } 60%{ transform:scale(1.14); } 100%{ transform:scale(1); } }

  /* --- ヒーロー：オーロラ＋微細グリッド --- */
  .hero{ background:#070b1d; color:#fff; padding:58px 28px 50px; position:relative; overflow:hidden; isolation:isolate; }
  .hero::before{
    content:""; position:absolute; inset:-40% -20%; z-index:-1;
    background:
      radial-gradient(42% 52% at 22% 36%, rgba(79,70,229,.55), transparent 70%),
      radial-gradient(36% 46% at 78% 22%, rgba(6,182,212,.38), transparent 70%),
      radial-gradient(30% 42% at 62% 78%, rgba(139,92,246,.42), transparent 70%);
    filter:blur(38px) saturate(1.2);
    animation:auroraDrift 16s ease-in-out infinite alternate;
  }
  .hero::after{
    content:""; position:absolute; inset:0; pointer-events:none;
    background:
      linear-gradient(rgba(255,255,255,.045) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,.045) 1px, transparent 1px),
      radial-gradient(640px 300px at 85% -20%, rgba(255,255,255,.16), transparent);
    background-size:44px 44px, 44px 44px, auto;
    -webkit-mask-image:radial-gradient(120% 130% at 50% 0%, #000 45%, transparent 95%);
    mask-image:radial-gradient(120% 130% at 50% 0%, #000 45%, transparent 95%);
  }
  .hero .in{ max-width:1280px; margin:0 auto; position:relative; animation:fadeUp .6s var(--ease) both; }
  .hero h1{
    margin:0 0 10px; padding-right:54px; font-size:clamp(24px,2.6vw,32px); font-weight:800; letter-spacing:.005em; line-height:1.35;
    background:linear-gradient(100deg,#ffffff 35%,#c7d2fe 62%,#7dd3fc 92%);
    -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; color:#fff;
  }
  .hero p{ margin:0; color:rgba(226,232,255,.82); font-size:14px; line-height:1.85; max-width:880px; }
  .hero .chips{ margin-top:20px; display:flex; gap:9px; flex-wrap:wrap; }
  .hero .chip{
    background:rgba(255,255,255,.08); border:1px solid rgba(255,255,255,.22); color:#e7ecff;
    padding:6px 14px; border-radius:999px; font-size:12px; font-weight:600; letter-spacing:.02em;
    backdrop-filter:blur(6px); box-shadow:inset 0 1px 0 rgba(255,255,255,.14);
    transition:background .2s, transform .2s var(--ease);
  }
  .hero .chip:hover{ background:rgba(255,255,255,.15); transform:translateY(-1px); }

  /* --- ツールバー（ガラス・sticky維持） --- */
  .toolbar{ position:sticky; top:0; z-index:20; background:rgba(250,251,254,.78); backdrop-filter:blur(16px) saturate(1.5); -webkit-backdrop-filter:blur(16px) saturate(1.5); border-bottom:1px solid var(--line); box-shadow:0 6px 24px -18px rgba(18,26,51,.28); }
  .toolbar .in{ max-width:1280px; margin:0 auto; padding:12px 24px; display:flex; gap:12px; align-items:center; flex-wrap:wrap; }
  .search{ flex:1; min-width:200px; position:relative; }
  .search input{ width:100%; padding:10px 14px 10px 38px; border:1px solid var(--line); border-radius:11px; font-size:14px; background:#fff; color:var(--ink); transition:border-color .2s, box-shadow .2s; }
  .search input::placeholder{ color:#9aa3ba; }
  .search input:focus{ outline:none; border-color:var(--brand); box-shadow:0 0 0 4px rgba(79,70,229,.13); }
  .search::before{ content:"🔍"; position:absolute; left:12px; top:9px; opacity:.55; font-size:14px; }
  .filters{ display:flex; gap:6px; flex-wrap:wrap; }
  .fbtn{ border:1px solid var(--line); background:#fff; color:#3c4660; padding:8px 13px; border-radius:999px; font-size:13px; font-weight:600; cursor:pointer; display:inline-flex; gap:6px; align-items:center; transition:border-color .2s, box-shadow .2s, transform .15s var(--ease), background .2s, color .2s; }
  .fbtn:hover{ border-color:#b9c2f5; box-shadow:0 4px 14px -6px rgba(79,70,229,.35); transform:translateY(-1px); }
  .fbtn span{ background:#eef2ff; color:var(--brand); border-radius:999px; padding:0 7px; font-size:11px; font-weight:800; font-variant-numeric:tabular-nums; }
  .fbtn.active{ background:var(--grad-brand); color:#fff; border-color:transparent; box-shadow:0 6px 18px -6px rgba(79,70,229,.55); }
  .fbtn.active span{ background:rgba(255,255,255,.22); color:#fff; }
  .rescount{ font-size:12px; color:var(--muted); margin-left:auto; white-space:nowrap; font-variant-numeric:tabular-nums; }

  /* --- アクションバー --- */
  .actionbar{ position:sticky; top:57px; z-index:19; background:linear-gradient(110deg,#0b1228,#141b36 60%,#101a33); color:#fff; border-bottom:1px solid rgba(255,255,255,.06); box-shadow:0 12px 28px -18px rgba(7,11,29,.6); }
  .actionbar .in{ max-width:1280px; margin:0 auto; padding:10px 24px; display:flex; gap:10px; align-items:center; flex-wrap:wrap; }
  .actionbar .cnt{ font-size:13px; opacity:.9; }
  .actionbar .cnt b{ color:#67e8f9; font-size:15px; font-variant-numeric:tabular-nums; }
  .actionbar .spacer{ flex:1; }
  .abtn{ border:1px solid transparent; border-radius:10px; padding:9px 15px; font-size:13px; font-weight:700; cursor:pointer; letter-spacing:.01em; transition:transform .15s var(--ease), box-shadow .2s, background .2s, filter .2s; }
  .abtn.ghost{ background:rgba(255,255,255,.09); color:#e7ecff; border-color:rgba(255,255,255,.14); }
  .abtn.ghost:hover:not(:disabled){ background:rgba(255,255,255,.16); transform:translateY(-1px); }
  .abtn.primary{ background:linear-gradient(135deg,#22d3ee,#38bdf8); color:#062a3d; box-shadow:0 6px 18px -6px rgba(34,211,238,.55); }
  .abtn.primary:hover:not(:disabled){ transform:translateY(-1px); filter:brightness(1.06); }
  .abtn.green{ background:linear-gradient(135deg,#34d399,#4ade80); color:#04351f; box-shadow:0 6px 18px -6px rgba(52,211,153,.5); }
  .abtn.green:hover:not(:disabled){ transform:translateY(-1px); filter:brightness(1.05); }
  .abtn:disabled{ opacity:.38; cursor:not-allowed; box-shadow:none; }

  /* --- 本文ラッパー / カテゴリ見出し --- */
  .wrap{ max-width:1280px; margin:0 auto; padding:26px 24px 90px; }
  .group{ margin-top:38px; animation:fadeUp .45s var(--ease) both; }
  .group.hide{ display:none; }
  .group-title{ font-size:18px; font-weight:800; letter-spacing:.01em; border-left:5px solid var(--brand); padding-left:13px; margin:0 0 16px; display:flex; align-items:baseline; }
  .group-title span{ color:var(--muted); font-size:12px; font-weight:700; margin-left:10px; background:rgba(100,116,139,.1); padding:2px 10px; border-radius:999px; font-variant-numeric:tabular-nums; }
  .group[data-cat="landing"] .group-title{ border-color:#2563eb; }
  .group[data-cat="form"] .group-title{ border-color:#16a34a; }
  .group[data-cat="event"] .group-title{ border-color:#ea580c; }
  .group[data-cat="thankyou"] .group-title{ border-color:#9333ea; }
  .group[data-cat="utility"] .group-title{ border-color:#0284c7; }
  .grid{ display:grid; grid-template-columns:repeat(auto-fill,minmax(430px,1fr)); gap:24px; }

  /* --- カード --- */
  .card{ margin:0; background:var(--card); border:1px solid var(--line); border-radius:18px; overflow:hidden; box-shadow:var(--shadow-1); transition:transform .25s var(--ease), box-shadow .25s var(--ease), border-color .2s, outline-color .2s; outline:2px solid transparent; outline-offset:-1px; position:relative; }
  .card:hover{ transform:translateY(-4px); box-shadow:var(--shadow-2); border-color:rgba(99,102,241,.4); }
  .card.sel{ outline-color:var(--brand); border-color:transparent; box-shadow:0 0 0 4px rgba(79,70,229,.14), 0 18px 44px -14px rgba(79,70,229,.4); }
  .card.hide{ display:none; }
  .pick{ position:absolute; top:12px; left:12px; z-index:3; cursor:pointer; }
  .pick input{ position:absolute; opacity:0; width:26px; height:26px; cursor:pointer; }
  .pick span{ display:block; width:26px; height:26px; border-radius:9px; background:rgba(255,255,255,.94); border:1px solid #c3cbdd; box-shadow:0 2px 6px rgba(7,11,29,.18); position:relative; backdrop-filter:blur(3px); transition:border-color .15s, box-shadow .15s, background .15s; }
  .pick:hover span{ border-color:var(--brand); box-shadow:0 3px 10px rgba(79,70,229,.3); }
  .pick input:checked + span{ background:var(--grad-brand); border-color:transparent; box-shadow:0 4px 12px rgba(79,70,229,.45); animation:tickPop .28s var(--ease); }
  .pick input:checked + span::after{ content:"✓"; color:#fff; position:absolute; inset:0; display:flex; align-items:center; justify-content:center; font-size:15px; font-weight:800; }

  /* --- サムネ（縮小iframe・スケール値は変更不可） --- */
  .frame{ position:relative; display:block; width:100%; height:300px; overflow:hidden; border:0; border-bottom:1px solid var(--line); background:#fff; cursor:pointer; padding:0; }
  .frame iframe{ width:1280px; height:882px; border:0; transform:scale(0.336); transform-origin:top left; pointer-events:none; }
  .frame::after{ content:"🔍 クリックで拡大"; position:absolute; left:50%; bottom:12px; transform:translateX(-50%) translateY(8px); background:rgba(9,13,31,.84); color:#fff; font-size:12px; font-weight:700; padding:6px 14px; border-radius:999px; border:1px solid rgba(255,255,255,.18); backdrop-filter:blur(4px); box-shadow:0 8px 20px rgba(7,11,29,.35); opacity:0; transition:opacity .2s, transform .25s var(--ease); pointer-events:none; }
  .card:hover .frame::after{ opacity:1; transform:translateX(-50%) translateY(0); }

  /* --- 使い方ガイド --- */
  .howto{ background:linear-gradient(135deg,rgba(238,242,255,.92),rgba(240,253,250,.92)); border:1px solid var(--line); border-radius:18px; margin-bottom:26px; overflow:hidden; box-shadow:var(--shadow-1); animation:fadeUp .5s var(--ease) both; }
  :root[data-theme="dark"] .howto{ background:linear-gradient(135deg,#161e3c,#0c2531); border-color:#22304e; }
  .howto-toggle{ width:100%; display:flex; align-items:center; gap:12px; background:none; border:0; padding:17px 22px; cursor:pointer; text-align:left; color:var(--ink); flex-wrap:wrap; }
  .howto-toggle .ht-ttl{ font-size:16px; font-weight:800; letter-spacing:.01em; }
  .howto-toggle .ht-hint{ font-size:12.5px; color:var(--muted); }
  .howto-toggle .ht-chev{ margin-left:auto; font-size:15px; color:var(--muted); transition:transform .25s var(--ease); }
  .howto[data-open="false"] .ht-chev{ transform:rotate(-90deg); }
  .howto-body{ padding:0 22px 22px; }
  .howto[data-open="false"] .howto-body{ display:none; }
  .ht-cols{ display:grid; grid-template-columns:1fr 1fr; gap:16px; }
  .ht-way{ background:var(--card); border:1px solid var(--line); border-radius:14px; padding:18px 20px; box-shadow:0 1px 2px rgba(18,26,51,.04); position:relative; overflow:hidden; }
  .ht-way::before{ content:""; position:absolute; inset:0 auto 0 0; width:3px; background:var(--grad-brand); opacity:.75; }
  .ht-tag{ display:inline-block; font-size:12px; font-weight:800; padding:4px 13px; border-radius:999px; margin-bottom:10px; letter-spacing:.02em; }
  .ht-tag.ht-a{ background:linear-gradient(135deg,#dbeafe,#e0e7ff); color:#1d4ed8; } .ht-tag.ht-b{ background:linear-gradient(135deg,#dcfce7,#d1fae5); color:#15803d; }
  .ht-way ol{ margin:0; padding-left:20px; } .ht-way li{ font-size:13.5px; margin-bottom:8px; line-height:1.7; } .ht-way li:last-child{ margin-bottom:0; }
  .ht-way code,.ht-note code{ background:rgba(99,102,241,.12); color:var(--brand); padding:1px 6px; border-radius:6px; font:12px ui-monospace,Menlo,Consolas,monospace; }
  .ht-note{ font-size:12.5px; color:var(--muted); margin:14px 0 0; line-height:1.75; }
  @media (max-width:640px){ .ht-cols{ grid-template-columns:1fr; } .howto-toggle .ht-hint{ display:none; } }

  /* --- ランダムピックアップ（横スクロール） --- */
  .showcase{ margin-bottom:34px; animation:fadeUp .55s var(--ease) both; }
  .sc-head{ display:flex; align-items:center; gap:12px; margin-bottom:14px; flex-wrap:wrap; }
  .sc-head h2{ font-size:18px; font-weight:800; margin:0; letter-spacing:.01em; }
  .sc-sub{ font-size:12px; color:var(--muted); }
  .sc-shuffle{ margin-left:auto; border:1px solid var(--line); background:var(--card); color:var(--brand); font-weight:700; font-size:13px; padding:8px 17px; border-radius:999px; cursor:pointer; box-shadow:0 1px 2px rgba(18,26,51,.05); transition:background .2s, color .2s, transform .15s var(--ease), box-shadow .2s, border-color .2s; }
  .sc-shuffle:hover{ background:var(--grad-brand); color:#fff; border-color:transparent; transform:translateY(-1px); box-shadow:0 8px 20px -8px rgba(79,70,229,.55); }
  .sc-row{ display:flex; gap:14px; overflow-x:auto; padding:6px 2px 16px; scroll-behavior:auto; -webkit-overflow-scrolling:touch; scrollbar-width:thin; }
  .sc-row::-webkit-scrollbar{ height:8px; } .sc-row::-webkit-scrollbar-thumb{ background:#c6cddf; border-radius:999px; } .sc-row::-webkit-scrollbar-track{ background:transparent; }
  .scard{ flex:0 0 auto; width:230px; border:1px solid var(--line); border-radius:14px; overflow:hidden; background:var(--card); cursor:pointer; padding:0; text-align:left; box-shadow:var(--shadow-1); transition:transform .25s var(--ease), box-shadow .25s var(--ease), border-color .2s; }
  .scard:hover{ transform:translateY(-4px); box-shadow:0 2px 4px rgba(18,26,51,.05), 0 22px 40px -16px rgba(79,70,229,.35); border-color:rgba(99,102,241,.4); }
  .scard .sframe{ width:230px; height:158px; overflow:hidden; border-bottom:1px solid var(--line); background:#fff; }
  .scard .sframe iframe{ width:1280px; height:882px; border:0; transform:scale(0.1797); transform-origin:top left; pointer-events:none; }
  .scard .scap{ padding:10px 12px 12px; }
  .scard .scap h4{ font-size:12.5px; font-weight:700; margin:6px 0 0; line-height:1.45; overflow:hidden; display:-webkit-box; -webkit-line-clamp:2; line-clamp:2; -webkit-box-orient:vertical; min-height:2.5em; }
  :root[data-theme="dark"] .scard .sframe{ background:#0b1220; }

  /* --- カードキャプション / バッジ --- */
  figcaption{ padding:16px 18px 18px; }
  .badge{ display:inline-block; font-size:11px; font-weight:800; letter-spacing:.04em; padding:4px 11px; border-radius:999px; background:#e8ecf5; color:#3c4660; box-shadow:inset 0 0 0 1px rgba(255,255,255,.55); }
  .badge-landing{ background:linear-gradient(135deg,#dbeafe,#e0e7ff); color:#1e40af; } .badge-form{ background:linear-gradient(135deg,#dcfce7,#d1fae5); color:#15803d; }
  .badge-event{ background:linear-gradient(135deg,#ffedd5,#fef3c7); color:#c2410c; } .badge-thankyou{ background:linear-gradient(135deg,#f3e8ff,#fae8ff); color:#7e22ce; }
  .badge-utility{ background:linear-gradient(135deg,#e0f2fe,#cffafe); color:#0369a1; }
  figcaption h3{ font-size:15px; margin:11px 0 6px; line-height:1.45; font-weight:800; letter-spacing:.005em; }
  figcaption p{ font-size:13px; color:var(--muted); margin:0 0 12px; line-height:1.65; min-height:2.6em; display:-webkit-box; -webkit-line-clamp:2; line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
  .meta{ display:flex; align-items:center; justify-content:space-between; gap:8px; font-size:12px; }
  .meta code{ background:#f1f4fa; padding:3px 8px; border-radius:6px; color:#525e7a; font-family:ui-monospace,Menlo,Consolas,monospace; font-size:11px; }
  .acts{ display:flex; gap:11px; align-items:center; }
  .acts button{ border:0; background:none; color:var(--brand); font-weight:700; cursor:pointer; font-size:12px; padding:0; transition:color .15s; }
  .acts button:hover{ color:var(--brand2); }
  .acts a{ text-decoration:none; font-weight:600; }
  .lnk{ border:0; background:none; color:var(--brand); font-weight:700; cursor:pointer; font-size:12px; padding:0; transition:color .15s; }
  .lnk:hover{ color:var(--brand2); }
  .empty{ text-align:center; color:var(--muted); padding:70px 20px; display:none; border:2px dashed var(--line); border-radius:18px; font-size:14px; }
  footer{ text-align:center; color:var(--muted); font-size:12px; padding:30px 24px 36px; letter-spacing:.06em; }
  .toast{ position:fixed; bottom:22px; left:50%; transform:translateX(-50%) translateY(20px); background:rgba(9,13,31,.92); color:#fff; padding:13px 22px; border-radius:13px; font-size:14px; font-weight:600; border:1px solid rgba(255,255,255,.14); box-shadow:0 18px 40px -10px rgba(7,11,29,.55); backdrop-filter:blur(8px); opacity:0; transition:opacity .3s, transform .35s var(--ease); z-index:50; }
  .toast.show{ opacity:1; transform:translateX(-50%) translateY(0); }
  @media (max-width:520px){
    .grid{ grid-template-columns:1fr; gap:16px; }
    .frame{ height:auto; aspect-ratio:1280/882; }
    .frame iframe{ transform:scale(calc((100vw - 50px)/1280)); }
    /* スマホでの密度切替：コンパクト=2列で一覧、大きく=1列のまま */
    body[data-density="compact"] .grid{ grid-template-columns:1fr 1fr; gap:10px; }
    body[data-density="compact"] .frame iframe{ transform:scale(calc((50vw - 30px)/1280)); }
    body[data-density="compact"] figcaption{ padding:10px 11px 12px; }
    body[data-density="compact"] figcaption h3{ font-size:13px; margin:8px 0 4px; }
    body[data-density="compact"] figcaption p{ display:none; }
    body[data-density="compact"] .meta .acts{ display:none; }
  }
  /* --- テーマトグル --- */
  .theme-btn{ position:absolute; top:18px; right:24px; background:rgba(255,255,255,.09); border:1px solid rgba(255,255,255,.25); color:#fff; width:40px; height:40px; border-radius:50%; cursor:pointer; font-size:17px; backdrop-filter:blur(6px); transition:transform .25s var(--ease), background .2s, box-shadow .2s; }
  .theme-btn:hover{ background:rgba(255,255,255,.18); transform:rotate(-14deg) scale(1.06); box-shadow:0 6px 18px rgba(0,0,0,.3); }
  /* --- モーダル(ライトボックス) --- */
  .modal[hidden]{ display:none; }
  .modal{ position:fixed; inset:0; z-index:100; display:flex; align-items:center; justify-content:center; padding:24px; }
  .modal-bg{ position:absolute; inset:0; background:rgba(4,7,20,.7); backdrop-filter:blur(6px); animation:fadeIn .25s ease both; }
  .modal-box{ position:relative; width:min(1000px,96vw); height:min(86vh,860px); background:var(--card); border-radius:20px; overflow:hidden; display:flex; flex-direction:column; box-shadow:0 40px 100px -20px rgba(2,6,23,.7), 0 0 0 1px rgba(255,255,255,.08); animation:popIn .35s var(--ease) both; }
  .modal-head{ display:flex; align-items:center; gap:10px; padding:12px 16px; border-bottom:1px solid var(--line); flex-wrap:wrap; background:linear-gradient(180deg,rgba(99,102,241,.05),transparent); }
  .modal-head strong{ font-size:14px; flex:1; min-width:120px; letter-spacing:.01em; }
  .modal-tabs button,.modal-dev button{ border:1px solid var(--line); background:transparent; color:var(--ink); padding:6px 13px; border-radius:9px; font-size:12px; font-weight:600; cursor:pointer; transition:background .15s, color .15s, border-color .15s; }
  .modal-tabs button:hover,.modal-dev button:hover{ border-color:var(--brand); color:var(--brand); }
  .modal-tabs button.active,.modal-dev button.active{ background:var(--grad-brand); color:#fff; border-color:transparent; box-shadow:0 4px 12px -4px rgba(79,70,229,.5); }
  .modal-x{ border:1px solid var(--line); background:#fff; width:34px; height:34px; border-radius:50%; font-size:17px; line-height:1; cursor:pointer; color:#3c4660; display:flex; align-items:center; justify-content:center; flex:0 0 auto; transition:background .15s, color .15s, border-color .15s, transform .25s var(--ease); }
  .modal-x:hover{ background:#ef4444; color:#fff; border-color:#ef4444; transform:rotate(90deg); }
  :root[data-theme="dark"] .modal-x{ background:#1a2440; color:#e2e8f0; border-color:#2a3756; }
  .modal-nav{ border:1px solid var(--line); background:#fff; color:var(--ink); width:30px; height:30px; border-radius:9px; cursor:pointer; font-size:18px; line-height:1; flex:0 0 auto; transition:background .15s, color .15s, border-color .15s; }
  .modal-nav:hover{ background:var(--brand); color:#fff; border-color:var(--brand); }
  .modal-pos{ font-size:12px; color:var(--muted); flex:0 0 auto; font-variant-numeric:tabular-nums; }
  .modal-act{ border:1px solid var(--line); background:#fff; color:var(--ink); padding:6px 13px; border-radius:9px; font-size:12px; font-weight:700; cursor:pointer; flex:0 0 auto; transition:background .15s, color .15s, border-color .15s; }
  .modal-act:hover{ background:#eef2ff; border-color:#b9c2f5; }
  .modal-act.on{ background:var(--grad-brand); color:#fff; border-color:transparent; }
  :root[data-theme="dark"] .modal-act{ background:#1a2440; color:#cbd5e1; border-color:#2a3756; }
  :root[data-theme="dark"] .modal-nav{ background:#1a2440; color:#cbd5e1; border-color:#2a3756; }
  .modal-body{ flex:1; overflow:auto; background:#eef1f8; }
  .m-preview{ height:100%; display:flex; justify-content:center; }
  .m-preview[hidden]{ display:none; }
  .m-preview iframe{ width:100%; height:100%; border:0; background:#fff; }
  .m-preview.mobile{ padding:20px 0; align-items:flex-start; }
  .m-preview.mobile iframe{ width:390px; max-width:100%; border:10px solid #0b1220; border-radius:36px; box-shadow:0 24px 60px -12px rgba(2,6,23,.5), 0 0 0 1px rgba(255,255,255,.1); }
  .m-code{ height:100%; display:flex; flex-direction:column; background:#0a0f23; }
  .m-code[hidden]{ display:none; }
  .m-code-bar{ padding:10px 14px; display:flex; gap:8px; }
  .m-code-bar button{ border:1px solid rgba(255,255,255,.12); background:#27314f; color:#fff; padding:7px 15px; border-radius:9px; font-size:12px; cursor:pointer; font-weight:700; transition:background .15s; }
  .m-code-bar button:hover{ background:#36436b; }
  .m-code pre{ margin:0; padding:0 16px 16px; overflow:auto; flex:1; }
  .m-code code{ color:#dbe3f5; font:12px/1.65 ui-monospace,Menlo,Consolas,monospace; white-space:pre-wrap; word-break:break-word; }
  /* --- ダークモード --- */
  :root[data-theme="dark"]{ --ink:#e4e9f7; --muted:#94a0bd; --line:#222e4d; --bg:#070b16; --card:#0e1528; --shadow-1:0 1px 2px rgba(0,0,0,.3), 0 10px 28px -16px rgba(0,0,0,.6); --shadow-2:0 2px 4px rgba(0,0,0,.35), 0 30px 60px -22px rgba(99,102,241,.4); }
  :root[data-theme="dark"] body{
    background:
      radial-gradient(1100px 520px at 85% -8%, rgba(99,102,241,.12), transparent 60%),
      radial-gradient(900px 480px at -10% 12%, rgba(6,182,212,.08), transparent 60%),
      var(--bg);
  }
  :root[data-theme="dark"] .toolbar{ background:rgba(10,15,31,.78); border-bottom-color:#1b2542; box-shadow:0 8px 28px -16px rgba(0,0,0,.7); }
  :root[data-theme="dark"] .search input,
  :root[data-theme="dark"] .fbtn{ background:#101a33; color:#cbd5ec; border-color:#26334f; }
  :root[data-theme="dark"] .search input:focus{ border-color:#818cf8; box-shadow:0 0 0 4px rgba(99,102,241,.22); }
  :root[data-theme="dark"] .fbtn:hover{ border-color:#4655a8; }
  :root[data-theme="dark"] .fbtn span{ background:#1c2848; color:#a5b4fc; }
  :root[data-theme="dark"] .fbtn.active{ background:var(--grad-brand); color:#fff; border-color:transparent; }
  :root[data-theme="dark"] .fbtn.active span{ background:rgba(255,255,255,.22); color:#fff; }
  :root[data-theme="dark"] .card{ background:var(--card); }
  :root[data-theme="dark"] .frame{ background:#0b1220; border-bottom-color:#1b2542; }
  :root[data-theme="dark"] .meta code{ background:#1a2440; color:#b6c2dd; }
  :root[data-theme="dark"] .modal-body{ background:#070b16; }
  :root[data-theme="dark"] .modal-head{ background:linear-gradient(180deg,rgba(99,102,241,.08),transparent); }
  :root[data-theme="dark"] .modal-act:hover{ background:#26334f; border-color:#4655a8; }
  :root[data-theme="dark"] .pick span{ background:rgba(16,24,44,.92); border-color:#36436b; }
  :root[data-theme="dark"] .badge{ background:#1c2848; color:#b6c2dd; box-shadow:inset 0 0 0 1px rgba(255,255,255,.06); }
  :root[data-theme="dark"] .badge-landing{ background:rgba(37,99,235,.18); color:#8db4fe; }
  :root[data-theme="dark"] .badge-form{ background:rgba(22,163,74,.18); color:#6ee7a0; }
  :root[data-theme="dark"] .badge-event{ background:rgba(234,88,12,.2); color:#fcae77; }
  :root[data-theme="dark"] .badge-thankyou{ background:rgba(147,51,234,.2); color:#d3a4fc; }
  :root[data-theme="dark"] .badge-utility{ background:rgba(2,132,199,.2); color:#7dd0fc; }
  :root[data-theme="dark"] .ht-tag.ht-a{ background:rgba(37,99,235,.18); color:#8db4fe; }
  :root[data-theme="dark"] .ht-tag.ht-b{ background:rgba(22,163,74,.18); color:#6ee7a0; }
  :root[data-theme="dark"] .ht-way{ box-shadow:none; }
  :root[data-theme="dark"] .group-title span{ background:#1c2848; color:#94a0bd; }
  :root[data-theme="dark"] .empty{ border-color:#222e4d; }
  :root[data-theme="dark"] .m-preview.mobile iframe{ border-color:#1c2848; }
  :root[data-theme="dark"] .sc-row::-webkit-scrollbar-thumb{ background:#2c3a5e; }
  :root[data-theme="dark"] ::-webkit-scrollbar-thumb{ background:#2c3a5e; border:3px solid transparent; background-clip:content-box; }
  /* --- トップへ戻る --- */
  .totop{ position:fixed; right:22px; bottom:22px; z-index:40; width:48px; height:48px; border-radius:50%; border:0; background:var(--grad-brand); color:#fff; font-size:20px; cursor:pointer; box-shadow:0 10px 28px -6px rgba(79,70,229,.6); opacity:0; pointer-events:none; transition:opacity .25s, transform .25s var(--ease), box-shadow .2s; transform:translateY(10px); }
  .totop.show{ opacity:1; pointer-events:auto; transform:translateY(0); }
  .totop:hover{ transform:translateY(-2px) scale(1.05); box-shadow:0 14px 34px -6px rgba(79,70,229,.7); }
  /* --- 表示サイズ切替（密度） --- */
  .density{ display:inline-flex; gap:3px; background:#fff; border:1px solid var(--line); border-radius:11px; padding:3px; box-shadow:inset 0 1px 2px rgba(18,26,51,.05); }
  .density button{ border:0; background:none; color:#6b7591; width:34px; height:30px; border-radius:8px; cursor:pointer; font-size:13px; line-height:1; display:flex; align-items:center; justify-content:center; transition:background .15s, color .15s; }
  .density button:hover{ background:#eef2ff; color:var(--brand); }
  .density button.on{ background:var(--grad-brand); color:#fff; box-shadow:0 2px 8px -2px rgba(79,70,229,.5); }
  :root[data-theme="dark"] .density{ background:#101a33; border-color:#26334f; }
  :root[data-theme="dark"] .density button:hover{ background:#1c2848; color:#a5b4fc; }
  /* --- 密度モード（PC のみ・モバイルは上の media query を優先） --- */
  @media (min-width:521px){
    body[data-density="cozy"] .grid{ grid-template-columns:repeat(auto-fill,minmax(520px,1fr)); gap:26px; }
    body[data-density="cozy"] .frame{ height:352px; }
    body[data-density="cozy"] .frame iframe{ transform:scale(0.4); }
    body[data-density="compact"] .grid{ grid-template-columns:repeat(auto-fill,minmax(310px,1fr)); gap:16px; }
    body[data-density="compact"] .frame{ height:214px; }
    body[data-density="compact"] .frame iframe{ transform:scale(0.2422); }
    body[data-density="compact"] figcaption{ padding:12px 13px 14px; }
    body[data-density="compact"] figcaption p{ display:none; }
  }
  /* --- スマホ向けの崩れ対策（バーの重なり防止・全画面モーダル・ヘッダ整理） --- */
  @media (max-width:640px){
    .toolbar{ position:static; }
    .actionbar{ position:static; top:auto; }
    .toolbar .in{ padding:10px 14px; gap:8px; }
    .actionbar .in{ padding:9px 14px; gap:8px; }
    .actionbar .spacer{ display:none; flex:0; }
    .wrap{ padding:18px 24px 72px; }
    .hero{ padding:40px 18px 34px; }
    .hero h1{ font-size:21px; }
    .theme-btn{ top:14px; right:16px; width:36px; height:36px; }
  }
  @media (max-width:520px){
    .modal{ padding:0; }
    .modal-bg{ display:none; }
    .modal-box{ width:100vw; height:100vh; height:100dvh; max-width:none; border-radius:0; box-shadow:none; }
    .modal-head{ gap:6px; padding:10px 12px; }
    .modal-head strong{ order:-1; flex:0 0 100%; width:100%; min-width:0; font-size:13px; line-height:1.4; white-space:normal; overflow-wrap:anywhere; }
    .modal-pos{ display:none; }
    .modal-tabs button,.modal-dev button,.modal-act{ padding:7px 9px; font-size:11px; }
    .modal-nav{ width:32px; height:32px; }
    .modal-x{ margin-left:auto; }
  }
  /* --- モーション低減設定の尊重 --- */
  @media (prefers-reduced-motion:reduce){
    *,*::before,*::after{ animation-duration:.01ms !important; animation-iteration-count:1 !important; transition-duration:.01ms !important; }
    html{ scroll-behavior:auto; }
  }
</style>
</head>
<body>
<header class="hero"><div class="in">
  <button class="theme-btn" id="themeBtn" title="ライト/ダーク切替">🌙</button>
  <h1>Account Engagement レイアウトテンプレート ギャラリー</h1>
  <p>Account Engagement (Pardot) 向けのレスポンシブなレイアウトテンプレート集（全 ${items.length} パターン）。気に入ったテンプレをコピー＆貼り付け、または選択して API で一括登録できます。</p>
  <div class="chips"><span class="chip">クリックで拡大プレビュー</span><span class="chip">チェックで選択</span><span class="chip">%%content%% 差込済みのサンプル表示</span></div>
</div></header>

<div class="toolbar"><div class="in">
  <div class="search"><input id="q" type="search" placeholder="名称・用途・カテゴリで検索..."></div>
  <div class="filters">${filterBtns}</div>
  <div class="density" id="density" title="表示サイズの切替">
    <button data-d="cozy" aria-label="大きく表示">▦</button>
    <button data-d="standard" class="on" aria-label="標準表示">▥</button>
    <button data-d="compact" aria-label="小さく一覧表示">▤</button>
  </div>
  <span class="rescount" id="rescount"></span>
</div></div>

<div class="actionbar"><div class="in">
  <label style="display:flex;gap:7px;align-items:center;font-size:13px;cursor:pointer;"><input type="checkbox" id="selAll"> 表示中をすべて選択</label>
  <span class="cnt"><b id="selCount">0</b> 件を選択中</span>
  <span class="spacer"></span>
  <button class="abtn ghost" id="clearSel">選択解除</button>
  <button class="abtn primary" id="dlSel" disabled>⬇ 選択をZIP</button>
  <button class="abtn ghost" id="dlAll">⬇ 全てZIP</button>
  <button class="abtn green" id="dlInstaller" disabled>⚙ インストーラ生成</button>
</div></div>

<div class="wrap">
  <section class="howto" id="howto">
    <button class="howto-toggle" id="howtoToggle" type="button" aria-expanded="true">
      <span class="ht-ttl">📘 Account Engagement での使い方</span>
      <span class="ht-hint">テンプレートをコピーして貼るだけ、またはAPIで一括登録</span>
      <span class="ht-chev" id="htChev">▾</span>
    </button>
    <div class="howto-body" id="howtoBody">
      <div class="ht-cols">
        <div class="ht-way">
          <div class="ht-tag ht-a">かんたん · 1つだけ使う</div>
          <ol>
            <li>気になるテンプレを<strong>クリックして拡大</strong>。PC／スマホ表示も確認できます</li>
            <li>「<strong>&lt;/&gt; コード</strong>」タブで <strong>📋 コピー</strong>（または <strong>⬇ HTML</strong> で保存）</li>
            <li>AEの「コンテンツ → <strong>レイアウトテンプレート → ＋新規</strong>」に貼り付けて保存</li>
          </ol>
        </div>
        <div class="ht-way">
          <div class="ht-tag ht-b">まとめて · API一括登録</div>
          <ol>
            <li>使うテンプレを<strong>チェックで選択</strong>（複数可・選択は保存されます）</li>
            <li>「<strong>⚙ インストーラ生成</strong>」で ZIP をダウンロード</li>
            <li>同梱の手順に従い <code>config.json</code> を設定し <code>node install.mjs</code> を実行</li>
          </ol>
        </div>
      </div>
      <p class="ht-note">💡 本文の差込位置は <code>%%content%%</code>。AEのフォームやコンテンツがそこに入ります。<code>%%title%%</code> / <code>%%description%%</code> も利用できます。</p>
    </div>
  </section>
  <section class="showcase" id="showcase">
    <div class="sc-head">
      <h2>🔀 ランダムピックアップ</h2>
      <span class="sc-sub">横スクロールで眺める · クリックで拡大</span>
      <button class="sc-shuffle" id="scShuffle" type="button">🔀 シャッフル</button>
    </div>
    <div class="sc-row" id="scRow"></div>
  </section>
${sections}  <div class="empty" id="empty">該当するテンプレートがありません。</div>
</div>
<footer>Account Engagement Layout Templates · ${items.length} patterns</footer>

<div class="modal" id="modal" hidden>
  <div class="modal-bg" data-close></div>
  <div class="modal-box">
    <div class="modal-head">
      <button class="modal-nav" data-nav="-1" title="前のテンプレート (←)">‹</button>
      <strong id="m-title"></strong>
      <span class="modal-pos" id="m-pos"></span>
      <button class="modal-nav" data-nav="1" title="次のテンプレート (→)">›</button>
      <div class="modal-tabs"><button data-view="preview" class="active">プレビュー</button><button data-view="code">&lt;/&gt; コード</button></div>
      <div class="modal-dev"><button data-dev="desktop" class="active">🖥 PC</button><button data-dev="mobile">📱 SP</button></div>
      <button class="modal-act" id="m-pick" title="選択に追加/解除">＋ 選択</button>
      <button class="modal-act" id="m-dlhead" title="このHTMLをダウンロード">⬇ HTML</button>
      <button class="modal-x" data-close title="閉じる">✕</button>
    </div>
    <div class="modal-body">
      <div class="m-preview"><iframe id="m-frame" title="preview"></iframe></div>
      <div class="m-code" hidden>
        <div class="m-code-bar"><button id="m-copy">📋 コピー</button><button id="m-dl">⬇ HTML</button></div>
        <pre><code id="m-code-text"></code></pre>
      </div>
    </div>
  </div>
</div>

<button class="totop" id="toTop" title="トップへ戻る">↑</button>
<div class="toast" id="toast"></div>

<script>
const G = window.__GALLERY__ || {templates:[],installer:{},installerReadme:""};
const byDir = Object.fromEntries(G.templates.map(t => [t.dir, t]));
const CAT_LABEL = ${JSON.stringify(CATEGORY_LABEL)};
const sel = new Set();
const $ = (s,r=document)=>r.querySelector(s);
const $$ = (s,r=document)=>[...r.querySelectorAll(s)];

function toast(msg){ const t=$("#toast"); t.textContent=msg; t.classList.add("show"); clearTimeout(t._t); t._t=setTimeout(()=>t.classList.remove("show"),2200); }
function saveBlob(blob,name){ const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href),4000); }

function updateCount(){
  $("#selCount").textContent = sel.size;
  $("#dlSel").disabled = sel.size===0;
  $("#dlInstaller").disabled = sel.size===0;
  $$(".card").forEach(c=> c.classList.toggle("sel", sel.has(c.dataset.dir)));
}
function applyFilter(){
  const f = $(".fbtn.active").dataset.f;
  const q = $("#q").value.trim().toLowerCase();
  $$(".card").forEach(c=>{
    const okCat = f==="all" || c.dataset.cat===f;
    const okQ = !q || c.dataset.search.includes(q);
    c.classList.toggle("hide", !(okCat&&okQ));
  });
  let anyVisible=false;
  const filtering = !!q || f!=="all";
  $$(".group").forEach(g=>{
    const total=$$(".card",g).length, vis=$$(".card:not(.hide)",g).length;
    g.classList.toggle("hide",vis===0); if(vis>0)anyVisible=true;
    const sp=$(".group-title span",g); if(sp) sp.textContent = filtering ? (vis+" / "+total) : total;
  });
  $("#empty").style.display = anyVisible?"none":"block";
  const rc=$("#rescount"); if(rc){ rc.textContent = $$(".card:not(.hide)").length + " 件表示"; }
  $("#selAll").checked=false;
}
async function buildZip(dirs, withInstaller){
  if(typeof JSZip==="undefined"){ toast("ZIPライブラリの読込に失敗しました"); return; }
  const zip = new JSZip();
  dirs.forEach(d=>{ const t=byDir[d]; if(!t) return; const fo=zip.folder("templates/"+d); fo.file("layout.html",t.layout); fo.file("meta.json",JSON.stringify(t.meta,null,2)); });
  if(withInstaller){
    Object.entries(G.installer||{}).forEach(([n,c])=> zip.file(n,c));
    if(G.installerReadme) zip.file("README.md", G.installerReadme);
  }
  const blob = await zip.generateAsync({type:"blob"});
  saveBlob(blob, withInstaller?"ae-installer.zip":"ae-templates.zip");
  toast((withInstaller?"インストーラ":"テンプレ")+" "+dirs.length+"件をダウンロードしました");
}

document.addEventListener("change", e=>{
  if(e.target.classList.contains("cb")){ const d=e.target.dataset.dir; e.target.checked?sel.add(d):sel.delete(d); updateCount(); }
});
$("#q").addEventListener("input", applyFilter);
$$(".fbtn").forEach(b=> b.addEventListener("click", ()=>{ $$(".fbtn").forEach(x=>x.classList.remove("active")); b.classList.add("active"); applyFilter(); }));
$("#selAll").addEventListener("change", e=>{
  $$(".card:not(.hide) .cb").forEach(cb=>{ cb.checked=e.target.checked; const d=cb.dataset.dir; e.target.checked?sel.add(d):sel.delete(d); });
  updateCount();
});
$("#clearSel").addEventListener("click", ()=>{ sel.clear(); $$(".cb").forEach(cb=>cb.checked=false); $("#selAll").checked=false; updateCount(); });
$("#dlSel").addEventListener("click", ()=> buildZip([...sel], false));
$("#dlAll").addEventListener("click", ()=> buildZip(G.templates.map(t=>t.dir), false));
$("#dlInstaller").addEventListener("click", ()=> buildZip([...sel], true));
document.addEventListener("click", e=>{
  const b=e.target.closest(".dl-one"); if(!b) return;
  const t=byDir[b.dataset.dir]; if(!t) return;
  saveBlob(new Blob([t.layout],{type:"text/html"}), b.dataset.dir+".html");
  toast(b.dataset.dir+".html をダウンロードしました");
});

// --- localStorage 選択保持 ---
function saveSel(){ try{ localStorage.setItem("ae-sel", JSON.stringify([...sel])); }catch{} }
function restoreSel(){ try{ JSON.parse(localStorage.getItem("ae-sel")||"[]").forEach(d=>{ const cb=document.querySelector('.cb[data-dir="'+d+'"]'); if(cb){ cb.checked=true; sel.add(d);} }); }catch{} }
document.addEventListener("change", e=>{ if(e.target.classList.contains("cb")) saveSel(); });

// --- ダークモード ---
const themeBtn=$("#themeBtn");
function setTheme(t){ document.documentElement.setAttribute("data-theme",t); themeBtn.textContent=t==="dark"?"☀️":"🌙"; try{localStorage.setItem("ae-theme",t);}catch{} }
setTheme(localStorage.getItem("ae-theme")||"light");
themeBtn.addEventListener("click",()=> setTheme(document.documentElement.getAttribute("data-theme")==="dark"?"light":"dark"));

// --- モーダル(ライトボックス) ---
const modal=$("#modal"), mFrame=$("#m-frame"), mTitle=$("#m-title"), mCodeText=$("#m-code-text");
let curDir=null;
function setView(v){ $$("[data-view]").forEach(b=>b.classList.toggle("active",b.dataset.view===v)); $(".m-preview").hidden=(v!=="preview"); $(".m-code").hidden=(v!=="code"); }
function setDev(d){ $$("[data-dev]").forEach(b=>b.classList.toggle("active",b.dataset.dev===d)); $(".m-preview").classList.toggle("mobile",d==="mobile"); }
const mPos=$("#m-pos");
function visibleDirs(){ return $$(".card:not(.hide)").map(c=>c.dataset.dir); }
const mPick=$("#m-pick");
function refreshPick(){ const on=sel.has(curDir); mPick.classList.toggle("on",on); mPick.textContent = on ? "✓ 選択中" : "＋ 選択"; }
function openModal(dir,view){ const t=byDir[dir]; if(!t) return; curDir=dir; mTitle.textContent=t.name; mFrame.src=dir+".html"; mCodeText.textContent=t.layout; modal.hidden=false; setView(view||"preview"); setDev("desktop"); const list=visibleDirs(); const i=list.indexOf(dir); mPos.textContent = i>=0 ? (i+1)+" / "+list.length : ""; refreshPick(); }
function closeModal(){ modal.hidden=true; mFrame.src="about:blank"; }
function navModal(delta){ if(modal.hidden) return; const list=visibleDirs(); if(!list.length) return; let i=list.indexOf(curDir); if(i<0) i=0; const ni=(i+delta+list.length)%list.length; openModal(list[ni], $(".m-code").hidden?"preview":"code"); }
(function initHowto(){
  const ht=$("#howto"), btn=$("#howtoToggle"); if(!ht||!btn) return;
  let open=true; try{ open = localStorage.getItem("ae-howto") !== "0"; }catch(e){}
  function apply(){ ht.dataset.open=open?"true":"false"; btn.setAttribute("aria-expanded", open?"true":"false"); }
  apply();
  btn.addEventListener("click", ()=>{ open=!open; apply(); try{ localStorage.setItem("ae-howto", open?"1":"0"); }catch(e){} });
})();
function shuffleArr(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); const t=a[i]; a[i]=a[j]; a[j]=t; } return a; }
const scRowEl=$("#scRow");
let scPos=0, scHover=false, scInteractUntil=0;
const scReduce = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
function makeScard(t, dup){
  const b=document.createElement("button"); b.type="button"; b.className="scard"; b.dataset.open=t.dir; b.title=t.name+"（クリックで拡大）";
  if(dup){ b.setAttribute("aria-hidden","true"); b.tabIndex=-1; }
  const fr=document.createElement("div"); fr.className="sframe";
  const ifr=document.createElement("iframe"); ifr.src=t.dir+".html"; ifr.loading="lazy"; ifr.tabIndex=-1; ifr.setAttribute("title", t.name);
  fr.appendChild(ifr);
  const cap=document.createElement("div"); cap.className="scap";
  const bd=document.createElement("span"); bd.className="badge badge-"+t.category; bd.textContent=(CAT_LABEL[t.category]||t.category);
  const h=document.createElement("h4"); h.textContent=t.name;
  cap.appendChild(bd); cap.appendChild(h);
  b.appendChild(fr); b.appendChild(cap);
  return b;
}
function renderShowcase(){
  if(!scRowEl) return;
  const picks=shuffleArr(G.templates.slice()).slice(0, Math.min(10, G.templates.length));
  scRowEl.textContent="";
  picks.forEach(t=> scRowEl.appendChild(makeScard(t,false)));
  // 同じ並びをもう一周分だけ複製 → 端で途切れずシームレスに流れる
  picks.forEach(t=> scRowEl.appendChild(makeScard(t,true)));
  scPos=0; scRowEl.scrollLeft=0;
}
function scTick(){
  if(scRowEl){
    const half=scRowEl.scrollWidth/2;
    const interacting = scHover || (Date.now() < scInteractUntil);
    if(!interacting && half>4){
      scPos += 0.6;                       // 流れる速度（px/フレーム ≒ 36px/秒）
      if(scPos>=half) scPos-=half;        // 複製ぶんでループ（ジャンプなし）
      scRowEl.scrollLeft=scPos;
    } else {
      scPos=scRowEl.scrollLeft;           // 手動スクロール中は位置を同期
    }
  }
  requestAnimationFrame(scTick);
}
if(scRowEl){
  scRowEl.addEventListener("mouseenter", ()=>{ scHover=true; });
  scRowEl.addEventListener("mouseleave", ()=>{ scHover=false; });
  scRowEl.addEventListener("focusin", ()=>{ scHover=true; });
  scRowEl.addEventListener("focusout", ()=>{ scHover=false; });
  ["wheel","touchstart","pointerdown"].forEach(ev=> scRowEl.addEventListener(ev, ()=>{ scInteractUntil=Date.now()+2500; }, {passive:true}));
  if(!scReduce) requestAnimationFrame(scTick);
  // 一定時間ごとに自動で中身を入れ替え（操作中・ホバー中は見送り）
  setInterval(()=>{ if(!scHover && Date.now()>=scInteractUntil) renderShowcase(); }, 30000);
}
const scShuffleBtn=$("#scShuffle");
if(scShuffleBtn) scShuffleBtn.addEventListener("click", ()=>{ renderShowcase(); });
renderShowcase();
document.addEventListener("click", e=>{
  const nv=e.target.closest("[data-nav]"); if(nv){ navModal(parseInt(nv.dataset.nav,10)); return; }
  const op=e.target.closest("[data-open]"); if(op){ openModal(op.dataset.open,"preview"); return; }
  const co=e.target.closest(".code-one"); if(co){ openModal(co.dataset.dir,"code"); return; }
  if(e.target.closest("[data-close]")){ closeModal(); return; }
  const v=e.target.closest("[data-view]"); if(v){ setView(v.dataset.view); return; }
  const dv=e.target.closest("[data-dev]"); if(dv){ setDev(dv.dataset.dev); return; }
});
document.addEventListener("keydown", e=>{
  if(modal.hidden) return;
  if(e.key==="Escape"){ closeModal(); }
  else if(e.key==="ArrowRight"){ navModal(1); }
  else if(e.key==="ArrowLeft"){ navModal(-1); }
});
$("#m-copy").addEventListener("click", async()=>{ try{ await navigator.clipboard.writeText(byDir[curDir].layout); toast("HTMLをコピーしました"); }catch{ toast("コピーに失敗しました"); } });
$("#m-dl").addEventListener("click", ()=>{ const t=byDir[curDir]; if(t){ saveBlob(new Blob([t.layout],{type:"text/html"}), curDir+".html"); } });
$("#m-dlhead").addEventListener("click", ()=>{ const t=byDir[curDir]; if(t){ saveBlob(new Blob([t.layout],{type:"text/html"}), curDir+".html"); toast(curDir+".html をダウンロードしました"); } });
mPick.addEventListener("click", ()=>{
  if(!curDir) return;
  if(sel.has(curDir)) sel.delete(curDir); else sel.add(curDir);
  const cb=document.querySelector('.cb[data-dir="'+curDir+'"]'); if(cb) cb.checked=sel.has(curDir);
  updateCount(); saveSel(); refreshPick();
});

// --- 表示サイズ（密度）切替 ---
function setDensity(d){ document.body.setAttribute("data-density",d); $$("#density button").forEach(b=>b.classList.toggle("on",b.dataset.d===d)); try{localStorage.setItem("ae-density",d);}catch{} }
setDensity(localStorage.getItem("ae-density")||"standard");
$$("#density button").forEach(b=> b.addEventListener("click", ()=> setDensity(b.dataset.d)));

// --- トップへ戻る ---
const toTop=$("#toTop");
window.addEventListener("scroll", ()=> toTop.classList.toggle("show", window.scrollY>400));
toTop.addEventListener("click", ()=> window.scrollTo({top:0,behavior:"smooth"}));

restoreSel();
updateCount();
applyFilter();
</script>
</body>
</html>
`;

writeFileSync(join(OUT_DIR, "index.html"), indexHtml, "utf8");

console.log(`✓ プレビューを生成しました: ${items.length} 件`);
console.log(`  data.js + index.html を出力（DL/インストーラ機能つき）`);
for (const c of CATEGORY_ORDER) {
  const n = items.filter((i) => i.category === c).length;
  if (n) console.log(`  - ${CATEGORY_LABEL[c]}: ${n}`);
}
console.log(`\n▶ ギャラリーを開く: account-engagement/preview/index.html`);
