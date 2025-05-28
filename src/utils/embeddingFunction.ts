import { TfIdf } from 'natural';
import { SVD } from 'svd-js';

/**
 * TF-IDF + SVD (Latent Semantic Analysis) embedding function
 * This implementation matches exactly the MCP server's embedding function
 * 
 * Optimized for:
 * - Small: 5-20 memories for basic semantic understanding
 * - Medium: 20-50 memories for good semantic relationships
 * - Large: 50+ memories for robust semantic understanding
 */
export class TfIdfSvdEmbeddingFunction {
  private dimension: number;
  private corpus: string[] = [];
  private tfidf: TfIdf | null = null;
  private vocabulary: string[] = [];
  private svdU: number[][] | null = null;
  private isInitialized = false;

  constructor(dimension: number = 200) {
    this.dimension = dimension;
  }

  /**
   * Initialize or update the embedding model with a corpus of documents
   */
  async initializeCorpus(documents: string[]): Promise<void> {
    if (documents.length === 0) {
      throw new Error('Cannot initialize with empty corpus');
    }

    this.corpus = documents;
    this.tfidf = new TfIdf();

    // Add all documents to TF-IDF
    documents.forEach(doc => {
      this.tfidf!.addDocument(doc.toLowerCase());
    });

    // Extract vocabulary
    const vocabSet = new Set<string>();
    this.tfidf.documents.forEach((doc: any) => {
      Object.keys(doc).forEach(term => vocabSet.add(term));
    });
    this.vocabulary = Array.from(vocabSet);

    // Build TF-IDF matrix [nDocs × vocabSize]
    const tfidfMatrix = documents.map((_, docIdx) =>
      this.vocabulary.map(term => this.tfidf!.tfidf(term, docIdx))
    );

    // Apply SVD if we have enough documents relative to vocabulary size
    // SVD requires m >= n (documents >= vocabulary terms)
    if (tfidfMatrix.length > 0 && this.vocabulary.length > 0 &&
        tfidfMatrix.length >= Math.min(this.vocabulary.length, 50)) {
      try {
        // Transpose matrix for SVD: [vocabSize × nDocs]
        const transposedMatrix = this.vocabulary.map((_, termIdx) =>
          tfidfMatrix.map(docVec => docVec[termIdx])
        );

        const { u } = SVD(transposedMatrix);
        this.svdU = u;
        this.isInitialized = true;
      } catch (error) {
        console.warn('SVD failed, falling back to TF-IDF only:', error);
        this.svdU = null;
        this.isInitialized = true;
      }
    } else {
      // Not enough documents for SVD, use TF-IDF only
      this.svdU = null;
      this.isInitialized = true;
    }
  }

  /**
   * Generate embedding for a single text document
   */
  async embed(text: string): Promise<number[]> {
    if (!this.isInitialized || !this.tfidf) {
      // If not initialized, create a minimal corpus with just this text
      await this.initializeCorpus([text]);
      // For single document corpus, return a simple normalized vector
      const words = text.toLowerCase().split(/\s+/);
      const embedding = new Array(this.dimension).fill(0);
      words.forEach((word, i) => {
        const index = i % this.dimension;
        embedding[index] += 1.0;
      });
      const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
      return magnitude > 0 ? embedding.map(x => x / magnitude) : embedding;
    }

    // Tokenize and calculate term frequencies
    const words = text.toLowerCase().split(/\s+/);
    const termFreq: Record<string, number> = {};
    words.forEach(word => {
      termFreq[word] = (termFreq[word] || 0) + 1;
    });

    // Create extended vocabulary that includes terms from the current document
    const newTerms = Object.keys(termFreq).filter(term => !this.vocabulary.includes(term));
    const extendedVocabulary = [...this.vocabulary, ...newTerms];

    // Calculate TF-IDF vector using the extended vocabulary and consistent IDF calculation
    // Include the current document in the corpus for IDF calculation
    const extendedCorpus = [...this.corpus, text.toLowerCase()];

    const tfidfVector = extendedVocabulary.map(term => {
      const tf = (termFreq[term] || 0) / words.length;

      // Calculate IDF including the current document in the corpus
      const docsWithTerm = extendedCorpus.filter(doc =>
        doc.split(/\s+/).includes(term)
      ).length;

      const idf = docsWithTerm > 0 ? Math.log(extendedCorpus.length / docsWithTerm) : 0;
      return tf * idf;
    });

    let embedding: number[];

    if (this.svdU && this.svdU.length > 0) {
      // Project using SVD (LSA)
      const nComponents = Math.min(this.dimension, this.svdU[0].length);
      embedding = new Array(nComponents).fill(0);

      // Matrix multiplication: tfidfVector × svdU^T
      for (let i = 0; i < nComponents; i++) {
        for (let j = 0; j < Math.min(tfidfVector.length, this.svdU.length); j++) {
          if (this.svdU[j] && this.svdU[j][i] !== undefined) {
            embedding[i] += tfidfVector[j] * this.svdU[j][i];
          }
        }
      }
    } else {
      // Fallback to truncated TF-IDF
      embedding = tfidfVector.slice(0, this.dimension);
    }

    // Pad with zeros if needed
    while (embedding.length < this.dimension) {
      embedding.push(0);
    }

    // Normalize the embedding vector
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    if (magnitude > 0) {
      embedding = embedding.map(x => x / magnitude);
    }

    return embedding;
  }

  /**
   * Check if the embedding function is initialized
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Get the current corpus size
   */
  getCorpusSize(): number {
    return this.corpus.length;
  }

  /**
   * Get the vocabulary size
   */
  getVocabularySize(): number {
    return this.vocabulary.length;
  }

  /**
   * Check if SVD is being used
   */
  isUsingSVD(): boolean {
    return this.svdU !== null;
  }
}
