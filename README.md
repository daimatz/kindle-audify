# kindle-audify

Kindle をオーディオブック化するためのツール・アプリケーション群です。

# 使い方

以下の流れで書籍をオーディオブック化します。 1. のステップは最初に一度だけ必要です。

1. Google Cloud Platform 上に PDF 音声化サービスをデプロイ
2. ローカルマシンで書籍の内容を含む PDF ファイルを作成
3. Google Cloud Storage に PDF ファイルをアップロード

## 1. Google Cloud Platform 上に PDF 音声化サービスをデプロイ

このアプリケーションでは Google Cloud Platform の Cloud Vision API および Text-to-Speech API を使用します。そのため、 Google Cloud Platform 上に環境構築が必要です。

1. [Google Cloud Platform](https://cloud.google.com/) のアカウントを作成します。
2. [gcloud コマンドラインツール](https://cloud.google.com/sdk/gcloud) をインストールし、対象のアカウントで認証を済ませます。 `gcloud init`
3. Cloud Storage 上に作業用のバケットを作成します。バケット名は世界で一意である必要があります。 `gsutil mb gs://my-kindle-audify-bucket`
4. Cloud Console から [Cloud Build]() および [Cloud Functions]() の API を有効化します。
5. リポジトリ内の `config.yaml.template` を `config.yaml` にコピーします。 `cp config.yaml.template `config.yaml`
6. `config.yaml` を自分の環境に合うように編集します。ファイル内のコメントを参考にしてください。
7. Cloud Functions にアプリケーションをデプロイします。 `npm run deploy`

## 2. ローカルマシンで書籍の内容を含む PDF ファイルを作成

Kindle で表示している書籍のスクリーンショットをとります。そのスクリーンショットを**書籍の内容部分だけを抽出して**1つのPDFファイルにまとめます。

macOS では Automator を使って自動でページめくりとスクリーンショットの撮影ができます。
![Automator](https://raw.githubusercontent.com/daimatz/kindle-audify/master/automator.gif)

1. ローカルに [ImageMagick](https://imagemagick.org/) をインストールします。 `brew install imagemagick`
2. ホームディレクトリに `KindleScreenshot` というフォルダを作成します。 `mkdir -p ~/KindleScreenshot`
3. このリポジトリに含まれる `marker.html` を作成した `KindleScreenshot` フォルダにコピーします。 `cp /path/to/kindle-audify/marker.html ~/KindleScreenshot`
4. Kindle.app を開き、書籍の初めのほう (オーディオブック化したい最初のページ) を表示します。
5. このリポジトリの `KindleScreenshot.workflow` を開き、実行します。
6. ImageMagick のパスを尋ねられます。 `which magick` で出力されたファイルを含むフォルダを指定してください。
7. 書籍のタイトルを尋ねられるので、入力します。
8. Automator が Kindle アプリを自動で操作しながらスクリーンショットを撮影していきます。操作せずにお待ちください。
9. しばらく待つと最終ページに辿り着きますが、 **'End Screenshots' という通知が表示されるまで操作しないでください。** 'End Screenshots' という通知が表示された後は操作をしても大丈夫です。
11. その後しばらく経つとブラウザが起動し、撮影したスクリーンショットを含んだ PDFファイルが表示されます。
12. PDF ファイル上で書籍の内容部分だけを含むよう矩形選択し、 Go! ボタンをクリックしてください。
13. しばらく待つと選択された矩形部分だけを抽出した PDF ファイルが作成され、 Finder に表示されます。

## 3. Google Cloud Storage に PDF ファイルをアップロード

上記 2. のステップで都度作成した PDF ファイルを Cloud Storage にアップロードすると、自動で Cloud Functions が起動して MP3 化されます。

1. 作成した PDF ファイルを [Cloud Storage](https://console.cloud.google.com/storage/browser/) の当該バケットにアップロードします。
2. 数分待つとオーディオブック化された MP3 ファイルが Cloud Storage 上の `config.yaml` で指定されたフォルダに作成されるので、ダウンロードしてください。

# 開発

Cloud IAM 上で以下の権限を持ったサービスアカウントを作成し、キーをダウンロードします。

```
storage.objects.create
storage.objects.delete
storage.objects.get
storage.objects.list
storage.objects.update
```

開発は TypeScript および Node.js です。

```sh
npm install
```

で依存パッケージをインストール、

```sh
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json
npm run local -- '/cloud-storage-path/to/pdf-file.pdf'
```

とすることで、 Cloud Functions 上で動いているアプリケーションをローカルで動かすことができます。
