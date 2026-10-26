package com.sih.legalmetriscan.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.*;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class OcrAnalyzeResponse {
    private Map<String, Integer> orientationScores = new LinkedHashMap<>();
    private List<Map<String, Object>> orientationEvaluations = new ArrayList<>();
    private String rawText = "";
    private int confidence = 0;
    private String selectedVariant = "Adaptive Multi-Orientation Preprocessing";
    private String ocrVariant = "Adaptive Multi-Orientation Preprocessing";
    private long processingTimeMs = 0;
    private int variantsTested = 1;
    private String psmMode = "3 (Automatic)";
    private List<WordGeometry> words = new ArrayList<>();
    private List<LineGeometry> lines = new ArrayList<>();
    private int wordCount = 0;
    private int lineCount = 0;
    private int fullImageWords = 0;
    private int regionalWords = 0;
    private int mergedWords = 0;
    private int duplicateWordsRemoved = 0;
    private List<Map<String, Object>> regionsProcessed = new ArrayList<>();
    private List<Map<String, Object>> netQuantityOCRCandidates = new ArrayList<>();
    private Map<String, Object> multiRegionDebug = new LinkedHashMap<>();
    private Map<String, Object> imageQualityDebug = new LinkedHashMap<>();
    private Map<String, Object> ocr = new LinkedHashMap<>();
    private Map<String, Object> comparison = new LinkedHashMap<>();
    private SpatialExtractionResult spatialFields = new SpatialExtractionResult();
    private Map<String, Object> spatialDebug = new LinkedHashMap<>();
    private Map<String, Object> extractedFields = new LinkedHashMap<>();
    private int detectedCount = 0;

    public OcrAnalyzeResponse() {}

    public Map<String, Integer> getOrientationScores() { return orientationScores; }
    public void setOrientationScores(Map<String, Integer> orientationScores) { this.orientationScores = orientationScores; }

    public List<Map<String, Object>> getOrientationEvaluations() { return orientationEvaluations; }
    public void setOrientationEvaluations(List<Map<String, Object>> orientationEvaluations) { this.orientationEvaluations = orientationEvaluations; }

    public String getRawText() { return rawText; }
    public void setRawText(String rawText) { this.rawText = rawText; }

    public int getConfidence() { return confidence; }
    public void setConfidence(int confidence) { this.confidence = confidence; }

    public String getSelectedVariant() { return selectedVariant; }
    public void setSelectedVariant(String selectedVariant) { this.selectedVariant = selectedVariant; }

    public String getOcrVariant() { return ocrVariant; }
    public void setOcrVariant(String ocrVariant) { this.ocrVariant = ocrVariant; }

    public long getProcessingTimeMs() { return processingTimeMs; }
    public void setProcessingTimeMs(long processingTimeMs) { this.processingTimeMs = processingTimeMs; }

    public int getVariantsTested() { return variantsTested; }
    public void setVariantsTested(int variantsTested) { this.variantsTested = variantsTested; }

    public String getPsmMode() { return psmMode; }
    public void setPsmMode(String psmMode) { this.psmMode = psmMode; }

    public List<WordGeometry> getWords() { return words; }
    public void setWords(List<WordGeometry> words) { this.words = words; }

    public List<LineGeometry> getLines() { return lines; }
    public void setLines(List<LineGeometry> lines) { this.lines = lines; }

    public int getWordCount() { return wordCount; }
    public void setWordCount(int wordCount) { this.wordCount = wordCount; }

    public int getLineCount() { return lineCount; }
    public void setLineCount(int lineCount) { this.lineCount = lineCount; }

    public int getFullImageWords() { return fullImageWords; }
    public void setFullImageWords(int fullImageWords) { this.fullImageWords = fullImageWords; }

    public int getRegionalWords() { return regionalWords; }
    public void setRegionalWords(int regionalWords) { this.regionalWords = regionalWords; }

    public int getMergedWords() { return mergedWords; }
    public void setMergedWords(int mergedWords) { this.mergedWords = mergedWords; }

    public int getDuplicateWordsRemoved() { return duplicateWordsRemoved; }
    public void setDuplicateWordsRemoved(int duplicateWordsRemoved) { this.duplicateWordsRemoved = duplicateWordsRemoved; }

    public List<Map<String, Object>> getRegionsProcessed() { return regionsProcessed; }
    public void setRegionsProcessed(List<Map<String, Object>> regionsProcessed) { this.regionsProcessed = regionsProcessed; }

    public List<Map<String, Object>> getNetQuantityOCRCandidates() { return netQuantityOCRCandidates; }
    public void setNetQuantityOCRCandidates(List<Map<String, Object>> netQuantityOCRCandidates) { this.netQuantityOCRCandidates = netQuantityOCRCandidates; }

    public Map<String, Object> getMultiRegionDebug() { return multiRegionDebug; }
    public void setMultiRegionDebug(Map<String, Object> multiRegionDebug) { this.multiRegionDebug = multiRegionDebug; }

    public Map<String, Object> getImageQualityDebug() { return imageQualityDebug; }
    public void setImageQualityDebug(Map<String, Object> imageQualityDebug) { this.imageQualityDebug = imageQualityDebug; }

    public Map<String, Object> getOcr() { return ocr; }
    public void setOcr(Map<String, Object> ocr) { this.ocr = ocr; }

    public Map<String, Object> getComparison() { return comparison; }
    public void setComparison(Map<String, Object> comparison) { this.comparison = comparison; }

    public SpatialExtractionResult getSpatialFields() { return spatialFields; }
    public void setSpatialFields(SpatialExtractionResult spatialFields) { this.spatialFields = spatialFields; }

    public Map<String, Object> getSpatialDebug() { return spatialDebug; }
    public void setSpatialDebug(Map<String, Object> spatialDebug) { this.spatialDebug = spatialDebug; }

    public Map<String, Object> getExtractedFields() { return extractedFields; }
    public void setExtractedFields(Map<String, Object> extractedFields) { this.extractedFields = extractedFields; }

    public int getDetectedCount() { return detectedCount; }
    public void setDetectedCount(int detectedCount) { this.detectedCount = detectedCount; }
}
