package com.sih.legalmetriscan.model;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class LineGeometry {
    private String text;
    private int confidence;
    private BoundingBox bbox;

    public LineGeometry() {}

    public LineGeometry(String text, int confidence, BoundingBox bbox) {
        this.text = text;
        this.confidence = confidence;
        this.bbox = bbox;
    }

    public String getText() { return text; }
    public void setText(String text) { this.text = text; }

    public int getConfidence() { return confidence; }
    public void setConfidence(int confidence) { this.confidence = confidence; }

    public BoundingBox getBbox() { return bbox; }
    public void setBbox(BoundingBox bbox) { this.bbox = bbox; }
}
