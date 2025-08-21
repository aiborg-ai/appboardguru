import { createSupabaseServerClient } from '@/lib/supabase-server';

// Language and dialect definitions
export interface LanguageDefinition {
  code: string;
  name: string;
  nativeName: string;
  family: string;
  script: string;
  rtl: boolean;
  dialects: Dialect[];
  commonInRegions: string[];
  difficultyLevel: 'easy' | 'medium' | 'hard';
}

export interface Dialect {
  code: string;
  name: string;
  region: string;
  speakers: number;
  variations: string[];
}

export interface AccentProfile {
  id: string;
  userId: string;
  language: string;
  region: string;
  characteristics: {
    phonemes: Record<string, number>;
    intonationPatterns: Record<string, number>;
    speechRate: number;
    stressPatterns: string[];
  };
  adaptationLevel: number; // 0-1, how well the system has learned this accent
  lastUpdated: string;
}

export interface TerminologyEntry {
  id: string;
  term: string;
  context: string;
  translations: Record<string, {
    translation: string;
    formality: 'formal' | 'informal' | 'neutral';
    confidence: number;
    usage: string[];
  }>;
  frequency: number;
  lastUsed: string;
}

// Comprehensive language database with regional variants
const LANGUAGE_DATABASE: Record<string, LanguageDefinition> = {
  'en': {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    family: 'Germanic',
    script: 'Latin',
    rtl: false,
    dialects: [
      { code: 'en-US', name: 'American English', region: 'United States', speakers: 225000000, variations: ['Southern', 'Midwestern', 'West Coast'] },
      { code: 'en-GB', name: 'British English', region: 'United Kingdom', speakers: 60000000, variations: ['RP', 'Cockney', 'Scottish'] },
      { code: 'en-AU', name: 'Australian English', region: 'Australia', speakers: 25000000, variations: ['Broad', 'General', 'Cultivated'] },
      { code: 'en-CA', name: 'Canadian English', region: 'Canada', speakers: 20000000, variations: ['Standard', 'Maritime'] },
      { code: 'en-IN', name: 'Indian English', region: 'India', speakers: 125000000, variations: ['Standard', 'Regional'] },
    ],
    commonInRegions: ['North America', 'Europe', 'Oceania', 'Asia'],
    difficultyLevel: 'medium'
  },
  'es': {
    code: 'es',
    name: 'Spanish',
    nativeName: 'Español',
    family: 'Romance',
    script: 'Latin',
    rtl: false,
    dialects: [
      { code: 'es-ES', name: 'Peninsular Spanish', region: 'Spain', speakers: 47000000, variations: ['Castilian', 'Andalusian'] },
      { code: 'es-MX', name: 'Mexican Spanish', region: 'Mexico', speakers: 125000000, variations: ['Central', 'Northern'] },
      { code: 'es-AR', name: 'Argentinian Spanish', region: 'Argentina', speakers: 45000000, variations: ['Rioplatense', 'Regional'] },
      { code: 'es-CO', name: 'Colombian Spanish', region: 'Colombia', speakers: 50000000, variations: ['Bogotano', 'Costeño'] },
      { code: 'es-US', name: 'US Spanish', region: 'United States', speakers: 40000000, variations: ['Mexican-American', 'Cuban-American'] },
    ],
    commonInRegions: ['Latin America', 'North America', 'Europe'],
    difficultyLevel: 'medium'
  },
  'zh': {
    code: 'zh',
    name: 'Chinese',
    nativeName: '中文',
    family: 'Sino-Tibetan',
    script: 'Hanzi',
    rtl: false,
    dialects: [
      { code: 'zh-CN', name: 'Simplified Chinese (Mandarin)', region: 'China', speakers: 900000000, variations: ['Beijing', 'Standard'] },
      { code: 'zh-TW', name: 'Traditional Chinese (Taiwan)', region: 'Taiwan', speakers: 23000000, variations: ['Taipei', 'Southern'] },
      { code: 'zh-HK', name: 'Hong Kong Chinese', region: 'Hong Kong', speakers: 7000000, variations: ['Cantonese-influenced'] },
      { code: 'yue', name: 'Cantonese', region: 'Guangdong/Hong Kong', speakers: 80000000, variations: ['Hong Kong', 'Guangzhou'] },
    ],
    commonInRegions: ['East Asia', 'Southeast Asia'],
    difficultyLevel: 'hard'
  },
  'ar': {
    code: 'ar',
    name: 'Arabic',
    nativeName: 'العربية',
    family: 'Semitic',
    script: 'Arabic',
    rtl: true,
    dialects: [
      { code: 'ar-SA', name: 'Saudi Arabic', region: 'Saudi Arabia', speakers: 35000000, variations: ['Najdi', 'Hijazi'] },
      { code: 'ar-EG', name: 'Egyptian Arabic', region: 'Egypt', speakers: 100000000, variations: ['Cairene', 'Upper Egyptian'] },
      { code: 'ar-MA', name: 'Moroccan Arabic', region: 'Morocco', speakers: 35000000, variations: ['Fez', 'Casablanca'] },
      { code: 'ar-LB', name: 'Lebanese Arabic', region: 'Lebanon', speakers: 6000000, variations: ['Beiruti', 'Mountain'] },
    ],
    commonInRegions: ['Middle East', 'North Africa'],
    difficultyLevel: 'hard'
  },
  'hi': {
    code: 'hi',
    name: 'Hindi',
    nativeName: 'हिन्दी',
    family: 'Indo-European',
    script: 'Devanagari',
    rtl: false,
    dialects: [
      { code: 'hi-IN', name: 'Standard Hindi', region: 'India', speakers: 600000000, variations: ['Delhi', 'Mumbai'] },
      { code: 'hi-FJ', name: 'Fiji Hindi', region: 'Fiji', speakers: 380000, variations: ['Fiji Baat'] },
    ],
    commonInRegions: ['South Asia'],
    difficultyLevel: 'hard'
  }
  // Add more languages as needed...
};

