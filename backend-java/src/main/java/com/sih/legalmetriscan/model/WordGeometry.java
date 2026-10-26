package com.sih.legalmetriscan.model;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class WordGeometry {
    private String text;
    private int confidence;
    private BoundingBox bbox;
    private String sourceRegion;

    public WordGeometry() {}

    public WordGeometry(String text, int confidence, BoundingBox bbox) {
        this.text = text;
        this.confidence = confidence;
        this.bbox = bbox;
    }

    public WordGeometry(String text, int confidence, BoundingBox bbox, String sourceRegion) {
        this.text = text;
        this.confidence = confidence;
        this.bbox = bbox;
        this.sourceRegion = sourceRegion;
    }

    public String getText() { return text; }
    public void setText(String text) { this.text = text; }

    public int getConfidence() { return confidence; }
    public void setConfidence(int confidence) { this.confidence = confidence; }

    public BoundingBox getBbox() { return bbox; }
    public void setBbox(BoundingBox bbox) { this.bbox = bbox; }

    public String getSourceRegion() { return sourceRegion; }
    public void setSourceRegion(String sourceRegion) { this.sourceRegion = sourceRegion; }
}
