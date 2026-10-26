package com.sih.legalmetriscan.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.Map;

@JsonIgnoreProperties(ignoreUnknown = true)
public class OcrAnalyzeRequest {
    private String scanId;
    private String image;
    private String originalImage;
    private Map<String, Object> clientQualityDebug;

    public OcrAnalyzeRequest() {}

    public String getScanId() { return scanId; }
    public void setScanId(String scanId) { this.scanId = scanId; }

    public String getImage() { return image; }
    public void setImage(String image) { this.image = image; }

    public String getOriginalImage() { return originalImage; }
    public void setOriginalImage(String originalImage) { this.originalImage = originalImage; }

    public Map<String, Object> getClientQualityDebug() { return clientQualityDebug; }
    public void setClientQualityDebug(Map<String, Object> clientQualityDebug) { this.clientQualityDebug = clientQualityDebug; }
}