// Board governance terminology dictionary
const BOARD_GOVERNANCE_TERMS: Record<string, Record<string, string>> = {
  'en': {
    'board_meeting': 'Board Meeting',
    'quorum': 'Quorum',
    'resolution': 'Resolution',
    'motion': 'Motion',
    'second': 'Second',
    'amendment': 'Amendment',
    'vote': 'Vote',
    'abstain': 'Abstain',
    'adjourn': 'Adjourn',
    'agenda': 'Agenda',
    'minutes': 'Minutes',
    'chair': 'Chairperson',
    'secretary': 'Secretary',
    'treasurer': 'Treasurer',
    'director': 'Director',
    'fiduciary_duty': 'Fiduciary Duty',
    'governance': 'Governance',
    'compliance': 'Compliance',
    'audit': 'Audit',
    'due_diligence': 'Due Diligence'
  },
  'es': {
    'board_meeting': 'Reunión del Consejo',
    'quorum': 'Quórum',
    'resolution': 'Resolución',
    'motion': 'Moción',
    'second': 'Apoyo',
    'amendment': 'Enmienda',
    'vote': 'Votación',
    'abstain': 'Abstención',
    'adjourn': 'Levantar la Sesión',
    'agenda': 'Orden del Día',
    'minutes': 'Acta',
    'chair': 'Presidente',
    'secretary': 'Secretario',
    'treasurer': 'Tesorero',
    'director': 'Director',
    'fiduciary_duty': 'Deber Fiduciario',
    'governance': 'Gobernanza',
    'compliance': 'Cumplimiento',
    'audit': 'Auditoría',
    'due_diligence': 'Debida Diligencia'
  },
  'fr': {
    'board_meeting': 'Réunion du Conseil',
    'quorum': 'Quorum',
    'resolution': 'Résolution',
    'motion': 'Motion',
    'second': 'Appui',
    'amendment': 'Amendement',
    'vote': 'Vote',
    'abstain': 'Abstention',
    'adjourn': 'Lever la Séance',
    'agenda': 'Ordre du Jour',
    'minutes': 'Procès-Verbal',
    'chair': 'Président',
    'secretary': 'Secrétaire',
    'treasurer': 'Trésorier',
    'director': 'Administrateur',
    'fiduciary_duty': 'Devoir Fiduciaire',
    'governance': 'Gouvernance',
    'compliance': 'Conformité',
    'audit': 'Audit',
    'due_diligence': 'Diligence Raisonnable'
  },
  'de': {
    'board_meeting': 'Vorstandssitzung',
    'quorum': 'Quorum',
    'resolution': 'Beschluss',
    'motion': 'Antrag',
    'second': 'Unterstützung',
    'amendment': 'Änderungsantrag',
    'vote': 'Abstimmung',
    'abstain': 'Enthaltung',
    'adjourn': 'Sitzung Beenden',
    'agenda': 'Tagesordnung',
    'minutes': 'Protokoll',
    'chair': 'Vorsitzender',
    'secretary': 'Sekretär',
    'treasurer': 'Schatzmeister',
    'director': 'Direktor',
    'fiduciary_duty': 'Treuhänderpflicht',
    'governance': 'Unternehmensführung',
    'compliance': 'Compliance',
    'audit': 'Prüfung',
    'due_diligence': 'Sorgfaltsprüfung'
  },
  'zh': {
    'board_meeting': '董事会会议',
    'quorum': '法定人数',
    'resolution': '决议',
    'motion': '动议',
    'second': '附议',
    'amendment': '修正案',
    'vote': '投票',
    'abstain': '弃权',
    'adjourn': '休会',
    'agenda': '议程',
    'minutes': '会议纪要',
    'chair': '主席',
    'secretary': '秘书',
    'treasurer': '财务主管',
    'director': '董事',
    'fiduciary_duty': '信托责任',
    'governance': '治理',
    'compliance': '合规',
    'audit': '审计',
    'due_diligence': '尽职调查'
  },
  'ja': {
    'board_meeting': '取締役会',
    'quorum': '定足数',
    'resolution': '決議',
    'motion': '動議',
    'second': '賛成',
    'amendment': '修正案',
    'vote': '投票',
    'abstain': '棄権',
    'adjourn': '閉会',
    'agenda': '議題',
    'minutes': '議事録',
    'chair': '議長',
    'secretary': '秘書',
    'treasurer': '会計',
    'director': '取締役',
    'fiduciary_duty': '受託者義務',
    'governance': 'ガバナンス',
    'compliance': 'コンプライアンス',
    'audit': '監査',
    'due_diligence': 'デューデリジェンス'
  }
};

