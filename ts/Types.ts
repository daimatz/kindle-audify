namespace OcrResult {
  export type Root = {
    responses: Array<Response>;
  };
  export type Response = {
    context: Context,
    fullTextAnnotation: FullTextAnnotation,
  };
  export type Context = {
    pageNumber: number,
    uri: string,
  };
  export type FullTextAnnotation = {
    pages: Array<Page>,
    text: string,
  };
  export type Page = {
    blocks: Array<Block>,
    property: Property,
    height: number,
    width: number
  };
  export type Block = {
    blockType: string,
    boundingBox: BoundingBox,
    confidence: number,
    paragraphs: Array<Paragraph>,
    property: Property,
  };
  export type BoundingBox = {
    normalizedVertices: Array<NormalizedVertice>,
  };
  export type NormalizedVertice = {
    x: number,
    y: number,
  };
  export type Paragraph = {
    boundingBox: BoundingBox,
    confidence: number,
    property: Property,
    words: Array<Word>,
  };
  export type Property = {
    detectedLanguages: Array<DetectedLanguage>,
  };
  export type DetectedLanguage = {
    confidence: number,
    languageCode: string,
  };
  export type Word = {
    boundingBox: BoundingBox,
    confidence: number,
    symbols: Array<Symbol>,
  };
  export type Symbol = {
    confidence: number,
    text: string,
  };
};

type WordLevelText = {
  boundingBox: OcrResult.BoundingBox,
  text: string,
};