class MultilingualService {
  private supabase: any;

  constructor() {
    this.initializeSupabase();
  }

  private async initializeSupabase() {
    this.supabase = await createSupabaseServerClient();
  }

  /**
   * Get supported languages with detailed information
   */
  getSupportedLanguages(): Record<string, LanguageDefinition> {
    return LANGUAGE_DATABASE;
  }

  /**
   * Detect language and dialect from text
   */
  async detectLanguageAndDialect(text: string): Promise<{
    language: string;
    confidence: number;
    dialect?: string;
    script?: string;
  }> {
    // Simple language detection based on character patterns
    // In production, would use proper language detection libraries
    
    const patterns = {
      'zh': /[\u4e00-\u9fff]/, // Chinese characters
      'ar': /[\u0600-\u06ff]/, // Arabic
      'hi': /[\u0900-\u097f]/, // Hindi/Devanagari
      'ja': /[\u3040-\u309f\u30a0-\u30ff]/, // Japanese Hiragana/Katakana
      'ko': /[\uac00-\ud7af]/, // Korean
      'ru': /[\u0400-\u04ff]/, // Cyrillic
      'th': /[\u0e00-\u0e7f]/, // Thai
      'vi': /[àáâãèéêìíòóôõùúýăđĩũơưỳỵỷỹ]/, // Vietnamese diacritics
    };

    for (const [lang, pattern] of Object.entries(patterns)) {
      if (pattern.test(text)) {
        return {
          language: lang,
          confidence: 0.9,
          script: LANGUAGE_DATABASE[lang]?.script
        };
      }
    }

    // For Latin script languages, use word patterns
    const commonWords = {
      'es': ['el', 'la', 'de', 'que', 'y', 'a', 'en', 'un', 'es', 'se', 'no', 'te', 'lo', 'le', 'da', 'su', 'por', 'son', 'con', 'para'],
      'fr': ['le', 'de', 'et', 'à', 'un', 'il', 'être', 'et', 'en', 'avoir', 'que', 'pour', 'dans', 'ce', 'son', 'une', 'sur', 'avec', 'ne', 'se'],
      'de': ['der', 'die', 'und', 'in', 'den', 'von', 'zu', 'das', 'mit', 'sich', 'des', 'auf', 'für', 'ist', 'im', 'dem', 'nicht', 'ein', 'eine', 'als'],
      'it': ['il', 'di', 'che', 'e', 'la', 'per', 'un', 'in', 'con', 'del', 'da', 'a', 'al', 'le', 'si', 'dei', 'su', 'come', 'anche', 'tutto'],
      'pt': ['o', 'de', 'a', 'e', 'que', 'do', 'da', 'em', 'um', 'para', 'é', 'com', 'não', 'uma', 'os', 'no', 'se', 'na', 'por', 'mais']
    };

    const words = text.toLowerCase().split(/\s+/);
    let bestMatch = 'en';
    let bestScore = 0;

    for (const [lang, commonLangWords] of Object.entries(commonWords)) {
      const matches = words.filter(word => commonLangWords.includes(word)).length;
      const score = matches / words.length;
      
      if (score > bestScore) {
        bestScore = score;
        bestMatch = lang;
      }
    }

    return {
      language: bestMatch,
      confidence: Math.max(0.6, bestScore), // Minimum confidence
      script: LANGUAGE_DATABASE[bestMatch]?.script || 'Latin'
    };
  }

  /**
   * Get user's language preferences and accent profile
   */
  async getUserLanguagePreferences(userId: string, organizationId: string) {
    if (!this.supabase) await this.initializeSupabase();

    const { data: preferences } = await this.supabase
      .from('user_language_preferences')
      .select('*')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .single();

    return preferences;
  }

  /**
   * Update user's accent profile based on voice patterns
   */
  async updateAccentProfile(
    userId: string,
    organizationId: string,
    voiceData: {
      language: string;
      region: string;
      phoneticPatterns: Record<string, number>;
      speechRate: number;
    }
  ) {
    if (!this.supabase) await this.initializeSupabase();

    const { data: existing } = await this.supabase
      .from('voice_learning_data')
      .select('*')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .single();

    const updatedPatterns = {
      ...existing?.phoneme_patterns,
      ...voiceData.phoneticPatterns
    };

    const accentData = {
      accent_markers: {
        primary_language: voiceData.language,
        regional_variant: voiceData.region,
        speech_rate: voiceData.speechRate,
        last_updated: new Date().toISOString()
      },
      speaking_rate_patterns: {
        average_wpm: voiceData.speechRate,
        variance: 0.1 // Calculate from actual data
      }
    };

    await this.supabase
      .from('voice_learning_data')
      .upsert({
        user_id: userId,
        organization_id: organizationId,
        phoneme_patterns: updatedPatterns,
        accent_markers: accentData.accent_markers,
        speaking_rate_patterns: accentData.speaking_rate_patterns,
        last_training_session: new Date().toISOString(),
        training_iterations: (existing?.training_iterations || 0) + 1,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('organization_id', organizationId);
  }

  /**
   * Get custom terminology for better translations
   */
  async getCustomTerminology(
    organizationId: string,
    context: string = 'board_governance'
  ): Promise<Record<string, TerminologyEntry>> {
    if (!this.supabase) await this.initializeSupabase();

    // Get organization-specific terms
    const { data: orgTerms } = await this.supabase
      .from('custom_terminology')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('context_category', context);

    // Combine with built-in board governance terms
    const builtInTerms = this.getBuiltInTerminology(context);
    const customTerms: Record<string, TerminologyEntry> = {};

    // Process organization terms
    if (orgTerms) {
      orgTerms.forEach(term => {
        customTerms[term.term] = {
          id: term.id,
          term: term.term,
          context: term.context_category,
          translations: Object.fromEntries(
            Object.entries(term.translations).map(([lang, trans]) => [
              lang,
              {
                translation: trans as string,
                formality: 'formal',
                confidence: 0.95,
                usage: ['board_meeting', 'governance']
              }
            ])
          ),
          frequency: term.usage_frequency || 0,
          lastUsed: new Date().toISOString()
        };
      });
    }

    // Add built-in terms
    Object.entries(builtInTerms).forEach(([term, translations]) => {
      if (!customTerms[term]) {
        customTerms[term] = {
          id: `builtin_${term}`,
          term,
          context,
          translations: Object.fromEntries(
            Object.entries(translations).map(([lang, trans]) => [
              lang,
              {
                translation: trans,
                formality: 'formal',
                confidence: 1.0,
                usage: ['board_meeting', 'governance']
              }
            ])
          ),
          frequency: 100, // High frequency for built-in terms
          lastUsed: new Date().toISOString()
        };
      }
    });

    return customTerms;
  }

  /**
   * Get built-in terminology for specific context
   */
  private getBuiltInTerminology(context: string): Record<string, Record<string, string>> {
    switch (context) {
      case 'board_governance':
        return this.transformTerminologyFormat(BOARD_GOVERNANCE_TERMS);
      default:
        return {};
    }
  }

  /**
   * Transform terminology format for easier processing
   */
  private transformTerminologyFormat(
    terms: Record<string, Record<string, string>>
  ): Record<string, Record<string, string>> {
    const result: Record<string, Record<string, string>> = {};
    
    // Get all unique terms across all languages
    const allTerms = new Set<string>();
    Object.values(terms).forEach(langTerms => {
      Object.keys(langTerms).forEach(term => allTerms.add(term));
    });

    // Create translations for each term
    allTerms.forEach(term => {
      result[term] = {};
      Object.entries(terms).forEach(([lang, langTerms]) => {
        if (langTerms[term]) {
          result[term][lang] = langTerms[term];
        }
      });
    });

    return result;
  }

  /**
   * Enhance translation quality using context and terminology
   */
  async enhanceTranslation(
    originalText: string,
    sourceLanguage: string,
    targetLanguage: string,
    context: string,
    customTerminology: Record<string, TerminologyEntry>
  ): Promise<{
    enhancedText: string;
    confidence: number;
    suggestions: string[];
    terminologyUsed: string[];
  }> {
    let enhancedText = originalText;
    const terminologyUsed: string[] = [];
    const suggestions: string[] = [];

    // Apply custom terminology
    for (const [term, entry] of Object.entries(customTerminology)) {
      if (entry.translations[targetLanguage]) {
        const termPattern = new RegExp(`\\b${term}\\b`, 'gi');
        if (termPattern.test(originalText)) {
          enhancedText = enhancedText.replace(
            termPattern,
            entry.translations[targetLanguage].translation
          );
          terminologyUsed.push(term);
        }
      }
    }

    // Add context-specific enhancements
    if (context === 'board_governance') {
      suggestions.push('Consider using formal business language');
      if (targetLanguage === 'es') {
        suggestions.push('Use "usted" form for formal address');
      }
    }

    // Calculate confidence based on terminology coverage
    const confidence = Math.min(
      0.9,
      0.7 + (terminologyUsed.length * 0.05) // Boost confidence with terminology usage
    );

    return {
      enhancedText,
      confidence,
      suggestions,
      terminologyUsed
    };
  }

  /**
   * Adapt translation quality based on user preferences
   */
  async adaptTranslationQuality(
    userId: string,
    organizationId: string,
    translationRequest: {
      sourceLanguage: string;
      targetLanguage: string;
      context: string;
      urgency: 'high' | 'medium' | 'low';
    }
  ): Promise<{
    qualityLevel: 'speed' | 'balanced' | 'accuracy';
    processingTime: number;
    additionalServices: string[];
  }> {
    if (!this.supabase) await this.initializeSupabase();

    const preferences = await this.getUserLanguagePreferences(userId, organizationId);
    
    let qualityLevel: 'speed' | 'balanced' | 'accuracy' = 'balanced';
    let processingTime = 3000; // milliseconds
    let additionalServices: string[] = [];

    // Apply user preferences
    if (preferences?.translation_quality_preference) {
      qualityLevel = preferences.translation_quality_preference;
    }

    // Adjust based on context and urgency
    if (translationRequest.context === 'board_governance' || translationRequest.urgency === 'high') {
      qualityLevel = 'accuracy';
      processingTime = 5000;
      additionalServices.push('terminology_check', 'formality_analysis');
    }

    // Language-specific adjustments
    const complexLanguages = ['zh', 'ar', 'ja', 'ko', 'hi'];
    if (complexLanguages.includes(translationRequest.sourceLanguage) || 
        complexLanguages.includes(translationRequest.targetLanguage)) {
      processingTime += 2000;
      additionalServices.push('script_conversion', 'cultural_adaptation');
    }

    return {
      qualityLevel,
      processingTime,
      additionalServices
    };
  }

  /**
   * Generate pronunciation guide for translated text
   */
  generatePronunciationGuide(
    text: string,
    language: string,
    targetAccent?: string
  ): {
    phonetic: string;
    syllables: string[];
    stressPattern: number[];
    audioHints: string[];
  } {
    // This would integrate with phonetic transcription libraries
    // For now, return simplified guides
    
    const guides: Record<string, any> = {
      'es': {
        phonetic: this.toSpanishPhonetic(text),
        syllables: text.split(/[aeiouáéíóú]/),
        stressPattern: [1, 0, 1], // Simple pattern
        audioHints: ['Roll your Rs', 'Stress on penultimate syllable']
      },
      'fr': {
        phonetic: this.toFrenchPhonetic(text),
        syllables: text.split(/[aeiouyàéèêëïîôöùû]/),
        stressPattern: [0, 0, 1], // French stress pattern
        audioHints: ['Silent final consonants', 'Nasal vowels']
      },
      'de': {
        phonetic: this.toGermanPhonetic(text),
        syllables: text.split(/[aeiouäöüß]/),
        stressPattern: [1, 0, 0], // German stress pattern
        audioHints: ['Clear consonant pronunciation', 'Umlaut sounds']
      }
    };

    return guides[language] || {
      phonetic: text,
      syllables: [text],
      stressPattern: [1],
      audioHints: ['Follow standard pronunciation rules']
    };
  }

  private toSpanishPhonetic(text: string): string {
    return text
      .replace(/ll/g, 'ly')
      .replace(/ñ/g, 'ny')
      .replace(/rr/g, 'RR')
      .replace(/j/g, 'h');
  }

  private toFrenchPhonetic(text: string): string {
    return text
      .replace(/ou/g, 'oo')
      .replace(/an|en/g, 'ahn')
      .replace(/on/g, 'ohn')
      .replace(/in|un/g, 'ehn');
  }

  private toGermanPhonetic(text: string): string {
    return text
      .replace(/ä/g, 'ae')
      .replace(/ö/g, 'oe')
      .replace(/ü/g, 'ue')
      .replace(/ß/g, 'ss')
      .replace(/ch/g, 'kh');
  }

  /**
   * Cultural context adaptation for translations
   */
  adaptCulturalContext(
    text: string,
    sourceLanguage: string,
    targetLanguage: string,
    context: 'business' | 'formal' | 'casual'
  ): {
    adaptedText: string;
    culturalNotes: string[];
    formalityLevel: number; // 1-5
  } {
    const culturalAdaptations = {
      'ja': {
        business: {
          prefixes: ['恐れ入りますが', 'お忙しい中'],
          suffixes: ['よろしくお願いいたします', 'ありがとうございます'],
          formalityLevel: 5
        }
      },
      'ko': {
        business: {
          prefixes: ['실례합니다만', '바쁘신 중에'],
          suffixes: ['감사합니다', '잘 부탁드립니다'],
          formalityLevel: 5
        }
      },
      'de': {
        business: {
          prefixes: ['Sehr geehrte Damen und Herren'],
          suffixes: ['Mit freundlichen Grüßen'],
          formalityLevel: 4
        }
      }
    };

    const adaptation = culturalAdaptations[targetLanguage as keyof typeof culturalAdaptations];
    let adaptedText = text;
    const culturalNotes: string[] = [];

    if (adaptation && adaptation[context as keyof typeof adaptation]) {
      const contextRules = adaptation[context as keyof typeof adaptation] as any;
      
      // Add cultural prefixes/suffixes for business context
      if (context === 'business' && contextRules.prefixes) {
        // Would add appropriate business greetings
        culturalNotes.push('Added culturally appropriate business greeting');
      }

      return {
        adaptedText,
        culturalNotes,
        formalityLevel: contextRules.formalityLevel || 3
      };
    }

    return {
      adaptedText: text,
      culturalNotes: [],
      formalityLevel: 3
    };
  }
}

export const multilingualService = new MultilingualService();